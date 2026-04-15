// frontend/app/insights/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, ArrowRight, Sparkles, Activity, 
  ArrowUpRight, ChevronLeft, Bookmark, Share2, 
  Heart, Stethoscope, Mail, CheckCircle2, Loader2
} from 'lucide-react';
import Image from 'next/image';
import Markdown from 'react-markdown';
import ProtectedRoute from '@/components/ProtectedRoute';

// Basic interface for our parsed API data
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  readTime: string;
  category: string;
  author: { name: string; role: string; avatar: string };
  featured: boolean;
}

export default function InsightsPage() {
  const router = useRouter();
  const [viewState, setViewState] = useState<'hub' | 'article'>('hub');
  const [activeArticle, setActiveArticle] = useState<BlogPost | null>(null);
  
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchPublishedBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPublishedBlogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/blogs?is_published=true&limit=50`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const json = await res.json();
      
      if (res.ok && json.data) {
        // Map backend data to our frontend structure
        const mappedArticles = json.data.map((b: any, index: number) => ({
          id: b.id,
          title: b.title,
          // Generate an excerpt if none exists by stripping markdown and taking first 120 chars
          excerpt: b.content ? b.content.replace(/[#*`_\[\]]/g, '').substring(0, 150) + '...' : 'Read full article to learn more.',
          content: b.content || '',
          image: b.cover_image_url || 'https://picsum.photos/seed/health-placeholder/1200/800',
          date: new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          readTime: '5 min read',
          category: b.category || 'Wellness',
          author: { 
            name: 'KnowMyHealth Editorial', 
            role: 'Medical Board', 
            avatar: 'https://picsum.photos/seed/admin/100/100' 
          },
          featured: index === 0 // Make the newest article the featured one
        }));
        
        setArticles(mappedArticles);
      }
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArticleClick = async (article: BlogPost) => {
    // Optionally fetch the full article content here if your list API doesn't return full content
    // For now, we assume the list returns full content
    setActiveArticle(article);
    setViewState('article');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setViewState('hub');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="PATIENT">
        <div className="w-full min-h-screen bg-[#fcfdfd] flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-600" size={48} />
        </div>
      </ProtectedRoute>
    );
  }

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const recentArticles = articles.length > 1 ? articles.slice(1) : [];

  const renderHub = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="space-y-16"
    >
      {/* Editorial Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-emerald-600 font-black tracking-widest uppercase text-sm">Editorial & Journal</span>
        <h1 className="text-5xl md:text-6xl font-black text-emerald-950 tracking-tight leading-tight">
          Medical Insights <br/> for a Better You.
        </h1>
        <p className="text-lg text-emerald-900/60">Expert perspectives, medical breakthroughs, and wellness guides curated by top healthcare professionals.</p>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-emerald-100 shadow-sm">
          <BookOpen className="mx-auto text-emerald-200 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-emerald-950 mb-2">No Articles Published Yet</h2>
          <p className="text-emerald-900/60">Check back soon for latest medical insights and health tips.</p>
        </div>
      ) : (
        <>
          {/* Featured & Trending Section */}
          <div className="grid lg:grid-cols-12 gap-8">
            
            {/* Main Featured Article */}
            {featuredArticle && (
              <div 
                className="lg:col-span-8 group cursor-pointer relative rounded-[2.5rem] overflow-hidden shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] bg-white h-[600px] border border-emerald-100 flex flex-col"
                onClick={() => handleArticleClick(featuredArticle)}
              >
                <div className="relative w-full h-[65%] overflow-hidden">
                  <Image src={featuredArticle.image} alt={featuredArticle.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <span className="px-4 py-1.5 bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs rounded-full shadow-lg">Featured</span>
                  </div>
                </div>
                <div className="flex-1 p-8 md:p-10 flex flex-col justify-between bg-white relative z-10 -mt-6 rounded-t-[2rem]">
                  <div>
                    <div className="flex items-center space-x-4 text-emerald-900/50 text-xs font-bold mb-4 uppercase tracking-wider">
                      <span>{featuredArticle.category}</span>
                      <span>•</span>
                      <span>{featuredArticle.date}</span>
                      <span>•</span>
                      <span>{featuredArticle.readTime}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-emerald-950 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-emerald-900/70 text-base line-clamp-2 leading-relaxed">
                      {featuredArticle.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 mt-4">
                    <Image src={featuredArticle.author.avatar} alt="Author" width={40} height={40} className="rounded-full border-2 border-emerald-100" />
                    <div>
                      <p className="text-sm font-bold text-emerald-950">{featuredArticle.author.name}</p>
                      <p className="text-xs text-emerald-600 font-medium">{featuredArticle.author.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar Trending & Ad */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              {recentArticles.length > 0 && (
                <div className="bg-emerald-50/50 rounded-[2rem] p-6 border border-emerald-100">
                  <h3 className="text-xl font-black text-emerald-950 mb-6 flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={20} /> Trending Now
                  </h3>
                  <div className="space-y-6">
                    {recentArticles.slice(0, 3).map((article, i) => (
                      <div key={article.id} onClick={() => handleArticleClick(article)} className="group cursor-pointer flex gap-4 items-start">
                        <div className="text-3xl font-black text-emerald-900/10 group-hover:text-emerald-200 transition-colors">0{i + 1}</div>
                        <div>
                          <h4 className="font-bold text-emerald-950 group-hover:text-emerald-600 transition-colors leading-snug line-clamp-2 mb-1">{article.title}</h4>
                          <p className="text-xs text-emerald-900/50 font-bold uppercase">{article.readTime} • {article.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ad Slot: Sidebar Square (Redirects to Diagnostics) */}
              <div 
                onClick={() => router.push('/diagnostics')}
                className="flex-1 bg-gradient-to-br from-emerald-900 to-teal-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl group cursor-pointer border border-emerald-800 hover:shadow-2xl hover:shadow-emerald-900/40 transition-all"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/30 blur-3xl rounded-full" />
                <div className="absolute top-6 right-6">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded border border-emerald-800/50">Sponsored</span>
                </div>
                
                <div className="h-full flex flex-col justify-end relative z-10">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-6">
                    <Stethoscope size={28} className="text-emerald-300" />
                  </div>
                  <h3 className="text-2xl font-bold leading-tight mb-2">Book a Premium Health Check</h3>
                  <p className="text-emerald-100/70 text-sm mb-6">Complete body profiling with 80+ parameters. Done from the comfort of your home.</p>
                  <button className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl group-hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 group-hover:-translate-y-1">
                    Book Now <ArrowUpRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Slot: Horizontal Banner (Redirects to Prescription) */}
          <div className="w-full bg-white border border-emerald-100 rounded-[2rem] p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
            <div className="absolute top-4 left-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">Advertisement</span>
            </div>
            <div className="flex items-center gap-6 relative z-10 w-full md:w-auto mt-4 md:mt-0">
              <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 shrink-0">
                <Activity className="text-amber-500" size={36} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-950 mb-1">Digitize Your Medical Records</h3>
                <p className="text-emerald-900/60 font-medium">Use our AI vault to instantly extract insights and order medicines from your prescriptions.</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/prescription')}
              className="w-full md:w-auto px-8 py-4 bg-emerald-950 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-900 hover:-translate-y-1 transition-all shrink-0"
            >
              Upload Now
            </button>
          </div>

          {/* Latest Articles Grid */}
          {recentArticles.length > 0 && (
            <div className="space-y-8">
              <h3 className="text-3xl font-extrabold text-emerald-950 flex items-center gap-3">
                <Activity className="text-emerald-500" /> Latest Articles
              </h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {recentArticles.map((article) => (
                  <motion.div 
                    key={article.id} 
                    whileHover={{ y: -5 }}
                    onClick={() => handleArticleClick(article)}
                    className="group cursor-pointer flex flex-col bg-white rounded-[2rem] border border-emerald-100/60 hover:border-emerald-300 transition-colors shadow-[0_10px_30px_-15px_rgba(5,150,105,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] overflow-hidden"
                  >
                    <div className="relative w-full h-56 overflow-hidden bg-slate-100">
                      <Image src={article.image} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black text-emerald-700 uppercase tracking-wider shadow-sm">
                        {article.category}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center space-x-4 text-emerald-900/40 text-xs font-bold uppercase tracking-wider mb-3">
                        <span className="flex items-center space-x-1.5"><Calendar size={14} /> <span>{article.date}</span></span>
                        <span className="flex items-center space-x-1.5"><Clock size={14} /> <span>{article.readTime}</span></span>
                      </div>
                      <h4 className="text-xl font-bold text-emerald-950 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug">{article.title}</h4>
                      <p className="text-emerald-900/60 text-sm line-clamp-3 mb-6 flex-1">{article.excerpt}</p>
                      
                      <div className="pt-4 border-t border-emerald-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image src={article.author.avatar} alt="Author" width={24} height={24} className="rounded-full" />
                          <span className="text-xs font-bold text-emerald-950">{article.author.name}</span>
                        </div>
                        <ArrowUpRight size={20} className="text-emerald-300 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Newsletter Block */}
          <div className="bg-emerald-900 rounded-[3rem] p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/pattern/1920/1080')] opacity-5 mix-blend-overlay object-cover" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border border-emerald-700">
                  <Mail size={28} className="text-emerald-300" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Stay ahead of your health.</h2>
                <p className="text-emerald-100/70 text-lg">Join 50,000+ readers getting weekly, evidence-based medical insights delivered directly to their inbox.</p>
                
                <form className="flex flex-col sm:flex-row gap-3 pt-4" onSubmit={(e) => e.preventDefault()}>
                  <input 
                    type="email" 
                    placeholder="Enter your email address" 
                    className="flex-1 px-6 py-4 bg-emerald-950/50 border border-emerald-700 rounded-2xl text-white placeholder:text-emerald-500/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  />
                  <button className="px-8 py-4 bg-white text-emerald-950 font-bold rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg flex items-center justify-center gap-2">
                    <span>Subscribe</span>
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  </button>
                </form>
                <p className="text-xs text-emerald-400/60 font-medium">No spam. Unsubscribe anytime.</p>
            </div>
          </div>
        </>
      )}

    </motion.div>
  );

  const renderArticle = () => {
    if (!activeArticle) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      >
        {/* Article Nav */}
        <div className="mb-8 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-800 transition-colors bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full w-fit"
          >
            <ChevronLeft size={18} /> Back to Journal
          </button>
        </div>

        {/* Article Layout Split */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Main Article Content (LHS) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Article Header */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-widest rounded-md border border-emerald-200/50">
                  {activeArticle.category}
                </span>
                <span className="text-emerald-900/40 font-bold text-xs uppercase tracking-wider">{activeArticle.readTime}</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-emerald-950 leading-[1.1] tracking-tight">
                {activeArticle.title}
              </h1>
              
              <p className="text-xl text-emerald-900/60 leading-relaxed font-medium">
                {activeArticle.excerpt}
              </p>

              {/* Author Bar */}
              <div className="flex items-center justify-between py-6 border-y border-emerald-100">
                <div className="flex items-center gap-4">
                  <Image src={activeArticle.author.avatar} alt="Author" width={56} height={56} className="rounded-full border border-emerald-200" />
                  <div>
                    <p className="font-bold text-emerald-950">{activeArticle.author.name}</p>
                    <p className="text-sm text-emerald-600">{activeArticle.author.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-emerald-900/40">
                  <button className="hover:text-red-500 transition-colors"><Heart size={24} /></button>
                  <button className="hover:text-emerald-600 transition-colors"><Bookmark size={24} /></button>
                  <button className="hover:text-emerald-600 transition-colors"><Share2 size={24} /></button>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="w-full h-[400px] md:h-[500px] relative rounded-[2.5rem] overflow-hidden border border-emerald-100 shadow-sm">
              <Image src={activeArticle.image} alt={activeArticle.title} fill className="object-cover" />
            </div>

            {/* Body Content using react-markdown inside Tailwind Typography plugin class */}
            <article className="prose prose-lg md:prose-xl prose-emerald max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-emerald-950/80 prose-p:leading-relaxed prose-a:text-emerald-600 prose-blockquote:bg-emerald-50 prose-blockquote:border-emerald-500 prose-blockquote:not-italic prose-blockquote:font-medium prose-blockquote:rounded-r-2xl prose-blockquote:py-2">
              <Markdown>{activeArticle.content}</Markdown>
            </article>

            {/* Article Footer Native Ad (Redirects to Consultations) */}
            <div 
              onClick={() => router.push('/consultations')}
              className="mt-16 bg-slate-50 border border-slate-200 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6 group cursor-pointer relative overflow-hidden hover:border-emerald-300 transition-colors"
            >
               <div className="absolute top-4 right-4">
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sponsored</span>
               </div>
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 shrink-0">
                 <Stethoscope className="text-emerald-600 group-hover:scale-110 transition-transform" size={32} />
               </div>
               <div className="flex-1 text-center md:text-left">
                 <h4 className="font-bold text-emerald-950 text-xl mb-1">Need a second opinion?</h4>
                 <p className="text-emerald-900/60 text-sm">Consult instantly with top specialists via video call. No waiting rooms.</p>
               </div>
               <button className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl group-hover:bg-emerald-700 transition-colors whitespace-nowrap shadow-md group-hover:-translate-y-0.5">
                 Book Consult
               </button>
            </div>
          </div>

          {/* Article Sidebar (RHS) */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-8">
              
              {/* About Author Box */}
              <div className="bg-white border border-emerald-100 rounded-[2rem] p-6 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-900/40 mb-6">About the Author</h4>
                <div className="flex flex-col items-center text-center">
                  <Image src={activeArticle.author.avatar} alt="Author" width={80} height={80} className="rounded-full mb-4 border-2 border-emerald-50 shadow-sm" />
                  <h5 className="font-bold text-emerald-950 text-lg mb-1">{activeArticle.author.name}</h5>
                  <p className="text-sm text-emerald-600 font-medium mb-4">{activeArticle.author.role}</p>
                  <p className="text-sm text-emerald-900/60 leading-relaxed mb-6">
                    The medical board at Know My Health is a collective of leading voices in preventive medicine and holistic care, dedicated to translating complex medical science into actionable lifestyle changes.
                  </p>
                </div>
              </div>

              {/* Sidebar Ad Slot (Redirects to Diagnostics) */}
              <div 
                onClick={() => router.push('/diagnostics')}
                className="bg-emerald-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-lg group cursor-pointer border border-emerald-800 hover:shadow-2xl hover:shadow-emerald-900/40 transition-all"
              >
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-500/30 blur-3xl rounded-full" />
                <div className="absolute top-4 left-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded border border-emerald-800/50">Sponsored</span>
                </div>
                
                <div className="relative z-10 pt-6 text-center">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mx-auto mb-6">
                    <Activity size={32} className="text-emerald-300" />
                  </div>
                  <h3 className="text-2xl font-bold leading-tight mb-3">AI Diagnostic Tests</h3>
                  <p className="text-emerald-100/70 text-sm mb-8">Not sure what tests you need? Let our AI recommend the best panel based on your symptoms.</p>
                  <button className="w-full py-4 bg-white text-emerald-950 font-black rounded-xl group-hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 shadow-lg group-hover:scale-105">
                    Start Analysis <ArrowRight size={18} />
                  </button>
                </div>
              </div>

              {/* Related Reads */}
              <div className="bg-white border border-emerald-100 rounded-[2rem] p-6 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-900/40 mb-6">Related Reads</h4>
                <div className="space-y-6">
                  {recentArticles.slice(0, 3).map((article) => (
                    <div key={article.id} onClick={() => handleArticleClick(article)} className="group cursor-pointer flex gap-4">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                        <Image src={article.image} alt={article.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-emerald-950 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug mb-1">{article.title}</h5>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">{article.readTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="w-full min-h-screen bg-[#fcfdfd] py-12 px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            {viewState === 'hub' ? renderHub() : renderArticle()}
          </AnimatePresence>
        </div>
      </div>
    </ProtectedRoute>
  );
}