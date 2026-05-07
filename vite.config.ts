import { defineConfig, loadEnv } from 'vite';
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
    detect: ['cybersecurity', 'security analyst', 'penetration testing', 'ethical hacking', 'soc analyst', 'network security', 'infosec', 'security engineer', 'vulnerability', 'firewall', 'security', 'hacking'],
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

const DOMAIN_ANCHORS: Record<string, string[]> = {
  frontend: ['frontend', 'react', 'ui', 'web', 'javascript', 'typescript'],
  backend: ['backend', 'api', 'server', 'python', 'node', 'java'],
  fullstack: ['full stack', 'fullstack', 'software engineer', 'application developer'],
  devops: ['devops', 'platform', 'site reliability', 'sre', 'cloud'],
  data_science: ['data scientist', 'machine learning', 'ml', 'ai engineer', 'artificial intelligence', 'nlp'],
  data_analyst: ['data analyst', 'analytics', 'bi', 'business intelligence', 'reporting', 'tableau', 'power bi'],
  design: ['designer', 'ui', 'ux', 'product design', 'figma'],
  database: ['database', 'data engineer', 'sql', 'dba'],
  mobile: ['mobile', 'android', 'ios', 'flutter', 'react native'],
  cybersecurity: ['security', 'cybersecurity', 'infosec', 'soc', 'penetration', 'ethical hacking', 'security engineer', 'vulnerability assessment']
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

function detectDomain(lowerContent: string, sections?: Record<string, string>) {
  const scores: Record<string, number> = {};
  
  const specializationMultiplier: Record<string, number> = {
    cybersecurity: 6.0,    // Extreme weight for specialized security roles
    devops: 3.5,           // Infrastructure core
    data_science: 3.0,     // Mathematical core
    data_analyst: 2.5,
    mobile: 2.2,
    design: 2.0,
    database: 1.8,
    backend: 1.5,
    frontend: 1.0,
    fullstack: 0.8         // Fullstack is often a fallback, give it lower priority than specialists
  };

  const DOMAIN_ANCHORS: Record<string, string[]> = {
    cybersecurity: ['SOC', 'SIEM', 'CISSP', 'CEH', 'Penetration Testing', 'Firewall', 'Zero Trust', 'NIST', 'ISO 27001', 'Vulnerability', 'Ethical Hacking'],
    devops: ['Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'AWS', 'Azure', 'Jenkins', 'Ansible', 'Infrastructure as Code', 'SRE'],
    data_science: ['Machine Learning', 'AI', 'Python', 'TensorFlow', 'PyTorch', 'Statistics', 'NLP', 'Computer Vision', 'Data Model'],
    frontend: ['React', 'Vue', 'Angular', 'Tailwind', 'CSS', 'HTML', 'Frontend', 'User Interface'],
    mobile: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'Android', 'iOS', 'Mobile App'],
    design: ['Figma', 'Adobe XD', 'UI/UX', 'Prototyping', 'User Research', 'Design System']
  };

  const experienceText = (sections?.experience || '').toLowerCase();
  const summaryText = (sections?.summary || '').toLowerCase();

  for (const [domain, config] of Object.entries(DOMAINS)) {
    // 1. Basic detection hits in whole content
    let score = config.detect.filter(word => matchesSkill(lowerContent, word)).length;
    
    // 2. Anchor hits (Extremely strong signals)
    const anchors = DOMAIN_ANCHORS[domain] || [];
    const anchorHits = anchors.filter(anchor => matchesSkill(lowerContent, anchor)).length;
    score += anchorHits * 10; // Massive anchor weight

    // 3. Section-specific weighting (Experience & Summary define the "Core")
    if (sections) {
      const expHits = config.detect.filter(word => matchesSkill(experienceText, word)).length;
      const summaryHits = config.detect.filter(word => matchesSkill(summaryText, word)).length;
      score += expHits * 5; // Work experience is the strongest signal of "Core Domain"
      score += summaryHits * 4; // Summary/Objective is the second strongest
    }

    // 4. Apply specialization multiplier
    scores[domain] = score * (specializationMultiplier[domain] || 1.0);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'fullstack';
}

const ATS_WEIGHTS = {
  keyword_match: 35,
  work_experience_relevance: 25,
  skills_match: 20,
  education_certifications: 10,
  title_alignment: 5,
  formatting_parsability: 5
};

const ATS_SENIORITY_WEIGHT_PROFILES = {
  fresher: {
    keyword_match: 34,
    work_experience_relevance: 22,
    skills_match: 22,
    education_certifications: 12,
    title_alignment: 5,
    formatting_parsability: 5
  },
  mid: ATS_WEIGHTS,
  senior: {
    keyword_match: 36,
    work_experience_relevance: 28,
    skills_match: 18,
    education_certifications: 8,
    title_alignment: 5,
    formatting_parsability: 5
  }
};

const ATS_ACTION_VERBS = [
  'developed', 'led', 'managed', 'implemented', 'designed', 'optimized', 'scaled', 'architected',
  'resolved', 'collaborated', 'increased', 'decreased', 'shipped', 'built', 'deployed', 'automated',
  'analyzed', 'delivered', 'launched', 'created', 'improved', 'reduced', 'drove', 'owned'
];

const ATS_FILLER_TERMS = new Set([
  'team', 'teams', 'work', 'working', 'role', 'roles', 'using', 'used', 'strong', 'good', 'excellent',
  'knowledge', 'ability', 'responsible', 'responsibilities', 'candidate', 'preferred', 'requirement',
  'requirements', 'qualification', 'qualifications', 'resume', 'job', 'description', 'experience'
]);

const ATS_PHRASE_NOISE_WORDS = new Set([
  'will', 'with', 'from', 'into', 'their', 'your', 'our', 'the', 'and', 'for', 'you', 'who', 'this', 'that', 'preferred'
]);

const ATS_SOFT_SKILLS = [
  'leadership', 'communication', 'collaboration', 'teamwork', 'stakeholder management', 'problem solving',
  'analytical thinking', 'ownership', 'time management', 'adaptability', 'mentoring', 'presentation',
  'cross-functional', 'attention to detail', 'client communication'
];

function clampScore(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAtsText(value = '') {
  return String(value)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getActiveAtsWeights(seniority: string) {
  return ATS_SENIORITY_WEIGHT_PROFILES[seniority as keyof typeof ATS_SENIORITY_WEIGHT_PROFILES] || ATS_WEIGHTS;
}

function tokenizeForAts(text: string) {
  return (text.toLowerCase().match(/[a-z0-9+#./-]{2,}/g) || []).filter(token => !ATS_FILLER_TERMS.has(token));
}

function splitAtsSentences(text: string) {
  return normalizeAtsText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function dedupeAts(values: string[]) {
  const seen = new Set<string>();
  return values.filter(value => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isUsefulAtsKeywordPhrase(term: string) {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  if (/[.]/.test(term)) return false;
  if (words.some(word => ATS_PHRASE_NOISE_WORDS.has(word))) return false;
  return true;
}

function getAtsSectionsMap(text: string) {
  const normalized = normalizeAtsText(text);
  const lines = normalized.split('\n');
  const sections: Record<string, string> = {
    contact: '',
    summary: '',
    experience: '',
    skills: '',
    education: '',
    certifications: '',
    projects: '',
    other: ''
  };

  let current = 'other';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}|linkedin|github|portfolio|phone|mobile)/i.test(line)) current = 'contact';
    else if (/(summary|profile|objective|about me|professional summary)/i.test(line)) current = 'summary';
    else if (/(experience|employment|work history|professional experience|internship)/i.test(line)) current = 'experience';
    else if (/(skills|technical skills|core competencies|technologies|tools|expertise)/i.test(line)) current = 'skills';
    else if (/(education|degree|university|college|bachelor|master|b\.tech|m\.tech|graduate)/i.test(line)) current = 'education';
    else if (/(certifications|certificates|certified)/i.test(line)) current = 'certifications';
    else if (/(projects|project experience|case studies)/i.test(line)) current = 'projects';

    sections[current] += `${line}\n`;
  }

  return sections;
}

function getJobKeywordsForAts(jobDescription: string, domainSkills: string[]) {
  if (!jobDescription) {
    return domainSkills.slice(0, 12);
  }

  const matchedDomainSkills = domainSkills.filter(skill => matchesSkill(jobDescription, skill));
  const dynamicKeywords = extractDynamicKeywords(jobDescription, matchedDomainSkills, 24)
    .filter((term: string) => term.length > 2)
    .filter((term: string) => !ATS_FILLER_TERMS.has(term.toLowerCase()))
    .filter((term: string) => /[A-Za-z]/.test(term));

  return dedupeAts([
    ...matchedDomainSkills,
    ...domainSkills.filter(skill => dynamicKeywords.some((term: string) => matchesSkill(term, skill))),
    ...dynamicKeywords.filter((term: string) => isUsefulAtsKeywordPhrase(term))
  ]).slice(0, 18);
}

function getTargetTitlesForAts(sourceText: string, domain: string) {
  const defaults = {
    frontend: ['Frontend Developer', 'UI Developer', 'React Developer', 'Frontend Engineer'],
    backend: ['Backend Developer', 'API Developer', 'Backend Engineer', 'Software Engineer'],
    fullstack: ['Full Stack Developer', 'Software Engineer', 'Fullstack Engineer'],
    devops: ['DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer'],
    data_science: ['Data Scientist', 'ML Engineer', 'AI Engineer'],
    data_analyst: ['Data Analyst', 'Business Analyst', 'BI Analyst'],
    design: ['UI Designer', 'UX Designer', 'Product Designer'],
    mobile: ['Mobile Developer', 'Android Developer', 'iOS Developer'],
    cybersecurity: ['Security Analyst', 'Cybersecurity Analyst', 'Security Engineer'],
    database: ['Database Administrator', 'Database Engineer'],
    product: ['Product Manager', 'Technical Product Manager'],
    sales_marketing: ['Account Executive', 'Digital Marketing Specialist', 'Marketing Manager']
  } as Record<string, string[]>;

  const configured = (defaults[domain] || defaults.fullstack).filter(title => matchesSkill(sourceText, title));
  if (configured.length > 0) return configured;

  const titleRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+(?:Developer|Engineer|Designer|Analyst|Manager|Specialist|Consultant|Architect))\b/g;
  const discovered: string[] = [];
  for (const match of sourceText.matchAll(titleRegex)) {
    discovered.push(match[1]);
  }

  return dedupeAts([...(defaults[domain] || defaults.fullstack), ...discovered]).slice(0, 5);
}

function extractRequiredYearsForAts(jobDescription: string) {
  const patterns = [
    /(\d+)\+?\s*(?:to\s*\d+\s*)?(?:years|yrs)\s+(?:of\s+)?experience/i,
    /minimum\s+of\s+(\d+)\s*(?:years|yrs)/i,
    /at\s+least\s+(\d+)\s*(?:years|yrs)/i
  ];

  for (const pattern of patterns) {
    const match = jobDescription.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

function estimateResumeYearsForAts(resumeText: string) {
  const explicit = resumeText.match(/(\d+)\+?\s*(?:years|yrs)\s+(?:of\s+)?experience/i);
  if (explicit) return Number(explicit[1]);

  const years = [...resumeText.matchAll(/\b(19|20)\d{2}\b/g)].map(match => Number(match[0]));
  if (years.length >= 2) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return clampScore(maxYear - minYear, 0, 40);
  }

  return null;
}

function determineAtsSeniority(params: {
  resumeText: string;
  jobDescription: string;
  estimatedYears: number | null;
  requiredYears: number | null;
}) {
  const yearsSignal = Math.max(params.estimatedYears || 0, params.requiredYears || 0);

  if (
    yearsSignal <= 1 ||
    /\b(fresher|entry level|entry-level|graduate|recent graduate|intern|internship|trainee|junior)\b/i.test(params.resumeText) ||
    /\b(entry level|entry-level|graduate|intern|trainee|junior)\b/i.test(params.jobDescription)
  ) {
    return 'fresher';
  }

  if (
    yearsSignal >= 6 ||
    /\b(senior|lead|principal|staff|architect|manager|head)\b/i.test(params.resumeText) ||
    /\b(senior|lead|principal|staff|architect|manager|head)\b/i.test(params.jobDescription)
  ) {
    return 'senior';
  }

  return 'mid';
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

function analyzeMockResume(content: string, jobDescription = '', domainOverride?: string) {
  const normalizedContent = normalizeAtsText(content || '');
  const normalizedJobDescription = normalizeAtsText(jobDescription || '');
  const sectionMap = getAtsSectionsMap(normalizedContent);
  const primaryDomain = (domainOverride && DOMAINS[domainOverride as keyof typeof DOMAINS]) 
    ? domainOverride 
    : detectDomain(`${normalizedJobDescription}\n${normalizedContent}`.toLowerCase(), sectionMap);
  const estimatedYears = estimateResumeYearsForAts(normalizedContent);
  const requiredYears = extractRequiredYearsForAts(normalizedJobDescription);
  const seniority = determineAtsSeniority({
    resumeText: normalizedContent,
    jobDescription: normalizedJobDescription,
    estimatedYears,
    requiredYears
  });
  const activeWeights = getActiveAtsWeights(seniority);

  const parseWordCount = normalizedContent.split(/\s+/).filter(Boolean).length;
  const parseLines = normalizedContent.split('\n').map(line => line.trim()).filter(Boolean);
  const weirdChars = (normalizedContent.match(/[|¦•■□◆►]/g) || []).length;
  const parseWarnings: string[] = [];
  let parseScore = 0;

  if (parseWordCount >= 180) parseScore += 3;
  if (parseLines.length >= 8) parseScore += 1;
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/.test(normalizedContent)) parseScore += 2;
  if (/(\+\d{1,3}\s?)?(\(?\d{3,4}\)?[\s-]?\d{3}[\s-]?\d{3,4})/.test(normalizedContent)) parseScore += 1;
  if (weirdChars <= 10) parseScore += 1;
  parseScore = clampScore(Math.round((parseScore / 8) * activeWeights.formatting_parsability), 0, activeWeights.formatting_parsability);

  if (parseWordCount < 120) parseWarnings.push('Resume text looks thin after parsing. ATS systems often miss content from image-heavy or table-based files.');
  if (weirdChars > 10) parseWarnings.push('Resume may include columns, tables, or graphics that reduce ATS parsing accuracy.');

  const sectionChecks = [
    ['Contact', /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}|linkedin|github|portfolio|phone|mobile)/i],
    ['Summary', /(summary|profile|objective|about me|professional summary)/i],
    ['Experience', /(experience|employment|work history|professional experience|internship)/i],
    ['Skills', /(skills|technical skills|core competencies|technologies|tools|expertise)/i],
    ['Education', /(education|degree|university|college|bachelor|master|b\.tech|m\.tech|graduate)/i]
  ] as Array<[string, RegExp]>;

  const foundSections = sectionChecks.filter(([, regex]) => regex.test(normalizedContent)).map(([label]) => label);
  const missingSections = sectionChecks.filter(([, regex]) => !regex.test(normalizedContent)).map(([label]) => label);

  const domainSkills = DOMAINS[primaryDomain as keyof typeof DOMAINS]?.skills || [];
  const targetKeywords = getJobKeywordsForAts(normalizedJobDescription, domainSkills);
  const hardKeywords = [...new Set(targetKeywords.filter(keyword => domainSkills.includes(keyword) || /[A-Z0-9./+#-]/.test(keyword) || keyword.length <= 5))];
  const softKeywords = [...new Set([
    ...ATS_SOFT_SKILLS.filter(skill => matchesSkill(normalizedJobDescription, skill)),
    ...targetKeywords.filter(keyword => !hardKeywords.includes(keyword) && /^[a-z][a-z\s-]+$/i.test(keyword))
  ])].slice(0, 10);
  const titleKeywords = [...new Set(getTargetTitlesForAts(normalizedJobDescription || normalizedContent, primaryDomain)
    .flatMap(title => title.split(/\s+/))
    .filter(token => token.length > 2))];
  const scoreKeywordGroup = (keywords: string[], weightShare: number) => {
    if (keywords.length === 0) return weightShare;
    const hits = keywords.reduce((sum, keyword) => sum + (matchesSkill(normalizedContent, keyword) ? 1 : 0), 0);
    const diversityBonus = keywords.reduce((sum, keyword) => {
      const sectionsMatched = Object.values(sectionMap).filter(text => matchesSkill(text, keyword)).length;
      return sum + Math.min(0.35, sectionsMatched * 0.12);
    }, 0);
    const raw = (hits / keywords.length) + Math.min(0.25, diversityBonus / Math.max(1, keywords.length));
    return Math.min(weightShare, Math.round(raw * weightShare));
  };
  const keywordScore =
    scoreKeywordGroup(hardKeywords, Math.round(activeWeights.keyword_match * 0.6)) +
    scoreKeywordGroup(softKeywords, Math.round(activeWeights.keyword_match * 0.2)) +
    scoreKeywordGroup(titleKeywords, activeWeights.keyword_match - Math.round(activeWeights.keyword_match * 0.6) - Math.round(activeWeights.keyword_match * 0.2));
  const matchedKeywords = targetKeywords.filter(keyword => matchesSkill(normalizedContent, keyword));
  const missingKeywords = targetKeywords.filter(keyword => !matchesSkill(normalizedContent, keyword));

  const targetSkills = [...new Set([
    ...domainSkills.filter(skill => matchesSkill(normalizedJobDescription, skill)),
    ...targetKeywords.filter(keyword => domainSkills.some(skill => matchesSkill(keyword, skill)))
  ])];
  const expectedSkills = (targetSkills.length > 0 ? targetSkills : domainSkills).slice(0, 16);
  const matchedSkills = expectedSkills.filter(skill => matchesSkill(normalizedContent, skill));
  const skillsSectionHits = matchedSkills.filter(skill => matchesSkill(sectionMap.skills || '', skill)).length;
  const skillsScore = clampScore(
    Math.round(((matchedSkills.length / Math.max(1, expectedSkills.length)) * activeWeights.skills_match * 0.8) + ((skillsSectionHits / Math.max(1, expectedSkills.length)) * activeWeights.skills_match * 0.2)),
    0,
    activeWeights.skills_match
  );

  const educationText = `${sectionMap.education || ''}\n${normalizedContent}`;
  const certText = `${sectionMap.certifications || ''}\n${normalizedContent}`;
  const hasDegree = /(bachelor|master|mba|b\.tech|m\.tech|bsc|msc|phd|doctorate|associate)/i.test(educationText);
  const hasInstitution = /(university|college|institute|school)/i.test(educationText);
  const hasYear = /\b(19|20)\d{2}\b/.test(educationText);
  const hasField = /(computer science|engineering|business|marketing|design|finance|data science|information technology)/i.test(educationText);
  const hasCertifications = /(certified|certification|aws certified|google|azure|pmp|scrum|cfa|security\+|network\+)/i.test(certText);
  const educationScore = clampScore(
    (hasDegree ? 3 : 0) + (hasInstitution ? 2 : 0) + (hasYear ? 1 : 0) + (hasField ? 2 : 0) + (hasCertifications ? (seniority === 'fresher' ? 1 : 2) : 0),
    0,
    activeWeights.education_certifications
  );

  const targetTitles = getTargetTitlesForAts(normalizedJobDescription || normalizedContent, primaryDomain);
  const matchedTitles = targetTitles.filter(title => matchesSkill(normalizedContent, title));
  const partialTitleMatches = targetTitles.filter(title => {
    const titleTokens = tokenizeForAts(title);
    const resumeTokens = new Set(tokenizeForAts(normalizedContent));
    const overlap = titleTokens.filter(token => resumeTokens.has(token)).length;
    return titleTokens.length > 0 && overlap / titleTokens.length >= 0.5;
  });
  const titleScore = matchedTitles.length > 0 ? activeWeights.title_alignment : partialTitleMatches.length > 0 ? Math.round(activeWeights.title_alignment * 0.6) : 0;

  const experienceText = `${sectionMap.experience || ''}\n${sectionMap.projects || ''}\n${normalizedContent}`;
  const numericBullets = experienceText.match(/\b\d+([.,]\d+)?\s?(%|x|k|m|b|hours|days|weeks|months|years|users|clients|projects|revenue|sales)?\b/gi) || [];
  const actionVerbCount = ATS_ACTION_VERBS.filter(verb => matchesSkill(experienceText.toLowerCase(), verb)).length;
  const yearTokens = [...normalizedContent.matchAll(/\b(19|20)\d{2}\b/g)].map(match => Number(match[0]));
  const largeGapDetected = yearTokens.length >= 2 && yearTokens.some((year, index) => index > 0 && Math.abs(year - yearTokens[index - 1]) > 3);
  let experienceScoreBase = requiredYears ? 0 : estimatedYears !== null ? 6 : 3;
  if (requiredYears && estimatedYears !== null) {
    const softenedRatio = seniority === 'fresher' && requiredYears <= 2 ? Math.max(estimatedYears / requiredYears, 0.75) : estimatedYears / requiredYears;
    experienceScoreBase = Math.round(Math.min(1.2, softenedRatio) * 8);
  } else if (requiredYears && estimatedYears === null) {
    experienceScoreBase = seniority === 'fresher' ? 4 : 2;
  }

  const semanticMatches = splitAtsSentences(normalizedJobDescription).filter(jobSentence => {
    const jobTokens = tokenizeForAts(jobSentence);
    if (jobTokens.length < 4) return false;
    return splitAtsSentences(experienceText).some(candidate => {
      const candidateTokens = new Set(tokenizeForAts(candidate));
      return jobTokens.filter(token => candidateTokens.has(token)).length >= 2;
    });
  }).length;
  const experienceScore = clampScore(
    experienceScoreBase +
      Math.min(6, Math.round((numericBullets.length / (seniority === 'senior' ? 4 : 3)) * 3 + (actionVerbCount / 4))) +
      Math.min(5, semanticMatches) +
      (largeGapDetected ? 1 : 3) +
      (/(experience|employment|work history|internship)/i.test(sectionMap.experience || '') ? 3 : 1),
    0,
    activeWeights.work_experience_relevance
  );

  const score = clampScore(
    parseScore + keywordScore + skillsScore + educationScore + titleScore + experienceScore,
    0,
    100
  );

  const suggestions: string[] = [];
  if (parseWarnings.length > 0) suggestions.push(parseWarnings[0]);
  if (missingKeywords.length > 0) suggestions.push(`Keyword match is the biggest ATS lever. Add missing ${primaryDomain.replace('_', ' ')} terms like ${missingKeywords.slice(0, 4).join(', ')} where they truthfully apply.`);
  if (missingSections.length > 0) suggestions.push(`Add or relabel missing sections: ${missingSections.slice(0, 4).join(', ')}.`);
  if (expectedSkills.filter(skill => !matchesSkill(normalizedContent, skill)).length > 0) suggestions.push(`Strengthen the dedicated skills section with exact job terms like ${expectedSkills.filter(skill => !matchesSkill(normalizedContent, skill)).slice(0, 4).join(', ')}.`);
  if (numericBullets.length < 3) suggestions.push('Add quantified achievements with numbers, percentages, time saved, revenue, users, tickets, or conversion improvements.');
  if (targetTitles.length > 0 && matchedTitles.length === 0) suggestions.push(`Align your headline or recent role title more closely with the target role, such as ${targetTitles[0]}.`);
  if (!hasDegree || !hasInstitution || !hasYear) suggestions.push('Make education easier for ATS to read by including degree, field, institution, and graduation year on separate clear lines.');
  if (largeGapDetected) suggestions.push('Employment dates may show a large gap. Clarify the timeline with projects, internships, freelance work, or education periods.');
  if (!normalizedJobDescription) suggestions.push('Paste a target job description to switch from domain-based ATS scoring to role-specific ATS scoring with exact keyword, title, and experience checks.');

  return {
    score,
    domain: primaryDomain,
    seniority,
    suggestions: dedupeAts(suggestions).slice(0, 6),
    keywords_found: matchedKeywords.slice(0, 18),
    missing_keywords: missingKeywords.slice(0, 12),
    breakdown: {
      formatting_parsability: parseScore,
      keyword_match: keywordScore,
      work_experience_relevance: experienceScore,
      skills_match: skillsScore,
      education_certifications: educationScore,
      title_alignment: titleScore,
    },
    diagnostics: {
      sections_found: foundSections,
      sections_missing: missingSections,
      target_titles: targetTitles,
      matched_titles: matchedTitles,
      required_years: requiredYears,
      estimated_years: estimatedYears,
      parse_warnings: parseWarnings,
      seniority_profile: seniority
    }
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

function isBroadRemoteJob(location: string) {
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

function normalizeDatePosted(value: any) {
  if (!value && value !== 0) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'number') {
    const timestamp = value > 9999999999 ? value : value * 1000;
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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

function normalizeQuery(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function countAnchorHits(text: string, anchors: string[]) {
  return anchors.reduce((sum, anchor) => sum + (matchesSkill(text, anchor) ? 1 : 0), 0);
}

function countAnyTermHits(text: string, terms: string[]) {
  return terms.reduce((sum, term) => sum + countSkillMatches(text, term), 0);
}

function getProfileQueryTerms(profile: { roleHints?: string[]; matchedDomainSkills?: string[]; domain: string; searchSkills?: string[] }) {
  const anchors = DOMAIN_ANCHORS[profile.domain] || [];
  return [...new Set([
    ...(profile.roleHints || []),
    ...anchors,
    ...((profile.matchedDomainSkills || []).slice(0, 6))
  ].filter(Boolean).map(normalizeQuery))];
}

function isStrictDomainMatch(job: { title?: string; description?: string; location?: string }, profile: { domain: string; roleHints?: string[]; matchedDomainSkills?: string[] }) {
  const titleText = `${job.title || ''}`.toLowerCase();
  const fullText = `${job.title || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
  const anchors = DOMAIN_ANCHORS[profile.domain] || [];
  const roleHints = profile.roleHints || [];
  const matchedDomainSkills = profile.matchedDomainSkills || [];
  const roleTitleMatches = roleHints.filter(role => countSkillMatches(titleText, role) > 0).length;
  const roleBodyMatches = roleHints.filter(role => countSkillMatches(fullText, role) > 0).length;
  const anchorHits = countAnchorHits(fullText, anchors);
  const skillHits = matchedDomainSkills.filter(skill => matchesSkill(fullText, skill)).length;
  const excludedTitle = EXCLUDED_TITLE_PATTERNS.some(pattern => pattern.test(titleText));

  if (excludedTitle && roleTitleMatches === 0 && anchorHits < 2) return false;
  if (roleTitleMatches > 0) return true;
  if (roleBodyMatches > 0 && skillHits >= 2) return true;
  return anchorHits >= 2 && skillHits >= 2;
}

function buildPortalSearchLinks(profile: { roleHints?: string[]; searchSkills?: string[] }) {
  const primaryRole = normalizeQuery(profile.roleHints?.[0] || profile.searchSkills?.[0] || 'Software Engineer');
  return [
    {
      title: `${primaryRole} jobs on LinkedIn`,
      company: 'LinkedIn',
      location: 'India',
      salary: 'Open search',
      description: `Open LinkedIn search results for ${primaryRole} jobs in India.`,
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(primaryRole)}&location=${encodeURIComponent('India')}`,
      portal: 'linkedin_search',
      source: 'LinkedIn Search',
      job_type: 'Search'
    },
    {
      title: `${primaryRole} jobs on Indeed`,
      company: 'Indeed',
      location: 'India',
      salary: 'Open search',
      description: `Open Indeed search results for ${primaryRole} jobs in India.`,
      url: `https://in.indeed.com/jobs?q=${encodeURIComponent(primaryRole)}&l=${encodeURIComponent('India')}`,
      portal: 'indeed_search',
      source: 'Indeed Search',
      job_type: 'Search'
    },
    {
      title: `${primaryRole} jobs on Naukri`,
      company: 'Naukri',
      location: 'India',
      salary: 'Open search',
      description: `Open Naukri search results for ${primaryRole} jobs in India.`,
      url: `https://www.naukri.com/${encodeURIComponent(primaryRole.toLowerCase().replace(/\s+/g, '-'))}-jobs-in-india`,
      portal: 'naukri_search',
      source: 'Naukri Search',
      job_type: 'Search'
    }
  ];
}

function isPortalSearchLink(job: { portal?: string }) {
  return typeof job.portal === 'string' && job.portal.endsWith('_search');
}

function buildIndiaQueries(profile: { searchSkills: string[]; roleHints?: string[]; matchedDomainSkills?: string[]; domain: string }) {
  const baseTerms = [...new Set([
    ...(profile.roleHints || []).slice(0, 3),
    ...(profile.matchedDomainSkills || []).slice(0, 3)
  ].filter(Boolean))];
  const queries = new Set<string>();

  baseTerms.slice(0, 5).forEach(term => {
    queries.add(term);
    queries.add(`${term} India`);
  });

  if (baseTerms.length >= 2) {
    queries.add(`${baseTerms[0]} ${baseTerms[1]}`);
    queries.add(`${baseTerms[0]} ${baseTerms[1]} India`);
  }

  if (profile.domain === 'fullstack' || profile.domain === 'frontend' || profile.domain === 'backend') {
    queries.add(`${profile.roleHints?.[0] || 'Software Engineer'} India`);
  }

  return [...queries].slice(0, 8);
}

function buildBroadQueries(profile: { searchSkills: string[]; roleHints?: string[]; matchedDomainSkills?: string[] }) {
  return [...new Set([
    ...(profile.roleHints || []).slice(0, 3),
    ...(profile.matchedDomainSkills || []).slice(0, 4),
    `${profile.roleHints?.[0] || 'Software Engineer'} Remote`,
    `${profile.roleHints?.[0] || 'Software Engineer'} Worldwide`
  ].filter(Boolean))].slice(0, 8);
}

function buildDomainFocusedQueries(profile: { domain: string; roleHints?: string[]; matchedDomainSkills?: string[] }) {
  const domainQueryMap: Record<string, string[]> = {
    cybersecurity: [
      'Security Engineer',
      'Cybersecurity Engineer',
      'Security Analyst',
      'SOC Analyst',
      'Cloud Security Engineer',
      'Application Security Engineer',
      'Penetration Tester'
    ],
    devops: [
      'DevOps Engineer',
      'Site Reliability Engineer',
      'Platform Engineer',
      'Cloud Engineer',
      'Infrastructure Engineer',
      'Kubernetes Engineer'
    ],
    data_science: [
      'Data Scientist',
      'Machine Learning Engineer',
      'AI Engineer',
      'NLP Engineer',
      'Generative AI Engineer'
    ],
    backend: [
      'Backend Engineer',
      'Python Developer',
      'API Developer',
      'Software Engineer Backend',
      'Platform Backend Engineer'
    ],
    frontend: [
      'Frontend Developer',
      'React Developer',
      'UI Engineer',
      'Frontend Engineer'
    ],
    fullstack: [
      'Full Stack Developer',
      'Full Stack Engineer',
      'Software Engineer',
      'Application Developer'
    ],
    data_analyst: [
      'Data Analyst',
      'BI Analyst',
      'Analytics Engineer',
      'Business Analyst'
    ],
    mobile: [
      'Mobile Developer',
      'Android Developer',
      'iOS Developer',
      'React Native Developer'
    ],
    design: [
      'UI UX Designer',
      'Product Designer',
      'UX Designer',
      'Interaction Designer'
    ],
    database: [
      'Database Engineer',
      'Data Engineer',
      'SQL Developer',
      'Database Administrator'
    ]
  };

  return [...new Set([
    ...(domainQueryMap[profile.domain] || []),
    ...(profile.roleHints || []).slice(0, 3),
    ...(profile.matchedDomainSkills || []).slice(0, 2)
  ].filter(Boolean))].slice(0, 10);
}

function buildAllDomainQueries() {
  return [
    'Software Engineer',
    'Full Stack Developer',
    'Backend Engineer',
    'Frontend Developer',
    'DevOps Engineer',
    'Data Scientist',
    'AI Engineer',
    'Security Engineer',
    'Data Analyst',
    'Cloud Engineer',
    'Platform Engineer',
    'Machine Learning Engineer'
  ];
}

async function fetchLiveJobs(profile: { searchSkills: string[]; roleHints?: string[]; matchedDomainSkills?: string[]; domain: string }) {
  const queryTerms = getProfileQueryTerms(profile).slice(0, 8);
  const scoringSkills = (profile.matchedDomainSkills && profile.matchedDomainSkills.length > 0)
    ? profile.matchedDomainSkills.slice(0, 8)
    : profile.searchSkills.slice(0, 6);
  const domainQueries = buildDomainFocusedQueries(profile);
  const roleQueries = [
    ...domainQueries.slice(0, 4),
    profile.roleHints?.[0],
    profile.roleHints?.[1],
    queryTerms.slice(0, 2).join(' '),
    queryTerms[0]
  ].filter((value): value is string => Boolean(value));
  const uniqueRoleQueries = [...new Set(roleQueries)];
  const indiaQueries = buildIndiaQueries(profile);
  const broadQueries = buildBroadQueries(profile);

  const adzunaPages = [1, 2];
  const adzunaAppId = process.env.ADZUNA_APP_ID;
  const adzunaApiKey = process.env.ADZUNA_API_KEY;
  const adzunaCalls = adzunaAppId && adzunaApiKey
    ? INDIA_PRIORITY_CITIES.flatMap(city =>
      adzunaPages.flatMap(page =>
        indiaQueries.slice(0, 4).map(query =>
          axios.get(
            `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${adzunaAppId}&app_key=${adzunaApiKey}&results_per_page=20&what=${encodeURIComponent(query)}&where=${encodeURIComponent(city)}&content-type=application/json`,
            { timeout: 9000 }
          )
        )
      )
    )
    : [];

  const remotiveCalls = uniqueRoleQueries.slice(0, 6).map(query =>
    axios.get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`, {
      timeout: 9000
    })
  );

  const indeedRssCalls = [...new Set([...domainQueries, ...broadQueries])].slice(0, 6).flatMap(query => ([
    axios.get(`https://in.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent('India')}`, {
      timeout: 9000,
      headers: { 'User-Agent': 'JobApplyAI/1.0' }
    }),
    axios.get(`https://in.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent('Remote')}`, {
      timeout: 9000,
      headers: { 'User-Agent': 'JobApplyAI/1.0' }
    })
  ]));

  const settledResults = await Promise.allSettled([
    ...adzunaCalls,
    axios.get('https://remoteok.com/api', {
      timeout: 9000,
      headers: { 'User-Agent': 'JobApplyAI/1.0' }
    }),
    axios.get('https://www.arbeitnow.com/api/job-board-api', {
      timeout: 9000
    }),
    ...remotiveCalls,
    ...indeedRssCalls
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
          date_posted: normalizeDatePosted(job.created || job.created_time || job.updated),
          portal: 'adzuna_in',
          source: 'Adzuna India',
          job_type: inferJobType(job.location?.display_name || '', job.title || '')
        }))
      : []
    );

  const remoteOkResult = settledResults[adzunaCalls.length];
  const arbeitnowResult = settledResults[adzunaCalls.length + 1];
  const remotiveResults = settledResults.slice(adzunaCalls.length + 2, adzunaCalls.length + 2 + remotiveCalls.length);
  const indeedResults = settledResults.slice(adzunaCalls.length + 2 + remotiveCalls.length);

  const remoteOkJobs = remoteOkResult.status === 'fulfilled' && Array.isArray(remoteOkResult.value.data)
    ? remoteOkResult.value.data.slice(1).map((job: any) => ({
        title: job.position,
        company: job.company,
        location: job.location || 'Remote Worldwide',
        salary: job.salary_min ? `$${job.salary_min / 1000}k+` : 'Competitive',
        description: job.description?.substring(0, 280) || '',
        url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
        date_posted: normalizeDatePosted(job.date || job.iso_date || job.epoch || job.time),
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
        date_posted: normalizeDatePosted(job.created_at || job.published_at || job.updated_at),
        portal: 'arbeitnow',
        source: 'Arbeitnow',
        job_type: inferJobType(Array.isArray(job.location) ? job.location.join(', ') : (job.location || ''), job.title || '')
      }))
    : [];

  const remotiveJobs = remotiveResults.flatMap(result =>
    result.status === 'fulfilled' && Array.isArray(result.value.data?.jobs)
      ? result.value.data.jobs
        .filter((job: any) => {
          const location = job.candidate_required_location || '';
          return !location || isIndiaFriendlyRemoteJob(location) || isBroadRemoteJob(location);
        })
        .map((job: any) => ({
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || 'Remote',
          salary: job.salary || 'Competitive',
          description: job.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 280) || '',
          url: job.url,
          date_posted: normalizeDatePosted(job.publication_date || job.created_at || job.updated_at),
          portal: 'remotive',
          source: 'Remotive',
          job_type: inferJobType(job.candidate_required_location || 'Remote', job.title || '')
        }))
      : []
  );

  const indeedJobs = indeedResults.flatMap(result => {
    if (result.status !== 'fulfilled') return [];
    const xml = String(result.value.data || '');
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    return items.map(([, item]) => {
      const titleRaw = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] || item.match(/<title>(.*?)<\/title>/i)?.[1] || '').trim();
      const link = (item.match(/<link>(.*?)<\/link>/i)?.[1] || '').trim();
      const description = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 280);
      const datePosted = normalizeDatePosted(item.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] || '');
      const titleParts = titleRaw.split(' - ');
      const location = (titleParts[2] || 'India').trim();
      return {
        title: (titleParts[0] || titleRaw || 'Job').trim(),
        company: (titleParts[1] || 'Indeed').trim(),
        location,
        salary: 'Competitive',
        description,
        url: link,
        date_posted: datePosted,
        portal: 'indeed_rss',
        source: 'Indeed RSS',
        job_type: inferJobType(location, titleParts[0] || titleRaw)
      };
    }).filter(job => job.title && job.url);
  });

  const allLiveJobs = [...adzunaJobs, ...remoteOkJobs, ...arbeitnowJobs, ...remotiveJobs, ...indeedJobs];

  const ranked = dedupeJobs(allLiveJobs)
    .filter(job => job.title && job.company && job.url)
    .filter(job => isIndiaLocation((job as any).location || '') || isIndiaFriendlyRemoteJob((job as any).location || '') || isBroadRemoteJob((job as any).location || '') || ((job as any).job_type || '').toLowerCase() === 'remote')
    .filter(job => {
      const strict = isStrictDomainMatch(job, profile);
      if (strict) return true;
      const text = `${job.title || ''} ${(job as any).description || ''} ${(job as any).location || ''}`.toLowerCase();
      const roleHit = uniqueRoleQueries.some(query => countSkillMatches(text, query) > 0);
      const anchorHit = countAnchorHits(text, DOMAIN_ANCHORS[profile.domain] || []) >= 1;
      return roleHit || anchorHit;
    })
    .map(job => ({
      ...job,
      relevance: rankJobRelevance(job, queryTerms)
    }))
    .sort((a, b) => b.relevance - a.relevance);

  const relevant = ranked.filter(job => job.relevance >= 2);
  const broadFallback = dedupeJobs(allLiveJobs)
    .filter(job => job.title && job.company && job.url)
    .filter(job => isIndiaLocation((job as any).location || '') || isIndiaFriendlyRemoteJob((job as any).location || '') || isBroadRemoteJob((job as any).location || '') || ((job as any).job_type || '').toLowerCase() === 'remote')
    .map(job => ({
      ...job,
      relevance: rankStrictJob(job, scoringSkills, queryTerms, profile.roleHints || [])
    }))
    .filter(job => job.relevance >= 18)
    .sort((a: any, b: any) => {
      const aIndia = isIndiaLocation(a.location || '') ? 1 : 0;
      const bIndia = isIndiaLocation(b.location || '') ? 1 : 0;
      return bIndia - aIndia || b.relevance - a.relevance;
    });

  const globalFallback = dedupeJobs(allLiveJobs)
    .filter(job => job.title && job.company && job.url)
    .map(job => ({
      ...job,
      relevance: rankStrictJob(job, scoringSkills, queryTerms, profile.roleHints || [])
    }))
    .filter(job => job.relevance >= 14)
    .sort((a: any, b: any) => {
      const aRemote = ((a.job_type || '').toLowerCase() === 'remote' || /worldwide|anywhere|remote/i.test(a.location || '')) ? 1 : 0;
      const bRemote = ((b.job_type || '').toLowerCase() === 'remote' || /worldwide|anywhere|remote/i.test(b.location || '')) ? 1 : 0;
      return bRemote - aRemote || b.relevance - a.relevance;
    });

  const allDomainFallback = dedupeJobs(allLiveJobs)
    .filter(job => job.title && job.company && job.url)
    .filter(job => isIndiaLocation((job as any).location || '') || isIndiaFriendlyRemoteJob((job as any).location || '') || isBroadRemoteJob((job as any).location || '') || ((job as any).job_type || '').toLowerCase() === 'remote')
    .map(job => {
      const text = `${job.title || ''} ${(job as any).description || ''} ${(job as any).location || ''}`.toLowerCase();
      const genericTerms = buildAllDomainQueries();
      const genericHits = genericTerms.reduce((sum, term) => sum + countSkillMatches(text, term), 0);
      const remoteBoost = (((job as any).job_type || '').toLowerCase() === 'remote' || /worldwide|anywhere|remote/i.test((job as any).location || '')) ? 4 : 0;
      const indiaBoost = isIndiaLocation((job as any).location || '') ? 6 : 0;
      return {
        ...job,
        relevance: genericHits * 4 + remoteBoost + indiaBoost
      };
    })
    .filter(job => job.relevance > 0)
    .sort((a: any, b: any) => b.relevance - a.relevance);

  const rescueTerms = [...new Set([...(profile.roleHints || []), ...queryTerms.slice(0, 4), ...scoringSkills.slice(0, 4)].filter(Boolean))] as string[];
  const lastResort = dedupeJobs(allLiveJobs)
    .filter(job => job.title && job.company && job.url)
    .map(job => {
      const text = `${job.title || ''} ${(job as any).description || ''} ${(job as any).location || ''}`.toLowerCase();
      const textHits = countAnyTermHits(text, rescueTerms);
      const remoteBoost = (((job as any).job_type || '').toLowerCase() === 'remote' || /worldwide|anywhere|remote/i.test((job as any).location || '')) ? 2 : 0;
      return {
        ...job,
        relevance: Math.min(100, textHits * 6 + remoteBoost)
      };
    })
    .filter(job => job.relevance > 0)
    .sort((a: any, b: any) => b.relevance - a.relevance);

  const liveJobs = (
    relevant.length > 0
      ? relevant
      : broadFallback.length > 0
        ? broadFallback
        : globalFallback.length > 0
          ? globalFallback
          : lastResort.length > 0
            ? lastResort
            : allDomainFallback
  ).slice(0, 120);
  return liveJobs.length > 0 ? liveJobs : buildPortalSearchLinks(profile);
}

