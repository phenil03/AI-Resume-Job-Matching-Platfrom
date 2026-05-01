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
  const [results, setResults] = useState<ApplyResult[]>([]);
  const [applyError, setApplyError] = useState<string>('');
  const canApplyByAts = (atsScore ?? 0) >= 50;

  useEffect(() => {
    if (canApplyByAts) {
      fetchJobs();
    } else {
      setJobs([]);
      setSelectedJobs([]);
    }
  }, [canApplyByAts, resumeId]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/job-matches?resume_id=${resumeId}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
        setSelectedJobs(Array.isArray(data) ? data.map((j: JobMatch) => j.id) : []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
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
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Auto-Apply to Jobs
          </h2>
          <p className="text-white/70">Select jobs to automatically apply with your resume</p>
        </div>

        {!canApplyByAts ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
            <p className="text-lg font-semibold text-amber-200">ATS score 50+ is required to apply</p>
            <p className="mt-2 text-sm text-amber-100/80">
              Your current ATS score is {atsScore ?? 0}. Improve the resume in ATS Analysis, then come back to unlock job portal applications.
            </p>
          </div>
        ) : !applying && results.length === 0 ? (
          <div className="space-y-6">
            {applyError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
                {applyError}
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-semibold mb-1">Auto-Apply Features:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300/80">
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
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center text-white/60">
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
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedJobs.includes(job.id)
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                      selectedJobs.includes(job.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-white/30'
                    }`}>
                      {selectedJobs.includes(job.id) && <CheckCircle className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{job.job_title}</h3>
                        <span className="text-xs text-white/60">at {job.company}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/60">
                        <div className="flex items-center gap-1">
                          {getPortalIcon(job.portal)}
                          <span>{job.portal}</span>
                        </div>
                        <span>•</span>
                        <span className="text-green-400">{job.match_score}% match</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={handleAutoApply}
              disabled={selectedJobs.length === 0}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
              >
                <Zap className="w-10 h-10" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Applying to Jobs...</h3>
              <p className="text-white/60">This may take a few moments</p>
            </div>

            <div className="space-y-2">
              {jobs.filter(j => selectedJobs.includes(j.id)).map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <span className="text-sm">{job.job_title} at {job.company}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Application Results</h3>
              <p className="text-white/70">
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
                    className={`p-4 rounded-xl border ${
                      result.success
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.success ? (
                        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">
                          {job?.job_title} at {job?.company}
                        </h4>
                        <p className={`text-sm ${
                          result.success ? 'text-green-300' : 'text-red-300'
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
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all"
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
