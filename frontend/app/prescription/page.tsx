'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  Clock, 
  Brain, 
  X, 
  AlertCircle, 
  Sparkles, 
  Pill, 
  Activity, 
  CalendarDays, 
  Building2, 
  UserCircle2,
  Loader2,
  ShoppingCart,
  Microscope
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ProtectedRoute from '@/components/ProtectedRoute';
import Markdown from 'react-markdown';

// --- Types ---
type RecordType = {
  id: string;
  doctor: string;
  clinic: string;
  date: string;
  status: string;
  details: string;
  imageUrl?: string;
};

interface PrescriptionMedicineSchema {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface RecommendedTest {
  id: string;
  lab_test: {
    id: string;
    name: string;
    organization: string;
  };
}

interface PrescriptionSchema {
  id: string;
  user_id: string;
  image_url?: string;
  doctor_name?: string;
  hospital_name?: string;
  diagnosis?: string;
  prescription_date?: string;
  created_at: string;
  medicines: PrescriptionMedicineSchema[];
  recommendations?: RecommendedTest[];
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function PrescriptionVaultPage() {
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PrescriptionSchema | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<PrescriptionSchema[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  // Specific Record Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingRecord, setIsFetchingRecord] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordType | null>(null);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('supabase_access_token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${BACKEND_URL}/api/v1/prescriptions/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch prescription history", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      setAnalysis(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const token = localStorage.getItem('supabase_access_token'); 

      const response = await fetch(`${BACKEND_URL}/api/v1/prescriptions/ocr`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'ngrok-skip-browser-warning': 'true'
        },
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to analyze prescription');
      }

      setAnalysis(responseData.data);
      // Prepend the new prescription to the history list immediately 
      setHistory(prev => [responseData.data, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while analyzing the prescription.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewRecord = async (id: string) => {
    setIsModalOpen(true);
    setIsFetchingRecord(true);
    setSelectedRecord(null);

    try {
      const token = localStorage.getItem('supabase_access_token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${BACKEND_URL}/api/v1/prescriptions/${id}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const p = data.data;
        
        const medMarkdown = p.medicines && p.medicines.length > 0 
          ? p.medicines.map((m: any, i: number) => 
              `#### ${i + 1}. ${m.name}\n- **Dosage:** ${m.dosage || 'N/A'}\n- **Timing:** ${m.frequency || 'N/A'}\n- **Duration:** ${m.duration || 'N/A'}\n- **Instructions:** ${m.instructions || 'N/A'}`
            ).join('\n\n---\n\n')
          : '*No medications detected.*';
          
        const recMarkdown = p.recommendations && p.recommendations.length > 0
          ? p.recommendations.map((r: any) => `- **${r.lab_test.name}** (at ${r.lab_test.organization})`).join('\n')
          : '*No recommended tests.*';

        setSelectedRecord({
          id: p.id,
          doctor: p.doctor_name || 'Unknown Doctor',
          clinic: p.hospital_name || 'Unknown Clinic',
          date: p.prescription_date 
            ? new Date(p.prescription_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'}) 
            : p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'}) : 'Unknown Date',
          status: 'Verified',
          details: `### Diagnosis\n${p.diagnosis ? `> ${p.diagnosis}` : '*Not specified*'}\n\n### Medications\n${medMarkdown}\n\n### AI Recommended Tests\n${recMarkdown}`,
          imageUrl: p.image_url
        });
      } else {
        console.error('Failed to fetch prescription details:', data);
      }
    } catch (error) {
      console.error('Error fetching prescription details:', error);
    } finally {
      setIsFetchingRecord(false);
    }
  };

  const handleBookRecommendations = () => {
    if (!analysis || !analysis.recommendations || analysis.recommendations.length === 0) return;
    const testIds = analysis.recommendations.map(r => r.lab_test.id).join(',');
    // Route to diagnostics with the query param indicating these should be added to the cart
    router.push(`/diagnostics?autoAdd=${testIds}`);
  };

  // Light mapping for the basic history cards list
  const mappedRecords: RecordType[] = history.map(p => ({
    id: p.id,
    doctor: p.doctor_name || 'Unknown Doctor',
    clinic: p.hospital_name || 'Unknown Clinic',
    date: p.prescription_date 
      ? new Date(p.prescription_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'}) 
      : new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'}),
    status: 'Verified',
    details: '', // details fetched later dynamically
    imageUrl: p.image_url
  }));

  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Page Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-emerald-950 mb-4 tracking-tight">Prescription Insights</h1>
          <p className="text-emerald-900/60 max-w-2xl text-base sm:text-lg leading-relaxed">
            Digitize, analyze, and manage your medical prescriptions effortlessly with our advanced AI.
          </p>
        </div>

        <div className="space-y-16">
          
          {/* Top Section: Upload & Analysis */}
          <div className="w-full space-y-8">
            
            {/* Upload Area */}
            <div {...getRootProps()}>
              <motion.div 
                whileHover={!preview ? { scale: 1.01 } : {}}
                className={`relative flex flex-col items-center justify-center p-12 border-dashed border-2 rounded-[2rem] cursor-pointer transition-all duration-300 min-h-[400px] overflow-hidden ${
                  isDragActive 
                    ? 'border-emerald-500 bg-emerald-100/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
                    : preview ? 'border-emerald-200 bg-emerald-50/20' : 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                }`}
              >
                <input {...getInputProps()} />
              
                {preview ? (
                  <div className="absolute inset-0 p-4 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Prescription preview" className="max-w-full max-h-full object-contain rounded-xl shadow-md" />
                    <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[2px] rounded-[2rem] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/90 text-emerald-900 px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
                        <UploadCloud size={20} />
                        Replace Prescription
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center z-10 max-w-md mx-auto">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${isDragActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-emerald-100 text-emerald-600'}`}>
                      <UploadCloud size={48} className={isDragActive ? 'animate-bounce' : ''} />
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-950 mb-2">Upload Prescription</h3>
                    <p className="text-emerald-900/60 mb-8">Drag and drop your prescription image here, or click to browse your files.</p>
                    <button className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg">
                      Select File
                    </button>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-6 bg-red-50 border border-red-200 rounded-[2rem] flex items-center space-x-4 shadow-sm w-full"
                >
                  <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-950 text-lg">Analysis Failed</h4>
                    <p className="text-sm text-red-900/70">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Bar: File Selected -> Get Insights */}
            <AnimatePresence>
              {file && !analysis && !isAnalyzing && !error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-6 bg-white border border-emerald-100 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_-15px_rgba(5,150,105,0.1)] relative overflow-hidden w-full"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
                  <div className="flex items-center space-x-4 pl-4 w-full sm:w-auto">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                      <FileText size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-emerald-950 text-lg">Ready for Analysis</h4>
                      <p className="text-sm text-emerald-900/60 truncate">{file.name}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                    className="w-full sm:w-auto px-10 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all hover:-translate-y-1 shadow-[0_10px_20px_-10px_rgba(16,185,129,0.6)] flex items-center justify-center space-x-2 shrink-0 group"
                  >
                    <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                    <span>Get Insights</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium Loader State */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-12 bg-white/80 backdrop-blur-2xl border border-emerald-100 rounded-[2rem] flex flex-col items-center justify-center space-y-8 shadow-2xl min-h-[400px] relative overflow-hidden w-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50 via-white to-teal-50 opacity-50 animate-pulse" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative flex items-center justify-center mb-8">
                      <div className="absolute inset-0 bg-emerald-400 blur-[40px] opacity-40 rounded-full animate-pulse" />
                      <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center relative z-10 border border-emerald-100">
                        <Loader2 size={46} className="text-emerald-600 animate-spin absolute" />
                        <Brain size={24} className="text-emerald-800 animate-pulse" />
                      </div>
                    </div>
                    
                    <h3 className="text-3xl font-extrabold text-emerald-950 mb-3 tracking-tight">Extracting Insights</h3>
                    <p className="text-emerald-900/60 max-w-md mx-auto text-center text-base leading-relaxed mb-8">
                      Our AI is carefully analyzing your document to securely identify medicines, diagnoses, and doctor&apos;s instructions.
                    </p>
                    
                    <div className="w-full max-w-md h-2 bg-emerald-100 rounded-full overflow-hidden relative">
                      <motion.div 
                        className="absolute top-0 bottom-0 bg-emerald-500 rounded-full w-1/2"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Extracted Insights Result */}
            <AnimatePresence>
              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/90 backdrop-blur-2xl border border-emerald-100 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] overflow-hidden w-full"
                >
                  {/* Result Header */}
                  <div className="bg-emerald-900 p-8 md:px-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none" />
                    <h3 className="text-2xl font-bold flex items-center space-x-3 relative z-10">
                      <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl">
                        <Sparkles size={24} className="text-emerald-300" />
                      </div>
                      <span>Prescription Insights</span>
                    </h3>
                  </div>

                  {/* Wide Data Container */}
                  <div className="p-6 md:p-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600"><UserCircle2 size={16}/></div>
                          <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider">Doctor Name</span>
                        </div>
                        <p className="font-bold text-emerald-950 text-lg leading-tight truncate">{analysis.doctor_name || 'Not detected'}</p>
                      </div>
                      
                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600"><Building2 size={16}/></div>
                          <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider">Clinic / Hospital</span>
                        </div>
                        <p className="font-bold text-emerald-950 text-lg leading-tight truncate">{analysis.hospital_name || 'Not detected'}</p>
                      </div>

                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600"><Activity size={16}/></div>
                          <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider">Diagnosis</span>
                        </div>
                        <p className="font-bold text-emerald-950 text-lg leading-tight truncate">{analysis.diagnosis || 'Not detected'}</p>
                      </div>

                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600"><CalendarDays size={16}/></div>
                          <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider">Date</span>
                        </div>
                        <p className="font-bold text-emerald-950 text-lg leading-tight truncate">
                          {analysis.prescription_date ? new Date(analysis.prescription_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'}) : 'Not detected'}
                        </p>
                      </div>
                    </div>

                    <h4 className="font-bold text-emerald-950 mb-6 text-xl flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 rounded-lg"><Pill className="text-emerald-600" size={20}/></div>
                      Prescribed Medicines
                    </h4>
                    
                    {/* COMPACT MEDICINES LIST */}
                    {analysis.medicines && analysis.medicines.length > 0 ? (
                      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analysis.medicines.map((med, idx) => (
                          <motion.div variants={itemVariants} key={idx} className="p-4 border border-emerald-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-emerald-950 text-base truncate mb-1.5">{med.name}</h5>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {med.dosage && <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-blue-100/50">Dosage: {med.dosage}</span>}
                                {med.frequency && <span className="bg-purple-50 text-purple-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-purple-100/50">Freq: {med.frequency}</span>}
                                {med.duration && <span className="bg-orange-50 text-orange-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-orange-100/50">Time: {med.duration}</span>}
                              </div>
                              {med.instructions && (
                                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                                  {med.instructions}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <div className="p-8 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                        <Pill size={32} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500 font-medium">No specific medicines were detected in this prescription.</p>
                      </div>
                    )}

                    {/* HIGHLIGHTED AI RECOMMENDED TESTS */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <motion.div variants={containerVariants} initial="hidden" animate="show" className="mt-12 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200/60 rounded-[2rem] p-8 sm:p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-48 h-48 bg-amber-400/20 blur-3xl rounded-full pointer-events-none" />
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm"><Microscope size={24}/></div>
                            <h4 className="font-extrabold text-amber-950 text-2xl tracking-tight">Recommended Lab Tests</h4>
                          </div>
                          
                          <p className="text-amber-900/80 mb-8 font-medium max-w-2xl leading-relaxed">
                            Based on your diagnosis and prescribed medications, our AI recommends these follow-up tests to monitor your health.
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            {analysis.recommendations.map((rec, idx) => (
                              <motion.div variants={itemVariants} key={idx} className="p-5 bg-white rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
                                <div>
                                  <h5 className="font-bold text-amber-950 text-lg mb-1">{rec.lab_test.name}</h5>
                                  <p className="text-xs font-medium text-amber-700/60 uppercase tracking-wider flex items-center gap-1.5">
                                    <Building2 size={12} /> {rec.lab_test.organization}
                                  </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                  <CheckCircle size={20} />
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          <button 
                            onClick={handleBookRecommendations}
                            className="w-full sm:w-auto px-10 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-3 hover:-translate-y-0.5"
                          >
                            <ShoppingCart size={20} />
                            <span>Add Recommendations to Cart & Book</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom: Previous Records via API */}
          <div className="pt-12 border-t border-emerald-100/50 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
              <h3 className="text-3xl font-extrabold text-emerald-950 tracking-tight">Prescription History</h3>
              <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded-full text-sm w-fit shadow-sm">
                {mappedRecords.length} Records Found
              </span>
            </div>
            
            {isLoadingHistory ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
              </div>
            ) : mappedRecords.length === 0 ? (
               <div className="text-center py-20">
                 <div className="w-20 h-20 bg-white shadow-sm border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-200">
                    <FileText size={40} />
                 </div>
                 <p className="text-emerald-900/60 font-medium">Your prescription history is empty.</p>
               </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-100px" }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {mappedRecords.map((record) => (
                  <motion.div
                    variants={itemVariants}
                    key={record.id}
                    className="p-6 bg-white/80 backdrop-blur-xl border border-emerald-100/60 rounded-3xl shadow-sm hover:shadow-[0_15px_35px_-10px_rgba(5,150,105,0.15)] transition-all duration-300 group flex flex-col h-full hover:-translate-y-1 cursor-pointer"
                    onClick={() => handleViewRecord(record.id)}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-950 line-clamp-1 text-lg group-hover:text-emerald-700 transition-colors">{record.doctor}</h4>
                          <p className="text-sm text-emerald-900/60 line-clamp-1">{record.clinic}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 mb-8">
                      <span className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 ${
                        record.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {record.status === 'Verified' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        <span>{record.status}</span>
                      </span>
                      <span className="text-sm text-emerald-900/50 font-medium flex items-center gap-1.5">
                        <CalendarDays size={14}/> {record.date}
                      </span>
                    </div>

                    <div className="mt-auto pt-6 border-t border-emerald-50 flex space-x-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleViewRecord(record.id); }}
                        className="w-full px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors text-center"
                      >
                        View Details
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Modal for Viewing Record Details */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full ${selectedRecord?.imageUrl && !isFetchingRecord ? 'max-w-6xl' : 'max-w-3xl'} max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-10 transition-all duration-300`}
              >
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-emerald-100 bg-emerald-50/50 shrink-0">
                  <div className="flex items-center space-x-5">
                    <div className="p-4 bg-white text-emerald-600 rounded-2xl shadow-sm border border-emerald-100">
                      <FileText size={28} />
                    </div>
                    <div>
                      {isFetchingRecord ? (
                        <div className="space-y-2">
                          <div className="h-6 w-48 bg-emerald-200/50 animate-pulse rounded" />
                          <div className="h-4 w-32 bg-emerald-200/50 animate-pulse rounded" />
                        </div>
                      ) : selectedRecord ? (
                        <>
                          <h2 className="text-2xl font-extrabold text-emerald-950">{selectedRecord.doctor}</h2>
                          <p className="text-emerald-900/60 font-medium mt-1">{selectedRecord.clinic} • {selectedRecord.date}</p>
                        </>
                      ) : (
                        <h2 className="text-2xl font-extrabold text-emerald-950">Error</h2>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-100 rounded-full transition-colors"
                  >
                    <X size={28} />
                  </button>
                </div>
                
                <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar bg-white flex-1">
                  {isFetchingRecord ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="animate-spin text-emerald-500" size={48} />
                      <p className="mt-4 text-emerald-900/60 font-medium">Fetching prescription details...</p>
                    </div>
                  ) : selectedRecord ? (
                    <div className={`flex flex-col ${selectedRecord.imageUrl ? 'lg:flex-row' : ''} gap-8`}>
                      
                      {/* Embedded Image Area */}
                      {selectedRecord.imageUrl && (
                        <div className="w-full lg:w-1/2 flex flex-col space-y-4">
                          <h3 className="text-xl font-bold text-emerald-950 px-2">Original Prescription</h3>
                          <div className="relative w-full rounded-2xl border border-emerald-100 overflow-hidden bg-emerald-50/30 flex-1 min-h-[400px] lg:min-h-[500px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={selectedRecord.imageUrl} 
                              alt="Original Prescription" 
                              className="absolute inset-0 w-full h-full object-contain p-2" 
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Markdown Details Area */}
                      <div className={`w-full ${selectedRecord.imageUrl ? 'lg:w-1/2' : ''} flex flex-col space-y-4`}>
                        <h3 className="text-xl font-bold text-emerald-950 px-2">Extracted Details</h3>
                        <div className="prose prose-emerald prose-headings:text-emerald-950 prose-a:text-emerald-600 max-w-none bg-white border border-emerald-100 p-6 rounded-2xl shadow-sm">
                          <Markdown>{selectedRecord.details}</Markdown>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                      <AlertCircle size={48} className="mb-4 opacity-50" />
                      <p className="font-medium">Could not load prescription data.</p>
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t border-emerald-100 bg-emerald-50/50 flex justify-end shrink-0">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}