import { useEffect, useEffectEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, DollarSign, IndianRupee, TrendingUp, Loader2, ArrowRight, Globe, ExternalLink } from 'lucide-react';

interface JobMatch {
  id: number;
  job_title: string;
  company: string;
  location: string;
  salary: string;
  match_score: number;
  portal: string;
  job_url: string;
  job_type: string;
  description?: string;
  source?: string;
}

interface Props {
  resumeId: number;
  atsScore: number | null;
  onComplete: () => void;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function JobMatches({ resumeId, atsScore, onComplete }: Props) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [fetchStatus, setFetchStatus] = useState('');
  const canApplyByAts = (atsScore ?? 0) >= 50;
  const isSearchLink = (job: JobMatch) => job.portal.endsWith('_search');
  const liveMatchCount = matches.filter(job => !isSearchLink(job)).length;
  const searchLinkCount = matches.filter(isSearchLink).length;

  const fetchMatches = useEffectEvent(async () => {
    setLoading(true);
    try {
      setFetchStatus('Searching job portals...');
      console.log('Fetching real jobs from multiple sources...');

      const fetchRes = await fetch(`${API_BASE}/api/fetch-real-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resumeId })
      });

      if (!fetchRes.ok) {
        const errText = await fetchRes.text();
        console.error('Failed to fetch real jobs:', errText);
        throw new Error('Failed to fetch jobs');
      }

      const fetchData = await fetchRes.json();
      console.log('fetch-real-jobs response:', fetchData);
      const liveCount = fetchData.live_job_count ?? fetchData.jobs?.filter((job: JobMatch) => !job.portal.endsWith('_search')).length ?? 0;
      const searchCount = fetchData.search_link_count ?? fetchData.jobs?.filter((job: JobMatch) => job.portal.endsWith('_search')).length ?? 0;
      setFetchStatus(
        liveCount > 0
          ? `Found ${liveCount} live jobs${searchCount > 0 ? ` and ${searchCount} search links` : ''}!`
          : `No live jobs found yet. Showing ${searchCount} search links.`
      );

      if (Array.isArray(fetchData.jobs) && fetchData.jobs.length > 0) {
        setMatches(fetchData.jobs);
      }

      const res = await fetch(`${API_BASE}/api/job-matches?resume_id=${resumeId}`);
      if (res.ok) {
        const data = await res.json();
        console.log('job-matches from DB:', data.length, 'jobs');
        if (Array.isArray(data) && data.length > 0) {
          setMatches(data);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setFetchStatus('Error fetching jobs - check console for details');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchMatches();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const getPortalColor = (portal: string) => {
    switch (portal) {
      case 'adzuna':
      case 'adzuna_in':
      case 'adzuna_us':
      case 'adzuna_gb':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'remoteok':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'arbeitnow':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'remotive':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'naukri':
      case 'naukri_search':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'linkedin_search':
        return 'bg-sky-600/20 text-sky-300 border-sky-500/30';
      case 'indeed_search':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'company_website':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  const getPortalLabel = (portal: string) => {
    switch (portal) {
      case 'adzuna':
      case 'adzuna_in':
      case 'adzuna_us':
      case 'adzuna_gb':
        return portal === 'adzuna_in' ? 'Adzuna India' : 'Adzuna';
      case 'remoteok':
        return 'RemoteOK';
      case 'arbeitnow':
        return 'Arbeitnow';
      case 'remotive':
        return 'Remotive';
      case 'naukri':
        return 'Naukri.com';
      case 'naukri_search':
        return 'Naukri Search';
      case 'linkedin_search':
        return 'LinkedIn Search';
      case 'indeed_search':
        return 'Indeed Search';
      case 'company_website':
        return 'Company Website';
      default:
        return portal;
    }
  };

  const cleanJobDescription = (value?: string) => {
    if (!value) return '';

    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;

    return textarea.value
      .replace(/<[^>]+>/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
            Real Jobs in India & Global
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Region: India</span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Sources: Internet APIs</span>
          </div>
          <p className="text-white/70">Strictly ranked India-first jobs plus direct LinkedIn, Indeed, and Naukri search links</p>
          {fetchStatus && (
            <p className="text-sm text-green-400 mt-2">{fetchStatus}</p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-400" />
            <p className="text-white/70">Searching real job portals...</p>
            <p className="text-sm text-white/50 mt-2">Fetching from live APIs and preparing search links for LinkedIn, Indeed, and Naukri...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <p className="text-white/60">No jobs found. Try uploading a different resume.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
              <p className="text-green-300 text-sm text-center">
                {liveMatchCount > 0
                  ? `Found ${liveMatchCount} live portal results${searchLinkCount > 0 ? ` plus ${searchLinkCount} search links` : ''}`
                  : `Showing ${searchLinkCount} direct search links because no live portal results matched yet`}
              </p>
            </div>

            <div className="grid gap-4">
              {matches.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold">{job.job_title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPortalColor(job.portal)}`}>
                          {job.source || getPortalLabel(job.portal)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${
                          job.job_type === 'Remote'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        }`}>
                          {job.job_type || 'On-site'}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-white/70 mb-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          {job.company}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-2">
                          {(job.salary?.includes('₹') || job.location?.toLowerCase().includes('india')) ? (
                            <IndianRupee className="w-4 h-4" />
                          ) : (
                            <DollarSign className="w-4 h-4" />
                          )}
                          {job.salary || 'Competitive'}
                        </div>
                      </div>

                      {job.description && (
                        <p className="text-xs text-white/60 mb-3 line-clamp-2">{cleanJobDescription(job.description)}</p>
                      )}

                      <div className="flex items-center gap-4 mb-3">
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on {job.source || getPortalLabel(job.portal)}
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${job.match_score}%` }}
                            transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }}
                            className={`h-full ${
                              job.match_score >= 80 ? 'bg-green-500' :
                              job.match_score >= 60 ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}
                          />
                        </div>
                        <span className="text-sm font-semibold text-white/90 w-12 text-right">
                          {job.match_score}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                        job.match_score >= 80 ? 'bg-green-500/20 border-2 border-green-500' :
                        job.match_score >= 60 ? 'bg-yellow-500/20 border-2 border-yellow-500' :
                        'bg-blue-500/20 border-2 border-blue-500'
                      }`}>
                        <TrendingUp className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={canApplyByAts ? onComplete : undefined}
              disabled={!canApplyByAts}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              whileHover={canApplyByAts ? { scale: 1.02 } : {}}
              whileTap={canApplyByAts ? { scale: 0.98 } : {}}
            >
              {canApplyByAts ? 'Auto-Apply to Selected Jobs' : 'ATS Score 50+ Required to Apply'}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            {!canApplyByAts && (
              <p className="text-center text-sm text-amber-300/90">
                Your ATS score is {atsScore ?? 0}. Reach at least 50 in ATS Analysis to unlock job applications.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
