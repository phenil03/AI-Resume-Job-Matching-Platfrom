import supabase, { ensureAwake } from './_supabase.js';
import { countSkillMatches, extractDynamicKeywords, matchesSkill } from './_text-utils.js';

const DOMAINS = {
  frontend: {
    detect: ['frontend', 'front end', 'ui developer', 'web developer', 'react', 'vue', 'angular', 'typescript', 'javascript', 'responsive design'],
    titles: ['Frontend Developer', 'UI Developer', 'React Developer', 'Web Developer', 'Frontend Engineer'],
    skills: [
      'React', 'Vue', 'Angular', 'Next.js', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'Tailwind',
      'Bootstrap', 'Redux', 'REST API', 'GraphQL', 'Responsive Design', 'Vite', 'Webpack', 'Jest', 'Cypress'
    ],
    recommendedSections: ['projects', 'skills']
  },
  backend: {
    detect: ['backend', 'back end', 'api developer', 'node.js', 'python', 'java', 'microservices', 'server-side', 'fastapi'],
    titles: ['Backend Developer', 'API Developer', 'Backend Engineer', 'Software Engineer'],
    skills: [
      'Node.js', 'Python', 'Java', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Express',
      'REST API', 'GraphQL', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kafka', 'Microservices'
    ],
    recommendedSections: ['projects', 'experience']
  },
  fullstack: {
    detect: ['fullstack', 'full stack', 'full-stack', 'mern', 'mean', 'software engineer', 'software developer'],
    titles: ['Full Stack Developer', 'Software Engineer', 'Fullstack Engineer'],
    skills: [
      'React', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'JavaScript', 'TypeScript',
      'REST API', 'Docker', 'Git', 'AWS', 'HTML', 'CSS', 'CI/CD'
    ],
    recommendedSections: ['projects', 'experience']
  },
  devops: {
    detect: ['devops', 'sre', 'site reliability', 'docker', 'kubernetes', 'terraform', 'jenkins', 'cloud engineer', 'infrastructure'],
    titles: ['DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer', 'Platform Engineer'],
    skills: [
      'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitHub Actions', 'AWS', 'Azure', 'GCP',
      'Linux', 'Bash', 'CI/CD', 'Prometheus', 'Grafana', 'Helm', 'Ansible', 'Monitoring'
    ],
    recommendedSections: ['projects', 'certifications']
  },
  data_science: {
    detect: ['data scientist', 'machine learning', 'deep learning', 'nlp', 'ai engineer', 'pytorch', 'tensorflow', 'artificial intelligence'],
    titles: ['Data Scientist', 'ML Engineer', 'AI Engineer', 'Machine Learning Engineer'],
    skills: [
      'Python', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'NLP', 'Deep Learning',
      'SQL', 'Statistics', 'Apache Spark', 'Jupyter', 'LLM', 'Computer Vision', 'MLOps'
    ],
    recommendedSections: ['projects', 'publications']
  },
  data_analyst: {
    detect: ['data analyst', 'business analyst', 'power bi', 'tableau', 'excel', 'data analysis', 'sql analyst', 'data visualization'],
    titles: ['Data Analyst', 'Business Analyst', 'BI Analyst', 'Reporting Analyst'],
    skills: [
      'SQL', 'Power BI', 'Tableau', 'Excel', 'Python', 'Pandas', 'Statistics', 'Data Visualization',
      'BigQuery', 'Snowflake', 'ETL', 'Reporting', 'Dashboarding', 'Data Modeling'
    ],
    recommendedSections: ['projects', 'certifications']
  },
  design: {
    detect: ['ui/ux', 'ux designer', 'ui designer', 'product designer', 'figma', 'wireframing', 'prototyping', 'user research'],
    titles: ['UI Designer', 'UX Designer', 'Product Designer', 'UI/UX Designer'],
    skills: [
      'Figma', 'Adobe XD', 'Sketch', 'Wireframing', 'Prototyping', 'User Research', 'Design System',
      'Interaction Design', 'Typography', 'Accessibility', 'Visual Design', 'Usability Testing'
    ],
    recommendedSections: ['portfolio', 'projects']
  },
  mobile: {
    detect: ['android', 'ios', 'flutter', 'react native', 'swift', 'kotlin', 'mobile developer'],
    titles: ['Mobile Developer', 'Android Developer', 'iOS Developer', 'React Native Developer'],
    skills: [
      'Flutter', 'React Native', 'Swift', 'Kotlin', 'Android', 'iOS', 'Dart', 'Firebase',
      'REST API', 'Mobile UI', 'Push Notifications', 'SwiftUI'
    ],
    recommendedSections: ['projects', 'skills']
  },
  cybersecurity: {
    detect: ['cybersecurity', 'security analyst', 'penetration testing', 'ethical hacking', 'soc analyst', 'infosec', 'security engineer'],
    titles: ['Security Analyst', 'Cybersecurity Analyst', 'Security Engineer', 'SOC Analyst'],
    skills: [
      'SIEM', 'OWASP', 'Network Security', 'Incident Response', 'Vulnerability Assessment', 'IAM',
      'Penetration Testing', 'Cloud Security', 'Linux', 'Kali Linux', 'Firewalls', 'Zero Trust'
    ],
    recommendedSections: ['certifications', 'projects']
  },
  product: {
    detect: ['product manager', 'product management', 'roadmap', 'stakeholder management', 'go-to-market', 'product strategy'],
    titles: ['Product Manager', 'Associate Product Manager', 'Technical Product Manager'],
    skills: [
      'Product Strategy', 'Roadmapping', 'Stakeholder Management', 'User Research', 'SQL', 'A/B Testing',
      'Analytics', 'Agile', 'Sprint Planning', 'Product Discovery', 'Go-to-Market'
    ],
    recommendedSections: ['projects', 'summary']
  },
  sales_marketing: {
    detect: ['sales', 'account executive', 'business development', 'digital marketing', 'seo', 'campaign', 'crm', 'lead generation'],
    titles: ['Account Executive', 'Business Development Executive', 'Digital Marketing Specialist', 'Marketing Manager'],
    skills: [
      'CRM', 'Lead Generation', 'SEO', 'SEM', 'Google Analytics', 'Email Marketing', 'Campaign Management',
      'Salesforce', 'Client Relationship Management', 'Negotiation', 'Content Marketing'
    ],
    recommendedSections: ['summary', 'experience']
  }
};

