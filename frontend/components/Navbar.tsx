'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, X, LogOut, UserCircle, Settings,
  FileText, ExternalLink, Video, MapPin, Loader2, ChevronRight
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '@/lib/AuthContext';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Diagnostics', href: '/diagnostics' },
  { name: 'Checkups', href: '/checkups' },
  { name: 'Prescription', href: '/prescription' },
  { name: 'Complaints', href: '/complaints' },
  { name: 'Insights & Blog', href: '/insights' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [isPrescriptionPanelOpen, setIsPrescriptionPanelOpen] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState<any[]>([]);
  const [doctorsMap, setDoctorsMap] = useState<Record<string, any>>({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { isLoggedIn, userRole, logout, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPrescriptions = async () => {
    setIsLoadingHistory(true);
    try {
      const token = localStorage.getItem('supabase_access_token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

      const [consRes, docRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/v1/consultations/me`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        }),
        fetch(`${BACKEND_URL}/api/v1/doctors/approved?limit=100`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        }),
      ]);

      const [consJson, docJson] = await Promise.all([consRes.json(), docRes.json()]);

      if (docJson.success) {
        const items = Array.isArray(docJson.data) ? docJson.data : (docJson.data?.items ?? []);
        const map: Record<string, any> = {};
        for (const d of items) map[d.id] = d;
        setDoctorsMap(map);
      }

      if (consRes.ok && consJson.success) {
        const completed = (consJson.data as any[])
          .filter(c => c.status === 'COMPLETED')
          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
        setConsultationHistory(completed);
      }
    } catch (e) {
      console.error('Failed to fetch prescription history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openPrescriptionPanel = () => {
    setIsProfileDropdownOpen(false);
    setIsPrescriptionPanelOpen(true);
    fetchPrescriptions();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full px-4 pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between px-6 py-3 bg-white/70 backdrop-blur-2xl border border-white/50 rounded-full shadow-[0_20px_40px_-15px_rgba(5,150,105,0.1)]">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-emerald-950 tracking-tight">
              Know My Health
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center space-x-1">
              {(!isLoggedIn || userRole === 'PATIENT') && navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="relative px-4 py-2 text-sm font-medium transition-colors hover:text-emerald-600 text-emerald-900/80"
                  >
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full mx-4"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* CTA & Mobile Toggle */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block relative">
                {isLoggedIn ? (
                  <div className="flex items-center space-x-3">
                    {userRole === 'ADMIN' && (
                      <Link href="/admin" className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg inline-block">
                        Admin Portal
                      </Link>
                    )}
                    {userRole === 'PARTNER' && (
                      <Link href="/partner" className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg inline-block">
                        Partner Portal
                      </Link>
                    )}
                    {userRole === 'DOCTOR' && (
                      <Link href="/doctor" className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg inline-block">
                        Doctor Portal
                      </Link>
                    )}
                    {userRole === 'PATIENT' && (
                      <Link href="/consultations" className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg inline-block">
                        Consultations
                      </Link>
                    )}

                    <div className="relative" ref={profileDropdownRef}>
                      <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="p-2 text-emerald-700 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors flex items-center justify-center"
                        title="Profile Menu"
                      >
                        <UserCircle size={22} />
                      </button>
                      <AnimatePresence>
                        {isProfileDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden py-2"
                          >
                            <div className="px-4 py-3 border-b border-gray-100 mb-1">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Signed in as</p>
                              <p className="text-sm font-bold text-gray-900 truncate">{userRole ?? 'User'}</p>
                            </div>

                            {userRole === 'PATIENT' && (
                              <>
                                <button
                                  onClick={() => { window.dispatchEvent(new Event('open-patient-profile')); setIsProfileDropdownOpen(false); }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-emerald-900 hover:bg-emerald-50 flex items-center space-x-3 transition-colors"
                                >
                                  <Settings size={16} className="text-emerald-600" />
                                  <span>Edit Profile</span>
                                </button>
                                <button
                                  onClick={openPrescriptionPanel}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-emerald-900 hover:bg-emerald-50 flex items-center justify-between transition-colors"
                                >
                                  <span className="flex items-center gap-3">
                                    <FileText size={16} className="text-emerald-600" />
                                    My Prescriptions
                                  </span>
                                  <ChevronRight size={14} className="text-slate-400" />
                                </button>
                              </>
                            )}

                            <div className="border-t border-gray-100 mt-1 pt-1">
                              <button
                                onClick={() => { logout(); setIsProfileDropdownOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                              >
                                <LogOut size={16} />
                                <span>Log Out</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={openAuthModal}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
                  >
                    <span>Sign Up</span>
                  </button>
                )}
              </div>

              <button
                className="lg:hidden p-2 text-emerald-950"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="lg:hidden mt-2 p-4 bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl"
              >
                <nav className="flex flex-col space-y-2">
                  {(!isLoggedIn || userRole === 'PATIENT') && navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname === link.href ? 'bg-emerald-100 text-emerald-900' : 'text-emerald-900/80 hover:bg-emerald-50'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}

                  <div className="pt-4 mt-2 border-t border-emerald-100/50">
                    {isLoggedIn ? (
                      <div className="flex flex-col space-y-2">
                        {userRole === 'ADMIN' && (
                          <Link href="/admin" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center">
                            Admin Portal
                          </Link>
                        )}
                        {userRole === 'PARTNER' && (
                          <Link href="/partner" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center">
                            Partner Portal
                          </Link>
                        )}
                        {userRole === 'DOCTOR' && (
                          <Link href="/doctor" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center">
                            Doctor Portal
                          </Link>
                        )}
                        {userRole === 'PATIENT' && (
                          <>
                            <Link href="/consultations" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center mb-2">
                              Consultations
                            </Link>
                            <button
                              onClick={() => { window.dispatchEvent(new Event('open-patient-profile')); setIsOpen(false); }}
                              className="w-full px-6 py-3 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <Settings size={16} /> Edit Profile
                            </button>
                            <button
                              onClick={() => { setIsOpen(false); openPrescriptionPanel(); }}
                              className="w-full px-6 py-3 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <FileText size={16} /> My Prescriptions
                            </button>
                          </>
                        )}
                        <div className="px-4 py-2 mt-2 bg-emerald-50 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-emerald-900">
                            <UserCircle size={20} className="text-emerald-600" />
                            <span className="text-sm font-bold">{userRole ?? 'User'}</span>
                          </div>
                          <button
                            onClick={() => { logout(); setIsOpen(false); }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Log Out"
                          >
                            <LogOut size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { openAuthModal(); setIsOpen(false); }}
                        className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center"
                      >
                        Sign Up
                      </button>
                    )}
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />

      {/* Prescriptions Side Panel */}
      <AnimatePresence>
        {isPrescriptionPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-emerald-950/50 backdrop-blur-sm z-[60]"
              onClick={() => setIsPrescriptionPanelOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white z-[70] shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-5 bg-emerald-950 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="absolute top-0 right-0 w-48 h-48 bg-teal-400/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest mb-1">Health Records</p>
                    <h2 className="font-extrabold text-white text-xl tracking-tight">My Prescriptions</h2>
                    {!isLoadingHistory && (
                      <p className="text-emerald-300/60 text-xs mt-1">
                        {consultationHistory.filter(c => c.prescription_url).length} prescription{consultationHistory.filter(c => c.prescription_url).length !== 1 ? 's' : ''} available
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsPrescriptionPanelOpen(false)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <X size={18} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto bg-slate-50/60">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 size={36} className="animate-spin text-emerald-500 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">Loading your records…</p>
                  </div>
                ) : consultationHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center px-8">
                    <div className="w-20 h-20 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-5">
                      <FileText size={32} className="text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-600 text-base mb-1">No prescriptions yet</p>
                    <p className="text-sm text-slate-400 leading-relaxed">Prescriptions issued by your doctor after a consultation will show up here.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {consultationHistory.map((c, i) => {
                      const doc = doctorsMap[c.doctor_id];
                      const doctorName = doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Your Doctor';
                      const specialization = doc?.specialization ?? '';
                      const isOnline = c.consultation_type === 'ONLINE';
                      const date = new Date(c.scheduled_at);
                      const hasPrescription = !!c.prescription_url;

                      return (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                          {/* Card top: doctor info */}
                          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-sm">
                              {doctorName.split(' ').filter(Boolean).map(w => w[0]).slice(1, 3).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-slate-900 text-sm truncate">{doctorName}</p>
                              {specialization && (
                                <p className="text-xs text-emerald-600 font-semibold truncate">{specialization}</p>
                              )}
                            </div>
                            {hasPrescription ? (
                              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                Rx Ready
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-400">
                                No Rx
                              </span>
                            )}
                          </div>

                          {/* Card bottom: meta + CTA */}
                          <div className="flex items-center justify-between px-4 pb-4 gap-3">
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                              <span className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${isOnline ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                {isOnline ? <Video size={11} /> : <MapPin size={11} />}
                                {isOnline ? 'Video' : 'In-Clinic'}
                              </span>
                              <span>
                                {date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span>·</span>
                              <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {hasPrescription ? (
                              <a
                                href={c.prescription_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-emerald-900 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm"
                              >
                                <FileText size={13} />
                                View Rx
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="shrink-0 px-3.5 py-2 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl">
                                Pending
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
