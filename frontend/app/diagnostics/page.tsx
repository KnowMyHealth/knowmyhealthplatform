'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, ShoppingCart, Brain, Loader2, X, 
  CheckCircle2, ArrowRight, Activity, ShieldCheck, 
  Clock, Check, Zap, Info, Ticket 
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';

interface CartItem {
  testId: string;
  quantity: number;
}

interface AIRecommendation {
  testId: string;
  reason: string;
}

interface FetchedTest {
  id: string;
  name: string;
  category: string;
  lab: string;
  price: number;
  discountPrice: number;
  discount: number;
  turnaround: number;
  popular: boolean;
}

function DiagnosticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<string[]>(['All Tests']);
  const [diagnostics, setDiagnostics] = useState<FetchedTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState('All Tests');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[] | null>(null);

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Success Toast for Auto-Adding to Cart
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL Param routing (Auto Add to Cart)
  useEffect(() => {
    const autoAddIds = searchParams.get('autoAdd');
    if (autoAddIds && diagnostics.length > 0) {
      const idsArray = autoAddIds.split(',');
      let itemsAdded = 0;
      
      setCart(prev => {
        const newCart = [...prev];
        idsArray.forEach(id => {
          // Only add if it actually exists in the catalog and isn't already in the cart
          if (diagnostics.some(t => t.id === id) && !newCart.find(item => item.testId === id)) {
            newCart.push({ testId: id, quantity: 1 });
            itemsAdded++;
          }
        });
        return newCart;
      });

      if (itemsAdded > 0) {
        setToastMessage(`Successfully added ${itemsAdded} recommended test(s) to your cart!`);
        setIsCartOpen(true); // Open the cart side bar
        setTimeout(() => setToastMessage(null), 5000);
      }
      
      // Clean up URL without reloading the page
      router.replace('/diagnostics');
    }
  }, [searchParams, diagnostics, router]);

  // Reset coupon if cart changes
  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponCode('');
      setCouponSuccess(null);
      setCouponError(null);
    }
  }, [cart]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const catRes = await fetch(`${BACKEND_URL}/api/v1/lab-tests/categories`, {
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (catRes.ok) {
        const catJson = await catRes.json();
        if (catJson.data) {
          setCategories(['All Tests', ...catJson.data.map((c: any) => c.name)]);
        }
      }

      const testRes = await fetch(`${BACKEND_URL}/api/v1/lab-tests?limit=100`, {
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (testRes.ok) {
        const testJson = await testRes.json();
        if (testJson.data) {
          const mappedTests: FetchedTest[] = testJson.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            category: t.category?.name || 'Uncategorized',
            lab: t.organization,
            price: t.price,
            discountPrice: Math.round(t.price - (t.price * (t.discount_percentage / 100))),
            discount: t.discount_percentage,
            turnaround: t.results_in,
            popular: t.discount_percentage >= 20 
          }));
          setDiagnostics(mappedTests);
        }
      }
    } catch (error) {
      console.error("Error fetching diagnostic tests", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTests = diagnostics.filter(t => {
    const matchesCategory = activeCategory === 'All Tests' || t.category === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((total, item) => {
    const test = diagnostics.find(t => t.id === item.testId);
    if (!test) return total;
    return total + (test.discountPrice * item.quantity);
  }, 0);

  const cartOriginalTotal = cart.reduce((total, item) => {
    const test = diagnostics.find(t => t.id === item.testId);
    if (!test) return total;
    return total + (test.price * item.quantity);
  }, 0);

  const addToCart = (testId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.testId === testId);
      if (existing) return prev.map(item => item.testId === testId ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { testId, quantity: 1 }];
    });
  };

  const removeFromCart = (testId: string) => {
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || cart.length === 0) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setCouponError("Please sign in to apply coupons.");
      setIsApplyingCoupon(false);
      return;
    }

    let totalDiscount = 0;
    let anyValid = false;
    let lastErrMsg = '';

    // Validate the coupon for each item in the cart (API processes per test)
    for (const item of cart) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/coupons/validate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ code: couponCode.trim(), lab_test_id: item.testId })
        });
        const json = await res.json();
        
        if (res.ok && json.success && json.data.is_valid) {
          anyValid = true;
          totalDiscount += json.data.discount_amount * item.quantity;
        } else {
          lastErrMsg = json.message || "Invalid coupon";
        }
      } catch (err: any) {
        lastErrMsg = "Network error while validating coupon.";
      }
    }

    if (anyValid) {
      setAppliedCoupon(couponCode.trim());
      setCouponDiscount(totalDiscount);
      setCouponSuccess("Coupon applied successfully!");
    } else {
      setCouponError(lastErrMsg || "Coupon is not valid for the items in your cart.");
    }
    setIsApplyingCoupon(false);
  };

  const handleGetRecommendation = async () => {
    if (!symptoms.trim() || diagnostics.length === 0) return;
    setIsAnalyzing(true);
    setAiRecommendations(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const availableTestsList = diagnostics.map(t => `{ id: "${t.id}", name: "${t.name}", category: "${t.category}" }`).join('\n');

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
                    testId: { type: Type.STRING, description: "The exact string ID of the recommended test from the provided list" },
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
    <ProtectedRoute requiredRole="PATIENT">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[200] bg-emerald-950 text-white px-6 py-4 rounded-full shadow-[0_20px_40px_-15px_rgba(2,44,34,0.8)] flex items-center gap-3 border border-emerald-800"
          >
            <CheckCircle2 size={22} className="text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full min-h-screen bg-[#fcfdfd] pb-32">
        {/* Header Section */}
        <div className="bg-emerald-950 pt-28 pb-20 px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-[1500px] mx-auto relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Diagnostic <span className="text-emerald-400">Centers</span>
              </h1>
              <p className="text-emerald-100/70 text-lg max-w-xl">
                Compare prices from NABL accredited labs and book home collection in seconds.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Main Layout Container */}
        <div className="max-w-[1500px] mx-auto px-6 -mt-10 relative z-20">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* LHS: TESTS (55% width) */}
            <div className="lg:w-[55%] space-y-8">
              
              {/* Search & Filter Bar */}
              <div className="bg-white rounded-3xl p-4 shadow-xl shadow-emerald-900/5 border border-emerald-100/50 space-y-4">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600/40 group-focus-within:text-emerald-600 transition-colors" size={22} />
                  <input 
                    type="text" 
                    placeholder="Search by test name (e.g. Blood Sugar, MRI...)" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-emerald-50/30 border-2 border-transparent focus:border-emerald-100 rounded-2xl outline-none text-emerald-950 font-medium transition-all"
                  />
                </div>
                <div className="flex overflow-x-auto hide-scrollbar gap-2 py-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`whitespace-nowrap px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                        activeCategory === cat 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                          : 'bg-white text-emerald-900/60 border border-emerald-50 hover:border-emerald-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
                  <Loader2 size={48} className="animate-spin mb-4" />
                  <p className="font-medium text-emerald-900/60">Loading available tests...</p>
                </div>
              ) : (
                <>
                  {/* 2-Column Test Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredTests.map((test) => {
                      const inCart = cart.some(item => item.testId === test.id);
                      return (
                        <motion.div 
                          key={test.id}
                          layout
                          className="bg-white border border-emerald-100/80 rounded-[2.5rem] p-7 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all group flex flex-col relative overflow-hidden"
                        >
                          {test.popular && (
                            <div className="absolute top-0 right-10 bg-amber-400 text-amber-950 text-[10px] font-black uppercase px-3 py-1.5 rounded-b-xl flex items-center gap-1 shadow-sm">
                              <Zap size={10} fill="currentColor" /> Popular
                            </div>
                          )}

                          <div className="mb-6">
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-emerald-100">
                              {test.category}
                            </span>
                            <h3 className="text-xl font-extrabold text-emerald-950 mt-4 leading-tight group-hover:text-emerald-600 transition-colors">
                              {test.name}
                            </h3>
                            <p className="text-sm text-emerald-900/50 mt-1 font-medium italic">Available at {test.lab}</p>
                          </div>

                          <div className="mb-8">
                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center justify-between w-full">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Results In</p>
                              <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                                <Clock size={16} />
                                {test.turnaround} hours
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-6 border-t border-emerald-50 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-red-500 font-bold text-sm">-{test.discount}%</span>
                                <span className="text-xs text-slate-400 line-through">₹{test.price}</span>
                              </div>
                              <p className="text-2xl font-black text-emerald-950 tracking-tighter">₹{test.discountPrice}</p>
                            </div>
                            <button 
                              onClick={() => inCart ? removeFromCart(test.id) : addToCart(test.id)}
                              className={`flex items-center justify-center h-14 w-14 rounded-2xl transition-all ${
                                inCart 
                                  ? 'bg-emerald-950 text-white rotate-0' 
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                              }`}
                            >
                              {inCart ? <Check size={24} strokeWidth={3} /> : <Plus size={24} strokeWidth={3} />}
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
                </>
              )}
            </div>

            {/* RHS: ADVERTISEMENTS & AI (45% width, ensuring ads are wider than an individual test card) */}
            <div className="lg:w-[45%]">
              <div className="sticky top-28 space-y-6">
                
                {/* AI Recommender Ad/Widget */}
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                        <Brain size={30} className="text-emerald-100" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold leading-tight">Test Recommender</h3>
                        <p className="text-emerald-200 text-sm">Powered by Gemini AI</p>
                      </div>
                    </div>
                    <p className="text-emerald-50/90 mb-8 text-base leading-relaxed">
                      Not sure which test to book? Describe your symptoms, and our AI will match you with the most relevant diagnostic tests from our catalog.
                    </p>
                    <button 
                      onClick={() => setIsAIModalOpen(true)}
                      className="w-full py-4 bg-white text-emerald-900 font-black rounded-2xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                      Start Free Analysis <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>

                {/* Wide Promotional Ad Slot 1 */}
                <div className="bg-white border-2 border-emerald-100 border-dashed rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 group cursor-pointer hover:border-emerald-300 transition-colors">
                  <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:h-48 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100 relative overflow-hidden shrink-0">
                    <Activity size={64} className="text-emerald-200 group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-200/50 to-transparent" />
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-lg mb-3">
                      Premium Package
                    </div>
                    <h4 className="font-bold text-emerald-950 text-2xl mb-2">Full Body Wellness</h4>
                    <p className="text-emerald-900/60 text-sm mb-4 leading-relaxed">Get 60+ parameters tested comfortably from home. Fast, accurate reports in 24 hours.</p>
                    <div className="text-emerald-600 font-black text-2xl">₹999 <span className="text-sm font-medium text-slate-400 line-through ml-2">₹2499</span></div>
                  </div>
                </div>

                {/* Promotional Ad Slot 2 */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-center min-h-[160px]">
                  <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-emerald-500/30 blur-3xl rounded-full" />
                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-emerald-500 rounded-lg"><Zap size={16} className="text-white" /></div>
                        <span className="font-bold tracking-wider uppercase text-xs text-emerald-400">Limited Offer</span>
                      </div>
                      <h4 className="text-2xl font-bold mb-1">Flat 25% Off on MRIs</h4>
                      <p className="text-white/70 text-sm">Use code <span className="text-white bg-white/10 px-2 py-0.5 rounded font-mono font-bold mx-1">HEALTH25</span> at checkout.</p>
                    </div>
                    <div className="hidden sm:flex w-16 h-16 rounded-full border border-white/20 items-center justify-center backdrop-blur-md">
                      <ShieldCheck size={28} className="text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Support Info */}
                <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex items-start gap-4">
                   <Info size={24} className="text-emerald-600 shrink-0" />
                   <p className="text-sm text-emerald-900/70 leading-relaxed font-medium">
                     All tests are conducted by certified NABL labs. Home sample collection follows strict hygiene protocols and safety standards.
                   </p>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Global Floating Cart Button (Bottom Center) */}
        <AnimatePresence>
          {cart.length > 0 && !isCartOpen && (
            <motion.div 
              initial={{ y: 100, x: "-50%", opacity: 0 }}
              animate={{ y: 0, x: "-50%", opacity: 1 }}
              exit={{ y: 100, x: "-50%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed bottom-8 left-1/2 z-40"
            >
              <button 
                onClick={() => setIsCartOpen(true)}
                className="px-8 py-4 bg-emerald-950 text-white rounded-full shadow-[0_20px_40px_-10px_rgba(2,44,34,0.6)] flex items-center space-x-6 hover:bg-emerald-900 transition-all hover:-translate-y-1"
              >
                <div className="relative">
                  <ShoppingCart size={24} />
                  <span className="absolute -top-3 -right-3 w-6 h-6 bg-emerald-500 rounded-full text-xs flex items-center justify-center font-bold border-2 border-emerald-950">
                    {cart.length}
                  </span>
                </div>
                <div className="flex flex-col items-start border-l border-white/20 pl-6 text-left">
                  <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">View Cart</span>
                  <span className="font-black text-lg leading-none mt-1">₹{cartTotal}</span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart Sidebar (Sliding from Right) */}
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
                className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col border-l border-emerald-100"
              >
                <div className="p-6 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center space-x-2">
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
                      <p className="text-emerald-900/60 max-w-sm">Your diagnostic tests have been booked successfully. We will contact you shortly with the details.</p>
                    </motion.div>
                  ) : cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                      <ShoppingCart size={64} className="text-emerald-900/20" />
                      <p className="text-emerald-900/60 font-medium">Your cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => {
                        const test = diagnostics.find(t => t.id === item.testId);
                        if (!test) return null;
                        return (
                          <div key={item.testId} className="flex gap-4 p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-emerald-950 text-lg leading-tight pr-4">{test.name}</h4>
                                <button 
                                  onClick={() => removeFromCart(item.testId)}
                                  className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg shrink-0"
                                >
                                  Remove
                                </button>
                              </div>
                              <p className="text-sm text-emerald-900/60 mb-4">{test.lab}</p>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-emerald-950 text-xl">₹{test.discountPrice}</span>
                                <span className="text-sm text-slate-400 line-through font-medium">₹{test.price}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isCheckoutSuccess && cart.length > 0 && (
                  <div className="p-6 bg-emerald-50/50 border-t border-emerald-100">
                    
                    {/* Promo Code Section */}
                    <div className="mb-6 bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/40" size={16} />
                          <input 
                            type="text" 
                            placeholder="Promo Code" 
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            disabled={!!appliedCoupon}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 uppercase text-sm font-bold text-slate-700 disabled:opacity-60"
                          />
                        </div>
                        {!appliedCoupon ? (
                          <button 
                            onClick={handleApplyCoupon}
                            disabled={isApplyingCoupon || !couponCode.trim()}
                            className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm flex items-center justify-center min-w-[80px]"
                          >
                            {isApplyingCoupon ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setAppliedCoupon(null); setCouponDiscount(0); setCouponCode(''); setCouponSuccess(null); }}
                            className="px-5 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {couponError && <p className="text-[11px] text-red-500 font-bold mt-2 ml-1">{couponError}</p>}
                      {couponSuccess && <p className="text-[11px] text-emerald-600 font-bold mt-2 ml-1">{couponSuccess}</p>}
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm text-emerald-900/60 font-medium">
                        <span>Total MRP</span>
                        <span className="line-through">₹{cartOriginalTotal}</span>
                      </div>
                      <div className="flex justify-between text-sm text-emerald-600 font-bold">
                        <span>Platform Discount</span>
                        <span>- ₹{cartOriginalTotal - cartTotal}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-sm text-emerald-600 font-bold">
                          <span>Coupon ({appliedCoupon})</span>
                          <span>- ₹{couponDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-2xl font-black text-emerald-950 pt-4 border-t border-emerald-200/50">
                        <span>To Pay</span>
                        <span>₹{Math.max(0, cartTotal - couponDiscount).toFixed(2)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleCheckout}
                      className="w-full py-4 bg-emerald-950 text-white font-bold rounded-xl hover:bg-emerald-900 transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/20"
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
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden z-10 max-h-[90vh]"
              >
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-emerald-100 bg-emerald-50/50 shrink-0">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                      <Brain size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-emerald-950">AI Test Recommender</h2>
                      <p className="text-sm text-emerald-900/60">Find the right tests from our catalog</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsAIModalOpen(false)}
                    className="p-2 text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar flex-1 bg-slate-50/50">
                  {!aiRecommendations && !isAnalyzing ? (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
                        <h3 className="font-bold text-emerald-950 mb-2">How it works</h3>
                        <p className="text-sm text-emerald-900/70 leading-relaxed">
                          Describe your symptoms in detail. Our AI will analyze them and suggest the most relevant diagnostic tests <strong>available in our catalog</strong>.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-emerald-950 ml-1">Your Symptoms</label>
                        <textarea 
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          placeholder="e.g., I've been having a persistent headache for 3 days, feeling slightly dizzy, and have a mild fever..."
                          className="w-full h-36 p-5 bg-white border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none shadow-inner font-medium text-emerald-950"
                        />
                      </div>
                      <button 
                        onClick={handleGetRecommendation}
                        disabled={!symptoms.trim()}
                        className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
                      >
                        Find Relevant Tests
                      </button>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20 rounded-full animate-pulse" />
                        <Loader2 size={56} className="animate-spin text-emerald-600 relative z-10" />
                      </div>
                      <div className="text-center">
                        <p className="text-emerald-950 font-bold text-xl mb-2">Analyzing your symptoms...</p>
                        <p className="text-emerald-900/60 font-medium">Matching with our diagnostic catalog</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start space-x-3">
                        <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={24} />
                        <p className="text-sm text-emerald-900/80 leading-relaxed">
                          Based on your symptoms, here are the tests available in our catalog that might be relevant. <strong>Please consult a doctor for a formal diagnosis.</strong>
                        </p>
                      </div>

                      {aiRecommendations?.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-emerald-100">
                          <p className="text-emerald-950 font-bold text-lg">We couldn&apos;t find any directly matching tests in our catalog for these symptoms.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {aiRecommendations?.map((rec, idx) => {
                            const test = diagnostics.find(t => t.id === rec.testId);
                            if (!test) return null;
                            const inCart = cart.some(item => item.testId === test.id);
                            
                            return (
                              <div key={idx} className="bg-white border border-emerald-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h4 className="font-bold text-emerald-950 text-lg mb-1">{test.name}</h4>
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-100">
                                      {test.category}
                                    </span>
                                  </div>
                                  <span className="font-black text-emerald-950 text-xl">₹{test.discountPrice}</span>
                                </div>
                                <div className="text-sm text-emerald-900/70 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                                  <span className="font-bold text-emerald-950">Why: </span>
                                  {rec.reason}
                                </div>
                                <button 
                                  onClick={() => inCart ? removeFromCart(test.id) : addToCart(test.id)}
                                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                                    inCart 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-emerald-950 text-white hover:bg-emerald-900 shadow-md'
                                  }`}
                                >
                                  {inCart ? (
                                    <>
                                      <Check size={18} />
                                      <span>Added to Cart</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={18} />
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
                        className="w-full py-4 bg-white border-2 border-emerald-200 text-emerald-700 font-bold rounded-2xl hover:bg-emerald-50 transition-colors mt-6"
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
export default DiagnosticsContent;