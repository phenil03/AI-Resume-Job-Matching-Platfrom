import supabase, { ensureAwake } from './_supabase.js';
import { countSkillMatches, extractDynamicKeywords, matchesSkill } from './_text-utils.js';

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

const ACTION_VERBS = ['developed', 'led', 'managed', 'implemented', 'designed', 'optimized',
  'scaled', 'architected', 'resolved', 'collaborated', 'increased', 'decreased', 'shipped',
  'built', 'deployed', 'automated', 'analyzed', 'delivered', 'launched', 'created'];

function detectDomain(lowerContent) {
  const scores = {};
  for (const [domain, config] of Object.entries(DOMAINS)) {
    scores[domain] = config.detect.filter(word => matchesSkill(lowerContent, word)).length;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'fullstack';
}

function analyzeResume(content) {
  const lowerContent = content.toLowerCase();

  const primaryDomain = detectDomain(lowerContent);
  const domainSkills = DOMAINS[primaryDomain].skills;

  // GLOBAL EXTRACTION: Search across ALL domain skills to ensure nothing is missed
  const allPossibleSkills = Object.values(DOMAINS).flatMap(d => d.skills);
  const uniqueSkills = [...new Set(allPossibleSkills)];

  const matchedSkills = uniqueSkills.filter(skill => matchesSkill(content, skill));
  const matchedDomainSkills = domainSkills.filter(skill => matchesSkill(content, skill));
  const foundKeywords = extractDynamicKeywords(content, matchedSkills, 15);

  const totalKeywordHits = matchedSkills.reduce((sum, skill) => sum + countSkillMatches(content, skill), 0);
  const domainCoverage = domainSkills.length > 0 ? matchedDomainSkills.length / domainSkills.length : 0;
  const overallCoverage = uniqueSkills.length > 0 ? matchedSkills.length / uniqueSkills.length : 0;
  const keywordDensity = matchedSkills.length > 0 ? totalKeywordHits / matchedSkills.length : 0;
  const keywordScore = Math.round(
    Math.min(35, domainCoverage * 28) +
    Math.min(10, overallCoverage * 40) +
    Math.min(7, keywordDensity * 2)
  );

  const sections = {
    contact:    { regex: /([a-zA-Z0-9._%+-]+@|phone|mobile|linkedin|github|portfolio)/, score: 5 },
    education:  { regex: /(education|degree|university|college|bachelor|master|b\.tech|m\.tech|graduate)/, score: 5 },
    experience: { regex: /(experience|worked|employment|internship|professional)/, score: 10 },
    skills:     { regex: /(skills|technologies|tools|competencies|expertise)/, score: 5 }
  };
  let sectionScore = 0;
  const missingSections = [];
  for (const [name, data] of Object.entries(sections)) {
    if (data.regex.test(lowerContent)) sectionScore += data.score;
    else missingSections.push(name);
  }

  const metricMatch = lowerContent.match(/\d+%/g) || [];
  const verbMatch = ACTION_VERBS.filter(v => matchesSkill(lowerContent, v));
  const impactScore = Math.min(15, (metricMatch.length * 4) + (verbMatch.length * 1.5));

  const wordCount = content.split(/\s+/).length;
  const depthScore = wordCount > 180 && wordCount < 850 ? 10 : wordCount >= 850 ? 7 : 4;

  const score = Math.max(18, Math.min(98, Math.round(keywordScore + sectionScore + impactScore + depthScore + 12)));

  const suggestions = [];
  const missingFromDomain = domainSkills
    .filter(skill => !matchesSkill(content, skill))
    .slice(0, 3);

  if (missingFromDomain.length > 0)
    suggestions.push(`${primaryDomain.replace('_', ' ').toUpperCase()} Gap: Consider adding ${missingFromDomain.join(', ')} to strengthen your profile.`);
  if (missingSections.length > 0)
    suggestions.push(`Missing Sections: Add or clearly label — ${missingSections.join(', ')}.`);
  if (metricMatch.length === 0)
    suggestions.push('Quantify Impact: Add numbers like "Reduced load time by 40%" to stand out in ATS.');
  if (matchedDomainSkills.length < 5)
    suggestions.push(`Low Keyword Match: Only ${matchedDomainSkills.length} core ${primaryDomain.replace('_', ' ')} skills found. Add more domain-specific tools.`);
  if (verbMatch.length < 3)
    suggestions.push('Weak Action Verbs: Start bullets with Built, Deployed, Optimized, Delivered, Automated.');

  return {
    score,
    suggestions: suggestions.slice(0, 5),
    foundKeywords: foundKeywords.slice(0, 15)
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

      const analysis = analyzeResume(resume.content);

      // Save to DB (best-effort, don't fail if table missing)
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

      // Always return the correct shape the frontend expects
      return res.status(201).json({
        score: analysis.score,
        suggestions: analysis.suggestions,
        keywords_found: analysis.foundKeywords
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
