from pydantic import BaseModel
from typing import List, Optional

class ResumeData(BaseModel):
    name: str
    email: str
    phone: str
    skills: List[str]
    education: List[str]
    experience: List[str]
    raw_text: str

class ATSResult(BaseModel):
    score: int
    grade: str
    matched_keywords: List[str]
    missing_keywords: List[str]

class JobMatch(BaseModel):
    title: str
    company: str
    location: str
    salary: str
    match_score: int
    job_url: str
    description: str

class AggregatedJob(BaseModel):
    title: str
    company: str
    location: str
    job_type: str
    description: str
    apply_url: str
    date_posted: Optional[str] = None
    source: str

class ApplicationResult(BaseModel):
    job_title: str
    company: str
    status: str
    timestamp: str
    message: str
