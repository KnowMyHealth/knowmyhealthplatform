'use client';

import { useAuth } from '@/lib/AuthContext';
import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole }: { children: ReactNode, requiredRole?: string }) {
  const { isLoggedIn, userRole, openAuthModal } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[60vh] w-full">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-emerald-100"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-100/50">
            <Lock size={36} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-extrabold text-emerald-950 mb-3 tracking-tight">Authentication Required</h2>
          <p className="text-emerald-900/60 mb-8 font-medium leading-relaxed">
            Please log in or create an account to access this feature and manage your healthcare journey.
          </p>
          <button 
            onClick={openAuthModal} 
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-[0_8px_20px_-6px_rgba(5,150,105,0.4)] hover:bg-emerald-700 hover:shadow-[0_12px_25px_-6px_rgba(5,150,105,0.5)] transition-all active:scale-[0.98]"
          >
            Sign In / Sign Up
          </button>
        </motion.div>
      </div>
    );
  }

  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[60vh] w-full">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-red-100"
        >
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100/50">
            <Lock size={36} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-extrabold text-red-950 mb-3 tracking-tight">Access Denied</h2>
          <p className="text-red-900/60 mb-8 font-medium leading-relaxed">
            You do not have permission to access this page. Please log in with the correct account type.
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
