from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import spacy

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

SAMPLE_JOBS = [
    {"id": 1, "title": "Senior Frontend Engineer", "company": "Tech Innovators", "description": "Looking for expert in React, TypeScript, and Tailwind CSS. Experience with state management is a must.", "job_type": "Remote"},
    {"id": 2, "title": "Python Backend Developer", "company": "DataFlow Systems", "description": "Expert in Python, FastAPI, and PostgreSQL. Familiarity with Docker and AWS is preferred.", "job_type": "On-site"},
    {"id": 3, "title": "Full Stack Developer", "company": "Web Solutions", "description": "Professional experience with Next.js, Node.js, and MongoDB. Ability to build responsive UI.", "job_type": "On-site"},
    {"id": 4, "title": "DevOps Engineer", "company": "Cloud Masters", "description": "Managing AWS infrastructure, Kubernetes clusters, and CI/CD pipelines using GitHub Actions.", "job_type": "Remote"},
    {"id": 5, "title": "Machine Learning Engineer", "company": "AI Core", "description": "Developing models using Scikit-learn, TensorFlow, and Python. Solid background in Data Science.", "job_type": "On-site"},
    {"id": 6, "title": "Java Developer", "company": "Enterprise Corp", "description": "Building scalable Java applications. Experience with Spring Boot and SQL databases.", "job_type": "On-site"},
    {"id": 7, "title": "Mobile App Developer", "company": "Appify", "description": "React Native expert for cross-platform mobile apps. Experience with Firebase is a plus.", "job_type": "Remote"},
    {"id": 8, "title": "UI/UX Designer", "company": "Creative Agency", "description": "Designing premium interfaces. Proficient in Figma and responsive CSS patterns.", "job_type": "On-site"},
    {"id": 9, "title": "Data Analyst", "company": "Insights Pro", "description": "Analyzing complex datasets using Python, SQL, and data visualization tools.", "job_type": "On-site"},
    {"id": 10, "title": "Security Engineer", "company": "Cyber Guard", "description": "Protecting enterprise systems. Expert in network security and ethical hacking.", "job_type": "On-site"}
]

def ats_score(resume_text, job_description):
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
    
    # Calculate Cosine Similarity
    score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    
    # Dynamic keyword extraction for both resume and job
    resume_keywords = set(extract_keywords_from_resume(resume_text))
    job_keywords = set(extract_keywords_from_resume(job_description))
    
    matched = list(job_keywords.intersection(resume_keywords))
    missing = list(job_keywords.difference(resume_keywords))
    
    return {
        "score": int(score * 100),
        "matched_keywords": matched[:10],
        "missing_keywords": missing[:10]
    }

def match_jobs(resume_text):
    results = []
    for job in SAMPLE_JOBS:
        score_data = ats_score(resume_text, job["description"])
        results.append({
            **job,
            "score": score_data["score"]
        })
    
    # Rank jobs by score
    sorted_jobs = sorted(results, key=lambda x: x["score"], reverse=True)
    return sorted_jobs[:5]
