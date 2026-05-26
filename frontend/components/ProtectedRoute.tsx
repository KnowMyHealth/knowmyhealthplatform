'use client';

import { useAuth } from '@/lib/AuthContext';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole }: { children: ReactNode, requiredRole?: string }) {
  const { isLoggedIn, userRole, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!isLoggedIn) {
      router.push('/');
    } else if (requiredRole && userRole !== requiredRole) {
      if (userRole === 'ADMIN') router.push('/admin');
      else if (userRole === 'PARTNER') router.push('/partner');
      else if (userRole === 'DOCTOR') router.push('/doctor');
      else router.push('/');
    }
  }, [mounted, isLoading, isLoggedIn, userRole, requiredRole, router]);

  if (!mounted || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  if (!isLoggedIn || (requiredRole && userRole !== requiredRole)) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return <>{children}</>;
}