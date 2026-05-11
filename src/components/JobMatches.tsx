import { useEffect, useEffectEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, DollarSign, IndianRupee, Loader2, ArrowRight, Globe, ExternalLink, Clock } from 'lucide-react';

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
  date_posted?: string;
  domain?: string;
}

interface FetchRealJobsResponse {
  jobs?: JobMatch[];
  saved_matches?: JobMatch[];
  detected_domain?: string;
  search_role?: string;
  live_job_count?: number;
  search_link_count?: number;
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
  const [detectedDomain, setDetectedDomain] = useState('');
  const [searchRole, setSearchRole] = useState('');
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

      const fetchData = await fetchRes.json() as FetchRealJobsResponse;
      console.log('fetch-real-jobs response:', fetchData);
      setDetectedDomain(fetchData.detected_domain || '');
      setSearchRole(fetchData.search_role || '');
      const normalizedJobs = Array.isArray(fetchData.saved_matches)
        ? fetchData.saved_matches
        : Array.isArray(fetchData.jobs)
          ? fetchData.jobs
          : [];
      const liveCount = fetchData.live_job_count ?? normalizedJobs.filter((job: JobMatch) => !job.portal.endsWith('_search')).length ?? 0;
      const searchCount = fetchData.search_link_count ?? normalizedJobs.filter((job: JobMatch) => job.portal.endsWith('_search')).length ?? 0;
      setFetchStatus(
        liveCount > 0
          ? `Found ${liveCount} live jobs${searchCount > 0 ? ` and ${searchCount} search links` : ''}!`
          : 'No domain-aligned live jobs found right now.'
      );

      const hasLiveFetchJobs = normalizedJobs.length > 0;