const BASE_SECTIONS = [
  { key: 'contact', label: 'Contact', regex: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}|linkedin|github|portfolio|phone|mobile)/i },
  { key: 'summary', label: 'Summary', regex: /(summary|profile|objective|about me|professional summary)/i },
  { key: 'experience', label: 'Experience', regex: /(experience|employment|work history|professional experience|internship)/i },
  { key: 'skills', label: 'Skills', regex: /(skills|technical skills|core competencies|technologies|tools|expertise)/i },
  { key: 'education', label: 'Education', regex: /(education|degree|university|college|bachelor|master|b\.tech|m\.tech|graduate)/i }
];

const SECTION_LABELS = {
  projects: { label: 'Projects', regex: /(projects|project experience|case studies)/i },
  certifications: { label: 'Certifications', regex: /(certifications|certificates|certified)/i },
  publications: { label: 'Publications', regex: /(publications|research|papers)/i },
  portfolio: { label: 'Portfolio', regex: /(portfolio|behance|dribbble)/i }
};

const ACTION_VERBS = [
  'developed', 'led', 'managed', 'implemented', 'designed', 'optimized', 'scaled', 'architected',
  'resolved', 'collaborated', 'increased', 'decreased', 'shipped', 'built', 'deployed', 'automated',
  'analyzed', 'delivered', 'launched', 'created', 'improved', 'reduced', 'drove', 'owned'
];

const FILLER_TERMS = new Set([
  'team', 'teams', 'work', 'working', 'role', 'roles', 'using', 'used', 'strong', 'good', 'excellent',
  'knowledge', 'ability', 'responsible', 'responsibilities', 'candidate', 'preferred', 'requirement',
  'requirements', 'qualification', 'qualifications', 'resume', 'job', 'description', 'experience'
]);

const PHRASE_NOISE_WORDS = new Set([
  'will', 'with', 'from', 'into', 'their', 'your', 'our', 'the', 'and', 'for', 'you', 'who', 'this', 'that', 'preferred'
]);

const WEIGHTS = {
  keywordMatch: 35,
  experienceRelevance: 25,
  skillsMatch: 20,
  educationCerts: 10,
  titleAlignment: 5,
  formatting: 5
};

const SENIORITY_WEIGHT_PROFILES = {
  fresher: {
    keywordMatch: 34,
    experienceRelevance: 22,
    skillsMatch: 22,
    educationCerts: 12,
    titleAlignment: 5,
    formatting: 5
  },
  mid: WEIGHTS,
  senior: {
    keywordMatch: 36,
    experienceRelevance: 28,
    skillsMatch: 18,
    educationCerts: 8,
    titleAlignment: 5,
    formatting: 5
  }
};

