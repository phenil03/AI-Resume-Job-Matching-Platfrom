import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle,
  Loader2,
  RefreshCw,
  Target
} from 'lucide-react';

interface Resume {
  id: number;
  filename: string;
  content: string;
  ats_score: number | null;
}

interface ATSResult {
  score: number;
  suggestions: string[];
  keywords_found: string[];
  missing_keywords?: string[];
  domain?: string;
  seniority?: string;
  breakdown?: Record<string, number>;
  diagnostics?: {
    sections_found?: string[];
    sections_missing?: string[];
    target_titles?: string[];
    matched_titles?: string[];
    required_years?: number | null;
    estimated_years?: number | null;
    parse_warnings?: string[];
  };
}

interface Props {
  resume: Resume;
  onComplete: (score: number) => void;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

const formatDomainLabel = (domain?: string) =>
  (domain || 'general')
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getDomainQueryValue = (domain?: string) =>
  (domain || 'general').replace(/_/g, ' ');

export default function ATSAnalysis({ resume, onComplete }: Props) {
  const [analyzing, setAnalyzing] = useState(true);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    analyzeResume('');
  }, [resume.id]);

  const analyzeResume = async (overrideJobDescription?: string) => {
    setAnalyzing(true);
    setRequestError(null);

    try {
      const res = await fetch(`${API_BASE}/api/ats-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_id: resume.id,
          job_description: overrideJobDescription ?? jobDescription
        })
      });

      const data = await res.json();

      if (res.ok && data.score !== undefined) {
        setResult({
          score: data.score,
          suggestions: data.suggestions || [],
          keywords_found: data.keywords_found || [],
          missing_keywords: data.missing_keywords || [],
          domain: data.domain,
          seniority: data.seniority,
          breakdown: data.breakdown || {},
          diagnostics: data.diagnostics || {}
        });
      } else {
        setResult(null);
        setRequestError(data.error || 'ATS analysis failed.');
      }
    } catch (error) {
      console.error('ATS analysis error:', error);
      setResult(null);
      setRequestError('Could not analyze this resume right now.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const formatBreakdownLabel = (label: string) =>
    label
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const handleDetectedDomainClick = () => {
    if (!result?.domain) return;
    const domainQuery = getDomainQueryValue(result.domain);
    setJobDescription(domainQuery);
    analyzeResume(domainQuery);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ATS Score Analysis
          </h2>
          <p className="text-white/70">
            Weighted ATS scoring across keywords, sections, impact, titles, experience, and semantic relevance
            <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-mono border border-blue-500/30">
              Live-Session: {Math.floor(Date.now() / 1000).toString().slice(-4)}
            </span>
          </p>
        </div>

        <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Briefcase className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Target Job Description</h3>
          </div>
          <p className="text-sm text-white/60 mb-3">
            Paste a job description for the most accurate ATS score. Without it, the analyzer uses your resume&apos;s detected domain and role signals.
          </p>
          {result?.domain && (
            <button
              type="button"
              onClick={handleDetectedDomainClick}
              disabled={analyzing}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/70 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Target className="h-4 w-4" />
              Use detected domain: {formatDomainLabel(result.domain)}
            </button>
          )}
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the target job description here for exact ATS keyword, title, and experience scoring..."
            className="w-full min-h-[140px] rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={() => analyzeResume()}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Re-run ATS Analysis
            </button>
            <p className="text-xs text-white/45 self-center">
              Most companies auto-filter resumes below roughly 60 to 75.
            </p>
          </div>
        </div>

        {analyzing ? (
          <div className="text-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
            >
              <Target className="w-12 h-12" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Analyzing Resume...</h3>
            <p className="text-white/60">Checking parse quality, keywords, section coverage, impact, titles, experience, and semantic fit</p>
          </div>
        ) : result ? (
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 text-center">
                <div className={`w-40 h-40 mx-auto mb-4 bg-gradient-to-br ${getScoreColor(result.score)} rounded-full flex items-center justify-center relative`}>
                  <div className="absolute inset-2 bg-slate-950 rounded-full flex items-center justify-center">
                    <div>
                      <div className="text-5xl font-bold">{result.score}</div>
                      <div className="text-sm text-white/70">/ 100</div>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2">{getScoreLabel(result.score)}</h3>
                <p className="text-white/70">Your resume is {result.score}% optimized for ATS systems</p>
                {result.domain && (
                  <button
                    type="button"
                    onClick={handleDetectedDomainClick}
                    disabled={analyzing}
                    className="mt-2 text-sm text-blue-300/90 underline decoration-blue-400/40 underline-offset-4 transition hover:text-cyan-300 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                  >
                    Detected domain: {formatDomainLabel(result.domain)}
                  </button>
                )}
                {result.seniority && (
                  <p className="mt-1 text-sm text-cyan-300/90">
                    Seniority profile: {result.seniority}
                  </p>
                )}
              </div>
            </motion.div>

            {!!result.breakdown && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              >
                {Object.entries(result.breakdown).map(([key, value]) => (
                  <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-white/75">{formatBreakdownLabel(key)}</p>
                      <span className="text-lg font-bold text-white">{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${Math.min(100, value * 8)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-semibold">Keywords Found</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.keywords_found.map((keyword, i) => (
                  <motion.span
                    key={`${keyword}-${i}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-sm text-green-300"
                  >
                    {keyword}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold">Improvement Suggestions</h3>
              </div>
              <div className="space-y-3">
                {result.suggestions.map((suggestion, i) => (
                  <motion.div
                    key={`${suggestion}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-400">{i + 1}</span>
                    </div>
                    <p className="text-white/80 text-sm">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {result.diagnostics && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-xl font-semibold">ATS Diagnostics</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white mb-2">Detected Sections</p>
                    <p className="text-sm text-white/70">
                      {result.diagnostics.sections_found?.join(', ') || 'No clear sections detected'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white mb-2">Missing Sections</p>
                    <p className="text-sm text-white/70">
                      {result.diagnostics.sections_missing?.join(', ') || 'None'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white mb-2">Target Titles</p>
                    <p className="text-sm text-white/70">
                      {result.diagnostics.target_titles?.join(', ') || 'No target title extracted yet'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white mb-2">Experience Fit</p>
                    <p className="text-sm text-white/70">
                      Required: {result.diagnostics.required_years ?? 'Not specified'} years
                      <br />
                      Estimated from resume: {result.diagnostics.estimated_years ?? 'Not detected'} years
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => onComplete(result.score)}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Find Matching Jobs
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        ) : (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {requestError || 'No ATS result available.'}
          </div>
        )}
      </motion.div>
    </div>
  );
}
