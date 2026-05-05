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
  Zap,
  Sparkles,
  Shield,
  Layers,
  Cpu,
  ChevronRight,
  Award
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

  const currentDomainInfo = getDomainInfo(selectedDomain || '');
  const DomainIcon = currentDomainInfo.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Header - Ultra Compact */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#E8E8E8] rounded-[20px] px-6 py-3.5 flex items-center justify-between shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1D9E75]/10 rounded-xl flex items-center justify-center text-[#1D9E75]">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#111111] tracking-tighter leading-none">ATS Intelligence</h2>
            <div className={`flex items-center gap-1.5 mt-1 text-[9px] font-black uppercase tracking-widest ${currentDomainInfo.color}`}>
              <DomainIcon className="w-2.5 h-2.5" />
              {formatDomainLabel(selectedDomain || 'Detecting...')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDomain || ''}
            onChange={(e) => handleDomainChange(e.target.value)}
            className="rounded-[10px] border border-[#E8E8E8] bg-[#F8F9FB] px-3 py-2 text-[10px] font-black text-[#111111] focus:outline-none appearance-none cursor-pointer min-w-[150px]"
          >
            {!selectedDomain && <option value="">Auto-Detecting...</option>}
            {DOMAIN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => analyzeResume()}
            disabled={analyzing}
            className="p-2 bg-[#1D9E75] text-white rounded-[10px] hover:bg-[#0F6E56] transition-all disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {analyzing ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center bg-white border border-[#E8E8E8] rounded-[24px]"
          >
            <Loader2 className="w-8 h-8 text-[#1D9E75] animate-spin mx-auto mb-2" />
            <p className="text-[10px] font-black text-[#111111] uppercase tracking-widest">Parsing Vector...</p>
          </motion.div>
        ) : result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Dashboard Row - High Density */}
            <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-6 shadow-sm overflow-hidden relative">
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                {/* Compact Score Circle */}
                <div className="relative w-32 h-32 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="#F8F9FB" strokeWidth="8" fill="none" />
                    <motion.circle
                      cx="64" cy="64" r="58" stroke="#1D9E75" strokeWidth="10" fill="none"
                      strokeDasharray="364"
                      initial={{ strokeDashoffset: 364 }}
                      animate={{ strokeDashoffset: 364 - (364 * (result.score / 100)) }}
                      transition={{ duration: 1.5 }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-[#111111] tracking-tighter">{result.score}%</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-[#1D9E75] text-white rounded-full text-[7px] font-black uppercase tracking-widest mt-1">
                      <Award className="w-2 h-2" />
                      ATS Ready
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  {[
                    { label: 'Keywords', value: result.breakdown?.keyword_match || 0, icon: Target, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Formatting', value: result.breakdown?.formatting_parsability || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Skills Match', value: result.breakdown?.skills_match || 0, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
                    { label: 'Experience', value: result.breakdown?.work_experience_relevance || 0, icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50' }
                  ].map((item) => (
                    <div key={item.label} className="bg-[#F8F9FB] p-3 rounded-[12px] border border-[#E8E8E8] flex items-center gap-3 group hover:bg-white hover:shadow-md transition-all">
                      <div className={`w-9 h-9 ${item.bg} ${item.color} rounded-lg flex items-center justify-center shrink-0 shadow-inner`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-[#111111] leading-none mb-1">{item.value}%</div>
                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategic Insights & Data */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-[#111111] mb-4 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  Strategy Updates
                </h3>
                <div className="space-y-2">
                  {result.suggestions.slice(0, 3).map((s, i) => (
                    <div key={i} className="text-[10px] text-[#555555] font-medium leading-relaxed bg-[#F8F9FB] p-2.5 rounded-[10px] border border-transparent hover:border-orange-100 transition-all">
                      • {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#E8E8E8] rounded-[24px] p-5 shadow-sm">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-[#111111] mb-4 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-[#1D9E75]" />
                  Keyword Signals
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.keywords_found.slice(0, 10).map((k, i) => (
                    <span key={i} className="px-2.5 py-1.5 bg-[#F8F9FB] border border-[#E8E8E8] rounded-[8px] text-[8px] font-bold text-gray-500 hover:text-[#1D9E75] hover:border-[#1D9E75]/30 transition-all">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => onComplete(result.score)}
              className="w-full py-4 bg-[#111111] rounded-[16px] font-black uppercase tracking-[0.4em] text-[9px] text-white hover:bg-[#1D9E75] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              Analyze Job Matchings
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <div className="p-8 bg-rose-50 text-rose-600 rounded-[24px] text-center text-[10px] font-black uppercase tracking-widest">
            {requestError || 'Service Offline'}
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#111111]/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[24px] p-8 max-w-xs w-full shadow-2xl border border-[#E8E8E8]"
            >
              <h3 className="text-xl font-black text-center mb-1 tracking-tighter">Recalibrate?</h3>
              <p className="text-[10px] text-center mb-6 text-gray-500 font-medium leading-relaxed px-4">
                Update weights for <span className="text-[#1D9E75] font-black">{formatDomainLabel(pendingDomain || '')}</span>?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmDomainChange}
                  className="w-full py-3 bg-[#1D9E75] text-white text-[9px] font-black uppercase tracking-widest rounded-[10px]"
                >
                  Confirm & Update
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-3 bg-white border border-[#E8E8E8] text-gray-400 text-[9px] font-black uppercase tracking-widest rounded-[10px]"
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