const SOFT_SKILLS = [
  'leadership', 'communication', 'collaboration', 'teamwork', 'stakeholder management', 'problem solving',
  'analytical thinking', 'ownership', 'time management', 'adaptability', 'mentoring', 'presentation',
  'cross-functional', 'attention to detail', 'client communication'
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value = '') {
  return String(value)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getActiveWeights(seniority) {
  return SENIORITY_WEIGHT_PROFILES[seniority] || WEIGHTS;
}

function sentenceSplit(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function getSectionsMap(text) {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  const sections = {
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

    if (BASE_SECTIONS[0].regex.test(line)) current = 'contact';
    else if (BASE_SECTIONS[1].regex.test(line)) current = 'summary';
    else if (BASE_SECTIONS[2].regex.test(line)) current = 'experience';
    else if (BASE_SECTIONS[3].regex.test(line)) current = 'skills';
    else if (BASE_SECTIONS[4].regex.test(line)) current = 'education';
    else if (SECTION_LABELS.certifications.regex.test(line)) current = 'certifications';
    else if (SECTION_LABELS.projects.regex.test(line)) current = 'projects';

    sections[current] += `${line}\n`;
  }

  return sections;
}

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9+#./-]{2,}/g) || []).filter(token => !FILLER_TERMS.has(token));
}

function detectDomain(texts = []) {
  const scores = {};

  for (const [domain, config] of Object.entries(DOMAINS)) {
    scores[domain] = texts.reduce((sum, text) => {
      const lower = text.toLowerCase();
      return sum + config.detect.filter(term => matchesSkill(lower, term)).length;
    }, 0);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0] && sorted[0][1] > 0 ? sorted[0][0] : 'fullstack';
}

function getDomainConfig(domain) {
  return DOMAINS[domain] || DOMAINS.fullstack;
}

function dedupe(values) {
  const seen = new Set();
  return values.filter(value => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isUsefulKeywordPhrase(term) {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  if (/[.]/.test(term)) return false;
  if (words.some(word => PHRASE_NOISE_WORDS.has(word))) return false;
  return true;
}

function extractJobKeywords(jobDescription, domainConfig) {
  if (!jobDescription) {
    return domainConfig.skills.slice(0, 12);
  }

  const domainSkills = domainConfig.skills.filter(skill => matchesSkill(jobDescription, skill));
  const dynamic = extractDynamicKeywords(jobDescription, domainSkills, 24)
    .filter(term => term.length > 2)
    .filter(term => !FILLER_TERMS.has(term.toLowerCase()))
    .filter(term => /[A-Za-z]/.test(term));

  const prioritized = [
    ...domainSkills,
    ...domainConfig.skills.filter(skill => dynamic.some(term => matchesSkill(term, skill))),
    ...dynamic.filter(term => isUsefulKeywordPhrase(term))
  ];

  return dedupe(prioritized).slice(0, 18);
}

function extractTargetTitles(text, domainConfig) {
  const titlesFromConfig = domainConfig.titles.filter(title => matchesSkill(text, title));
  if (titlesFromConfig.length > 0) {
    return titlesFromConfig;
  }

  const titleRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+(?:Developer|Engineer|Designer|Analyst|Manager|Specialist|Consultant|Architect))\b/g;
  const discovered = [];
  for (const match of text.matchAll(titleRegex)) {
    discovered.push(match[1]);
  }

  return dedupe([...titlesFromConfig, ...discovered]).slice(0, 5);
}

function analyzeParseQuality(resumeText, weights) {
  const checks = [];
  const lower = resumeText.toLowerCase();
  const lines = resumeText.split('\n').map(line => line.trim()).filter(Boolean);
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  const weirdChars = (resumeText.match(/[|¦•■□◆►]/g) || []).length;
  const emailPresent = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/.test(resumeText);
  const phonePresent = /(\+\d{1,3}\s?)?(\(?\d{3,4}\)?[\s-]?\d{3}[\s-]?\d{3,4})/.test(resumeText);

  if (wordCount >= 180) checks.push(2.5);
  if (lines.length >= 8) checks.push(1.5);
  if (emailPresent) checks.push(1.5);
  if (phonePresent) checks.push(1.5);
  if (weirdChars <= 10) checks.push(1);

  const score = clamp(Math.round((checks.reduce((sum, value) => sum + value, 0) / 8) * weights.formatting), 0, weights.formatting);
  const warnings = [];

  if (wordCount < 120) warnings.push('Resume text looks thin after parsing. ATS systems often miss content from image-heavy or table-based files.');
  if (!emailPresent || !phonePresent) warnings.push('Contact details were not fully detected in parsed text.');
  if (weirdChars > 10) warnings.push('Resume may include columns, tables, or graphics that reduce ATS parsing accuracy.');
  if (!/(experience|education|skills)/i.test(lower)) warnings.push('Key resume sections were not clearly detected, which can hurt ATS parsing.');

  return {
    score,
    warnings: warnings.slice(0, 3)
  };
}

function analyzeSections(resumeText, domainConfig, weights) {
  const activeSections = [...BASE_SECTIONS];
  for (const key of domainConfig.recommendedSections || []) {
    if (SECTION_LABELS[key]) {
      activeSections.push({ key, ...SECTION_LABELS[key] });
    }
  }

  const uniqueSections = [];
  const seen = new Set();
  for (const section of activeSections) {
    if (!seen.has(section.key)) {
      seen.add(section.key);
      uniqueSections.push(section);
    }
  }

  const found = [];
  const missing = [];
  for (const section of uniqueSections) {
    if (section.regex.test(resumeText)) found.push(section.label);
    else missing.push(section.label);
  }

  const coverage = uniqueSections.length > 0 ? found.length / uniqueSections.length : 0;
  return {
    score: Math.round(coverage * 10),
    found,
    missing
  };
}

function analyzeQuantifiedImpact(resumeText, weights, seniority) {
  const bulletLines = resumeText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => line.length > 20);

  const numericBullets = bulletLines.filter(line => /\b\d+([.,]\d+)?\s?(%|x|k|m|b|hours|days|weeks|months|years|users|clients|projects|revenue|sales)?\b/i.test(line));
  const metricDensity = bulletLines.length > 0 ? numericBullets.length / bulletLines.length : 0;
  const actionVerbCount = ACTION_VERBS.filter(verb => matchesSkill(resumeText.toLowerCase(), verb)).length;
  const numberMatches = resumeText.match(/\b\d+([.,]\d+)?\s?(%|x|k|m|b|hours|days|weeks|months|years|users|clients|projects|revenue|sales)?\b/gi) || [];

  const numericTarget = seniority === 'fresher' ? 2 : seniority === 'senior' ? 4 : 3;
  const actionVerbTarget = seniority === 'fresher' ? 2 : 3;
  const score = clamp(
    Math.round(
      Math.min(weights.quantImpact * 0.55, metricDensity * weights.quantImpact * 1.35) +
      Math.min(weights.quantImpact * 0.25, (numberMatches.length / numericTarget) * (weights.quantImpact * 0.25)) +
      Math.min(weights.quantImpact * 0.2, (actionVerbCount / actionVerbTarget) * (weights.quantImpact * 0.2))
    ),
    0,
    weights.quantImpact
  );

  return {
    score,
    numericBullets: numericBullets.length,
    actionVerbCount
  };
}

function analyzeKeywordMatch(resumeText, jobDescription, domainConfig, weights, seniority) {
  const targetKeywords = extractJobKeywords(jobDescription, domainConfig);
  const matchedKeywords = targetKeywords.filter(keyword => matchesSkill(resumeText, keyword));
  const missingKeywords = targetKeywords.filter(keyword => !matchesSkill(resumeText, keyword));

  const weightedHits = targetKeywords.reduce((sum, keyword) => {
    const weight = keyword.includes(' ') ? 1.3 : 1;
    return sum + (matchesSkill(resumeText, keyword) ? weight : 0);
  }, 0);
  const weightedTotal = targetKeywords.reduce((sum, keyword) => sum + (keyword.includes(' ') ? 1.3 : 1), 0) || 1;
  const coverage = weightedHits / weightedTotal;

  const penaltyMultiplier = seniority === 'fresher' ? 0.007 : seniority === 'senior' ? 0.012 : 0.01;
  const penalty = missingKeywords.length > 0 ? Math.min(0.15, missingKeywords.length * penaltyMultiplier) : 0;
  const score = clamp(Math.round((coverage - penalty) * weights.keywordMatch), 0, weights.keywordMatch);

  return {
    score,
    targetKeywords,
    matchedKeywords,
    missingKeywords
  };
}

function analyzeTitleAlignment(resumeText, jobDescription, domainConfig, weights) {
  const source = jobDescription || resumeText;
  const targetTitles = extractTargetTitles(source, domainConfig);
  const exactMatches = targetTitles.filter(title => matchesSkill(resumeText, title));

  if (exactMatches.length > 0) {
    return {
      score: weights.titleAlignment,
      targetTitles,
      matchedTitles: exactMatches
    };
  }

  const resumeTokens = new Set(tokenize(resumeText));
  const partialMatches = targetTitles.filter(title => {
    const titleTokens = tokenize(title);
    const overlap = titleTokens.filter(token => resumeTokens.has(token)).length;
    return titleTokens.length > 0 && overlap / titleTokens.length >= 0.5;
  });

  return {
    score: partialMatches.length > 0 ? Math.round(weights.titleAlignment * 0.6) : 0,
    targetTitles,
    matchedTitles: partialMatches
  };
}

function extractRequiredYears(jobDescription = '') {
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

function estimateResumeYears(resumeText = '') {
  const explicit = resumeText.match(/(\d+)\+?\s*(?:years|yrs)\s+(?:of\s+)?experience/i);
  if (explicit) return Number(explicit[1]);

  const years = [...resumeText.matchAll(/\b(19|20)\d{2}\b/g)].map(match => Number(match[0]));
  if (years.length >= 2) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    if (maxYear >= minYear) return clamp(maxYear - minYear, 0, 40);
  }

  return null;
}

function determineSeniority({ resumeText, jobDescription, estimatedYears, requiredYears }) {
  const yearsSignal = Math.max(estimatedYears || 0, requiredYears || 0);

  if (
    yearsSignal <= 1 ||
    /\b(fresher|entry level|entry-level|graduate|recent graduate|intern|internship|trainee|junior)\b/i.test(resumeText) ||
    /\b(entry level|entry-level|graduate|intern|trainee|junior)\b/i.test(jobDescription)
  ) {
    return 'fresher';
  }

  if (
    yearsSignal >= 6 ||
    /\b(senior|lead|principal|staff|architect|manager|head)\b/i.test(resumeText) ||
    /\b(senior|lead|principal|staff|architect|manager|head)\b/i.test(jobDescription)
  ) {
    return 'senior';
  }

  return 'mid';
}

function analyzeSectionInventory(resumeText, domainConfig) {
  const activeSections = [...BASE_SECTIONS];
  for (const key of domainConfig.recommendedSections || []) {
    if (SECTION_LABELS[key]) {
      activeSections.push({ key, ...SECTION_LABELS[key] });
    }
  }

  const uniqueSections = [];
  const seen = new Set();
  for (const section of activeSections) {
    if (!seen.has(section.key)) {
      seen.add(section.key);
      uniqueSections.push(section);
    }
  }

  const found = [];
  const missing = [];
  for (const section of uniqueSections) {
    if (section.regex.test(resumeText)) found.push(section.label);
    else missing.push(section.label);
  }

  return { found, missing };
}

function analyzeKeywordCoverage(resumeText, jobDescription, domainConfig, sectionMap, weights) {
  const targetKeywords = extractJobKeywords(jobDescription, domainConfig);
  const hardKeywords = dedupe(targetKeywords.filter(keyword =>
    domainConfig.skills.includes(keyword) || /[A-Z0-9./+#-]/.test(keyword) || keyword.length <= 5
  ));
  const softKeywords = dedupe([
    ...SOFT_SKILLS.filter(skill => matchesSkill(jobDescription, skill)),
    ...targetKeywords.filter(keyword => !hardKeywords.includes(keyword) && /^[a-z][a-z\s-]+$/i.test(keyword))
  ]).slice(0, 10);
  const titleKeywords = dedupe(extractTargetTitles(jobDescription || resumeText, domainConfig)
    .flatMap(title => title.split(/\s+/))
    .filter(token => token.length > 2));

  const sectionTexts = Object.values(sectionMap).join('\n');
  const scoreKeywordGroup = (keywords, weightShare) => {
    if (keywords.length === 0) return weightShare;
    const hits = keywords.reduce((sum, keyword) => sum + (matchesSkill(resumeText, keyword) ? 1 : 0), 0);
    const diversityBonus = keywords.reduce((sum, keyword) => {
      const sectionsMatched = Object.values(sectionMap).filter(text => matchesSkill(text, keyword)).length;
      return sum + Math.min(0.35, sectionsMatched * 0.12);
    }, 0);
    const raw = (hits / keywords.length) + Math.min(0.25, diversityBonus / Math.max(1, keywords.length));
    return Math.min(weightShare, Math.round(raw * weightShare));
  };

  const score =
    scoreKeywordGroup(hardKeywords, Math.round(weights.keywordMatch * 0.6)) +
    scoreKeywordGroup(softKeywords, Math.round(weights.keywordMatch * 0.2)) +
    scoreKeywordGroup(titleKeywords, weights.keywordMatch - Math.round(weights.keywordMatch * 0.6) - Math.round(weights.keywordMatch * 0.2));

  const matchedKeywords = targetKeywords.filter(keyword => matchesSkill(sectionTexts, keyword));
  const missingKeywords = targetKeywords.filter(keyword => !matchesSkill(sectionTexts, keyword));

  return {
    score: clamp(score, 0, weights.keywordMatch),
    matchedKeywords,
    missingKeywords,
    hardKeywords,
    softKeywords,
    titleKeywords
  };
}

function analyzeSkillsCoverage(resumeText, jobDescription, domainConfig, sectionMap, weights) {
  const targetSkills = dedupe([
    ...domainConfig.skills.filter(skill => matchesSkill(jobDescription, skill)),
    ...extractJobKeywords(jobDescription, domainConfig).filter(keyword => domainConfig.skills.some(skill => matchesSkill(keyword, skill)))
  ]);
  const expectedSkills = (targetSkills.length > 0 ? targetSkills : domainConfig.skills).slice(0, 16);
  const matchedSkills = expectedSkills.filter(skill => matchesSkill(resumeText, skill));
  const skillsSectionText = sectionMap.skills || '';
  const sectionHits = matchedSkills.filter(skill => matchesSkill(skillsSectionText, skill)).length;
  const coverage = expectedSkills.length > 0 ? matchedSkills.length / expectedSkills.length : 0;
  const sectionBonus = expectedSkills.length > 0 ? sectionHits / expectedSkills.length : 0;
  const score = clamp(
    Math.round((coverage * weights.skillsMatch * 0.8) + (sectionBonus * weights.skillsMatch * 0.2)),
    0,
    weights.skillsMatch
  );

  return {
    score,
    matchedSkills,
    missingSkills: expectedSkills.filter(skill => !matchesSkill(resumeText, skill))
  };
}

function analyzeEducationCertifications(resumeText, sectionMap, weights, seniority) {
  const educationText = `${sectionMap.education || ''}\n${resumeText}`;
  const certText = `${sectionMap.certifications || ''}\n${resumeText}`;
  const degree = /(bachelor|master|mba|b\.tech|m\.tech|bsc|msc|phd|doctorate|associate)/i.test(educationText);
  const institution = /(university|college|institute|school)/i.test(educationText);
  const year = /\b(19|20)\d{2}\b/.test(educationText);
  const field = /(computer science|engineering|business|marketing|design|finance|data science|information technology)/i.test(educationText);
  const certifications = /(certified|certification|aws certified|google|azure|pmp|scrum|cfa|security\+|network\+)/i.test(certText);
  const certWeight = seniority === 'fresher' ? 1 : 2;
  const raw = (degree ? 3 : 0) + (institution ? 2 : 0) + (year ? 1 : 0) + (field ? 2 : 0) + (certifications ? certWeight : 0);

  return {
    score: clamp(raw, 0, weights.educationCerts),
    hasDegree: degree,
    hasInstitution: institution,
    hasYear: year,
    hasField: field,
    hasCertifications: certifications
  };
}

function analyzeExperienceRelevance(resumeText, jobDescription, domainConfig, sectionMap, weights, seniority) {
  const experienceText = `${sectionMap.experience || ''}\n${sectionMap.projects || ''}\n${resumeText}`;
  const requiredYears = extractRequiredYears(jobDescription);
  const estimatedYears = estimateResumeYears(resumeText);
  const targetTitles = extractTargetTitles(jobDescription || resumeText, domainConfig);
  const titleMatch = targetTitles.some(title => matchesSkill(resumeText, title));
  const numericBullets = experienceText.match(/\b\d+([.,]\d+)?\s?(%|x|k|m|b|hours|days|weeks|months|years|users|clients|projects|revenue|sales)?\b/gi) || [];
  const actionVerbCount = ACTION_VERBS.filter(verb => matchesSkill(experienceText.toLowerCase(), verb)).length;
  const yearTokens = [...resumeText.matchAll(/\b(19|20)\d{2}\b/g)].map(match => Number(match[0]));
  const largeGapDetected = yearTokens.length >= 2 && yearTokens.some((year, index) => index > 0 && Math.abs(year - yearTokens[index - 1]) > 3);
  const semanticMatches = sentenceSplit(jobDescription).filter(sentence => {
    const tokens = tokenize(sentence);
    if (tokens.length < 4) return false;
    return sentenceSplit(experienceText).some(candidate => {
      const candidateTokens = new Set(tokenize(candidate));
      return tokens.filter(token => candidateTokens.has(token)).length >= 2;
    });
  }).length;

  let yearsScore = 0;
  if (!requiredYears) {
    yearsScore = estimatedYears !== null ? 6 : 3;
  } else if (estimatedYears === null) {
    yearsScore = seniority === 'fresher' ? 4 : 2;
  } else {
    const ratio = seniority === 'fresher' && requiredYears <= 2
      ? Math.max(estimatedYears / requiredYears, 0.75)
      : estimatedYears / requiredYears;
    yearsScore = Math.round(Math.min(1.2, ratio) * 8);
  }

  const impactScore = Math.min(6, Math.round((numericBullets.length / (seniority === 'senior' ? 4 : 3)) * 3 + (actionVerbCount / 4)));
  const semanticScore = Math.min(5, semanticMatches);
  const continuityScore = largeGapDetected ? 1 : 3;
  const sectionScore = /(experience|employment|work history|internship)/i.test(sectionMap.experience || '') ? 3 : 1;

  return {
    score: clamp(yearsScore + impactScore + semanticScore + continuityScore + sectionScore, 0, weights.experienceRelevance),
    requiredYears,
    estimatedYears,
    largeGapDetected,
    numericBullets: numericBullets.length,
    titleMatch
  };
}

function analyzeExperienceFit(resumeText, jobDescription, weights, seniority) {
  const requiredYears = extractRequiredYears(jobDescription);
  const estimatedYears = estimateResumeYears(resumeText);

  if (!requiredYears) {
    return {
      score: estimatedYears !== null
        ? Math.round(weights.experienceFit * (seniority === 'fresher' ? 0.7 : 0.8))
        : Math.round(weights.experienceFit * (seniority === 'fresher' ? 0.6 : 0.5)),
      requiredYears: null,
      estimatedYears
    };
  }

  if (estimatedYears === null) {
    return {
      score: Math.round(weights.experienceFit * (seniority === 'fresher' ? 0.55 : 0.3)),
      requiredYears,
      estimatedYears: null
    };
  }

  const ratio = estimatedYears / requiredYears;
  const softenedRatio = seniority === 'fresher' && requiredYears <= 2 ? Math.max(ratio, 0.75) : ratio;
  return {
    score: clamp(Math.round(Math.min(1.15, softenedRatio) * weights.experienceFit), 0, weights.experienceFit),
    requiredYears,
    estimatedYears
  };
}

function analyzeSemanticRelevance(resumeText, jobDescription, keywordSignals, weights) {
  if (!jobDescription) {
    const contextualHits = keywordSignals.matchedKeywords.filter(keyword => {
      const regex = new RegExp(`(?:built|designed|implemented|optimized|managed|led|created|developed)[^\\n.]{0,60}${keyword}`, 'i');
      return regex.test(resumeText);
    }).length;

    return {
      score: clamp(contextualHits, 0, weights.semanticRelevance),
      contextualMatches: contextualHits
    };
  }

  const resumeSentences = sentenceSplit(resumeText);
  const jobSentences = sentenceSplit(jobDescription).slice(0, 18);
  let matchedSentences = 0;

  for (const jobSentence of jobSentences) {
    const jobTokens = tokenize(jobSentence);
    if (jobTokens.length < 4) continue;

    const hasRelevantResumeSentence = resumeSentences.some(resumeSentence => {
      const resumeTokens = new Set(tokenize(resumeSentence));
      const overlap = jobTokens.filter(token => resumeTokens.has(token)).length;
      const keywordOverlap = keywordSignals.matchedKeywords.some(keyword =>
        matchesSkill(jobSentence, keyword) && matchesSkill(resumeSentence, keyword)
      );

      return overlap >= 2 || keywordOverlap;
    });

    if (hasRelevantResumeSentence) matchedSentences += 1;
  }

  const score = clamp(
    Math.round((matchedSentences / Math.max(1, jobSentences.length)) * weights.semanticRelevance),
    0,
    weights.semanticRelevance
  );

  return {
    score,
    contextualMatches: matchedSentences
  };
}

function buildSuggestions({
  formattingAnalysis,
  sectionInventory,
  keywordAnalysis,
  skillsAnalysis,
  educationAnalysis,
  titleAnalysis,
  experienceAnalysis,
  domain,
  hasJobDescription
}) {
  const suggestions = [];

  if (formattingAnalysis.warnings.length > 0) {
    suggestions.push(formattingAnalysis.warnings[0]);
  }

  if (keywordAnalysis.missingKeywords.length > 0) {
    suggestions.push(`Keyword match is the biggest ATS lever. Add missing ${domain.replace('_', ' ')} terms like ${keywordAnalysis.missingKeywords.slice(0, 4).join(', ')} where they truthfully apply.`);
  }

  if (sectionInventory.missing.length > 0) {
    suggestions.push(`Add or relabel missing sections: ${sectionInventory.missing.slice(0, 4).join(', ')}.`);
  }

  if (skillsAnalysis.missingSkills.length > 0) {
    suggestions.push(`Strengthen the dedicated skills section with exact job terms like ${skillsAnalysis.missingSkills.slice(0, 4).join(', ')}.`);
  }

  if (experienceAnalysis.numericBullets < 3) {
    suggestions.push('Add quantified achievements with numbers, percentages, time saved, revenue, users, tickets, or conversion improvements.');
  }

  if (titleAnalysis.targetTitles.length > 0 && titleAnalysis.matchedTitles.length === 0) {
    suggestions.push(`Align your headline or recent role title more closely with the target role, such as ${titleAnalysis.targetTitles[0]}.`);
  }

  if (!educationAnalysis.hasDegree || !educationAnalysis.hasInstitution || !educationAnalysis.hasYear) {
    suggestions.push('Make education easier for ATS to read by including degree, field, institution, and graduation year on separate clear lines.');
  }

  if (hasJobDescription && experienceAnalysis.requiredYears && experienceAnalysis.estimatedYears !== null && experienceAnalysis.estimatedYears < experienceAnalysis.requiredYears) {
    suggestions.push(`This role appears to ask for ${experienceAnalysis.requiredYears}+ years of experience, while the resume shows about ${experienceAnalysis.estimatedYears}. Highlight the strongest equivalent experience clearly.`);
  }

  if (experienceAnalysis.largeGapDetected) {
    suggestions.push('Employment dates may show a large gap. Clarify the timeline with projects, internships, freelance work, or education periods.');
  }

  if (!hasJobDescription) {
    suggestions.push('Paste a target job description to switch from domain-based ATS scoring to role-specific ATS scoring with exact keyword, title, and experience checks.');
  }

  return dedupe(suggestions).slice(0, 6);
}

function analyzeResume(resumeText, jobDescription = '') {
  const normalizedResume = normalizeText(resumeText);
  const normalizedJob = normalizeText(jobDescription);
  const domain = detectDomain([normalizedJob, normalizedResume]);
  const domainConfig = getDomainConfig(domain);
  const sectionMap = getSectionsMap(normalizedResume);
  const estimatedYears = estimateResumeYears(normalizedResume);
  const requiredYears = extractRequiredYears(normalizedJob);
  const seniority = determineSeniority({
    resumeText: normalizedResume,
    jobDescription: normalizedJob,
    estimatedYears,
    requiredYears
  });
  const weights = getActiveWeights(seniority);

  const formattingAnalysis = analyzeParseQuality(normalizedResume, weights);
  const sectionInventory = analyzeSectionInventory(normalizedResume, domainConfig);
  const keywordAnalysis = analyzeKeywordCoverage(normalizedResume, normalizedJob, domainConfig, sectionMap, weights);
  const skillsAnalysis = analyzeSkillsCoverage(normalizedResume, normalizedJob, domainConfig, sectionMap, weights);
  const educationAnalysis = analyzeEducationCertifications(normalizedResume, sectionMap, weights, seniority);
  const titleAnalysis = analyzeTitleAlignment(normalizedResume, normalizedJob, domainConfig, weights);
  const experienceAnalysis = analyzeExperienceRelevance(normalizedResume, normalizedJob, domainConfig, sectionMap, weights, seniority);

  const score = clamp(
    formattingAnalysis.score +
      keywordAnalysis.score +
      skillsAnalysis.score +
      educationAnalysis.score +
      titleAnalysis.score +
      experienceAnalysis.score,
    0,
    100
  );

  const suggestions = buildSuggestions({
    formattingAnalysis,
    sectionInventory,
    keywordAnalysis,
    skillsAnalysis,
    educationAnalysis,
    titleAnalysis,
    experienceAnalysis,
    domain,
    hasJobDescription: Boolean(normalizedJob)
  });

  return {
    score,
    domain,
    seniority,
    suggestions,
    foundKeywords: keywordAnalysis.matchedKeywords.slice(0, 18),
    missingKeywords: keywordAnalysis.missingKeywords.slice(0, 12),
    breakdown: {
      formatting_parsability: formattingAnalysis.score,
      keyword_match: keywordAnalysis.score,
      work_experience_relevance: experienceAnalysis.score,
      skills_match: skillsAnalysis.score,
      education_certifications: educationAnalysis.score,
      title_alignment: titleAnalysis.score,
    },
    diagnostics: {
      sections_found: sectionInventory.found,
      sections_missing: sectionInventory.missing,
      target_titles: titleAnalysis.targetTitles,
      matched_titles: titleAnalysis.matchedTitles,
      required_years: experienceAnalysis.requiredYears,
      estimated_years: experienceAnalysis.estimatedYears,
      parse_warnings: formattingAnalysis.warnings,
      seniority_profile: seniority
    }
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
      const { resume_id, job_description = '' } = req.body;
      if (!resume_id) {
        return res.status(400).json({ error: 'Missing resume_id' });
      }

      const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resume_id)
        .single();
      if (resumeError) throw resumeError;

      const analysis = analyzeResume(resume.content, job_description);

      try {
        await supabase
          .from('ats_scores')
          .insert({
            resume_id,
            score: analysis.score,
            suggestions: analysis.suggestions,
            keywords_found: analysis.foundKeywords
          });

        await supabase
          .from('resumes')
          .update({ ats_score: analysis.score })
          .eq('id', resume_id);
      } catch (dbErr) {
        console.warn('DB save warning (non-fatal):', dbErr.message);
      }

      return res.status(201).json({
        score: analysis.score,
        domain: analysis.domain,
        seniority: analysis.seniority,
        suggestions: analysis.suggestions,
        keywords_found: analysis.foundKeywords,
        missing_keywords: analysis.missingKeywords,
        breakdown: analysis.breakdown,
        diagnostics: analysis.diagnostics
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
