'use client';

import { useState, useCallback } from 'react';
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
  Download
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ProtectedRoute from '@/components/ProtectedRoute';
import Markdown from 'react-markdown';

// --- Types ---
type RecordType = {
  id: number;
  doctor: string;
  clinic: string;
  date: string;
  status: string;
  details: string;
};

interface PrescriptionMedicineSchema {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
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
}

// --- Mock Data ---
const previousRecords: RecordType[] = [
  { 
    id: 1, doctor: 'Dr. Ramesh Kumar', clinic: 'Apollo Hospitals', date: 'Oct 12, 2023', status: 'Verified',
    details: `### Patient Details\n**Name:** John Doe\n**Age:** 45\n\n### Diagnosis\nHypertension and Mild Hyperlipidemia\n\n### Medications\n1. **Telmisartan 40mg**\n   - *Dosage:* 1 tablet daily\n   - *Timing:* Morning, after breakfast\n   - *Duration:* 30 days\n   - *Purpose:* Blood pressure control\n2. **Atorvastatin 10mg**\n   - *Dosage:* 1 tablet daily\n   - *Timing:* Night, after dinner\n   - *Duration:* 30 days\n   - *Purpose:* Cholesterol management\n\n### Doctor's Notes\nPatient advised to reduce sodium intake. Regular brisk walking for 30 mins recommended.\n\n### Precautions\nMonitor blood pressure weekly. Report any muscle aches immediately.`
  },
  { 
    id: 2, doctor: 'Dr. Sarah Jenkins', clinic: 'City Care Clinic', date: 'Sep 05, 2023', status: 'Archived',
    details: `### Patient Details\n**Name:** John Doe\n**Age:** 45\n\n### Diagnosis\nAcute Bronchitis\n\n### Medications\n1. **Amoxicillin 500mg**\n   - *Dosage:* 1 capsule thrice daily\n   - *Timing:* After meals\n   - *Duration:* 5 days\n   - *Purpose:* Antibiotic for bacterial infection\n2. **Dextromethorphan Syrup**\n   - *Dosage:* 10ml twice daily\n   - *Timing:* Morning and Night\n   - *Duration:* 5 days\n   - *Purpose:* Cough suppression\n\n### Doctor's Notes\nDrink plenty of warm fluids. Rest for the next 3 days. Avoid cold beverages.\n\n### Precautions\nComplete the full course of antibiotics even if feeling better.`
  },
  { 
    id: 3, doctor: 'Dr. Amit Patel', clinic: 'Patel Ortho Center', date: 'Jul 22, 2023', status: 'Verified',
    details: `### Patient Details\n**Name:** John Doe\n**Age:** 45\n\n### Diagnosis\nLumbar Muscle Sprain\n\n### Medications\n1. **Ibuprofen 400mg**\n   - *Dosage:* 1 tablet twice daily\n   - *Timing:* After meals\n   - *Duration:* 5 days or as needed for pain\n   - *Purpose:* Pain relief and anti-inflammatory\n2. **Thiocolchicoside 4mg**\n   - *Dosage:* 1 capsule at night\n   - *Timing:* After dinner\n   - *Duration:* 5 days\n   - *Purpose:* Muscle relaxant\n\n### Doctor's Notes\nApply ice pack to the lower back for 15 mins, 3 times a day. Avoid lifting heavy objects.\n\n### Lifestyle & Dietary Recommendations\nGentle stretching exercises after 3 days of rest. Maintain proper posture while sitting.`
  },
];

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function PrescriptionVaultPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PrescriptionSchema | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordType | null>(null);

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

      const response = await fetch(`${BACKEND_URL}/prescriptions/ocr`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to analyze prescription');
      }

      setAnalysis(responseData.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while analyzing the prescription.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="Patient">
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
          {/* Removed max-w constraints to match the grid width below */}
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
                  
                  {/* Fixed Action Button */}
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
                  {/* Animated Background */}
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
                      Our AI is carefully analyzing your document to securely identify medicines, dosages, and doctor&apos;s instructions.
                    </p>
                    
                    {/* Infinite Progress Bar */}
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
                    
                    {/* Structured Extraction Rendering - 4 Columns on lg screens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                      
                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center hover:bg-emerald-50 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm text-emerald-600"><UserCircle2 size={20}/></div>
                          <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider">Doctor Name</span>
                        </div>
                        <p className="font-bold text-emerald-950 text-xl leading-tight">{analysis.doctor_name || 'Not detected'}</p>
                      </div>
                      
                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center hover:bg-emerald-50 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm text-emerald-600"><Building2 size={20}/></div>
                          <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider">Clinic / Hospital</span>
                        </div>
                        <p className="font-bold text-emerald-950 text-xl leading-tight">{analysis.hospital_name || 'Not detected'}</p>
                      </div>

                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center hover:bg-emerald-50 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm text-emerald-600"><Activity size={20}/></div>
                          <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider">Diagnosis</span>
                        </div>
                        <p className="font-bold text-emerald-950 text-xl leading-tight">{analysis.diagnosis || 'Not detected'}</p>
                      </div>

                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center hover:bg-emerald-50 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm text-emerald-600"><CalendarDays size={20}/></div>
                          <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider">Date</span>
                        </div>
                        <p className="font-bold text-emerald-950 text-xl leading-tight">
                          {analysis.prescription_date ? new Date(analysis.prescription_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'}) : 'Not detected'}
                        </p>
                      </div>

                    </div>

                    <h4 className="font-bold text-emerald-950 mb-6 text-2xl flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-xl">
                        <Pill className="text-emerald-600" size={24}/>
                      </div>
                      Prescribed Medicines
                    </h4>
                    
                    {analysis.medicines && analysis.medicines.length > 0 ? (
                      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {analysis.medicines.map((med, idx) => (
                          <motion.div variants={itemVariants} key={idx} className="p-6 border border-emerald-100 rounded-[1.5rem] bg-white shadow-[0_4px_15px_-5px_rgba(0,0,0,0.05)] flex flex-col justify-between hover:shadow-[0_8px_20px_-5px_rgba(5,150,105,0.1)] transition-all group h-full">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-1">
                                <span className="font-bold text-lg">{idx + 1}</span>
                              </div>
                              <div className="flex-1">
                                <h5 className="font-bold text-emerald-950 text-xl group-hover:text-emerald-700 transition-colors mb-3">{med.name}</h5>
                                <div className="flex flex-wrap gap-2">
                                  {med.dosage && (
                                    <span className="bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border border-blue-100/50">
                                      Dosage: {med.dosage}
                                    </span>
                                  )}
                                  {med.frequency && (
                                    <span className="bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border border-purple-100/50">
                                      Freq: {med.frequency}
                                    </span>
                                  )}
                                  {med.duration && (
                                    <span className="bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border border-orange-100/50">
                                      Time: {med.duration}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {med.instructions && (
                              <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 mt-auto">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Instructions</span>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed">{med.instructions}</p>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <div className="p-12 bg-slate-50 border border-slate-100 rounded-3xl text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                          <Pill size={40} />
                        </div>
                        <p className="text-slate-500 text-lg font-medium">No specific medicines were detected in this prescription.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom: Previous Records */}
          <div className="pt-12 border-t border-emerald-100/50 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
              <h3 className="text-3xl font-extrabold text-emerald-950 tracking-tight">Prescription History</h3>
              <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded-full text-sm w-fit shadow-sm">
                {previousRecords.length} Records Found
              </span>
            </div>
            
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {previousRecords.map((record) => (
                <motion.div
                  variants={itemVariants}
                  key={record.id}
                  className="p-6 bg-white/80 backdrop-blur-xl border border-emerald-100/60 rounded-3xl shadow-sm hover:shadow-[0_15px_35px_-10px_rgba(5,150,105,0.15)] transition-all duration-300 group flex flex-col h-full hover:-translate-y-1 cursor-pointer"
                  onClick={() => setSelectedRecord(record)}
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
                      className="flex-1 px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors text-center"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); /* Handle download logic */ }}
                      className="w-12 h-12 flex items-center justify-center text-emerald-600 bg-white border border-emerald-100 hover:bg-emerald-50 rounded-xl transition-colors hover:shadow-sm shrink-0"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Modal for Viewing Record Details */}
        <AnimatePresence>
          {selectedRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedRecord(null)}
                className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-10"
              >
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-emerald-100 bg-emerald-50/50">
                  <div className="flex items-center space-x-5">
                    <div className="p-4 bg-white text-emerald-600 rounded-2xl shadow-sm border border-emerald-100">
                      <FileText size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-emerald-950">{selectedRecord.doctor}</h2>
                      <p className="text-emerald-900/60 font-medium mt-1">{selectedRecord.clinic} • {selectedRecord.date}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="p-2 text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-100 rounded-full transition-colors"
                  >
                    <X size={28} />
                  </button>
                </div>
                
                <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar bg-white">
                  <div className="prose prose-emerald prose-headings:text-emerald-950 prose-a:text-emerald-600 max-w-none">
                    {/* Utilizing react-markdown to beautifully render the text */}
                    <Markdown>{selectedRecord.details}</Markdown>
                  </div>
                </div>
                
                <div className="p-6 border-t border-emerald-100 bg-emerald-50/50 flex justify-end gap-3">
                  <button className="px-6 py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 border border-emerald-200 transition-colors">
                    Download PDF
                  </button>
                  <button 
                    onClick={() => setSelectedRecord(null)}
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