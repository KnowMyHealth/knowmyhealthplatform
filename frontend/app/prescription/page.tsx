'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, FileText, CheckCircle, Clock, File, Brain, X, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ProtectedRoute from '@/components/ProtectedRoute';

// --- Types ---
type RecordType = {
  id: number;
  doctor: string;
  clinic: string;
  date: string;
  status: string;
  details: string;
};

// Types corresponding to your backend response schema
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

      // Fetch from your backend utilizing the .env variable
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      // Note: Make sure your auth token is stored here during login, or update to your auth approach
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
      setError(err.message || 'An error occurred while connecting to the backend.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="Patient">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-950 mb-4">Prescription Vault</h1>
          <p className="text-emerald-900/60 max-w-2xl text-base sm:text-lg">Securely store, manage, and analyze your medical prescriptions using AI.</p>
        </div>

        <div className="space-y-16">
          {/* Top: Upload & Insights */}
          <div className="max-w-4xl mx-auto space-y-8">
            <div {...getRootProps()}>
              <motion.div 
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(209, 250, 229, 0.5)' }}
                className={`relative flex flex-col items-center justify-center p-12 border-dashed border-2 rounded-[2rem] cursor-pointer transition-colors min-h-[400px] ${
                  isDragActive ? 'border-emerald-500 bg-emerald-100/50' : 'border-emerald-300 bg-emerald-50/50'
                }`}
              >
                <input {...getInputProps()} />
              
              {preview ? (
                <div className="absolute inset-0 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Prescription preview" className="w-full h-full object-contain rounded-xl" />
                  <div className="absolute inset-0 bg-black/40 rounded-[2rem] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white font-medium">Click or drag to change</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600">
                    <UploadCloud size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-950 mb-2">Upload Prescription</h3>
                  <p className="text-emerald-900/60 mb-8 max-w-sm">Drag and drop your prescription image here, or click to browse files.</p>
                  <button className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-colors shadow-md">
                    Select File
                  </button>
                </div>
              )}
              </motion.div>
            </div>

            {error && (
               <motion.div 
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="p-6 bg-red-50 border border-red-200 rounded-[2rem] flex items-center space-x-4 shadow-sm"
               >
                 <div className="p-2 bg-red-100 text-red-600 rounded-full shrink-0">
                   <AlertCircle size={24} />
                 </div>
                 <div>
                   <h4 className="font-bold text-red-950">Analysis Failed</h4>
                   <p className="text-sm text-red-900/70">{error}</p>
                 </div>
               </motion.div>
            )}

            {file && !analysis && !isAnalyzing && !error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-emerald-100/50 border border-emerald-200 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-emerald-500 rounded-full text-white shrink-0">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950">Upload Successful!</h4>
                    <p className="text-sm text-emerald-900/70">Your prescription is ready for backend extraction.</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-900 text-white font-semibold rounded-full hover:bg-emerald-950 transition-colors shadow-md flex items-center justify-center space-x-2 shrink-0"
                >
                  <Brain size={20} />
                  <span>Extract Data</span>
                </button>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-12 bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2rem] flex flex-col items-center justify-center space-y-8 shadow-[0_20px_40px_-15px_rgba(5,150,105,0.1)] min-h-[400px]"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-40 rounded-full animate-pulse" />
                  <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center relative z-10 animate-bounce">
                    <Brain size={40} className="text-emerald-600" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-emerald-950">Analyzing via Backend...</h3>
                  <p className="text-emerald-900/60 max-w-md mx-auto">Uploading the optimized image and extracting structured medical data securely.</p>
                </div>
                <div className="w-full max-w-md space-y-4 opacity-60">
                  <div className="h-3 bg-emerald-200 rounded-full w-3/4 mx-auto animate-pulse" />
                  <div className="h-3 bg-emerald-200 rounded-full w-full mx-auto animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="h-3 bg-emerald-200 rounded-full w-5/6 mx-auto animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}

            {analysis && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 sm:p-10 bg-white/90 backdrop-blur-2xl border border-emerald-100 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)] max-h-[800px] overflow-y-auto hide-scrollbar"
              >
                <h3 className="text-2xl font-bold text-emerald-950 mb-8 flex items-center space-x-3 sticky top-0 bg-white/90 backdrop-blur-xl py-4 z-10 -mt-4 border-b border-emerald-50">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Brain size={24} />
                  </div>
                  <span>Extracted Prescription Data</span>
                </h3>

                {/* Structured Extraction Rendering */}
                <div className="bg-emerald-50 rounded-2xl p-6 mb-8 border border-emerald-100/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider block mb-1">Doctor</span>
                      <p className="font-bold text-emerald-950">{analysis.doctor_name || 'Not detected'}</p>
                    </div>
                    <div>
                      <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider block mb-1">Clinic/Hospital</span>
                      <p className="font-bold text-emerald-950">{analysis.hospital_name || 'Not detected'}</p>
                    </div>
                    <div>
                      <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider block mb-1">Diagnosis</span>
                      <p className="font-bold text-emerald-950">{analysis.diagnosis || 'Not detected'}</p>
                    </div>
                    <div>
                      <span className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider block mb-1">Date</span>
                      <p className="font-bold text-emerald-950">
                        {analysis.prescription_date ? new Date(analysis.prescription_date).toLocaleDateString() : 'Not detected'}
                      </p>
                    </div>
                  </div>
                </div>

                <h4 className="font-bold text-emerald-950 mb-4 text-xl">Prescribed Medicines</h4>
                {analysis.medicines && analysis.medicines.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.medicines.map((med, idx) => (
                      <div key={idx} className="p-5 border border-emerald-100 rounded-2xl bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                        <div>
                          <h5 className="font-bold text-emerald-900 text-lg">{med.name}</h5>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {med.dosage && (
                              <span className="bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-lg border border-emerald-100">
                                {med.dosage}
                              </span>
                            )}
                            {med.frequency && (
                              <span className="bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-lg border border-emerald-100">
                                {med.frequency}
                              </span>
                            )}
                            {med.duration && (
                              <span className="bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-lg border border-emerald-100">
                                {med.duration}
                              </span>
                            )}
                          </div>
                        </div>
                        {med.instructions && (
                          <div className="md:text-right bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2 md:mt-0 md:min-w-[200px]">
                            <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Instructions</span>
                            <p className="text-sm font-medium text-slate-700">{med.instructions}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                    <p className="text-slate-500 font-medium">No medicines were detected in this prescription.</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Bottom: Previous Records */}
          <div className="pt-8 border-t border-emerald-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h3 className="text-3xl font-bold text-emerald-950">Prescription History</h3>
              <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 font-semibold rounded-full text-sm w-fit">
                {previousRecords.length} Records
              </span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {previousRecords.map((record, i) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-sm hover:shadow-[0_10px_30px_-15px_rgba(5,150,105,0.15)] transition-all group flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <File size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-950 line-clamp-1 text-lg">{record.doctor}</h4>
                        <p className="text-sm text-emerald-900/60 line-clamp-1">{record.clinic}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-6">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center space-x-1 ${
                      record.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {record.status === 'Verified' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      <span>{record.status}</span>
                    </span>
                    <span className="text-sm text-emerald-900/50 font-medium">{record.date}</span>
                  </div>

                  <div className="mt-auto pt-6 border-t border-emerald-50 flex space-x-3">
                    <button 
                      onClick={() => setSelectedRecord(record)}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors text-center"
                    >
                      View Details
                    </button>
                    <button className="px-4 py-2.5 text-sm font-semibold text-emerald-600 bg-white border border-emerald-100 hover:bg-emerald-50 rounded-xl transition-colors text-center">
                      Download
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
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
                className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-10"
              >
                <div className="flex items-center justify-between p-6 border-b border-emerald-100 bg-emerald-50/50">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-950">{selectedRecord.doctor}</h2>
                      <p className="text-emerald-900/60">{selectedRecord.clinic} • {selectedRecord.date}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="p-2 text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto hide-scrollbar">
                  <div className="prose prose-emerald max-w-none">
                    <p className="whitespace-pre-wrap">{selectedRecord.details}</p>
                  </div>
                </div>
                
                <div className="p-6 border-t border-emerald-100 bg-emerald-50/50 flex justify-end">
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
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