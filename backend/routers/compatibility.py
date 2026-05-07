from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import base64
from services.parser import parse_resume, extract_skills, parse_uploaded_file
from services.matcher import match_jobs
from services.analysis import analyze_resume, detect_domain, get_domain_search_profile
from services.scraper import get_real_time_jobs, domain_job_score

router = APIRouter(prefix="/api", tags=["Compatibility"])

# In-memory storage for the session
resume_store = {}

class ResumeUploadRequest(BaseModel):
    filename: str
    content: str
    file_type: str
    is_binary: bool

class ATSAnalyzeRequest(BaseModel):
    resume_id: int
    job_description: str = ""
    domain_override: Optional[str] = None

class FetchJobsRequest(BaseModel):
    resume_id: int

@router.post("/resumes")
async def upload_resume(request: ResumeUploadRequest):
    try:
        if request.is_binary:
            content_bytes = base64.b64decode(request.content)
            raw_text = parse_uploaded_file(content_bytes, request.filename, request.file_type)
        else:
            raw_text = request.content
        
        if not raw_text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract readable text from this file. Please upload a text-based PDF, DOCX, RTF, or TXT resume."
            )
        
        resume_id = int(datetime.now().timestamp() * 1000)
        resume_obj = {
            "id": resume_id,
            "filename": request.filename,
            "content": raw_text,
            "created_at": datetime.now().isoformat()
        }
        resume_store[resume_id] = resume_obj
        return resume_obj
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"[COMPAT ERROR] /resumes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ats-analyze")
async def compatibility_ats_analyze(request: ATSAnalyzeRequest):
    try:
        resume = resume_store.get(request.resume_id)
        if not resume:
            if resume_store:
                resume = list(resume_store.values())[-1]
            else:
                raise HTTPException(status_code=404, detail="Resume not found")

        return analyze_resume(
            resume["content"],
            request.job_description or "",
            request.domain_override
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"[COMPAT ERROR] /ats-analyze: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fetch-real-jobs")
async def compatibility_fetch_jobs(request: FetchJobsRequest):
    try:
        resume = resume_store.get(request.resume_id)
        if not resume:
            if resume_store:
                resume = list(resume_store.values())[-1]
            else:
                resume = {"content": "Software Engineer with React and Python experience."}
        
        resume_text = resume["content"]
        skills = extract_skills(resume_text)
        domain = detect_domain(resume_text)
        search_profile = get_domain_search_profile(domain, resume_text)
        real_jobs = get_real_time_jobs(skills, resume_text=resume_text)
        
        # Convert to JobMatch dicts and sort
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
        
        scored_matches = match_jobs(resume_text, job_dicts)
        scored_matches = [
            match for match in scored_matches
            if domain_job_score(match, search_profile) >= 5
        ][:10]
        
        # Map to frontend JobMatch interface
        frontend_jobs = []
        for i, match in enumerate(scored_matches):
            frontend_jobs.append({
                "id": i + 1,
                "job_title": match.title,
                "company": match.company,
                "location": match.location,
                "salary": match.salary,
                "match_score": match.match_score,
                "portal": "adzuna_in", # Mock portal
                "job_url": match.job_url,
                "job_type": "Remote",
                "description": match.description,
                "source": "Real-time API",
                "date_posted": datetime.now().isoformat(),
                "domain": domain,
            })
            
        return {
            "jobs": frontend_jobs,
            "live_job_count": len(frontend_jobs),
            "search_link_count": 0,
            "detected_domain": domain,
            "search_role": search_profile["primary_role"],
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"[COMPAT ERROR] /fetch-real-jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
