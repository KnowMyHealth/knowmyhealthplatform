'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, X, Activity } from 'lucide-react';

export default function StickyCallback() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Sticky Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-[500px]">
        <div className="bg-[#eef2f0] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-emerald-100/50 p-2 flex items-center justify-between">
          <div className="flex items-center pl-3 pr-2 shrink-0">
            <div className="bg-[#00875a] text-white p-1.5 rounded-full">
              <Activity size={18} />
            </div>
            <div className="ml-2 hidden sm:flex flex-col">
              <span className="text-[10px] font-bold text-[#00875a] leading-none tracking-wider">KNOW MY</span>
              <span className="text-[12px] font-bold text-[#00875a] leading-none">HEALTH</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsOpen(true)}
            className="flex-1 mx-2 bg-white rounded-full py-2.5 px-5 text-left text-gray-500 text-sm shadow-sm hover:shadow transition-shadow border border-gray-100"
          >
            Get a call back
          </button>

          <a 
            href="tel:+917892934391" 
            className="w-11 h-11 bg-[#00875a] rounded-full flex items-center justify-center text-white hover:bg-[#006b47] transition-colors shrink-0 shadow-md"
          >
            <Phone size={20} className="fill-current" />
          </a>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 z-10"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-6">
                <h3 className="text-[#00875a] font-semibold text-lg sm:text-xl mb-1">Call Us</h3>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">+91 78929 34391</p>
              </div>

              <div className="flex items-center my-8">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="px-4 text-gray-400 text-sm font-medium tracking-widest">OR</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              <div>
                <h3 className="text-[#00875a] font-semibold text-lg sm:text-xl mb-2">Request a Callback</h3>
                <p className="text-gray-600 text-sm sm:text-base mb-6">
                  Fill in your details to book an appointment. We&apos;ll reach out to you shortly.
                </p>

                <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => { e.preventDefault(); setIsOpen(false); }}>
                  <input 
                    type="text" 
                    placeholder="Your Name *" 
                    required
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#13b8a6] focus:ring-1 focus:ring-[#13b8a6] transition-all"
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number (10 digits)" 
                    required
                    pattern="[0-9]{10}"
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#13b8a6] focus:ring-1 focus:ring-[#13b8a6] transition-all"
                  />
                  <button 
                    type="submit"
                    className="bg-[#13b8a6] hover:bg-[#0f9688] text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-md whitespace-nowrap"
                  >
                    Submit
                  </button>
                </form>

                <p className="text-xs text-gray-400 mt-6 leading-relaxed">
                  * By submitting, you agree to our T&Cs and Privacy Policy. You may receive a call from us regarding offers or promotions.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
