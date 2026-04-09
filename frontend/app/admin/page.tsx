'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, Stethoscope, Building2, 
  Settings, Menu, X, CheckCircle2, XCircle, 
  TrendingUp, LogOut, Sparkles, Activity, CalendarDays,
  ShieldCheck, MapPin, Mail, Clock, FileText, Loader2, ArrowUpRight,
  ExternalLink, Briefcase, DollarSign, ChevronLeft, ChevronRight
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

// --- TYPES ---
interface DoctorListItem {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  status: string;
  created_at: string;
}

interface DoctorDetails extends DoctorListItem {
  email: string;
  bio: string;
  license_id: string;
  license_url: string;
  consultation_fee: number;
  years_of_experience: number;
  user_id: string | null;
}

// --- MOCK DATA FOR OTHER TABS ---
const stats = [
  { title: 'Total Patients', value: '24,592', trend: '+14.5%', isUp: true },
  { title: 'Active Doctors', value: '1,843', trend: '+5.2%', isUp: true },
  { title: 'Partner Labs', value: '428', trend: '+1.2%', isUp: true },
  { title: 'Pending Verifications', value: '38', trend: '-12%', isUp: false },
];

const mockLabs = [
  { id: 1, name: 'Apollo Diagnostics', location: 'New York, NY', tests: 145, status: 'Active' },
  { id: 2, name: 'Metropolis Healthcare', location: 'San Francisco, CA', tests: 89, status: 'Active' },
];

