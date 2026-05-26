'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from './supabase';

interface AuthContextType {
  isLoggedIn: boolean;
  userRole: string | null;
  isLoading: boolean;
  login: (role: string) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchUserProfile = async (token: string) => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data.data?.role;
      }
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // If hash contains access_token (OAuth redirect), let onAuthStateChange handle it
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        // Clear loading once onAuthStateChange fires — don't resolve here
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (session) {
        const role = await fetchUserProfile(session.access_token);
        if (!isMounted) return;
        setUserRole(role);
        setIsLoggedIn(true);
        // Auto-redirect portal roles if landing on homepage
        if (pathname === '/') {
          if (role === 'ADMIN') router.push('/admin');
          else if (role === 'PARTNER') router.push('/partner');
          else if (role === 'DOCTOR') router.push('/doctor');
        }
      }
      if (isMounted) setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const role = await fetchUserProfile(session.access_token);
        if (!isMounted) return;
        if (role) setUserRole(role);
        setIsLoggedIn(true);
        setIsLoading(false);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsAuthModalOpen(false);
          if (role === 'ADMIN') router.push('/admin');
          else if (role === 'PARTNER') router.push('/partner');
          else if (role === 'DOCTOR') router.push('/doctor');
          // PATIENT stays on homepage — modal closes, navbar updates
        }
      } else {
        if (!isMounted) return;
        setIsLoggedIn(false);
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = (role: string) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setIsAuthModalOpen(false);
    if (role === 'ADMIN') router.push('/admin');
    else if (role === 'PARTNER') router.push('/partner');
    else if (role === 'DOCTOR') router.push('/doctor');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserRole(null);
    router.push('/');
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  return (
    <AuthContext.Provider value={{ isLoggedIn, userRole, isLoading, login, logout, isAuthModalOpen, openAuthModal, closeAuthModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}