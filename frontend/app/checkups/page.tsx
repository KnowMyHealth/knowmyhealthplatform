'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, X, ChevronDown, ChevronUp, ArrowRight,
  Heart, Activity, Shield, Microscope, Users, Zap,
  HeartPulse, Phone, Mail, User, Loader2, Star, AlertCircle,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface HealthPackage {
  id: string;
  title: string;
  organization: string;
  description: string | null;
  price: number;
  discount_percentage: number;
  included_tests: string[];
  is_active: boolean;
}

/* ─── Category / styling ─────────────────────────────────────────────────── */

type Category = 'Cardiac' | 'Diabetes' | 'Full Body' | 'Cancer' | "Women's Health" | 'Joints';

const CATEGORY_META: Record<Category, {
  icon: any;
  iconBg: string;
  iconText: string;
  catText: string;
  checkBg: string;
  checkText: string;
  headerGradient: string;
}> = {
  Cardiac: {
    icon: Heart,
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    catText: 'text-rose-600',
    checkBg: 'bg-rose-50',
    checkText: 'text-rose-500',
    headerGradient: 'from-rose-50 to-white',
  },
  Diabetes: {
    icon: Activity,
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-600',
    catText: 'text-sky-600',
    checkBg: 'bg-sky-50',
    checkText: 'text-sky-500',
    headerGradient: 'from-sky-50 to-white',
  },
  'Full Body': {
    icon: Shield,
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    catText: 'text-emerald-700',
    checkBg: 'bg-emerald-50',
    checkText: 'text-emerald-600',
    headerGradient: 'from-emerald-50 to-white',
  },
  Cancer: {
    icon: Microscope,
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
    catText: 'text-violet-600',
    checkBg: 'bg-violet-50',
    checkText: 'text-violet-500',
    headerGradient: 'from-violet-50 to-white',
  },
  "Women's Health": {
    icon: Users,
    iconBg: 'bg-pink-100',
    iconText: 'text-pink-600',
    catText: 'text-pink-600',
    checkBg: 'bg-pink-50',
    checkText: 'text-pink-500',
    headerGradient: 'from-pink-50 to-white',
  },
  Joints: {
    icon: Zap,
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    catText: 'text-amber-600',
    checkBg: 'bg-amber-50',
    checkText: 'text-amber-600',
    headerGradient: 'from-amber-50 to-white',
  },
};

const CATEGORIES: Category[] = ['Cardiac', 'Diabetes', 'Full Body', 'Cancer', "Women's Health", 'Joints'];

function getCategory(title: string): Category {
  const t = title.toLowerCase();
  if (t.includes('heart') || t.includes('cardiac') || t.includes('troponin') || t.includes('cpk')) return 'Cardiac';
  if (t.includes('diabet') || t.includes('thyroid') || t.includes('hormon') || t.includes('insulin') || t.includes('hba1c')) return 'Diabetes';
  if (t.includes('cancer') || t.includes('screening') || t.includes('tumor') || t.includes('tumour') || t.includes('psa') || t.includes('oncol')) return 'Cancer';
  if (t.includes('women') || t.includes('female') || t.includes('mammo') || t.includes('papsmear') || t.includes('pap smear') || t.includes('gynae') || t.includes('gynaec')) return "Women's Health";
  if (t.includes('arthrit') || t.includes('joint') || t.includes('uric acid') || t.includes('ra factor') || t.includes('bone')) return 'Joints';
  return 'Full Body';
}

function getBadge(pkg: HealthPackage): string | null {
  const t = pkg.title.toLowerCase();
  if (pkg.price > 20000) return 'Premium';
  if (t.includes('master')) return 'Most Popular';
  if (t.includes('executive')) return 'Best Value';
  if (Math.round(pkg.discount_percentage) >= 38) return 'Best Deal';
  return null;
}

function finalPrice(pkg: HealthPackage) {
  return Math.round(pkg.price - (pkg.price * pkg.discount_percentage) / 100);
}

/* ─── Package Card ───────────────────────────────────────────────────────── */

