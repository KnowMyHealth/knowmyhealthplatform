'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, ShoppingCart, Brain, Loader2, X, CheckCircle2, ArrowRight, Activity, ShieldCheck, Clock, Check } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

const categories = ['All Tests', 'BMD', 'CT', 'Mammography', 'MRI', 'Blood Tests', 'X-Ray', 'Ultrasound'];

const diagnostics = [
  { id: 1, name: 'CT Abdomen & Pelvis', category: 'CT', lab: 'Apollo Diagnostics', price: 5000, discountPrice: 3750, discount: 25, turnaround: '24 Hours' },
  { id: 2, name: 'MRI Brain with Contrast', category: 'MRI', lab: 'Dr. Lal PathLabs', price: 8000, discountPrice: 6000, discount: 25, turnaround: '24 Hours' },
  { id: 3, name: 'BMD Whole Body', category: 'BMD', lab: 'Metropolis Healthcare', price: 3000, discountPrice: 2250, discount: 25, turnaround: '12 Hours' },
  { id: 4, name: 'Bilateral Mammography', category: 'Mammography', lab: 'SRL Diagnostics', price: 2500, discountPrice: 1875, discount: 25, turnaround: '24 Hours' },
  { id: 5, name: 'Complete Blood Count (CBC)', category: 'Blood Tests', lab: 'Apollo Diagnostics', price: 500, discountPrice: 375, discount: 25, turnaround: '8 Hours' },
  { id: 6, name: 'Chest X-Ray PA View', category: 'X-Ray', lab: 'Dr. Lal PathLabs', price: 600, discountPrice: 450, discount: 25, turnaround: '4 Hours' },
  { id: 7, name: 'Thyroid Profile (T3, T4, TSH)', category: 'Blood Tests', lab: 'Metropolis Healthcare', price: 800, discountPrice: 600, discount: 25, turnaround: '12 Hours' },
  { id: 8, name: 'Lipid Profile', category: 'Blood Tests', lab: 'SRL Diagnostics', price: 900, discountPrice: 675, discount: 25, turnaround: '12 Hours' },
  { id: 9, name: 'Ultrasound Whole Abdomen', category: 'Ultrasound', lab: 'Apollo Diagnostics', price: 1500, discountPrice: 1125, discount: 25, turnaround: 'Same Day' },
  { id: 10, name: 'HbA1c (Glycosylated Hemoglobin)', category: 'Blood Tests', lab: 'Dr. Lal PathLabs', price: 600, discountPrice: 450, discount: 25, turnaround: '8 Hours' },
];

interface CartItem {
  testId: number;
  quantity: number;
}

interface AIRecommendation {
  testId: number;
  reason: string;
}

import ProtectedRoute from '@/components/ProtectedRoute';

