import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Briefcase,
  RefreshCw,
  Loader2,
  ArrowRight,
  Sparkles,
  Shield,
  Layers,
  Cpu
} from 'lucide-react';

interface Props {
  resume: {
    id: number;
    filename: string;
    content: string;
  };
  onComplete: (score: number) => void;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

const DOMAIN_OPTIONS = [
  { value: 'software_engineering', label: 'Software Engineering', icon: Cpu, color: 'text-blue-500' },
  { value: 'data_science', label: 'Data Science & AI', icon: Sparkles, color: 'text-purple-500' },
  { value: 'cybersecurity', label: 'Cybersecurity', icon: Shield, color: 'text-rose-500' },
  { value: 'frontend', label: 'Frontend Development', icon: Layers, color: 'text-emerald-500' },
  { value: 'backend', label: 'Backend Development', icon: Cpu, color: 'text-indigo-500' },
  { value: 'fullstack', label: 'Full Stack Development', icon: Layers, color: 'text-cyan-500' },
  { value: 'devops', label: 'DevOps & Cloud', icon: Shield, color: 'text-orange-500' },
  { value: 'product_management', label: 'Product Management', icon: Target, color: 'text-amber-500' },
  { value: 'digital_marketing', label: 'Digital Marketing', icon: Target, color: 'text-pink-500' },
  { value: 'ui_ux_design', label: 'UI/UX Design', icon: Target, color: 'text-violet-500' }
];

export default function ATSAnalysis({ resume, onComplete }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    domain: string;
    suggestions: string[];
    keywords_found: string[];
    missing_keywords?: string[];
    seniority?: string;
    breakdown?: {
      keyword_match: number;
      formatting_parsability: number;
      work_experience_relevance: number;
      skills_match: number;
      education_certifications: number;
      title_alignment: number;
    };
  } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);

  useEffect(() => {
    analyzeResume();
  }, [resume.id]);

  const handleDomainChange = (newDomain: string) => {
    setPendingDomain(newDomain);
    setShowConfirmModal(true);
  };

  const confirmDomainChange = () => {
    if (pendingDomain) {
      setSelectedDomain(pendingDomain);
      analyzeResume(pendingDomain);
    }
    setShowConfirmModal(false);
  };

  const analyzeResume = async (forceDomain?: string) => {
    setAnalyzing(true);
    setRequestError(null);
    try {
      const response = await fetch(`${API_BASE}/api/ats-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_id: resume.id,
          job_description: '',
          domain_override: forceDomain || selectedDomain
        })
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      setResult(data);
      if (data.domain && !selectedDomain) {
        setSelectedDomain(data.domain);
      }
    } catch (err) {
      setRequestError('Analysis error.');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDomainLabel = (val: string) => {
    return DOMAIN_OPTIONS.find(opt => opt.value === val)?.label || val;
  };

  const getDomainInfo = (val: string) => {
    return DOMAIN_OPTIONS.find(opt => opt.value === val) || { icon: Shield, color: 'text-gray-500' };
  };

  const metrics = result ? [
    { label: 'Keywords', value: result.breakdown?.keyword_match || 0, color: 'bg-[#4379FF]', iconBg: 'bg-[#EEF3FF]', iconColor: 'text-[#4379FF]' },
    { label: 'Formatting', value: result.breakdown?.formatting_parsability || 0, color: 'bg-[#17A968]', iconBg: 'bg-[#EDFBF4]', iconColor: 'text-[#17A968]' },
    { label: 'Skills match', value: result.breakdown?.skills_match || 0, color: 'bg-[#F59E0B]', iconBg: 'bg-[#FFF7E8]', iconColor: 'text-[#F59E0B]' },
    { label: 'Experience', value: result.breakdown?.work_experience_relevance || 0, color: 'bg-[#6B5DFF]', iconBg: 'bg-[#F0EEFF]', iconColor: 'text-[#6B5DFF]' }
  ] : [];

  const currentDomainInfo = getDomainInfo(selectedDomain || '');
  const DomainIcon = currentDomainInfo.icon;
  const scoreLabel = result && result.score >= 80 ? 'ATS READY' : result && result.score >= 60 ? 'STRONG POTENTIAL' : 'NEEDS WORK';
  const missingToTarget = result ? Math.max(0, 90 - result.score) : 0;
  const foundKeywords = result?.keywords_found.slice(0, 6) || [];
  const missingKeywords = result?.missing_keywords?.slice(0, 5) || [];

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[14px] border border-[#B7CEC5] bg-white p-4"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EEF8F4] text-[#0E7F5B]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-black tracking-tight text-[#111111]">ATS intelligence</h2>
              <div className="mt-1 flex items-center gap-2 text-[12px] font-medium text-[#4B50F5]">
                <span className="h-2 w-2 rounded-full bg-[#4B50F5]" />
                <DomainIcon className={`h-3.5 w-3.5 ${currentDomainInfo.color}`} />
                <span>{formatDomainLabel(selectedDomain || 'Detecting...')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDomain || ''}
              onChange={(e) => handleDomainChange(e.target.value)}
              className="min-w-[160px] rounded-[8px] border border-[#B7CEC5] bg-[#FCFDFC] px-4 py-2.5 text-sm text-[#333333] focus:outline-none"
            >
              {!selectedDomain && <option value="">Auto-Detecting...</option>}
              {DOMAIN_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => analyzeResume()}
              disabled={analyzing}
              className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EEF8F4] text-[#0E7F5B] transition-colors hover:bg-[#E2F2EB] disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {analyzing ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[14px] border border-[#B7CEC5] bg-white py-20 text-center"
          >
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#0E7F5B]" />
            <p className="text-sm font-semibold text-[#5B6B65]">Analyzing your resume...</p>
          </motion.div>
        ) : result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1fr]">
              <div className="rounded-[14px] border border-[#B7CEC5] bg-white p-4">
                <div className="mb-4 text-sm text-[#333333]">Overall ATS score</div>
                <div className="flex justify-center py-2">
                  <div className="relative h-40 w-40">
                    <svg className="h-full w-full -rotate-90">
                      <circle cx="80" cy="80" r="60" stroke="#E6E8EA" strokeWidth="10" fill="none" />
                      <motion.circle
                        cx="80"
                        cy="80"
                        r="60"
                        stroke="#0E7F5B"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray="377"
                        initial={{ strokeDashoffset: 377 }}
                        animate={{ strokeDashoffset: 377 - (377 * (result.score / 100)) }}
                        transition={{ duration: 1.2 }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-5xl font-black leading-none text-[#111111]">{result.score}%</div>
                      <div className="mt-2 rounded-full bg-[#0E7F5B] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                        {scoreLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 rounded-[8px] bg-[#F3F5F6] p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[#666666]">Score</span>
                    <span className="font-bold text-[#0E7F5B]">{result.score}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#D7DDE0]">
                    <div className="h-full rounded-full bg-[#0E7F5B]" style={{ width: `${result.score}%` }} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[10px] border border-[#B7CEC5]">
                  <div className="border-r border-[#B7CEC5] bg-[#FCFDFC] px-3 py-3 text-center">
                    <div className="text-lg font-black text-[#0E7F5B]">{result.score >= 80 ? 'Great' : result.score >= 60 ? 'Good' : 'Fair'}</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#98A59F]">Status</div>
                  </div>
                  <div className="border-r border-[#B7CEC5] bg-[#FCFDFC] px-3 py-3 text-center">
                    <div className="text-lg font-black text-[#111111]">{missingToTarget}</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#98A59F]">To Improve</div>
                  </div>
                  <div className="bg-[#FCFDFC] px-3 py-3 text-center">
                    <div className="text-lg font-black text-[#111111]">90+</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#98A59F]">Target</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {metrics.map((item, index) => {
                  const Icon = index === 0 ? Target : index === 1 ? CheckCircle : index === 2 ? Sparkles : Briefcase;
                  return (
                    <div key={item.label} className="rounded-[12px] border border-[#B7CEC5] bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${item.iconBg} ${item.iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="text-sm text-[#444444]">{item.label}</span>
                            <span className="text-sm font-black text-[#111111]">{item.value}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#E2E5E7]">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-[14px] border border-[#B7CEC5] bg-white p-4">
                <div className="mb-4 text-sm font-medium text-[#333333]">Quick fixes</div>
                <div className="space-y-4">
                  {result.suggestions.slice(0, 3).map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF8F4] text-[#0E7F5B]">
                        {index === 0 ? <Target className="h-3.5 w-3.5" /> : index === 1 ? <CheckCircle className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div className="text-[18px] leading-none font-black text-[#111111]">
                          {index === 0 ? 'Add missing keywords' : index === 1 ? 'Fix formatting' : 'Quantify experience'}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-[#677671]">{suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-[#D6DFDB] pt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[#666666]">Score to reach 90+</span>
                    <span className="font-bold text-[#0E7F5B]">+{missingToTarget} pts needed</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#D7DDE0]">
                    <div className="h-full rounded-full bg-[#0E7F5B]" style={{ width: `${Math.max(10, result.score)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[14px] border border-[#B7CEC5] bg-white p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#A76700]">
                  <AlertCircle className="h-4 w-4" />
                  Strategy updates
                </div>
                <div className="space-y-3">
                  {result.suggestions.slice(0, 3).map((suggestion, index) => (
                    <div key={index} className="rounded-[8px] border-l-2 border-[#0E7F5B] bg-[#F4F6F7] px-4 py-3 text-[15px] leading-6 text-[#2E3437]">
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[14px] border border-[#B7CEC5] bg-white p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#4D6E62]">
                  <Sparkles className="h-4 w-4" />
                  Keyword signals
                </div>
                <div className="flex flex-wrap gap-2">
                  {foundKeywords.map((keyword, index) => (
                    <span key={index} className="rounded-[7px] border border-[#A8D7C6] bg-[#EEF8F4] px-3 py-1.5 text-xs font-medium text-[#236A53]">
                      {keyword}
                    </span>
                  ))}
                  {missingKeywords.map((keyword, index) => (
                    <span key={index} className="rounded-[7px] border border-[#F1D17A] bg-[#FFF8DF] px-3 py-1.5 text-xs font-medium text-[#A46A00]">
                      {keyword}
                    </span>
                  ))}
                </div>

                <div className="mt-8 border-t border-[#D6DFDB] pt-4">
                  <div className="flex items-center gap-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7A75]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#0E7F5B]" />
                      Found
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#F4B400]" />
                      Missing
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onComplete(result.score)}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#0E7F5B] px-6 py-4 text-sm font-black text-white transition-colors hover:bg-[#0B6A4C]"
            >
              Analyse job matchings
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <div className="rounded-[14px] border border-[#E7C5C5] bg-[#FFF4F4] p-8 text-center text-sm font-semibold text-[#B04E4E]">
            {requestError || 'Service Offline'}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#111111]/35 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[16px] border border-[#B7CEC5] bg-white p-6 shadow-2xl"
            >
              <h3 className="text-center text-xl font-black tracking-tight text-[#111111]">Recalibrate?</h3>
              <p className="mt-2 text-center text-sm text-[#5B6B65]">
                Update weights for <span className="font-black text-[#0E7F5B]">{formatDomainLabel(pendingDomain || '')}</span>?
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={confirmDomainChange}
                  className="w-full rounded-[10px] bg-[#0E7F5B] py-3 text-sm font-black text-white"
                >
                  Confirm & Update
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full rounded-[10px] border border-[#D6DFDB] bg-white py-3 text-sm font-bold text-[#7A8B84]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