function PackageCard({ pkg, onEnquire, index }: {
  pkg: HealthPackage; onEnquire: (p: HealthPackage) => void; index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const category = getCategory(pkg.title);
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const badge = getBadge(pkg);
  const isFeatured = badge === 'Most Popular';
  const discount = Math.round(pkg.discount_percentage);
  const fp = finalPrice(pkg);
  const visibleTests = expanded ? pkg.included_tests : pkg.included_tests.slice(0, 5);

  if (isFeatured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ delay: index * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -8, transition: { duration: 0.22 } }}
        className="relative flex flex-col h-full rounded-3xl overflow-hidden border border-emerald-700/60 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 shadow-[0_32px_64px_-20px_rgba(2,44,34,0.6)] group"
      >
        {/* Glows */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-400/10 blur-[90px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-300/5 blur-[70px] rounded-full pointer-events-none" />

        {/* Badge ribbon */}
        <div className="absolute top-6 right-0 bg-white text-emerald-900 text-xs font-extrabold px-4 py-1.5 rounded-l-full shadow-lg tracking-wide flex items-center gap-1.5">
          <Star size={11} className="fill-amber-400 text-amber-400" />
          Most Popular
        </div>

        <div className="relative z-10 p-8 flex-1 flex flex-col">
          {/* Category icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Icon size={22} className="text-teal-300" />
            </div>
            <div>
              <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest">{category}</p>
              <p className="text-white/50 text-xs">{pkg.organization}</p>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-extrabold text-white capitalize leading-tight mb-1">{pkg.title}</h3>
          {pkg.description && <p className="text-emerald-200/40 text-sm mb-5 leading-relaxed">{pkg.description}</p>}

          {/* Pricing */}
          <div className="flex items-end gap-3 mb-6">
            <span className="text-4xl font-black text-white tracking-tight">₹{fp.toLocaleString('en-IN')}</span>
            <div className="mb-1">
              <p className="text-emerald-300/40 text-sm line-through leading-tight">₹{pkg.price.toLocaleString('en-IN')}</p>
              <span className="bg-teal-400/20 text-teal-300 text-xs font-extrabold px-2 py-0.5 rounded-full">{discount}% off</span>
            </div>
          </div>

          <div className="border-t border-white/[0.07] mb-5" />

          {/* Tests */}
          <p className="text-emerald-400/50 text-xs font-bold uppercase tracking-wider mb-3">{pkg.included_tests.length} Tests Included</p>
          <div className="flex-1 space-y-2.5 mb-2">
            <AnimatePresence initial={false}>
              {visibleTests.map((test) => (
                <motion.div key={test}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2.5 overflow-hidden"
                >
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={9} className="text-teal-300" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-emerald-100/75">{test}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {pkg.included_tests.length > 5 && (
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-bold text-teal-300 hover:text-white transition-colors mb-5"
            >
              {expanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> +{pkg.included_tests.length - 5} more tests</>}
            </button>
          )}

          <button onClick={() => onEnquire(pkg)}
            className="mt-auto w-full py-4 rounded-2xl font-bold text-sm bg-white text-emerald-900 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 group/btn shadow-[0_8px_24px_-8px_rgba(255,255,255,0.2)]"
          >
            Enquire Now
            <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </motion.div>
    );
  }

  /* Standard card */
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative flex flex-col h-full rounded-3xl overflow-hidden border border-slate-200/80 bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.07)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.13)] transition-shadow duration-300 group"
    >
      {/* Badge ribbon */}
      {badge && (
        <div className={`absolute top-5 right-0 text-xs font-extrabold px-3.5 py-1.5 rounded-l-full tracking-wide shadow-sm ${
          badge === 'Premium'   ? 'bg-slate-900 text-white' :
          badge === 'Best Value' ? 'bg-teal-700 text-white' :
          badge === 'Best Deal'  ? 'bg-amber-500 text-white' :
          'bg-emerald-800 text-white'
        }`}>
          {badge}
        </div>
      )}

      {/* Gradient header */}
      <div className={`bg-gradient-to-b ${meta.headerGradient} px-7 pt-7 pb-6`}>
        <div className="flex items-center gap-3.5 mb-5">
          <div className={`w-12 h-12 rounded-2xl ${meta.iconBg} flex items-center justify-center shadow-sm`}>
            <Icon size={22} className={meta.iconText} />
          </div>
          <div>
            <p className={`text-xs font-extrabold uppercase tracking-widest ${meta.catText}`}>{category}</p>
            {pkg.organization && <p className="text-slate-400 text-xs font-medium">{pkg.organization}</p>}
          </div>
        </div>

        <h3 className="text-[1.2rem] font-extrabold text-slate-900 capitalize leading-snug group-hover:text-emerald-900 transition-colors">
          {pkg.title}
        </h3>
        {pkg.description && (
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed line-clamp-2">{pkg.description}</p>
        )}
      </div>

      {/* Pricing */}
      <div className="mx-6 -mt-2 mb-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">₹{fp.toLocaleString('en-IN')}</span>
            <span className="text-sm text-slate-400 line-through mb-0.5">₹{pkg.price.toLocaleString('en-IN')}</span>
          </div>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-extrabold px-2.5 py-1 rounded-full">
            {discount}% off
          </span>
        </div>
      </div>

      {/* Tests */}
      <div className="px-6 flex-1">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">{pkg.included_tests.length} Tests Included</p>
        <div className="space-y-2.5 mb-2">
          <AnimatePresence initial={false}>
            {visibleTests.map((test) => (
              <motion.div key={test}
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2.5 overflow-hidden"
              >
                <div className={`w-4 h-4 rounded-full ${meta.checkBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Check size={9} className={meta.checkText} strokeWidth={3} />
                </div>
                <span className="text-sm text-slate-600">{test}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {pkg.included_tests.length > 5 && (
          <button onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-1 text-xs font-bold mt-2 mb-3 transition-colors ${meta.checkText} hover:opacity-70`}
          >
            {expanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> +{pkg.included_tests.length - 5} more tests</>}
          </button>
        )}
      </div>

      {/* CTA */}
      <div className="p-6 pt-4">
        <button onClick={() => onEnquire(pkg)}
          className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-900 text-white hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 group/btn shadow-[0_8px_24px_-8px_rgba(2,44,34,0.35)] hover:shadow-[0_12px_28px_-8px_rgba(2,44,34,0.45)]"
        >
          Enquire Now
          <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Enquire Modal ──────────────────────────────────────────────────────── */

function EnquireModal({ pkg, onClose }: { pkg: HealthPackage; onClose: () => void }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(tomorrowStr);
  const fp = finalPrice(pkg);
  const category = getCategory(pkg.title);
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  const handlePayNow = async () => {
    if (!scheduledDate) { setPaymentError('Please select a scheduled date.'); return; }
    setIsPaying(true);
    setPaymentError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPaymentError('Session expired. Please log in again.');
        setIsPaying(false);
        return;
      }

      // Step 1: Create PENDING booking
      const bookingRes = await fetch(`${BACKEND_URL}/api/v1/health-packages/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ health_package_id: pkg.id, scheduled_date: scheduledDate })
      });
      const bookingJson = await bookingRes.json();
      if (!bookingRes.ok || !bookingJson.data?.id) {
        setPaymentError(bookingJson.message || 'Failed to create booking. Please try again.');
        setIsPaying(false);
        return;
      }
      const bookingId = bookingJson.data.id;

      // Step 2: Create Razorpay order
      const orderRes = await fetch(`${BACKEND_URL}/api/v1/payments/order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          amount: fp,
          booking_type: 'HEALTH_PACKAGE',
          booking_id: bookingId
        })
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.razorpay_order_id) {
        setPaymentError(orderJson.message || 'Payment initiation failed. Please try again.');
        setIsPaying(false);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPaymentError('Failed to load payment gateway. Please check your connection and try again.');
        setIsPaying(false);
        return;
      }
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: orderJson.amount,
        currency: orderJson.currency || 'INR',
        order_id: orderJson.razorpay_order_id,
        name: 'Know My Health',
        description: pkg.title,
        theme: { color: '#059669' },
        handler: async (response: any) => {
          try {
            const { data: { session: verifySession } } = await supabase.auth.getSession();
            const verifyRes = await fetch(`${BACKEND_URL}/api/v1/payments/verify`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${verifySession?.access_token ?? ''}`,
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson.success) {
              setPaymentSuccess(true);
            } else {
              setPaymentError(verifyJson.message || 'Payment verification failed. Contact support.');
            }
          } catch {
            setPaymentError('Payment verification failed due to a network error.');
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentError('Payment was cancelled. Please try again to complete your booking.');
            setIsPaying(false);
          }
        }
      });
      rzp.open();
    } catch {
      setPaymentError('Network error. Please check your connection and try again.');
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm" onClick={!isPaying ? onClose : undefined} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-[0_32px_64px_-20px_rgba(2,44,34,0.35)] overflow-hidden"
      >
        {/* Header */}
        <div className={`bg-gradient-to-b ${meta.headerGradient} px-7 pt-7 pb-6 border-b border-slate-100`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl ${meta.iconBg} flex items-center justify-center`}>
                <Icon size={20} className={meta.iconText} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Book This Package</h3>
                <p className={`text-xs font-bold ${meta.catText}`}>{category} · {pkg.included_tests.length} tests</p>
              </div>
            </div>
            {!isPaying && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                <X size={15} className="text-slate-500" />
              </button>
            )}
          </div>
          <h4 className="mt-4 text-sm font-semibold text-slate-700 capitalize">{pkg.title}</h4>
        </div>

        <div className="p-7">
          {/* Price summary */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-6">
            <div>
              <p className="text-xs text-slate-400 line-through">₹{pkg.price.toLocaleString('en-IN')}</p>
              <p className="text-2xl font-black text-slate-900">₹{fp.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <span className="bg-emerald-100 text-emerald-700 text-sm font-extrabold px-3 py-1 rounded-full">
                {Math.round(pkg.discount_percentage)}% savings
              </span>
            </div>
          </div>

          {paymentSuccess ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
              <div className={`w-16 h-16 rounded-full ${meta.checkBg} flex items-center justify-center mx-auto mb-4`}>
                <Check size={32} className={meta.checkText} strokeWidth={2.5} />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Payment Successful!</h4>
              <p className="text-sm text-slate-500 leading-relaxed capitalize">
                Your booking for <strong className="text-emerald-900">{pkg.title}</strong> is confirmed. Our team will contact you shortly.
              </p>
              <button onClick={onClose}
                className="mt-6 px-8 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-900 hover:bg-emerald-800 transition-colors">
                Done
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Scheduled Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={tomorrowStr}
                  onChange={e => setScheduledDate(e.target.value)}
                  disabled={isPaying}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                />
              </div>
              {paymentError && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  {paymentError}
                </motion.div>
              )}
              <button
                onClick={handlePayNow}
                disabled={isPaying || !scheduledDate}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-900 text-white hover:bg-emerald-800 flex items-center justify-center gap-2 group transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPaying
                  ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  : <>Pay ₹{fp.toLocaleString('en-IN')} & Book <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
                }
              </button>
              <p className="text-xs text-center text-slate-400">Secure payment powered by Razorpay. A confirmation email will be sent after payment.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Filter Bar ─────────────────────────────────────────────────────────── */

function FilterBar({ packages, active, onChange }: {
  packages: HealthPackage[];
  active: string;
  onChange: (c: string) => void;
}) {
  const countFor = (cat: string) => cat === 'All' ? packages.length : packages.filter(p => getCategory(p.title) === cat).length;
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3.5">
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(['All', ...CATEGORIES] as string[]).map(cat => {
            const meta = CATEGORY_META[cat as Category];
            const Icon = meta?.icon;
            const isActive = active === cat;
            const count = countFor(cat);
            return (
              <button key={cat} onClick={() => onChange(cat)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {Icon && <Icon size={13} className={isActive ? 'text-white' : meta.iconText} />}
                {cat}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold tabular-nums ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function CheckupsPage() {
  const [packages, setPackages] = useState<HealthPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [enquiringPkg, setEnquiringPkg] = useState<HealthPackage | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${BACKEND_URL}/api/v1/health-packages?is_active=true&limit=100`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'ngrok-skip-browser-warning': 'true' },
        });
        if (res.ok) {
          const json = await res.json();
          setPackages(json.data?.items ?? json.data ?? []);
        }
      } catch (e) {
        console.error('Failed to load health packages', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = activeCategory === 'All'
    ? packages
    : packages.filter(p => getCategory(p.title) === activeCategory);

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
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  Health Package
                </span>
              </h1>
              <p className="text-lg text-emerald-300/60 max-w-xl mx-auto leading-relaxed">
                Comprehensive health checkups tailored to your wellness needs — designed for proactive care and peace of mind.
              </p>
            </motion.div>

          </div>
        </section>

        {/* ── Filter Bar ───────────────────────────────────────────────── */}
        {!isLoading && packages.length > 0 && (
          <FilterBar packages={packages} active={activeCategory} onChange={setActiveCategory} />
        )}

        {/* ── Package Grid ─────────────────────────────────────────────── */}
        <section className="flex-1 py-16 bg-slate-50/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-emerald-50 blur-[120px] rounded-full pointer-events-none opacity-50" />
          <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-teal-50 blur-[100px] rounded-full pointer-events-none opacity-50" />

          <div className="max-w-7xl mx-auto px-6 relative">
            {isLoading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 size={40} className="animate-spin text-emerald-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-32 text-slate-400 font-medium">No packages in this category.</div>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filtered.map((pkg, i) => (
                    <motion.div key={pkg.id} layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="h-full"
                    >
                      <PackageCard pkg={pkg} onEnquire={setEnquiringPkg} index={i} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
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
                    <HeartPulse size={18} />
                    Get a Free Recommendation
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                <a href="tel:+917892934391"
                  className="group flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/20 text-white rounded-full font-semibold hover:bg-white/15 transition-all">
                  <Phone size={16} />
                  +91 78929 34391
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Enquire Modal ─────────────────────────────────────────── */}
        <AnimatePresence>
          {enquiringPkg && (
            <EnquireModal pkg={enquiringPkg} onClose={() => setEnquiringPkg(null)} />
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
