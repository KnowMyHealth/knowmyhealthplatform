// frontend/app/consultations/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Video, Calendar as CalendarIcon, Star, Clock, 
  ChevronRight, ChevronLeft, Phone, MessageSquare, X, CheckCircle2, 
  Loader2, Mic, MicOff, VideoOff, Users, AlertCircle,
  Sun, Sunrise, Moon, MoonStar
} from 'lucide-react';
import Image from 'next/image';

import ProtectedRoute from '@/components/ProtectedRoute';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  consultation_fee: number;
  video_consultation_enabled: boolean;
  offline_consultation_enabled: boolean;
  clinic_address: string | null;
  is_available: boolean;
  avatar_url: string | null;
  bio: string | null;
  years_of_experience: number;

  name: string;
  city: string;
  rating: number;
  reviews: number;
  image: string;
  nextAvailable: string;
}

interface Slot {
  time: string;
  is_booked: boolean;
}

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

function VideoCallInterface({ agoraInfo, onEndCall, participantName }: { agoraInfo: any, onEndCall: () => void, participantName: string }) {
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
      {/* Main Video (Doctor) */}
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
      
      {/* Self Video (Patient) */}
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

      {/* Info Overlay */}
      <div className="absolute top-6 left-6 bg-gray-900/60 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-3 border border-gray-700 z-20">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-white font-medium">{participantName} Consultation</span>
      </div>

      {/* Controls */}
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
          onClick={onEndCall}
          className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
        >
          <Phone size={24} className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

export default function ConsultationsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>(['All']);

  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); 
  
  // Date and Time selection states
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const datesScrollRef = useRef<HTMLDivElement>(null);
  
  const [myConsultations, setMyConsultations] = useState<any[]>([]);
  const [selectedConsultationType, setSelectedConsultationType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [isBooking, setIsBooking] = useState(false);
  const [isJoiningId, setIsJoiningId] = useState<string | null>(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [agoraInfo, setAgoraInfo] = useState<any>(null); 
  const [currentDoctorName, setCurrentDoctorName] = useState<string>('Doctor');

  // Real-time tracker for join buttons
  const [now, setNow] = useState(new Date());

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

  const fetchMyConsultations = async () => {
    try {
      const token = localStorage.getItem('supabase_access_token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const consRes = await fetch(`${BACKEND_URL}/api/v1/consultations/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const consJson = await consRes.json();
      if (consJson.success && consJson.data) {
        setMyConsultations(consJson.data);
      }
    } catch (e) {
      console.error("Failed to fetch my consultations", e);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('supabase_access_token');
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        
        const res = await fetch(`${BACKEND_URL}/api/v1/doctors/approved?limit=50`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        const json = await res.json();
        
        if (json.success) {
          const items = Array.isArray(json.data) ? json.data : (json.data?.items || []);
          
          const mapped = items.map((doc: any, index: number) => ({
            ...doc,
            name: `Dr. ${doc.first_name} ${doc.last_name}`,
            image: doc.avatar_url || `https://picsum.photos/seed/doc${index + 10}/200/200`,
            city: 'Virtual / Clinic',
            rating: 4.8 + (Math.random() * 0.2),
            reviews: Math.floor(Math.random() * 200) + 50,
            nextAvailable: doc.is_available ? 'Available Now' : 'Check Schedule',
            video_consultation_enabled: doc.video_consultation_enabled !== undefined ? doc.video_consultation_enabled : true,
            offline_consultation_enabled: doc.offline_consultation_enabled ?? false,
            clinic_address: doc.clinic_address || null
          }));

          const enabledDocs = mapped.filter((d: Doctor) => d.video_consultation_enabled || d.offline_consultation_enabled);
          setDoctors(enabledDocs);

          const specs = Array.from(new Set(enabledDocs.map((d: Doctor) => d.specialization))) as string[];
          setSpecialties(['All', ...specs]);
        }
        
        await fetchMyConsultations();

        // Prepare the next 14 days for booking
        const next14Days = Array.from({length: 14}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return d;
        });
        setAvailableDates(next14Days);

      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = doc.city.toLowerCase().includes(locationQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'All' || doc.specialization === selectedSpecialty;
    return matchesSearch && matchesLocation && matchesSpecialty;
  });

  const handleBookClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedConsultationType('ONLINE');

    // Set default selected date to today (YYYY-MM-DD local time)
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISODate = new Date(today.getTime() - tzOffset).toISOString().split('T')[0];
    
    setSelectedDate(localISODate);
    setAvailableSlots([]);
    setIsBookingModalOpen(true);
    setBookingStep(1);
    setSelectedTime(null);
  };

  // Fetch slots whenever the selected date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDoctor || !selectedDate) return;
      setIsLoadingSlots(true);
      try {
        const token = localStorage.getItem('supabase_access_token');
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        
        // Calculate the timezone offset in minutes and invert the sign to match backend expectations if needed
        const tzOffset = new Date().getTimezoneOffset() * -1;

        const res = await fetch(`${BACKEND_URL}/api/v1/consultations/doctors/${selectedDoctor.id}/slots?date=${selectedDate}&timezone_offset=${tzOffset}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        const json = await res.json();
        
        // Ensure data is mapped properly
        if (json.success && Array.isArray(json.data)) {
          setAvailableSlots(json.data);
        } else {
          setAvailableSlots([]);
        }
      } catch (error) {
        console.error("Failed to fetch slots:", error);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    if (isBookingModalOpen && selectedDate && selectedDoctor) {
      fetchSlots();
    }
  }, [selectedDate, selectedDoctor, isBookingModalOpen]);

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    setIsBooking(true);
    
    try {
      const token = localStorage.getItem('supabase_access_token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      
      const res = await fetch(`${BACKEND_URL}/api/v1/consultations/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor.id,
          // selectedTime is already the full ISO string returned from the backend ('2026-04-21T09:00:00+05:30')
          scheduled_at: selectedTime,
          consultation_type: selectedConsultationType
        })
      });

      const json = await res.json();
      if (json.success) {
        setMyConsultations(prev => [json.data, ...prev]);
        setBookingStep(2);
        setTimeout(() => {
          setIsBookingModalOpen(false);
        }, 3000);
      } else {
        alert(json.message || "Failed to book consultation");
      }
    } catch (e) {
      console.error(e);
      alert("Error booking consultation");
    } finally {
      setIsBooking(false);
    }
  };

  const handleJoinCall = async (consultationId: string, doctorName: string) => {
    setIsJoiningId(consultationId);
    setCurrentDoctorName(doctorName);
    try {
      const token = localStorage.getItem('supabase_access_token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      
      const res = await fetch(`${BACKEND_URL}/api/v1/consultations/${consultationId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setAgoraInfo(json.data); 
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

  // Date Carousel Scroll Logic
  const scrollDates = (direction: 'left' | 'right') => {
    if (datesScrollRef.current) {
      const scrollAmount = 300;
      datesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Slot Grouping Logic based on local hours
  const groupedSlots = {
    Morning: [] as Slot[],
    Afternoon: [] as Slot[],
    Evening: [] as Slot[],
    Night: [] as Slot[],
  };

  availableSlots.forEach(slot => {
    const d = new Date(slot.time); // Parses the ISO string automatically to local time
    const h = d.getHours();
    if (h >= 5 && h < 12) groupedSlots.Morning.push(slot);
    else if (h >= 12 && h < 16) groupedSlots.Afternoon.push(slot);
    else if (h >= 16 && h < 20) groupedSlots.Evening.push(slot);
    else groupedSlots.Night.push(slot);
  });

  const getAvailableCount = () => availableSlots.filter(s => !s.is_booked).length;

  const upcomingConsultations = myConsultations
    .filter(c => c.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="min-h-screen bg-gray-50/50 pb-24">
        {/* Hero Search Section */}
        <div className="bg-emerald-900 pt-16 pb-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-600/30 blur-[80px] rounded-full" />
            <div className="absolute top-1/2 -left-24 w-72 h-72 bg-teal-500/20 blur-[60px] rounded-full" />
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Find and Book Expert Doctors</h1>
              <p className="text-emerald-100/80 text-lg max-w-2xl mx-auto">Connect with top healthcare professionals for in-clinic visits or instant video consultations.</p>
            </div>

            {/* Search Bar */}
            <div className="max-w-4xl mx-auto bg-white p-2 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <Search className="text-gray-400 mr-3" size={20} />
                <input 
                  type="text" 
                  placeholder="Search doctors, specialties, symptoms..." 
                  className="w-full bg-transparent outline-none text-gray-900 placeholder:text-gray-400 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <MapPin className="text-gray-400 mr-3" size={20} />
                <input 
                  type="text" 
                  placeholder="City or Zip Code" 
                  className="w-full bg-transparent outline-none text-gray-900 placeholder:text-gray-400 font-medium"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
              </div>
              <button className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/30 whitespace-nowrap">
                Find Doctors
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
          {/* Upcoming Consultations List */}
          {upcomingConsultations.length > 0 && (
            <div className="mb-12 space-y-4">
              {upcomingConsultations.map((consultation) => {
                const doc = doctors.find(d => d.id === consultation.doctor_id);
                const docName = doc ? doc.name : 'Unknown Doctor';
                const docImage = doc?.image || 'https://picsum.photos/seed/generic/200/200';
                const scheduledDate = new Date(consultation.scheduled_at);
                
                const { canJoin, label } = getJoinStatus(consultation.scheduled_at);
                
                return (
                  <motion.div 
                    key={consultation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md">
                          <Image src={docImage} alt={docName} fill className="object-cover" />
                        </div>
                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${consultation.consultation_type === 'OFFLINE' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                          {consultation.consultation_type === 'OFFLINE'
                            ? <MapPin size={14} className="text-amber-600" />
                            : <Video size={14} className="text-emerald-600" />
                          }
                        </div>
                      </div>
                      <div>
                        <div className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full mb-2 bg-emerald-100 text-emerald-800">
                          {consultation.status}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{docName}</h3>
                        <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                          <Clock size={16} /> {scheduledDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {consultation.consultation_type === 'OFFLINE' ? (
                      <div className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-2">
                        <MapPin size={20} />
                        <span>In-Clinic Visit</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoinCall(consultation.id, docName)}
                        disabled={isJoiningId === consultation.id || !canJoin}
                        className={`w-full md:w-auto px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                          canJoin
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isJoiningId === consultation.id ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <Video size={20} />
                        )}
                        <span>{label}</span>
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Specialties Filter */}
          <div className="flex overflow-x-auto pb-4 mb-8 gap-3 scrollbar-hide">
            {specialties.map(specialty => (
              <button
                key={specialty}
                onClick={() => setSelectedSpecialty(specialty)}
                className={`px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  selectedSpecialty === specialty 
                    ? 'bg-emerald-900 text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                {specialty}
              </button>
            ))}
          </div>

          {/* Doctors Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-emerald-600">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="text-emerald-900/60 font-medium">Loading medical professionals...</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-500 font-medium bg-white rounded-[2rem] border border-emerald-100 shadow-sm">
                No doctors found matching your search criteria.
              </div>
            ) : (
              <AnimatePresence>
                {filteredDoctors.map((doctor, index) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    key={doctor.id}
                    className="bg-white rounded-[2.5rem] p-6 border border-emerald-100/60 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] transition-all group flex flex-col h-full"
                  >
                    <div className="flex gap-5 mb-5">
                      <div className="relative w-24 h-24 rounded-[1.5rem] overflow-hidden shrink-0 shadow-inner">
                        <Image src={doctor.image} alt={doctor.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        {doctor.is_available && (
                          <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-black text-emerald-950 truncate group-hover:text-emerald-700 transition-colors">{doctor.name}</h3>
                            <p className="text-emerald-600 font-bold text-sm mb-2">{doctor.specialization}</p>
                          </div>
                          <div className="bg-amber-50 text-amber-700 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                            <Star size={12} className="fill-amber-500 text-amber-500" /> {doctor.rating.toFixed(1)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-slate-100">
                            {doctor.years_of_experience} Yrs Exp
                          </span>
                          {doctor.video_consultation_enabled && (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                              <Video size={10} /> Video
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-6 flex-1">
                      <p className="text-sm text-emerald-900/60 line-clamp-2 leading-relaxed font-medium">
                        {doctor.bio || `Expert ${doctor.specialization} with over ${doctor.years_of_experience} years of experience in providing top-tier medical care.`}
                      </p>
                    </div>

                    <div className="pt-5 border-t border-emerald-50 mt-auto flex items-center justify-between gap-4">
                      <div className="shrink-0">
                        <p className="text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest mb-0.5">Consult Fee</p>
                        <p className="text-xl font-black text-emerald-950">₹{doctor.consultation_fee}</p>
                      </div>
                      
                      <div className="flex gap-2 w-full justify-end">
                        {doctor.video_consultation_enabled ? (
                          <button 
                            onClick={() => handleBookClick(doctor)}
                            className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                          >
                            <Video size={18} />
                            <span>Consult</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleBookClick(doctor)}
                            className="flex-1 sm:flex-none px-6 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-2xl hover:bg-emerald-100 hover:-translate-y-0.5 transition-all"
                          >
                            Book Clinic
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Booking Modal */}
        <AnimatePresence>
          {isBookingModalOpen && selectedDoctor && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm"
                onClick={() => setIsBookingModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-6 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
                  <h2 className="text-xl font-bold text-emerald-950">Book Appointment</h2>
                  <button onClick={() => setIsBookingModalOpen(false)} className="p-2 text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                  <div className="flex items-center gap-4 mb-8 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-emerald-200">
                      <Image src={selectedDoctor.image} alt={selectedDoctor.name} fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-950">{selectedDoctor.name}</h3>
                      <p className="text-sm text-emerald-600 font-medium">{selectedDoctor.specialization}</p>
                      <p className="text-sm text-emerald-900/60 font-medium mt-1">Consultation Fee: <span className="text-emerald-900 font-bold">₹{selectedDoctor.consultation_fee}</span></p>
                    </div>
                  </div>

                  {bookingStep === 1 ? (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                      {/* Consultation Type Selector */}
                      {selectedDoctor.offline_consultation_enabled && (
                        <div className="flex gap-3 mb-6">
                          <button
                            onClick={() => setSelectedConsultationType('ONLINE')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                              selectedConsultationType === 'ONLINE'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <Video size={16} /> Video Consult
                          </button>
                          <button
                            onClick={() => setSelectedConsultationType('OFFLINE')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                              selectedConsultationType === 'OFFLINE'
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <MapPin size={16} /> Visit Clinic
                          </button>
                        </div>
                      )}
                      {selectedConsultationType === 'OFFLINE' && selectedDoctor.clinic_address && (
                        <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-6 text-sm text-amber-800">
                          <MapPin size={15} className="shrink-0 mt-0.5 text-amber-600" />
                          <span><strong>Clinic:</strong> {selectedDoctor.clinic_address}</span>
                        </div>
                      )}

                      {/* Interactive Date Carousel */}
                      <div className="flex items-center gap-2 mb-8 border-b border-emerald-100 pb-2">
                        <button onClick={() => scrollDates('left')} className="p-2 border border-emerald-100 rounded-full hover:bg-emerald-50 text-emerald-600 shrink-0 transition-colors">
                          <ChevronLeft size={20} />
                        </button>
                        
                        <div className="flex-1 overflow-x-hidden scroll-smooth flex gap-2" ref={datesScrollRef}>
                          {availableDates.map((dateObj, i) => {
                            const tzOffset = dateObj.getTimezoneOffset() * 60000;
                            const localISODate = new Date(dateObj.getTime() - tzOffset).toISOString().split('T')[0];
                            const isSelected = selectedDate === localISODate;
                            
                            let label = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                            if (i === 0) label = 'Today';
                            else if (i === 1) label = 'Tomorrow';

                            return (
                              <button 
                                key={localISODate}
                                onClick={() => {
                                  setSelectedDate(localISODate);
                                  setSelectedTime(null);
                                }}
                                className={`shrink-0 min-w-[140px] py-3 flex flex-col items-center justify-center transition-all border-b-[3px] rounded-t-xl ${
                                  isSelected 
                                    ? 'border-emerald-600 bg-emerald-50/80' 
                                    : 'border-transparent text-gray-600 hover:bg-emerald-50/50 hover:text-emerald-800'
                                }`}
                              >
                                <span className={`text-[15px] font-bold ${isSelected ? 'text-emerald-950' : 'text-gray-600'}`}>{label}</span>
                                <span className={`text-[11px] mt-1 ${isSelected ? 'text-emerald-500 font-bold' : 'text-gray-400 font-medium'}`}>
                                  {isSelected && !isLoadingSlots 
                                    ? `${getAvailableCount()} Slots Available` 
                                    : 'Check Availability'}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                        
                        <button onClick={() => scrollDates('right')} className="p-2 border border-emerald-100 rounded-full hover:bg-emerald-50 text-emerald-600 shrink-0 transition-colors">
                          <ChevronRight size={20} />
                        </button>
                      </div>

                      {/* Grouped Time Slots Grid */}
                      {isLoadingSlots ? (
                        <div className="py-12 flex justify-center text-emerald-500">
                          <Loader2 className="animate-spin" size={32} />
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-12 text-emerald-900/40 font-medium">
                          No slots available for this date.
                        </div>
                      ) : (
                        <div className="space-y-4 mb-8">
                          {Object.entries(groupedSlots).map(([period, slots]) => {
                            if (slots.length === 0) return null;
                            
                            let Icon = Sunrise;
                            if (period === 'Afternoon') Icon = Sun;
                            if (period === 'Evening') Icon = Moon;
                            if (period === 'Night') Icon = MoonStar;

                            return (
                              <div key={period} className="flex flex-col md:flex-row gap-4 py-4 border-b border-emerald-50 border-dashed last:border-0">
                                <div className="w-32 flex items-center gap-2 text-emerald-900/60 font-bold text-sm shrink-0">
                                  <Icon size={18} className="text-emerald-500" />
                                  <span>{period}</span>
                                </div>
                                <div className="flex-1 flex flex-wrap gap-3">
                                  {slots.map(slot => {
                                    const d = new Date(slot.time); // Auto-converts ISO to local timezone
                                    const timeLabel = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                    const isSelected = selectedTime === slot.time;
                                    
                                    return (
                                      <button 
                                        key={slot.time} 
                                        disabled={slot.is_booked}
                                        onClick={() => setSelectedTime(slot.time)}
                                        className={`px-5 py-2.5 rounded-lg border text-sm font-bold transition-all ${
                                          slot.is_booked 
                                            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed line-through decoration-gray-300' 
                                            : isSelected 
                                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                                              : 'border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                      >
                                        {timeLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button 
                        disabled={!selectedTime || isLoadingSlots}
                        onClick={() => setBookingStep(2)}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                      >
                        <span>Continue</span>
                        <ChevronRight size={18} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center py-8">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-emerald-950 mb-2">Confirm Booking</h3>
                      <p className="text-emerald-900/60 mb-8 leading-relaxed max-w-sm mx-auto">
                        You are about to book a <strong className="text-emerald-900">{selectedConsultationType === 'OFFLINE' ? 'clinic visit' : 'video consultation'}</strong> with {selectedDoctor.name} for <br/>
                        <strong className="text-emerald-900">
                          {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric'})} at {selectedTime && new Date(selectedTime).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}
                        </strong>. 
                        Your consultation will be scheduled immediately.
                      </p>
                      
                      <button 
                        onClick={handleConfirmBooking}
                        disabled={isBooking}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isBooking && <Loader2 size={20} className="animate-spin" />}
                        Confirm Appointment
                      </button>
                      <button 
                        onClick={() => setBookingStep(1)}
                        className="w-full py-4 mt-3 text-emerald-900/60 font-bold hover:text-emerald-900 transition-colors"
                      >
                        Back to Slots
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Video Call Interface */}
        <AnimatePresence>
          {isVideoCallActive && agoraInfo && (
            <div className="fixed inset-0 z-[200] flex flex-col">
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="flex-1 relative flex flex-col"
              >
                <VideoCallInterface 
                  agoraInfo={agoraInfo} 
                  onEndCall={() => {
                    setIsVideoCallActive(false);
                    // Sync up if the doctor completed the call while we were in it
                    fetchMyConsultations();
                  }}
                  participantName={currentDoctorName} 
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
