import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle, XCircle, Loader2, Globe, AlertCircle, ArrowRight } from 'lucide-react';

interface JobMatch {
  id: number;
  job_title: string;
  company: string;
  portal: string;
  match_score: number;
}

interface SyncJobsResponse {
  jobs?: JobMatch[];
  saved_matches?: JobMatch[];
}

interface ApplyResult {
  job_match_id: number;
  application_id?: number;
  success: boolean;
  message: string;
}

interface Props {
  resumeId: number;
  atsScore: number | null;
  onComplete: () => void;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function AutoApply({ resumeId, atsScore, onComplete }: Props) {
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [results, setResults] = useState<ApplyResult[]>([]);
  const [applyError, setApplyError] = useState<string>('');
  const canApplyByAts = (atsScore ?? 0) >= 50;

  useEffect(() => {
    if (canApplyByAts) {
      void fetchJobs();
    } else {
      setJobs([]);
      setSelectedJobs([]);
    }
  }, [canApplyByAts, resumeId]);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    setApplyError('');
    try {
      let res = await fetch(`${API_BASE}/api/job-matches?resume_id=${resumeId}`);
      let data: JobMatch[] | null = null;

      if (res.ok) {
        const payload = await res.json();
        data = Array.isArray(payload) ? payload : [];
      }

      if (!Array.isArray(data) || data.length === 0) {
        const syncRes = await fetch(`${API_BASE}/api/fetch-real-jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume_id: resumeId })
        });

        if (!syncRes.ok) {
          const errorPayload = await syncRes.json().catch(() => ({}));
          throw new Error(errorPayload.error || 'Unable to load or sync job matches right now.');
        }

        const syncData = (await syncRes.json()) as SyncJobsResponse;
        const syncedJobs = Array.isArray(syncData.saved_matches)
          ? syncData.saved_matches
          : Array.isArray(syncData.jobs)
            ? syncData.jobs
            : [];

        if (syncedJobs.length > 0) {
          data = syncedJobs;
        } else {
          res = await fetch(`${API_BASE}/api/job-matches?resume_id=${resumeId}`);
          if (!res.ok) {
            throw new Error('Fresh jobs were fetched, but the saved job list could not be loaded.');
          }
          const fallbackPayload = await res.json();
          data = Array.isArray(fallbackPayload) ? fallbackPayload : [];
        }
      }

      const normalizedJobs = Array.isArray(data) ? data : [];
      setJobs(normalizedJobs);
      setSelectedJobs(normalizedJobs.map((j: JobMatch) => j.id));
    } catch (err) {
      console.error('Fetch error:', err);
      setJobs([]);
      setSelectedJobs([]);
      setApplyError(err instanceof Error ? err.message : 'Unable to load jobs for auto-apply right now.');
    } finally {
      setLoadingJobs(false);
    }
  };

  const submitAutoApply = async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_match_ids: selectedJobs,
        resume_id: resumeId
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed for ${endpoint}`);
    }

    return res.json();
  };

  const toggleJob = (id: number) => {
    setSelectedJobs(prev => 
      prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]
    );
  };

  const handleAutoApply = async () => {
    if (!canApplyByAts) {
      setApplyError(`Your ATS score is ${atsScore ?? 0}. You need at least 50 to apply to job portals.`);
      return;
    }

    if (selectedJobs.length === 0 || applying) return;
    
    setApplying(true);
    setResults([]);
    setApplyError('');

    try {
      console.log(`Starting auto-apply for ${selectedJobs.length} job(s)...`);

      let data;
      try {
        data = await submitAutoApply('/api/auto-apply-real');
      } catch (realErr) {
        console.warn('Real auto-apply endpoint failed, falling back to standard auto-apply:', realErr);
        data = await submitAutoApply('/api/auto-apply');
      }

      setResults(data.results || []);
    } catch (err) {
      console.error('Apply error:', err);
      setApplyError(err instanceof Error ? err.message : 'Unable to apply to the selected jobs right now.');
    } finally {
      setApplying(false);
    }
  };

