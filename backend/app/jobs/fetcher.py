import httpx
import feedparser
import os
import asyncio
from datetime import datetime
from typing import List, Dict, Any
import re
from bs4 import BeautifulSoup
from urllib.parse import quote_plus

# Common headers to avoid bot detection
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/xml, application/xml, */*",
}



async def fetch_arbeitnow(role: str, location: str) -> List[Dict[str, Any]]:
    """Fetch jobs from Arbeitnow API"""
    url = "https://www.arbeitnow.com/api/job-board-api"
    params = {"search": role}
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            jobs = []
            for item in data.get("data", []):
                # Filter by location: Allow requested location OR Remote
                job_location = str(item.get("location", "Remote"))
                is_remote = item.get("remote", False)
                location_match = not location or location.lower() in job_location.lower()
                
                if not (location_match or is_remote):
                    continue
                    
                jobs.append({
                    "title": item.get("title", "Unknown Title"),
                    "company": item.get("company_name", "Unknown Company"),
                    "location": job_location,
                    "job_type": "Full-time" if not item.get("job_types") else item.get("job_types")[0],
                    "description": clean_text(item.get("description", ""))[:300],
                    "apply_url": item.get("url"),
                    "date_posted": str(item.get("created_at", "")),
                    "source": "Arbeitnow"
                })
            return jobs
    except Exception as e:
        print(f"Arbeitnow error: {e}")
        return []

async def fetch_indeed_india_rss(role: str, location: str) -> List[Dict[str, Any]]:
    """Fetch jobs from Indeed India RSS"""
    # Indeed RSS requires encoding in the URL
    url = f"https://in.indeed.com/rss?q={quote_plus(role)}&l={quote_plus(location)}"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
            response = await client.get(url)
            response.raise_for_status()
            # feedparser can parse the XML string directly
            feed = feedparser.parse(response.text)
            
            jobs = []
            for entry in feed.entries:
                # Indeed RSS title format: "Job Title - Company - Location"
                title_text = getattr(entry, 'title', 'Unknown Title')
                title_parts = title_text.split(" - ")
                
                title = title_parts[0] if len(title_parts) > 0 else title_text
                company = title_parts[1] if len(title_parts) > 1 else "Unknown Company"
                job_location = title_parts[2] if len(title_parts) > 2 else location
                
                summary = getattr(entry, 'summary', '')
                
                jobs.append({
                    "title": title.strip(),
                    "company": company.strip(),
                    "location": job_location.strip(),
                    "job_type": "Full-time",
                    "description": clean_text(summary)[:300],
                    "apply_url": getattr(entry, 'link', ''),
                    "date_posted": getattr(entry, 'published', datetime.now().isoformat()),
                    "source": "Indeed India RSS"
                })
            return jobs
    except Exception as e:
        print(f"Indeed RSS error: {e}")
        return []

def clean_text(text: str) -> str:
    """Helper to remove HTML and extra whitespace"""
    if not text:
        return ""
    # Remove HTML tags
    soup = BeautifulSoup(text, "html.parser")
    cleaned = soup.get_text(separator=" ")
    # Remove excessive whitespace
    return re.sub(r'\s+', ' ', cleaned).strip()

async def get_all_jobs(role: str, location: str) -> List[Dict[str, Any]]:
    """Fetch from all sources, merge, deduplicate, and sort"""
    tasks = [
        fetch_arbeitnow(role, location),

        fetch_indeed_india_rss(role, location)
    ]
    
    # Wait for all tasks to complete. Exceptions are caught inside fetchers.
    results = await asyncio.gather(*tasks)
    
    all_jobs = []
    for source_jobs in results:
        all_jobs.extend(source_jobs)
        
    # Deduplicate by title + company (case-insensitive)
    unique_jobs = {}
    for job in all_jobs:
        if not job.get("title") or not job.get("company"):
            continue
        key = f"{job['title']}-{job['company']}".lower().strip()
        if key not in unique_jobs:
            unique_jobs[key] = job
            
    # Sort by date_posted descending
    # Note: date formats vary, but string sort works for ISO and common RSS formats usually
    sorted_jobs = sorted(
        unique_jobs.values(),
        key=lambda x: str(x.get('date_posted', '')),
        reverse=True
    )
    
    return sorted_jobs
