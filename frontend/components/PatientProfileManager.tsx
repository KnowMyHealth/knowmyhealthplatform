'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Calendar, Droplet, Phone, MapPin, HeartPulse, Loader2, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

export default function PatientProfileManager() {
  const { isLoggedIn, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const [mode, setMode] = useState<'loading' | 'create' | 'edit'>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'MALE',
    blood_group: '',
    phone_number: '',
    emergency_contact: '',
    address: ''
  });

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const fetchProfile = async (autoOpenOn404: boolean = false) => {
    setMode('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${BACKEND_URL}/api/v1/patients/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setFormData({
            first_name: json.data.first_name || '',
            last_name: json.data.last_name || '',
            date_of_birth: json.data.date_of_birth || '',
            gender: json.data.gender || 'MALE',
            blood_group: json.data.blood_group || '',
            phone_number: json.data.phone_number || '',
            emergency_contact: json.data.emergency_contact || '',
            address: json.data.address || ''
          });
          setMode('edit');
        }
      } else if (res.status === 404) {
        setMode('create');
        if (autoOpenOn404) {
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching patient profile:', error);
    }
  };

  // Automatically check profile status when a PATIENT logs in
  useEffect(() => {
    if (isLoggedIn && userRole === 'PATIENT') {
      fetchProfile(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userRole]);

  // Listen for manual trigger from Navbar (e.g., clicking "My Profile")
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      fetchProfile(false);
    };
    window.addEventListener('open-patient-profile', handleOpen);
    return () => window.removeEventListener('open-patient-profile', handleOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
        setIsSaving(false);
        return;
      }
      const endpoint = mode === 'create' ? '/api/v1/patients/' : '/api/v1/patients/me';
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();

      if (res.ok && (json.success || res.status === 201 || res.status === 200)) {
        setMessage({ type: 'success', text: mode === 'create' ? 'Profile created successfully!' : 'Profile updated successfully!' });
        setMode('edit');
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: json.message || 'Failed to save profile.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-emerald-950/70 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden z-10"
        >
          {/* Left Decorative Panel */}
          <div className="hidden md:flex md:w-[40%] bg-gradient-to-br from-emerald-900 to-teal-950 p-10 flex-col justify-between relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[60px] rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-teal-500/30 blur-[60px] rounded-full" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                <HeartPulse size={32} className="text-emerald-300" />
              </div>
              <h2 className="text-4xl font-black tracking-tight mb-4 leading-tight">
                Your Health <br/>Identity.
              </h2>
              <p className="text-emerald-100/80 text-lg leading-relaxed">
                {mode === 'create' 
                  ? "Welcome to Know My Health! Complete your profile to unlock AI diagnostics, secure prescriptions, and expert consultations."
                  : "Keep your medical profile up to date to ensure our AI and doctors provide the most accurate care."}
              </p>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-white/10 p-5 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Activity size={20} className="text-emerald-400" />
                <span className="font-bold text-emerald-50">Data Security</span>
              </div>
              <p className="text-sm text-emerald-100/60">Your demographic and medical data is encrypted and strictly confidential.</p>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="w-full md:w-[60%] p-8 sm:p-10 lg:p-12 relative max-h-[90vh] overflow-y-auto hide-scrollbar bg-slate-50/50">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={24} />
            </button>

            <div className="mb-8">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                {mode === 'create' ? 'Complete Your Profile' : 'Edit Profile'}
              </h3>
              <p className="text-slate-500 font-medium">Please provide accurate information for your medical records.</p>
            </div>

            {mode === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
                <p className="text-emerald-900/60 font-medium">Loading your profile...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {message && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
                    <p className="text-sm font-bold">{message.text}</p>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900" placeholder="John" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name *</label>
                    <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900" placeholder="Doe" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900 appearance-none">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Blood Group</label>
                    <div className="relative">
                      <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                      <select value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900 appearance-none">
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="tel" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900" placeholder="+1 234 567 8900" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Emergency Contact</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                    <input type="tel" value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900" placeholder="Contact number for emergencies" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Home Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                    <textarea rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900 resize-none" placeholder="Full residential address" />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    {mode === 'create' ? 'Save Profile & Continue' : 'Update Profile'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}