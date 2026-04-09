'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, ArrowRight, Sparkles, Activity, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';

const articles = [
  {
    id: 1,
    title: 'The Future of AI in Preventive Healthcare',
    excerpt: 'Discover how artificial intelligence is revolutionizing early detection and personalized treatment plans.',
    content: `
      <p>Artificial Intelligence is no longer just a buzzword; it's actively reshaping how we approach preventive medicine. By analyzing vast amounts of patient data, AI algorithms can identify subtle patterns that might escape even the most experienced human eyes.</p>
      <p>This capability is particularly crucial in early detection. Conditions like cardiovascular disease, certain cancers, and metabolic disorders often present with minor, easily overlooked symptoms in their initial stages. AI models, trained on millions of medical records and imaging data, can flag these early warning signs, allowing for intervention when it's most effective.</p>
      <h3>The Role of Predictive Analytics</h3>
      <p>Beyond diagnosis, AI excels in predictive analytics. By assessing a patient's genetic predispositions, lifestyle factors, and historical health data, AI can forecast potential health risks with remarkable accuracy. This shifts the healthcare paradigm from reactive treatment to proactive prevention.</p>
      <h3>Personalized Treatment Plans</h3>
      <p>Every individual is unique, and their healthcare should reflect that. AI helps doctors tailor treatment plans to a patient's specific metabolic profile, ensuring higher efficacy and fewer side effects. We are entering an era where medicine is truly personalized.</p>
    `,
    image: 'https://picsum.photos/seed/health1/800/600',
    date: 'Oct 24, 2023',
    readTime: '5 min read',
    category: 'Technology'
  },
  {
    id: 2,
    title: 'Understanding Your Lipid Profile Report',
    excerpt: 'A comprehensive guide to decoding your cholesterol levels and what they mean for your heart health.',
    content: `
      <p>A lipid profile is a blood test that measures the amount of cholesterol and triglycerides in your blood. It's a crucial tool for assessing your risk of cardiovascular disease.</p>
      <h3>The Good, The Bad, and The Triglycerides</h3>
      <p><strong>LDL (Low-Density Lipoprotein):</strong> Often called "bad" cholesterol, high levels of LDL can lead to plaque buildup in your arteries, increasing the risk of heart disease and stroke.</p>
      <p><strong>HDL (High-Density Lipoprotein):</strong> Known as "good" cholesterol, HDL helps remove other forms of cholesterol from your bloodstream. Higher levels are generally better.</p>
      <p><strong>Triglycerides:</strong> This is a type of fat found in your blood. High levels, often caused by eating more calories than you burn, can also raise your heart disease risk.</p>
      <h3>How to Improve Your Numbers</h3>
      <p>Dietary changes, such as reducing saturated fats and increasing soluble fiber, play a massive role. Regular cardiovascular exercise and maintaining a healthy weight are also proven strategies to optimize your lipid profile.</p>
    `,
    image: 'https://picsum.photos/seed/health2/800/600',
    date: 'Oct 18, 2023',
    readTime: '8 min read',
    category: 'Wellness'
  },
  {
    id: 3,
    title: '5 Superfoods for Better Immunity',
    excerpt: 'Incorporate these nutrient-dense foods into your daily diet to naturally boost your immune system.',
    content: `
      <p>Your immune system does a remarkable job of defending you against disease-causing microorganisms. But sometimes it fails: a germ invades successfully and makes you sick. Is it possible to intervene in this process and boost your immune system? Yes, and it starts with what's on your plate.</p>
      <h3>1. Citrus Fruits</h3>
      <p>Most people turn straight to vitamin C after they've caught a cold. That's because it helps build up your immune system. Vitamin C is thought to increase the production of white blood cells, which are key to fighting infections.</p>
      <h3>2. Garlic</h3>
      <p>Garlic is found in almost every cuisine in the world. It adds a little zing to food and it's a must-have for your health. Its immune-boosting properties seem to come from a heavy concentration of sulfur-containing compounds, such as allicin.</p>
      <h3>3. Ginger</h3>
      <p>Ginger is another ingredient many turn to after getting sick. Ginger may help decrease inflammation, which can help reduce a sore throat and inflammatory illnesses.</p>
      <h3>4. Spinach</h3>
      <p>Spinach made our list not just because it's rich in vitamin C — it's also packed with numerous antioxidants and beta carotene, which may both increase the infection-fighting ability of our immune systems.</p>
      <h3>5. Yogurt</h3>
      <p>Look for yogurts that have "live and active cultures" printed on the label, like Greek yogurt. These cultures may stimulate your immune system to help fight diseases.</p>
    `,
    image: 'https://picsum.photos/seed/health3/800/600',
    date: 'Oct 12, 2023',
    readTime: '4 min read',
    category: 'Nutrition'
  },
  {
    id: 4,
    title: 'Managing Stress in a Fast-Paced World',
    excerpt: 'Practical tips and mindfulness techniques to keep your stress levels in check and improve mental clarity.',
    content: `
      <p>In today's hyper-connected, always-on world, stress has become a common companion for many. While short-term stress can be a motivator, chronic stress wreaks havoc on both our physical and mental health.</p>
      <h3>The Physiology of Stress</h3>
      <p>When stressed, your body releases cortisol and adrenaline. Over time, elevated levels of these hormones can lead to high blood pressure, weakened immune response, and anxiety disorders.</p>
      <h3>Mindfulness and Meditation</h3>
      <p>Taking just 10 minutes a day to practice mindfulness can significantly lower cortisol levels. Focus on your breath, observe your thoughts without judgment, and anchor yourself in the present moment.</p>
      <h3>Digital Detox</h3>
      <p>Constant notifications keep our brains in a state of high alert. Designate specific times of the day to unplug completely. Read a book, take a walk in nature, or simply sit quietly without screens.</p>
    `,
    image: 'https://picsum.photos/seed/health4/800/600',
    date: 'Oct 05, 2023',
    readTime: '6 min read',
    category: 'Mental Health'
  }
];

