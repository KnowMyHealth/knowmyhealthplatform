// frontend/app/consultations/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, MapPin, Video, Calendar as CalendarIcon, Star, Clock,
  ChevronRight, ChevronLeft, Phone, X, CheckCircle2, Check,
  Loader2, Mic, MicOff, VideoOff, Users, AlertCircle,
  Sun, Sunrise, Moon, MoonStar
} from 'lucide-react';
import Image from 'next/image';

import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

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
  const audioTrackRef = useRef<any>(null);
  const videoTrackRef = useRef<any>(null);
  const mediaNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [AgoraRTC, setAgoraRTC] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  useEffect(() => {
    import('agora-rtc-sdk-ng').then((mod) => {
      setAgoraRTC(mod.default);
      setClient(mod.default.createClient({ mode: "rtc", codec: "vp8" }));
    });
  }, []);

  useEffect(() => {
    if (!client || !AgoraRTC) return;

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
          audioTrackRef.current = tracks[0];
          videoTrackRef.current = tracks[1];
          await client.publish([audioTrackRef.current, videoTrackRef.current]);
          if (localVideoRef.current) {
            videoTrackRef.current.play(localVideoRef.current);
          }
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
      if (mediaNoticeTimerRef.current) clearTimeout(mediaNoticeTimerRef.current);
      if (audioTrackRef.current) { audioTrackRef.current.stop(); audioTrackRef.current.close(); audioTrackRef.current = null; }
      if (videoTrackRef.current) { videoTrackRef.current.stop(); videoTrackRef.current.close(); videoTrackRef.current = null; }
      if (client) client.leave();
    };
  }, [client, AgoraRTC, agoraInfo]);

  useEffect(() => {
    if (videoTrackRef.current && localVideoRef.current && !isVideoOff && !permissionError) {
      videoTrackRef.current.play(localVideoRef.current);
    }
  }, [isVideoOff, permissionError]);

  const showMediaNotice = (msg: string) => {
    if (mediaNoticeTimerRef.current) clearTimeout(mediaNoticeTimerRef.current);
    setMediaNotice(msg);
    mediaNoticeTimerRef.current = setTimeout(() => setMediaNotice(null), 4000);
  };

  const toggleAudio = () => {
    if (permissionError) {
      showMediaNotice("Allow microphone access in your browser settings to unmute.");
      return;
    }
    if (audioTrackRef.current) {
      audioTrackRef.current.setMuted(!isMuted);
      setIsMuted(v => !v);
    }
  };

  const toggleVideo = () => {
    if (permissionError) {
      showMediaNotice("Allow camera access in your browser settings to enable video.");
      return;
    }
    if (videoTrackRef.current) {
      videoTrackRef.current.setMuted(!isVideoOff);
      setIsVideoOff(v => !v);
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
          remoteUsers[0].videoTrack ? (
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

      {/* Media permission notice */}
      {mediaNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg border border-gray-700 z-40 flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-400 shrink-0" /> {mediaNotice}
        </div>
      )}

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

const stableHash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
};

export default function ConsultationsPage() {
  const { isLoggedIn, openAuthModal } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [toastError, setToastError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookingCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>({ year: new Date().getFullYear(), month: new Date().getMonth() });
  
  const [myConsultations, setMyConsultations] = useState<any[]>([]);
  const [selectedConsultationType, setSelectedConsultationType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'ADVANCE'>('FULL');
  const [isBooking, setIsBooking] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [patientNote, setPatientNote] = useState<string>('');
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
    const startWindow = sTime - (5 * 60 * 1000);
    const endWindow = sTime + (15 * 60 * 1000);

    if (cTime < startWindow) {
      const diffMins = Math.ceil((startWindow - cTime) / 60000);
      if (diffMins > 60) {
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return { canJoin: false, isExpired: false, label: `Join in ${h}h ${m}m` };
      }
      return { canJoin: false, isExpired: false, label: `Join in ${diffMins}m` };
    }

    if (cTime > endWindow) {
      return { canJoin: false, isExpired: true, label: 'Expired' };
    }

    return { canJoin: true, isExpired: false, label: 'Join Call' };
  };

  const isPastScheduled = (scheduledAt: string) => now.getTime() > new Date(scheduledAt).getTime();

  const fetchMyConsultations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const consRes = await fetch(`${BACKEND_URL}/api/v1/consultations/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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
        const { data: { session } } = await supabase.auth.getSession();
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

        const token = session?.access_token;
        const res = await fetch(`${BACKEND_URL}/api/v1/doctors/approved?limit=50`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
    setPaymentMode('FULL');

    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISODate = new Date(today.getTime() - tzOffset).toISOString().split('T')[0];

    setSelectedDate(localISODate);
    setAvailableSlots([]);
    setIsBookingModalOpen(true);
    setBookingStep(1);
    setSelectedTime(null);
    setPatientNote('');
    setCalendarMonth({ year: today.getFullYear(), month: today.getMonth() });
  };

  // Calendar helpers
  const getAvailableDateSet = () => new Set(availableDates.map(d => {
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tz).toISOString().split('T')[0];
  }));

  const calendarDays = (() => {
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rawFirst = new Date(year, month, 1).getDay();
    const firstDow = rawFirst === 0 ? 6 : rawFirst - 1; // Mon=0
    const cells: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  })();

  // Fetch slots whenever the selected date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDoctor || !selectedDate) return;
      setIsLoadingSlots(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const tzOffset = new Date().getTimezoneOffset() * -1;

        const slotToken = session?.access_token;
        const res = await fetch(`${BACKEND_URL}/api/v1/consultations/doctors/${selectedDoctor.id}/slots?date=${selectedDate}&timezone_offset=${tzOffset}`, {
          headers: {
            ...(slotToken ? { 'Authorization': `Bearer ${slotToken}` } : {}),
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
    if (!isLoggedIn) { openAuthModal(); return; }
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    setIsBooking(true);
    setPaymentError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsBooking(false); return; }
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

      // Step 1: Create the consultation booking to get a booking_id
      const bookRes = await fetch(`${BACKEND_URL}/api/v1/consultations/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor.id,
          scheduled_at: selectedTime,
          consultation_type: selectedConsultationType,
          patient_note: patientNote || null
        })
      });

      const bookJson = await bookRes.json();
      if (!bookJson.success) {
        setPaymentError(bookJson.message || 'Failed to initiate booking. Please try again.');
        setIsBooking(false);
        return;
      }

      const consultation = bookJson.data;

      // Step 2: Create a Razorpay order (advance allowed only for in-clinic visits)
      const fee = selectedDoctor.consultation_fee;
      const payableAmount = paymentMode === 'ADVANCE' ? Math.round(fee * 0.1) : fee;
      const orderRes = await fetch(`${BACKEND_URL}/api/v1/payments/order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          amount: payableAmount,
          booking_type: 'CONSULTATION',
          booking_id: consultation.id,
          payment_mode: paymentMode
        })
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.razorpay_order_id) {
        setPaymentError(orderJson.message || 'Payment initiation failed. Please try again.');
        setIsBooking(false);
        return;
      }

      // Step 3: Open Razorpay checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPaymentError('Failed to load payment gateway. Please check your connection and try again.');
        setIsBooking(false);
        return;
      }
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: orderJson.amount,
        currency: orderJson.currency || 'INR',
        order_id: orderJson.razorpay_order_id,
        name: 'Know My Health',
        description: `Consultation with ${selectedDoctor.name}`,
        theme: { color: '#059669' },
        handler: async (response: any) => {
          // Step 4: Verify payment
          try {
            const { data: { session: verifySession } } = await supabase.auth.getSession();
            const verifyRes = await fetch(`${BACKEND_URL}/api/v1/payments/verify`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${verifySession?.access_token ?? ''}`,
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson.success) {
              setMyConsultations(prev => [{ ...consultation, status: 'SCHEDULED' }, ...prev]);
              setBookingStep(3);
              if (bookingCloseTimerRef.current) clearTimeout(bookingCloseTimerRef.current);
              bookingCloseTimerRef.current = setTimeout(() => setIsBookingModalOpen(false), 3000);
            } else {
              setPaymentError(verifyJson.message || 'Payment verification failed. Contact support.');
            }
          } catch {
            setPaymentError('Payment verification failed due to a network error.');
          } finally {
            setIsBooking(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentError('Payment was cancelled. Your booking slot is held — please complete payment.');
            setIsBooking(false);
          }
        }
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastError("Network error. Please check your connection and try again.");
      toastTimerRef.current = setTimeout(() => setToastError(null), 5000);
      setIsBooking(false);
    }
  };

  const handleJoinCall = async (consultationId: string, doctorName: string) => {
    setIsJoiningId(consultationId);
    setCurrentDoctorName(doctorName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastError('Your session has expired. Please log in again.');
        toastTimerRef.current = setTimeout(() => setToastError(null), 5000);
        setIsJoiningId(null);
        return;
      }
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

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
        setIsVideoCallActive(true);
      } else {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastError(json.message || "Failed to join consultation. Please try again.");
        toastTimerRef.current = setTimeout(() => setToastError(null), 5000);
      }
    } catch (e) {
      console.error(e);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastError("Network error. Could not join the call.");
      toastTimerRef.current = setTimeout(() => setToastError(null), 5000);
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
    <div className="min-h-screen bg-gray-50/50 pb-24">
        {/* Global error toast */}
        <AnimatePresence>
          {toastError && (
            <motion.div
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -50, x: '-50%' }}
              className="fixed top-24 left-1/2 z-[300] bg-red-950 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-red-800"
            >
              <AlertCircle size={20} className="text-red-400 shrink-0" />
              <span className="font-bold text-sm">{toastError}</span>
            </motion.div>
          )}
        </AnimatePresence>

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
                
                const { canJoin, isExpired, label } = getJoinStatus(consultation.scheduled_at);
                
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
                      isPastScheduled(consultation.scheduled_at) ? (
                        <div className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-2">
                          <CheckCircle2 size={20} />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <div className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-2">
                          <MapPin size={20} />
                          <span>In-Clinic Visit</span>
                        </div>
                      )
                    ) : isExpired ? null : (
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
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    key={doctor.id}
                    className="bg-white rounded-[2.5rem] p-6 border border-emerald-100/60 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] transition-shadow group flex flex-col h-full"
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setIsBookingModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 24 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden relative border border-slate-100 shrink-0">
                      <Image src={selectedDoctor.image} alt={selectedDoctor.name} fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 leading-tight">{selectedDoctor.name}</h3>
                      <p className="text-xs text-slate-400 font-medium">{selectedDoctor.specialization} · ₹{selectedDoctor.consultation_fee}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsBookingModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {bookingStep === 1 ? (
                  <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">

                    {/* Left: Calendar */}
                    <div className="lg:w-[400px] shrink-0 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto">

                      {/* Consult type toggle */}
                      {selectedDoctor.offline_consultation_enabled && (
                        <div className="flex gap-2 mb-5 p-1 bg-slate-100 rounded-xl">
                          <button onClick={() => { setSelectedConsultationType('ONLINE'); setPaymentMode('FULL'); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${selectedConsultationType === 'ONLINE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
                            <Video size={14} /> Video
                          </button>
                          <button onClick={() => { setSelectedConsultationType('OFFLINE'); setPaymentMode('ADVANCE'); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${selectedConsultationType === 'OFFLINE' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>
                            <MapPin size={14} /> In-Clinic
                          </button>
                        </div>
                      )}
                      {selectedConsultationType === 'OFFLINE' && selectedDoctor.clinic_address && (
                        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl mb-5 text-xs text-amber-800">
                          <MapPin size={12} className="shrink-0 mt-0.5 text-amber-500" />
                          <span>{selectedDoctor.clinic_address}</span>
                        </div>
                      )}

                      {/* Month navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setCalendarMonth(prev => {
                            const d = new Date(prev.year, prev.month - 1);
                            return { year: d.getFullYear(), month: d.getMonth() };
                          })}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          onClick={() => setCalendarMonth(prev => {
                            const d = new Date(prev.year, prev.month + 1);
                            return { year: d.getFullYear(), month: d.getMonth() };
                          })}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* Day-of-week headers */}
                      <div className="grid grid-cols-7 mb-2">
                        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                          <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-1">{d}</div>
                        ))}
                      </div>

                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-y-1">
                        {(() => {
                          const availSet = getAvailableDateSet();
                          const todayISO = (() => { const t = new Date(); const tz = t.getTimezoneOffset() * 60000; return new Date(t.getTime() - tz).toISOString().split('T')[0]; })();
                          return calendarDays.map((day, idx) => {
                            if (day === null) return <div key={`empty-${idx}`} />;
                            const iso = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                            const isAvailable = availSet.has(iso);
                            const isSelected = selectedDate === iso;
                            const isToday = iso === todayISO;
                            const isPast = iso < todayISO;
                            return (
                              <button
                                key={iso}
                                disabled={!isAvailable}
                                onClick={() => { setSelectedDate(iso); setSelectedTime(null); }}
                                className={`relative h-9 w-full flex items-center justify-center rounded-full text-sm font-bold transition-all
                                  ${isSelected ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' :
                                    isToday && isAvailable ? 'ring-2 ring-emerald-500 text-emerald-700 hover:bg-emerald-50' :
                                    isAvailable ? 'text-slate-800 hover:bg-emerald-50 hover:text-emerald-700' :
                                    isPast ? 'text-slate-200 cursor-not-allowed' :
                                    'text-slate-300 cursor-not-allowed'}`}
                              >
                                {day}
                                {isAvailable && !isSelected && (
                                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>

                      <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Dates with available slots
                      </p>
                    </div>

                    {/* Right: Time Slots */}
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                      <div className="px-6 pt-5 pb-3 shrink-0 border-b border-slate-50">
                        {selectedDate ? (
                          <div>
                            <p className="font-extrabold text-slate-900">
                              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            {!isLoadingSlots && (
                              <p className="text-xs text-slate-400 mt-0.5">{getAvailableCount()} slot{getAvailableCount() !== 1 ? 's' : ''} available</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-400 font-medium text-sm">Select a date to see available slots</p>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto px-6 py-4">
                        {!selectedDate ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                            <CalendarIcon size={40} />
                            <p className="font-medium text-sm">Pick a date on the left</p>
                          </div>
                        ) : isLoadingSlots ? (
                          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={28} /></div>
                        ) : availableSlots.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                            <Clock size={40} />
                            <p className="font-medium text-sm">No slots available for this date</p>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {Object.entries(groupedSlots).map(([period, slots]) => {
                              if (slots.length === 0) return null;
                              let Icon = Sunrise;
                              if (period === 'Afternoon') Icon = Sun;
                              if (period === 'Evening') Icon = Moon;
                              if (period === 'Night') Icon = MoonStar;
                              return (
                                <div key={period}>
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    <Icon size={13} className="text-emerald-500" /> {period}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {slots.map(slot => {
                                      const timeLabel = new Date(slot.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                      const isSel = selectedTime === slot.time;
                                      return (
                                        <button
                                          key={slot.time}
                                          disabled={slot.is_booked}
                                          onClick={() => setSelectedTime(slot.time)}
                                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                            slot.is_booked
                                              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through'
                                              : isSel
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/25'
                                                : 'border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'
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
                      </div>

                      {/* Footer CTA */}
                      <div className="px-6 py-4 border-t border-slate-100 shrink-0">
                        <button
                          disabled={!selectedTime || isLoadingSlots}
                          onClick={() => setBookingStep(2)}
                          className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {selectedTime
                            ? <>Continue <ChevronRight size={16} /></>
                            : 'Select a time slot'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : bookingStep === 2 ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} className="text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Confirm & Pay</h3>
                    <p className="text-slate-500 mb-2 text-sm">
                      {selectedConsultationType === 'OFFLINE' ? 'In-Clinic Visit' : 'Video Consultation'} with
                    </p>
                    <p className="text-xl font-extrabold text-slate-900 mb-1">{selectedDoctor.name}</p>
                    <p className="text-emerald-600 font-bold mb-2">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {' at '}
                      {selectedTime && new Date(selectedTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {selectedConsultationType === 'ONLINE' && (
                      <p className="text-2xl font-black text-slate-900 mb-6">₹{selectedDoctor.consultation_fee}</p>
                    )}
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-4">
                      {selectedConsultationType === 'OFFLINE'
                        ? <><MapPin size={14} className="text-amber-500" /> {selectedDoctor.clinic_address || 'Clinic location TBD'}</>
                        : <><Video size={14} className="text-blue-500" /> Link will be shared before the call</>
                      }
                    </div>

                    {/* Payment mode toggle — in-clinic visits only */}
                    {selectedConsultationType === 'OFFLINE' && (() => {
                      const fee = selectedDoctor.consultation_fee;
                      const payNow = paymentMode === 'ADVANCE' ? Math.round(fee * 0.1) : fee;
                      return (
                        <div className="mb-5 text-left">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Option</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { mode: 'ADVANCE' as const, label: 'Advance 10%', sub: `₹${Math.round(fee * 0.1)}`, badge: 'Save now' },
                              { mode: 'FULL' as const, label: 'Full Payment', sub: `₹${fee}`, badge: '' },
                            ]).map(opt => {
                              const active = paymentMode === opt.mode;
                              return (
                                <button
                                  key={opt.mode}
                                  type="button"
                                  onClick={() => setPaymentMode(opt.mode)}
                                  disabled={isBooking}
                                  className={`relative py-3.5 rounded-2xl text-center transition-all disabled:opacity-60 border-2 ${
                                    active
                                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-600 shadow-lg shadow-emerald-600/30 scale-[1.02]'
                                      : 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/70'
                                  }`}
                                >
                                  {opt.badge && (
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm whitespace-nowrap">{opt.badge}</span>
                                  )}
                                  {active && <Check size={14} className="absolute top-2 right-2 text-white" strokeWidth={3} />}
                                  <p className={`text-sm font-extrabold ${active ? 'text-white' : 'text-emerald-800'}`}>{opt.label}</p>
                                  <p className={`text-base font-black ${active ? 'text-white' : 'text-emerald-600'}`}>{opt.sub}</p>
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-4 p-4 rounded-2xl bg-emerald-950 text-white">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-emerald-200">Pay Now</span>
                              <span className="text-2xl font-black">₹{payNow}</span>
                            </div>
                            {paymentMode === 'ADVANCE' && (
                              <div className="flex items-start gap-2 mt-3 pt-3 border-t border-white/10">
                                <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-300" />
                                <p className="text-xs text-emerald-100/80 leading-relaxed">
                                  Reserve your slot with just 10% now. Pay the remaining <strong className="text-white">₹{fee - payNow}</strong> at the clinic during your visit.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {paymentError && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium mb-4 text-left">
                        <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                        {paymentError}
                      </motion.div>
                    )}
                    <button onClick={handleConfirmBooking} disabled={isBooking}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-3">
                      {isBooking ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                      {isBooking ? 'Processing...' : `Pay ₹${paymentMode === 'ADVANCE' ? Math.round(selectedDoctor.consultation_fee * 0.1) : selectedDoctor.consultation_fee} & Confirm`}
                    </button>
                    <div className="mb-4 text-left">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Note for doctor <span className="font-normal text-slate-400 normal-case">(optional)</span></label>
                      <textarea
                        rows={2}
                        maxLength={500}
                        placeholder="Briefly describe your symptoms or reason for visit..."
                        value={patientNote}
                        onChange={(e) => setPatientNote(e.target.value)}
                        disabled={isBooking}
                        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none disabled:opacity-50"
                      />
                    </div>
                    <button onClick={() => { setBookingStep(1); setPaymentError(null); }} disabled={isBooking} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm disabled:opacity-30">
                      ← Change date or time
                    </button>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-10 text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} className="text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Payment & Booking Confirmed!</h3>
                    <p className="text-slate-500 text-sm">Your payment was successful and appointment is confirmed. You'll receive a confirmation shortly.</p>
                  </motion.div>
                )}
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
  );
}
