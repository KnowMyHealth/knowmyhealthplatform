'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type PageState = 'loading' | 'form' | 'success' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user lands via the reset link.
    // The token is in the URL hash — the client library processes it automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('form');
      }
    });

    // Fallback: if session already exists (page refresh after recovery link click)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState('form');
      else {
        // Wait a moment for the hash-based auth to settle, then show invalid
        setTimeout(() => {
          setPageState(prev => prev === 'loading' ? 'invalid' : prev);
        }, 2500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setPageState('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center p-6">
      {/* Subtle background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        {/* Brand strip */}
        <div className="bg-emerald-950 px-8 py-5 flex items-center gap-3">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
            <Activity size={18} className="text-white" />
          </div>
          <span className="text-white font-extrabold tracking-tight">Know My Health</span>
        </div>

        <AnimatePresence mode="wait">

          {/* Loading */}
          {pageState === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={36} className="animate-spin text-emerald-500" />
              <p className="text-slate-500 font-medium text-sm">Verifying reset link…</p>
            </motion.div>
          )}

          {/* Invalid / expired link */}
          {pageState === 'invalid' && (
            <motion.div key="invalid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center p-10 gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle size={30} className="text-red-500" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Link Expired or Invalid</h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                This password reset link is no longer valid. Reset links expire after 1 hour.
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-8 py-3 bg-emerald-950 text-white font-bold rounded-2xl hover:bg-emerald-900 transition-colors"
              >
                Back to Homepage
              </button>
            </motion.div>
          )}

          {/* Password reset form */}
          {pageState === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-emerald-50 rounded-[1.25rem] flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                  <Lock size={26} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Set New Password</h2>
                <p className="text-slate-500 text-sm">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      className="w-full pl-11 pr-12 py-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 font-medium">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
                      className="w-full pl-11 pr-12 py-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors">
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium">
                      <AlertCircle size={16} className="shrink-0" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-950 text-white rounded-2xl font-bold text-base shadow-[0_8px_20px_-6px_rgba(2,44,34,0.4)] hover:bg-emerald-900 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-70 mt-2"
                >
                  {isSubmitting ? <Loader2 size={22} className="animate-spin" /> : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Success */}
          {pageState === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center p-10 gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400 blur-[40px] opacity-25 rounded-full" />
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center relative z-10">
                  <CheckCircle2 size={38} className="text-emerald-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Password Updated!</h2>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="mt-2 px-10 py-3.5 bg-emerald-950 text-white font-bold rounded-2xl hover:bg-emerald-900 transition-all hover:-translate-y-0.5 shadow-[0_8px_20px_-6px_rgba(2,44,34,0.4)]"
              >
                Sign In
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
