// frontend/app/doctor/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, Calendar, Wallet, 
  Settings, Menu, X, Video, Clock, TrendingUp, 
  LogOut, Star, FileText, Search, 
  ChevronRight, Phone,
  Sparkles, CheckCircle2, ShieldCheck, Stethoscope
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

// --- MOCK DATA ---
const stats = [
  { title: 'Total Patients', value: '1,248', trend: '+12%', isUp: true },
  { title: "Today's Consults", value: '14', trend: '+2', isUp: true },
  { title: 'Monthly Earnings', value: '₹1,45,000', trend: '+8.5%', isUp: true },
  { title: 'Patient Rating', value: '4.9/5', trend: 'Top 5%', isUp: true },
];

const upcomingAppointments = [
  { id: 1, patient: 'Sarah Jenkins', time: '10:00 AM', type: 'Video Consult', status: 'Next', image: 'https://picsum.photos/seed/p1/200/200', condition: 'Routine Follow-up' },
  { id: 2, patient: 'Michael Chen', time: '11:30 AM', type: 'In-Clinic', status: 'Upcoming', image: 'https://picsum.photos/seed/p2/200/200', condition: 'Migraine Assessment' },
  { id: 3, patient: 'Emma Davis', time: '02:15 PM', type: 'Video Consult', status: 'Upcoming', image: 'https://picsum.photos/seed/p3/200/200', condition: 'Post-op Review' },
  { id: 4, patient: 'James Wilson', time: '04:00 PM', type: 'Video Consult', status: 'Upcoming', image: 'https://picsum.photos/seed/p4/200/200', condition: 'Lab Results Discussion' },
];

