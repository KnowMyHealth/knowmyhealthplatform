import Link from 'next/link';
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-emerald-950 text-white pt-24 pb-12 overflow-hidden mt-20">
      {/* Massive soft glowing radial gradient at the top edge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[400px] bg-teal-500/20 blur-[120px] rounded-[100%] pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand & Contact */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">Know My Health</h2>
            <p className="text-emerald-200/80 leading-relaxed max-w-xs">
              Compassionate care through a holistic approach and evidence-based medicine.
            </p>
            <a 
              href="mailto:knowmyhealth1@gmail.com" 
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-sm"
            >
              <Mail size={18} className="text-teal-400" />
              <span className="font-medium">knowmyhealth1@gmail.com</span>
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Quick Navigation</h3>
            <ul className="space-y-4">
              {['Home', 'Diagnostics', 'Checkups', 'Prescription Vault', 'Complaints', 'Insights & Blog'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-emerald-200/70 hover:text-teal-400 transition-colors flex items-center group">
                    <ArrowRight size={14} className="mr-2 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Our Services</h3>
            <ul className="space-y-4">
              {['AI Test Recommendations', 'Full Body Checkups', 'Prescription Analysis', 'Symptom Checker', 'Online Consultations'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-emerald-200/70 hover:text-teal-400 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 text-emerald-200/70">
                <Phone size={20} className="text-teal-400 shrink-0 mt-0.5" />
                <span>+91 78929 34391<br/>Mon - Sat, 9:00 AM - 8:00 PM</span>
              </li>
              <li className="flex items-start space-x-3 text-emerald-200/70">
                <MapPin size={20} className="text-teal-400 shrink-0 mt-0.5" />
                <span>123 Health Avenue, Medical District<br/>Bangalore, Karnataka 560001</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-sm text-emerald-200/50">
          <p>© {new Date().getFullYear()} Know My Health. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
