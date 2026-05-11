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

const DOMAIN_ANCHORS = {
  frontend: ['frontend', 'react', 'ui', 'web', 'javascript', 'typescript'],
  backend: ['backend', 'api', 'server', 'python', 'node', 'java'],
  fullstack: ['full stack', 'fullstack', 'software engineer', 'application developer'],
  devops: ['devops', 'platform', 'site reliability', 'sre', 'cloud'],
  data_science: ['data scientist', 'machine learning', 'ml', 'ai engineer', 'artificial intelligence', 'nlp'],
  data_analyst: ['data analyst', 'analytics', 'bi', 'business intelligence', 'reporting', 'tableau', 'power bi'],
  design: ['designer', 'ui', 'ux', 'product design', 'figma'],
  database: ['database', 'data engineer', 'sql', 'dba'],
  mobile: ['mobile', 'android', 'ios', 'flutter', 'react native'],
  cybersecurity: ['security', 'cybersecurity', 'infosec', 'soc', 'penetration']
};

const EXCLUDED_TITLE_PATTERNS = [
  /\btax\b/i,
  /\benablement\b/i,
  /\bparalegal\b/i,
  /\baccount executive\b/i,
  /\bsales\b/i,
  /\bmarketing\b/i,
  /\bcompensation\b/i,
  /\blegal\b/i,
  /\btrader\b/i,
  /\bnurse\b/i
];

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

const INDIA_SEARCH_CITIES = [
  'India',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Delhi NCR'
];

const STRICT_FRESH_DAYS = 3;
const RECENT_FRESH_DAYS = 7;
const MAX_JOB_AGE_DAYS = 14;

