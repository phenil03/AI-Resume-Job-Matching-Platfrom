import spacy
import PyPDF2
import io
import re

# Load small English model
# To download: python -m spacy download en_core_web_sm
nlp = spacy.load("en_core_web_sm")

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

EDUCATION_KEYWORDS = ["Bachelor", "Master", "PhD", "B.Tech", "M.Tech", "B.Sc", "M.Sc", "Diploma"]

def parse_resume(file_content: bytes):
    # Extract text from PDF
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
    raw_text = ""
    for page in pdf_reader.pages:
        raw_text += page.extract_text() or ""

    # Extract Skills Dynamically
    found_skills = extract_keywords_from_resume(raw_text)

    # Extract Experience
    # Look for patterns like "3 years", "5 months", "Experience: 4 years"
    experience_matches = re.findall(r'(\d+)\s*(?:year|yr|month|mo)s?\b', text_lower)
    experience_years = [int(val) for val in experience_matches]
    total_years = sum(experience_years) if experience_years else 0

    # Extract Education
    found_education = []
    for edu in EDUCATION_KEYWORDS:
        if edu.lower() in text_lower:
            found_education.append(edu)

    return {
        "skills": list(set(found_skills)),
        "experience": f"{total_years} years (detected)",
        "education": list(set(found_education)),
        "raw_text": raw_text
    }
