'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem('supabase_access_token', session.access_token);
        const role = await fetchUserProfile(session.access_token);
        setUserRole(role || 'PATIENT');
        setIsLoggedIn(true);
      }
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        localStorage.setItem('supabase_access_token', session.access_token);
        const role = await fetchUserProfile(session.access_token);
        setUserRole(role || 'PATIENT');
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
        localStorage.removeItem('supabase_access_token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (role: string) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserRole(null);
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