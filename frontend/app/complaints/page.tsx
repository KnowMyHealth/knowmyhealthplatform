// frontend/app/complaints/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ArrowRight, Bot, User, 
  AlertCircle, Send, Stethoscope, ShoppingCart, 
  RotateCcw, CheckCircle2, Activity, Info, FileText,
  History, Calendar, ChevronRight, Loader2, ChevronLeft
} from 'lucide-react';
import Markdown from 'react-markdown';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';

// --- MOCK CATEGORIES & QUICK START SYMPTOMS ---
const categories = ['All', 'Fever', 'Pain', 'Digestive', 'Respiratory', 'Skin', 'Neurological'];

const quickSymptoms = [
  { title: 'High Fever', desc: 'Body temperature above 101°F (38.3°C), often accompanied by chills and sweating.', category: 'Fever' },
  { title: 'Severe Headache', desc: 'Intense throbbing or pressure in the head, possibly with nausea or light sensitivity.', category: 'Pain' },
  { title: 'Stomach Ache', desc: 'Cramps, dull ache, or sharp pain in the abdomen area.', category: 'Digestive' },
  { title: 'Shortness of Breath', desc: 'Difficulty breathing or feeling like you cannot get enough air.', category: 'Respiratory' },
  { title: 'Skin Rash', desc: 'Noticeable change in the texture or color of your skin.', category: 'Skin' },
  { title: 'Dizziness', desc: 'Feeling lightheaded, woozy, or as if the room is spinning.', category: 'Neurological' },
  { title: 'Joint Pain', desc: 'Discomfort, aches, and soreness in any of the body\'s joints.', category: 'Pain' },
  { title: 'Persistent Cough', desc: 'A cough that lasts for more than three weeks.', category: 'Respiratory' },
];

// --- TYPES ---
interface HistoryItem {
  role: 'user' | 'ai';
  content: string;
}

interface RecommendedTest {
  id: string;
  test_name: string;
  organization: string;
}

interface AssessmentReport {
  possible_causes: string[];
  recommended_tests: RecommendedTest[];
  general_advice: string;
}

interface PastReportBrief {
  id: string;
  possible_causes: string[];
  general_advice: string;
  created_at: string;
}

// Added 'past_report' to specifically handle viewing history without the chat interface
type ChatState = 'idle' | 'chatting' | 'report' | 'past_report';

