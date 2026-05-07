from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import resume, jobs, apply, compatibility, api
from app.jobs.router import router as job_fetcher_router
import subprocess, sys, os
from dotenv import load_dotenv

# Load .env from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Ensure spaCy model is downloaded
subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], check=False)

app = FastAPI(
    title="JobApplyAI - AI Resume Matching Platform",
    description="Real NLP-powered resume matcher with ATS scoring and auto-apply",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for All services
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "https://ai-resume-job-matching-platform.vercel.app", # Replace with your actual Vercel URL
        "*" # Temporary fallback for initial deployment testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root redirect to documentation
@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

# Register Routers
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(apply.router)
app.include_router(compatibility.router)
app.include_router(job_fetcher_router)
app.include_router(api.router)

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "version": "2.0.0",
        "engine": "JobApplyAI-FastAPI-Pro",
        "nlp": "spaCy (en_core_web_sm)"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
