'use client';

import { motion } from 'motion/react';
import { ArrowRight, Phone, Activity, HeartPulse, Stethoscope, FileText, Pill, Brain, Star } from 'lucide-react';
import Floating3DElements from '@/components/Floating3DElements';
import StickyCallback from '@/components/StickyCallback';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const offerings = [
  { icon: Activity, title: 'AI Diagnostics', desc: 'Smart test recommendations based on symptoms.' },
  { icon: HeartPulse, title: 'Full Body Checkups', desc: 'Comprehensive health packages for all ages.' },
  { icon: FileText, title: 'Prescription Vault', desc: 'Securely store and analyze your medical records.' },
  { icon: Stethoscope, title: 'Expert Consultations', desc: 'Connect with top-tier medical professionals.' },
  { icon: Pill, title: 'Pharmacy Integration', desc: 'Order medicines directly from your prescriptions.' },
  { icon: Brain, title: 'Mental Wellness', desc: 'Holistic approach to your mental health.' },
];

const faqs = [
  { q: 'How does the AI prescription analysis work?', a: 'Our AI scans your uploaded prescription, extracts key information like medicines, dosage, and doctor notes, and provides an easy-to-understand summary and insights.' },
  { q: 'Are my medical records secure?', a: 'Yes, we use enterprise-grade encryption to ensure your health data is completely private and secure.' },
  { q: 'Can I book a home sample collection?', a: 'Absolutely. We offer home sample collection for most of our diagnostic tests and full body checkups.' },
  { q: 'How quickly do I get my test reports?', a: 'Most standard test reports are delivered digitally within 24-48 hours.' },
  { q: 'Do you offer online doctor consultations?', a: 'Yes, you can consult with our expert doctors via video or audio calls directly through the platform.' },
  { q: 'Is the AI symptom checker a substitute for a doctor?', a: 'No, the AI symptom checker is for informational purposes and test recommendations. It does not replace professional medical advice.' },
  { q: 'Can I track my health progress over time?', a: 'Yes, our dashboard allows you to track your test results and vital signs over time with easy-to-read charts.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit/debit cards, UPI, net banking, and popular digital wallets.' },
];

