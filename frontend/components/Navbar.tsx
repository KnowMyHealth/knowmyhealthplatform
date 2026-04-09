'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, LogOut, UserCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '@/lib/AuthContext';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Diagnostics', href: '/diagnostics' },
  { name: 'Checkups', href: '/checkups' },
  { name: 'Prescription', href: '/prescription' },
  { name: 'Complaints', href: '/complaints' },
  { name: 'Insights & Blog', href: '/insights' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  const { isLoggedIn, userRole, logout, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full px-4 pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between px-6 py-3 bg-white/70 backdrop-blur-2xl border border-white/50 rounded-full shadow-[0_20px_40px_-15px_rgba(5,150,105,0.1)]">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-emerald-950 tracking-tight">
              Know My Health
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center space-x-1">
              {(!isLoggedIn || userRole === 'PATIENT') && navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="relative px-4 py-2 text-sm font-medium transition-colors hover:text-emerald-600 text-emerald-900/80"
                  >
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full mx-4"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* CTA & Mobile Toggle */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block relative">
                {isLoggedIn ? (
                  <div className="flex items-center space-x-3">
                    {userRole === 'ADMIN' && (
                      <Link href="/admin" className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg inline-block">
                        Admin Portal
                      </Link>
                    )}
                    {userRole === 'PARTNER' && (
                      <Link href="/partner" className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg inline-block">
                        Partner Portal
                      </Link>
                    )}
                    {userRole === 'PATIENT' && (
                      <Link href="/consultations" className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg inline-block">
                        Consultations
                      </Link>
                    )}
                    <div className="relative" ref={profileDropdownRef}>
                      <button 
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="p-2 text-emerald-700 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors flex items-center justify-center"
                        title="Profile"
                      >
                        <UserCircle size={22} />
                      </button>
                      <AnimatePresence>
                        {isProfileDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden py-2"
                          >
                            <div className="px-4 py-3 border-b border-gray-100 mb-1">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Signed in as</p>
                              <p className="text-sm font-bold text-gray-900 truncate">{userRole}</p>
                            </div>
                            <button 
                              onClick={() => { logout(); setIsProfileDropdownOpen(false); }}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                            >
                              <LogOut size={16} />
                              <span>Log Out</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={openAuthModal}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-full hover:bg-emerald-800 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
                  >
                    <span>Sign Up</span>
                  </button>
                )}
              </div>

              <button 
                className="lg:hidden p-2 text-emerald-950"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="lg:hidden mt-2 p-4 bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl"
              >
                <nav className="flex flex-col space-y-2">
                  {(!isLoggedIn || userRole === 'PATIENT') && navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname === link.href ? 'bg-emerald-100 text-emerald-900' : 'text-emerald-900/80 hover:bg-emerald-50'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                  
                  <div className="pt-4 mt-2 border-t border-emerald-100/50">
                    {isLoggedIn ? (
                      <div className="flex flex-col space-y-2">
                        {userRole === 'ADMIN' && (
                          <Link href="/admin" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center">
                            Admin Portal
                          </Link>
                        )}
                        {userRole === 'PARTNER' && (
                          <Link href="/partner" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center">
                            Partner Portal
                          </Link>
                        )}
                        {userRole === 'PATIENT' && (
                          <Link href="/consultations" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center">
                            Consultations
                          </Link>
                        )}
                        <div className="px-4 py-2 bg-emerald-50 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-emerald-900">
                            <UserCircle size={20} className="text-emerald-600" />
                            <span className="text-sm font-bold">{userRole}</span>
                          </div>
                          <button 
                            onClick={() => { logout(); setIsOpen(false); }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Log Out"
                          >
                            <LogOut size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { openAuthModal(); setIsOpen(false); }}
                        className="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors text-center"
                      >
                        Sign Up
                      </button>
                    )}
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
      />
    </>
  );
}