'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Video, Calendar as CalendarIcon, Star, Clock, ChevronRight, Phone, MessageSquare, X, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

// Mock data for doctors
const doctors = [
  { id: 1, name: 'Dr. Sarah Jenkins', specialty: 'Cardiologist', city: 'New York', rating: 4.9, reviews: 128, image: 'https://picsum.photos/seed/doc1/200/200', nextAvailable: 'Today, 2:00 PM', fee: '$150', isOnline: true },
  { id: 2, name: 'Dr. Michael Chen', specialty: 'Neurologist', city: 'San Francisco', rating: 4.8, reviews: 95, image: 'https://picsum.photos/seed/doc2/200/200', nextAvailable: 'Tomorrow, 10:30 AM', fee: '$200', isOnline: false },
  { id: 3, name: 'Dr. Emily Rodriguez', specialty: 'Dermatologist', city: 'Miami', rating: 4.9, reviews: 210, image: 'https://picsum.photos/seed/doc3/200/200', nextAvailable: 'Today, 4:15 PM', fee: '$120', isOnline: true },
  { id: 4, name: 'Dr. James Wilson', specialty: 'General Physician', city: 'Chicago', rating: 4.7, reviews: 340, image: 'https://picsum.photos/seed/doc4/200/200', nextAvailable: 'In 30 mins', fee: '$80', isOnline: true },
  { id: 5, name: 'Dr. Anita Patel', specialty: 'Pediatrician', city: 'Austin', rating: 4.9, reviews: 180, image: 'https://picsum.photos/seed/doc5/200/200', nextAvailable: 'Tomorrow, 9:00 AM', fee: '$130', isOnline: false },
  { id: 6, name: 'Dr. Robert Taylor', specialty: 'Orthopedist', city: 'Seattle', rating: 4.6, reviews: 85, image: 'https://picsum.photos/seed/doc6/200/200', nextAvailable: 'Thursday, 1:00 PM', fee: '$180', isOnline: true },
];

const specialties = ['All', 'Cardiologist', 'Neurologist', 'Dermatologist', 'General Physician', 'Pediatrician', 'Orthopedist'];

import ProtectedRoute from '@/components/ProtectedRoute';

export default function ConsultationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  
  const [selectedDoctor, setSelectedDoctor] = useState<typeof doctors[0] | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1: Select Time, 2: Confirm
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = doc.city.toLowerCase().includes(locationQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'All' || doc.specialty === selectedSpecialty;
    return matchesSearch && matchesLocation && matchesSpecialty;
  });

  const handleBookClick = (doctor: typeof doctors[0]) => {
    setSelectedDoctor(doctor);
    setIsBookingModalOpen(true);
    setBookingStep(1);
    setSelectedTime(null);
  };

  const handleConfirmBooking = () => {
    setBookingStep(2);
    // Simulate API call
    setTimeout(() => {
      setIsBookingModalOpen(false);
      // Could show a success toast here
    }, 2000);
  };

  return (
    <ProtectedRoute requiredRole="Patient">
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
          {/* Upcoming Video Consultation Card (Mock) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-emerald-100 mb-12 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md">
                  <Image src="https://picsum.photos/seed/doc1/200/200" alt="Dr. Sarah Jenkins" fill className="object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <Video size={14} className="text-emerald-600" />
                </div>
              </div>
              <div>
                <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider rounded-full mb-2">
                  Upcoming Appointment
                </div>
                <h3 className="text-xl font-bold text-gray-900">Dr. Sarah Jenkins</h3>
                <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                  <Clock size={16} /> Today at 2:00 PM (in 15 mins)
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsVideoCallActive(true)}
              className="w-full md:w-auto px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 animate-pulse"
            >
              <Video size={20} />
              <span>Join Video Call</span>
            </button>
          </motion.div>

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
            <AnimatePresence>
              {filteredDoctors.map((doctor, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  key={doctor.id}
                  className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                      <Image src={doctor.image} alt={doctor.name} fill className="object-cover" />
                      {doctor.isOnline && (
                        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{doctor.name}</h3>
                      <p className="text-emerald-600 font-medium text-sm mb-1">{doctor.specialty}</p>
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="text-gray-900 font-bold">{doctor.rating}</span>
                        <span>({doctor.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="font-medium">{doctor.city}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                      <Clock size={16} className="text-emerald-500" />
                      <span className="font-medium text-emerald-700">Next: {doctor.nextAvailable}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleBookClick(doctor)}
                      className="flex-1 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      Book Visit
                    </button>
                    <button 
                      onClick={() => handleBookClick(doctor)}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Video size={16} />
                      <span>Consult</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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
                      <p className="text-sm text-emerald-600 font-medium">{selectedDoctor.specialty}</p>
                      <p className="text-sm text-gray-500 font-medium mt-1">Consultation Fee: <span className="text-gray-900 font-bold">{selectedDoctor.fee}</span></p>
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
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all"
                      >
                        Confirm & Pay {selectedDoctor.fee}
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

        {/* Video Call Interface (Mock) */}
        <AnimatePresence>
          {isVideoCallActive && (
            <div className="fixed inset-0 z-[200] bg-gray-950 flex flex-col">
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="flex-1 relative"
              >
                {/* Main Video (Doctor) */}
                <div className="absolute inset-0">
                  <Image src="https://picsum.photos/seed/doc1/1920/1080" alt="Doctor Video" fill className="object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
                </div>
                
                {/* Self Video (Small) */}
                <div className="absolute top-6 right-6 w-32 h-48 md:w-48 md:h-64 bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-700 shadow-2xl">
                  <Image src="https://picsum.photos/seed/patient/400/600" alt="Your Video" fill className="object-cover" />
                </div>

                {/* Doctor Info Overlay */}
                <div className="absolute top-6 left-6 bg-gray-900/60 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-3 border border-gray-700">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white font-medium">Dr. Sarah Jenkins</span>
                  <span className="text-gray-400 text-sm">02:45</span>
                </div>

                {/* Controls */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 bg-gray-900/80 backdrop-blur-xl px-8 py-4 rounded-full border border-gray-700 shadow-2xl">
                  <button className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
                    <Phone size={20} className="rotate-[135deg]" />
                  </button>
                  <button className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
                    <Video size={20} />
                  </button>
                  <button className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
                    <MessageSquare size={20} />
                  </button>
                  <button 
                    onClick={() => setIsVideoCallActive(false)}
                    className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
                  >
                    <Phone size={24} className="rotate-[135deg]" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
