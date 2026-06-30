'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, X, Activity, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function StickyCallback() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClose = () => {
    setIsOpen(false);
    if (status === 'success') {
      setTimeout(() => { setStatus('idle'); setName(''); setPhone(''); }, 400);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPhone = phone.trim().replace(/\D/g, '');
    if (trimmedPhone.length < 10 || trimmedPhone.length > 15) {
      setErrorMsg('Please enter a valid 10–15 digit phone number.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/callbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ name: name.trim(), phone: trimmedPhone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
      } else {
        throw new Error(data.message || 'Submission failed.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <>
      {/* Sticky Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-[500px]">
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 200, damping: 22 }}
          className="bg-[#eef2f0] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-emerald-100/50 p-2 flex items-center justify-between"
        >
          <div className="flex items-center pl-3 pr-2 shrink-0">
            <div className="bg-[#00875a] text-white p-1.5 rounded-full">
              <Activity size={18} />
            </div>
            <div className="ml-2 hidden sm:flex flex-col">
              <span className="text-[10px] font-bold text-[#00875a] leading-none tracking-wider">KNOW MY</span>
              <span className="text-[12px] font-bold text-[#00875a] leading-none">HEALTH</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(true)}
            className="flex-1 mx-2 bg-white rounded-full py-2.5 px-5 text-left text-gray-500 text-sm shadow-sm hover:shadow transition-shadow border border-gray-100"
          >
            Get a call back
          </motion.button>

          <a
            href="tel:+917892934391"
            className="w-11 h-11 bg-[#00875a] rounded-full flex items-center justify-center text-white hover:bg-[#006b47] transition-colors shrink-0 shadow-md"
          >
            <Phone size={20} className="fill-current" />
          </a>
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 z-10"
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-6">
                <h3 className="text-[#00875a] font-semibold text-lg sm:text-xl mb-1">Call Us</h3>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">+91 80235 65005</p>
              </div>

              <div className="flex items-center my-8">
                <div className="flex-1 border-t border-gray-200" />
                <span className="px-4 text-gray-400 text-sm font-medium tracking-widest">OR</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-6 gap-4"
                  >
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">We&apos;ll call you shortly!</h3>
                    <p className="text-slate-500 text-sm max-w-xs">
                      Your callback request has been submitted. Our team will reach out to you soon.
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-[#00875a] font-semibold text-lg sm:text-xl mb-2">Request a Callback</h3>
                    <p className="text-gray-600 text-sm sm:text-base mb-6">
                      Fill in your details to book an appointment. We&apos;ll reach out to you shortly.
                    </p>

                    <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
                      <input
                        type="text"
                        placeholder="Your Name *"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#13b8a6] focus:ring-1 focus:ring-[#13b8a6] transition-all"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number (10 digits)"
                        required
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); if (status === 'error') setStatus('idle'); }}
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#13b8a6] focus:ring-1 focus:ring-[#13b8a6] transition-all"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={status === 'submitting'}
                        className="bg-[#13b8a6] hover:bg-[#0f9688] text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-md whitespace-nowrap disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {status === 'submitting' ? <Loader2 size={18} className="animate-spin" /> : 'Submit'}
                      </motion.button>
                    </form>

                    {status === 'error' && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 text-sm text-red-600 font-medium"
                      >
                        <AlertCircle size={16} className="shrink-0" /> {errorMsg}
                      </motion.div>
                    )}

                    <p className="text-xs text-gray-400 mt-6 leading-relaxed">
                      * By submitting, you agree to our T&Cs and Privacy Policy. You may receive a call from us regarding offers or promotions.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
