import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthProps {
  onSuccess: (user: any) => void;
  onCancel?: () => void;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-1 6.7-2.7l-3.3-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.7A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.5A6 6 0 0 1 6 12c0-.5.1-1 .3-1.5V7.8H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-3Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.4c1.5 0 2.8.5 3.8 1.4l2.8-2.8A10 10 0 0 0 3.1 7.8l3.3 2.7C7.2 8.2 9.4 6.4 12 6.4Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Auth({ onSuccess, onCancel }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleStep, setGoogleStep] = useState(0);
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

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setGoogleStep(1);
      setError(null);

      try {
        // Fetch user info from Google using the access token
        const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        const googleUser = res.data;
        
        // Map Google user info to our app's user format
        const normalized = {
          id: googleUser.sub,
          email: googleUser.email,
          user_metadata: {
            full_name: googleUser.name,
            avatar_url: googleUser.picture,
          }
        };

        setGoogleStep(2);
        setTimeout(() => {
          onSuccess(normalized);
        }, 1000);
      } catch (err) {
        console.error('Failed to fetch user info:', err);
        setError('Failed to retrieve profile info from Google.');
        setGoogleStep(0);
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Failed:', error);
      setError('Google Sign-In was cancelled or failed.');
      setGoogleStep(0);
      setLoading(false);
    },
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-2xl"
        onClick={onCancel}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-[#E8E8E8] bg-[#FFFFFF] p-10 text-[#111111] shadow-2xl"
      >
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#1D9E75] via-indigo-500 to-purple-500" />

        <AnimatePresence mode="wait">
          {googleStep === 1 ? (
            <motion.div key="g1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[12px] border border-[#1D9E75]/30 bg-[#E6F1FB]">
                <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
              </div>
              <h3 className="mb-1 text-xl font-bold">Redirecting to Google...</h3>
              <p className="text-xs text-[#AAAAAA]">Google will show the original sign-in screen.</p>
            </motion.div>
          ) : googleStep === 2 ? (
            <motion.div key="g2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[12px] border border-emerald-500/30 bg-emerald-500/20">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="mb-1 text-2xl font-black">Verified</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-[#AAAAAA]">Profile Synchronized</p>
            </motion.div>
          ) : (
            <motion.div key="main">
              <div className="mb-8 text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1D9E75]/20 bg-[#E6F1FB] px-3 py-1">
                  <Lock className="h-3 w-3 text-[#1D9E75]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#1D9E75]">Secure Portal</span>
                </div>
                <h3 className="mb-2 text-4xl font-black tracking-tighter">
                  {isLogin ? 'Login' : 'Sign Up'}
                </h3>
                <p className="text-sm font-medium text-[#AAAAAA]">Empower your career with AI automation.</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => handleGoogleSignIn()}
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center gap-4 rounded-[12px] bg-white shadow-xl shadow-white/5 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                >
                  <GoogleMark />
                  <span className="text-sm font-semibold text-slate-900">Sign in with Google</span>
                </button>

                <div className="flex items-center gap-4 py-2 opacity-20">
                  <div className="h-px flex-1 bg-[#111111]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#111111]">OR</span>
                  <div className="h-px flex-1 bg-[#111111]" />
                </div>

                {error && (
                  <div className="rounded-[12px] border border-transparent bg-[#FCEBEB] p-4 text-center text-xs font-bold text-[#791F1F]">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <input
                      type="text"
                      placeholder="NAME"
                      className="h-14 w-full rounded-[12px] border border-[#E0E0E0] bg-[#FFFFFF] px-6 text-xs font-bold uppercase tracking-widest text-[#111111] placeholder:text-[#AAAAAA] outline-none transition-all focus:border-[#1D9E75]/50"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  )}

                  <input
                    type="email"
                    placeholder="EMAIL"
                    className="h-14 w-full rounded-[12px] border border-[#E0E0E0] bg-[#FFFFFF] px-6 text-xs font-bold uppercase tracking-widest text-[#111111] placeholder:text-[#AAAAAA] outline-none transition-all focus:border-[#1D9E75]/50"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />

                  <input
                    type="password"
                    placeholder="PASSWORD"
                    className="h-14 w-full rounded-[12px] border border-[#E0E0E0] bg-[#FFFFFF] px-6 text-xs font-bold uppercase tracking-widest text-[#111111] placeholder:text-[#AAAAAA] outline-none transition-all focus:border-[#1D9E75]/50"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-[#1D9E75] text-xs font-black uppercase tracking-widest text-[#FFFFFF] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Proceed to Vault</span>}
                  </button>
                </form>

                <div className="pt-6 text-center">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAAAAA] transition-colors hover:text-[#111111]"
                  >
                    {isLogin ? 'Need a profile? Sign Up' : 'Returning? Log In'}
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
