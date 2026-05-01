import supabase, { ensureAwake } from './_supabase.js';
import axios from 'axios';
import { countSkillMatches, matchesSkill } from './_text-utils.js';

const ROLE_HINTS = {
  frontend: ['Frontend Developer', 'React Developer', 'UI Engineer'],
  backend: ['Backend Engineer', 'Python Developer', 'API Developer'],
  fullstack: ['Full Stack Developer', 'Software Engineer', 'Application Developer'],
  devops: ['DevOps Engineer', 'Platform Engineer', 'Site Reliability Engineer'],
  data_science: ['Data Scientist', 'Machine Learning Engineer', 'AI Engineer'],
  data_analyst: ['Data Analyst', 'BI Analyst', 'Analytics Engineer'],
  design: ['UI UX Designer', 'Product Designer', 'Interaction Designer'],
  database: ['Database Engineer', 'Data Engineer', 'SQL Developer'],
  mobile: ['Mobile Developer', 'Android Developer', 'React Native Developer'],
  cybersecurity: ['Security Engineer', 'Security Analyst', 'Cybersecurity Engineer']
};

const DOMAIN_SKILLS = {
  frontend: ['React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Tailwind', 'Redux', 'Webpack', 'Vite', 'Sass', 'Bootstrap', 'Material UI'],
  backend: ['Node.js', 'Python', 'Java', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Go', 'Golang', 'Express', 'NestJS', 'Laravel', 'PostgreSQL', 'Redis', 'Kafka', 'RabbitMQ', 'SQL', 'MongoDB'],
  fullstack: ['React', 'Node.js', 'TypeScript', 'JavaScript', 'PostgreSQL', 'MongoDB', 'Express', 'Next.js', 'Docker', 'AWS', 'Redis', 'CI/CD'],
  devops: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Jenkins', 'GitHub Actions', 'Linux', 'Bash', 'Ansible', 'CI/CD', 'Helm'],
  data_science: ['Python', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'Pandas', 'NumPy', 'NLP', 'Machine Learning', 'Data Science', 'OpenCV', 'Generative AI'],
  data_analyst: ['SQL', 'Power BI', 'Tableau', 'Excel', 'Python', 'Pandas', 'BigQuery', 'Data Visualization', 'Statistics'],
  design: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Sketch', 'UI/UX', 'Design System', 'Prototyping', 'Wireframing', 'User Research'],
  database: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Oracle', 'SQLite', 'DynamoDB', 'Firebase', 'SQL', 'NoSQL'],
  mobile: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'Android', 'iOS', 'Dart', 'Firebase', 'SwiftUI'],
  cybersecurity: ['Penetration Testing', 'Ethical Hacking', 'SIEM', 'Firewalls', 'Network Security', 'OWASP', 'Cryptography', 'IAM', 'Cloud Security']
};

const INDIA_LOCATION_HINTS = [
  'india',
  'bharat',
  'bangalore',
  'bengaluru',
  'hyderabad',
  'pune',
  'mumbai',
  'delhi',
  'new delhi',
  'delhi ncr',
  'gurugram',
  'gurgaon',
  'noida',
  'chennai',
  'kolkata',
  'ahmedabad',
  'kochi',
  'coimbatore',
  'jaipur',
  'indore',
  'thane',
  'navi mumbai',
  'remote india',
  'work from home india'
];

const INDIA_PRIORITY_CITIES = [
  'India',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Delhi NCR',
  'Chennai',
  'Gurugram',
  'Noida'
];

function inferJobType(location, title) {
  const text = `${location || ''} ${title || ''}`.toLowerCase();
  if (text.includes('remote') || text.includes('worldwide')) return 'Remote';
  if (text.includes('hybrid')) return 'Hybrid';
  return 'On-site';
}

function normalizeDescription(value) {
  if (typeof value !== 'string') return '';

  const decoded = value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/');

  return decoded
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 320);
}

function normalizeLocationText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function isIndiaLocation(value) {
  const text = normalizeLocationText(value).toLowerCase();
  return INDIA_LOCATION_HINTS.some(token => text.includes(token));
}

function isIndiaFriendlyRemoteJob(location) {
  const text = normalizeLocationText(location).toLowerCase();
  return (
    text.includes('remote') &&
    (
      text.includes('india') ||
      text.includes('asia') ||
      text.includes('worldwide') ||
      text.includes('anywhere')
    )
  );
}