      if (hasLiveFetchJobs) {
        setMatches(normalizedJobs);
      } else {
        setMatches([]);
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
        return 'bg-[#F8F9FB] text-[#1D9E75] border-[#1D9E75]/30';
      case 'remoteok':
        return 'bg-[#1D9E75]/20 text-[#085041] border-[#1D9E75]/30';
      case 'arbeitnow':
        return 'bg-purple-50 text-purple-700 border-purple-300';
      case 'remotive':
        return 'bg-[#E6F1FB] text-[#1D9E75] border-cyan-500/30';
      case 'naukri':
      case 'naukri_search':
        return 'bg-[#1D9E75]/20 text-[#1D9E75] border-blue-600/30';
      case 'linkedin_search':
        return 'bg-[#E6F1FB] text-[#0C447C] border-[#0C447C]/30';
      case 'indeed_search':
        return 'bg-indigo-50 text-indigo-700 border-indigo-300';
      case 'company_website':
        return 'bg-orange-50 text-orange-700 border-orange-300';
      default:
        return 'bg-[#FFFFFF] text-[#444444] border-[#E0E0E0]';
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

  const parsePostedDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getFreshnessLabel = (value?: string) => {
    const parsed = parsePostedDate(value);
    if (!parsed) return null;

    const diffMs = Date.now() - parsed.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (diffDays <= 1) {
      return { label: 'Fresh', detail: 'Posted today', tone: 'bg-[#E8F7F1] text-[#0E7F5B] border-[#B7E0D1]' };
    }
    if (diffDays <= 7) {
      return { label: 'Recent', detail: `Posted ${diffDays} day${diffDays === 1 ? '' : 's'} ago`, tone: 'bg-[#EEF5FF] text-[#3366CC] border-[#C8D8FF]' };
    }
    if (diffDays <= 30) {
      return { label: 'Older', detail: `Posted ${diffDays} days ago`, tone: 'bg-[#FFF7E8] text-[#A46A00] border-[#F1D17A]' };
    }

    return { label: 'Old', detail: `Posted ${diffDays} days ago`, tone: 'bg-[#FFF1F1] text-[#B55A5A] border-[#EDC9C9]' };
  };

  const formatPostedDate = (value?: string) => {
    const parsed = parsePostedDate(value);
    if (!parsed) return null;
    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
        className="bg-[#FFFFFF] backdrop-blur-sm border border-[#E8E8E8] rounded-[12px] p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-[#111111] ">
            Real Jobs in India & Global
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="px-3 py-1 bg-[#1D9E75]/20 text-[#085041] border border-[#1D9E75]/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Region: India</span>
            <span className="px-3 py-1 bg-[#F8F9FB] text-[#1D9E75] border border-[#1D9E75]/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Sources: Internet APIs</span>
            {detectedDomain && (
              <span className="px-3 py-1 bg-[#EEF5FF] text-[#0C447C] border border-[#C8D8FF] rounded-full text-[10px] font-bold uppercase tracking-wider">
                Domain: {detectedDomain.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-[#444444]">
            {searchRole
              ? `Searching domain-aligned roles for: ${searchRole}`
              : 'Strictly ranked domain-aligned jobs from live sources'}
          </p>
          {fetchStatus && (
            <p className="text-sm text-[#085041] mt-2">{fetchStatus}</p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-[#1D9E75]" />
            <p className="text-[#444444]">Searching real job portals...</p>
            <p className="text-sm text-[#888888] mt-2">Fetching from live APIs and preparing search links for LinkedIn, Indeed, and Naukri...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-16 h-16 mx-auto mb-4 text-[#AAAAAA]" />
            <p className="text-[#888888]">No jobs found. Try uploading a different resume.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-[12px] p-4 mb-6">
              <p className="text-[#085041] text-sm text-center">
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
                  className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[12px] p-6 hover:bg-[#FFFFFF] transition-all group"
                >
                  {(() => {
                    const searchLink = isSearchLink(job);
                    const freshness = getFreshnessLabel(job.date_posted);
                    const exactDate = formatPostedDate(job.date_posted);

                    return (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold">{job.job_title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPortalColor(job.portal)}`}>
                          {job.source || getPortalLabel(job.portal)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border ${
                          searchLink
                            ? 'bg-[#F4F6F7] text-[#5F6C68] border-[#D8DEDC]'
                            : 'bg-[#E8F7F1] text-[#0E7F5B] border-[#B7E0D1]'
                        }`}>
                          {searchLink ? 'Search Link' : 'Live Job'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${
                          job.job_type === 'Remote'
                            ? 'bg-[#E1F5EE] text-[#085041] border-[#1D9E75]/30'
                            : 'bg-[#E6F1FB] text-[#0C447C] border-[#0C447C]/30'
                        }`}>
                          {job.job_type || 'On-site'}
                        </span>
                        {freshness && (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border ${freshness.tone}`}>
                            {freshness.label}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-sm text-[#444444] mb-3">
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
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {searchLink
                            ? 'Search page only'
                            : freshness?.detail || 'Posted date unavailable'}
                        </div>
                      </div>

                      {(exactDate || searchLink) && (
                        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
                          {exactDate && (
                            <span className="rounded-full bg-[#F7FAF9] px-3 py-1 text-[#5B6B65] border border-[#E1E8E5]">
                              Exact date: {exactDate}
                            </span>
                          )}
                          {searchLink && (
                            <span className="rounded-full bg-[#FFF8E8] px-3 py-1 text-[#8A6A14] border border-[#F1D17A]">
                              This is not a single job posting, so there is no exact posted date here.
                            </span>
                          )}
                        </div>
                      )}

                      {job.description && (
                        <p className="text-xs text-[#888888] mb-3 line-clamp-2">{cleanJobDescription(job.description)}</p>
                      )}

                      <div className="flex items-center gap-4 mb-3">
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#1D9E75] hover:text-[#1D9E75] transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on {job.source || getPortalLabel(job.portal)}
                        </a>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-[#F0F0F0] rounded-full h-2.5 overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${job.match_score}%` }}
                            transition={{ delay: i * 0.1 + 0.3, duration: 1, ease: "circOut" }}
                            className={`h-full relative ${
                              job.match_score >= 80 ? 'bg-gradient-to-r from-[#1D9E75] to-[#10B981]' :
                              job.match_score >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                              'bg-gradient-to-r from-[#1D9E75]/60 to-[#1D9E75]'
                            }`}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                          </motion.div>
                        </div>
                      </div>

                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <div className={`w-20 h-20 rounded-[20px] flex flex-col items-center justify-center transition-all duration-500 ${
                        job.match_score >= 80 ? 'bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/30 scale-110' :
                        job.match_score >= 60 ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-200' :
                        'bg-[#F8F9FB] text-[#888888] border border-[#E8E8E8]'
                      }`}>
                        <span className="text-2xl font-black">{job.match_score}%</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest">Match</span>
                      </div>
                      
                      <motion.div 
                        whileHover={{ x: 5 }}
                        className="p-2 bg-[#F8F9FB] rounded-full text-[#1D9E75] border border-[#E8E8E8] group-hover:bg-[#1D9E75] group-hover:text-white transition-colors"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </motion.div>
                    </div>

                  </div>
                    );
                  })()}
                </motion.div>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={canApplyByAts ? onComplete : undefined}
              disabled={!canApplyByAts}
              className="w-full py-4 bg-[#1D9E75] rounded-[12px] font-semibold text-lg flex items-center justify-center gap-2 hover:bg-[#0F6E56] transition-all disabled:cursor-not-allowed disabled:opacity-50"
              whileHover={canApplyByAts ? { scale: 1.02 } : {}}
              whileTap={canApplyByAts ? { scale: 0.98 } : {}}
            >
              {canApplyByAts ? 'Auto-Apply to Selected Jobs' : 'ATS Score 50+ Required to Apply'}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            {!canApplyByAts && (
              <p className="text-center text-sm text-[#633806]">
                Your ATS score is {atsScore ?? 0}. Reach at least 50 in ATS Analysis to unlock job applications.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
