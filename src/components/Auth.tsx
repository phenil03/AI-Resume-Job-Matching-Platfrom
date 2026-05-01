import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Chrome, Loader2, CheckCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthProps {
  onSuccess: (user: any) => void;
  onCancel?: () => void;
}

interface DemoGoogleAccount {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

export default function Auth({ onSuccess, onCancel }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleStep, setGoogleStep] = useState(0);
  const [googleAccounts, setGoogleAccounts] = useState<DemoGoogleAccount[]>([]);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState<string | null>(null);

  const normalizeDemoUser = (user: any) => ({
    id: user?.id || `demo-${Date.now()}`,
    email: user?.email || formData.email || 'demo@jobapplyai.dev',
    user_metadata: {
      full_name:
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.identities?.[0]?.identity_data?.full_name ||
        user?.identities?.[0]?.identity_data?.name ||
        user?.full_name ||
        formData.name ||
        '',
      avatar_url:
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        user?.identities?.[0]?.identity_data?.avatar_url ||
        user?.identities?.[0]?.identity_data?.picture ||
        ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (!isSupabaseConfigured) {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Unable to continue with demo sign-in.');
        }

        const mockData = await response.json();
        onSuccess(normalizeDemoUser(mockData.user));
        return;
      }

      // Standard Supabase Auth Pattern
      const { data, error: authError } = isLogin 
        ? await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password })
        : await supabase.auth.signUp({ 
            email: formData.email, 
            password: formData.password,
            options: { data: { full_name: formData.name } }
          });

      if (authError) {
        throw authError;
      } else if (data.user) {
        onSuccess(normalizeDemoUser(data.user));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setGoogleStep(1);
    setError(null);
    
    try {
      if (isSupabaseConfigured) {
        // PROPER SUPABASE GOOGLE AUTH CALL (Only if keys are present)
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline'
            }
          }
        });
        if (authError) throw authError;
      } else {
        const res = await fetch('/api/auth/google-accounts');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Google Sign-In failed.');
        }

        const data = await res.json();
        setGoogleAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setGoogleStep(3);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
      setGoogleStep(0);
      setLoading(false);
    }
  };

  const handleDemoGoogleAccountSelect = async (account: DemoGoogleAccount) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to sign in with the selected Google account.');
      }

      const data = await res.json();
      setGoogleStep(2);
      setTimeout(() => {
        onSuccess(normalizeDemoUser(data.user));
        setLoading(false);
        setGoogleStep(0);
      }, 250);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
      setGoogleStep(3);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl"
        onClick={onCancel}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <AnimatePresence mode="wait">
          {googleStep === 1 ? (
             <motion.div key="g1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
               <div className="relative w-20 h-20 mx-auto mb-8">
                 <div className="absolute inset-0 border-4 border-slate-800 rounded-2xl" />
                 <div className="absolute inset-0 border-4 border-blue-500 rounded-2xl border-t-transparent animate-spin" />
                 <Chrome className="absolute inset-0 m-auto w-8 h-8 text-blue-400" />
               </div>
               <h3 className="text-xl font-bold mb-1">Authenticating...</h3>
               <p className="text-white/30 text-xs">Connecting to Google Identity Services</p>
             </motion.div>
          ) : googleStep === 2 ? (
            <motion.div key="g2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black mb-1 text-white">Verified</h3>
              <p className="text-white/30 text-xs uppercase tracking-widest font-bold">Profile Synchronized</p>
            </motion.div>
          ) : googleStep === 3 ? (
            <motion.div key="g3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-6">
                  <Lock className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Choose Account</span>
                </div>
                <h3 className="text-3xl font-black mb-2 tracking-tighter text-white">Select Google Account</h3>
                <p className="text-white/30 text-sm font-medium">Pick the profile you want to use in this app.</p>
              </div>

              <div className="space-y-3">
                {googleAccounts.map((account) => {
                  const displayName = account.user_metadata.full_name || account.email.split('@')[0];
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleDemoGoogleAccountSelect(account)}
                      disabled={loading}
                      className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4 text-left transition-all disabled:opacity-50"
                    >
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-blue-500/20">
                        {displayName[0]?.toUpperCase() || 'G'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{displayName}</p>
                        <p className="text-xs text-white/40 truncate">{account.email}</p>
                      </div>
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setGoogleStep(0);
                    setLoading(false);
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold transition-all"
                >
                  Back
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="main">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-6">
                   <Lock className="w-3 h-3 text-blue-400" />
                   <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Secure Portal</span>
                </div>
                <h3 className="text-4xl font-black mb-2 tracking-tighter text-white">
                  {isLogin ? 'Login' : 'Sign Up'}
                </h3>
                <p className="text-white/30 text-sm font-medium">Empower your career with AI automation.</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-14 bg-white hover:bg-slate-50 active:scale-[0.98] rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-white/5"
                >
                  <Chrome className="w-5 h-5 text-[#4285F4]" />
                  <span className="text-slate-900 font-bold text-sm">Continue with Google</span>
                </button>

                <div className="flex items-center gap-4 py-2 opacity-10">
                  <div className="h-px flex-1 bg-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">OR</span>
                  <div className="h-px flex-1 bg-white" />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <input
                      type="text"
                      placeholder="NAME"
                      className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-xs font-bold tracking-widest placeholder:text-white/20 outline-none focus:border-blue-500/50 transition-all uppercase"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  )}
                  
                  <input
                    type="email"
                    placeholder="EMAIL"
                    className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-xs font-bold tracking-widest placeholder:text-white/20 outline-none focus:border-blue-500/50 transition-all uppercase"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />

                  <input
                    type="password"
                    placeholder="PASSWORD"
                    className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-xs font-bold tracking-widest placeholder:text-white/20 outline-none focus:border-blue-500/50 transition-all uppercase"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-black text-white active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 uppercase tracking-widest text-xs"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Proceed to Vault</span>}
                  </button>
                </form>

                <div className="pt-6 text-center">
                  <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-white/20 hover:text-white transition-colors uppercase tracking-[0.2em]">
                    {isLogin ? "Need a profile? Sign Up" : "Returning? Log In"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
