'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const returnTo = sessionStorage.getItem('auth_return_to') || '/';
    sessionStorage.removeItem('auth_return_to');
    const t = setTimeout(() => router.replace(returnTo), 500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-emerald-50/30">
      <div className="flex flex-col items-center gap-4 text-emerald-700">
        <Loader2 size={40} className="animate-spin" />
        <p className="font-bold text-sm tracking-wide">Signing you in...</p>
      </div>
    </div>
  );
}
