'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Mail, Lock, Loader2, AlertCircle, 
  Stethoscope, ChevronRight, ChevronLeft, UploadCloud, 
  FileText, CheckCircle2, Briefcase, Phone, GraduationCap,
  Sparkles, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = 'auth' | 'doctor-apply' | 'doctor-success';

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } },
  exit: (direction: number) => ({ x: direction < 0 ? 30 : -30, opacity: 0, scale: 0.98, transition: { duration: 0.3 } })
};

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s-]{10,15}$/;

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const router = useRouter();
  
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

  // Doctor Application States
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [docFormData, setDocFormData] = useState({
    first_name: '', last_name: '', email: '', contact: '', 
    specialization: '', license_id: '', years_of_experience: '', 
    education: '', consultation_fee: '', bio: '', video_consultation_enabled: false
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
        education: '', consultation_fee: '', bio: '', video_consultation_enabled: false
      });
      setDocErrors({});
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

      if (sessionData?.session) {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
          headers: { 
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        
        let role = 'PATIENT';
        if (res.ok) {
          const profileData = await res.json();
          // Ensure exact strict casing match for redirection
          role = String(profileData.data?.role || 'PATIENT').toUpperCase();
        }
        
        login(role);
        onClose();

        // Role-based redirection
        if (role === 'ADMIN') router.push('/admin');
        else if (role === 'PARTNER') router.push('/partner');
        else if (role === 'DOCTOR') router.push('/doctor');

      } else if (!isSignIn) {
        setAuthSuccess('Success! Please check your email to verify your account.'); 
        setFormData({ name: '', email: '', password: '' });
      }
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
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

      const response = await fetch(`${BACKEND_URL}/api/v1/doctors/apply`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        body: payload
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to submit application');

      // Smooth transition to success screen
      setDirection(1);
      setView('doctor-success');

    } catch (error: any) {
      setAuthError(error.message || 'Failed to submit application. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
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
                    className="p-8"
                  >
                    <div className="text-center mb-8 mt-2">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100/50">
                        {isSignIn ? <Lock size={28} /> : <User size={28} />}
                      </div>
                      <h2 className="text-3xl font-extrabold text-emerald-950 mb-3 tracking-tight">
                        {isSignIn ? 'Welcome Back' : 'Create Account'}
                      </h2>
                      <p className="text-emerald-900/60 font-medium">
                        {isSignIn ? 'Sign in to access your healthcare dashboard' : 'Join Know My Health to manage your healthcare'}
                      </p>
                    </div>

                    <div className="space-y-5">
                      <AnimatePresence>
                        {!isSignIn && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Full Name *</label>
                            <div className="relative group">
                              <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-red-400' : 'text-gray-400 group-focus-within:text-emerald-500'}`} size={20} />
                              <input
                                type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 ${errors.name ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'}`}
                              />
                            </div>
                            {errors.name && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.name}</p>}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div>
                        <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Email Address *</label>
                        <div className="relative group">
                          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-red-400' : 'text-gray-400 group-focus-within:text-emerald-500'}`} size={20} />
                          <input
                            type="email" placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 ${errors.email ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'}`}
                          />
                        </div>
                        {errors.email && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-emerald-950 mb-2 uppercase tracking-wide">Password *</label>
                        <div className="relative group">
                          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-red-400' : 'text-gray-400 group-focus-within:text-emerald-500'}`} size={20} />
                          <input
                            type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 ${errors.password ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'}`}
                          />
                        </div>
                        {errors.password ? <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.password}</p> : <p className="text-xs text-gray-400 mt-1.5 font-medium">Must be at least 8 characters long</p>}
                      </div>
                    </div>

                    <button
                      onClick={handleStandardSubmit}
                      disabled={isLoading}
                      className="w-full mt-8 py-4 bg-emerald-950 text-white rounded-2xl font-bold text-lg shadow-[0_8px_20px_-6px_rgba(2,44,34,0.4)] hover:bg-emerald-900 hover:shadow-[0_12px_25px_-6px_rgba(2,44,34,0.5)] transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-70 hover:-translate-y-0.5"
                    >
                      {isLoading ? <Loader2 size={24} className="animate-spin" /> : isSignIn ? 'Sign In' : 'Create Account'}
                    </button>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center flex flex-col space-y-6">
                      <p className="text-gray-500 font-medium">
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
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          className="p-5 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-100/80 rounded-2xl relative overflow-hidden group cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-500/10" 
                          onClick={() => setView('doctor-apply')}
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300/30 blur-[30px] rounded-full group-hover:scale-150 transition-transform duration-700" />
                          <div className="relative z-10 flex flex-col items-center justify-center text-center">
                            <span className="flex items-center text-emerald-950 font-bold mb-1.5 text-base">
                              <Sparkles size={18} className="mr-2 text-emerald-500" />
                              Medical Professional?
                            </span>
                            <span className="text-emerald-600 font-bold text-sm group-hover:text-emerald-700 flex items-center">
                              Apply to join our network <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
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
                            
                            {/* Video Consultation Toggle */}
                            <div className="col-span-1 sm:col-span-2 mt-2 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-emerald-950">Enable Video Consultations</h4>
                                <p className="text-xs text-emerald-900/60 mt-0.5">Allow patients to book online video appointments with you.</p>
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