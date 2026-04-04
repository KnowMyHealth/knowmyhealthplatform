'use client';

import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

const categories = ['All', 'Fever', 'Pain', 'Digestive', 'Respiratory', 'Skin', 'Neurological'];

const symptoms = [
  { title: 'High Fever', desc: 'Body temperature above 101°F (38.3°C), often accompanied by chills and sweating.', category: 'Fever' },
  { title: 'Severe Headache', desc: 'Intense throbbing or pressure in the head, possibly with nausea or light sensitivity.', category: 'Pain' },
  { title: 'Stomach Ache', desc: 'Cramps, dull ache, or sharp pain in the abdomen area.', category: 'Digestive' },
  { title: 'Shortness of Breath', desc: 'Difficulty breathing or feeling like you cannot get enough air.', category: 'Respiratory' },
  { title: 'Skin Rash', desc: 'Noticeable change in the texture or color of your skin.', category: 'Skin' },
  { title: 'Dizziness', desc: 'Feeling lightheaded, woozy, or as if the room is spinning.', category: 'Neurological' },
  { title: 'Joint Pain', desc: 'Discomfort, aches, and soreness in any of the body\'s joints.', category: 'Pain' },
  { title: 'Persistent Cough', desc: 'A cough that lasts for more than three weeks.', category: 'Respiratory' },
];

import ProtectedRoute from '@/components/ProtectedRoute';

export default function ComplaintsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSymptoms = symptoms.filter(s => {
    const matchesCat = activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <ProtectedRoute requiredRole="Patient">
      <div className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-950 mb-4">Symptom Checker</h1>
          <p className="text-emerald-900/60 max-w-2xl mx-auto text-lg">Select or describe your symptoms to get AI-powered insights and recommended next steps.</p>
        </div>

        {/* Massive Search Input */}
        <div className="max-w-3xl mx-auto mb-12 relative">
          <div className="absolute inset-0 bg-emerald-200/30 blur-xl rounded-full" />
          <div className="relative flex items-center bg-white/80 backdrop-blur-2xl border border-white p-2 rounded-full shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)]">
            <Search className="ml-4 text-emerald-600/50" size={24} />
            <input 
              type="text" 
              placeholder="Describe your symptom... (e.g., sharp pain in lower back)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-4 bg-transparent border-none focus:outline-none text-lg text-emerald-950 placeholder:text-emerald-900/40"
            />
            <button className="px-8 py-4 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-colors whitespace-nowrap">
              Analyze
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                activeCategory === cat 
                  ? 'bg-emerald-900 text-white shadow-md' 
                  : 'bg-white/60 text-emerald-900/70 hover:bg-emerald-100 border border-white/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Symptom Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSymptoms.map((symptom, i) => (
            <div 
              key={i}
              className="p-6 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-sm hover:shadow-[0_10px_30px_-15px_rgba(5,150,105,0.15)] transition-all group cursor-pointer flex flex-col"
            >
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">{symptom.category}</span>
              <h3 className="text-lg font-bold text-emerald-950 mb-2">{symptom.title}</h3>
              <p className="text-sm text-emerald-900/60 mb-6 flex-1">{symptom.desc}</p>
              
              <div className="flex items-center text-emerald-700 font-medium text-sm group-hover:text-emerald-600 mt-auto">
                <span>Click for Details</span>
                <ArrowRight size={16} className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
