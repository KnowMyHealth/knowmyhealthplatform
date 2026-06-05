'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, Loader2, LogIn } from 'lucide-react';
import Markdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function Chatbot() {
  const { isLoggedIn, openAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
    { role: 'model', text: 'Hello! I am your Know My Health AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!isLoggedIn) { openAuthModal(); return; }
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();

      // Concatenate the last few messages to give the stateless backend some context
      const contextText = messages.slice(-5).map(m => `${m.role === 'model' ? 'AI' : 'User'}: ${m.text}`).join('\n');
      const promptWithContext = `${contextText}\nUser: ${userMessage}\nAI:`;

      const response = await fetch(`${BACKEND_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ prompt: promptWithContext })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process chat request');
      }
      
      setMessages(prev => [...prev, { role: 'model', text: data.data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 p-4 bg-emerald-600 text-white rounded-full shadow-[0_10px_25px_-5px_rgba(5,150,105,0.5)] hover:bg-emerald-700 transition-colors z-50 flex items-center justify-center"
          >
            <MessageSquare size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-white/90 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-[0_20px_40px_-15px_rgba(5,150,105,0.2)] flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-emerald-600 text-white">
              <div className="flex items-center space-x-2">
                <Bot size={24} />
                <span className="font-semibold">AI Health Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages / Auth gate */}
            {!isLoggedIn ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                  <Bot size={32} />
                </div>
                <div>
                  <p className="font-semibold text-emerald-950 text-base mb-1">Sign in to chat</p>
                  <p className="text-sm text-emerald-900/50">You need to be signed in to use the AI Health Assistant.</p>
                </div>
                <button
                  onClick={() => { setIsOpen(false); openAuthModal(); }}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <LogIn size={16} />
                  Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-tr-sm'
                          : 'bg-emerald-50 text-emerald-950 border border-emerald-100 rounded-tl-sm'
                      }`}>
                        {msg.role === 'model' ? (
                          <div className="prose prose-sm prose-emerald max-w-none">
                            <Markdown>{msg.text}</Markdown>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.text}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-emerald-50 text-emerald-950 border border-emerald-100 rounded-2xl rounded-tl-sm p-3 flex items-center space-x-2">
                        <Loader2 size={16} className="animate-spin text-emerald-600" />
                        <span className="text-sm text-emerald-600/70">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-emerald-100">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask about your health..."
                      className="w-full pl-4 pr-12 py-3 bg-emerald-50/50 border border-emerald-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 p-2 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
