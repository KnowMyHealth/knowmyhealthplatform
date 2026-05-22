'use client';

import { motion } from 'motion/react';
import {
  ArrowRight, Activity, HeartPulse, Stethoscope, FileText, Pill, Brain, Star,
  Building2, Mail, MapPin, Globe, User, CheckCircle2, Shield, Zap, Lock, Phone
} from 'lucide-react';
import Floating3DElements from '@/components/Floating3DElements';
import StickyCallback from '@/components/StickyCallback';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

// ─── Data ────────────────────────────────────────────────────────────────────

const faqs = [
  { q: 'How does the AI prescription analysis work?', a: 'Our AI scans your uploaded prescription, extracts key information like medicines, dosage, and doctor notes, and provides an easy-to-understand summary and insights.' },
  { q: 'Are my medical records secure?', a: 'Yes, we use enterprise-grade encryption to ensure your health data is completely private and secure.' },
  { q: 'Can I book a home sample collection?', a: 'Absolutely. We offer home sample collection for most of our diagnostic tests and full body checkups.' },
  { q: 'How quickly do I get my test reports?', a: 'Most standard test reports are delivered digitally within 24-48 hours.' },
  { q: 'Do you offer online doctor consultations?', a: 'Yes, you can consult with our expert doctors via video or audio calls directly through the platform.' },
  { q: 'Is the AI symptom checker a substitute for a doctor?', a: 'No, the AI symptom checker is for informational purposes and test recommendations. It does not replace professional medical advice.' },
  { q: 'Can I track my health progress over time?', a: 'Yes, our dashboard allows you to track your test results and vital signs over time with easy-to-read charts.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit/debit cards, UPI, net banking, and popular digital wallets.' },
];

const testimonials = [
  { name: 'Sarah Jenkins', role: 'Patient', text: 'The AI prescription vault is a game-changer. I finally understand what my doctor prescribed without having to google every single medicine.', rating: 5 },
  { name: 'David Chen', role: 'Patient', text: 'Booked a full body checkup. The process was seamless, and the home collection was right on time. Highly recommend Know My Health.', rating: 5 },
  { name: 'Priya Sharma', role: 'Patient', text: 'The symptom checker accurately recommended the tests I needed. Saved me a lot of time and anxiety.', rating: 4 },
  { name: 'Arun Mehta', role: 'Patient', text: 'Finally a platform that takes my health seriously. The doctor was thorough and the video consultation was crystal clear.', rating: 5 },
  { name: 'Lisa Park', role: 'Patient', text: 'My prescription was analyzed in seconds. The AI highlighted a potential drug interaction my pharmacist missed. Absolutely brilliant.', rating: 5 },
  { name: 'Ravi Nair', role: 'Patient', text: 'Easy booking, on-time collection, and detailed report. Everything about Know My Health is world-class.', rating: 4 },
];

const PARTNER_TYPES = ['PHARMACY', 'LABORATORY', 'HOSPITAL', 'CLINIC', 'OTHER'] as const;

const defaultPartnerForm = {
  company_name: '', contact_person: '', email: '', phone: '',
  partner_type: '' as typeof PARTNER_TYPES[number] | '',
  address: '', website: '',
};

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const duration = 1600;
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * to));
        if (progress < 1) requestAnimationFrame(tick);
        else setCount(to);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [to]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────