function rankJobRelevance(job: { title?: string; description?: string; location?: string }, terms: string[]) {
  const text = `${job.title || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
  const titleText = `${job.title || ''}`.toLowerCase();
  let score = 0;

  terms.forEach(term => {
    const matches = countSkillMatches(text, term);
    if (matches > 0) {
      score += term.includes(' ') ? 4 * matches : 2 * matches;
    }
    const titleMatches = countSkillMatches(titleText, term);
    if (titleMatches > 0) {
      score += term.includes(' ') ? 8 * titleMatches : 4 * titleMatches;
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
            const jobDescription = typeof payload.job_description === 'string' ? payload.job_description : '';
            const resume = mockDb.resumes.find((r: any) => String(r.id) === String(resumeId)) || mockDb.resumes[0];
            const content = resume?.content || '';

            const domainOverride = typeof payload.domain_override === 'string' ? payload.domain_override : undefined;
            return res.end(JSON.stringify(analyzeMockResume(content, jobDescription, domainOverride)));
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

             const liveJobs = await fetchLiveJobs(profile);
            const fallbackSearchJobs = buildPortalSearchLinks(profile);
            const sourceJobs = Array.isArray(liveJobs) && liveJobs.length > 0 ? liveJobs : fallbackSearchJobs;
            const scoredJobs = sourceJobs
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
                date_posted: job.date_posted,
                match_score: isPortalSearchLink(job)
                  ? Math.min(99, 91 + (job.portal.charCodeAt(0) % 7) + (job.portal.length % 3)) 
                  : rankStrictJob(
                      job,
                      foundSkills.length > 0 ? foundSkills.slice(0, 6) : searchSkills.slice(0, 6),
                      searchSkills.slice(0, 6),
                      roleHints
                    )
              }))
              .filter((job: any) => job.portal?.endsWith('_search') || job.match_score >= 45)
              .sort((a: any, b: any) => b.match_score - a.match_score)
              .slice(0, 80);

            const finalJobs = scoredJobs.length > 0
              ? scoredJobs
              : fallbackSearchJobs.map((job: any, index: number) => ({
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
                  date_posted: job.date_posted,
                  match_score: 95 - index
                }));

            mockDb.matches = mockDb.matches.filter((job: any) => String(job.resume_id) !== String(resumeId));
            mockDb.matches.push(...finalJobs);
            const liveJobCount = finalJobs.filter((job: any) => !isPortalSearchLink(job)).length;
            const searchLinkCount = finalJobs.filter((job: any) => isPortalSearchLink(job)).length;
            return res.end(JSON.stringify({ jobs: finalJobs, count: finalJobs.length, live_job_count: liveJobCount, search_link_count: searchLinkCount }));
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

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), tailwindcss(), mockApiPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  };
});
