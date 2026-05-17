// frontend/app/doctor/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, Calendar, Wallet, 
  Settings, Menu, X, Video, Clock, TrendingUp, 
  LogOut, Star, FileText, Search, 
  ChevronRight, Phone, MessageSquare, Mic, MicOff, VideoOff, XCircle,
  Sparkles, CheckCircle2, ShieldCheck, Stethoscope, Loader2, AlertCircle, Save
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

interface Consultation {
  id: string;
  patient_user_id: string;
  doctor_id: string;
  scheduled_at: string;
  status: string;
  channel_name: string;
}

interface DayAvailability {
  day_of_week: number;
  active: boolean;
  start_time: string;
  end_time: string;
}

const stats = [
  { title: 'Total Patients', value: '1,248', trend: '+12%', isUp: true },
  { title: "Today's Consults", value: '14', trend: '+2', isUp: true },
  { title: 'Monthly Earnings', value: '₹1,45,000', trend: '+8.5%', isUp: true },
  { title: 'Patient Rating', value: '4.9/5', trend: 'Top 5%', isUp: true },
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

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- AGORA REAL VIDEO CALL COMPONENTS ---
const RemoteVideo = ({ user }: { user: any }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (user.videoTrack && ref.current) {
      user.videoTrack.play(ref.current);
    }
  }, [user.videoTrack]);
  return <div ref={ref} className="w-full h-full object-cover" />;
};