  const getPortalIcon = (portal: string) => {
    return <Globe className="w-4 h-4" />;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#FFFFFF] backdrop-blur-sm border border-[#E8E8E8] rounded-[12px] p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-[#111111] ">
            Auto-Apply to Jobs
          </h2>
          <p className="text-[#444444]">Select jobs to automatically apply with your resume</p>
        </div>

        {!canApplyByAts ? (
          <div className="rounded-[12px] border border-amber-500/30 bg-amber-500/10 p-5 text-center">
            <p className="text-lg font-semibold text-[#633806]">ATS score 50+ is required to apply</p>
            <p className="mt-2 text-sm text-[#633806]">
              Your current ATS score is {atsScore ?? 0}. Improve the resume in ATS Analysis, then come back to unlock job portal applications.
            </p>
          </div>
        ) : loadingJobs ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-[#1D9E75]" />
              <h3 className="text-xl font-semibold mb-2">Preparing job applications...</h3>
              <p className="text-[#888888]">Loading saved matches and syncing fresh jobs if needed.</p>
            </div>
          </div>
        ) : !applying && results.length === 0 ? (
          <div className="space-y-6">
            {applyError && (
              <div className="bg-[#FCEBEB] border border-[#791F1F]/20 rounded-[12px] p-4 text-sm text-[#791F1F]">
                {applyError}
              </div>
            )}

            <div className="bg-[#E6F1FB] border border-[#1D9E75]/30 rounded-[12px] p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#1D9E75]">
                <p className="font-semibold mb-1">Auto-Apply Features:</p>
                <ul className="list-disc list-inside space-y-1 text-[#888888]">
                  <li>Works on Naukri.com, Internshala, and custom company websites</li>
                  <li>Automatically fills application forms with your resume data</li>
                  <li>Handles multiple portals simultaneously</li>
                  <li>LinkedIn applications may require manual verification</li>
                  <li>Search portal jobs are also included when your ATS score is 50 or higher</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              {jobs.length === 0 && (
                <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[12px] p-5 text-center text-[#888888]">
                  No eligible jobs found yet. Go back to Job Matches and fetch jobs first.
                </div>
              )}

              {jobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleJob(job.id)}
                  className={`p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
                    selectedJobs.includes(job.id)
                      ? 'bg-[#F8F9FB] border-[#1D9E75]'
                      : 'bg-[#FFFFFF] border-[#E8E8E8] hover:border-[#E0E0E0]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center ${
                      selectedJobs.includes(job.id)
                        ? 'bg-[#1D9E75] border-[#1D9E75]'
                        : 'border-[#E0E0E0]'
                    }`}>
                      {selectedJobs.includes(job.id) && <CheckCircle className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{job.job_title}</h3>
                        <span className="text-xs text-[#888888]">at {job.company}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#888888]">
                        <div className="flex items-center gap-1">
                          {getPortalIcon(job.portal)}
                          <span>{job.portal}</span>
                        </div>
                        <span>•</span>
                        <span className="text-[#085041]">{job.match_score}% match</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={handleAutoApply}
              disabled={selectedJobs.length === 0}
              className="w-full py-4 bg-[#1D9E75] rounded-[12px] font-semibold text-lg flex items-center justify-center gap-2 hover:bg-[#0F6E56] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={selectedJobs.length > 0 ? { scale: 1.02 } : {}}
              whileTap={selectedJobs.length > 0 ? { scale: 0.98 } : {}}
            >
              <Zap className="w-5 h-5" />
              Apply to {selectedJobs.length} Job{selectedJobs.length !== 1 ? 's' : ''}
            </motion.button>
          </div>
        ) : applying ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 mx-auto mb-4 bg-[#1D9E75] rounded-full flex items-center justify-center"
              >
                <Zap className="w-10 h-10" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Applying to Jobs...</h3>
              <p className="text-[#888888]">This may take a few moments</p>
            </div>

            <div className="space-y-2">
              {jobs.filter(j => selectedJobs.includes(j.id)).map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[8px] p-3 flex items-center gap-3"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-[#1D9E75]" />
                  <span className="text-sm">{job.job_title} at {job.company}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Application Results</h3>
              <p className="text-[#444444]">
                {results.filter(r => r.success).length} of {results.length} applications successful
              </p>
            </div>

            <div className="space-y-3">
              {results.map((result, i) => {
                const job = jobs.find(j => j.id === result.job_match_id);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-4 rounded-[12px] border ${
                      result.success
                        ? 'bg-[#E1F5EE] border-[#1D9E75]/30'
                        : 'bg-[#FCEBEB] border-[#791F1F]/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.success ? (
                        <CheckCircle className="w-6 h-6 text-[#085041] flex-shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-[#791F1F] flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">
                          {job?.job_title} at {job?.company}
                        </h4>
                        <p className={`text-sm ${
                          result.success ? 'text-[#085041]' : 'text-[#791F1F]'
                        }`}>
                          {result.message}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.button
              onClick={onComplete}
              className="w-full py-4 bg-[#1D9E75] rounded-[12px] font-semibold text-lg flex items-center justify-center gap-2 hover:bg-[#0F6E56] transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Application Dashboard
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
