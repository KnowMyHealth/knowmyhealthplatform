'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [isSignIn, setIsSignIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({ name: '', email: '', password: '' });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', password: '' };
    setAuthError(null);
    setAuthSuccess(null);

    if (!isSignIn && !formData.name.trim()) {
      newErrors.name = 'Full Name is required';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isSignIn) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        
        // Fetch role from metadata or default to Patient
        const role = data.user?.user_metadata?.role || 'Patient';
        login(role);
        setFormData({ name: '', email: '', password: '' });
        onClose();

      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              role: 'Patient', // By default, standard users are patients
            }
          }
        });

        if (error) throw error;
        
        // Supabase might require email confirmation based on your settings
        if (data.session) {
          login('Patient');
          setFormData({ name: '', email: '', password: '' });
          onClose();
        } else {
          setAuthSuccess('Registration successful! Please check your email to verify your account.');
          setFormData({ name: '', email: '', password: '' });
        }
      }
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignIn(!isSignIn);
    setErrors({ name: '', email: '', password: '' });
    setAuthError(null);
    setAuthSuccess(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[440px] bg-white rounded-[2rem] shadow-2xl p-8 overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-8 mt-2">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                {isSignIn ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-gray-500 font-medium">
                {isSignIn ? 'Sign in to access your healthcare dashboard' : 'Join Know My Health to manage your healthcare'}
              </p>
            </div>

            {/* Error / Success Messages */}
            {authError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-600">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{authError}</p>
              </div>
            )}
            
            {authSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-600">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{authSuccess}</p>
              </div>
            )}

            {/* Form */}
            <div className="space-y-5">
              {!isSignIn && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Full Name</label>
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.name ? 'text-red-400' : 'text-gray-400'}`} size={20} />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-2xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 ${
                        errors.name 
                          ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' 
                          : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 mt-2 font-medium">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.email ? 'text-red-400' : 'text-gray-400'}`} size={20} />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-2xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 ${
                      errors.email 
                        ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' 
                        : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-2 font-medium">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Password</label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.password ? 'text-red-400' : 'text-gray-400'}`} size={20} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-2xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 ${
                      errors.password 
                        ? 'border-red-300 focus:ring-4 focus:ring-red-500/10 focus:border-red-500' 
                        : 'border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {errors.password ? (
                  <p className="text-xs text-red-500 mt-2 font-medium">{errors.password}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2 font-medium">Must be at least 8 characters long</p>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full mt-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-[0_8px_20px_-6px_rgba(5,150,105,0.4)] hover:bg-emerald-700 hover:shadow-[0_12px_25px_-6px_rgba(5,150,105,0.5)] transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                isSignIn ? 'Sign In' : 'Sign Up'
              )}
            </button>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-500 font-medium">
                {isSignIn ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={toggleMode}
                  disabled={isLoading}
                  className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                >
                  {isSignIn ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}