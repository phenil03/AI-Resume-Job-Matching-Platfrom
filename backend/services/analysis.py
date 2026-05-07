import re

DOMAIN_CONFIGS = {
    "frontend": {
        "detect": ["frontend", "front end", "ui developer", "web developer", "react", "vue", "angular", "typescript", "javascript", "responsive design"],
        "skills": ["React", "Vue", "Angular", "Next.js", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS", "Redux", "REST API", "GraphQL", "Vite"],
        "titles": ["Frontend Developer", "UI Developer", "React Developer", "Web Developer", "Frontend Engineer"],
        "recommended_sections": ["projects", "skills"],
    },
    "backend": {
        "detect": ["backend", "back end", "api developer", "node.js", "python", "java", "microservices", "server-side", "fastapi"],
        "skills": ["Node.js", "Python", "Java", "FastAPI", "Django", "Flask", "Spring Boot", "REST API", "GraphQL", "PostgreSQL", "MySQL", "Redis", "Docker", "Kafka", "Microservices"],
        "titles": ["Backend Developer", "API Developer", "Backend Engineer", "Software Engineer"],
        "recommended_sections": ["projects", "experience"],
    },
    "fullstack": {
        "detect": ["fullstack", "full stack", "full-stack", "mern", "mean", "software engineer", "software developer"],
        "skills": ["React", "Node.js", "Express", "MongoDB", "PostgreSQL", "JavaScript", "TypeScript", "REST API", "Docker", "Git", "AWS", "HTML", "CSS"],
        "titles": ["Full Stack Developer", "Software Engineer", "Fullstack Engineer"],
        "recommended_sections": ["projects", "experience"],
    },
    "devops": {
        "detect": ["devops", "sre", "site reliability", "docker", "kubernetes", "terraform", "jenkins", "cloud engineer", "infrastructure"],
        "skills": ["Docker", "Kubernetes", "Terraform", "Jenkins", "AWS", "Azure", "GCP", "Linux", "Bash", "CI/CD", "Prometheus", "Grafana", "Ansible"],
        "titles": ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer", "Platform Engineer"],
        "recommended_sections": ["projects", "certifications"],
    },
    "data_science": {
        "detect": ["data scientist", "machine learning", "deep learning", "nlp", "ai engineer", "pytorch", "tensorflow", "artificial intelligence"],
        "skills": ["Python", "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "NLP", "Deep Learning", "SQL", "Statistics", "Apache Spark", "Jupyter", "Computer Vision"],
        "titles": ["Data Scientist", "ML Engineer", "AI Engineer", "Machine Learning Engineer"],
        "recommended_sections": ["projects", "publications"],
    },
    "cybersecurity": {
        "detect": ["cybersecurity", "security analyst", "penetration testing", "ethical hacking", "soc analyst", "infosec", "security engineer"],
        "skills": ["SIEM", "OWASP", "Network Security", "Incident Response", "Vulnerability Assessment", "IAM", "Penetration Testing", "Cloud Security", "Linux", "Kali Linux"],
        "titles": ["Security Analyst", "Cybersecurity Analyst", "Security Engineer", "SOC Analyst"],
        "recommended_sections": ["certifications", "projects"],
    },
    "product_management": {
        "detect": ["product manager", "product management", "roadmap", "stakeholder management", "go-to-market", "product strategy"],
        "skills": ["Product Strategy", "Roadmapping", "Stakeholder Management", "User Research", "SQL", "A/B Testing", "Analytics", "Agile", "Sprint Planning", "Product Discovery"],
        "titles": ["Product Manager", "Associate Product Manager", "Technical Product Manager"],
        "recommended_sections": ["projects", "summary"],
    },
    "digital_marketing": {
        "detect": ["digital marketing", "seo", "sem", "campaign", "content marketing", "lead generation", "google analytics"],
        "skills": ["SEO", "SEM", "Google Analytics", "Campaign Management", "Email Marketing", "Content Marketing", "CRM", "Lead Generation", "A/B Testing"],
        "titles": ["Digital Marketing Specialist", "Marketing Manager", "Growth Marketer"],
        "recommended_sections": ["summary", "experience"],
    },
    "ui_ux_design": {
        "detect": ["ui/ux", "ux designer", "ui designer", "product designer", "figma", "wireframing", "prototyping", "user research"],
        "skills": ["Figma", "Wireframing", "Prototyping", "User Research", "Design System", "Typography", "Accessibility", "Visual Design", "Usability Testing"],
        "titles": ["UI Designer", "UX Designer", "Product Designer", "UI/UX Designer"],
        "recommended_sections": ["portfolio", "projects"],
    },
}

TERM_DOMAIN_FREQUENCY = {}
for domain_name, domain_config in DOMAIN_CONFIGS.items():
    seen_terms = set()
    for bucket in ("detect", "skills", "titles"):
        seen_terms.update(term.lower() for term in domain_config[bucket])
    for term in seen_terms:
        TERM_DOMAIN_FREQUENCY[term] = TERM_DOMAIN_FREQUENCY.get(term, 0) + 1

SECTION_PATTERNS = {
    "summary": r"(summary|profile|objective|about me|professional summary)",
    "experience": r"(experience|employment|work history|professional experience|internship)",
    "skills": r"(skills|technical skills|core competencies|technologies|tools|expertise)",
    "education": r"(education|degree|university|college|bachelor|master|b\.tech|m\.tech|graduate)",
    "projects": r"(projects|project experience|case studies)",
    "certifications": r"(certifications|certificates|certified)",
    "portfolio": r"(portfolio|behance|dribbble)",
}

def normalize_text(value: str = "") -> str:
    value = str(value or "")
    value = value.replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()

def matches_term(text: str, term: str) -> bool:
    if not text or not term:
        return False
    pattern = r"(?<![a-z0-9])" + re.escape(term.lower()) + r"(?![a-z0-9])"
    return re.search(pattern, text.lower()) is not None

def count_matches(text: str, terms: list[str]) -> int:
    return sum(1 for term in terms if matches_term(text, term))

def get_uniqueness_bonus(term: str) -> float:
    frequency = TERM_DOMAIN_FREQUENCY.get(term.lower(), 1)
    if frequency <= 1:
        return 1.75
    if frequency == 2:
        return 1.25
    return 1.0

def score_domain_source(text: str, config: dict, source_weight: float) -> float:
    if not text:
        return 0.0

    score = 0.0
    for term in config["detect"]:
        if matches_term(text, term):
            score += 2.5 * get_uniqueness_bonus(term) * source_weight
    for skill in config["skills"]:
        if matches_term(text, skill):
            score += 1.75 * get_uniqueness_bonus(skill) * source_weight
    for title in config["titles"]:
        if matches_term(text, title):
            score += 4.5 * get_uniqueness_bonus(title) * source_weight

    return score

def get_domain_search_profile(domain: str, resume_text: str = "", job_description: str = "") -> dict:
    config = DOMAIN_CONFIGS.get(domain, DOMAIN_CONFIGS["fullstack"])
    resume_text = normalize_text(resume_text).lower()
    job_description = normalize_text(job_description).lower()
    combined_text = f"{job_description}\n{resume_text}".strip()

    matched_skills = [skill for skill in config["skills"] if matches_term(combined_text, skill)]
    matched_titles = [title for title in config["titles"] if matches_term(combined_text, title)]
    primary_role = matched_titles[0] if matched_titles else config["titles"][0]
    role_keywords = matched_skills[:3] if matched_skills else config["skills"][:2]

    return {
        "domain": domain,
        "primary_role": primary_role,
        "role_keywords": role_keywords,
        "detect_terms": config["detect"],
        "skills": config["skills"],
        "titles": config["titles"],
    }

def detect_domain(resume_text: str, job_description: str = "", domain_override: str | None = None) -> str:
    if domain_override and domain_override in DOMAIN_CONFIGS:
        return domain_override

    job_description = normalize_text(job_description).lower()
    resume_text = normalize_text(resume_text).lower()
    scores = {}
    for domain, config in DOMAIN_CONFIGS.items():
        score = 0.0
        score += score_domain_source(job_description, config, 1.35)
        score += score_domain_source(resume_text, config, 1.0)

        title_hits = count_matches(job_description, config["titles"]) + count_matches(resume_text, config["titles"])
        detect_hits = count_matches(job_description, config["detect"]) + count_matches(resume_text, config["detect"])
        skill_hits = count_matches(job_description, config["skills"]) + count_matches(resume_text, config["skills"])

        if title_hits:
            score += title_hits * 4
        if detect_hits and skill_hits:
            score += 3
        if job_description and count_matches(job_description, config["detect"]) and count_matches(job_description, config["skills"]):
            score += 4

        scores[domain] = score

    ranked_domains = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_domain, top_score = ranked_domains[0]
    second_score = ranked_domains[1][1] if len(ranked_domains) > 1 else 0.0

    if top_score <= 0:
        return "fullstack"

    resume_frontend_presence = count_matches(resume_text, DOMAIN_CONFIGS["frontend"]["detect"]) + count_matches(resume_text, DOMAIN_CONFIGS["frontend"]["skills"])
    resume_backend_presence = count_matches(resume_text, DOMAIN_CONFIGS["backend"]["detect"]) + count_matches(resume_text, DOMAIN_CONFIGS["backend"]["skills"])
    resume_fullstack_presence = count_matches(resume_text, DOMAIN_CONFIGS["fullstack"]["detect"]) + count_matches(resume_text, DOMAIN_CONFIGS["fullstack"]["skills"])
    job_frontend_presence = count_matches(job_description, DOMAIN_CONFIGS["frontend"]["detect"]) + count_matches(job_description, DOMAIN_CONFIGS["frontend"]["skills"])
    job_backend_presence = count_matches(job_description, DOMAIN_CONFIGS["backend"]["detect"]) + count_matches(job_description, DOMAIN_CONFIGS["backend"]["skills"])
    job_fullstack_presence = count_matches(job_description, DOMAIN_CONFIGS["fullstack"]["detect"]) + count_matches(job_description, DOMAIN_CONFIGS["fullstack"]["skills"])

    mixed_resume = resume_frontend_presence >= 2 and resume_backend_presence >= 2
    mixed_job_description = job_frontend_presence >= 2 and job_backend_presence >= 2
    if (mixed_resume and (resume_fullstack_presence >= 1 or abs(scores.get("frontend", 0.0) - scores.get("backend", 0.0)) <= 4)) or (
        mixed_job_description and (job_fullstack_presence >= 1 or abs(scores.get("frontend", 0.0) - scores.get("backend", 0.0)) <= 4)
    ):
        return "fullstack"

    fullstack_score = scores.get("fullstack", 0.0)
    if top_domain != "fullstack" and top_score >= fullstack_score + 2:
        return top_domain

    top_gap = top_score - second_score
    if top_domain == "fullstack" and top_gap < 3:
        non_fullstack = next((domain for domain, score in ranked_domains if domain != "fullstack" and score > 0), None)
        if non_fullstack:
            return non_fullstack

    return top_domain

def analyze_resume(resume_text: str, job_description: str = "", domain_override: str | None = None) -> dict:
    resume_text = normalize_text(resume_text)
    job_description = normalize_text(job_description)
    domain = detect_domain(resume_text, job_description, domain_override)
    config = DOMAIN_CONFIGS.get(domain, DOMAIN_CONFIGS["fullstack"])

    expected_skills = config["skills"][:14]
    if job_description:
        expected_skills = [skill for skill in config["skills"] if matches_term(job_description, skill)] or expected_skills

    matched_skills = [skill for skill in expected_skills if matches_term(resume_text, skill)]
    missing_skills = [skill for skill in expected_skills if skill not in matched_skills]

    section_found = [
        label for label, pattern in SECTION_PATTERNS.items()
        if re.search(pattern, resume_text, re.IGNORECASE)
    ]
    recommended = config.get("recommended_sections", [])
    recommended_missing = [section for section in recommended if section not in section_found]

    has_email = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}", resume_text) is not None
    has_phone = re.search(r"(\+\d{1,3}\s?)?(\(?\d{3,4}\)?[\s-]?\d{3}[\s-]?\d{3,4})", resume_text) is not None
    has_education = re.search(SECTION_PATTERNS["education"], resume_text, re.IGNORECASE) is not None
    years_found = re.findall(r"\b(19|20)\d{2}\b", resume_text)
    quantified_lines = [
        line for line in resume_text.split("\n")
        if re.search(r"\b\d+([.,]\d+)?\s?(%|x|k|m|b|users|projects|years|months|days)?\b", line, re.IGNORECASE)
    ]

    keyword_score = round((len(matched_skills) / max(1, len(expected_skills))) * 35)
    skills_score = round((len(matched_skills) / max(1, len(expected_skills))) * 20)
    formatting_score = 5
    formatting_score -= 2 if not has_email else 0
    formatting_score -= 1 if not has_phone else 0
    formatting_score -= 1 if len(resume_text.split()) < 120 else 0
    formatting_score -= 1 if len(section_found) < 3 else 0
    formatting_score = max(0, formatting_score)

    experience_score = 10
    experience_score += min(10, len(quantified_lines) * 2)
    experience_score += 5 if re.search(SECTION_PATTERNS["experience"], resume_text, re.IGNORECASE) else 0
    experience_score = min(25, experience_score)

    education_score = 4
    education_score += 3 if has_education else 0
    education_score += 3 if len(years_found) >= 1 else 0
    education_score = min(10, education_score)

    title_score = 0
    if any(matches_term(resume_text, title) for title in config["titles"]):
        title_score = 5
    elif any(matches_term(resume_text, token) for title in config["titles"] for token in title.split() if len(token) > 3):
        title_score = 3

    score = max(0, min(100, keyword_score + skills_score + formatting_score + experience_score + education_score + title_score))

    suggestions = []
    if missing_skills:
        suggestions.append(f"Add exact {domain.replace('_', ' ')} keywords like {', '.join(missing_skills[:4])} where they honestly match your work.")
    if recommended_missing:
        suggestions.append(f"Add or rename sections for ATS clarity: {', '.join(recommended_missing[:3])}.")
    if len(quantified_lines) < 3:
        suggestions.append("Add quantified achievements with numbers like percentages, users, tickets, revenue, or time saved.")
    if not has_email or not has_phone:
        suggestions.append("Keep email and phone in plain text near the top so ATS can extract contact details cleanly.")
    if len(resume_text.split()) < 120:
        suggestions.append("The extracted resume text looks thin. Use a text-based resume layout and avoid image-heavy or multi-column designs.")
    if not job_description:
        suggestions.append("Paste a target job description for a role-specific ATS score instead of a general domain score.")

    return {
        "score": score,
        "domain": domain,
        "seniority": "mid",
        "suggestions": suggestions[:6],
        "keywords_found": matched_skills[:12],
        "missing_keywords": missing_skills[:12],
        "breakdown": {
            "keyword_match": keyword_score,
            "formatting_parsability": formatting_score,
            "work_experience_relevance": experience_score,
            "skills_match": skills_score,
            "education_certifications": education_score,
            "title_alignment": title_score,
        },
        "diagnostics": {
            "sections_found": section_found,
            "sections_missing": recommended_missing,
            "expected_skills": expected_skills,
            "quantified_lines": len(quantified_lines),
        },
    }
