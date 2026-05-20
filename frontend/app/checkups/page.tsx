'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, X, ChevronDown, ChevronUp, ArrowRight,
  Shield, HeartPulse, Phone, Mail, User, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface HealthPackage {
  id: string;
  title: string;
  organization: string;
  description: string | null;
  price: number;               // original / strikethrough price
  discount_percentage: number; // e.g. 22.11
  included_tests: string[];
  is_active: boolean;
}

function finalPrice(pkg: HealthPackage) {
  return Math.round(pkg.price - (pkg.price * pkg.discount_percentage) / 100);
}

/* ─── Package Card ───────────────────────────────────────────────────────── */

function PackageCard({ pkg, onEnquire, index }: { pkg: HealthPackage; onEnquire: (p: HealthPackage) => void; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const discountRounded = Math.round(pkg.discount_percentage);
  const calculatedPrice = finalPrice(pkg);
  const visibleTests = expanded ? pkg.included_tests : pkg.included_tests.slice(0, 5);
  const isFeatured = discountRounded >= 40; // packages with big discounts get the dark card

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className={`relative flex flex-col rounded-[2rem] overflow-hidden border transition-shadow duration-300 ${
        isFeatured
          ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 border-emerald-700 shadow-[0_30px_60px_-20px_rgba(2,44,34,0.5)] text-white'
          : 'bg-white border-slate-100/80 shadow-[0_4px_24px_-4px_rgba(2,44,34,0.06)] hover:shadow-[0_20px_40px_-12px_rgba(2,44,34,0.12)]'
      }`}
    >
      {isFeatured && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/10 blur-[80px] rounded-full pointer-events-none" />
      )}

      <div className="p-6 flex-1 flex flex-col relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          {pkg.organization ? (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              isFeatured ? 'bg-white/10 border-white/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}>
              {pkg.organization}
            </span>
          ) : <span />}
          <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            isFeatured ? 'bg-white text-emerald-800' : 'bg-teal-100 text-teal-700 border border-teal-200'
          }`}>
            {discountRounded}% off
          </span>
        </div>

        {/* Title */}
        <h3 className={`text-lg font-extrabold leading-snug mb-1 capitalize ${isFeatured ? 'text-white' : 'text-emerald-950'}`}>
          {pkg.title}
        </h3>
        {pkg.description && (
          <p className={`text-xs mb-3 leading-relaxed ${isFeatured ? 'text-emerald-200/60' : 'text-slate-400'}`}>{pkg.description}</p>
        )}

        {/* Pricing */}
        <div className="flex items-end gap-2.5 mt-3 mb-5">
          <span className={`text-3xl font-black tracking-tight ${isFeatured ? 'text-white' : 'text-emerald-950'}`}>
            ₹{calculatedPrice.toLocaleString('en-IN')}
          </span>
          <div className="flex flex-col mb-1">
            <span className={`text-xs line-through ${isFeatured ? 'text-emerald-300/60' : 'text-slate-400'}`}>₹{pkg.price.toLocaleString('en-IN')}</span>
            <span className={`text-xs font-extrabold ${isFeatured ? 'text-teal-300' : 'text-emerald-600'}`}>
              save ₹{(pkg.price - calculatedPrice).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t mb-4 ${isFeatured ? 'border-white/10' : 'border-slate-100'}`} />

        {/* Tests */}
        <div className="flex-1 space-y-2.5 mb-3">
          <AnimatePresence initial={false}>
            {visibleTests.map((test) => (
              <motion.div key={test} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isFeatured ? 'bg-white/15' : 'bg-emerald-100'}`}>
                  <Check size={9} className={isFeatured ? 'text-teal-300' : 'text-emerald-600'} strokeWidth={3} />
                </div>
                <span className={`text-sm ${isFeatured ? 'text-emerald-100/80' : 'text-slate-600'}`}>{test}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {pkg.included_tests.length > 5 && (
          <button onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-1 text-xs font-bold mb-4 transition-colors ${isFeatured ? 'text-teal-300 hover:text-white' : 'text-emerald-600 hover:text-emerald-700'}`}>
            {expanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> +{pkg.included_tests.length - 5} more tests</>}
          </button>
        )}

        {/* CTA */}
        <button onClick={() => onEnquire(pkg)}
          className={`w-full mt-auto py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 group/btn ${
            isFeatured
              ? 'bg-white text-emerald-900 hover:bg-emerald-50 shadow-[0_10px_20px_-8px_rgba(255,255,255,0.3)]'
              : 'bg-emerald-900 text-white hover:bg-emerald-950 shadow-[0_8px_16px_-6px_rgba(2,44,34,0.3)]'
          }`}>
          Enquire Now <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Enquire Modal ──────────────────────────────────────────────────────── */