const mockPatients = [
  { id: 1, name: 'Alice Cooper', email: 'alice.c@example.com', joined: 'Oct 12, 2023', consults: 4 },
  { id: 2, name: 'Marcus Johnson', email: 'marcus.j@example.com', joined: 'Oct 15, 2023', consults: 1 },
];

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Stethoscope, label: 'Doctors', id: 'doctors' },
  { icon: Building2, label: 'Partner Labs', id: 'labs' },
  { icon: Users, label: 'Patients', id: 'patients' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

export default function AdminPortal() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminName, setAdminName] = useState<string>(''); 
  const { logout } = useAuth();

  // API States
  const [allDoctors, setAllDoctors] = useState<DoctorListItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  
  // Pagination & Filtering
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Doctor Details Panel States
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDetails | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchAdminDetails();
    fetchAllDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset to page 1 whenever the filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const fetchAdminDetails = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
          headers: { 
            Authorization: `Bearer ${session.access_token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.full_name) {
            setAdminName(data.data.full_name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch admin details", error);
      }
    }
  };

  const fetchAllDoctors = async () => {
    setIsLoadingDocs(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/doctors`, {
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const json = await res.json();
        setAllDoctors(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch doctors", error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleViewDoctorDetails = async (id: string) => {
    setIsPanelOpen(true);
    setIsLoadingDetails(true);
    setSelectedDoctor(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/${id}`, {
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedDoctor(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch doctor details", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleApproveDoctor = async (id: string) => {
    setIsApproving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/${id}/approve`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
        }
      });
      
      if (res.ok) {
        await fetchAllDoctors();
        setIsPanelOpen(false);
      } else {
        const errorData = await res.json();
        alert(`Failed to approve: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error approving doctor", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectDoctor = async (id: string) => {
    setIsRejecting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        // Changed to strictly 'REJECTED' to match the Backend Enum
        body: JSON.stringify({ status: 'REJECTED' })
      });
      
      if (res.ok) {
        await fetchAllDoctors();
        setIsPanelOpen(false);
      } else {
        const errorData = await res.json();
        alert(`Failed to reject: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error rejecting doctor", error);
    } finally {
      setIsRejecting(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // --- DERIVED PAGINATION & FILTERING ---
  const filteredDoctors = allDoctors.filter(doc => 
    filterStatus === 'all' ? true : doc.status.toLowerCase() === filterStatus.toLowerCase()
  );
  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / itemsPerPage));
  const paginatedDoctors = filteredDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- TAB RENDERERS ---
  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] relative overflow-hidden group">
            <p className="text-sm font-medium text-slate-500 mb-2">{stat.title}</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
              <span className={`flex items-center text-sm font-bold mb-1 ${stat.isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {stat.isUp ? <TrendingUp size={16} className="mr-1" /> : <TrendingUp size={16} className="mr-1 rotate-180" />}
                {stat.trend}
              </span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200/60 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-extrabold text-slate-900">Recent Applications</h3>
            <button onClick={() => setActiveTab('doctors')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">View All</button>
          </div>
          
          <div className="space-y-4">
            {isLoadingDocs ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : allDoctors.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No applications found.</p>
            ) : (
              allDoctors.slice(0, 4).map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      {getInitials(`${doc.first_name} ${doc.last_name}`)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Dr. {doc.first_name} {doc.last_name}</p>
                      <p className="text-xs text-slate-500 font-medium">{doc.specialization}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleViewDoctorDetails(doc.id)}
                    className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-emerald-950 rounded-[2rem] p-8 shadow-xl relative overflow-hidden h-fit">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-teal-500/20 blur-[30px] rounded-full" />
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-emerald-500/20 blur-[30px] rounded-full" />
          <div className="relative z-10 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles size={14} className="text-emerald-300" />
              <span className="text-emerald-100">AI Assistant</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Automate Tasks</h3>
            <p className="text-sm text-emerald-100/70 mb-6">Generate reports, draft partner emails, or analyze platform growth using AI.</p>
            <button className="w-full py-3 bg-white text-emerald-950 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg">
              Open AI Console
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );

  const renderDoctors = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
      
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            Doctor Management
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">{filteredDoctors.length} Total</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Review, approve, and manage all medical professionals on the platform.</p>
        </div>

        {/* Filters */}
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto hide-scrollbar shrink-0">
          {['all', 'pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-colors whitespace-nowrap ${
                filterStatus === status ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        {isLoadingDocs ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading doctors...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <ShieldCheck size={48} className="mb-4 text-emerald-100" />
            <p className="text-lg font-medium text-slate-600">No doctors found for this filter.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 pl-8">Doctor Info</th>
                <th className="p-4 hidden sm:table-cell">Specialization</th>
                <th className="p-4 hidden md:table-cell">Joined Date</th>
                <th className="p-4 pr-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDoctors.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleViewDoctorDetails(doc.id)}>
                  <td className="p-4 pl-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                        {getInitials(`${doc.first_name} ${doc.last_name}`)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Dr. {doc.first_name} {doc.last_name}</p>
                        <p className="text-xs text-slate-500 font-medium sm:hidden">{doc.specialization}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 border ${
                          doc.status.toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                          doc.status.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                          'bg-red-50 text-red-700 border-red-200/50'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <p className="text-sm font-medium text-slate-700">{doc.specialization}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="text-sm text-slate-600 flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-slate-400" />
                      {formatDate(doc.created_at)}
                    </p>
                  </td>
                  <td className="p-4 pr-8 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleViewDoctorDetails(doc.id); }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      View Details <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-sm text-slate-500 font-medium">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredDoctors.length)} of {filteredDoctors.length}
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderLabs = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">Partner Laboratories</h2>
        <p className="text-sm text-slate-500 mt-1">Manage onboarded diagnostic centers and testing facilities.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 pl-8">Lab Name</th>
              <th className="p-4">Location</th>
              <th className="p-4">Tests Offered</th>
              <th className="p-4 pr-8 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockLabs.map((lab) => (
              <tr key={lab.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 pl-8 font-bold text-slate-900">{lab.name}</td>
                <td className="p-4 text-sm text-slate-500 flex items-center gap-2"><MapPin size={14}/> {lab.location}</td>
                <td className="p-4 text-sm font-medium text-slate-700">{lab.tests} Tests</td>
                <td className="p-4 pr-8 text-right">
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    lab.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                  }`}>
                    {lab.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderPatients = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">Registered Patients</h2>
        <p className="text-sm text-slate-500 mt-1">Overview of patient accounts and platform engagement.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 pl-8">Patient Name</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Joined Date</th>
              <th className="p-4 pr-8 text-right">Total Consults</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 pl-8 font-bold text-slate-900">{patient.name}</td>
                <td className="p-4 text-sm text-slate-500 flex items-center gap-2"><Mail size={14}/> {patient.email}</td>
                <td className="p-4 text-sm font-medium text-slate-700 flex items-center gap-2"><Clock size={14}/> {patient.joined}</td>
                <td className="p-4 pr-8 text-right font-bold text-emerald-600">{patient.consults}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderSettings = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] p-6 sm:p-8 text-center py-20">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
        <Settings size={40} />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">System Settings</h2>
      <p className="text-slate-500">Global configurations, API keys, and notification preferences will be available here.</p>
    </motion.div>
  );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="fixed inset-0 z-[100] flex bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
        
        {/* --- SIDEBAR --- */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        <motion.aside 
          className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-emerald-950 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Logo Area */}
          <div className="h-20 flex items-center px-8 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Activity size={18} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">KnowMyHealth</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-hide">
            <p className="px-4 text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-4 mt-2">Menu</p>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-emerald-900/50 text-white font-medium shadow-inner border border-white/5' 
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400/80 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
              <span>Logout Account</span>
            </button>
          </div>
        </motion.aside>

        {/* --- MAIN CONTENT WRAPPER --- */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          
          {/* Top Header */}
          <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-10 shrink-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-bold text-slate-900 hidden sm:block">
                {navItems.find(item => item.id === activeTab)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    {adminName ? adminName : <span className="opacity-50 text-xs font-normal">Loading...</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">System Admin</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 shadow-sm">
                  {getInitials(adminName)}
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-slate-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="max-w-[1600px] mx-auto">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  {activeTab === 'dashboard' && renderDashboard()}
                  {activeTab === 'doctors' && renderDoctors()}
                  {activeTab === 'labs' && renderLabs()}
                  {activeTab === 'patients' && renderPatients()}
                  {activeTab === 'settings' && renderSettings()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* --- SLIDE OVER PANEL FOR DOCTOR DETAILS --- */}
          <AnimatePresence>
            {isPanelOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsPanelOpen(false)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]"
                />
                <motion.div 
                  initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[120] flex flex-col border-l border-slate-200"
                >
                  {/* Panel Header */}
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <h2 className="text-xl font-bold text-slate-900">Doctor Profile Review</h2>
                    <button onClick={() => setIsPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                    {isLoadingDetails ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p>Loading details...</p>
                      </div>
                    ) : selectedDoctor ? (
                      <div className="space-y-8">
                        {/* Profile Summary */}
                        <div className="flex items-start gap-5">
                          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold shrink-0">
                            {getInitials(`${selectedDoctor.first_name} ${selectedDoctor.last_name}`)}
                          </div>
                          <div className="pt-2">
                            <h3 className="text-2xl font-bold text-slate-900">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</h3>
                            <p className="text-emerald-600 font-semibold">{selectedDoctor.specialization}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                selectedDoctor.status.toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                                selectedDoctor.status.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                                'bg-red-50 text-red-700 border-red-200/50'
                              }`}>
                                {selectedDoctor.status}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                Applied {formatDate(selectedDoctor.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</p>
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              <Mail size={16} className="text-slate-400" /> {selectedDoctor.email}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience</p>
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              <Briefcase size={16} className="text-slate-400" /> {selectedDoctor.years_of_experience} Years
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medical License</p>
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              <ShieldCheck size={16} className="text-slate-400" /> {selectedDoctor.license_id}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation Fee</p>
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              <DollarSign size={16} className="text-slate-400" /> ₹{selectedDoctor.consultation_fee}
                            </p>
                          </div>
                        </div>

                        {/* Bio */}
                        {selectedDoctor.bio && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Professional Bio</p>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-sm text-slate-700 leading-relaxed">{selectedDoctor.bio}</p>
                            </div>
                          </div>
                        )}

                        {/* Documents */}
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Attached Documents</p>
                          <button 
                            onClick={() => window.open(selectedDoctor.license_url, '_blank')}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <FileText size={20} />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-slate-900 group-hover:text-emerald-700">Medical_License.pdf</p>
                                <p className="text-xs text-slate-500">Click to view in new tab</p>
                              </div>
                            </div>
                            <ExternalLink size={20} className="text-slate-400 group-hover:text-emerald-600" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-full text-red-500 font-medium">
                        Failed to load details.
                      </div>
                    )}
                  </div>

                  {/* Panel Actions - Only show for PENDING status */}
                  {selectedDoctor && selectedDoctor.status.toLowerCase() === 'pending' && (
                    <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-4 shrink-0">
                      <button 
                        onClick={() => handleRejectDoctor(selectedDoctor.id)}
                        disabled={isApproving || isRejecting}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {isRejecting ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                        Reject
                      </button>
                      <button 
                        onClick={() => handleApproveDoctor(selectedDoctor.id)}
                        disabled={isApproving || isRejecting}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:scale-100 hover:-translate-y-0.5"
                      >
                        {isApproving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Approve Doctor
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>
      </div>
    </ProtectedRoute>
  );
}