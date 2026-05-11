import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Target, Zap, CheckCircle, XCircle, Clock, TrendingUp, Briefcase, Globe, Loader2, LogOut, User as UserIcon, Lock, Bell, X, Calendar } from 'lucide-react';
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
    <Loader2 className="w-12 h-12 text-[#1D9E75] animate-spin" />
    <p className="text-[#888888] animate-pulse">Loading experience...</p>
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
    setAtsScore(null);
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
    setSelectedResume(null);
    setAtsScore(null);
  };

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const completionPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);
  const completedMilestones = currentStepIndex;
  const currentPhaseLabel =
    currentStep === 'upload'
      ? 'Profile Initialization'
      : currentStep === 'ats'
        ? 'ATS Analysis'
        : currentStep === 'matches'
          ? 'Job Matching'
          : 'Application Automation';

  const canNavigateToStep = (stepId: Step) => {
    if (stepId === 'upload') return true;
    if (!selectedResume) return false;
    if (stepId === 'ats') return true;
    if (stepId === 'matches') return atsScore !== null;
    if (stepId === 'apply') return (atsScore ?? 0) >= 50;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-[#444444] selection:bg-[#0C7A5B]/20 selection:text-[#111111]">
      <div className="relative z-10">
        <header className="border-b border-[#DCE6E1] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setCurrentStep('upload')}>
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#CFE1D9] bg-[#ECF7F2] text-[#0C7A5B] transition-transform duration-300 group-hover:scale-105">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="text-[18px] font-black tracking-tight text-[#0C7A5B]">ResumeMatch AI</div>
            </div>

            <div className="hidden items-center gap-10 md:flex">
                {[
                  { id: 'ats', label: 'Analyze' },
                  { id: 'matches', label: 'Matches' },
                  { id: 'apply', label: 'Apply' }
                ].map((item) => {
                  const isActive = currentStep === item.id;
                  const canOpen = canNavigateToStep(item.id as Step);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                      if (canOpen) {
                        setCurrentStep(item.id as Step);
                      }
                      }}
                      disabled={!canOpen}
                      className={`text-sm font-semibold transition-colors ${
                      isActive ? 'text-[#0C7A5B]' : canOpen ? 'text-[#5F6E68] hover:text-[#0C7A5B]' : 'text-[#A7B7B0] cursor-not-allowed'
                    }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center gap-3">
            {user && (
              <button 
                onClick={() => {
                  setShowDashboard(true);
                  setDashboardTab('inbox');
                }}
                className="relative p-2 bg-[#F7FBF9] border border-[#D7E5DE] rounded-[10px] hover:bg-[#EEF7F3] transition-all text-[#7A8B84] hover:text-[#1D9E75] group"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#FFFFFF] group-hover:scale-110 transition-transform">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-3 rounded-full border border-[#CFE1D9] bg-[#F7FBF9] pl-4 pr-2 py-2">
                <div className="hidden sm:flex items-center gap-2 text-[12px] font-medium text-[#0D8C63]">
                  <span className="h-2 w-2 rounded-full bg-[#12A56E]" />
                  Premium member
                </div>
                <div className="w-8 h-8 bg-[#12A56E] rounded-full flex items-center justify-center text-xs font-black text-[#FFFFFF] cursor-pointer" onClick={() => setShowDashboard(true)}>
                  {getDisplayName(user)[0]?.toUpperCase() || 'U'}
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-[#E8E8E8] rounded-full text-[#AAAAAA] hover:text-red-400 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="px-5 py-2.5 rounded-full border border-[#CFE1D9] bg-[#F7FBF9] text-sm font-semibold text-[#0D8C63] transition-all hover:bg-[#EEF7F3]"
              >
                Premium member
              </button>
            )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          {!showDashboard && (
            <div className="mx-auto mb-16 max-w-[1180px]">
              <div className="resume-stepper-card relative overflow-hidden rounded-[18px] border border-[#eef2f0] bg-white px-6 py-5 shadow-[0_14px_40px_rgba(16,24,40,0.06)] md:px-7 md:py-6">
                <div className="relative mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-[620px]">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ecf5f1] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#0d7f61]">
                      <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                      Guided Workflow
                    </div>
                    <h2 className="text-[28px] font-black tracking-[-0.04em] text-[#0f1720] md:text-[34px]">
                      {steps[currentStepIndex]?.label || 'Upload Resume'}
                    </h2>
                    <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-[#667c73]">
                      Step {currentStepIndex + 1} of 4. <span className="font-semibold text-[#0d7f61]">{currentPhaseLabel}</span> in progress so we can move from upload to applications with less friction.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start rounded-[14px] bg-[#f7f9f8] px-4 py-3">
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(#8ab7a7 ${completionPercent * 3.6}deg, #dce8e1 0deg)`
                      }}
                    >
                      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-[10px] font-black text-[#0c7a5b]">
                        {completionPercent}%
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8ca198]">Progress</p>
                      <p className="mt-0.5 text-[12px] font-semibold leading-4 text-[#152129]">
                        {completedMilestones} of {steps.length} milestones cleared
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative mb-4 overflow-hidden rounded-full bg-[#edf2ef]">
                  <motion.div
                    className="relative h-[6px] rounded-full bg-[#0c7a5b]"
                    initial={false}
                    animate={{ width: `${completionPercent}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </div>

                <div className="relative grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {steps.map((step, index) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStepIndex > index;
                    const Icon = step.icon;
                    const canOpen = canNavigateToStep(step.id as Step);

                    return (
                      <button
                        key={step.id}
                        onClick={() => {
                          if (canOpen && (isCompleted || isActive || step.id === 'upload')) {
                            setCurrentStep(step.id as Step);
                          }
                        }}
                        disabled={!canOpen}
                        className={`group rounded-[12px] border p-4 text-left transition-all duration-300 ${
                          isActive
                            ? 'border-[#0c7a5b] bg-white shadow-[0_10px_28px_rgba(12,122,91,0.08)]'
                            : isCompleted
                              ? 'border-[#e7edea] bg-[#fbfcfc] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(16,24,40,0.04)]'
                              : canOpen
                                ? 'border-[#eef2f0] bg-[#f8faf9] text-[#90a39a]'
                                : 'border-[#eef2f0] bg-[#f8faf9] text-[#90a39a] cursor-not-allowed opacity-75'
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors ${
                              isActive
                                ? 'border-[#b9ddd0] bg-[#eef8f3] text-[#0c7a5b]'
                                : isCompleted
                                  ? 'border-[#e0e8e3] bg-white text-[#6a7d75]'
                                  : 'border-[#e6efea] bg-white text-[#9bada5]'
                            }`}
                          >
                            {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <span
                            className={`rounded-[4px] border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] ${
                              isActive
                                ? 'border-[#c6e3d8] bg-[#eef8f3] text-[#0c7a5b]'
                                : isCompleted
                                  ? 'border-[#dde7e2] bg-white text-[#7b8f87]'
                                  : 'border-[#dfe7e2] bg-white text-[#a1b0aa]'
                            }`}
                          >
                            {isActive ? 'Current' : isCompleted ? 'Done' : `Step 0${index + 1}`}
                          </span>
                        </div>
                        <p className={`text-[16px] font-bold tracking-[-0.02em] ${isActive || isCompleted ? 'text-[#22342d]' : 'text-[#8da199]'}`}>
                          {step.label}
                        </p>
                        <p className={`mt-1 text-[13px] leading-5 ${isActive ? 'text-[#637a71]' : isCompleted ? 'text-[#7b8f87]' : 'text-[#a0aea8]'}`}>
                          {step.id === 'upload'
                            ? 'Start with a clean, ATS-readable resume.'
                            : step.id === 'ats'
                              ? 'Measure keyword strength and fix weak spots.'
                              : step.id === 'matches'
                                ? 'Pull roles that align with your profile.'
                                : 'Launch applications once everything is ready.'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
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
                  <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#E1ECE7] bg-white p-12 py-20 text-center shadow-[0_8px_30px_rgba(17,24,39,0.04)]">
                    <Lock className="w-16 h-16 text-[#1D9E75] mb-6 mx-auto opacity-50" />
                    <h3 className="text-2xl font-black mb-3">Authentication Required</h3>
                    <p className="text-[#AAAAAA] max-w-sm mx-auto mb-8 font-medium">
                      To use our premium Auto-Apply feature and secure your career, please sign in to your JobApplyAI account.
                    </p>
                    <button 
                      onClick={() => setShowAuthModal(true)}
                      className="px-12 py-4 bg-[#1D9E75] rounded-[12px] font-black uppercase tracking-widest text-xs shadow-xl shadow-[#1D9E75]/20"
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
                className="fixed inset-0 z-[100] bg-[#F8F9FB]/95 backdrop-blur-2xl p-4 md:p-8 overflow-y-auto"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="px-3 py-1 bg-[#1D9E75]/10 rounded-full text-[10px] font-black text-[#1D9E75] uppercase tracking-widest">
                        Career Command Center
                      </div>
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter text-[#111111] mb-4">Recruitment Pipeline</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                          <Bell className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Outreach</p>
                          <p className="text-xs font-bold text-[#111111]">Recruiter Inbox</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                          <Calendar className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Scheduling</p>
                          <p className="text-xs font-bold text-[#111111]">Interview Tracker</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                          <Target className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Monitoring</p>
                          <p className="text-xs font-bold text-[#111111]">App Tracking</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-8">
                    <div className="flex gap-2 p-1.5 bg-white border border-[#E8E8E8] rounded-[18px] shadow-sm">
                      <button 
                        onClick={() => setDashboardTab('inbox')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all ${
                          dashboardTab === 'inbox' 
                            ? 'bg-[#1D9E75] text-[#FFFFFF] shadow-lg shadow-[#1D9E75]/20' 
                            : 'text-[#AAAAAA] hover:text-[#111111] hover:bg-[#F8F9FB]'
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Recruiter Inbox {unreadCount > 0 && `(${unreadCount})`}
                      </button>
                      <button 
                        onClick={() => setDashboardTab('tracker')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all ${
                          dashboardTab === 'tracker' 
                            ? 'bg-[#1D9E75] text-[#FFFFFF] shadow-lg shadow-[#1D9E75]/20' 
                            : 'text-[#AAAAAA] hover:text-[#111111] hover:bg-[#F8F9FB]'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Interview Tracker
                      </button>
                      <button 
                        onClick={() => setDashboardTab('history')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all ${
                          dashboardTab === 'history' 
                            ? 'bg-[#1D9E75] text-[#FFFFFF] shadow-lg shadow-[#1D9E75]/20' 
                            : 'text-[#AAAAAA] hover:text-[#111111] hover:bg-[#F8F9FB]'
                        }`}
                      >
                        <Target className="w-3.5 h-3.5" />
                        App Tracking
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowDashboard(false)}
                      className="p-3 bg-[#FFFFFF] hover:bg-[#F8F9FB] border border-[#E8E8E8] rounded-[12px] transition-all hover:scale-110 active:scale-95"
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
        </main>
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
