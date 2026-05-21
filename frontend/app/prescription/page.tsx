'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud, FileText, CheckCircle, Clock, Brain, X, AlertCircle,
  Sparkles, Pill, Activity, CalendarDays, Building2, UserCircle2,
  Loader2, ShoppingCart, Microscope, ArrowRight,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ProtectedRoute from '@/components/ProtectedRoute';
import Markdown from 'react-markdown';

type RecordType = {
  id: string; doctor: string; clinic: string; date: string;
  status: string; details: string; imageUrl?: string;
};

interface PrescriptionMedicineSchema {
  id: string; name: string; dosage?: string;
  frequency?: string; duration?: string; instructions?: string;
}

interface RecommendedTest {
  id: string;
  lab_test: { id: string; name: string; organization: string };
}

interface PrescriptionSchema {
  id: string; user_id: string; image_url?: string;
  doctor_name?: string; hospital_name?: string;
  diagnosis?: string; prescription_date?: string;
  created_at: string;
  medicines: PrescriptionMedicineSchema[];
  recommendations?: RecommendedTest[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingRecord, setIsFetchingRecord] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordType | null>(null);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('supabase_access_token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${BACKEND_URL}/api/v1/prescriptions/`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await res.json();
      if (res.ok && data.success) setHistory(data.data);
    } catch (e) {
      console.error('Failed to fetch prescription history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setAnalysis(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1,
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const token = localStorage.getItem('supabase_access_token');
      const res = await fetch(`${BACKEND_URL}/api/v1/prescriptions/ocr`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to analyze prescription');
      setAnalysis(data.data);
      setHistory(prev => [data.data, ...prev]);
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing.');
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
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${BACKEND_URL}/api/v1/prescriptions/${id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await res.json();
      if (res.ok) {
        const p = data.data;
        const medMd = p.medicines?.length
          ? p.medicines.map((m: any, i: number) =>
              `#### ${i + 1}. ${m.name}\n- **Dosage:** ${m.dosage || 'N/A'}\n- **Timing:** ${m.frequency || 'N/A'}\n- **Duration:** ${m.duration || 'N/A'}\n- **Instructions:** ${m.instructions || 'N/A'}`)
            .join('\n\n---\n\n')
          : '*No medications detected.*';
        const recMd = p.recommendations?.length
          ? p.recommendations.map((r: any) => `- **${r.lab_test.name}** (at ${r.lab_test.organization})`).join('\n')
          : '*No recommended tests.*';
        setSelectedRecord({
          id: p.id,
          doctor: p.doctor_name || 'Unknown Doctor',
          clinic: p.hospital_name || 'Unknown Clinic',
          date: p.prescription_date
            ? new Date(p.prescription_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            : new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
          status: 'Verified',
          details: `### Diagnosis\n${p.diagnosis ? `> ${p.diagnosis}` : '*Not specified*'}\n\n### Medications\n${medMd}\n\n### AI Recommended Tests\n${recMd}`,
          imageUrl: p.image_url,
        });
      }
    } catch (e) {
      console.error('Error fetching prescription details', e);
    } finally {
      setIsFetchingRecord(false);
    }
  };

  const handleBookRecommendations = () => {
    if (!analysis?.recommendations?.length) return;
    const ids = analysis.recommendations.map(r => r.lab_test.id).join(',');
    router.push(`/diagnostics?autoAdd=${ids}`);
  };

  const mappedRecords: RecordType[] = history.map(p => ({
    id: p.id,
    doctor: p.doctor_name || 'Unknown Doctor',
    clinic: p.hospital_name || 'Unknown Clinic',
    date: p.prescription_date
      ? new Date(p.prescription_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    status: 'Verified',
    details: '',
    imageUrl: p.image_url,
  }));

  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="flex flex-col w-full min-h-screen">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative bg-emerald-950 pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[800px] bg-emerald-700/10 blur-[120px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-500/10 blur-[100px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/20 mb-5">
                <Brain size={14} className="text-teal-400" />
                <span className="text-xs font-bold tracking-wider text-teal-300 uppercase">AI-Powered Analysis</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-4">
                Prescription{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Insights</span>
              </h1>
              <p className="text-emerald-300/60 max-w-xl leading-relaxed">
                Upload any prescription image. Our AI extracts medicines, diagnoses, and recommends follow-up tests — instantly.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Main Content ──────────────────────────────────────────────── */}
        <div className="flex-1 bg-slate-50/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-16">

            {/* Upload + Analysis */}
            <div className="space-y-6">

              {/* Upload Zone */}
              <div {...getRootProps()}>
                <motion.div
                  whileHover={!preview ? { scale: 1.005 } : {}}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 min-h-[340px] overflow-hidden ${
                    isDragActive
                      ? 'border-emerald-500 bg-emerald-50 shadow-[0_0_40px_rgba(16,185,129,0.15)]'
                      : preview ? 'border-emerald-200 bg-white' : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'
                  }`}
                >
                  <input {...getInputProps()} />

                  {preview ? (
                    <div className="absolute inset-0 p-4 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Prescription preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-md" />
                      <div className="absolute inset-0 bg-emerald-950/50 backdrop-blur-[2px] rounded-3xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white text-emerald-900 px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
                          <UploadCloud size={18} /> Replace Image
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center max-w-sm mx-auto px-6">
                      <motion.div
                        animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-sm transition-colors ${isDragActive ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}
                      >
                        <UploadCloud size={40} />
                      </motion.div>
                      <h3 className="text-xl font-extrabold text-slate-900 mb-2">
                        {isDragActive ? 'Drop it here!' : 'Upload Prescription'}
                      </h3>
                      <p className="text-slate-500 text-sm mb-6 leading-relaxed">Drag & drop a prescription image, or click to browse. Supports JPG, PNG, HEIC.</p>
                      <span className="px-6 py-2.5 bg-emerald-900 text-white font-bold text-sm rounded-full hover:bg-emerald-800 transition-colors shadow-sm">
                        Choose File
                      </span>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                      <AlertCircle size={20} className="text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-red-900">Analysis Failed</p>
                      <p className="text-sm text-red-700/80">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ready to Analyze */}
              <AnimatePresence>
                {file && !analysis && !isAnalyzing && !error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
                    <div className="flex items-center gap-4 pl-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                        <FileText size={20} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Ready for Analysis</p>
                        <p className="text-sm text-slate-400 truncate max-w-xs">{file.name}</p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                      className="w-full sm:w-auto px-8 py-3.5 bg-emerald-900 text-white font-bold rounded-2xl hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 group shadow-sm">
                      <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                      Get Insights
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Analyzing loader */}
              <AnimatePresence>
                {isAnalyzing && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="relative bg-emerald-950 rounded-3xl overflow-hidden min-h-[320px] flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.2) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900 via-emerald-950 to-teal-900" />
                    <div className="relative z-10 flex flex-col items-center text-center px-8">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-teal-400/20 blur-[40px] rounded-full" />
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 flex items-center justify-center relative">
                          <Loader2 size={32} className="text-teal-300 animate-spin absolute" />
                          <Brain size={18} className="text-emerald-200 animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Extracting Insights</h3>
                      <p className="text-emerald-300/60 max-w-sm text-sm leading-relaxed mb-8">
                        Our AI is reading your prescription — medicines, diagnoses, and doctor instructions.
                      </p>
                      <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full w-1/2"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Analysis Result */}
              <AnimatePresence>
                {analysis && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200/80 rounded-3xl shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] overflow-hidden">

                    {/* Result header */}
                    <div className="relative bg-emerald-950 px-8 py-7 overflow-hidden">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.2) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
                      <div className="absolute top-0 right-0 w-56 h-56 bg-teal-400/10 blur-[70px] rounded-full pointer-events-none" />
                      <div className="relative flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                          <Sparkles size={20} className="text-teal-300" />
                        </div>
                        <div>
                          <h3 className="text-xl font-extrabold text-white">Prescription Insights</h3>
                          <p className="text-emerald-300/50 text-xs">AI-extracted details from your uploaded image</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:p-8">
                      {/* Meta grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                        {[
                          { icon: UserCircle2, label: 'Doctor', value: analysis.doctor_name },
                          { icon: Building2, label: 'Clinic / Hospital', value: analysis.hospital_name },
                          { icon: Activity, label: 'Diagnosis', value: analysis.diagnosis },
                          { icon: CalendarDays, label: 'Date', value: analysis.prescription_date ? new Date(analysis.prescription_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                                <Icon size={14} className="text-emerald-600" />
                              </div>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                            </div>
                            <p className="font-bold text-slate-900 truncate">{value || 'Not detected'}</p>
                          </div>
                        ))}
                      </div>

                      {/* Medicines */}
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Pill size={16} className="text-emerald-700" />
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-lg">Prescribed Medicines</h4>
                      </div>
                      {analysis.medicines?.length ? (
                        <motion.div variants={containerVariants} initial="hidden" animate="show"
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                          {analysis.medicines.map((med, idx) => (
                            <motion.div variants={itemVariants} key={idx}
                              className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex gap-4">
                              <div className="w-8 h-8 rounded-full bg-emerald-900 flex items-center justify-center text-white font-extrabold text-xs shrink-0">{idx + 1}</div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-slate-900 truncate mb-2">{med.name}</h5>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {med.dosage && <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-100">Dose: {med.dosage}</span>}
                                  {med.frequency && <span className="bg-violet-50 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-violet-100">Freq: {med.frequency}</span>}
                                  {med.duration && <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-100">{med.duration}</span>}
                                </div>
                                {med.instructions && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">{med.instructions}</p>}
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : (
                        <div className="p-8 bg-slate-50 border border-slate-100 rounded-2xl text-center mb-10">
                          <Pill size={28} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-slate-500 font-medium text-sm">No medicines detected.</p>
                        </div>
                      )}

                      {/* Recommended tests */}
                      {analysis.recommendations?.length ? (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                          className="relative bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200/60 rounded-3xl p-7 overflow-hidden">
                          <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-300/20 blur-3xl rounded-full pointer-events-none" />
                          <div className="relative">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center"><Microscope size={20} className="text-white" /></div>
                              <h4 className="font-extrabold text-amber-950 text-xl">Recommended Lab Tests</h4>
                            </div>
                            <p className="text-amber-900/70 text-sm mb-6 leading-relaxed">
                              Based on your diagnosis, our AI recommends these follow-up tests.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3 mb-6">
                              {analysis.recommendations.map((rec, idx) => (
                                <div key={idx} className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
                                  <div>
                                    <p className="font-bold text-amber-950">{rec.lab_test.name}</p>
                                    <p className="text-xs text-amber-700/60 flex items-center gap-1 mt-0.5"><Building2 size={11} /> {rec.lab_test.organization}</p>
                                  </div>
                                  <CheckCircle size={18} className="text-amber-400 shrink-0" />
                                </div>
                              ))}
                            </div>
                            <button onClick={handleBookRecommendations}
                              className="flex items-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-amber-400/30 hover:-translate-y-0.5">
                              <ShoppingCart size={18} /> Add to Cart &amp; Book
                            </button>
                          </div>
                        </motion.div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Prescription History */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Upload History</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Previously analyzed prescription images</p>
                </div>
                {!isLoadingHistory && (
                  <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded-full text-sm w-fit">
                    {mappedRecords.length} Records
                  </span>
                )}
              </div>

              {isLoadingHistory ? (
                <div className="flex justify-center items-center py-24">
                  <Loader2 className="animate-spin text-emerald-500" size={40} />
                </div>
              ) : mappedRecords.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-200/80">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText size={28} className="text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-500 mb-1">No upload history yet</p>
                  <p className="text-sm text-slate-400">Analyzed prescriptions will appear here.</p>
                </div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mappedRecords.map((record) => (
                    <motion.div variants={itemVariants} key={record.id}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      onClick={() => handleViewRecord(record.id)}
                      className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)] cursor-pointer transition-shadow group flex flex-col"
                    >
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 bg-emerald-900 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                          <FileText size={22} className="text-emerald-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">{record.doctor}</h4>
                          <p className="text-sm text-slate-400 truncate">{record.clinic}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-auto">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-lg">
                          <CheckCircle size={12} /> Verified
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <CalendarDays size={12} /> {record.date}
                        </span>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <button onClick={(e) => { e.stopPropagation(); handleViewRecord(record.id); }}
                          className="w-full py-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-sm font-bold rounded-xl transition-colors border border-slate-100 hover:border-emerald-200">
                          View Details
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

          </div>
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full ${selectedRecord?.imageUrl && !isFetchingRecord ? 'max-w-6xl' : 'max-w-3xl'} max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10`}
              >
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-slate-50/60 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-emerald-900 rounded-2xl flex items-center justify-center">
                      <FileText size={20} className="text-emerald-300" />
                    </div>
                    {isFetchingRecord ? (
                      <div className="space-y-2">
                        <div className="h-5 w-40 bg-slate-200 animate-pulse rounded" />
                        <div className="h-4 w-28 bg-slate-200 animate-pulse rounded" />
                      </div>
                    ) : selectedRecord ? (
                      <div>
                        <h2 className="font-extrabold text-slate-900 text-lg">{selectedRecord.doctor}</h2>
                        <p className="text-slate-400 text-sm">{selectedRecord.clinic} · {selectedRecord.date}</p>
                      </div>
                    ) : null}
                  </div>
                  <button onClick={() => setIsModalOpen(false)}
                    className="w-9 h-9 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <X size={16} className="text-slate-500" />
                  </button>
                </div>

                <div className="p-6 sm:p-8 overflow-y-auto bg-white flex-1">
                  {isFetchingRecord ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="animate-spin text-emerald-500 mb-3" size={40} />
                      <p className="text-slate-400 font-medium text-sm">Loading prescription details…</p>
                    </div>
                  ) : selectedRecord ? (
                    <div className={`flex flex-col ${selectedRecord.imageUrl ? 'lg:flex-row' : ''} gap-8`}>
                      {selectedRecord.imageUrl && (
                        <div className="w-full lg:w-1/2 flex flex-col gap-3">
                          <h3 className="text-base font-bold text-slate-900">Original Prescription</h3>
                          <div className="relative w-full rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex-1 min-h-[400px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={selectedRecord.imageUrl} alt="Prescription" className="absolute inset-0 w-full h-full object-contain p-2" />
                          </div>
                        </div>
                      )}
                      <div className={`w-full ${selectedRecord.imageUrl ? 'lg:w-1/2' : ''} flex flex-col gap-3`}>
                        <h3 className="text-base font-bold text-slate-900">Extracted Details</h3>
                        <div className="prose prose-sm prose-slate max-w-none bg-slate-50 border border-slate-200 p-6 rounded-2xl flex-1">
                          <Markdown>{selectedRecord.details}</Markdown>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                      <AlertCircle size={40} className="mb-3 opacity-50" />
                      <p className="font-medium">Could not load prescription data.</p>
                    </div>
                  )}
                </div>

                <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end shrink-0">
                  <button onClick={() => setIsModalOpen(false)}
                    className="px-7 py-2.5 bg-emerald-900 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors text-sm">
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