function VideoCallInterface({ 
  agoraInfo, 
  consultationId, 
  onEndCall, 
  participantName 
}: { 
  agoraInfo: any, 
  consultationId: string, 
  onEndCall: (id: string) => void, 
  participantName: string 
}) {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const [AgoraRTC, setAgoraRTC] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<any>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    import('agora-rtc-sdk-ng').then((mod) => {
      setAgoraRTC(mod.default);
      setClient(mod.default.createClient({ mode: "rtc", codec: "vp8" }));
    });
  }, []);

  useEffect(() => {
    if (!client || !AgoraRTC) return;
    
    let audioTrack: any = null;
    let videoTrack: any = null;

    const initAgora = async () => {
      try {
        client.on("user-joined", () => {
          setRemoteUsers(Array.from(client.remoteUsers));
        });

        client.on("user-published", async (user: any, mediaType: any) => {
          await client.subscribe(user, mediaType);
          setRemoteUsers(Array.from(client.remoteUsers));
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        client.on("user-unpublished", () => {
          setRemoteUsers(Array.from(client.remoteUsers));
        });

        client.on("user-left", () => {
          setRemoteUsers(Array.from(client.remoteUsers));
        });

        const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || "96b6fdb94ffb4ab9ac1fe7c7d358ee71";
        
        await client.join(appId, agoraInfo.channel_name, agoraInfo.token, agoraInfo.uid);
        
        try {
          const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
          audioTrack = tracks[0];
          videoTrack = tracks[1];
          
          setLocalAudioTrack(audioTrack);
          setLocalVideoTrack(videoTrack);
          
          await client.publish([audioTrack, videoTrack]);
        } catch (mediaErr: any) {
          console.error("Media Error:", mediaErr);
          setPermissionError("Camera/Microphone access denied by browser.");
          setIsVideoOff(true);
          setIsMuted(true);
        }

        setIsConnecting(false);
      } catch (err) {
        console.error("Agora Error:", err);
        setIsConnecting(false);
      }
    };

    initAgora();

    return () => {
      if (audioTrack) { audioTrack.stop(); audioTrack.close(); }
      if (videoTrack) { videoTrack.stop(); videoTrack.close(); }
      client.leave();
    };
  }, [client, AgoraRTC, agoraInfo]);

  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && !isVideoOff && !permissionError) {
      localVideoTrack.play(localVideoRef.current);
    }
  }, [localVideoTrack, isVideoOff, permissionError]);

  const toggleAudio = () => {
    if (permissionError) {
      alert("Please allow microphone access in your browser settings to unmute.");
      return;
    }
    if (localAudioTrack) {
      localAudioTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (permissionError) {
      alert("Please allow camera access in your browser settings to turn on video.");
      return;
    }
    if (localVideoTrack) {
      localVideoTrack.setMuted(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="flex-1 relative bg-gray-950">
      <div className="absolute inset-0 flex items-center justify-center">
        {isConnecting ? (
          <div className="flex flex-col items-center justify-center text-emerald-500 z-10 relative">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="text-white font-medium">Connecting to secure server...</p>
          </div>
        ) : remoteUsers.length > 0 ? (
          remoteUsers[0].hasVideo ? (
            <RemoteVideo user={remoteUsers[0]} />
          ) : (
            <div className="flex flex-col items-center justify-center z-10 relative">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 mb-4">
                <VideoOff size={40} />
              </div>
              <p className="text-gray-400 font-medium">{participantName}&apos;s camera is off</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center z-10 relative">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 mb-4">
              <Users size={40} />
            </div>
            <p className="text-gray-400 font-medium">Waiting for {participantName} to join...</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none" />
      </div>
      
      <div className="absolute top-6 right-6 w-32 h-48 md:w-48 md:h-64 bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-700 shadow-2xl flex items-center justify-center z-20">
        {permissionError ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle size={28} className="text-red-500 mb-2" />
            <p className="text-xs text-red-400 font-medium">Access Denied</p>
          </div>
        ) : isVideoOff ? (
          <VideoOff size={32} className="text-gray-500" />
        ) : (
          <div ref={localVideoRef} className="w-full h-full object-cover bg-black" />
        )}
      </div>

      <div className="absolute top-6 left-6 bg-gray-900/60 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-3 border border-gray-700 z-20">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-white font-medium">{participantName} Consultation</span>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 bg-gray-900/80 backdrop-blur-xl px-8 py-4 rounded-full border border-gray-700 shadow-2xl z-30">
        <button 
          onClick={toggleAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button 
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <button className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
          <MessageSquare size={20} />
        </button>
        <button 
          onClick={() => onEndCall(consultationId)}
          className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
        >
          <Phone size={24} className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [doctorName, setDoctorName] = useState<string | null>(null); 
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [appointments, setAppointments] = useState<Consultation[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isJoiningId, setIsJoiningId] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [agoraInfo, setAgoraInfo] = useState<any>(null);
  const [currentPatientName, setCurrentPatientName] = useState<string>('Patient');

  // Availability States
  const [availability, setAvailability] = useState<DayAvailability[]>(
    Array.from({length: 7}).map((_, i) => ({ day_of_week: i, active: false, start_time: '09:00', end_time: '17:00' }))
  );
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilityMsg, setAvailabilityMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Profile Settings States
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    consultation_fee: 1500,
    bio: '',
    video_consultation_enabled: true
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Real-time tracker for join buttons
  const [now, setNow] = useState(new Date());

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    // Update the 'now' state every 30 seconds to refresh join buttons dynamically
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const getJoinStatus = (scheduledAt: string) => {
    const sTime = new Date(scheduledAt).getTime();
    const cTime = now.getTime();
    const startWindow = sTime - (5 * 60 * 1000); // 5 mins before
    const endWindow = sTime + (15 * 60 * 1000); // 15 mins after

    if (cTime < startWindow) {
      const diffMins = Math.ceil((startWindow - cTime) / 60000);
      if (diffMins > 60) {
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return { canJoin: false, label: `Join in ${h}h ${m}m` };
      }
      return { canJoin: false, label: `Join in ${diffMins}m` };
    }
    
    if (cTime > endWindow) {
      return { canJoin: false, label: 'Expired' };
    }
    
    return { canJoin: true, label: 'Join Call' };
  };

  useEffect(() => {
    fetchDoctorProfile();
    fetchAppointments();
    fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDoctorProfile = async () => {
    let fetchedFirstName = '';
    let fetchedLastName = '';
    
    // Fallback: Get name from Supabase user session
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata) {
      const parts = (user.user_metadata.full_name || user.user_metadata.name || '').split(' ');
      fetchedFirstName = parts[0] || '';
      fetchedLastName = parts.slice(1).join(' ') || '';
    }

    try {
      const token = localStorage.getItem('supabase_access_token');
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/me`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (res.ok) {
        const json = await res.json();
        const docData = json.data;
        if (docData) {
          setProfileForm({
            first_name: docData.first_name || fetchedFirstName,
            last_name: docData.last_name || fetchedLastName,
            consultation_fee: docData.consultation_fee || 1500,
            bio: docData.bio || '',
            video_consultation_enabled: docData.video_consultation_enabled ?? true
          });
          setDoctorName(`${docData.first_name || fetchedFirstName} ${docData.last_name || fetchedLastName}`.trim() || 'Doctor');
          return;
        }
      }
    } catch (error) {
      console.error("Failed to fetch doctor profile from backend", error);
    }
    
    // If backend fetch fails, populate what we can from user auth session
    setProfileForm(prev => ({ ...prev, first_name: fetchedFirstName, last_name: fetchedLastName }));
    setDoctorName(`${fetchedFirstName} ${fetchedLastName}`.trim() || 'Doctor');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);

    try {
      const token = localStorage.getItem('supabase_access_token');
      const payload = {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        consultation_fee: Number(profileForm.consultation_fee),
        bio: profileForm.bio,
        video_consultation_enabled: profileForm.video_consultation_enabled
      };

      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        // Update top right header name seamlessly
        setDoctorName(`${json.data.first_name} ${json.data.last_name}`);
      } else {
        const error = await res.json();
        setProfileMsg({ type: 'error', text: error.message || 'Failed to update profile.' });
      }
    } catch (error) {
      setProfileMsg({ type: 'error', text: 'Network error occurred.' });
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setProfileMsg(null), 3000);
    }
  };

  const fetchAvailability = async () => {
    try {
      const token = localStorage.getItem('supabase_access_token');
      if (!token) return;
      
      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/me/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setAvailability(prev => prev.map(day => {
            const found = json.data.find((d: any) => d.day_of_week === day.day_of_week);
            if (found) {
              return { 
                ...day, 
                active: true, 
                start_time: found.start_time.slice(0, 5), // Converts "09:00:00" to "09:00" for input component
                end_time: found.end_time.slice(0, 5) 
              };
            }
            return day;
          }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch availability", e);
    }
  };

  const handleSaveAvailability = async () => {
    setIsSavingAvailability(true);
    setAvailabilityMsg(null);
    try {
      const token = localStorage.getItem('supabase_access_token');
      
      // Formatting payload correctly as specified
      const payload = {
        schedule: availability
          .filter(d => d.active)
          .map(d => ({
            day_of_week: d.day_of_week,
            start_time: `${d.start_time}:00`, // Format back to HH:MM:SS
            end_time: `${d.end_time}:00`
          }))
      };

      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/me/availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAvailabilityMsg({ type: 'success', text: 'Schedule saved successfully!' });
      } else {
        const error = await res.json();
        setAvailabilityMsg({ type: 'error', text: error.message || 'Failed to save schedule.' });
      }
    } catch (e) {
      setAvailabilityMsg({ type: 'error', text: 'Network error occurred.' });
    } finally {
      setIsSavingAvailability(false);
      setTimeout(() => setAvailabilityMsg(null), 3000);
    }
  };

  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${BACKEND_URL}/api/v1/consultations/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAppointments(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const handleUpdateStatus = (consultationId: string, newStatus: string) => {
    const token = localStorage.getItem('supabase_access_token');
    if (!token) return;
    
    // Fire and forget using keepalive so it hits the backend even if unmounted instantly
    fetch(`${BACKEND_URL}/api/v1/consultations/${consultationId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ status: newStatus }),
      keepalive: true
    }).then(res => {
      if (res.ok) {
        fetchAppointments(); 
      } else {
        res.json().then(err => console.error('Failed to update status', err));
      }
    }).catch(e => {
      console.error('Network error updating status:', e);
    });
  };

  const handleJoinCall = async (consultationId: string, patientName: string) => {
    setIsJoiningId(consultationId);
    setCurrentPatientName(patientName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Your session has expired. Please log in again.');
        setIsJoiningId(null);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/consultations/${consultationId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setAgoraInfo(json.data); 
        setActiveCallId(consultationId);
        setIsVideoCallActive(true);
      } else {
        alert(json.message || "Failed to join consultation");
      }
    } catch (e) {
      console.error(e);
      alert("Error joining video call");
    } finally {
      setIsJoiningId(null);
    }
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
            <p className="text-emerald-100/80 text-lg">You have <strong className="text-white">{appointments.filter(a => a.status === 'SCHEDULED').length} scheduled appointments</strong> requiring attention.</p>
          </div>
          
          {appointments.filter(a => a.status === 'SCHEDULED').length > 0 && (() => {
            const nextApt = appointments.find(a => a.status === 'SCHEDULED');
            if(!nextApt) return null;
            const { canJoin, label } = getJoinStatus(nextApt.scheduled_at);
            
            return (
              <button 
                onClick={() => handleJoinCall(nextApt.id, `Patient ${nextApt.patient_user_id.substring(0,6)}`)}
                disabled={!canJoin}
                className={`px-6 py-4 rounded-2xl font-bold transition-all shadow-[0_10px_20px_-10px_rgba(255,255,255,0.3)] hover:-translate-y-1 flex items-center gap-2 whitespace-nowrap ${
                  canJoin 
                    ? 'bg-white text-emerald-950 hover:bg-emerald-50 cursor-pointer' 
                    : 'bg-white/20 text-white/50 cursor-not-allowed'
                }`}
              >
                <Video size={20} className={canJoin ? "text-emerald-600" : "text-white/50"} />
                <span>{canJoin ? "Join Next Consult" : label}</span>
              </button>
            )
          })()}
        </div>
      </motion.div>

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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200/60 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-extrabold text-slate-900">Today&apos;s Schedule</h3>
          <button onClick={() => setActiveTab('appointments')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center">
            View All <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="flex flex-col space-y-4">
          {isLoadingAppointments ? (
             <div className="py-10 text-center"><Loader2 className="animate-spin text-emerald-500 mx-auto" /></div>
          ) : appointments.length === 0 ? (
             <div className="py-10 text-center text-slate-500 font-medium">No appointments scheduled today.</div>
          ) : appointments.map((apt, index) => {
            const isNext = index === 0 && apt.status === 'SCHEDULED';
            const timeStr = new Date(apt.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const patientLabel = `Patient ${apt.patient_user_id.substring(0, 6)}`;
            
            const { canJoin, label } = getJoinStatus(apt.scheduled_at);

            return (
              <div key={apt.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all ${isNext ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-emerald-100 hover:shadow-sm'}`}>
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                  <div className="relative w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center font-bold shrink-0">
                    {getInitials(patientLabel)}
                    {isNext && <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{patientLabel}</h4>
                    <p className={`text-sm font-medium ${apt.status === 'COMPLETED' ? 'text-emerald-600' : apt.status === 'CANCELLED' ? 'text-red-500' : 'text-slate-500'}`}>{apt.status}</p>
                    <div className="flex items-center gap-3 mt-1 sm:hidden">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1"><Clock size={12}/> {timeStr}</span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">Video Consult</span>
                    </div>
                  </div>
                </div>
                
                <div className="hidden sm:flex flex-1 flex-col items-center justify-center px-4">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Clock size={14} className="text-emerald-500"/> {timeStr}</span>
                  <span className="text-xs font-bold text-slate-500">Video Consult</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                  {apt.status === 'SCHEDULED' && (
                    <button 
                      onClick={() => handleJoinCall(apt.id, patientLabel)}
                      disabled={isJoiningId === apt.id || !canJoin}
                      className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        isNext 
                          ? (canJoin ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200') 
                          : (canJoin ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-50 text-gray-400 cursor-not-allowed')
                      }`}
                    >
                      {isJoiningId === apt.id ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
                      <span>{label}</span>
                    </button>
                  )}
                  {apt.status === 'COMPLETED' && (
                    <span className="px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl flex items-center gap-2">
                      <CheckCircle2 size={18} /> Completed
                    </span>
                  )}
                  {apt.status === 'CANCELLED' && (
                    <span className="px-6 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl flex items-center gap-2">
                      <XCircle size={18} /> Cancelled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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

      <div className="p-6 sm:p-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">All Consultations</h3>
          <div className="grid gap-4">
            {isLoadingAppointments ? (
              <div className="py-10 text-center"><Loader2 className="animate-spin text-emerald-500 mx-auto" /></div>
            ) : appointments.length === 0 ? (
              <div className="py-10 text-center text-slate-500 font-medium">No consultations found.</div>
            ) : appointments.map((apt) => {
              const timeStr = new Date(apt.scheduled_at).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
              const patientLabel = `Patient ${apt.patient_user_id.substring(0, 6)}`;
              const { canJoin, label } = getJoinStatus(apt.scheduled_at);
              
              return (
                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 rounded-2xl border border-slate-100 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4 w-full sm:w-64 shrink-0">
                    <div className="w-12 h-12 bg-slate-100 rounded-full font-bold text-slate-600 flex items-center justify-center shrink-0">
                      {getInitials(patientLabel)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{patientLabel}</h4>
                      <p className={`text-xs font-bold uppercase tracking-wider ${apt.status === 'COMPLETED' ? 'text-emerald-600' : apt.status === 'CANCELLED' ? 'text-red-500' : 'text-blue-500'}`}>{apt.status}</p>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center gap-8">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Clock size={16} className="text-emerald-500" /> {timeStr}
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Video size={16} className="text-blue-500" /> Video Consult
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {apt.status === 'SCHEDULED' && (
                      <button 
                        onClick={() => handleJoinCall(apt.id, patientLabel)}
                        disabled={isJoiningId === apt.id || !canJoin}
                        className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 ${
                          canJoin 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                            : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                      >
                        {isJoiningId === apt.id ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />} 
                        {label}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderPatients = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
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
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold shrink-0">
          {getInitials(doctorName)}
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Profile Settings</h2>
          <p className="text-sm text-slate-500">Update your public profile and weekly availability.</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* Weekly Availability Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Weekly Availability</h3>
            {availabilityMsg && (
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${availabilityMsg.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {availabilityMsg.text}
              </span>
            )}
          </div>
          
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
            {availability.map((day, index) => (
              <div key={day.day_of_week} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-slate-200 last:border-0 last:pb-0">
                <label className="flex items-center gap-3 w-40 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={day.active} 
                    onChange={(e) => {
                      const newAvail = [...availability];
                      newAvail[index].active = e.target.checked;
                      setAvailability(newAvail);
                    }}
                    className="w-5 h-5 accent-emerald-600 rounded" 
                  />
                  <span className={`font-semibold ${day.active ? 'text-slate-900' : 'text-slate-400'}`}>
                    {DAYS_OF_WEEK[day.day_of_week]}
                  </span>
                </label>
                
                <div className="flex items-center gap-3 flex-1">
                  <input 
                    type="time" 
                    value={day.start_time}
                    disabled={!day.active}
                    onChange={(e) => {
                      const newAvail = [...availability];
                      newAvail[index].start_time = e.target.value;
                      setAvailability(newAvail);
                    }}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:bg-slate-100 outline-none focus:border-emerald-500"
                  />
                  <span className="text-slate-400 text-sm font-medium">to</span>
                  <input 
                    type="time" 
                    value={day.end_time}
                    disabled={!day.active}
                    onChange={(e) => {
                      const newAvail = [...availability];
                      newAvail[index].end_time = e.target.value;
                      setAvailability(newAvail);
                    }}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:bg-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleSaveAvailability}
              disabled={isSavingAvailability}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-70"
            >
              {isSavingAvailability ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Schedule
            </button>
          </div>
        </section>
        
        <hr className="border-slate-100" />

        {/* Basic Settings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">General Profile</h3>
            {profileMsg && (
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${profileMsg.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {profileMsg.text}
              </span>
            )}
          </div>
          
          <form className="space-y-6" onSubmit={handleSaveProfile}>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                <input type="text" value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-900" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                <input type="text" value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-900" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consultation Fee (₹)</label>
                <input type="number" min="0" value={profileForm.consultation_fee} onChange={e => setProfileForm({...profileForm, consultation_fee: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-900" required />
              </div>
              <div className="flex items-center pt-8">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={profileForm.video_consultation_enabled} onChange={e => setProfileForm({...profileForm, video_consultation_enabled: e.target.checked})} className="w-5 h-5 accent-emerald-600 rounded" />
                  <span className="text-sm font-bold text-slate-700">Enable Video Consultations</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Professional Bio</label>
              <textarea rows={4} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-slate-900 resize-none" placeholder="Briefly describe your experience and specialization..." />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={isSavingProfile} className="px-8 py-4 bg-emerald-950 text-white rounded-xl font-bold hover:bg-emerald-900 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-70">
                {isSavingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Update Profile
              </button>
            </div>
          </form>
        </section>
      </div>
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

          {/* Video Call Interface */}
          <AnimatePresence>
            {isVideoCallActive && agoraInfo && activeCallId && (
              <div className="fixed inset-0 z-[200] flex flex-col">
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="flex-1 relative flex flex-col"
                >
                  <VideoCallInterface 
                    agoraInfo={agoraInfo} 
                    consultationId={activeCallId!}
                    onEndCall={(id) => {
                      setIsVideoCallActive(false);
                      if (id) {
                        handleUpdateStatus(id, 'COMPLETED');
                        setActiveCallId(null);
                      }
                    }}
                    participantName={currentPatientName}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </ProtectedRoute>
  );
}