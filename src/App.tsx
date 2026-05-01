import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Target, Zap, CheckCircle, XCircle, Clock, TrendingUp, Briefcase, Globe, Loader2, LogOut, User as UserIcon, Lock, Bell, X } from 'lucide-react';
import { googleLogout } from '@react-oauth/google';

// Components
import ResumeUpload from './components/ResumeUpload';
import ATSAnalysis from './components/ATSAnalysis';
import JobMatches from './components/JobMatches';
import AutoApply from './components/AutoApply';
import Auth from './components/Auth';
import RecruiterInbox from './components/RecruiterInbox';
import InterviewTracker from './components/InterviewTracker';
import ApplicationDashboard from './components/ApplicationDashboard';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type Step = 'upload' | 'ats' | 'matches' | 'apply';

interface Resume {
  id: number;
  filename: string;
  content: string;
  ats_score: number | null;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
    <p className="text-white/60 animate-pulse">Loading experience...</p>
  </div>
);

const normalizeUser = (rawUser: any): User => ({
  id: String(rawUser?.id || ''),
  email: rawUser?.email || '',
  user_metadata: {
    full_name:
      rawUser?.user_metadata?.full_name ||
      rawUser?.user_metadata?.name ||
      rawUser?.identities?.[0]?.identity_data?.full_name ||
      rawUser?.identities?.[0]?.identity_data?.name ||
      '',
    avatar_url:
      rawUser?.user_metadata?.avatar_url ||
      rawUser?.user_metadata?.picture ||
      rawUser?.identities?.[0]?.identity_data?.avatar_url ||
      rawUser?.identities?.[0]?.identity_data?.picture ||
      ''
  }
});