function formatIndianSalary(minSalary, maxSalary) {
  const values = [minSalary, maxSalary].filter(value => Number.isFinite(value) && value > 0);
  if (values.length === 0) return 'Competitive';

  const annualLakhs = values.map(value => `${(value / 100000).toFixed(1).replace(/\.0$/, '')} LPA`);
  return annualLakhs.length === 2 ? `₹${annualLakhs[0]} - ₹${annualLakhs[1]}` : `₹${annualLakhs[0]}+`;
}

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter(job => {
    const key = `${job.title || ''}::${job.company || ''}::${job.location || ''}::${job.url || ''}`.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankJob(job, skills, queryTerms, roleHints = []) {
  const text = `${job.title || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
  const titleText = `${job.title || ''}`.toLowerCase();
  let score = 0;
  let roleMatchCount = 0;
  let skillMatchCount = 0;

  roleHints.forEach(role => {
    const titleMatches = countSkillMatches(titleText, role);
    const bodyMatches = countSkillMatches(text, role);
    if (titleMatches > 0 || bodyMatches > 0) {
      roleMatchCount += 1;
      score += titleMatches > 0 ? 18 : 8;
    }
  });

  skills.forEach(skill => {
    const matches = countSkillMatches(text, skill);
    if (matches > 0) {
      skillMatchCount += 1;
      score += Math.min(12, 5 + (matches * 3));
    }
  });

  queryTerms.forEach(term => {
    const matches = countSkillMatches(text, term);
    if (matches > 0) {
      score += term.includes(' ') ? 4 * matches : 2 * matches;
    }
  });

  if ((job.location || '').toLowerCase().includes('remote')) {
    score += 4;
  }

  if (isIndiaLocation(job.location)) {
    score += 12;
  } else if (isIndiaFriendlyRemoteJob(job.location)) {
    score += 8;
  } else if ((job.job_type || '').toLowerCase() === 'remote') {
    score += 2;
  } else {
    score -= 6;
  }

  if (roleMatchCount === 0 && skillMatchCount < 2) {
    return 0;
  }

  return Math.min(100, score);
}

function detectDomainFromResume(resumeText) {
  const domainSignals = Object.entries(DOMAIN_SKILLS).map(([domain, skills]) => ({
    domain,
    score: skills.filter(skill => matchesSkill(resumeText, skill)).length
  })).sort((a, b) => b.score - a.score);

  return domainSignals[0]?.score > 0 ? domainSignals[0].domain : 'fullstack';
}

function buildSearchProfile(resumeText) {
  const domain = detectDomainFromResume(resumeText);
  const domainSkills = DOMAIN_SKILLS[domain] || DOMAIN_SKILLS.fullstack;
  const matchedDomainSkills = domainSkills
    .map(skill => ({ skill, count: countSkillMatches(resumeText, skill) }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.skill.length - b.skill.length)
    .map(entry => entry.skill);

  const roleHints = ROLE_HINTS[domain] || ROLE_HINTS.fullstack;
  const searchSkills = [...roleHints, ...matchedDomainSkills].slice(0, 8);

  if (searchSkills.length === 0) {
    return { domain, roleHints, matchedDomainSkills: [], searchSkills: ROLE_HINTS.fullstack };
  }

  return { domain, roleHints, matchedDomainSkills, searchSkills };
}

function buildIndiaQueries(profile) {
  const { searchSkills, roleHints = [] } = profile;
  const baseTerms = [...new Set([...roleHints, ...searchSkills].filter(Boolean))];
  const queries = new Set();

  baseTerms.slice(0, 4).forEach(term => {
    queries.add(term);
    queries.add(`${term} India`);
  });

  if (baseTerms.length >= 2) {
    queries.add(`${baseTerms[0]} ${baseTerms[1]}`);
    queries.add(`${baseTerms[0]} ${baseTerms[1]} India`);
  }

  queries.add('software engineer India');
  queries.add('developer India');

  return [...queries].slice(0, 8);
}

async function fetchJobsFromAPIs(profile) {
  const { searchSkills, roleHints = [], matchedDomainSkills = [] } = profile;
  const queryTerms = [...new Set(searchSkills.filter(Boolean))].slice(0, 6);
  const scoringSkills = matchedDomainSkills.length > 0 ? matchedDomainSkills.slice(0, 6) : searchSkills.slice(0, 6);
  const roleQueries = [
    queryTerms.slice(0, 2).join(' '),
    queryTerms.slice(0, 3).join(' '),
    queryTerms[0],
    queryTerms[1],
    'software engineer'
  ].filter(Boolean);
  const indiaQueries = buildIndiaQueries(profile);

  const adzunaAppId = process.env.ADZUNA_APP_ID || '8e8f4f4e';
  const adzunaKey = process.env.ADZUNA_API_KEY || 'demo-key';
  const adzunaPages = [1, 2];

  const adzunaCalls = INDIA_PRIORITY_CITIES.flatMap(city =>
    adzunaPages.flatMap(page =>
      indiaQueries.slice(0, 4).map(query =>
      axios.get(
        `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${adzunaAppId}&app_key=${adzunaKey}&results_per_page=20&what=${encodeURIComponent(query)}&where=${encodeURIComponent(city)}&content-type=application/json`,
        { timeout: 9000 }
      ).then(res =>
        (res.data?.results || []).map(job => ({
          title: job.title,
          company: job.company?.display_name || 'India',
          location: normalizeLocationText(job.location?.display_name || city),
          salary: formatIndianSalary(job.salary_min, job.salary_max),
          description: normalizeDescription(job.description),
          url: job.redirect_url,
          portal: 'adzuna_in',
          source: 'Adzuna India',
          job_type: inferJobType(job.location?.display_name, job.title)
        }))
      ).catch(() => [])
      )
    )
  );

  const remotiveCalls = roleQueries.slice(0, 3).map(query =>
    axios.get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`, {
      timeout: 9000
    }).then(res =>
      (Array.isArray(res.data?.jobs) ? res.data.jobs : [])
      .filter(job => isIndiaFriendlyRemoteJob(job.candidate_required_location || ''))
      .map(job => ({
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        description: normalizeDescription(job.description),
        url: job.url,
        portal: 'remotive',
        source: 'Remotive',
        job_type: inferJobType(job.candidate_required_location, job.title)
      }))
    ).catch(() => [])
  );

  const apiCalls = [
    ...adzunaCalls,
    ...remotiveCalls,
    axios.get('https://remoteok.com/api', {
      timeout: 9000,
      headers: { 'User-Agent': 'JobApplyAI/1.0' }
    }).then(res => {
      const payload = Array.isArray(res.data) ? res.data.slice(1) : [];
      return payload.map(job => ({
        title: job.position,
        company: job.company,
        location: job.location || 'Remote Worldwide',
        salary: job.salary_min ? `$${Math.round(job.salary_min / 1000)}k+` : 'Worldwide Competitive',
        description: normalizeDescription(job.description),
        url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
        portal: 'remoteok',
        source: 'RemoteOK',
        job_type: inferJobType(job.location, job.position)
      }));
    }).catch(() => []),
    axios.get('https://www.arbeitnow.com/api/job-board-api', {
      timeout: 9000
    }).then(res =>
      (Array.isArray(res.data?.data) ? res.data.data : []).map(job => ({
        title: job.title,
        company: job.company_name,
        location: Array.isArray(job.location) ? job.location.join(', ') : (job.location || 'Worldwide'),
        salary: 'Competitive',
        description: normalizeDescription(job.description),
        url: job.url,
        portal: 'arbeitnow',
        source: 'Arbeitnow',
        job_type: inferJobType(Array.isArray(job.location) ? job.location.join(', ') : job.location, job.title)
      }))
    ).catch(() => [])
  ];

  const results = await Promise.allSettled(apiCalls);
  const jobs = results.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);

  const ranked = dedupeJobs(jobs)
    .filter(job => job.title && job.company && job.url)
    .filter(job => isIndiaLocation(job.location) || isIndiaFriendlyRemoteJob(job.location) || (job.job_type || '').toLowerCase() === 'remote')
    .map(job => ({
      ...job,
      match_score: rankJob(job, scoringSkills, queryTerms, roleHints)
    }))
    .sort((a, b) => b.match_score - a.match_score);

  const indiaFirst = ranked
    .filter(job => job.match_score >= 26)
    .sort((a, b) => {
      const aIndia = isIndiaLocation(a.location) ? 1 : 0;
      const bIndia = isIndiaLocation(b.location) ? 1 : 0;
      return bIndia - aIndia || b.match_score - a.match_score;
    });

  return indiaFirst.slice(0, 120);
}

