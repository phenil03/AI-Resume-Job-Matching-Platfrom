import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import axios from 'axios';
// @ts-ignore - shared Node-side helper used by the local Vite mock.
import { countSkillMatches, extractDynamicKeywords, getResumeText, matchesSkill } from './api/_text-utils.js';

// ─── DOMAIN SKILL MAP (SYC WITH API) ─────────────────────────────────────────
const DOMAINS = {
  frontend: {
    detect: ['react', 'vue', 'angular', 'next.js', 'svelte', 'html', 'css', 'javascript', 'typescript', 'ui developer', 'frontend', 'web developer', 'client-side'],
    skills: [
      'React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Tailwind', 
      'Redux', 'Sass', 'Webpack', 'Vite', 'Responsive Design', 'REST API', 'GraphQL', 'Next.js', 
      'Svelte', 'Bootstrap', 'Material UI', 'Storybook', 'Jest', 'Cypress', 'Playwright', 'ES6'
    ]
  },
  backend: {
    detect: ['node', 'django', 'flask', 'fastapi', 'spring', 'backend', 'server', 'api developer', 'express', 'microservices', 'distributed systems'],
    skills: [
      'Node.js', 'Python', 'Java', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Go', 'Golang', 
      'REST API', 'GraphQL', 'Microservices', 'PHP', 'Ruby', 'Express', 'NestJS', 'Laravel', 
      'PostgreSQL', 'Redis', 'Kafka', 'RabbitMQ', 'gRPC', 'Serverless', 'Authentication', 'SQL'
    ]
  },
  fullstack: {
    detect: ['fullstack', 'full stack', 'full-stack', 'mern', 'mean', 'lamp', 'software engineer', 'software developer'],
    skills: [
      'React', 'Node.js', 'MongoDB', 'Express', 'TypeScript', 'PostgreSQL', 'REST API', 'Docker', 
      'Git', 'AWS', 'HTML', 'CSS', 'JavaScript', 'Python', 'Redis', 'CI/CD', 'Next.js', 'API Design'
    ]
  },
  devops: {
    detect: ['devops', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ci/cd', 'cicd', 'infrastructure', 'site reliability', 'sre', 'cloud engineer'],
    skills: [
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'GitHub Actions', 'Terraform', 
      'Ansible', 'Linux', 'Bash', 'CI/CD', 'Helm', 'Prometheus', 'Grafana', 'CloudFormation', 
      'Infrastructure as Code', 'Monitoring', 'Logging', 'Scaling', 'SRE'
    ]
  },
  data_science: {
    detect: ['data science', 'machine learning', 'deep learning', 'nlp', 'data scientist', 'ml engineer', 'ai engineer', 'pytorch', 'tensorflow', 'artificial intelligence'],
    skills: [
      'Python', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'Pandas', 'NumPy', 'NLP', 'Deep Learning', 
      'Data Science', 'Jupyter', 'Matplotlib', 'Keras', 'HuggingFace', 'OpenCV', 'Computer Vision', 
      'LLM', 'Generative AI', 'Statistics', 'SQL', 'R', 'Apache Spark'
    ]
  },
  data_analyst: {
    detect: ['data analyst', 'business analyst', 'power bi', 'tableau', 'excel', 'data analysis', 'sql analyst', 'data visualization'],
    skills: [
      'SQL', 'Power BI', 'Tableau', 'Excel', 'Python', 'Pandas', 'Data Visualization', 'Statistics', 
      'R', 'Google Analytics', 'ETL', 'BigQuery', 'Snowflake', 'DASH', 'Reporting', 'Data Modeling'
    ]
  },
  design: {
    detect: ['ui/ux', 'ux designer', 'ui designer', 'figma', 'adobe xd', 'product designer', 'graphic designer', 'wireframe', 'prototyping', 'user research', 'creative'],
    skills: [
      'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Sketch', 'Wireframing', 'Prototyping', 
      'User Research', 'Design System', 'Interaction Design', 'Visual Design', 'InVision', 
      'Typography', 'Color Theory', 'UX Writing', 'Accessibility', 'Mobile Design'
    ]
  },
  database: {
    detect: ['dba', 'database administrator', 'postgresql', 'mysql', 'mongodb', 'oracle', 'database engineer', 'sql server'],
    skills: [
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Oracle', 'SQLite', 'DynamoDB', 'Firebase', 
      'SQL', 'NoSQL', 'Database Design', 'Query Optimization', 'Database Administration', 
      'Data Migration', 'Sharding', 'Replication'
    ]
  },
  mobile: {
    detect: ['android', 'ios', 'flutter', 'react native', 'swift', 'kotlin', 'mobile developer', 'app developer'],
    skills: [
      'Flutter', 'React Native', 'Swift', 'Kotlin', 'Android', 'iOS', 'Dart', 'Firebase', 
      'Xcode', 'Android Studio', 'REST API', 'Mobile UI', 'Push Notifications', 'Core Data', 'SwiftUI'
    ]
  },
  cybersecurity: {
    detect: ['cybersecurity', 'security analyst', 'penetration testing', 'ethical hacking', 'soc analyst', 'network security', 'infosec', 'security engineer'],
    skills: [
      'Penetration Testing', 'Ethical Hacking', 'SIEM', 'Firewalls', 'Network Security', 
      'Vulnerability Assessment', 'Linux', 'Kali Linux', 'OWASP', 'Cryptography', 'IAM', 
      'Zero Trust', 'Cloud Security', 'Incident Response'
    ]
  }
};

const ROLE_HINTS: Record<string, string[]> = {
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

function detectDomain(lowerContent: string) {
  const scores: Record<string, number> = {};
  for (const [domain, config] of Object.entries(DOMAINS)) {
    scores[domain] = config.detect.filter(word => matchesSkill(lowerContent, word)).length;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'fullstack';
}

function buildResumeSearchProfile(content: string) {
  const domain = detectDomain(content.toLowerCase());
  const domainSkills = DOMAINS[domain as keyof typeof DOMAINS].skills || [];
  const matchedDomainSkills = domainSkills
    .map(skill => ({ skill, count: countSkillMatches(content, skill) }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.skill.length - b.skill.length)
    .map(entry => entry.skill);

  const roleHints = ROLE_HINTS[domain] || ROLE_HINTS.fullstack;
  return {
    domain,
    roleHints,
    matchedDomainSkills,
    searchSkills: [...roleHints, ...matchedDomainSkills].slice(0, 8)
  };
}

function rankStrictJob(job: { title?: string; description?: string; location?: string }, skills: string[], queryTerms: string[], roleHints: string[]) {
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

  if (roleMatchCount === 0 && skillMatchCount < 2) {
    return 0;
  }

  return Math.min(100, score);
}

function analyzeMockResume(content: string) {
  const normalizedContent = content || '';
  const primaryDomain = detectDomain(normalizedContent.toLowerCase());
  const domainSkills = DOMAINS[primaryDomain as keyof typeof DOMAINS].skills;
  const allPossibleSkills = Object.values(DOMAINS).flatMap(d => d.skills);
  const uniqueSkills = [...new Set(allPossibleSkills)];
  const matchedSkills = uniqueSkills.filter(skill => matchesSkill(normalizedContent, skill));
  const matchedDomainSkills = domainSkills.filter(skill => matchesSkill(normalizedContent, skill));
  const foundKeywords = extractDynamicKeywords(normalizedContent, matchedSkills, 15);

  const totalKeywordHits = matchedSkills.reduce((sum, skill) => sum + countSkillMatches(normalizedContent, skill), 0);
  const domainCoverage = domainSkills.length > 0 ? matchedDomainSkills.length / domainSkills.length : 0;
  const overallCoverage = uniqueSkills.length > 0 ? matchedSkills.length / uniqueSkills.length : 0;
  const keywordDensity = matchedSkills.length > 0 ? totalKeywordHits / matchedSkills.length : 0;
  const keywordScore = Math.round(
    Math.min(35, domainCoverage * 28) +
    Math.min(10, overallCoverage * 40) +
    Math.min(7, keywordDensity * 2)
  );

  const sections = {
    contact: /([a-zA-Z0-9._%+-]+@|phone|mobile|linkedin|github|portfolio)/,
    education: /(education|degree|university|college|bachelor|master|b\.tech|m\.tech|graduate)/,
    experience: /(experience|worked|employment|internship|professional)/,
    skills: /(skills|technologies|tools|competencies|expertise)/
  };

  let sectionScore = 0;
  const missingSections: string[] = [];
  Object.entries(sections).forEach(([name, regex]) => {
    if (regex.test(normalizedContent.toLowerCase())) {
      sectionScore += name === 'experience' ? 10 : 5;
    } else {
      missingSections.push(name);
    }
  });

  const metricMatch = normalizedContent.toLowerCase().match(/\d+%/g) || [];
  const actionVerbs = ['developed', 'led', 'managed', 'implemented', 'designed', 'optimized',
    'scaled', 'architected', 'resolved', 'collaborated', 'increased', 'decreased', 'shipped',
    'built', 'deployed', 'automated', 'analyzed', 'delivered', 'launched', 'created'];
  const verbMatch = actionVerbs.filter(verb => matchesSkill(normalizedContent.toLowerCase(), verb));
  const impactScore = Math.min(15, (metricMatch.length * 4) + (verbMatch.length * 1.5));

  const wordCount = normalizedContent.split(/\s+/).filter(Boolean).length;
  const depthScore = wordCount > 180 && wordCount < 850 ? 10 : wordCount >= 850 ? 7 : 4;
  const score = Math.max(18, Math.min(98, Math.round(keywordScore + sectionScore + impactScore + depthScore + 12)));

  const suggestions: string[] = [];
  const missingFromDomain = domainSkills.filter(skill => !matchesSkill(normalizedContent, skill)).slice(0, 3);

  if (missingFromDomain.length > 0) {
    suggestions.push(`${primaryDomain.replace('_', ' ').toUpperCase()} Gap: Consider adding ${missingFromDomain.join(', ')} to strengthen your profile.`);
  }
  if (missingSections.length > 0) {
    suggestions.push(`Missing Sections: Add or clearly label - ${missingSections.join(', ')}.`);
  }
  if (metricMatch.length === 0) {
    suggestions.push('Quantify Impact: Add numbers like "Reduced load time by 40%" to stand out in ATS.');
  }
  if (matchedDomainSkills.length < 5) {
    suggestions.push(`Low Keyword Match: Only ${matchedDomainSkills.length} core ${primaryDomain.replace('_', ' ')} skills found. Add more domain-specific tools.`);
  }
  if (verbMatch.length < 3) {
    suggestions.push('Weak Action Verbs: Start bullets with Built, Deployed, Optimized, Delivered, Automated.');
  }

  return {
    score,
    suggestions: suggestions.slice(0, 5),
    keywords_found: foundKeywords.slice(0, 15)
  };
}

function inferJobType(location: string, title: string) {
  const text = `${location} ${title}`.toLowerCase();
  if (text.includes('remote') || text.includes('worldwide')) return 'Remote';
  if (text.includes('hybrid')) return 'Hybrid';
  return 'On-site';
}

function normalizeLocationText(value: string) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function isIndiaLocation(value: string) {
  const text = normalizeLocationText(value).toLowerCase();
  return INDIA_LOCATION_HINTS.some(token => text.includes(token));
}

function isIndiaFriendlyRemoteJob(location: string) {
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

function formatIndianSalary(minSalary?: number, maxSalary?: number) {
  const values = [minSalary, maxSalary].filter(value => Number.isFinite(value) && Number(value) > 0) as number[];
  if (values.length === 0) return 'Competitive';

  const annualLakhs = values.map(value => `${(value / 100000).toFixed(1).replace(/\.0$/, '')} LPA`);
  return annualLakhs.length === 2 ? `₹${annualLakhs[0]} - ₹${annualLakhs[1]}` : `₹${annualLakhs[0]}+`;
}

function dedupeJobs<T extends { title?: string; company?: string; url?: string }>(jobs: T[]) {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = `${job.title || ''}::${job.company || ''}::${(job as any).location || ''}::${job.url || ''}`.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildIndiaQueries(searchSkills: string[]) {
  const baseTerms = [...new Set(searchSkills.filter(Boolean))];
  const queries = new Set<string>();

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

async function fetchLiveJobs(searchSkills: string[]) {
  const queryTerms = [...new Set(searchSkills.filter(Boolean))].slice(0, 6);
  const roleQueries = [
    queryTerms.slice(0, 2).join(' '),
    queryTerms.slice(0, 3).join(' '),
    queryTerms[0],
    'software engineer'
  ].filter(Boolean);
  const indiaQueries = buildIndiaQueries(searchSkills);

  const adzunaPages = [1, 2];
  const adzunaCalls = INDIA_PRIORITY_CITIES.flatMap(city =>
    adzunaPages.flatMap(page =>
      indiaQueries.slice(0, 4).map(query =>
        axios.get(
          `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=8e8f4f4e&app_key=demo-key&results_per_page=20&what=${encodeURIComponent(query)}&where=${encodeURIComponent(city)}&content-type=application/json`,
          { timeout: 9000 }
        )
      )
    )
  );

  const remotiveCalls = roleQueries.slice(0, 3).map(query =>
    axios.get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`, {
      timeout: 9000
    })
  );

  const settledResults = await Promise.allSettled([
    ...adzunaCalls,
    axios.get('https://remoteok.com/api', {
      timeout: 9000,
      headers: { 'User-Agent': 'JobApplyAI/1.0' }
    }),
    axios.get('https://www.arbeitnow.com/api/job-board-api', {
      timeout: 9000
    }),
    ...remotiveCalls
  ]);

  const adzunaJobs = settledResults
    .slice(0, adzunaCalls.length)
    .flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value.data?.results)
      ? result.value.data.results.map((job: any) => ({
          title: job.title,
          company: job.company?.display_name || 'India',
          location: normalizeLocationText(job.location?.display_name || 'India'),
          salary: formatIndianSalary(job.salary_min, job.salary_max),
          description: typeof job.description === 'string' ? job.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 280) : '',
          url: job.redirect_url,
          portal: 'adzuna_in',
          source: 'Adzuna India',
          job_type: inferJobType(job.location?.display_name || '', job.title || '')
        }))
      : []
    );

  const remoteOkResult = settledResults[adzunaCalls.length];
  const arbeitnowResult = settledResults[adzunaCalls.length + 1];
  const remotiveResults = settledResults.slice(adzunaCalls.length + 2);

  const remoteOkJobs = remoteOkResult.status === 'fulfilled' && Array.isArray(remoteOkResult.value.data)
    ? remoteOkResult.value.data.slice(1).map((job: any) => ({
        title: job.position,
        company: job.company,
        location: job.location || 'Remote Worldwide',
        salary: job.salary_min ? `$${job.salary_min / 1000}k+` : 'Competitive',
        description: job.description?.substring(0, 280) || '',
        url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
        portal: 'remoteok',
        source: 'RemoteOK',
        job_type: inferJobType(job.location || 'Remote Worldwide', job.position || '')
      }))
    : [];

  const arbeitnowJobs = arbeitnowResult.status === 'fulfilled' && Array.isArray(arbeitnowResult.value.data?.data)
    ? arbeitnowResult.value.data.data.slice(0, 25).map((job: any) => ({
        title: job.title,
        company: job.company_name,
        location: Array.isArray(job.location) ? job.location.join(', ') : (job.location || 'Worldwide'),
        salary: 'Competitive',
        description: typeof job.description === 'string' ? job.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 280) : '',
        url: job.url,
        portal: 'arbeitnow',
        source: 'Arbeitnow',
        job_type: inferJobType(Array.isArray(job.location) ? job.location.join(', ') : (job.location || ''), job.title || '')
      }))
    : [];

  const remotiveJobs = remotiveResults.flatMap(result =>
    result.status === 'fulfilled' && Array.isArray(result.value.data?.jobs)
      ? result.value.data.jobs
        .filter((job: any) => isIndiaFriendlyRemoteJob(job.candidate_required_location || ''))
        .map((job: any) => ({
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || 'Remote',
          salary: job.salary || 'Competitive',
          description: job.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 280) || '',
          url: job.url,
          portal: 'remotive',
          source: 'Remotive',
          job_type: inferJobType(job.candidate_required_location || 'Remote', job.title || '')
        }))
      : []
  );

  const ranked = dedupeJobs([...adzunaJobs, ...remoteOkJobs, ...arbeitnowJobs, ...remotiveJobs])
    .filter(job => job.title && job.company && job.url)
    .filter(job => isIndiaLocation((job as any).location || '') || isIndiaFriendlyRemoteJob((job as any).location || '') || ((job as any).job_type || '').toLowerCase() === 'remote')
    .map(job => ({
      ...job,
      relevance: rankJobRelevance(job, queryTerms)
    }))
    .sort((a, b) => b.relevance - a.relevance);

  const relevant = ranked.filter(job => job.relevance >= 0);
  if (relevant.length > 0) {
    return relevant
      .sort((a: any, b: any) => {
        const aIndia = isIndiaLocation(a.location || '') ? 1 : 0;
        const bIndia = isIndiaLocation(b.location || '') ? 1 : 0;
        return bIndia - aIndia || b.relevance - a.relevance;
      })
      .slice(0, 120);
  }

  return ranked.filter(job => job.portal !== 'arbeitnow').slice(0, 120);
}

function rankJobRelevance(job: { title?: string; description?: string; location?: string }, terms: string[]) {
  const text = `${job.title || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
  let score = 0;

  terms.forEach(term => {
    const matches = countSkillMatches(text, term);
    if (matches > 0) {
      score += term.includes(' ') ? 4 * matches : 2 * matches;
    }
  });

  return score;
}

// Mock DB in-memory
const mockDb: any = {
  resumes: [],
  matches: [],
  applications: [],
  users: []
};

const demoGoogleAccounts = [
  {
    id: 'google-1',
    email: 'himanshu.work@gmail.com',
    user_metadata: {
      full_name: 'Himanshu Work',
      avatar_url: ''
    }
  },
  {
    id: 'google-2',
    email: 'himanshu.personal@gmail.com',
    user_metadata: {
      full_name: 'Himanshu Personal',
      avatar_url: ''
    }
  },
  {
    id: 'google-3',
    email: 'explorer.dev@gmail.com',
    user_metadata: {
      full_name: 'Explorer Dev',
      avatar_url: ''
    }
  }
];

const mockApiPlugin = () => ({
  name: 'mock-api',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const path = url.pathname;

      if (path.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          if (path === '/api/auth/google-accounts') {
            return res.end(JSON.stringify({ accounts: demoGoogleAccounts }));
          }

          if (path === '/api/applications') {
            return res.end(JSON.stringify(mockDb.applications.length > 0 ? mockDb.applications : [
                 { id: 101, job_title: 'Senior Engineer', company: 'TechFlow', portal: 'adzuna', status: 'selected', applied_at: new Date().toISOString() }
            ]));
          }

          if (path === '/api/job-matches') {
            const resumeId = url.searchParams.get('resume_id');
            const jobs = resumeId
              ? mockDb.matches.filter((job: any) => String(job.resume_id) === String(resumeId))
              : mockDb.matches;
            return res.end(JSON.stringify(jobs));
          }
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          let payload: any = {};
          try { if (body) payload = JSON.parse(body); } catch (e) {}

          if (path === '/api/auth/google' && req.method === 'POST') {
            const selectedEmail = String(payload.email || '').trim().toLowerCase();
            const chosenAccount = demoGoogleAccounts.find(account => account.email.toLowerCase() === selectedEmail) || demoGoogleAccounts[0];
            const demoUser = {
              ...chosenAccount,
              id: chosenAccount.id || `google-${Date.now()}`
            };

            mockDb.users = [demoUser, ...mockDb.users.filter((user: any) => user.email !== demoUser.email)];
            return res.end(JSON.stringify({ user: demoUser }));
          }

          if ((path === '/api/auth/login' || path === '/api/auth/signup') && req.method === 'POST') {
            const email = String(payload.email || '').trim().toLowerCase();
            const fullName = String(payload.name || email.split('@')[0] || 'Demo User').trim();

            if (!email) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Email is required' }));
            }

            let user = mockDb.users.find((item: any) => item.email === email);

            if (!user) {
              user = {
                id: `user-${Date.now()}`,
                email,
                user_metadata: {
                  full_name: fullName,
                  avatar_url: ''
                }
              };
              mockDb.users.unshift(user);
            }

            return res.end(JSON.stringify({ user }));
          }

          // Resume Upload Mock
          if (path === '/api/resumes' && req.method === 'POST') {
            const content = await getResumeText({
              content: payload.content || '',
              filename: payload.filename || 'resume.pdf',
              fileType: payload.file_type || 'application/pdf',
              isBinary: Boolean(payload.is_binary),
            });

            if (!content) {
              res.statusCode = 400;
              return res.end(JSON.stringify({
                error: 'Could not extract readable text from this file. Please upload a text-based PDF or TXT resume.'
              }));
            }

            const resume = { 
              id: Date.now(), 
              filename: payload.filename || 'resume.pdf', 
              content: content, 
              created_at: new Date().toISOString() 
            };
            mockDb.resumes.push(resume);
            return res.end(JSON.stringify(resume));
          }

          // ATS Analysis Mock (FIXED: NOW USES GLOBAL SKILL EXTRACTION)
          if (path === '/api/ats-analyze' && req.method === 'POST') {
            const resumeId = payload.resume_id;
            const resume = mockDb.resumes.find((r: any) => String(r.id) === String(resumeId)) || mockDb.resumes[0];
            const content = resume?.content || '';

            return res.end(JSON.stringify(analyzeMockResume(content)));
          }

          if (path === '/api/fetch-real-jobs' && req.method === 'POST') {
            const resumeId = payload.resume_id;
            const resume = mockDb.resumes.find((r: any) => String(r.id) === String(resumeId)) || mockDb.resumes[0];
            const content = resume?.content || '';
            const profile = buildResumeSearchProfile(content);
            const { domain, roleHints, matchedDomainSkills, searchSkills } = profile;
            const foundSkills = matchedDomainSkills.length > 0
              ? matchedDomainSkills
              : searchSkills.filter(skill => !(ROLE_HINTS[domain] || []).includes(skill));

             const liveJobs = await fetchLiveJobs(searchSkills);
            const scoredJobs = liveJobs
              .map((job: any, index: number) => ({
                id: Date.now() + index,
                resume_id: resumeId,
                job_title: job.title,
                company: job.company,
                location: job.location,
                salary: job.salary,
                portal: job.portal,
                job_url: job.url,
                description: job.description,
                source: job.source,
                job_type: job.job_type,
                match_score: rankStrictJob(
                  job,
                  foundSkills.length > 0 ? foundSkills.slice(0, 6) : searchSkills.slice(0, 6),
                  searchSkills.slice(0, 6),
                  roleHints
                )
              }))
              .filter((job: any) => job.match_score >= 18 || isIndiaLocation(job.location || ''))
              .sort((a: any, b: any) => b.match_score - a.match_score)
              .slice(0, 80);

            mockDb.matches = mockDb.matches.filter((job: any) => String(job.resume_id) !== String(resumeId));
            mockDb.matches.push(...scoredJobs);
            return res.end(JSON.stringify({ jobs: scoredJobs, count: scoredJobs.length }));
          }

          // Job Fetching Mock (FIXED: USES DETECTED DOMAIN)
          if (path === '/api/fetch-real-jobs' && req.method === 'POST') {
             const resumeId = payload.resume_id;
             const resume = mockDb.resumes.find((r: any) => String(r.id) === String(resumeId)) || mockDb.resumes[0];
             const content = resume?.content || '';
             const domain = detectDomain(content);
             
             const domainTitles: Record<string, string> = {
               design: 'UI UX Designer',
               frontend: 'Frontend Developer',
               backend: 'Backend Engineer',
               devops: 'DevOps Engineer',
               cybersecurity: 'Security Analyst',
               data_science: 'Data Scientist',
               data_analyst: 'Data Analyst',
               mobile: 'Mobile Developer'
             };
             const searchTerms = domainTitles[domain] || 'Software Engineer';

             const jobs = [
               { id: 1, job_title: `${searchTerms} at Google`, company: 'Google', location: 'Mountain View, CA (Remote)', salary: '$180k - $240k', portal: 'adzuna_us', job_url: '#', match_score: 95 },
               { id: 2, job_title: `Lead ${searchTerms}`, company: 'Meta', location: 'London, UK', salary: '£120k+', portal: 'adzuna_gb', job_url: '#', match_score: 92 },
               { id: 3, job_title: `Remote ${searchTerms}`, company: 'Stripe', location: 'Worldwide Remote', salary: '$160k+', portal: 'remoteok', job_url: '#', match_score: 88 },
               { id: 4, job_title: `${searchTerms} (Remote)`, company: 'Spotify', location: 'Stockholm / Remote', salary: 'Competitive', portal: 'adzuna_gb', job_url: '#', match_score: 85 }
             ];

             mockDb.matches = jobs;
             return res.end(JSON.stringify({ jobs, count: jobs.length }));
          }

          if ((path === '/api/auto-apply' || path === '/api/auto-apply-real') && req.method === 'POST') {
            const selectedIds = Array.isArray(payload.job_match_ids) ? payload.job_match_ids : [];
            const resumeId = payload.resume_id;

            if (selectedIds.length === 0 || !resumeId) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Missing job_match_ids array or resume_id' }));
            }

            const results = selectedIds.map((jobId: number, index: number) => {
              const job = mockDb.matches.find((item: any) => String(item.id) === String(jobId));

              if (!job) {
                return {
                  job_match_id: jobId,
                  success: false,
                  message: 'Job match not found'
                };
              }

              const success = Math.random() > 0.15;
              const applicationId = Date.now() + index;
              const application = {
                id: applicationId,
                job_match_id: jobId,
                resume_id: resumeId,
                job_title: job.job_title,
                company: job.company,
                portal: job.portal,
                status: success ? 'applied' : 'failed',
                applied_at: success ? new Date().toISOString() : null,
                created_at: new Date().toISOString(),
                error_message: success ? null : 'Manual verification required on this portal'
              };

              mockDb.applications.unshift(application);

              return {
                job_match_id: jobId,
                application_id: applicationId,
                success,
                message: success
                  ? `Applied to ${job.job_title} at ${job.company}`
                  : application.error_message
              };
            });

            return res.end(JSON.stringify({ success: true, results }));
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        });
        return;
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), tailwindcss(), mockApiPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