export default function ComplaintsPage() {
  const router = useRouter();

  // Idle UI States
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // History States
  const [pastReports, setPastReports] = useState<PastReportBrief[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isFetchingReportId, setIsFetchingReportId] = useState<string | null>(null);

  // Chat UI States
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Report State
  const [report, setReport] = useState<AssessmentReport | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const filteredSymptoms = quickSymptoms.filter(s => {
    const matchesCat = activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Fetch past reports when returning to idle state
  useEffect(() => {
    if (chatState === 'idle') {
      fetchPastReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);

  const fetchPastReports = async () => {
    setIsLoadingReports(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('supabase_access_token');
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/v1/symptom-checker`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (res.ok) {
        const json = await res.json();
        const items = json.data || [];
        // Sort newest first
        items.sort((a: PastReportBrief, b: PastReportBrief) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setPastReports(items);
      }
    } catch (e) {
      console.error('Failed to fetch past reports:', e);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleViewPastReport = async (id: string) => {
    setIsFetchingReportId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('supabase_access_token');
      
      const res = await fetch(`${BACKEND_URL}/api/v1/symptom-checker/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setReport({
            possible_causes: json.data.possible_causes || [],
            general_advice: json.data.general_advice || '',
            // Map 'recommendations' from the GET response to our UI's 'recommended_tests'
            recommended_tests: json.data.recommendations || [] 
          });
          setHistory([]); 
          setChatState('past_report'); // Using the standalone report state
          window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top for better UX
        }
      }
    } catch (e) {
      console.error('Failed to fetch report details:', e);
    } finally {
      setIsFetchingReportId(null);
    }
  };

  // Safely auto-scroll ONLY the chat container interior
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollOptions = {
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth' as ScrollBehavior,
      };
      chatContainerRef.current.scrollTo(scrollOptions);
    }
  }, [history, isTyping]);

  // Smooth scroll page to report when it generates below the chat panel
  useEffect(() => {
    if (chatState === 'report' && reportContainerRef.current) {
      setTimeout(() => {
        reportContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [chatState]);

  // --- API INTERACTION (CHAT) ---
  const sendSymptomToAPI = async (message: string, currentHistory: HistoryItem[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || localStorage.getItem('supabase_access_token');
    
    const res = await fetch(`${BACKEND_URL}/api/v1/symptom-checker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        message: message,
        history: currentHistory
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || 'Failed to process symptom check. Please try again.');
    }

    const json = await res.json();
    return json.data;
  };

  const handleStartAnalysis = async (initialMessage: string) => {
    if (!initialMessage.trim()) return;
    
    setChatState('chatting');
    setHistory([{ role: 'user', content: initialMessage }]);
    setIsTyping(true);
    setError(null);
    setReport(null);

    try {
      const data = await sendSymptomToAPI(initialMessage, []);
      
      if (data.type === 'question') {
        setHistory(prev => [...prev, { role: 'ai', content: data.ai_reply }]);
      } else if (data.type === 'report') {
        setHistory(prev => [...prev, { role: 'ai', content: data.ai_reply }]);
        setReport(data.report);
        setChatState('report');
      }
    } catch (err: any) {
      setError(err.message);
      setChatState('idle'); 
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isTyping) return;

    const message = currentInput.trim();
    setCurrentInput('');
    setError(null);
    
    const historyToSent = [...history]; 
    
    setHistory(prev => [...prev, { role: 'user', content: message }]);
    setIsTyping(true);

    try {
      const data = await sendSymptomToAPI(message, historyToSent);

      if (data.type === 'question') {
        setHistory(prev => [...prev, { role: 'ai', content: data.ai_reply }]);
      } else if (data.type === 'report') {
        setHistory(prev => [...prev, { role: 'ai', content: data.ai_reply }]);
        setReport(data.report);
        setChatState('report');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setChatState('idle');
    setHistory([]);
    setReport(null);
    setSearchQuery('');
    setError(null);
  };

  const handleBookTests = () => {
    if (!report || !report.recommended_tests || report.recommended_tests.length === 0) return;
    const testIds = report.recommended_tests.map(t => t.id).join(',');
    router.push(`/diagnostics?autoAdd=${testIds}`);
  };

  // --- RENDERERS ---

  const renderIdleState = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-7xl mx-auto px-6 py-12"
    >
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 font-bold uppercase tracking-widest text-[10px] rounded-full mb-6 border border-emerald-200">
          <Activity size={14} /> AI-Powered Analysis
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-emerald-950 mb-4 tracking-tight">Symptom Checker</h1>
        <p className="text-emerald-900/60 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
          Describe what you&apos;re experiencing. Our medical AI will ask targeted follow-up questions to understand your condition and provide a clinical assessment.
        </p>
      </div>

      {/* Search Input */}
      <div className="max-w-3xl mx-auto mb-12 relative">
        <div className="absolute inset-0 bg-emerald-300/20 blur-2xl rounded-full" />
        <div className="relative flex items-center bg-white border border-emerald-100 p-2.5 rounded-full shadow-xl shadow-emerald-900/5">
          <Search className="ml-5 text-emerald-600/40 shrink-0" size={24} />
          <input 
            type="text" 
            placeholder="Describe your symptom... (e.g., sharp pain in lower back since yesterday)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') handleStartAnalysis(searchQuery); }}
            className="w-full px-5 py-4 bg-transparent border-none focus:outline-none text-lg text-emerald-950 placeholder:text-emerald-900/40 font-medium"
          />
          <button 
            onClick={() => handleStartAnalysis(searchQuery)}
            disabled={!searchQuery.trim()}
            className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700 transition-colors whitespace-nowrap disabled:opacity-50 shadow-md flex items-center gap-2"
          >
            Start Analysis <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
              activeCategory === cat 
                ? 'bg-emerald-950 text-white shadow-md' 
                : 'bg-white text-emerald-900/60 hover:text-emerald-900 hover:bg-emerald-50 border border-emerald-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Symptom Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-20">
        {filteredSymptoms.map((symptom, i) => (
          <div 
            key={i}
            onClick={() => handleStartAnalysis(`${symptom.title}. ${symptom.desc}`)}
            className="p-8 bg-white border border-emerald-100/50 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-emerald-900/10 hover:border-emerald-200 transition-all group cursor-pointer flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 blur-[40px] rounded-full group-hover:bg-emerald-100 transition-colors" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 bg-emerald-50 w-fit px-3 py-1 rounded-md border border-emerald-100">
              {symptom.category}
            </span>
            <h3 className="text-xl font-bold text-emerald-950 mb-3 relative z-10 group-hover:text-emerald-700 transition-colors">{symptom.title}</h3>
            <p className="text-sm text-emerald-900/60 mb-8 flex-1 relative z-10 leading-relaxed">{symptom.desc}</p>
            
            <div className="flex items-center text-emerald-600 font-bold text-sm mt-auto relative z-10">
              <span>Start Analysis</span>
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Assessment History Section */}
      <div className="pt-16 border-t border-emerald-100/50">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-emerald-950 flex items-center gap-3">
            <History className="text-emerald-600" /> Assessment History
          </h2>
        </div>

        {isLoadingReports ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : pastReports.length === 0 ? (
          <div className="text-center py-16 bg-white border border-emerald-100 rounded-[2rem]">
            <FileText size={48} className="mx-auto text-emerald-200 mb-4" />
            <h3 className="text-xl font-bold text-emerald-950 mb-2">No past assessments found</h3>
            <p className="text-emerald-900/60">Your completed symptom checks will appear here.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastReports.map((item) => (
              <div key={item.id} className="p-6 bg-white border border-emerald-100/80 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    <Calendar size={14} />
                    {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-emerald-900/40">Report</span>
                </div>
                
                <h4 className="font-bold text-emerald-950 text-lg mb-3 line-clamp-1">
                  {item.possible_causes?.[0] || 'Unknown Cause'}
                </h4>
                <p className="text-sm text-emerald-900/60 line-clamp-2 mb-6 flex-1">
                  {item.general_advice || 'No advice generated.'}
                </p>

                <button 
                  onClick={() => handleViewPastReport(item.id)}
                  disabled={isFetchingReportId === item.id}
                  className="w-full py-3 bg-slate-50 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 mt-auto disabled:opacity-50"
                >
                  {isFetchingReportId === item.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>View Full Report <ChevronRight size={16} /></>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderChatInterface = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8 min-h-[85vh]"
    >
      
      {/* 1. The Chat Panel Box */}
      <div className="bg-white border border-emerald-100 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] flex flex-col h-[600px] shrink-0 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-emerald-100/50 bg-white/80 backdrop-blur-xl flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm shrink-0">
              <Bot className="text-emerald-600" size={24} />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h2 className="text-lg font-black text-emerald-950 leading-tight">Clinical AI Assistant</h2>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Secure Session
              </p>
            </div>
          </div>
          <button 
            onClick={handleReset}
            className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <RotateCcw size={16} /> End Session
          </button>
        </div>

        {/* Chat History */}
        <div 
          className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#f8fafc]" 
          ref={chatContainerRef}
        >
          {history.length > 0 && (
            <div className="text-center pb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-200/50 px-3 py-1.5 rounded-full">Conversation History</span>
            </div>
          )}

          {history.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 ${
                  msg.role === 'user' 
                    ? 'bg-slate-200 text-slate-600' 
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                }`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                
                {/* Bubble */}
                <div className={`p-5 text-[15px] leading-relaxed shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] ${
                  msg.role === 'user' 
                    ? 'bg-emerald-950 text-white rounded-2xl rounded-tr-sm font-medium' 
                    : 'bg-white border border-slate-200/60 text-slate-700 rounded-2xl rounded-tl-sm'
                }`}>
                  {msg.role === 'ai' ? (
                    <div className="prose prose-sm prose-emerald max-w-none prose-p:leading-relaxed">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                  <Bot size={14} />
                </div>
                <div className="p-5 bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <div className="flex space-x-1.5 px-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-start gap-3 shadow-sm mx-auto max-w-lg mt-4">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Input Area (Disabled if Report generated) */}
        {chatState === 'chatting' && (
          <div className="p-6 bg-white border-t border-slate-100 z-10 shrink-0">
            <div className="max-w-4xl mx-auto relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder="Type your response here..."
                className="w-full bg-transparent border-none focus:ring-0 px-4 py-2 outline-none text-slate-800 font-medium placeholder:text-slate-400 disabled:opacity-50"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isTyping}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-center text-[11px] text-slate-400 mt-3 font-medium flex items-center justify-center gap-1.5">
              <Info size={12} /> Medical AI can make mistakes. Always consult with a qualified healthcare professional.
            </p>
          </div>
        )}
      </div>

      {/* 2. The Medical Report Box (Below Chat) */}
      <AnimatePresence>
        {chatState === 'report' && report && (
          <motion.div 
            ref={reportContainerRef}
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-white border border-emerald-200 rounded-[2.5rem] shadow-xl overflow-hidden shrink-0 mb-10"
          >
            <div className="bg-gradient-to-r from-emerald-950 to-teal-900 p-6 sm:px-10 text-white flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <CheckCircle2 size={32} className="text-emerald-100" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">Clinical Assessment Report</h3>
                <p className="text-emerald-100/80 font-medium text-sm mt-0.5">AI-Generated Preliminary Summary</p>
              </div>
            </div>

            <div className="p-6 sm:p-10 grid md:grid-cols-2 gap-10">
              
              {/* Left Column: Causes & Advice */}
              <div className="space-y-8">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <Activity size={16} /> Potential Causes
                  </h4>
                  <ul className="space-y-3">
                    {report.possible_causes.map((cause, i) => (
                      <li key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">{i+1}</div>
                        <span className="font-bold text-slate-800 text-sm">{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <AlertCircle size={16} /> Medical Advice
                  </h4>
                  <div className="bg-amber-50/50 border border-amber-200/60 p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                    <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
                      {report.general_advice}
                    </p>
                    <p className="text-[11px] text-amber-700/60 font-bold mt-4 pt-3 border-t border-amber-200/50">
                      Disclaimer: This assessment is not a substitute for professional diagnosis or treatment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Recommended Tests */}
              <div className="bg-emerald-50/50 rounded-[2rem] p-6 sm:p-8 border border-emerald-100 flex flex-col h-full">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <Stethoscope size={16} /> Recommended Tests
                </h4>

                {report.recommended_tests && report.recommended_tests.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <div className="space-y-3 mb-8 flex-1">
                      {report.recommended_tests.map((test, i) => (
                        <div key={i} className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-sm flex flex-col justify-center">
                          <p className="font-bold text-emerald-950 text-sm">{test.test_name}</p>
                          <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase tracking-wider">{test.organization}</p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={handleBookTests}
                      className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                      <ShoppingCart size={18} />
                      Add Tests to Cart
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-60">
                    <CheckCircle2 size={48} className="text-emerald-600 mb-4" />
                    <p className="font-bold text-emerald-950">No specific lab tests required.</p>
                    <p className="text-sm text-emerald-900/60 mt-1">Please follow the general advice.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );

  const renderPastReport = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6 min-h-[85vh]"
    >
      <button 
        onClick={handleReset}
        className="w-fit px-5 py-2.5 bg-white border border-emerald-200 text-emerald-700 font-bold rounded-full hover:bg-emerald-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
      >
        <ChevronLeft size={18} /> Back to Symptom Checker
      </button>

      {report && (
        <div className="bg-white border border-emerald-200 rounded-[2.5rem] shadow-xl overflow-hidden flex-1">
          <div className="bg-gradient-to-r from-emerald-950 to-teal-900 p-6 sm:px-10 text-white flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <History size={32} className="text-emerald-100" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">Past Clinical Assessment</h3>
              <p className="text-emerald-100/80 font-medium text-sm mt-0.5">Retrieved from your medical history vault.</p>
            </div>
          </div>

          <div className="p-6 sm:p-10 grid md:grid-cols-2 gap-10">
            {/* Left Column: Causes & Advice */}
            <div className="space-y-8">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <Activity size={16} /> Potential Causes
                </h4>
                <ul className="space-y-3">
                  {report.possible_causes.map((cause, i) => (
                    <li key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">{i+1}</div>
                      <span className="font-bold text-slate-800 text-sm">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} /> Medical Advice
                </h4>
                <div className="bg-amber-50/50 border border-amber-200/60 p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                  <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
                    {report.general_advice}
                  </p>
                  <p className="text-[11px] text-amber-700/60 font-bold mt-4 pt-3 border-t border-amber-200/50">
                    Disclaimer: This assessment is not a substitute for professional diagnosis or treatment.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Recommended Tests */}
            <div className="bg-emerald-50/50 rounded-[2rem] p-6 sm:p-8 border border-emerald-100 flex flex-col h-full">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Stethoscope size={16} /> Recommended Tests
              </h4>

              {report.recommended_tests && report.recommended_tests.length > 0 ? (
                <div className="flex flex-col h-full">
                  <div className="space-y-3 mb-8 flex-1">
                    {report.recommended_tests.map((test, i) => (
                      <div key={i} className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-sm flex flex-col justify-center">
                        <p className="font-bold text-emerald-950 text-sm">{test.test_name}</p>
                        <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase tracking-wider">{test.organization}</p>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={handleBookTests}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                    <ShoppingCart size={18} />
                    Book Again
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-60">
                  <CheckCircle2 size={48} className="text-emerald-600 mb-4" />
                  <p className="font-bold text-emerald-950">No specific lab tests required.</p>
                  <p className="text-sm text-emerald-900/60 mt-1">Please follow the general advice.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="w-full min-h-screen bg-[#f8fafc]">
        <AnimatePresence mode="wait">
          {chatState === 'idle' && renderIdleState()}
          {(chatState === 'chatting' || chatState === 'report') && renderChatInterface()}
          {chatState === 'past_report' && renderPastReport()}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}