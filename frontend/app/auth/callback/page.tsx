'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const errorParam = url.searchParams.get('error');

      if (errorParam) {
        router.replace('/');
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error('Code exchange failed', error);
      }

      // detectSessionInUrl: true will pick up hash tokens automatically.
      // Either way, wait a tick for onAuthStateChange to fire, then route home.
      router.replace('/');
    };

    handleCallback();
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
