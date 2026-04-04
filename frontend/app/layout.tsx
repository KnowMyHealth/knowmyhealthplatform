import type {Metadata} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css'; // Global styles
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';
import { AuthProvider } from '@/lib/AuthContext';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Know My Health | Premium Healthcare',
  description: 'Compassionate care through holistic approach and evidence-based medicine.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} font-sans`}>
      <body className="antialiased min-h-screen flex flex-col bg-emerald-50/50 text-emerald-950 relative overflow-x-hidden" suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
          <Chatbot />
        </AuthProvider>
      </body>
    </html>
  );
}
