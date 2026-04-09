'use client';

import { motion } from 'motion/react';
import { HeartPulse, Bell, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function CheckupsPage() {
  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="w-full max-w-7xl mx-auto px-6 py-24 min-h-[80vh] flex flex-col items-center justify-center relative">
        {/* Background decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-500/10 blur-[80px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center max-w-2xl mx-auto flex flex-col items-center"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="w-24 h-24 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl flex items-center justify-center text-emerald-600 mb-8 border border-white"
          >
            <HeartPulse size={48} strokeWidth={1.5} />
          </motion.div>

          <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-bold uppercase tracking-widest rounded-full mb-6">
            Coming Soon
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-emerald-950 mb-6 tracking-tight">
            Full Body Checkups
          </h1>
          
          <p className="text-xl text-emerald-900/60 mb-12 leading-relaxed">
            We&apos;re crafting comprehensive health packages designed to give you a complete picture of your well-being. Our preventive care solutions are almost ready.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center space-x-2 w-full sm:w-auto justify-center">
              <Bell size={20} />
              <span>Notify Me When Live</span>
            </button>
            <Link href="/" className="px-8 py-4 bg-white text-emerald-900 border border-emerald-100 rounded-2xl font-semibold hover:bg-emerald-50 transition-colors flex items-center space-x-2 w-full sm:w-auto justify-center">
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}