import ProtectedRoute from '@/components/ProtectedRoute';

export default function InsightsPage() {
  const [activeArticleId, setActiveArticleId] = useState(articles[0].id);
  const topRef = useRef<HTMLDivElement>(null);

  const featuredArticle = articles.find(a => a.id === activeArticleId) || articles[0];
  const otherArticles = articles.filter(a => a.id !== activeArticleId);

  const handleArticleClick = (id: number) => {
    setActiveArticleId(id);
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="w-full max-w-7xl mx-auto px-6 py-12" ref={topRef}>
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-950 mb-4">Insights & Blog</h1>
          <p className="text-emerald-900/60 max-w-2xl text-lg">Stay informed with the latest in healthcare, wellness tips, and medical technology.</p>
        </div>

        {/* Featured Article Detail View */}
        <div className="grid lg:grid-cols-12 gap-12 mb-24">
          <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={featuredArticle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                <div className="relative w-full h-[400px] rounded-[2rem] overflow-hidden shadow-lg group">
                  <Image 
                    src={featuredArticle.image} 
                    alt={featuredArticle.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-sm font-bold text-emerald-700 uppercase tracking-wider shadow-sm">
                    {featuredArticle.category}
                  </div>
                </div>
                
                <h2 className="text-4xl font-extrabold text-emerald-950 leading-tight">{featuredArticle.title}</h2>
                
                <div className="flex items-center space-x-6 text-emerald-900/60 text-sm font-medium border-b border-emerald-100 pb-6">
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} />
                    <span>{featuredArticle.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock size={16} />
                    <span>{featuredArticle.readTime}</span>
                  </div>
                </div>

                <div className="prose prose-lg prose-emerald max-w-none text-emerald-900/80">
                  <p className="lead text-xl text-emerald-950 font-medium mb-8 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 italic">
                    &quot;{featuredArticle.excerpt}&quot;
                  </p>
                  <div dangerouslySetInnerHTML={{ __html: featuredArticle.content }} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              {/* Action Card 1 */}
              <div className="p-8 bg-emerald-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/30 blur-[40px] rounded-full group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10">
                    <Sparkles className="text-teal-300" size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">AI Based Suggestion</h3>
                  <p className="text-emerald-100/80 mb-6 text-sm">Based on your reading history, we recommend a preventive health checkup.</p>
                  <button className="w-full py-3 bg-white text-emerald-900 font-semibold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center space-x-2">
                    <span>View Recommendations</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Action Card 2 */}
              <div className="p-8 bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2rem] shadow-[0_10px_30px_-15px_rgba(5,150,105,0.1)] group hover:shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] transition-shadow">
                 <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Activity className="text-emerald-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-950 mb-3">Book Diagnostics</h3>
                  <p className="text-emerald-900/60 mb-6 text-sm">Get accurate results from our network of certified laboratories.</p>
                  <button className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
                    Explore Tests
                  </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid View of other articles */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-emerald-950">More Articles</h3>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {otherArticles.map((article) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                key={article.id} 
                onClick={() => handleArticleClick(article.id)}
                className="group cursor-pointer flex flex-col bg-white/40 backdrop-blur-sm p-4 rounded-[2rem] border border-white/60 hover:bg-white/80 transition-colors shadow-sm hover:shadow-xl"
              >
                <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-6 shadow-sm">
                  <Image 
                    src={article.image} 
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-emerald-950/10 group-hover:bg-transparent transition-colors duration-500" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold text-emerald-700 uppercase tracking-wider shadow-sm">
                    {article.category}
                  </div>
                  <div className="absolute bottom-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-emerald-700 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <div className="px-2 flex-1 flex flex-col">
                  <div className="flex items-center space-x-4 text-emerald-900/50 text-xs font-medium mb-3">
                    <span className="flex items-center space-x-1"><Calendar size={12} /> <span>{article.date}</span></span>
                    <span>•</span>
                    <span className="flex items-center space-x-1"><Clock size={12} /> <span>{article.readTime}</span></span>
                  </div>
                  <h4 className="text-xl font-bold text-emerald-950 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">{article.title}</h4>
                  <p className="text-emerald-900/70 text-sm line-clamp-2 mb-4">{article.excerpt}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ProtectedRoute>
  );
}