function normalizeDatePosted(value) {
  if (!value && value !== 0) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'number') {
    const timestamp = value > 9999999999 ? value : value * 1000;
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const numericValue = Number(trimmed);
    return normalizeDatePosted(numericValue);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getJobAgeInDays(datePosted) {
  const normalized = normalizeDatePosted(datePosted);
  if (!normalized) return Number.POSITIVE_INFINITY;

  const diffMs = Date.now() - new Date(normalized).getTime();
  if (diffMs < 0) return 0;
  return diffMs / (1000 * 60 * 60 * 24);
}

function isFreshJob(job, maxAgeDays) {
  return getJobAgeInDays(job.date_posted) <= maxAgeDays;
}

function getFreshnessBoost(datePosted) {
  const ageInDays = getJobAgeInDays(datePosted);
  if (!Number.isFinite(ageInDays)) return -18;
  if (ageInDays <= 1) return 20;
  if (ageInDays <= STRICT_FRESH_DAYS) return 14;
  if (ageInDays <= RECENT_FRESH_DAYS) return 8;
  if (ageInDays <= MAX_JOB_AGE_DAYS) return 2;
  return -24;
}

function compareJobsByFreshnessAndScore(a, b) {
  const ageDiff = getJobAgeInDays(a.date_posted) - getJobAgeInDays(b.date_posted);
  if (Math.abs(ageDiff) > 0.05) {
    return ageDiff;
  }
  return b.match_score - a.match_score;
}

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

function isBroadRemoteJob(location) {
  const text = normalizeLocationText(location).toLowerCase();
  return (
    text.includes('remote') ||
    text.includes('worldwide') ||
    text.includes('anywhere') ||
    text.includes('global') ||
    text.includes('asia') ||
    text.includes('apac')
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

function normalizeQuery(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getProfileQueryTerms(profile) {
  const { roleHints = [], matchedDomainSkills = [], domain } = profile;
  const anchors = DOMAIN_ANCHORS[domain] || [];
  return [...new Set([
    ...roleHints,
    ...anchors,
    ...matchedDomainSkills.slice(0, 6)
  ].filter(Boolean).map(normalizeQuery))];
}

function countAnchorHits(text, anchors = []) {
  return anchors.reduce((sum, anchor) => sum + (matchesSkill(text, anchor) ? 1 : 0), 0);
}

function countAnyTermHits(text, terms = []) {
  return terms.reduce((sum, term) => sum + countSkillMatches(text, term), 0);
}

function isStrictDomainMatch(job, profile) {
  const { domain, roleHints = [], matchedDomainSkills = [] } = profile;
  const titleText = `${job.title || ''}`.toLowerCase();
  const fullText = `${job.title || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
  const anchors = DOMAIN_ANCHORS[domain] || [];
  const roleTitleMatches = roleHints.filter(role => countSkillMatches(titleText, role) > 0).length;
  const roleBodyMatches = roleHints.filter(role => countSkillMatches(fullText, role) > 0).length;
  const anchorHits = countAnchorHits(fullText, anchors);
  const skillHits = matchedDomainSkills.filter(skill => matchesSkill(fullText, skill)).length;
  const excludedTitle = EXCLUDED_TITLE_PATTERNS.some(pattern => pattern.test(titleText));

  if (excludedTitle && roleTitleMatches === 0 && anchorHits < 2) {
    return false;
  }

  if (roleTitleMatches > 0) {
    return true;
  }

  if (roleBodyMatches > 0 && skillHits >= 2) {
    return true;
  }

  return anchorHits >= 2 && skillHits >= 2;
}

function buildPortalSearchLinks(profile) {
  const primaryRole = normalizeQuery(profile.roleHints?.[0] || profile.searchSkills?.[0] || 'Software Engineer');
  const domainLabel = primaryRole || 'Software Engineer';
  const slugRole = domainLabel.toLowerCase().replace(/\s+/g, '-');
  const searches = INDIA_SEARCH_CITIES.flatMap((city, index) => {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const citySuffix = city === 'India' ? 'India' : city;
    const score = Math.max(88, 100 - index);

    return [
      {
        title: `${domainLabel} jobs on LinkedIn`,
        company: 'LinkedIn',
        location: citySuffix,
        salary: 'Open search',
        description: `Open LinkedIn search results for ${domainLabel} jobs in ${citySuffix}.`,
        url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(domainLabel)}&location=${encodeURIComponent(citySuffix)}`,
        portal: 'linkedin_search',
        source: 'LinkedIn Search',
        job_type: 'Search',
        match_score: score
      },
      {
        title: `${domainLabel} jobs on Indeed`,
        company: 'Indeed',
        location: citySuffix,
        salary: 'Open search',
        description: `Open Indeed search results for ${domainLabel} jobs in ${citySuffix}.`,
        url: `https://in.indeed.com/jobs?q=${encodeURIComponent(domainLabel)}&l=${encodeURIComponent(citySuffix)}`,
        portal: 'indeed_search',
        source: 'Indeed Search',
        job_type: 'Search',
        match_score: score - 1
      },
      {
        title: `${domainLabel} jobs on Naukri`,
        company: 'Naukri',
        location: citySuffix,
        salary: 'Open search',
        description: `Open Naukri search results for ${domainLabel} jobs in ${citySuffix}.`,
        url: city === 'India'
          ? `https://www.naukri.com/${encodeURIComponent(slugRole)}-jobs-in-india`
          : `https://www.naukri.com/${encodeURIComponent(slugRole)}-jobs-in-${encodeURIComponent(citySlug)}`,
        portal: 'naukri_search',
        source: 'Naukri Search',
        job_type: 'Search',
        match_score: score - 2
      }
    ];
  });

  return dedupeJobs(searches);
}

function isPortalSearchLink(job) {
  return typeof job?.portal === 'string' && job.portal.endsWith('_search');
}

