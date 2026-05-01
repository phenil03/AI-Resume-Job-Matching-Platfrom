import spacy
import PyPDF2
import io
import re
from models.schemas import ResumeData

# Load spaCy
try:
    nlp = spacy.load("en_core_web_sm")
except:
    import os
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

SKILLS_LIST = [
    "Python", "Java", "JavaScript", "TypeScript", "React", "Angular", "Vue",
    "Node.js", "Django", "FastAPI", "Flask", "Spring Boot", "MongoDB", "MySQL",
    "PostgreSQL", "SQLite", "Redis", "Docker", "Kubernetes", "Git", "GitHub",
    "AWS", "Azure", "GCP", "Machine Learning", "Deep Learning", "NLP",
    "TensorFlow", "PyTorch", "Keras", "spaCy", "NLTK", "scikit-learn",
    "Pandas", "NumPy", "Matplotlib", "Seaborn", "Streamlit", "Selenium",
    "HTML", "CSS", "Bootstrap", "Tailwind CSS", "REST API", "GraphQL",
    "Kafka", "RabbitMQ", "Microservices", "Linux", "Bash", "PowerShell",
    "C", "C++", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "Flutter", "Dart",
    "React Native", "Firebase", "Supabase", "Vercel", "Netlify", "Heroku",
    "Jira", "Figma", "Postman", "Jupyter", "Google Colab", "Hadoop", "Spark",
    "Computer Vision", "FAISS", "CLIP", "HuggingFace", "Transformers",
    "LangChain", "OpenAI API", "Gemini API", "Prompt Engineering",
    "Data Structures", "Algorithms", "OOP", "System Design", "SQL", "NoSQL"
]

EDUCATION_KEYWORDS = [
    "B.Tech", "M.Tech", "BCA", "MCA", "B.Sc", "M.Sc",
    "MBA", "PhD", "Bachelor", "Master", "Diploma", "10th", "12th"
]

def parse_pdf(file_content: bytes) -> str:
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""

def extract_email(text: str) -> str:
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    match = re.search(pattern, text)
    return match.group(0) if match else ""

def extract_phone(text: str) -> str:
    # Pattern for Indian phone numbers
    pattern = r'(?:\+91[\-\s]?)?[6-9]\d{9}'
    match = re.search(pattern, text)
    return match.group(0) if match else ""

def extract_name(text: str) -> str:
    doc = nlp(text[:500]) # Only check the beginning
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return ent.text
    return "Candidate Name"

def extract_keywords_from_resume(text):
    doc = nlp(text)
    keywords = set()
    for ent in doc.ents:
        if ent.label_ in ["ORG", "PRODUCT", "GPE", "WORK_OF_ART"]:
            keywords.add(ent.text.lower().strip())
    for chunk in doc.noun_chunks:
        clean = chunk.text.lower().strip()
        if 2 < len(clean) < 40 and clean.isascii():
            keywords.add(clean)
    return list(keywords)

def extract_skills(text: str) -> list:
    return extract_keywords_from_resume(text)

def extract_education(text: str) -> list:
    found = []
    text_lower = text.lower()
    for edu in EDUCATION_KEYWORDS:
        if edu.lower() in text_lower:
            found.append(edu)
    return list(set(found))

def extract_experience(text: str) -> list:
    # Look for "X years", "X months", and date ranges like "2020-2023"
    patterns = [
        r'\d+\s*(?:year|yr|month|mo)s?',
        r'\d{4}\s*-\s*(?:\d{4}|Present|current)',
        r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}'
    ]
    found = []
    for p in patterns:
        matches = re.findall(p, text, re.IGNORECASE)
        found.extend(matches)
    return list(set(found))

def parse_resume(raw_text: str) -> ResumeData:
    try:
        return ResumeData(
            name=extract_name(raw_text),
            email=extract_email(raw_text),
            phone=extract_phone(raw_text),
            skills=extract_skills(raw_text),
            education=extract_education(raw_text),
            experience=extract_experience(raw_text),
            raw_text=raw_text
        )
    except Exception as e:
        print(f"Error in parse_resume: {e}")
        return ResumeData(name="", email="", phone="", skills=[], education=[], experience=[], raw_text=raw_text)
