import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from', 'had', 'has', 'have',
  'he', 'her', 'his', 'i', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our',
  'she', 'the', 'their', 'them', 'they', 'to', 'was', 'we', 'were', 'with', 'you', 'your',
  'resume', 'email', 'phone', 'address', 'summary', 'objective', 'responsible', 'responsibilities',
  'experience', 'education', 'skills', 'project', 'projects', 'work', 'working', 'using', 'used'
]);

const SKILL_ALIASES = {
  'React': ['React.js', 'ReactJS', 'React JS'],
  'Vue': ['Vue.js', 'VueJS', 'Vue JS'],
  'Next.js': ['NextJS', 'Next JS', 'Next-JS'],
  'Node.js': ['NodeJS', 'Node JS', 'Node-JS', 'Node'],
  'Express': ['Express.js', 'ExpressJS', 'Express JS'],
  'NestJS': ['Nest.js', 'Nest JS', 'Nest-JS'],
  'Tailwind': ['Tailwind CSS', 'TailwindCSS'],
  'Scikit-learn': ['Scikit Learn', 'Sklearn'],
  'PostgreSQL': ['Postgres'],
  'Kubernetes': ['K8s'],
  'Power BI': ['PowerBI'],
  'GitHub Actions': ['Github Actions'],
  'CI/CD': ['CI CD', 'CI-CD', 'CICD', 'Continuous Integration', 'Continuous Delivery'],
  'Generative AI': ['GenAI', 'Gen AI'],
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSkillRegex(skill) {
  const escapedSkill = escapeRegExp(skill);
  const hasPunctuation = /[^a-zA-Z0-9\s]/.test(skill);

  if (hasPunctuation) {
    return new RegExp(`(?<![a-zA-Z0-9])${escapedSkill}(?![a-zA-Z0-9])`, 'i');
  }

  return new RegExp(`\\b${escapedSkill}\\b`, 'i');
}

function getSkillVariants(skill) {
  const base = typeof skill === 'string' ? skill.trim() : '';
  if (!base) return [];

  const variants = new Set([base]);
  const aliases = SKILL_ALIASES[base] || [];
  aliases.forEach(alias => variants.add(alias));

  if (base.includes('.js')) {
    variants.add(base.replace('.js', 'js'));
    variants.add(base.replace('.js', ' JS'));
    variants.add(base.replace('.js', '-JS'));
  }

  if (base.includes('/')) {
    variants.add(base.replace(/\//g, ' '));
    variants.add(base.replace(/\//g, '-'));
    variants.add(base.replace(/\//g, ''));
  }

  if (base.includes(' ')) {
    variants.add(base.replace(/\s+/g, '-'));
  }

  return [...variants];
}

export function matchesSkill(text, skill) {
  return getSkillVariants(skill).some(variant => buildSkillRegex(variant).test(text));
}

export function countSkillMatches(text, skill) {
  return getSkillVariants(skill).reduce((bestCount, variant) => {
    const regex = buildSkillRegex(variant);
    const matches = text.match(new RegExp(regex.source, 'gi')) || [];
    return Math.max(bestCount, matches.length);
  }, 0);
}

function normalizeExtractedText(text) {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/_+/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function extractTextFromPdfBase64(base64Content) {
  const buffer = Buffer.from(base64Content, 'base64');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map(item => item.str).join(' '));
  }

  const normalized = normalizeExtractedText(pageTexts.join('\n'));
  return normalized.length > 20 ? normalized : '';
}

export async function getResumeText({ content, filename = '', fileType = '', isBinary = false }) {
  if (!isBinary) {
    return typeof content === 'string' ? content.trim() : '';
  }

  const lowerName = filename.toLowerCase();
  const lowerType = fileType.toLowerCase();

  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return extractTextFromPdfBase64(content);
  }

  return '';
}

function normalizePhrase(phrase) {
  return phrase
    .replace(/\s+/g, ' ')
    .replace(/^[^a-zA-Z0-9#+./-]+|[^a-zA-Z0-9#+./-]+$/g, '')
    .trim();
}

function scorePhrase(text, phrase) {
  return countSkillMatches(text, phrase);
}

export function extractDynamicKeywords(text, knownSkills = [], limit = 15) {
  const sourceText = typeof text === 'string' ? text : '';
  const normalizedText = sourceText.replace(/\s+/g, ' ').trim();
  if (!normalizedText) return [];

  const keywords = new Map();

  knownSkills.forEach(skill => {
    if (matchesSkill(sourceText, skill)) {
      keywords.set(skill, scorePhrase(sourceText, skill) + 3);
    }
  });

  const phraseRegex = /\b[A-Za-z][A-Za-z0-9#+./-]*(?:\s+[A-Za-z][A-Za-z0-9#+./-]*){0,2}\b/g;

  for (const match of normalizedText.matchAll(phraseRegex)) {
    const rawPhrase = normalizePhrase(match[0]);
    if (!rawPhrase) continue;

    const words = rawPhrase.split(' ');
    const loweredWords = words.map(word => word.toLowerCase());
    const stopwordCount = loweredWords.filter(word => STOPWORDS.has(word)).length;

    if (words.length === 1) {
      const word = words[0];
      if (word.length < 3 && !/[+#]/.test(word)) continue;
      if (STOPWORDS.has(word.toLowerCase())) continue;
    } else {
      if (words.every(word => STOPWORDS.has(word.toLowerCase()))) continue;
      if (words.some(word => word.length === 1 && !/[+#&]/.test(word))) continue;
      if (STOPWORDS.has(loweredWords[0]) || STOPWORDS.has(loweredWords[loweredWords.length - 1])) continue;
      if (stopwordCount > 1) continue;
    }

    const hasSignal = /[A-Z#+./-]/.test(rawPhrase) || words.length > 1 || /\d/.test(rawPhrase);
    if (!hasSignal) continue;

    const weight =
      (words.length > 1 ? 2 : 1) +
      (/[#+./-]/.test(rawPhrase) ? 2 : 0) +
      (/[A-Z]/.test(rawPhrase) ? 1 : 0);

    keywords.set(rawPhrase, (keywords.get(rawPhrase) || 0) + weight);
  }

  return [...keywords.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .map(([phrase]) => phrase)
    .filter((phrase, index, items) => {
      const lower = phrase.toLowerCase();
      return items.findIndex(item => item.toLowerCase() === lower) === index;
    })
    .slice(0, limit);
}
