'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Video, Calendar as CalendarIcon, Star, Clock, ChevronRight, Phone, MessageSquare, X, CheckCircle2, Loader2, Mic, MicOff, VideoOff, Users } from 'lucide-react';
import Image from 'next/image';

import ProtectedRoute from '@/components/ProtectedRoute';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  consultation_fee: number;
  video_consultation_enabled: boolean;
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
        client.on("user-published", async (user: any, mediaType: any) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video") {
            setRemoteUsers(prev => [...prev, user]);
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        client.on("user-unpublished", (user: any, mediaType: any) => {
          if (mediaType === "video") {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
          }
        });

        client.on("user-left", (user: any) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || "96b6fdb94ffb4ab9ac1fe7c7d358ee71";
        
        await client.join(appId, agoraInfo.channel_name, agoraInfo.token, agoraInfo.uid);
        
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        audioTrack = tracks[0];
        videoTrack = tracks[1];
        
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        await client.publish([audioTrack, videoTrack]);
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
    if (localVideoTrack && localVideoRef.current && !isVideoOff) {
      localVideoTrack.play(localVideoRef.current);
    }
  }, [localVideoTrack, isVideoOff]);

  const toggleAudio = () => {
    if (localAudioTrack) {
      localAudioTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
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
          <div className="flex flex-col items-center justify-center text-emerald-500">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="text-white font-medium">Connecting to secure server...</p>
          </div>
        ) : remoteUsers.length > 0 ? (
          <RemoteVideo user={remoteUsers[0]} />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 mb-4">
              <Users size={40} />
            </div>
            <p className="text-gray-400 font-medium">Waiting for {participantName} to join...</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none" />
      </div>
      
      {/* Self Video (Patient) */}
      <div className="absolute top-6 right-6 w-32 h-48 md:w-48 md:h-64 bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-700 shadow-2xl flex items-center justify-center">
        {isVideoOff ? (
          <VideoOff size={32} className="text-gray-500" />
        ) : (
          <div ref={localVideoRef} className="w-full h-full object-cover bg-black" />
        )}
      </div>

      {/* Info Overlay */}
      <div className="absolute top-6 left-6 bg-gray-900/60 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-3 border border-gray-700">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-white font-medium">{participantName} Consultation</span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 bg-gray-900/80 backdrop-blur-xl px-8 py-4 rounded-full border border-gray-700 shadow-2xl">
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
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [myConsultations, setMyConsultations] = useState<any[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [isJoiningId, setIsJoiningId] = useState<string | null>(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [agoraInfo, setAgoraInfo] = useState<any>(null); 
  const [currentDoctorName, setCurrentDoctorName] = useState<string>('Doctor');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('supabase_access_token');
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        
        // Fetch Approved Doctors
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
            video_consultation_enabled: doc.video_consultation_enabled !== undefined ? doc.video_consultation_enabled : true
          }));
          
          const enabledDocs = mapped.filter((d: Doctor) => d.video_consultation_enabled);
          setDoctors(enabledDocs);

          const specs = Array.from(new Set(enabledDocs.map((d: Doctor) => d.specialization))) as string[];
          setSpecialties(['All', ...specs]);
        }

        // Fetch My Consultations
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

      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = doc.city.toLowerCase().includes(locationQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'All' || doc.specialty === selectedSpecialty;
    return matchesSearch && matchesLocation && matchesSpecialty;
  });

  const handleBookClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsBookingModalOpen(true);
    setBookingStep(1);
    setSelectedTime(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedTime) return;
    setIsBooking(true);
    
    try {
      const token = localStorage.getItem('supabase_access_token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1); 
      
      const res = await fetch(`${BACKEND_URL}/api/v1/consultations/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor.id,
          scheduled_at: scheduledDate.toISOString()
        })
      });

      const json = await res.json();
      if (json.success) {
        setMyConsultations(prev => [json.data, ...prev]);
        setBookingStep(2);
        setTimeout(() => {
          setIsBookingModalOpen(false);
        }, 2000);
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
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
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
          {/* My Consultations List */}
          {myConsultations.length > 0 && (
            <div className="mb-12 space-y-4">
              {myConsultations.map((consultation) => {
                const doc = doctors.find(d => d.id === consultation.doctor_id);
                const docName = doc ? doc.name : 'Unknown Doctor';
                const docImage = doc?.image || 'https://picsum.photos/seed/generic/200/200';
                const scheduledDate = new Date(consultation.scheduled_at);
                
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
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                          <Video size={14} className="text-emerald-600" />
                        </div>
                      </div>
                      <div>
                        <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider rounded-full mb-2">
                          {consultation.status}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{docName}</h3>
                        <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                          <Clock size={16} /> {scheduledDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleJoinCall(consultation.id, docName)}
                      disabled={isJoiningId === consultation.id || consultation.status !== 'SCHEDULED'}
                      className="w-full md:w-auto px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isJoiningId === consultation.id ? <Loader2 className="animate-spin" size={20} /> : <Video size={20} />}
                      <span>Join Video Call</span>
                    </button>
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
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1">
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
                className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
                onClick={() => setIsBookingModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="text-xl font-bold text-gray-900">Book Appointment</h2>
                  <button onClick={() => setIsBookingModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                  <div className="flex items-center gap-4 mb-8 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                    <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0">
                      <Image src={selectedDoctor.image} alt={selectedDoctor.name} fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{selectedDoctor.name}</h3>
                      <p className="text-sm text-emerald-600 font-medium">{selectedDoctor.specialization}</p>
                      <p className="text-sm text-gray-500 font-medium mt-1">Consultation Fee: <span className="text-gray-900 font-bold">₹{selectedDoctor.consultation_fee}</span></p>
                    </div>
                  </div>

                  {bookingStep === 1 ? (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CalendarIcon size={18} className="text-emerald-600" /> Select Date & Time
                      </h4>
                      
                      {/* Mock Dates */}
                      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                        {['Today', 'Tomorrow', 'Wed, 12 Oct', 'Thu, 13 Oct'].map((date, i) => (
                          <button key={date} className={`shrink-0 px-5 py-3 rounded-xl border font-semibold transition-all ${i === 0 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-emerald-300'}`}>
                            {date}
                          </button>
                        ))}
                      </div>

                      {/* Mock Times */}
                      <div className="grid grid-cols-3 gap-3 mb-8">
                        {['09:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '03:30 PM', '04:15 PM'].map((time) => (
                          <button 
                            key={time} 
                            onClick={() => setSelectedTime(time)}
                            className={`py-3 rounded-xl border font-semibold transition-all ${selectedTime === time ? 'border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>

                      <button 
                        disabled={!selectedTime}
                        onClick={() => setBookingStep(2)}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Booking</h3>
                      <p className="text-gray-500 mb-8">You are about to book an appointment with {selectedDoctor.name} for Today at {selectedTime}.</p>
                      
                      <button 
                        onClick={handleConfirmBooking}
                        disabled={isBooking}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isBooking && <Loader2 size={20} className="animate-spin" />}
                        Confirm & Pay ₹{selectedDoctor.consultation_fee}
                      </button>
                      <button 
                        onClick={() => setBookingStep(1)}
                        className="w-full py-4 mt-3 text-gray-500 font-bold hover:text-gray-900 transition-colors"
                      >
                        Back
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
                  onEndCall={() => setIsVideoCallActive(false)} 
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