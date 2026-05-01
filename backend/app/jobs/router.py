from fastapi import APIRouter, Query
from typing import List, Optional
from .fetcher import get_all_jobs
from pydantic import BaseModel

router = APIRouter(prefix="/api/jobs", tags=["Job Fetcher"])

class JobResponse(BaseModel):
    title: str
    company: str
    location: str
    job_type: str
    description: str
    apply_url: str
    date_posted: Optional[str]
    source: str

@router.get("/search", response_model=List[JobResponse])
async def search_jobs(
    role: str = Query(..., description="Job role to search for"),
    location: str = Query(..., description="Location to search in")
):
    """
    Search for jobs across multiple free sources (Arbeitnow, Adzuna, Indeed RSS).
    """
    jobs = await get_all_jobs(role, location)
    return jobs