function EnquireModal({ pkg, onClose }: { pkg: HealthPackage; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [submitted, setSubmitted] = useState(false);
  const calculated = finalPrice(pkg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_30px_60px_-20px_rgba(2,44,34,0.4)] overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
        <div className="p-7">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-extrabold text-emerald-950 text-xl leading-tight capitalize">Book This Package</h3>
              <p className="text-sm text-slate-400 mt-1 capitalize">{pkg.title}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-6">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">{pkg.included_tests.length} Tests Included</p>
              <p className="text-xs text-slate-400 line-through">₹{pkg.price.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-950">₹{calculated.toLocaleString('en-IN')}</p>
              <p className="text-xs font-extrabold text-emerald-600">{Math.round(pkg.discount_percentage)}% savings</p>
            </div>
          </div>

          {!submitted ? (
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-3">
              {[
                { icon: User,  key: 'name',  placeholder: 'Your full name *', type: 'text',  required: true },
                { icon: Phone, key: 'phone', placeholder: 'Phone number *',   type: 'tel',   required: true },
                { icon: Mail,  key: 'email', placeholder: 'Email (optional)',  type: 'email', required: false },
              ].map(({ icon: Icon, key, placeholder, type, required }) => (
                <div key={key} className="relative">
                  <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={type} required={required} placeholder={placeholder}
                    value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-slate-400" />
                </div>
              ))}
              <button type="submit"
                className="w-full py-3.5 bg-emerald-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-950 transition-colors shadow-[0_8px_16px_-6px_rgba(2,44,34,0.4)] flex items-center justify-center gap-2 group mt-1">
                Request Callback <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <p className="text-xs text-center text-slate-400">Our health advisor will call you within 30 minutes.</p>
            </form>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-emerald-600" strokeWidth={2.5} />
              </div>
              <h4 className="font-extrabold text-emerald-950 text-lg mb-2">Request Sent!</h4>
              <p className="text-sm text-slate-500 leading-relaxed capitalize">
                We'll call you shortly about the <strong className="text-emerald-900">{pkg.title}</strong>.
              </p>
              <button onClick={onClose}
                className="mt-6 px-8 py-2.5 bg-emerald-900 text-white rounded-xl font-bold text-sm hover:bg-emerald-950 transition-colors">
                Done
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function CheckupsPage() {
  const [packages, setPackages] = useState<HealthPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enquiringPkg, setEnquiringPkg] = useState<HealthPackage | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('supabase_access_token');
        const res = await fetch(`${BACKEND_URL}/api/v1/health-packages?is_active=true&limit=100`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        });
        if (res.ok) {
          const json = await res.json();
          const items = json.data?.items ?? json.data ?? [];
          setPackages(items);
        }
      } catch (e) {
        console.error('Failed to load health packages', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="flex flex-col w-full min-h-screen">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="py-24 bg-emerald-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[900px] bg-emerald-700/10 blur-[120px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-500/10 blur-[100px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/20 mb-6">
                <HeartPulse size={14} className="text-teal-400" />
                <span className="text-sm font-bold tracking-wider text-teal-300 uppercase">
                  {isLoading ? 'Loading…' : `${packages.length} Packages Available`}
                </span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-5">
                Choose Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Health Package</span>
              </h1>
              <p className="text-lg text-emerald-300/60 max-w-xl mx-auto leading-relaxed">
                Comprehensive health checkups tailored to your wellness needs — designed for proactive care and peace of mind.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Package Grid ─────────────────────────────────────────────── */}
        <section className="flex-1 py-16 bg-slate-50/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-emerald-50 blur-[120px] rounded-full pointer-events-none opacity-70" />
          <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-teal-50 blur-[100px] rounded-full pointer-events-none opacity-70" />

          <div className="max-w-7xl mx-auto px-6 relative">
            {isLoading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 size={40} className="animate-spin text-emerald-600" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-32">
                <Shield size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No packages available right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {packages.map((pkg, i) => (
                  <PackageCard key={pkg.id} pkg={pkg} onEnquire={setEnquiringPkg} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────────────────────── */}
        <section className="py-20 bg-emerald-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[700px] bg-emerald-700/10 blur-[120px] pointer-events-none" />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4 tracking-tight">
                Not sure which package is{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">right for you?</span>
              </h2>
              <p className="text-emerald-300/60 mb-10 leading-relaxed">
                Our health advisors will recommend a personalised package based on your age, history, and goals.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {packages.length > 0 && (
                  <button onClick={() => setEnquiringPkg(packages[0])}
                    className="group flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-900 rounded-full font-semibold hover:bg-emerald-50 transition-all shadow-[0_10px_20px_-10px_rgba(255,255,255,0.3)]">
                    <Phone size={16} /> Talk to an Advisor
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
                <Link href="/" className="flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white rounded-full font-semibold hover:bg-white/10 transition-colors">
                  Back to Home
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <AnimatePresence>
          {enquiringPkg && <EnquireModal pkg={enquiringPkg} onClose={() => setEnquiringPkg(null)} />}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