const getDisplayName = (user: User | null) => {
  if (!user) return '';
  return user.user_metadata.full_name || user.email.split('@')[0] || 'Member';
};

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dashboardTab, setDashboardTab] = useState<'inbox' | 'tracker' | 'history'>('inbox');

  // Restore local/demo user or real Supabase session.
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    if (!isSupabaseConfigured) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const sessionUser = data.session?.user;
      if (sessionUser) {
        const normalized = normalizeUser(sessionUser);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const sessionUser = session?.user;
      if (sessionUser) {
        const normalized = normalizeUser(sessionUser);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const steps = [
    { id: 'upload', label: 'Upload Resume', icon: Upload },
    { id: 'ats', label: 'ATS Analysis', icon: Target },
    { id: 'matches', label: 'Job Matches', icon: Briefcase },
    { id: 'apply', label: 'Auto Apply', icon: Zap }
  ];

  const handleResumeUploaded = (resume: Resume) => {
    setSelectedResume(resume);
    setCurrentStep('ats');
  };

  const handleATSComplete = (score: number) => {
    setAtsScore(score);
    // When ATS is complete, we show matches but prompt for login if trying to proceed
    setCurrentStep('matches');
  };

  const handleMatchesComplete = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setCurrentStep('apply');
    }
  };

  const handleApplyComplete = () => {
    setShowDashboard(true);
  };

  const handleLoginSuccess = (userData: User) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    localStorage.setItem('user', JSON.stringify(normalized));
    setShowAuthModal(false);
    // If they were trying to apply, move them forward
    if (currentStep === 'matches') {
      setCurrentStep('apply');
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch((error) => {
        console.error('Sign-out failed:', error);
      });
    }
    googleLogout();
    setUser(null);
    localStorage.removeItem('user');
    setCurrentStep('upload');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 selection:text-blue-200">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 p-4 md:p-8">
        <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setCurrentStep('upload')}>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-blue-500/20">
                <Zap className="w-7 h-7 text-white fill-white/20" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  JobApplyAI
                </h1>
                <div className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-blue-500 animate-ping" />
                  <p className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase">Autonomous Platform</p>
                </div>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <button 
                onClick={() => {
                  setShowDashboard(false);
                  setCurrentStep('upload');
                }}
                className={`text-sm font-bold tracking-tight transition-all pb-1 border-b-2 ${!showDashboard ? 'text-blue-400 border-blue-500' : 'text-white/40 border-transparent hover:text-white/70'}`}
              >
                Job Search
              </button>
              <button 
                onClick={() => {
                  if (!user) setShowAuthModal(true);
                  else setShowDashboard(true);
                }}
                className={`text-sm font-bold tracking-tight transition-all pb-1 border-b-2 ${showDashboard ? 'text-blue-400 border-blue-500' : 'text-white/40 border-transparent hover:text-white/70'}`}
              >
                Dashboard
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <button 
                onClick={() => {
                  setShowDashboard(true);
                  setDashboardTab('inbox');
                }}
                className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-blue-400 group"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#020617] group-hover:scale-110 transition-transform">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-3 pl-3 pr-2 py-2 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white/80">{getDisplayName(user)}</p>
                  <p className="text-[10px] text-white/35 truncate max-w-[180px]">{user.email}</p>
                  <p className="text-[9px] font-medium text-white/30 uppercase tracking-wider">Premium Member</p>
                </div>
                <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-blue-500/20 cursor-pointer" onClick={() => setShowDashboard(true)}>
                  {getDisplayName(user)[0]?.toUpperCase() || 'U'}
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold tracking-tight transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {/* Progress Steps - Only show during the search flow */}
          {!showDashboard && (
            <div className="flex flex-wrap gap-4 mb-12 relative overflow-x-auto pb-4 scrollbar-hide">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                
                return (
                  <div key={step.id} className="flex items-center flex-1 min-w-[140px]">
                    <motion.button
                      onClick={() => {
                        if (isCompleted || isActive) {
                          setCurrentStep(step.id as Step);
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${
                        isActive 
                          ? 'bg-blue-500/20 border-2 border-blue-500 shadow-lg shadow-blue-500/10' 
                          : isCompleted 
                          ? 'bg-green-500/10 border border-green-500/30 cursor-pointer hover:bg-green-500/20' 
                          : 'bg-white/5 border border-white/10 opacity-40 cursor-not-allowed'
                      }`}
                      whileHover={isCompleted || isActive ? { y: -2 } : {}}
                      whileTap={isCompleted || isActive ? { scale: 0.98 } : {}}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive 
                          ? 'bg-blue-500 shadow-lg shadow-blue-500/40' 
                          : isCompleted 
                          ? 'bg-green-500' 
                          : 'bg-white/10'
                      }`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="text-left hidden sm:block">
                        <div className="font-bold text-xs whitespace-nowrap">{step.label}</div>
                        <div className="text-[10px] text-white/40 font-medium">0{index + 1}</div>
                      </div>
                    </motion.button>
                    {index < steps.length - 1 && (
                      <div className={`h-[1px] flex-1 mx-2 min-w-[20px] ${
                        isCompleted ? 'bg-green-500/50' : 'bg-white/10'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="will-change-transform"
            >
              {currentStep === 'upload' && <ResumeUpload onResumeUploaded={handleResumeUploaded} />}
              {currentStep === 'ats' && selectedResume && (
                <ATSAnalysis resume={selectedResume} onComplete={handleATSComplete} />
              )}
              {currentStep === 'matches' && selectedResume && (
                <JobMatches
                  resumeId={selectedResume.id}
                  atsScore={atsScore}
                  onComplete={handleMatchesComplete}
                />
              )}
              
              {/* Login Protected Steps */}
              {currentStep === 'apply' && selectedResume && (
                user ? (
                  <AutoApply
                    resumeId={selectedResume.id}
                    atsScore={atsScore}
                    onComplete={handleApplyComplete}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-white/10 rounded-3xl p-12 text-center">
                    <Lock className="w-16 h-16 text-blue-500 mb-6 mx-auto opacity-50" />
                    <h3 className="text-2xl font-black mb-3">Authentication Required</h3>
                    <p className="text-white/40 max-w-sm mx-auto mb-8 font-medium">
                      To use our premium Auto-Apply feature and secure your career, please sign in to your JobApplyAI account.
                    </p>
                    <button 
                      onClick={() => setShowAuthModal(true)}
                      className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20"
                    >
                      Log In to Apply
                    </button>
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>

          {/* Full-Page Dashboard Overlay */}
          <AnimatePresence>
            {showDashboard && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-2xl p-4 md:p-8 overflow-y-auto"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="flex justify-between items-center mb-12">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setDashboardTab('inbox')}
                        className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                          dashboardTab === 'inbox' 
                            ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/20' 
                            : 'bg-white/5 border border-white/10 text-white/40 hover:text-white'
                        }`}
                      >
                        Recruiter Inbox {unreadCount > 0 && `(${unreadCount})`}
                      </button>
                      <button 
                        onClick={() => setDashboardTab('tracker')}
                        className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                          dashboardTab === 'tracker' 
                            ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/20' 
                            : 'bg-white/5 border border-white/10 text-white/40 hover:text-white'
                        }`}
                      >
                        Interview Tracker
                      </button>
                      <button 
                        onClick={() => setDashboardTab('history')}
                        className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                          dashboardTab === 'history' 
                            ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/20' 
                            : 'bg-white/5 border border-white/10 text-white/40 hover:text-white'
                        }`}
                      >
                        App Tracking
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowDashboard(false)}
                      className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all hover:scale-110 active:scale-95"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <motion.div
                    key={dashboardTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {dashboardTab === 'inbox' ? (
                      <RecruiterInbox onUnreadCount={setUnreadCount} />
                    ) : dashboardTab === 'tracker' ? (
                      <InterviewTracker />
                    ) : (
                      <ApplicationDashboard resumeId={selectedResume?.id} />
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <Auth 
            onSuccess={handleLoginSuccess} 
            onCancel={() => setShowAuthModal(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