function calculateMatchScore(job, skills) {
  let score = 50;
  const jobText = `${job.title} ${job.description}`.toLowerCase();

  skills.forEach(skill => {
    const matches = countSkillMatches(jobText, skill);
    if (matches > 0) {
      score += Math.min(12, 5 + (matches * 3));
    }
  });

  return Math.min(100, score);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  await ensureAwake();

  try {
    if (req.method === 'POST') {
      const { resume_id } = req.body;
      if (!resume_id) {
        return res.status(400).json({ error: 'Missing resume_id' });
      }

      const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resume_id)
        .single();
      if (resumeError) throw resumeError;

      const resumeText = (resume.content || '').toLowerCase();
      const profile = buildSearchProfile(resumeText);
      const { domain, searchSkills, matchedDomainSkills } = profile;
      const foundSkills = matchedDomainSkills.length > 0
        ? matchedDomainSkills
        : searchSkills.filter(skill => !ROLE_HINTS[domain]?.includes(skill));

      console.log('Detected domain:', domain, 'Fetching real jobs for skills:', searchSkills);
      const jobs = await fetchJobsFromAPIs(profile);
      console.log(`Found ${jobs.length} real jobs`);

      if (jobs.length === 0) {
        return res.status(200).json({ message: 'No jobs found', jobs: [] });
      }

      const jobsWithScores = jobs
        .map(job => ({
          ...job,
          match_score: job.match_score || calculateMatchScore(job, foundSkills),
        }))
        .sort((a, b) => b.match_score - a.match_score);

      await supabase.from('job_matches').delete().eq('resume_id', resume_id);

      const insertData = jobsWithScores.map(job => ({
        resume_id,
        job_title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        match_score: job.match_score,
        portal: job.portal,
        job_url: job.url,
        description: job.description,
        source: job.source,
        job_type: job.job_type,
      }));

      const { data, error } = await supabase
        .from('job_matches')
        .insert(insertData)
        .select();

      if (error) throw error;

      return res.status(201).json({ jobs: data, count: data.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