const recentPatients = [
  { id: 1, name: 'Alice Cooper', lastVisit: 'Oct 12, 2023', condition: 'Hypertension', status: 'Stable' },
  { id: 2, name: 'Marcus Johnson', lastVisit: 'Oct 10, 2023', condition: 'Type 2 Diabetes', status: 'Needs Review' },
  { id: 3, name: 'Priya Sharma', lastVisit: 'Oct 08, 2023', condition: 'Asthma', status: 'Stable' },
];

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', id: 'dashboard' },
  { icon: Calendar, label: 'Appointments', id: 'appointments' },
  { icon: Users, label: 'My Patients', id: 'patients' },
  { icon: Wallet, label: 'Earnings', id: 'earnings' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

const monthlyData = [
  { month: 'Jan', value: 40 },
  { month: 'Feb', value: 70 },
  { month: 'Mar', value: 45 },
  { month: 'Apr', value: 90 },
  { month: 'May', value: 65 },
  { month: 'Jun', value: 85 },
  { month: 'Jul', value: 100 },
  { month: 'Aug', value: 55 },
  { month: 'Sep', value: 75 },
  { month: 'Oct', value: 60 },
  { month: 'Nov', value: 80 },
  { month: 'Dec', value: 50 },
];

export default function DoctorDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [doctorName, setDoctorName] = useState<string | null>(null); 
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchDoctorDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDoctorDetails = async () => {
    let fetchedName = '';

    // 1. Try to get name from local Supabase session immediately
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata) {
      fetchedName = user.user_metadata.full_name || user.user_metadata.name || '';
    }

    // 2. Fetch from backend to ensure we have the most accurate role data
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
          const userData = data.data;
          
          if (userData) {
            fetchedName = userData.full_name || 
                          (userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : '') || 
                          fetchedName;
          }
        }
      } catch (error) {
        console.error("Failed to fetch doctor details from backend", error);
      }
    }

    // Set fallback to "Doctor" if no name is available, so it doesn't get stuck on Loading
    setDoctorName(fetchedName || 'Doctor');
  };

  const getInitials = (name: string | null) => {
    if (!name || name === 'Doctor') return 'DR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatDoctorName = (name: string | null, firstNameOnly = false) => {
    if (!name || name === 'Doctor') return 'Doctor';
    const targetName = firstNameOnly ? name.split(' ')[0] : name;
    if (targetName.toLowerCase().startsWith('dr')) {
      return targetName;
    }
    return `Dr. ${targetName}`;
  };

  // --- TAB RENDERERS ---
  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-emerald-900 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden shadow-xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4 text-emerald-100">
              <Sparkles size={14} className="text-amber-300" />
              <span>Great Day Ahead</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
              Welcome back, {formatDoctorName(doctorName, true)}
            </h2>
            <p className="text-emerald-100/80 text-lg">You have <strong className="text-white">6 appointments</strong> remaining today. Your next patient is waiting in the virtual lobby.</p>
          </div>
          
          <button className="px-6 py-4 bg-white text-emerald-950 rounded-2xl font-bold hover:bg-emerald-50 transition-all shadow-[0_10px_20px_-10px_rgba(255,255,255,0.3)] hover:-translate-y-1 flex items-center gap-2 whitespace-nowrap">
            <Video size={20} className="text-emerald-600" />
            <span>Join Next Consult</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] relative overflow-hidden group">
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

      {/* Today's Appointments (Line by Line) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200/60 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-extrabold text-slate-900">Today&apos;s Schedule</h3>
          <button onClick={() => setActiveTab('appointments')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center">
            View All <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="flex flex-col space-y-4">
          {upcomingAppointments.map((apt) => (
            <div key={apt.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all ${apt.status === 'Next' ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-emerald-100 hover:shadow-sm'}`}>
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0">
                  <Image src={apt.image} alt={apt.patient} fill className="object-cover" />
                  {apt.status === 'Next' && <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{apt.patient}</h4>
                  <p className="text-sm text-slate-500 font-medium">{apt.condition}</p>
                  <div className="flex items-center gap-3 mt-1 sm:hidden">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1"><Clock size={12}/> {apt.time}</span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{apt.type}</span>
                  </div>
                </div>
              </div>
              
              <div className="hidden sm:flex flex-1 flex-col items-center justify-center px-4">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Clock size={14} className="text-emerald-500"/> {apt.time}</span>
                <span className="text-xs font-bold text-slate-500">{apt.type}</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                {apt.type === 'Video Consult' ? (
                  <button className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${apt.status === 'Next' ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700 animate-pulse' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                    <Video size={18} />
                    <span>Join Call</span>
                  </button>
                ) : (
                  <button className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200">
                    <Stethoscope size={18} />
                    <span>Check-in</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderAppointments = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Appointments</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your schedule and upcoming consultations.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search patient..." 
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full sm:w-64"
            />
          </div>
          <button className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
            <Calendar size={20} />
          </button>
        </div>
      </div>

      {/* Calendar/List View Mockup */}
      <div className="p-6 sm:p-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Wednesday, Oct 25 (Today)</h3>
          <div className="grid gap-4">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 rounded-2xl border border-slate-100 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 w-full sm:w-64 shrink-0">
                  <div className="w-12 h-12 bg-slate-100 rounded-full font-bold text-slate-600 flex items-center justify-center shrink-0">
                    {getInitials(apt.patient)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{apt.patient}</h4>
                    <p className="text-xs font-medium text-slate-500">{apt.condition}</p>
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-8">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Clock size={16} className="text-emerald-500" /> {apt.time}
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-700">
                    {apt.type === 'Video Consult' ? <Video size={16} className="text-blue-500" /> : <Users size={16} className="text-amber-500" />}
                    {apt.type}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg hover:bg-emerald-100 transition-colors">
                    {apt.type === 'Video Consult' ? 'Join Call' : 'Start Visit'}
                  </button>
                  <button className="px-3 py-2 bg-slate-50 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors">
                    Reschedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderPatients = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Patient Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Access patient records, history, and active prescriptions.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full sm:w-72"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 pl-8">Patient Name</th>
              <th className="p-4">Primary Condition</th>
              <th className="p-4">Last Visit</th>
              <th className="p-4 pr-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                <td className="p-4 pl-8">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {getInitials(patient.name)}
                    </div>
                    <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{patient.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                    {patient.condition}
                  </span>
                </td>
                <td className="p-4 text-sm font-medium text-slate-600">{patient.lastVisit}</td>
                <td className="p-4 pr-8 text-right">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                    <FileText size={14} /> Records
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] p-6 sm:p-8">
        <h2 className="text-xl font-extrabold text-slate-900 mb-6">Revenue & Analytics</h2>
        
        {/* Improved Chart Area with Months */}
        <div className="h-72 bg-slate-50 rounded-2xl border border-slate-100 flex items-end justify-between px-4 pb-4 pt-12 relative overflow-hidden group">
          <div className="absolute top-4 left-6 text-slate-400 font-bold text-sm">Monthly Earnings Overview</div>
          {monthlyData.map((data, i) => (
            <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group/bar">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${data.value}%` }}
                transition={{ duration: 1, delay: i * 0.05 }}
                className="w-full max-w-[2rem] bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-md relative group-hover/bar:opacity-80 transition-opacity"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity text-[10px] sm:text-xs font-bold text-emerald-700 bg-white px-1.5 py-1 rounded shadow-sm">
                  ₹{data.value}k
                </div>
              </motion.div>
              <span className="text-[10px] sm:text-xs font-medium text-slate-400 mt-2">{data.month}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-slate-200/60 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)]">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Patient Reviews</h3>
          <div className="flex items-center gap-6 mb-6">
            <div className="text-5xl font-black text-slate-900">4.9</div>
            <div>
              <div className="flex gap-1 mb-1">
                {[1,2,3,4,5].map(i => <Star key={i} size={20} className="fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm font-medium text-slate-500">Based on 342 reviews</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { text: "Excellent doctor, very patient and explains everything clearly.", rating: 5 },
              { text: "Video consult was seamless. Highly recommend.", rating: 5 },
            ].map((review, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex gap-0.5 mb-2">
                  {[...Array(review.rating)].map((_, j) => <Star key={j} size={12} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-slate-700 italic">&quot;{review.text}&quot;</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-slate-200/60 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)]">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Transactions</h3>
          <div className="space-y-4">
            {[
              { id: 'TRX-9821', patient: 'Sarah Jenkins', amount: '₹1500', date: 'Today, 10:45 AM' },
              { id: 'TRX-9820', patient: 'Michael Chen', amount: '₹2000', date: 'Yesterday' },
              { id: 'TRX-9819', patient: 'Emma Davis', amount: '₹1500', date: 'Oct 23, 2023' },
            ].map((trx, i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{trx.patient}</p>
                  <p className="text-xs text-slate-500 font-medium">{trx.id} • {trx.date}</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-600">{trx.amount}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 justify-end">
                    <CheckCircle2 size={10} /> Paid
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
          {getInitials(doctorName)}
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Profile Settings</h2>
          <p className="text-sm text-slate-500">Update your public profile and availability.</p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
            <input type="text" defaultValue={formatDoctorName(doctorName)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-900" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consultation Fee (₹)</label>
            <input type="number" defaultValue="1500" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-900" />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Professional Bio</label>
          <textarea rows={4} defaultValue="Experienced specialist with over 10 years of practice..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-900 resize-none" />
        </div>

        <button type="submit" className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20">
          Save Changes
        </button>
      </form>
    </motion.div>
  );

  return (
    <ProtectedRoute requiredRole="DOCTOR">
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
                <ShieldCheck size={18} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Doctor Portal</span>
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

          {/* Quick Action */}
          <div className="p-4 mx-4 mb-4 bg-emerald-900/50 border border-white/5 rounded-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-emerald-500/20"><Stethoscope size={64}/></div>
            <p className="text-sm font-bold text-white mb-1 relative z-10">Need Help?</p>
            <p className="text-xs text-emerald-200/60 mb-3 relative z-10">Contact platform support</p>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors relative z-10 flex justify-center items-center gap-2">
              <Phone size={12}/> Support
            </button>
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
              <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Online & Accepting Calls</span>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-200 pl-4 sm:pl-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    {doctorName === null ? <span className="opacity-50 text-xs font-normal">Loading...</span> : formatDoctorName(doctorName)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Specialist</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 shadow-sm">
                  {getInitials(doctorName)}
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-slate-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="max-w-[1400px] mx-auto">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  {activeTab === 'dashboard' && renderDashboard()}
                  {activeTab === 'appointments' && renderAppointments()}
                  {activeTab === 'patients' && renderPatients()}
                  {activeTab === 'earnings' && renderAnalytics()}
                  {activeTab === 'settings' && renderSettings()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

        </div>
      </div>
    </ProtectedRoute>
  );
}