const testimonials = [
  { name: 'Sarah Jenkins', role: 'Patient', text: 'The AI prescription vault is a game-changer. I finally understand what my doctor prescribed without having to google every single medicine.', rating: 5 },
  { name: 'David Chen', role: 'Patient', text: 'Booked a full body checkup. The process was seamless, and the home collection was right on time. Highly recommend Know My Health.', rating: 5 },
  { name: 'Priya Sharma', role: 'Patient', text: 'The symptom checker accurately recommended the tests I needed. Saved me a lot of time and anxiety.', rating: 4 },
];

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const { isLoggedIn, userRole } = useAuth();
  const router = useRouter();

  // Redirect users dynamically based on their role
  useEffect(() => {
    if (isLoggedIn) {
      if (userRole === 'ADMIN') {
        router.push('/admin');
      } else if (userRole === 'PARTNER') {
        router.push('/partner');
      } else if (userRole === 'DOCTOR') {
        router.push('/doctor'); // Redirect to doctor portal
      }
    }
  }, [isLoggedIn, userRole, router]);

  if (isLoggedIn && (userRole === 'ADMIN' || userRole === 'PARTNER' || userRole === 'DOCTOR')) {
    return null; // Don't render the landing page while redirecting
  }

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-32 overflow-hidden">
        <Floating3DElements />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-teal-100/50 border border-teal-200/50 backdrop-blur-md">
              <span className="text-sm font-bold tracking-wider text-teal-700 uppercase">Compassionate Care Through Holistic Approach</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold text-emerald-950 tracking-tight leading-[1.1]">
              Your Health, Our <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Evidence Based</span> Medicine.
            </h1>
            
            <p className="text-lg text-emerald-900/70 max-w-xl leading-relaxed">
              Experience the future of healthcare with AI-powered diagnostics, secure record management, and expert consultations all in one premium platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button className="group flex items-center space-x-3 px-8 py-4 bg-emerald-900 text-white rounded-full font-semibold hover:bg-emerald-950 transition-all shadow-[0_10px_20px_-10px_rgba(2,44,34,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(2,44,34,0.6)]">
                <span>Provide your Symptoms Now</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Floating Search/Callback Box */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-12 p-8 bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] max-w-xl"
            >
              <div className="mb-6">
                <h3 className="text-emerald-700 font-semibold mb-1">Call Us</h3>
                <p className="text-3xl font-extrabold text-slate-900">+91 78929 34391</p>
              </div>

              <div className="relative flex items-center py-4 mb-6">
                <div className="flex-grow border-t border-gray-300/60"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OR</span>
                <div className="flex-grow border-t border-gray-300/60"></div>
              </div>

              <div className="mb-6">
                <h3 className="text-emerald-700 font-semibold text-xl mb-2">Request a Callback</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Fill in your details to book an appointment. We&apos;ll reach out to you shortly.
                </p>
              </div>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    placeholder="Your Name *" 
                    required
                    className="flex-1 min-w-0 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 placeholder:text-gray-400"
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number (10 digits)" 
                    required
                    pattern="[0-9]{10}"
                    className="flex-1 min-w-0 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 placeholder:text-gray-400"
                  />
                  <button 
                    type="submit"
                    className="shrink-0 px-6 py-3 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
                  >
                    Submit
                  </button>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mt-4">
                  * By submitting, you agree to our T&Cs and Privacy Policy. You may receive a call from us regarding offers or promotions.
                </p>
              </form>
            </motion.div>
          </motion.div>

          <div className="hidden lg:block h-full w-full relative">
             {/* 3D elements populate this area */}
          </div>
        </div>
      </section>

      {/* Our Offerings - Bento Grid */}
      <section className="py-24 relative z-10 bg-white/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-emerald-950 mb-4">Comprehensive Healthcare Solutions</h2>
            <p className="text-emerald-900/60 max-w-2xl mx-auto">Everything you need to manage your health effectively, powered by advanced technology and medical expertise.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[250px]">
            <motion.div
              whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
              className="md:col-span-2 lg:col-span-2 row-span-2 p-8 bg-gradient-to-br from-emerald-900 to-teal-950 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(2,44,34,0.5)] relative overflow-hidden group [transform-style:preserve-3d] [perspective:1000px]"
            >
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-emerald-400/30 transition-colors duration-700" />
              <div className="relative z-10 h-full flex flex-col justify-between [transform:translateZ(30px)]">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10">
                  <Activity size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">AI Diagnostics</h3>
                  <p className="text-emerald-100/80 text-lg max-w-md">Smart test recommendations based on your unique symptoms. Let our advanced AI guide you to the right diagnostic path instantly.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="md:col-span-1 lg:col-span-2 row-span-1 p-8 bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-sm flex items-center gap-6 relative overflow-hidden"
            >
              <div className="absolute top-4 right-6 px-3 py-1 bg-emerald-100/50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-200/50">
                Coming Soon
              </div>
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600/50">
                <HeartPulse size={28} />
              </div>
              <div className="opacity-70">
                <h3 className="text-xl font-bold text-emerald-950 mb-2">Full Body Checkups</h3>
                <p className="text-emerald-900/70">Comprehensive health packages for all ages.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -5 }}
              className="md:col-span-1 lg:col-span-1 row-span-1 p-8 bg-emerald-50/80 backdrop-blur-xl border border-emerald-100/50 rounded-[2.5rem] shadow-[0_10px_30px_-15px_rgba(5,150,105,0.1)] flex flex-col justify-between group"
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950 mb-2">Prescription Vault</h3>
                <p className="text-sm text-emerald-900/70">Securely store and analyze records.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -5 }}
              className="md:col-span-1 lg:col-span-1 row-span-1 p-8 bg-teal-50/80 backdrop-blur-xl border border-teal-100/50 rounded-[2.5rem] shadow-[0_10px_30px_-15px_rgba(5,150,105,0.1)] flex flex-col justify-between group"
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-teal-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Stethoscope size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-teal-950 mb-2">Expert Consults</h3>
                <p className="text-sm text-teal-900/70">Connect with top-tier professionals.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -5 }}
              className="md:col-span-1 lg:col-span-2 row-span-1 p-8 bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2.5rem] shadow-[0_10px_30px_-15px_rgba(5,150,105,0.1)] flex items-center gap-6 group"
            >
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-500">
                <Pill size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">Pharmacy Integration</h3>
                <p className="text-emerald-900/70">Order medicines directly from your prescriptions.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -5 }}
              className="md:col-span-2 lg:col-span-2 row-span-1 p-8 bg-emerald-900/5 backdrop-blur-xl border border-emerald-900/10 rounded-[2.5rem] shadow-[0_10px_30px_-15px_rgba(5,150,105,0.1)] flex items-center justify-between group overflow-hidden relative"
            >
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-200/50 blur-[40px] rounded-full" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md mb-4">
                  <Brain size={24} />
                </div>
                <h3 className="text-xl font-bold text-emerald-950 mb-2">Mental Wellness</h3>
                <p className="text-emerald-900/70">Holistic approach to your mental health.</p>
              </div>
              <div className="relative z-10 hidden sm:block">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-4xl font-bold text-emerald-950">Why Choose <br/>Know My Health?</h2>
              <p className="text-emerald-900/70">We combine cutting-edge AI technology with compassionate human care to deliver unparalleled health outcomes.</p>
            </div>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-8">
              {[
                { num: '01', title: 'Evidence-Based', desc: 'All our AI models and medical advice are backed by rigorous scientific research.' },
                { num: '02', title: 'Data Privacy', desc: 'Your health data is encrypted and strictly confidential. You own your data.' },
                { num: '03', title: 'Holistic Approach', desc: 'We look at the complete picture of your health, not just isolated symptoms.' },
                { num: '04', title: '24/7 Support', desc: 'Our AI assistant and medical team are always available when you need them.' },
              ].map((item, i) => (
                <div key={i} className="relative p-6 rounded-3xl bg-white/40 border border-white/50 overflow-hidden">
                  <span className="absolute -top-4 -right-4 text-8xl font-black text-emerald-100/50 select-none">{item.num}</span>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-emerald-950 mb-2">{item.title}</h3>
                    <p className="text-emerald-900/70">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-emerald-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-teal-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-[100vw] mx-auto relative z-10">
          <h2 className="text-4xl font-bold mb-12 text-center px-6">Frequently Asked Questions</h2>
          <div className="relative flex overflow-hidden group py-8">
            <div className="flex gap-6 px-3 w-max animate-marquee group-hover:[animation-play-state:paused]">
              {[...faqs, ...faqs].map((faq, i) => (
                <div 
                  key={i}
                  onMouseEnter={() => setActiveFaq(i)}
                  onMouseLeave={() => setActiveFaq(null)}
                  className={`w-[300px] md:w-[400px] shrink-0 p-8 rounded-[2rem] border transition-all duration-300 cursor-pointer ${
                    activeFaq === i 
                      ? 'bg-emerald-600 border-emerald-500 shadow-2xl scale-105' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <h3 className="text-xl font-semibold mb-4">{faq.q}</h3>
                  <p className={activeFaq === i ? 'text-emerald-50' : 'text-emerald-200/60'}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-emerald-950 mb-4">Patient Stories</h2>
            <p className="text-emerald-900/60 max-w-2xl mx-auto">Hear from the people who have experienced the Know My Health difference.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="p-8 bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2rem] shadow-[0_10px_30px_-15px_rgba(5,150,105,0.1)]">
                <div className="flex space-x-1 mb-6">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={20} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-emerald-950/80 italic mb-8 leading-relaxed">&quot;{t.text}&quot;</p>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950">{t.name}</h4>
                    <p className="text-sm text-emerald-900/60">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <StickyCallback />
    </div>
  );
}