export default function DiagnosticsPage() {
  const [activeCategory, setActiveCategory] = useState('All Tests');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI Modal State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[] | null>(null);

  const filteredTests = diagnostics.filter(t => {
    const matchesCategory = activeCategory === 'All Tests' || t.category === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartItems = cart.map(item => {
    const test = diagnostics.find(t => t.id === item.testId)!;
    return { ...test, quantity: item.quantity };
  });

  const cartTotal = cartItems.reduce((total, item) => total + (item.discountPrice * item.quantity), 0);
  const cartOriginalTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  const addToCart = (testId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.testId === testId);
      if (existing) {
        return prev.map(item => item.testId === testId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { testId, quantity: 1 }];
    });
  };

  const removeFromCart = (testId: number) => {
    setCart(prev => prev.filter(item => item.testId !== testId));
  };

  const handleCheckout = () => {
    setIsCheckoutSuccess(true);
    setTimeout(() => {
      setCart([]);
      setIsCheckoutSuccess(false);
      setIsCartOpen(false);
    }, 3000);
  };

  const handleGetRecommendation = async () => {
    if (!symptoms.trim()) return;
    setIsAnalyzing(true);
    setAiRecommendations(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      
      const availableTestsList = diagnostics.map(t => `{ id: ${t.id}, name: "${t.name}", category: "${t.category}" }`).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `A patient is experiencing the following symptoms: "${symptoms}". 
        Based on these symptoms, recommend the most relevant diagnostic tests ONLY from the following available list:
        ${availableTestsList}
        
        Do not provide medical advice or diagnoses. Only return the recommended tests from the provided list.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    testId: { type: Type.NUMBER, description: "The ID of the recommended test from the provided list" },
                    reason: { type: Type.STRING, description: "A short, 1-sentence reason why this test is recommended based on the symptoms" }
                  },
                  required: ["testId", "reason"]
                }
              }
            },
            required: ["recommendations"]
          }
        }
      });
      
      const jsonResponse = JSON.parse(response.text || '{}');
      setAiRecommendations(jsonResponse.recommendations || []);
    } catch (error) {
      console.error(error);
      setAiRecommendations([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="Patient">
      <div className="w-full min-h-screen bg-emerald-50/30 pb-24">
        {/* Hero Banner */}
        <div className="bg-emerald-950 pt-32 pb-20 px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 bg-emerald-800/50 border border-emerald-700/50 rounded-full px-4 py-2 mb-6">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="text-sm font-medium text-emerald-200">NABL Accredited Labs</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Book Diagnostics <br/>
                <span className="text-emerald-400">With Confidence.</span>
              </h1>
              <p className="text-emerald-100/80 text-lg mb-8 max-w-xl leading-relaxed">
                Access top-tier diagnostic centers, book home sample collections, and get your reports digitally. Not sure what to book? Let our AI guide you.
              </p>
              <button 
                onClick={() => setIsAIModalOpen(true)}
                className="px-8 py-4 bg-white text-emerald-950 font-bold rounded-full hover:bg-emerald-50 transition-all flex items-center space-x-3 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105"
              >
                <Brain size={22} className="text-emerald-600" />
                <span>Try AI Test Recommender</span>
              </button>
            </div>
            
            <div className="hidden lg:grid grid-cols-2 gap-4 w-full max-w-md">
              {[
                { icon: Activity, title: 'Accurate Results', desc: 'From certified labs' },
                { icon: Clock, title: 'Fast Turnaround', desc: 'Reports in 24 hours' },
                { icon: ShieldCheck, title: 'Secure Data', desc: 'Encrypted health records' },
              ].map((feature, i) => (
                <div key={i} className={`p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md ${i === 2 ? 'col-span-2' : ''}`}>
                  <feature.icon size={24} className="text-emerald-400 mb-4" />
                  <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                  <p className="text-emerald-200/60 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
          {/* Search & Filter */}
          <div className="bg-white rounded-[2rem] p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-4 mb-12">
            <div className="relative w-full md:w-96 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50" size={20} />
              <input 
                type="text" 
                placeholder="Search for tests..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-emerald-50/50 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex overflow-x-auto hide-scrollbar gap-2 w-full md:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-6 py-3 rounded-full font-medium transition-all text-sm ${
                    activeCategory === cat 
                      ? 'bg-emerald-950 text-white shadow-md' 
                      : 'bg-transparent text-emerald-900/70 hover:bg-emerald-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Test Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => {
              const inCart = cart.some(item => item.testId === test.id);
              return (
                <motion.div 
                  key={test.id}
                  whileHover={{ y: -4 }}
                  className="bg-white border border-emerald-100 rounded-[2rem] p-6 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(5,150,105,0.1)] transition-all flex flex-col group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                      {test.category}
                    </span>
                    <span className="flex items-center space-x-1 text-xs font-medium text-emerald-900/50 bg-emerald-50 px-2 py-1 rounded-lg">
                      <Clock size={12} />
                      <span>{test.turnaround}</span>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-emerald-950 mb-2 group-hover:text-emerald-700 transition-colors">{test.name}</h3>
                  <p className="text-sm text-emerald-900/60 mb-6 flex-1">By {test.lab}</p>
                  
                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-emerald-50">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase tracking-wider">
                          {test.discount}% OFF
                        </span>
                        <p className="text-xs text-emerald-900/40 line-through">₹{test.price}</p>
                      </div>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-2xl font-black text-emerald-950">₹{test.discountPrice}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => inCart ? removeFromCart(test.id) : addToCart(test.id)}
                      className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                        inCart 
                          ? 'bg-emerald-950 text-white shadow-md' 
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                      }`}
                    >
                      {inCart ? <Check size={20} /> : <Plus size={20} />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {filteredTests.length === 0 && (
            <div className="text-center py-24">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-2">No tests found</h3>
              <p className="text-emerald-900/60">Try adjusting your search or category filter.</p>
            </div>
          )}
        </div>

        {/* Global Floating Cart Button */}
        <AnimatePresence>
          {cart.length > 0 && !isCartOpen && (
            <motion.button 
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              onClick={() => setIsCartOpen(true)}
              className="fixed bottom-8 right-8 px-6 py-4 bg-emerald-950 text-white rounded-full shadow-[0_20px_40px_-15px_rgba(5,150,105,0.5)] flex items-center space-x-4 z-40 hover:bg-emerald-900 transition-all hover:scale-105"
            >
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full text-xs flex items-center justify-center font-bold border-2 border-emerald-950">
                  {cart.length}
                </span>
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-xs text-emerald-300 font-medium">View Cart</span>
                <span className="font-bold leading-none">₹{cartTotal}</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Cart Sidebar */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
              >
                <div className="p-6 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
                  <h2 className="text-2xl font-bold text-emerald-950 flex items-center space-x-2">
                    <ShoppingCart size={24} className="text-emerald-600" />
                    <span>Your Cart</span>
                  </h2>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {isCheckoutSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center h-full text-center space-y-4"
                    >
                      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 size={48} />
                      </div>
                      <h3 className="text-2xl font-bold text-emerald-950">Booking Confirmed!</h3>
                      <p className="text-emerald-900/60">Your diagnostic tests have been booked successfully. We will contact you shortly with the details.</p>
                    </motion.div>
                  ) : cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                      <ShoppingCart size={64} className="text-emerald-900/20" />
                      <p className="text-emerald-900/60 font-medium">Your cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm">
                          <div className="flex-1">
                            <h4 className="font-bold text-emerald-950 text-sm mb-1">{item.name}</h4>
                            <p className="text-xs text-emerald-900/60 mb-3">{item.lab}</p>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-950">₹{item.discountPrice}</span>
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="text-xs font-medium text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isCheckoutSuccess && cartItems.length > 0 && (
                  <div className="p-6 bg-emerald-50/50 border-t border-emerald-100">
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm text-emerald-900/60">
                        <span>Total MRP</span>
                        <span className="line-through">₹{cartOriginalTotal}</span>
                      </div>
                      <div className="flex justify-between text-sm text-emerald-600 font-medium">
                        <span>Discount</span>
                        <span>- ₹{cartOriginalTotal - cartTotal}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-emerald-950 pt-3 border-t border-emerald-200/50">
                        <span>To Pay</span>
                        <span>₹{cartTotal}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleCheckout}
                      className="w-full py-4 bg-emerald-950 text-white font-bold rounded-xl hover:bg-emerald-900 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight size={20} />
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* AI Recommendation Modal */}
        <AnimatePresence>
          {isAIModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAIModalOpen(false)}
                className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-10 max-h-[90vh]"
              >
                <div className="flex items-center justify-between p-6 border-b border-emerald-100 bg-emerald-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                      <Brain size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-emerald-950">AI Test Recommender</h2>
                      <p className="text-xs text-emerald-900/60">Find the right tests from our catalog</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsAIModalOpen(false)}
                    className="p-2 text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto hide-scrollbar flex-1 bg-slate-50/50">
                  {!aiRecommendations && !isAnalyzing ? (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
                        <h3 className="font-semibold text-emerald-950 mb-2">How it works</h3>
                        <p className="text-sm text-emerald-900/70 leading-relaxed">
                          Describe your symptoms in detail. Our AI will analyze them and suggest the most relevant diagnostic tests <strong>available in our catalog</strong>.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-emerald-950 ml-1">Your Symptoms</label>
                        <textarea 
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          placeholder="e.g., I've been having a persistent headache for 3 days, feeling slightly dizzy, and have a mild fever..."
                          className="w-full h-32 p-4 bg-white border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none shadow-inner"
                        />
                      </div>
                      <button 
                        onClick={handleGetRecommendation}
                        disabled={!symptoms.trim()}
                        className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                      >
                        Find Relevant Tests
                      </button>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20 rounded-full animate-pulse" />
                        <Loader2 size={48} className="animate-spin text-emerald-600 relative z-10" />
                      </div>
                      <div className="text-center">
                        <p className="text-emerald-950 font-bold text-lg mb-1">Analyzing your symptoms...</p>
                        <p className="text-emerald-900/60 text-sm">Matching with our diagnostic catalog</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3">
                        <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-emerald-900/80">
                          Based on your symptoms, here are the tests available in our catalog that might be relevant. <strong>Please consult a doctor for a formal diagnosis.</strong>
                        </p>
                      </div>

                      {aiRecommendations?.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-emerald-950 font-medium">We couldn&apos;t find any directly matching tests in our catalog for these symptoms.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {aiRecommendations?.map((rec, idx) => {
                            const test = diagnostics.find(t => t.id === rec.testId);
                            if (!test) return null;
                            const inCart = cart.some(item => item.testId === test.id);
                            
                            return (
                              <div key={idx} className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-bold text-emerald-950 text-lg">{test.name}</h4>
                                    <p className="text-xs text-emerald-600 font-medium">{test.category} • {test.lab}</p>
                                  </div>
                                  <span className="font-black text-emerald-950">₹{test.discountPrice}</span>
                                </div>
                                <p className="text-sm text-emerald-900/70 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="font-semibold text-emerald-950">Why: </span>
                                  {rec.reason}
                                </p>
                                <button 
                                  onClick={() => inCart ? removeFromCart(test.id) : addToCart(test.id)}
                                  className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center space-x-2 ${
                                    inCart 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-emerald-950 text-white hover:bg-emerald-900'
                                  }`}
                                >
                                  {inCart ? (
                                    <>
                                      <Check size={16} />
                                      <span>Added to Cart</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={16} />
                                      <span>Add Test to Cart</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          setAiRecommendations(null);
                          setSymptoms('');
                        }}
                        className="w-full py-3 bg-white border border-emerald-200 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-colors mt-4"
                      >
                        Check Different Symptoms
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
