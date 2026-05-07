from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import time
import base64
from services.parser import parse_resume, parse_uploaded_file
from services.matcher import match_jobs
from services.analysis import analyze_resume, detect_domain, get_domain_search_profile
from services.scraper import get_real_time_jobs, domain_job_score

router = APIRouter(prefix="/api", tags=["API V1 (Compatibility)"])

# In-memory store for compatibility
resume_db: Dict[int, dict] = {}

class ResumeUploadRequest(BaseModel):
    filename: str
    content: str
    file_type: str
    is_binary: bool

class ATSAnalyzeRequest(BaseModel):
    resume_id: int
    job_description: Optional[str] = ""
    domain_override: Optional[str] = None

@router.post("/resumes")
async def upload_resume_api(payload: ResumeUploadRequest):
    try:
        if payload.is_binary:
            file_bytes = base64.b64decode(payload.content)
            raw_text = parse_uploaded_file(file_bytes, payload.filename, payload.file_type)
        else:
            raw_text = payload.content

        if not raw_text:
            raise HTTPException(status_code=400, detail="Could not extract readable text from file")

        # Create a mock resume object for the frontend
        resume_id = int(time.time() * 1000)
        resume_obj = {
            "id": resume_id,
            "filename": payload.filename,
            "content": raw_text,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        resume_db[resume_id] = resume_obj
        return resume_obj
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"[API ERROR] /api/resumes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ats-analyze")
async def ats_analyze_api(payload: ATSAnalyzeRequest):
    try:
        resume = resume_db.get(payload.resume_id)
        if not resume:
            if resume_db:
                resume = list(resume_db.values())[-1]
            else:
                raise HTTPException(status_code=404, detail="Resume not found")

        return analyze_resume(
            resume["content"],
            payload.job_description or "",
            payload.domain_override
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"[API ERROR] /api/ats-analyze: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fetch-real-jobs")
async def fetch_real_jobs_api(payload: Dict):
    try:
        resume_id = payload.get("resume_id")
        resume = resume_db.get(resume_id)
        if not resume:
            if resume_db:
                resume = list(resume_db.values())[-1]
            else:
                raise HTTPException(status_code=404, detail="Resume not found")

        # 1. Extract skills
        resume_text = resume["content"]
        parsed = parse_resume(resume_text)
        skills = parsed.skills[:8]
        domain = detect_domain(resume_text)
        search_profile = get_domain_search_profile(domain, resume_text)
        
        # 2. Fetch jobs
        real_jobs = get_real_time_jobs(skills, resume_text=resume_text)
        
        # 3. Match
        job_dicts = []
        for j in real_jobs:
            job_dicts.append({
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "salary": j.salary,
                "job_url": j.job_url,
                "description": j.description
            })
        
        matches = match_jobs(resume_text, job_dicts)
        matches = [
            match for match in matches
            if domain_job_score(match, search_profile) >= 5
        ][:10]
        
        # 4. Return in format expected by JobMatches.tsx
        return {
            "jobs": [
                {
                    "id": i,
                    "resume_id": resume_id,
                    "job_title": m.title,
                    "company": m.company,
                    "location": m.location,
                    "salary": m.salary,
                    "portal": "adzuna",
                    "job_url": m.job_url,
                    "description": m.description,
                    "source": "Direct",
                    "job_type": "On-site",
                    "date_posted": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "match_score": m.match_score,
                    "domain": domain,
                } for i, m in enumerate(matches)
            ],
            "count": len(matches),
            "live_job_count": len(matches),
            "search_link_count": 0,
            "detected_domain": domain,
            "search_role": search_profile["primary_role"],
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"[API ERROR] /api/fetch-real-jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/applications")
async def get_applications_api():
    return [
        { "id": 101, "job_title": "Senior Engineer", "company": "TechFlow", "portal": "adzuna", "status": "selected", "applied_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) }
    ]

@router.post("/auth/login")
async def login_api(payload: Dict):
    email = payload.get("email", "demo@example.com")
    return {
        "user": {
            "id": "demo-user-id",
            "email": email,
            "user_metadata": { "full_name": email.split("@")[0].capitalize() }
        }
    }

@router.post("/auth/signup")
async def signup_api(payload: Dict):
    email = payload.get("email", "demo@example.com")
    return {
        "user": {
            "id": "demo-user-id",
            "email": email,
            "user_metadata": { "full_name": payload.get("name", email.split("@")[0].capitalize()) }
        }
    }
