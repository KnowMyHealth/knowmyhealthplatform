'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Mail, Lock, Loader2, AlertCircle,
  Stethoscope, ChevronRight, ChevronLeft, UploadCloud,
  FileText, CheckCircle2, Briefcase, Phone, GraduationCap,
  Sparkles, ShieldCheck, Video, MapPin
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = 'auth' | 'forgot-password' | 'doctor-apply' | 'doctor-success';

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } },
  exit: (direction: number) => ({ x: direction < 0 ? 30 : -30, opacity: 0, scale: 0.98, transition: { duration: 0.3 } })
};

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s-]{10,15}$/;

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth();

  // Navigation States
  const [view, setView] = useState<ViewState>('auth');
  const [docStep, setDocStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  // Standard Auth States
  const [isSignIn, setIsSignIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({ name: '', email: '', password: '' });

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Doctor Application States
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [docFormData, setDocFormData] = useState({
    first_name: '', last_name: '', email: '', contact: '', 
    specialization: '', license_id: '', years_of_experience: '', 
    education: '', consultation_fee: '', bio: '', video_consultation_enabled: false,
    offline_consultation_enabled: false, clinic_address: ''
  });
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      setView('auth');
      setIsSignIn(false);
      setDocStep(1);
      setDirection(1);
      setDocFile(null);
      setIsDragging(false);
      setAuthError(null);
      setAuthSuccess(null);
      setFormData({ name: '', email: '', password: '' });
      setErrors({ name: '', email: '', password: '' });
      setDocFormData({
        first_name: '', last_name: '', email: '', contact: '', 
        specialization: '', license_id: '', years_of_experience: '', 
        education: '', consultation_fee: '', bio: '', video_consultation_enabled: false,
    offline_consultation_enabled: false, clinic_address: ''
      });
      setDocErrors({});
      setForgotEmail('');
      setForgotSent(false);
      setForgotError(null);
    }
  }, [isOpen]);

  // --- VALIDATION LOGIC ---

  const validateStandardForm = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', password: '' };
    setAuthError(null);
    setAuthSuccess(null);

    if (!isSignIn && !formData.name.trim()) { 
      newErrors.name = 'Full name is required'; 
      isValid = false; 
    } else if (!isSignIn && formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'; 
      isValid = false; 
    }

    if (!formData.email.trim()) { 
      newErrors.email = 'Email is required'; 
      isValid = false; 
    } else if (!EMAIL_REGEX.test(formData.email)) { 
      newErrors.email = 'Please enter a valid email address'; 
      isValid = false; 
    }

    if (!formData.password) { 
      newErrors.password = 'Password is required'; 
      isValid = false; 
    } else if (formData.password.length < 8) { 
      newErrors.password = 'Password must be at least 8 characters'; 
      isValid = false; 
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateDoctorStep = (step: number) => {
    let isValid = true;
    const newErrors: Record<string, string> = {};
    setAuthError(null);

    if (step === 1) {
      if (!docFormData.first_name.trim()) { newErrors.first_name = 'First name is required'; isValid = false; }
      else if (docFormData.first_name.trim().length < 2) { newErrors.first_name = 'Min 2 characters'; isValid = false; }

      if (!docFormData.last_name.trim()) { newErrors.last_name = 'Last name is required'; isValid = false; }
      else if (docFormData.last_name.trim().length < 2) { newErrors.last_name = 'Min 2 characters'; isValid = false; }

      if (!docFormData.email.trim()) { newErrors.email = 'Email is required'; isValid = false; }
      else if (!EMAIL_REGEX.test(docFormData.email)) { newErrors.email = 'Invalid email address'; isValid = false; }

      if (docFormData.contact.trim() && !PHONE_REGEX.test(docFormData.contact)) {
        newErrors.contact = 'Invalid phone format (10-15 digits)'; 
        isValid = false;
      }
    }
    
    if (step === 2) {
      if (!docFormData.specialization.trim()) { newErrors.specialization = 'Specialization is required'; isValid = false; }
      else if (docFormData.specialization.trim().length < 2) { newErrors.specialization = 'Min 2 characters'; isValid = false; }

      if (!docFormData.license_id.trim()) { newErrors.license_id = 'License ID is required'; isValid = false; }
      else if (docFormData.license_id.trim().length < 4) { newErrors.license_id = 'Min 4 characters'; isValid = false; }

      if (docFormData.education.trim() && docFormData.education.trim().length < 2) {
        newErrors.education = 'Min 2 characters if provided';
        isValid = false;
      }

      if (docFormData.years_of_experience) {
        const exp = Number(docFormData.years_of_experience);
        if (isNaN(exp) || exp < 0 || exp > 70) {
          newErrors.years_of_experience = 'Invalid years (0-70)';
          isValid = false;
        }
      }

      if (docFormData.consultation_fee) {
        const fee = Number(docFormData.consultation_fee);
        if (isNaN(fee) || fee < 0) {
          newErrors.consultation_fee = 'Must be a positive number';
          isValid = false;
        }
      }

      if (docFormData.offline_consultation_enabled && !docFormData.clinic_address.trim()) {
        newErrors.clinic_address = 'Clinic address is required for in-person visits';
        isValid = false;
      }
    }

    if (step === 3) {
      if (!docFile) { 
        newErrors.license_file = 'Please upload your medical license (PDF)'; 
        isValid = false; 
      } else if (docFile.type !== 'application/pdf') {
        newErrors.license_file = 'Only PDF files are allowed'; 
        isValid = false; 
      } else if (docFile.size > 5 * 1024 * 1024) {
        newErrors.license_file = 'File size must be under 5MB'; 
        isValid = false; 
      }

      if (docFormData.bio.trim() && docFormData.bio.trim().length > 500) {
        newErrors.bio = 'Bio must be under 500 characters';
        isValid = false;
      }
    }

    setDocErrors(newErrors);
    return isValid;
  };

  // --- HANDLERS ---

  const handleStandardSubmit = async () => {
    if (!validateStandardForm()) return;
    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    let isMounted = true;

    try {
      let sessionData;
      if (isSignIn) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
        if (error) throw error;
        sessionData = data;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email, password: formData.password,
          options: { data: { full_name: formData.name, role: 'PATIENT' } }
        });
        if (error) throw error;

        // Check if the user already exists (Supabase returns an empty identities array for existing emails)
        if (data?.user?.identities && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        sessionData = data;
      }

      if (!isMounted) return;

      if (sessionData?.session) {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });

        if (!isMounted) return;

        let role = 'PATIENT';
        if (res.ok) {
          const profileData = await res.json();
          role = String(profileData.data?.role || 'PATIENT').toUpperCase();
        } else if (isSignIn) {
          throw new Error('Failed to load your account profile. Please try again.');
        }

        login(role);
        onClose();

      } else if (!isSignIn) {
        setAuthSuccess('Success! Please check your email to verify your account.');
        setFormData({ name: '', email: '', password: '' });
      }
    } catch (error: any) {
      if (isMounted) setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      if (isMounted) setIsLoading(false);
      isMounted = false;
    }
  };

  const nextStep = () => {
    if (validateDoctorStep(docStep)) {
      setDirection(1);
      setDocStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setDocStep(prev => prev - 1);
  };

  const handleDoctorSubmit = async () => {
    if (!validateDoctorStep(3)) return;
    setIsLoading(true);
    setAuthError(null);
    let isMounted = true;

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const payload = new FormData();

      payload.append('first_name', docFormData.first_name);
      payload.append('last_name', docFormData.last_name);
      payload.append('email', docFormData.email);
      payload.append('specialization', docFormData.specialization);
      payload.append('license_id', docFormData.license_id);
      if (docFile) payload.append('license_file', docFile);
      if (docFormData.contact) payload.append('contact', docFormData.contact);
      if (docFormData.education) payload.append('education', docFormData.education);
      if (docFormData.years_of_experience) payload.append('years_of_experience', docFormData.years_of_experience);
      if (docFormData.consultation_fee) payload.append('consultation_fee', docFormData.consultation_fee);
      if (docFormData.bio) payload.append('bio', docFormData.bio);
      payload.append('video_consultation_enabled', String(docFormData.video_consultation_enabled));
      payload.append('offline_consultation_enabled', String(docFormData.offline_consultation_enabled));
      if (docFormData.clinic_address) payload.append('clinic_address', docFormData.clinic_address);

      const response = await fetch(`${BACKEND_URL}/api/v1/doctors/apply`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: payload
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to submit application');

      if (!isMounted) return;
      setDirection(1);
      setView('doctor-success');

    } catch (error: any) {
      if (isMounted) setAuthError(error.message || 'Failed to submit application. Please try again later.');
    } finally {
      if (isMounted) setIsLoading(false);
      isMounted = false;
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      setAuthError(error.message || 'Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
    // On success Supabase redirects — loading stays true until page navigates
  };

  const handleForgotPassword = async () => {
    if (isLoading) return;
    setForgotError(null);
    if (!forgotEmail.trim() || !EMAIL_REGEX.test(forgotEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    let isMounted = true;
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo });
      if (error) throw error;
      if (isMounted) setForgotSent(true);
    } catch (err: any) {
      if (isMounted) setForgotError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      if (isMounted) setIsLoading(false);
      isMounted = false;
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        if (file.size > 5 * 1024 * 1024) {
          setDocErrors({ ...docErrors, license_file: 'File size must be under 5MB' });
        } else {
          setDocFile(file);
          setDocErrors({ ...docErrors, license_file: '' });
        }
      } else {
        setDocErrors({ ...docErrors, license_file: 'Only PDF files are allowed.' });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setDocErrors({ ...docErrors, license_file: 'File size must be under 5MB' });
      } else {
        setDocFile(file);
        setDocErrors({ ...docErrors, license_file: '' });
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-emerald-950/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`relative w-full bg-white rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[95vh] ${
              view === 'auth' ? 'max-w-[440px]' : 'max-w-2xl'
            }`}
          >
            {/* Close Button */}
            {view !== 'doctor-success' && (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-emerald-950 bg-gray-50 hover:bg-emerald-50 p-2.5 rounded-full transition-all z-50 hover:scale-105 active:scale-95"
              >
                <X size={20} />
              </button>
            )}

            {/* ERROR & SUCCESS TOASTS */}
            <AnimatePresence mode="popLayout">
              {authError && view !== 'doctor-success' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-600 shadow-sm relative z-10">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{authError}</p>
                </motion.div>
              )}
              {authSuccess && view !== 'doctor-success' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="mx-8 mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-600 shadow-sm relative z-10">
                  <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{authSuccess}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <AnimatePresence mode="wait" custom={direction}>

                {/* ======================= STANDARD AUTH VIEW ======================= */}
                {view === 'auth' && (
                  <motion.div
                    key="auth-view"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="px-7 py-6"
                  >
                    <div className="text-center mb-5">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-emerald-100/50">
                        {isSignIn ? <Lock size={22} /> : <User size={22} />}
                      </div>
                      <h2 className="text-2xl font-extrabold text-emerald-950 mb-1 tracking-tight">
                        {isSignIn ? 'Welcome Back' : 'Create Account'}
                      </h2>
                      <p className="text-emerald-900/60 font-medium text-sm">
                        {isSignIn ? 'Sign in to your healthcare dashboard' : 'Manage your healthcare with us'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {!isSignIn && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <label className="block text-[11px] font-bold text-emerald-950 mb-1.5 uppercase tracking-wide">Full Name *</label>
                            <div className="relative group">
                              <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-red-400' : 'text-gray-400 group-focus-within:text-emerald-500'}`} size={18} />
                              <input
                                type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full pl-10 pr-3 py-3 bg-gray-50/50 hover:bg-gray-50 border rounded-xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 text-sm ${errors.name ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'}`}
                              />
                            </div>
                            {errors.name && <p className="text-xs text-red-500 mt-1 font-medium">{errors.name}</p>}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div>
                        <label className="block text-[11px] font-bold text-emerald-950 mb-1.5 uppercase tracking-wide">Email Address *</label>
                        <div className="relative group">
                          <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-red-400' : 'text-gray-400 group-focus-within:text-emerald-500'}`} size={18} />
                          <input
                            type="email" placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full pl-10 pr-3 py-3 bg-gray-50/50 hover:bg-gray-50 border rounded-xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 text-sm ${errors.email ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'}`}
                          />
                        </div>
                        {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-emerald-950 mb-1.5 uppercase tracking-wide">Password *</label>
                        <div className="relative group">
                          <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-red-400' : 'text-gray-400 group-focus-within:text-emerald-500'}`} size={18} />
                          <input
                            type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={`w-full pl-10 pr-3 py-3 bg-gray-50/50 hover:bg-gray-50 border rounded-xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 text-sm ${errors.password ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'}`}
                          />
                        </div>
                        {errors.password ? <p className="text-xs text-red-500 mt-1 font-medium">{errors.password}</p> : !isSignIn && <p className="text-[11px] text-gray-400 mt-1 font-medium">At least 8 characters</p>}
                        {isSignIn && (
                          <div className="text-right mt-1.5">
                            <button
                              type="button"
                              onClick={() => { setDirection(1); setView('forgot-password'); setAuthError(null); }}
                              className="text-xs text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                            >
                              Forgot password?
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleStandardSubmit}
                      disabled={isLoading}
                      className="w-full mt-5 py-3 bg-emerald-950 text-white rounded-xl font-bold shadow-[0_8px_20px_-6px_rgba(2,44,34,0.4)] hover:bg-emerald-900 transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-70"
                    >
                      {isLoading ? <Loader2 size={20} className="animate-spin" /> : isSignIn ? 'Sign In' : 'Create Account'}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">or</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Google Button */}
                    <button
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                      className="w-full py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] flex justify-center items-center gap-2.5 shadow-sm disabled:opacity-60 text-sm"
                    >
                      {isLoading ? <Loader2 size={18} className="animate-spin text-gray-400" /> : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.532 24.552c0-1.636-.132-3.208-.382-4.728H24.48v9.02h12.958c-.558 2.942-2.252 5.44-4.8 7.118v5.918h7.776c4.546-4.186 7.118-10.348 7.118-17.328z" fill="#4285F4"/>
                            <path d="M24.48 48c6.49 0 11.936-2.152 15.914-5.832l-7.776-5.918c-2.152 1.44-4.904 2.29-8.138 2.29-6.258 0-11.558-4.228-13.452-9.908H3.02v6.108C6.98 42.938 15.164 48 24.48 48z" fill="#34A853"/>
                            <path d="M11.028 28.632A14.47 14.47 0 0 1 10.21 24c0-1.608.276-3.168.818-4.632V13.26H3.02A23.952 23.952 0 0 0 .48 24c0 3.876.928 7.546 2.54 10.74l8.008-6.108z" fill="#FBBC05"/>
                            <path d="M24.48 9.556c3.524 0 6.688 1.212 9.174 3.594l6.876-6.876C36.41 2.392 30.968 0 24.48 0 15.164 0 6.98 5.062 3.02 13.26l8.008 6.108c1.894-5.68 7.194-9.812 13.452-9.812z" fill="#EA4335"/>
                          </svg>
                          {isSignIn ? 'Sign in with Google' : 'Sign up with Google'}
                        </>
                      )}
                    </button>

                    <div className="mt-4 pt-4 border-t border-gray-100 text-center space-y-3">
                      <p className="text-gray-500 font-medium text-sm">
                        {isSignIn ? "Don't have an account? " : "Already have an account? "}
                        <button
                          onClick={() => { setIsSignIn(!isSignIn); setErrors({ name: '', email: '', password: '' }); setAuthError(null); setAuthSuccess(null); }}
                          disabled={isLoading}
                          className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors underline underline-offset-4 decoration-2 decoration-emerald-600/30 hover:decoration-emerald-600"
                        >
                          {isSignIn ? 'Sign up' : 'Sign in'}
                        </button>
                      </p>

                      {!isSignIn && (
                        <button
                          onClick={() => setView('doctor-apply')}
                          className="w-full px-4 py-2.5 bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-100 rounded-xl group hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between gap-2"
                        >
                          <span className="flex items-center text-emerald-950 font-bold text-sm">
                            <Sparkles size={15} className="mr-1.5 text-emerald-500" />
                            Medical Professional?
                          </span>
                          <span className="text-emerald-600 font-bold text-xs flex items-center group-hover:text-emerald-700">
                            Apply <ChevronRight size={14} className="ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ======================= FORGOT PASSWORD VIEW ======================= */}
                {view === 'forgot-password' && (
                  <motion.div
                    key="forgot-view"
                    custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    className="p-8"
                  >
                    <button
                      onClick={() => { setDirection(-1); setView('auth'); setForgotEmail(''); setForgotSent(false); setForgotError(null); }}
                      className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-emerald-700 transition-colors mb-8 -ml-1"
                    >
                      <ChevronLeft size={18} /> Back to sign in
                    </button>

                    {!forgotSent ? (
                      <>
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100/50">
                            <Mail size={28} />
                          </div>
                          <h2 className="text-3xl font-extrabold text-emerald-950 mb-3 tracking-tight">Forgot Password?</h2>
                          <p className="text-emerald-900/60 font-medium text-sm leading-relaxed">
                            Enter your email and we&apos;ll send you a link to reset your password.
                          </p>
                        </div>

                        <div className="space-y-5">
                          <div>
                            <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Email Address</label>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                              <input
                                type="email"
                                placeholder="name@example.com"
                                value={forgotEmail}
                                onChange={e => { setForgotEmail(e.target.value); setForgotError(null); }}
                                onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                              />
                            </div>
                            {forgotError && (
                              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                                <AlertCircle size={12} /> {forgotError}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={handleForgotPassword}
                          disabled={isLoading}
                          className="w-full mt-8 py-4 bg-emerald-950 text-white rounded-2xl font-bold text-lg shadow-[0_8px_20px_-6px_rgba(2,44,34,0.4)] hover:bg-emerald-900 transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-70 hover:-translate-y-0.5"
                        >
                          {isLoading ? <Loader2 size={24} className="animate-spin" /> : 'Send Reset Link'}
                        </button>
                      </>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center text-center py-8 gap-5"
                      >
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 size={40} className="text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-extrabold text-emerald-950 mb-2">Check your inbox</h3>
                          <p className="text-emerald-900/60 font-medium text-sm leading-relaxed max-w-xs mx-auto">
                            We sent a password reset link to <strong className="text-emerald-800">{forgotEmail}</strong>. It expires in 1 hour.
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Didn&apos;t receive it?{' '}
                          <button onClick={() => setForgotSent(false)} className="text-emerald-600 font-bold hover:text-emerald-700">
                            Resend
                          </button>
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ======================= DOCTOR APPLICATION WIZARD ======================= */}
                {view === 'doctor-apply' && (
                  <motion.div key="doctor-view" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="flex flex-col h-full p-8">
                    <div className="mb-8 flex items-center space-x-5 border-b border-gray-100 pb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-inner border border-emerald-200/50">
                        <Stethoscope size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">Doctor Application</h2>
                        <p className="text-emerald-900/60 font-medium mt-1">Join our premium healthcare network</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center justify-between mb-10 relative px-2">
                      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1.5 bg-gray-100 -z-10 rounded-full" />
                      <motion.div 
                        className="absolute left-6 top-1/2 -translate-y-1/2 h-1.5 bg-emerald-500 -z-10 rounded-full" 
                        initial={{ width: 0 }}
                        animate={{ width: `calc(${((docStep - 1) / 2) * 100}% - ${docStep === 1 ? '0px' : docStep === 3 ? '3rem' : '1.5rem'})` }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                      
                      {[
                        { num: 1, label: 'Personal' },
                        { num: 2, label: 'Professional' },
                        { num: 3, label: 'Verification' }
                      ].map((step) => (
                        <div key={step.num} className="flex flex-col items-center gap-2.5 bg-white px-2">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border-2 transition-all duration-500 shadow-sm ${docStep >= step.num ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30 scale-110' : 'bg-white border-gray-200 text-gray-400'}`}>
                            {docStep > step.num ? <CheckCircle2 size={22} strokeWidth={3} /> : step.num}
                          </div>
                          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider absolute -bottom-6 ${docStep >= step.num ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 relative overflow-hidden mt-6 pb-2 min-h-[340px]">
                      <AnimatePresence custom={direction} mode="wait">
                        
                        {/* Step 1: Personal Info */}
                        {docStep === 1 && (
                          <motion.div key="d-step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">First Name *</label>
                                <div className="relative group">
                                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                  <input type="text" value={docFormData.first_name} onChange={e => setDocFormData({...docFormData, first_name: e.target.value})} className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.first_name ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="Dr. Sarah" />
                                </div>
                                {docErrors.first_name && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.first_name}</p>}
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Last Name *</label>
                                <input type="text" value={docFormData.last_name} onChange={e => setDocFormData({...docFormData, last_name: e.target.value})} className={`w-full px-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.last_name ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="Jenkins" />
                                {docErrors.last_name && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.last_name}</p>}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Email Address *</label>
                                <div className="relative group">
                                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                  <input type="email" value={docFormData.email} onChange={e => setDocFormData({...docFormData, email: e.target.value})} className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.email ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="doctor@hospital.com" />
                                </div>
                                {docErrors.email && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.email}</p>}
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Phone Number <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                                <div className="relative group">
                                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                  <input type="tel" value={docFormData.contact} onChange={e => setDocFormData({...docFormData, contact: e.target.value})} className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.contact ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="+1 234 567 8900" />
                                </div>
                                {docErrors.contact && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.contact}</p>}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Step 2: Professional Info */}
                        {docStep === 2 && (
                          <motion.div key="d-step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Specialization *</label>
                                <div className="relative group">
                                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                  <input type="text" value={docFormData.specialization} onChange={e => setDocFormData({...docFormData, specialization: e.target.value})} className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.specialization ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="Cardiologist, Neurologist..." />
                                </div>
                                {docErrors.specialization && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.specialization}</p>}
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">License ID *</label>
                                <div className="relative group">
                                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                  <input type="text" value={docFormData.license_id} onChange={e => setDocFormData({...docFormData, license_id: e.target.value})} className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.license_id ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="MED-123456" />
                                </div>
                                {docErrors.license_id && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.license_id}</p>}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Education <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                                <div className="relative group">
                                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                  <input type="text" value={docFormData.education} onChange={e => setDocFormData({...docFormData, education: e.target.value})} className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.education ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="MD, Harvard Medical" />
                                </div>
                                {docErrors.education && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.education}</p>}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Experience</label>
                                  <div className="relative flex items-center">
                                    <input type="number" min="0" max="70" value={docFormData.years_of_experience} onChange={e => setDocFormData({...docFormData, years_of_experience: e.target.value})} className={`w-full pl-4 pr-10 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.years_of_experience ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="10" />
                                    <span className="absolute right-4 text-gray-400 text-sm font-bold">Yrs</span>
                                  </div>
                                  {docErrors.years_of_experience && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.years_of_experience}</p>}
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Consult Fee</label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-4 text-emerald-600/50 font-black text-lg">₹</span>
                                    <input type="number" min="0" value={docFormData.consultation_fee} onChange={e => setDocFormData({...docFormData, consultation_fee: e.target.value})} className={`w-full pl-9 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none font-medium text-gray-900 transition-all ${docErrors.consultation_fee ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`} placeholder="150" />
                                  </div>
                                  {docErrors.consultation_fee && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.consultation_fee}</p>}
                                </div>
                              </div>
                            </div>
                            
                            {/* Consultation Type Toggles */}
                            <div className="space-y-3">
                              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                    <Video size={20} />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-emerald-950">Video Consultations</h4>
                                    <p className="text-xs text-emerald-900/60 mt-0.5">Online video appointments.</p>
                                  </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={docFormData.video_consultation_enabled}
                                    onChange={(e) => setDocFormData({...docFormData, video_consultation_enabled: e.target.checked})}
                                  />
                                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                              </div>

                              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                    <MapPin size={20} />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-emerald-950">In-Person Visits</h4>
                                    <p className="text-xs text-emerald-900/60 mt-0.5">Patients visit your clinic.</p>
                                  </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={docFormData.offline_consultation_enabled}
                                    onChange={(e) => setDocFormData({...docFormData, offline_consultation_enabled: e.target.checked, ...(e.target.checked ? {} : { clinic_address: '' })})}
                                  />
                                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                              </div>

                              <AnimatePresence>
                                {docFormData.offline_consultation_enabled && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <label className="block text-[11px] font-bold text-emerald-950 mb-1.5 mt-1 uppercase tracking-wide">Clinic Address *</label>
                                    <div className="relative group">
                                      <MapPin className={`absolute left-3.5 top-4 transition-colors ${docErrors.clinic_address ? 'text-red-400' : 'text-emerald-600/50 group-focus-within:text-emerald-500'}`} size={18} />
                                      <textarea
                                        value={docFormData.clinic_address}
                                        onChange={e => setDocFormData({...docFormData, clinic_address: e.target.value})}
                                        rows={2}
                                        placeholder="123 Health Ave, Medical District, City"
                                        className={`w-full pl-10 pr-3 py-3 bg-gray-50/50 hover:bg-gray-50 border rounded-xl outline-none font-medium text-gray-900 transition-all text-sm resize-none ${docErrors.clinic_address ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`}
                                      />
                                    </div>
                                    {docErrors.clinic_address && <p className="text-xs text-red-500 mt-1 font-medium">{docErrors.clinic_address}</p>}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}

                        {/* Step 3: Verification & Bio */}
                        {docStep === 3 && (
                          <motion.div key="d-step3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
                            <div>
                              <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Professional License (PDF) *</label>
                              <label 
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleFileDrop}
                                className={`relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-3xl cursor-pointer transition-all overflow-hidden ${
                                  isDragging 
                                    ? 'border-emerald-500 bg-emerald-50/50 scale-[1.02]' 
                                    : docErrors.license_file 
                                      ? 'border-red-300 bg-red-50/30' 
                                      : docFile 
                                        ? 'border-emerald-300 bg-emerald-50/30' 
                                        : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 hover:border-emerald-300'
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                  {docFile ? (
                                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                                      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                                        <FileText className="w-7 h-7 text-emerald-600" />
                                      </div>
                                      <p className="text-base font-bold text-emerald-950 truncate max-w-[300px]">{docFile.name}</p>
                                      <p className="text-xs text-emerald-600 font-bold mt-2 bg-white px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                                        {(docFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                                      </p>
                                    </motion.div>
                                  ) : (
                                    <>
                                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${isDragging ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 shadow-sm border border-gray-100'}`}>
                                        <UploadCloud className="w-7 h-7" />
                                      </div>
                                      <p className="text-base text-gray-600 font-medium mb-1">
                                        <span className="text-emerald-600 font-bold">Click to upload</span> or drag and drop
                                      </p>
                                      <p className="text-xs text-gray-400 font-medium">Only PDF formats supported (Max 5MB)</p>
                                    </>
                                  )}
                                </div>
                                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                              </label>
                              {docErrors.license_file && <p className="text-xs text-red-500 mt-2 font-medium">{docErrors.license_file}</p>}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Professional Bio <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                              <textarea
                                value={docFormData.bio}
                                onChange={(e) => setDocFormData({ ...docFormData, bio: e.target.value })}
                                rows={3}
                                className={`w-full px-5 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none transition-all text-sm font-medium resize-none ${docErrors.bio ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white'}`}
                                placeholder="Briefly describe your background, philosophy of care, and notable achievements..."
                              />
                              {docErrors.bio && <p className="text-xs text-red-500 mt-1.5 font-medium">{docErrors.bio}</p>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="pt-8 border-t border-gray-100 flex items-center justify-between mt-auto">
                      <button
                        onClick={() => docStep === 1 ? setView('auth') : prevStep()}
                        className="px-6 py-4 text-gray-500 font-bold hover:bg-gray-100 hover:text-gray-900 rounded-2xl transition-colors flex items-center"
                        disabled={isLoading}
                      >
                        {docStep === 1 ? 'Cancel' : <><ChevronLeft size={20} className="mr-1.5" /> Back</>}
                      </button>

                      {docStep < 3 ? (
                        <button
                          onClick={nextStep}
                          className="px-10 py-4 bg-emerald-950 text-white rounded-2xl font-bold shadow-lg shadow-emerald-950/20 hover:bg-emerald-900 hover:shadow-xl hover:shadow-emerald-950/30 transition-all flex items-center hover:-translate-y-0.5"
                        >
                          Next Step <ChevronRight size={20} className="ml-1.5" />
                        </button>
                      ) : (
                        <button
                          onClick={handleDoctorSubmit}
                          disabled={isLoading}
                          className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl font-bold shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          {isLoading ? <Loader2 size={22} className="animate-spin mr-2" /> : <CheckCircle2 size={20} className="mr-2" />}
                          Submit Application
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ======================= DOCTOR SUCCESS VIEW ======================= */}
                {view === 'doctor-success' && (
                  <motion.div 
                    key="success-view"
                    custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    className="flex flex-col items-center justify-center p-12 text-center min-h-[500px]"
                  >
                    <div className="relative mb-10 mt-4">
                      <div className="absolute inset-0 bg-emerald-400 blur-[60px] opacity-30 rounded-full animate-pulse" />
                      <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                        className="w-32 h-32 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center shadow-2xl relative z-10 border-[6px] border-white"
                      >
                        <CheckCircle2 size={64} className="text-white" />
                      </motion.div>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.5, type: 'spring' }}
                        className="absolute -top-6 -right-6 bg-white p-3 rounded-full shadow-xl z-20"
                      >
                        <Sparkles size={28} className="text-amber-400" />
                      </motion.div>
                    </div>
                    
                    <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mb-5 tracking-tight">
                      Application Received!
                    </motion.h2>
                    
                    <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-emerald-900/70 text-lg max-w-md leading-relaxed mb-12">
                      Thank you for applying to <strong className="text-emerald-800">Know My Health</strong>. Our verification team will review your professional license and reach out via email within <strong className="text-emerald-800">24-48 hours</strong>.
                    </motion.p>
                    
                    <motion.button 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                      onClick={onClose}
                      className="w-full sm:w-auto px-12 py-4 bg-emerald-950 text-white rounded-2xl font-bold text-lg shadow-[0_10px_20px_-10px_rgba(2,44,34,0.5)] hover:bg-emerald-900 hover:shadow-[0_15px_25px_-10px_rgba(2,44,34,0.6)] transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      Return to Homepage
                    </motion.button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}