function TestimonialCard({ name, role, text, rating }: typeof testimonials[0]) {
  return (
    <div className="w-[340px] shrink-0 p-7 bg-white border border-slate-100/80 rounded-[2rem] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]">
      <div className="flex gap-1 mb-5">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-slate-700 leading-relaxed mb-7 text-sm line-clamp-4">&ldquo;{text}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {name[0]}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">{name}</p>
          <p className="text-xs text-slate-400 font-medium">{role}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const { isLoggedIn, userRole, isLoading } = useAuth();
  const router = useRouter();
  const [partnerForm, setPartnerForm] = useState(defaultPartnerForm);
  const [partnerStatus, setPartnerStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [partnerError, setPartnerError] = useState('');

  const [cbName, setCbName] = useState('');
  const [cbPhone, setCbPhone] = useState('');
  const [cbStatus, setCbStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPhone = cbPhone.trim().replace(/\D/g, '');
    if (trimmedPhone.length < 10 || trimmedPhone.length > 15) return;
    setCbStatus('submitting');
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${BACKEND_URL}/api/v1/callbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ name: cbName.trim(), phone: trimmedPhone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCbStatus('success');
        setCbName('');
        setCbPhone('');
      } else {
        throw new Error(data.message || 'Submission failed.');
      }
    } catch {
      setCbStatus('error');
    }
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerStatus('submitting');
    setPartnerError('');
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(partnerForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPartnerStatus('success');
        setPartnerForm(defaultPartnerForm);
      } else {
        throw new Error(data.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setPartnerError(err instanceof Error ? err.message : 'Something went wrong.');
      setPartnerStatus('error');
    }
  };

  useEffect(() => {
    if (isLoading || !isLoggedIn) return;
    if (userRole === 'ADMIN') router.push('/admin');
    else if (userRole === 'PARTNER') router.push('/partner');
    else if (userRole === 'DOCTOR') router.push('/doctor');
  }, [isLoggedIn, userRole, isLoading, router]);

  if (!isLoading && isLoggedIn && (userRole === 'ADMIN' || userRole === 'PARTNER' || userRole === 'DOCTOR')) {
    return null;
  }

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
  };

  return (
    <div className="flex flex-col w-full">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-32 overflow-hidden">
        <Floating3DElements />
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-8"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-teal-100/50 border border-teal-200/50 backdrop-blur-md">
              <span className="text-sm font-bold tracking-wider text-teal-700 uppercase">Compassionate Care Through Holistic Approach</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-emerald-950 tracking-tight leading-[1.1]">
              Your Health, Our <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Evidence Based</span> Medicine.
            </h1>
            <p className="text-lg text-emerald-900/70 max-w-xl leading-relaxed">
              Experience the future of healthcare with AI-powered diagnostics, secure record management, and expert consultations all in one premium platform.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button className="group flex items-center space-x-3 px-8 py-4 bg-emerald-900 text-white rounded-full font-semibold hover:bg-emerald-950 transition-all shadow-[0_10px_20px_-10px_rgba(2,44,34,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(2,44,34,0.6)]">
                <span>Provide your Symptoms Now</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-12 p-8 bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] max-w-xl"
            >
              <div className="mb-6">
                <h3 className="text-emerald-700 font-semibold mb-1">Call Us</h3>
                <p className="text-3xl font-extrabold text-slate-900">+91 78929 34391</p>
              </div>
              <div className="relative flex items-center py-4 mb-6">
                <div className="flex-grow border-t border-gray-300/60" />
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OR</span>
                <div className="flex-grow border-t border-gray-300/60" />
              </div>
              <div className="mb-6">
                <h3 className="text-emerald-700 font-semibold text-xl mb-2">Request a Callback</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Fill in your details to book an appointment. We&apos;ll reach out to you shortly.</p>
              </div>
              {cbStatus === 'success' ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 py-4 text-emerald-700 font-bold"
                >
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                  We&apos;ve received your request. We&apos;ll call you shortly!
                </motion.div>
              ) : (
                <form className="space-y-4" onSubmit={handleCallbackSubmit}>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text" placeholder="Your Name *" required
                      value={cbName} onChange={(e) => setCbName(e.target.value)}
                      className="flex-1 min-w-0 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 placeholder:text-gray-400"
                    />
                    <input
                      type="tel" placeholder="Phone Number (10 digits)" required
                      value={cbPhone} onChange={(e) => setCbPhone(e.target.value)}
                      className="flex-1 min-w-0 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 placeholder:text-gray-400"
                    />
                    <button type="submit" disabled={cbStatus === 'submitting'}
                      className="shrink-0 px-6 py-3 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-semibold rounded-xl transition-colors whitespace-nowrap disabled:opacity-70 flex items-center gap-2"
                    >
                      {cbStatus === 'submitting' ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting</> : 'Submit'}
                    </button>
                  </div>
                  {cbStatus === 'error' && (
                    <p className="text-xs text-red-500 font-medium">Something went wrong. Please try again.</p>
                  )}
                  <p className="text-xs text-gray-500 leading-relaxed mt-4">* By submitting, you agree to our T&Cs and Privacy Policy.</p>
                </form>
              )}
            </motion.div>
          </motion.div>
          <div className="hidden lg:block h-full w-full relative" />
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-emerald-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[900px] bg-emerald-700/10 blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-white/[0.06]">
            {[
              { to: 50, suffix: 'k+', label: 'Patients Served' },
              { to: 2, suffix: 'k+', label: 'Registered Doctors' },
              { to: 500, suffix: '+', label: 'Partner Facilities' },
              { to: 24, suffix: 'h', label: 'Report Turnaround' },
            ].map((stat, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-center py-10 lg:py-6 px-6"
              >
                <p className="text-5xl lg:text-6xl font-black text-white tracking-tight tabular-nums">
                  <AnimatedCounter to={stat.to} suffix={stat.suffix} />
                </p>
                <p className="text-emerald-400/60 text-xs font-bold uppercase tracking-[0.15em] mt-3">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services Bento Grid ───────────────────────────────────────────────── */}
      <section className="py-28 relative z-10 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-emerald-50 blur-[120px] rounded-full pointer-events-none opacity-60" />
        <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-teal-50 blur-[100px] rounded-full pointer-events-none opacity-60" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-[0.15em] mb-5">What We Offer</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-emerald-950 leading-tight max-w-2xl">
              Healthcare,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Reimagined</span>
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[260px]"
          >
            {/* Hero card — AI Diagnostics */}
            <motion.div variants={itemVariants} whileHover={{ scale: 1.015 }}
              className="md:col-span-2 lg:col-span-2 row-span-2 p-8 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-[2.5rem] shadow-[0_30px_60px_-20px_rgba(2,44,34,0.5)] relative overflow-hidden group cursor-default"
            >
              {/* Animated concentric rings */}
              <div className="absolute right-8 bottom-10 pointer-events-none">
                <div className="w-52 h-52 rounded-full border border-emerald-400/10 animate-ping" style={{ animationDuration: '3.5s' }} />
                <div className="absolute inset-6 rounded-full border border-emerald-400/15 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.7s' }} />
                <div className="absolute inset-14 rounded-full border border-emerald-300/20 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '1.4s' }} />
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 blur-2xl" />
              </div>
              {/* Ambient glow */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-teal-400/10 blur-[80px] rounded-full group-hover:bg-teal-300/15 transition-colors duration-700 pointer-events-none" />

              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10">
                    <Activity size={28} />
                  </div>
                  <span className="px-3 py-1 bg-emerald-400/15 border border-emerald-300/20 rounded-full text-[11px] font-bold text-emerald-300 uppercase tracking-widest">AI Powered</span>
                </div>
                <div>
                  <h3 className="text-4xl font-extrabold text-white mb-3 leading-tight">AI Diagnostics</h3>
                  <p className="text-emerald-100/70 text-base leading-relaxed max-w-sm">Smart test recommendations based on your unique symptoms. Let our advanced AI guide you to the right diagnostic path instantly.</p>
                  <button className="mt-6 flex items-center gap-2 text-emerald-300 font-bold hover:text-white transition-colors group/btn text-sm">
                    Explore Diagnostics <ArrowRight size={15} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Full Body Checkups */}
            <motion.div variants={itemVariants}
              className="md:col-span-1 lg:col-span-2 row-span-1 p-7 bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-[2.5rem] flex items-center gap-6 relative overflow-hidden group"
            >
              <div className="absolute top-5 right-6 px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-200">Coming Soon</div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-amber-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 relative z-10">
                <HeartPulse size={28} className="animate-pulse" style={{ animationDuration: '2s' }} />
              </div>
              <div className="relative z-10 opacity-80">
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">Full Body Checkups</h3>
                <p className="text-slate-500 text-sm">Comprehensive health packages for all ages.</p>
              </div>
            </motion.div>

            {/* Prescription Vault */}
            <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }}
              className="lg:col-span-1 row-span-1 p-7 bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-100 rounded-[2.5rem] flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute bottom-0 right-0 w-28 h-28 bg-violet-200/50 blur-[40px] rounded-full group-hover:bg-violet-300/60 transition-colors duration-500" />
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform duration-300">
                <FileText size={22} />
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">Prescription Vault</h3>
                <p className="text-slate-500 text-sm">Securely store and analyze your records.</p>
              </div>
            </motion.div>

            {/* Expert Consults */}
            <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }}
              className="lg:col-span-1 row-span-1 p-7 bg-gradient-to-br from-cyan-50 to-teal-50/60 border border-cyan-100 rounded-[2.5rem] flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute bottom-0 right-0 w-28 h-28 bg-teal-200/40 blur-[40px] rounded-full group-hover:bg-teal-300/50 transition-colors duration-500" />
              {/* Pulse ring decoration */}
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300 relative">
                <Stethoscope size={22} />
                <span className="absolute inset-0 rounded-xl ring-2 ring-teal-300 animate-ping opacity-30" style={{ animationDuration: '2.5s' }} />
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">Expert Consults</h3>
                <p className="text-slate-500 text-sm">Connect with top-tier professionals.</p>
              </div>
            </motion.div>

            {/* Pharmacy Integration */}
            <motion.div variants={itemVariants} whileHover={{ y: -6 }}
              className="md:col-span-1 lg:col-span-2 row-span-1 p-7 bg-white border border-slate-100 rounded-[2.5rem] flex items-center gap-6 group relative overflow-hidden shadow-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/0 to-emerald-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 relative z-10">
                <Pill size={28} />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-extrabold text-emerald-950 mb-1">Pharmacy Integration</h3>
                <p className="text-slate-500 text-sm">Order medicines directly from your prescriptions.</p>
              </div>
            </motion.div>

            {/* Mental Wellness */}
            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}
              className="md:col-span-2 lg:col-span-2 row-span-1 p-7 bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-[2.5rem] flex items-center justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(52,211,153,0.08),transparent_60%)] pointer-events-none" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50 mb-4">
                  <Brain size={22} />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-1">Mental Wellness</h3>
                <p className="text-emerald-200/60 text-sm">Holistic approach to your mental health.</p>
              </div>
              <div className="relative hidden sm:flex items-center justify-center w-28 h-28 shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-spin" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-3 rounded-full border-2 border-emerald-400/30 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />
                <div className="absolute inset-6 rounded-full border-2 border-emerald-300/40 animate-spin" style={{ animationDuration: '3s' }} />
                <div className="w-6 h-6 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Why Us ───────────────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden bg-emerald-950">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[600px] h-[600px] bg-emerald-800/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[400px] h-[400px] bg-teal-800/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-bold uppercase tracking-[0.15em] mb-5">Our Promise</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Built on Trust, <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">Powered by Science</span>
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              { num: '01', icon: Shield, title: 'Evidence-Based', desc: 'All AI models and medical advice backed by rigorous scientific research and clinical validation.', color: 'from-emerald-500/20 to-transparent' },
              { num: '02', icon: Lock, title: 'Data Privacy', desc: 'Your health data is encrypted with enterprise-grade security. You own your data — always.', color: 'from-teal-500/20 to-transparent' },
              { num: '03', icon: Zap, title: 'Holistic Approach', desc: 'We look at the complete picture of your health, not just isolated symptoms or data points.', color: 'from-cyan-500/20 to-transparent' },
              { num: '04', icon: Activity, title: '24/7 Support', desc: 'Our AI assistant and medical team are always available when you need them most.', color: 'from-emerald-400/20 to-transparent' },
            ].map(({ num, icon: Icon, title, desc, color }, i) => (
              <motion.div key={i} variants={itemVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                className="relative p-7 rounded-[2rem] bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <span className="absolute -top-3 -right-2 text-[80px] font-black text-white/[0.04] select-none leading-none pointer-events-none">{num}</span>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:bg-emerald-500/20 transition-colors duration-300">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-extrabold text-white mb-3">{title}</h3>
                  <p className="text-emerald-100/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials — Dual Marquee ───────────────────────────────────────── */}
      <section className="py-28 relative z-10 overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/50 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100/50 blur-[80px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 px-6"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-[0.15em] mb-5">Patient Stories</span>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-emerald-950">
            Real People, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Real Results</span>
          </h2>
        </motion.div>

        {/* Row 1 — scrolls left */}
        <div className="flex overflow-hidden mb-5">
          <div className="flex gap-5 px-2 w-max animate-marquee [animation-duration:40s]">
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={i} {...t} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="flex overflow-hidden">
          <div className="flex gap-5 px-2 w-max animate-marquee [animation-duration:45s] [animation-direction:reverse]">
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={`r${i}`} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ — Horizontal Marquee ──────────────────────────────────────────── */}
      <section className="py-24 bg-emerald-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="max-w-[100vw] mx-auto relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl lg:text-5xl font-extrabold mb-4 text-center px-6"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-emerald-200/50 text-center mb-12 px-6"
          >
            Hover to pause • Everything you need to know
          </motion.p>
          <div className="relative flex overflow-hidden group py-4">
            <div className="flex gap-5 px-3 w-max animate-marquee group-hover:[animation-play-state:paused]">
              {[...faqs, ...faqs].map((faq, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setActiveFaq(i)}
                  onMouseLeave={() => setActiveFaq(null)}
                  className={`w-[300px] md:w-[380px] shrink-0 p-8 rounded-[2rem] border transition-all duration-300 cursor-pointer ${
                    activeFaq === i
                      ? 'bg-emerald-500 border-emerald-400 shadow-2xl scale-105'
                      : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
                  }`}
                >
                  <h3 className="text-lg font-bold mb-3">{faq.q}</h3>
                  <p className={`text-sm leading-relaxed ${activeFaq === i ? 'text-emerald-50' : 'text-emerald-200/50'}`}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Partner With Us ───────────────────────────────────────────────────── */}
      <section className="py-28 relative z-10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 overflow-hidden">
        <div className="absolute top-0 left-0 w-[40vw] h-[40vw] bg-teal-400/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[30vw] h-[30vw] bg-emerald-400/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                <span className="text-sm font-bold tracking-wider text-emerald-300 uppercase">Partner Network</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                Grow Together with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">Know My Health</span>
              </h2>
              <p className="text-emerald-100/70 text-lg leading-relaxed">
                Join our growing network of pharmacies, laboratories, hospitals, and clinics. Reach thousands of patients actively seeking quality healthcare services.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Building2, title: 'Pharmacies & Labs', desc: 'Connect with patients needing diagnostics and medicines.' },
                  { icon: Stethoscope, title: 'Hospitals & Clinics', desc: 'Expand your patient base through our platform.' },
                  { icon: Activity, title: 'Wellness Brands', desc: 'Promote preventive care and wellness programs.' },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.div key={title}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-emerald-300" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{title}</p>
                      <p className="text-sm text-emerald-100/50">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[2rem] p-8"
            >
              {partnerStatus === 'success' ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center py-12 gap-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 size={40} className="text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Application Submitted!</h3>
                  <p className="text-emerald-100/70 max-w-xs">Our partnership team will review your application and reach out to you shortly.</p>
                  <button onClick={() => setPartnerStatus('idle')} className="mt-4 px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors">
                    Submit Another
                  </button>
                </motion.div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-white mb-2">Partner Application</h3>
                  <p className="text-emerald-100/50 text-sm mb-8">Fill in your details and we&apos;ll get back to you within 48 hours.</p>
                  <form onSubmit={handlePartnerSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                        <input required minLength={2} placeholder="Company Name *" value={partnerForm.company_name} onChange={e => setPartnerForm(p => ({ ...p, company_name: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-emerald-300/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm" />
                      </div>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                        <input required minLength={2} placeholder="Contact Person *" value={partnerForm.contact_person} onChange={e => setPartnerForm(p => ({ ...p, contact_person: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-emerald-300/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                        <input required type="email" placeholder="Email Address *" value={partnerForm.email} onChange={e => setPartnerForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-emerald-300/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm" />
                      </div>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                        <input required minLength={5} placeholder="Phone Number *" value={partnerForm.phone} onChange={e => setPartnerForm(p => ({ ...p, phone: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-emerald-300/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm" />
                      </div>
                    </div>
                    <select required value={partnerForm.partner_type} onChange={e => setPartnerForm(p => ({ ...p, partner_type: e.target.value as typeof PARTNER_TYPES[number] }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 [&>option]:bg-emerald-950 [&>option]:text-white appearance-none"
                      style={{ color: partnerForm.partner_type ? 'white' : 'rgba(167,243,208,0.3)' }}
                    >
                      <option value="" disabled>Partner Type *</option>
                      {PARTNER_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                    </select>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3.5 top-3.5 text-emerald-400 pointer-events-none" />
                      <textarea required minLength={5} placeholder="Address *" rows={2} value={partnerForm.address} onChange={e => setPartnerForm(p => ({ ...p, address: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-emerald-300/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm resize-none" />
                    </div>
                    <div className="relative">
                      <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                      <input type="url" placeholder="Website (optional)" value={partnerForm.website} onChange={e => setPartnerForm(p => ({ ...p, website: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-emerald-300/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm" />
                    </div>
                    {partnerStatus === 'error' && <p className="text-red-400 text-sm font-medium">{partnerError}</p>}
                    <button type="submit" disabled={partnerStatus === 'submitting'}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {partnerStatus === 'submitting' ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                      ) : 'Submit Application'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <StickyCallback />
    </div>
  );
}
