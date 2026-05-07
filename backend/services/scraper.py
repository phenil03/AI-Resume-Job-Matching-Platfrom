import json
import os
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import List
from urllib.parse import quote_plus
from xml.etree import ElementTree

import requests
from bs4 import BeautifulSoup

from models.schemas import AggregatedJob, JobMatch
from services.analysis import detect_domain, get_domain_search_profile


REQUEST_TIMEOUT = 12
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/xml, application/xml, */*",
    "Accept-Language": "en-US,en;q=0.9",
}


def normalize_description(value: str, limit: int = 300) -> str:
    if not value:
        return ""
    text = BeautifulSoup(value, "html.parser").get_text(" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def matches_role(text: str, role: str) -> bool:
    tokens = [token for token in re.split(r"\W+", (role or "").lower()) if len(token) > 2]
    if not tokens:
        return True
    haystack = (text or "").lower()
    matched = sum(1 for token in tokens if token in haystack)
    return matched >= max(1, min(2, len(tokens)))


def matches_location(text: str, location: str) -> bool:
    location_query = (location or "").strip().lower()
    if not location_query or location_query in {"india", "remote", "worldwide", "global"}:
        return True
    return location_query in (text or "").lower()


def domain_job_score(job: AggregatedJob | JobMatch, search_profile: dict) -> float:
    searchable = " ".join([
        getattr(job, "title", "") or "",
        getattr(job, "company", "") or "",
        getattr(job, "location", "") or "",
        getattr(job, "description", "") or "",
    ]).lower()

    score = 0.0
    for title in search_profile.get("titles", []):
        if title.lower() in searchable:
            score += 5
    for term in search_profile.get("detect_terms", []):
        if term.lower() in searchable:
            score += 2.5
    for skill in search_profile.get("skills", []):
        if skill.lower() in searchable:
            score += 1.5
    return score


def filter_jobs_for_domain(jobs: List[AggregatedJob], search_profile: dict) -> List[AggregatedJob]:
    if not jobs:
        return []

    scored_jobs = [(job, domain_job_score(job, search_profile)) for job in jobs]
    aligned_jobs = [job for job, score in scored_jobs if score >= 5]
    if aligned_jobs:
        return aligned_jobs

    return []


def normalize_job_type(value, location: str = "", title: str = "") -> str:
    if isinstance(value, list):
        lowered = " ".join(str(item) for item in value).lower()
    else:
        lowered = str(value or "").lower()
    combined = f"{lowered} {location or ''} {title or ''}".lower()
    if "remote" in combined:
        return "Remote"
    if "contract" in combined:
        return "Contract"
    if "part" in combined and "time" in combined:
        return "Part-time"
    if "intern" in combined:
        return "Internship"
    return "Full-time"


def parse_date(value) -> datetime:
    if value is None or value == "":
        return datetime.min.replace(tzinfo=timezone.utc)
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return datetime.min.replace(tzinfo=timezone.utc)
    raw = value.strip()
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        pass
    try:
        return parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        return datetime.min.replace(tzinfo=timezone.utc)


def normalize_date(value: str | None) -> str | None:
    parsed = parse_date(value)
    if parsed == datetime.min.replace(tzinfo=timezone.utc):
        return None
    return parsed.astimezone(timezone.utc).isoformat()


def dedupe_and_sort_jobs(jobs: List[AggregatedJob]) -> List[AggregatedJob]:
    deduped = {}
    for job in jobs:
        key = f"{job.title.strip().lower()}::{job.company.strip().lower()}"
        current = deduped.get(key)
        if current is None or parse_date(job.date_posted) > parse_date(current.date_posted):
            deduped[key] = job
    return sorted(
        deduped.values(),
        key=lambda job: parse_date(job.date_posted),
        reverse=True,
    )


def fetch_arbeitnow_jobs(role: str, location: str) -> List[AggregatedJob]:
    try:
        response = requests.get(
            "https://www.arbeitnow.com/api/job-board-api",
            params={"search": role},
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        jobs = []
        for item in payload.get("data", []):
            title = item.get("title", "").strip()
            company = item.get("company_name", "").strip()
            raw_location = item.get("location")
            if isinstance(raw_location, list):
                normalized_location = ", ".join(part for part in raw_location if part)
            else:
                normalized_location = str(raw_location or "Worldwide").strip()
            searchable = f"{title} {company} {normalized_location} {item.get('description', '')}".lower()
            if not matches_role(searchable, role):
                continue
            if not matches_location(searchable, location):
                continue
            jobs.append(
                AggregatedJob(
                    title=title,
                    company=company or "Unknown Company",
                    location=normalized_location or "Worldwide",
                    job_type=normalize_job_type(item.get("job_types"), normalized_location, title),
                    description=normalize_description(item.get("description", "")),
                    apply_url=item.get("url", "").strip(),
                    date_posted=normalize_date(item.get("created_at")),
                    source="Arbeitnow",
                )
            )
        return [job for job in jobs if job.title and job.company and job.apply_url]
    except Exception as exc:
        print(f"[ERROR] Arbeitnow fetch failed: {exc}")
        return []



def parse_indeed_title(raw_title: str) -> tuple[str, str, str]:
    cleaned = (raw_title or "").replace(" - Indeed.com", "").strip()
    parts = [part.strip() for part in cleaned.split(" - ") if part.strip()]
    if len(parts) >= 3:
        return parts[0], parts[1], " - ".join(parts[2:])
    if len(parts) == 2:
        return parts[0], parts[1], ""
    return cleaned, "Unknown Company", ""


def fetch_indeed_rss_jobs(role: str, location: str) -> List[AggregatedJob]:
    try:
        rss_url = f"https://in.indeed.com/rss?q={quote_plus(role)}&l={quote_plus(location)}"
        response = requests.get(rss_url, headers=DEFAULT_HEADERS, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        root = ElementTree.fromstring(response.text)
        jobs = []
        for item in root.findall("./channel/item"):
            raw_title = item.findtext("title", default="")
            title, company, title_location = parse_indeed_title(raw_title)
            description_html = item.findtext("description", default="")
            summary = normalize_description(description_html)
            location_text = title_location or location
            searchable = f"{title} {company} {location_text} {summary}".lower()
            if not matches_role(searchable, role):
                continue
            if not matches_location(searchable, location):
                continue
            jobs.append(
                AggregatedJob(
                    title=title.strip(),
                    company=company.strip() or "Unknown Company",
                    location=location_text.strip() or location,
                    job_type=normalize_job_type(summary, location_text, title),
                    description=summary,
                    apply_url=item.findtext("link", default="").strip(),
                    date_posted=normalize_date(item.findtext("pubDate")),
                    source="Indeed RSS",
                )
            )
        return [job for job in jobs if job.title and job.company and job.apply_url]
    except Exception as exc:
        print(f"[ERROR] Indeed RSS fetch failed: {exc}")
        return []


def aggregate_jobs(role: str, location: str = "India") -> List[AggregatedJob]:
    normalized_role = (role or "").strip() or "Software Engineer"
    normalized_location = (location or "").strip() or "India"
    jobs: List[AggregatedJob] = []
    jobs.extend(fetch_arbeitnow_jobs(normalized_role, normalized_location))
    jobs.extend(fetch_indeed_rss_jobs(normalized_role, normalized_location))
    return dedupe_and_sort_jobs(jobs)


def get_real_time_jobs(skills: List[str], location: str = "India", resume_text: str = "", job_description: str = "") -> List[JobMatch]:
    domain = detect_domain(resume_text, job_description)
    search_profile = get_domain_search_profile(domain, resume_text, job_description)
    role = search_profile["primary_role"]
    if search_profile["role_keywords"]:
        role = f"{role} {' '.join(search_profile['role_keywords'][:2])}".strip()

    aggregated_jobs = filter_jobs_for_domain(aggregate_jobs(role, location), search_profile)
    real_jobs = [
        JobMatch(
            title=job.title,
            company=job.company,
            location=job.location,
            salary="Competitive",
            match_score=0,
            job_url=job.apply_url,
            description=job.description,
        )
        for job in aggregated_jobs
    ]

    if real_jobs:
        return real_jobs

    try:
        db_path = os.path.join(os.path.dirname(__file__), "..", "data", "jobs_db.json")
        if os.path.exists(db_path):
            with open(db_path, "r", encoding="utf-8") as file:
                local_data = json.load(file)
            local_jobs = [
                JobMatch(
                    title=item["title"],
                    company=item["company"],
                    location=item["location"],
                    salary=item["salary"],
                    match_score=0,
                    job_url=item["job_url"],
                    description=item["description"],
                )
                for item in local_data
            ]
            filtered_local_jobs = [job for job in local_jobs if domain_job_score(job, search_profile) >= 5]
            return filtered_local_jobs[:10]
    except Exception as exc:
        print(f"[CRITICAL] Error reading local DB fallback: {exc}")

    return []


def scrape_naukri(job_title: str, location: str = "India") -> List[JobMatch]:
    return get_real_time_jobs([job_title], location)
