import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

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
}

interface Props {
  resume: Resume;
  onComplete: (score: number) => void;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function ATSAnalysis({ resume, onComplete }: Props) {
  const [analyzing, setAnalyzing] = useState(true);
  const [result, setResult] = useState<ATSResult | null>(null);

  useEffect(() => {
    analyzeResume();
  }, []);

  const analyzeResume = async () => {
    setAnalyzing(true);
    const apiTarget = `${API_BASE}/api/ats-analyze`;
    console.log('🚀 [DEBUG] Initiating Analysis...');
    console.log('📡 [DEBUG] Target URL:', apiTarget);
    console.log('🕒 [DEBUG] Request Time:', new Date().toLocaleTimeString());
    
    try {
      const res = await fetch(apiTarget, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resume.id })
      });
      
      const data = await res.json();
      console.log('🔍 [DEBUG] ATS Response:', data);

      if (res.ok && data.score !== undefined) {
        setResult({
          score: data.score,
          suggestions: data.suggestions || [],
          keywords_found: data.keywords_found || []
        });
      } else {
        console.error('ATS API error:', data);
      }
      setAnalyzing(false);

    } catch (err) {
      console.error('Analysis error:', err);
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
            Analyzing your resume against ATS systems 
            <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-mono border border-blue-500/30">
              Live-Session: {Math.floor(Date.now() / 1000).toString().slice(-4)}
            </span>
          </p>
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
            <p className="text-white/60">Checking keywords, formatting, and ATS compatibility</p>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Score Display */}
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
              </div>
            </motion.div>

            {/* Keywords Found */}
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
                    key={i}
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

            {/* Suggestions */}
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
                    key={i}
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

            {/* Continue Button */}
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
        ) : null}
      </motion.div>
    </div>
  );
}
