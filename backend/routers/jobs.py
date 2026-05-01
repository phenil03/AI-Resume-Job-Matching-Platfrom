# backend/routers/jobs.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.matcher import match_jobs
from services.scraper import aggregate_jobs, get_real_time_jobs
from models.schemas import AggregatedJob, JobMatch
from services.parser import extract_skills
import json
import os
from typing import List

router = APIRouter(prefix="/jobs", tags=["Jobs"])

class MatchRequest(BaseModel):
    resume_text: str

class AggregateJobsRequest(BaseModel):
    role: str
    location: str = "India"

@router.post("/aggregate", response_model=List[AggregatedJob])
async def aggregate_jobs_endpoint(request: AggregateJobsRequest):
    try:
        return aggregate_jobs(request.role, request.location)
    except Exception as e:
        print(f"[API ERROR] /jobs/aggregate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/aggregate", response_model=List[AggregatedJob])
async def aggregate_jobs_query(role: str = Query(...), location: str = Query("India")):
    try:
        return aggregate_jobs(role, location)
    except Exception as e:
        print(f"[API ERROR] GET /jobs/aggregate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/match", response_model=List[JobMatch])
async def match_jobs_endpoint(request: MatchRequest):
    try:
        # 1. Extract skills to search for real jobs
        skills = extract_skills(request.resume_text)
        
        # 2. Fetch truly real-time jobs from APIs (RemoteOK, etc.)
        real_jobs = get_real_time_jobs(skills)
        
        # 3. Convert objects to dicts for the matcher
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
        
        # 4. Match and Rank
        return match_jobs(request.resume_text, job_dicts)
    except Exception as e:
        print(f"[API ERROR] /jobs/match: {e}")
        # Fallback to local verified DB on scraper failure
        try:
            db_path = os.path.join(os.path.dirname(__file__), "..", "data", "jobs_db.json")
            if os.path.exists(db_path):
                with open(db_path, "r") as f:
                    jobs = json.load(f)
                return match_jobs(request.resume_text, jobs)
            return []
        except:
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[JobMatch])
async def list_all_jobs():
    try:
        db_path = os.path.join(os.path.dirname(__file__), "..", "data", "jobs_db.json")
        if not os.path.exists(db_path):
             return []
        with open(db_path, "r") as f:
            jobs = json.load(f)
        return [
            JobMatch(
                title=j["title"],
                company=j["company"],
                location=j["location"],
                salary=j["salary"],
                match_score=0,
                job_url=j["job_url"],
                description=j["description"]
            ) for j in jobs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