function rankJob(job, skills, queryTerms, roleHints = [], profile = null) {
  const text = `${job.title || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
  const titleText = `${job.title || ''}`.toLowerCase();
  let score = 0;
  let roleMatchCount = 0;
  let skillMatchCount = 0;
  const titleSkillHits = skills.filter(skill => matchesSkill(titleText, skill)).length;
  const anchorHits = profile ? countAnchorHits(text, DOMAIN_ANCHORS[profile.domain] || []) : 0;

  roleHints.forEach(role => {
    const titleMatches = countSkillMatches(titleText, role);
    const bodyMatches = countSkillMatches(text, role);
    if (titleMatches > 0 || bodyMatches > 0) {
      roleMatchCount += 1;
      score += titleMatches > 0 ? 28 : 12;
    }
  });

  skills.forEach(skill => {
    const matches = countSkillMatches(text, skill);
    if (matches > 0) {
      skillMatchCount += 1;
      score += Math.min(10, 4 + (matches * 2));
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

  if (titleSkillHits > 0) {
    score += Math.min(12, titleSkillHits * 4);
  }

  if (anchorHits > 0) {
    score += Math.min(12, anchorHits * 4);
  }

  score += getFreshnessBoost(job.date_posted);

  if (roleMatchCount === 0 && titleSkillHits === 0 && anchorHits < 2) {
    return 0;
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
  const { roleHints = [], matchedDomainSkills = [], domain } = profile;
  const baseTerms = [...new Set([
    ...roleHints.slice(0, 3),
    ...matchedDomainSkills.slice(0, 3)
  ].filter(Boolean))];
  const queries = new Set();

  baseTerms.slice(0, 5).forEach(term => {
    queries.add(term);
    queries.add(`${term} India`);
  });

  if (baseTerms.length >= 2) {
    queries.add(`${baseTerms[0]} ${baseTerms[1]}`);
    queries.add(`${baseTerms[0]} ${baseTerms[1]} India`);
  }

  if (domain === 'fullstack' || domain === 'frontend' || domain === 'backend') {
    queries.add(`${roleHints[0] || 'Software Engineer'} India`);
  }

  return [...queries].slice(0, 8);
}

function buildBroadQueries(profile) {
  const { roleHints = [], matchedDomainSkills = [] } = profile;
  return [...new Set([
    ...roleHints.slice(0, 3),
    ...matchedDomainSkills.slice(0, 4),
    `${roleHints[0] || 'Software Engineer'} Remote`,
    `${roleHints[0] || 'Software Engineer'} Worldwide`
  ].filter(Boolean))].slice(0, 8);
}

async function fetchJobsFromAPIs(profile) {
  const { searchSkills, roleHints = [], matchedDomainSkills = [] } = profile;
  const queryTerms = getProfileQueryTerms(profile).slice(0, 8);
  const scoringSkills = matchedDomainSkills.length > 0 ? matchedDomainSkills.slice(0, 8) : searchSkills.slice(0, 6);
  const roleQueries = [
    roleHints[0],
    roleHints[1],
    queryTerms.slice(0, 2).join(' '),
    queryTerms[0]
  ].filter(Boolean);
  const indiaQueries = buildIndiaQueries(profile);
  const broadQueries = buildBroadQueries(profile);

  const adzunaAppId = process.env.ADZUNA_APP_ID?.trim();
  const adzunaKey = process.env.ADZUNA_API_KEY?.trim();
  const adzunaPages = [1, 2];

  const adzunaCalls = adzunaAppId && adzunaKey
    ? INDIA_PRIORITY_CITIES.flatMap(city =>
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
              date_posted: normalizeDatePosted(job.created || job.created_time || job.updated),
              portal: 'adzuna_in',
              source: 'Adzuna India',
              job_type: inferJobType(job.location?.display_name, job.title)
            }))
          ).catch(() => [])
        )
      )
    )
    : [];

  const remotiveCalls = roleQueries.slice(0, 3).map(query =>
    axios.get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`, {
      timeout: 9000
    }).then(res =>
      (Array.isArray(res.data?.jobs) ? res.data.jobs : [])
      .filter(job => {
        const location = job.candidate_required_location || '';
        return !location || isIndiaFriendlyRemoteJob(location) || isBroadRemoteJob(location);
      })
      .map(job => ({
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        description: normalizeDescription(job.description),
        url: job.url,
        date_posted: normalizeDatePosted(job.publication_date || job.created_at || job.updated_at),
        portal: 'remotive',
        source: 'Remotive',
        job_type: inferJobType(job.candidate_required_location, job.title)
      }))
    ).catch(() => [])
  );

  const indeedRssCalls = broadQueries.slice(0, 4).flatMap(query => ([
    axios.get(`https://in.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent('India')}`, {
      timeout: 9000,
      headers: { 'User-Agent': 'JobApplyAI/1.0' }
    }).then(res => {
      const xml = String(res.data || '');
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
      return items.map(([, item]) => {
        const titleRaw = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] || item.match(/<title>(.*?)<\/title>/i)?.[1] || '').trim();
        const link = (item.match(/<link>(.*?)<\/link>/i)?.[1] || '').trim();
        const description = normalizeDescription(item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i)?.[1] || '');
        const pubDate = normalizeDatePosted(item.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] || '');
        const titleParts = titleRaw.split(' - ');
        return {
          title: (titleParts[0] || titleRaw || query).trim(),
          company: (titleParts[1] || 'Indeed').trim(),
          location: (titleParts[2] || 'India').trim(),
          salary: 'Competitive',
          description,
          url: link,
          date_posted: pubDate,
          portal: 'indeed_rss',
          source: 'Indeed India',
          job_type: inferJobType(titleParts[2] || 'India', titleParts[0] || titleRaw)
        };
      }).filter(job => job.title && job.url);
    }).catch(() => []),
    axios.get(`https://in.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent('Remote')}`, {
      timeout: 9000,
      headers: { 'User-Agent': 'JobApplyAI/1.0' }
    }).then(res => {
      const xml = String(res.data || '');
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
      return items.map(([, item]) => {
        const titleRaw = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] || item.match(/<title>(.*?)<\/title>/i)?.[1] || '').trim();
        const link = (item.match(/<link>(.*?)<\/link>/i)?.[1] || '').trim();
        const description = normalizeDescription(item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i)?.[1] || '');
        const pubDate = normalizeDatePosted(item.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] || '');
        const titleParts = titleRaw.split(' - ');
        const location = (titleParts[2] || 'Remote').trim();
        return {
          title: (titleParts[0] || titleRaw || query).trim(),
          company: (titleParts[1] || 'Indeed').trim(),
          location,
          salary: 'Competitive',
          description,
          url: link,
          date_posted: pubDate,
          portal: 'indeed_rss',
          source: 'Indeed Remote',
          job_type: inferJobType(location, titleParts[0] || titleRaw)
        };
      }).filter(job => job.title && job.url);
    }).catch(() => [])
  ]));

  const apiCalls = [
    ...adzunaCalls,
    ...remotiveCalls,
    ...indeedRssCalls,
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
        date_posted: normalizeDatePosted(job.date || job.iso_date || job.epoch || job.time),
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
        date_posted: normalizeDatePosted(job.created_at || job.published_at || job.updated_at),
        portal: 'arbeitnow',
        source: 'Arbeitnow',
        job_type: inferJobType(Array.isArray(job.location) ? job.location.join(', ') : job.location, job.title)
      }))
    ).catch(() => [])
  ];

  const settledResults = await Promise.allSettled(apiCalls);
  const jobs = settledResults.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);

  const ranked = dedupeJobs(jobs)
    .filter(job => job.title && job.company && job.url)
    .filter(job => isIndiaLocation(job.location) || isIndiaFriendlyRemoteJob(job.location) || isBroadRemoteJob(job.location) || (job.job_type || '').toLowerCase() === 'remote')
    .filter(job => isStrictDomainMatch(job, profile))
    .map(job => ({
      ...job,
      match_score: rankJob(job, scoringSkills, queryTerms, roleHints, profile)
    }))
    .sort((a, b) => b.match_score - a.match_score);

  const indiaFirst = ranked
    .filter(job => job.match_score >= 45)
    .filter(job => isFreshJob(job, RECENT_FRESH_DAYS))
    .sort((a, b) => {
      const aIndia = isIndiaLocation(a.location) ? 1 : 0;
      const bIndia = isIndiaLocation(b.location) ? 1 : 0;
      return bIndia - aIndia || compareJobsByFreshnessAndScore(a, b);
    });

  const strictlyFresh = ranked
    .filter(job => job.match_score >= 45)
    .filter(job => isFreshJob(job, STRICT_FRESH_DAYS))
    .sort((a, b) => {
      const aIndia = isIndiaLocation(a.location) ? 1 : 0;
      const bIndia = isIndiaLocation(b.location) ? 1 : 0;
      return bIndia - aIndia || compareJobsByFreshnessAndScore(a, b);
    });

  const searchLinks = buildPortalSearchLinks(profile);
  const indiaLiveJobs = ranked
    .filter(job => job.match_score >= 28)
    .filter(job => isIndiaLocation(job.location) || isIndiaFriendlyRemoteJob(job.location))
    .filter(job => isFreshJob(job, MAX_JOB_AGE_DAYS))
    .sort((a, b) => compareJobsByFreshnessAndScore(a, b));
  const broadFallback = dedupeJobs(jobs)
    .filter(job => job.title && job.company && job.url)
    .filter(job => isIndiaLocation(job.location) || isIndiaFriendlyRemoteJob(job.location) || isBroadRemoteJob(job.location) || (job.job_type || '').toLowerCase() === 'remote')
    .map(job => ({
      ...job,
      match_score: rankJob(job, scoringSkills, queryTerms, roleHints, profile)
    }))
    .filter(job => job.match_score >= 28)
    .filter(job => isFreshJob(job, MAX_JOB_AGE_DAYS))
    .sort((a, b) => {
      const aIndia = isIndiaLocation(a.location) ? 1 : 0;
      const bIndia = isIndiaLocation(b.location) ? 1 : 0;
      return bIndia - aIndia || compareJobsByFreshnessAndScore(a, b);
    });

  const globalFallback = dedupeJobs(jobs)
    .filter(job => job.title && job.company && job.url)
    .map(job => ({
      ...job,
      match_score: rankJob(job, scoringSkills, queryTerms, roleHints, profile)
    }))
    .filter(job => job.match_score >= 28)
    .filter(job => isFreshJob(job, MAX_JOB_AGE_DAYS))
    .sort((a, b) => {
      const aRemote = ((a.job_type || '').toLowerCase() === 'remote' || /worldwide|anywhere|remote/i.test(a.location || '')) ? 1 : 0;
      const bRemote = ((b.job_type || '').toLowerCase() === 'remote' || /worldwide|anywhere|remote/i.test(b.location || '')) ? 1 : 0;
      return bRemote - aRemote || compareJobsByFreshnessAndScore(a, b);
    });

  const rescueTerms = [...new Set([...roleHints, ...queryTerms.slice(0, 4), ...scoringSkills.slice(0, 4)].filter(Boolean))];
  const lastResort = dedupeJobs(jobs)
    .filter(job => job.title && job.company && job.url)
    .map(job => {
      const text = `${job.title || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
      const textHits = countAnyTermHits(text, rescueTerms);
      const remoteBoost = ((job.job_type || '').toLowerCase() === 'remote' || /worldwide|anywhere|remote/i.test(job.location || '')) ? 2 : 0;
      return {
        ...job,
        match_score: Math.min(100, textHits * 6 + remoteBoost)
      };
    })
    .filter(job => job.match_score > 0)
    .filter(job => isFreshJob(job, MAX_JOB_AGE_DAYS))
    .sort((a, b) => compareJobsByFreshnessAndScore(a, b));

  const liveJobs = (
    strictlyFresh.length > 0
      ? strictlyFresh
      : indiaFirst.length > 0
        ? indiaFirst
        : broadFallback.length > 0
          ? broadFallback
          : globalFallback.length > 0
            ? globalFallback
              : lastResort
  ).slice(0, 60);

  if (liveJobs.length === 0) {
    return searchLinks;
  }

  if (indiaLiveJobs.length === 0) {
    return searchLinks.slice(0, 18);
  }

  if (indiaLiveJobs.length < 5) {
    return dedupeJobs([
      ...indiaLiveJobs.slice(0, 5),
      ...searchLinks.slice(0, 12)
    ]).slice(0, 18);
  }

  return liveJobs;
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

function normalizeSavedJobMatch(row) {
  return {
    id: row.id,
    job_title: row.job_title,
    company: row.company,
    location: row.location,
    salary: row.salary,
    match_score: row.match_score,
    portal: row.portal,
    job_url: row.job_url,
    description: row.description,
    source: row.source,
    job_type: row.job_type,
    date_posted: row.date_posted || null
  };
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

      const savedMatches = Array.isArray(data) ? data.map(normalizeSavedJobMatch) : [];
      const liveJobCount = savedMatches.filter(job => !isPortalSearchLink(job)).length;
      const searchLinkCount = savedMatches.filter(job => isPortalSearchLink(job)).length;
      return res.status(201).json({
        jobs: savedMatches,
        saved_matches: savedMatches,
        count: savedMatches.length,
        live_job_count: liveJobCount,
        search_link_count: searchLinkCount,
        detected_domain: domain,
        search_role: profile.roleHints?.[0] || ''
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
