'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, Menu, X, Loader2, Plus, Search,
  Edit2, Trash2, Eye, Building2, ChevronLeft, ChevronRight,
  Phone, MapPin, CalendarDays, Droplets, AlertCircle,
  CheckCircle2, UserCircle2, LogOut, Activity,
  UserPlus, ArrowUpRight, Upload, Download, FileText,
  XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface Patient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  blood_group: string | null;
  phone_number: string | null;
  address: string | null;
  emergency_contact: string | null;
  created_at: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

type FormData = {
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  phone_number: string;
  address: string;
  emergency_contact: string;
};

interface BulkSuccessRow { row: number; email: string; name: string; }
interface BulkFailedRow  { row: number; email: string; error: string; }
interface BulkResult {
  total_rows: number;
  success_count: number;
  failure_count: number;
  successful: BulkSuccessRow[];
  failed: BulkFailedRow[];
}

const EMPTY_FORM: FormData = {
  email: '', first_name: '', last_name: '', date_of_birth: '',
  gender: '', blood_group: '', phone_number: '', address: '', emergency_contact: '',
};

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Users,           label: 'My Employees', id: 'patients' },
];

const CSV_TEMPLATE_HEADER = 'email,first_name,last_name,date_of_birth,gender,blood_group,phone_number,address,emergency_contact';
const CSV_TEMPLATE_EXAMPLE = 'alex@corp.com,Alex,Smith,1990-04-12,MALE,A+,+12345678,123 West Street,John: 555';

/* ─── Auth helper ────────────────────────────────────────────────────────────── */

async function getAuthHeaders(includeContentType = true): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.access_token ?? ''}`,
    'ngrok-skip-browser-warning': 'true',
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function initials(p: Patient) {
  return `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase();
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function downloadCSVTemplate() {
  const content = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}`;
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employee_bulk_upload_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Bulk Upload Modal ──────────────────────────────────────────────────────── */

function BulkUploadModal({ onClose, onComplete }: {
  onClose: () => void;
  onComplete: (count: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState('');
  const [showFailed, setShowFailed] = useState(true);
  const [showSuccessful, setShowSuccessful] = useState(false);

  const handleFile = (f: File) => {
    if (f.type !== 'text/csv' && !f.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File size must be under 50 MB.');
      return;
    }
    setError('');
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError('');
    try {
      const headers = await getAuthHeaders(false);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/patients/bulk`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        // 422 = every row failed validation. Render the failed rows instead of a bare error.
        if (res.status === 422 && json.errors) {
          setResult({
            total_rows: json.errors.length,
            success_count: 0,
            failure_count: json.errors.length,
            successful: [],
            failed: json.errors
          });
          return;
        }
        setError(json?.detail ?? json?.message ?? 'Upload failed. Please try again.');
        return;
      }
      setResult(json.data);
      if (json.data.success_count > 0) {
        onComplete(json.data.success_count);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-6 pb-5 bg-emerald-950 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest mb-0.5">Bulk Upload</p>
              <h2 className="font-extrabold text-white text-xl">Import Employees via CSV</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">CSV Template</p>
                <p className="text-xs text-slate-500">Download and fill in your employee data</p>
              </div>
            </div>
            <button onClick={downloadCSVTemplate}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shrink-0">
              <Download size={13} /> Download
            </button>
          </div>

          {/* Required columns info */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">CSV Columns</p>
            <div className="flex flex-wrap gap-2">
              {['email *', 'first_name *', 'last_name *', 'date_of_birth', 'gender', 'blood_group', 'phone_number', 'address', 'emergency_contact'].map(col => (
                <span key={col} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${col.endsWith('*') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {col}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400"><span className="text-emerald-600 font-bold">Green</span> = required · <code className="bg-slate-200 px-1 rounded text-slate-600">date_of_birth</code> format: YYYY-MM-DD · gender: MALE / FEMALE / OTHER</p>
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50'
                  : file
                    ? 'border-emerald-400 bg-emerald-50/60'
                    : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40'
              }`}>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm truncate max-w-[260px]">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Upload size={20} className="text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm mb-1">Drop your CSV here, or click to browse</p>
                  <p className="text-xs text-slate-400">Accepts .csv files up to 5 MB</p>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-2xl font-black text-slate-800">{result.total_rows}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Total Rows</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-2xl font-black text-emerald-700">{result.success_count}</p>
                  <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wide mt-0.5">Imported</p>
                </div>
                <div className={`p-4 rounded-2xl text-center ${result.failure_count > 0 ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'}`}>
                  <p className={`text-2xl font-black ${result.failure_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>{result.failure_count}</p>
                  <p className={`text-[11px] font-bold uppercase tracking-wide mt-0.5 ${result.failure_count > 0 ? 'text-red-400' : 'text-slate-400'}`}>Failed</p>
                </div>
              </div>

              {/* Failed rows */}
              {result.failed.length > 0 && (
                <div className="border border-red-100 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setShowFailed(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <XCircle size={15} className="text-red-500" />
                      <span className="text-sm font-bold text-red-700">{result.failed.length} Failed Row{result.failed.length !== 1 ? 's' : ''}</span>
                    </div>
                    {showFailed ? <ChevronUp size={15} className="text-red-400" /> : <ChevronDown size={15} className="text-red-400" />}
                  </button>
                  {showFailed && (
                    <div className="divide-y divide-red-50 max-h-48 overflow-y-auto">
                      {result.failed.map(row => (
                        <div key={row.row} className="px-4 py-3 bg-white flex items-start gap-3">
                          <span className="text-[10px] font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-md shrink-0 mt-0.5">Row {row.row}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{row.email}</p>
                            <p className="text-xs text-red-500 mt-0.5 leading-snug">{row.error}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Successful rows */}
              {result.successful.length > 0 && (
                <div className="border border-emerald-100 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setShowSuccessful(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-700">{result.successful.length} Imported Successfully</span>
                    </div>
                    {showSuccessful ? <ChevronUp size={15} className="text-emerald-400" /> : <ChevronDown size={15} className="text-emerald-400" />}
                  </button>
                  {showSuccessful && (
                    <div className="divide-y divide-emerald-50 max-h-48 overflow-y-auto">
                      {result.successful.map(row => (
                        <div key={row.row} className="px-4 py-3 bg-white flex items-center gap-3">
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">Row {row.row}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700">{row.name}</p>
                            <p className="text-[11px] text-slate-400">{row.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
          {result ? (
            <>
              <button onClick={reset}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                <Upload size={15} /> Upload Another
              </button>
              <button onClick={onClose}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white bg-emerald-900 hover:bg-emerald-800 transition-colors">
                Done
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleUpload} disabled={!file || isUploading}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white bg-emerald-900 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {isUploading ? 'Uploading…' : 'Upload & Import'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Add / Edit Modal ──────────────────────────────────────────────────────── */

function PatientModal({ mode, patient, onClose, onSaved }: {
  mode: 'add' | 'edit'; patient?: Patient; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(
    mode === 'edit' && patient ? {
      email: '', first_name: patient.first_name, last_name: patient.last_name,
      date_of_birth: patient.date_of_birth ?? '', gender: patient.gender ?? '',
      blood_group: patient.blood_group ?? '', phone_number: patient.phone_number ?? '',
      address: patient.address ?? '', emergency_contact: patient.emergency_contact ?? '',
    } : EMPTY_FORM
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setError('');
    try {
      const headers = await getAuthHeaders();
      const body: Record<string, string> = {};
      (Object.keys(form) as (keyof FormData)[]).forEach(k => { if (form[k]) body[k] = form[k]; });
      const url = mode === 'add'
        ? `${BACKEND_URL}/api/v1/partners/patients`
        : `${BACKEND_URL}/api/v1/partners/patients/${patient!.id}`;
      const res = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PATCH',
        headers, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.detail ?? json?.message ?? 'Something went wrong.'); return; }
      onSaved();
    } catch { setError('Network error. Please try again.'); }
    finally { setIsSaving(false); }
  };

  const textFields: { key: keyof FormData; label: string; type?: string; placeholder?: string; required?: boolean; span?: boolean }[] = [
    ...(mode === 'add' ? [{ key: 'email' as const, label: 'Email', type: 'email', placeholder: 'patient@email.com', required: true, span: true }] : []),
    { key: 'first_name', label: 'First Name', placeholder: 'John', required: true },
    { key: 'last_name',  label: 'Last Name',  placeholder: 'Doe',  required: true },
    { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
    { key: 'phone_number',  label: 'Phone', placeholder: '+91 9876543210' },
    { key: 'blood_group',   label: 'Blood Group', placeholder: 'A+' },
    { key: 'address',       label: 'Address', placeholder: '123, Main St', span: true },
    { key: 'emergency_contact', label: 'Emergency Contact', placeholder: '+91 9876543210' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-5 bg-emerald-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest mb-0.5">{mode === 'add' ? 'New Employee' : 'Edit Employee'}</p>
              <h2 className="font-extrabold text-white text-xl">{mode === 'add' ? 'Add an Employee' : `${patient?.first_name} ${patient?.last_name}`}</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {textFields.map(f => (
              <div key={f.key} className={f.span ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {f.label} {f.required && <span className="text-emerald-600">*</span>}
                </label>
                <input type={f.type ?? 'text'} placeholder={f.placeholder} required={f.required}
                  value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors">
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={isSaving}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white bg-emerald-900 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {mode === 'add' ? 'Create Employee' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Delete Confirm ────────────────────────────────────────────────────────── */

function DeleteConfirm({ patient, onClose, onDeleted }: {
  patient: Patient; onClose: () => void; onDeleted: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true); setError('');
    try {
      const headers = await getAuthHeaders(false);
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/patients/${patient.id}`, {
        method: 'DELETE', headers,
      });
      if (res.status === 204 || res.ok) { onDeleted(); }
      else { const j = await res.json().catch(() => ({})); setError(j?.detail ?? 'Failed to delete.'); }
    } catch { setError('Network error.'); }
    finally { setIsDeleting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <Trash2 size={26} className="text-red-500" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-xl mb-2">Delete Employee?</h3>
        <p className="text-slate-500 text-sm mb-1">
          This will permanently remove <span className="font-bold text-slate-800">{patient.first_name} {patient.last_name}</span> and their login account.
        </p>
        <p className="text-xs text-red-500 font-semibold mb-6">This cannot be undone.</p>
        {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={isDeleting}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Patient Detail Panel ──────────────────────────────────────────────────── */

function PatientPanel({ patient, onClose, onEdit }: {
  patient: Patient; onClose: () => void; onEdit: () => void;
}) {
  const rows = [
    { label: 'Date of Birth',     value: fmtDate(patient.date_of_birth), icon: <CalendarDays size={14} /> },
    { label: 'Gender',            value: patient.gender ?? '—',          icon: <UserCircle2 size={14} /> },
    { label: 'Blood Group',       value: patient.blood_group ?? '—',     icon: <Droplets size={14} /> },
    { label: 'Phone',             value: patient.phone_number ?? '—',    icon: <Phone size={14} /> },
    { label: 'Address',           value: patient.address ?? '—',         icon: <MapPin size={14} /> },
    { label: 'Emergency Contact', value: patient.emergency_contact ?? '—', icon: <Phone size={14} /> },
    { label: 'Registered',        value: fmtDate(patient.created_at),    icon: <CalendarDays size={14} /> },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-emerald-950/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="h-full w-full max-w-sm bg-white shadow-2xl flex flex-col">
        <div className="px-6 pt-6 pb-5 bg-emerald-950 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                {initials(patient)}
              </div>
              <div>
                <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest">Patient</p>
                <h2 className="font-extrabold text-white text-lg leading-tight">{patient.first_name} {patient.last_name}</h2>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {rows.map(r => (
            <div key={r.label} className="flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-emerald-600 mt-0.5 shrink-0">{r.icon}</span>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{r.label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{r.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-slate-100 shrink-0">
          <button onClick={onEdit}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-900 text-white hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <Edit2 size={14} /> Edit Employee
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Portal ────────────────────────────────────────────────────────────── */

function PartnerContent() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /* ── Patient state ── */
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [allPatients, setAllPatients]   = useState<Patient[]>([]);
  const [meta, setMeta]                 = useState<PaginationMeta | null>(null);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [isLoading, setIsLoading]       = useState(true);

  const [modal, setModal]               = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected]         = useState<Patient | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen]   = useState(false);
  const [isBulkOpen, setIsBulkOpen]     = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const fetchPatients = useCallback(async (pg = 1) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders(false);
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/patients/list?page=${pg}&limit=9`, { headers });
      const json = await res.json();
      if (res.ok && json.success) {
        setPatients(json.data ?? []);
        setMeta(json.meta ?? null);
      }
    } catch { showToast('Failed to load employees.', 'error'); }
    finally { setIsLoading(false); }
  }, []);

  /* Fetch a larger set for dashboard stats */
  const fetchAllPatients = useCallback(async () => {
    try {
      const headers = await getAuthHeaders(false);
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/patients/list?page=1&limit=100`, { headers });
      const json = await res.json();
      if (res.ok && json.success) setAllPatients(json.data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchPatients(page);
    fetchAllPatients();
  }, [page, fetchPatients, fetchAllPatients]);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.phone_number ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const onSaved = (msg: string) => {
    setModal(null); setSelected(null);
    fetchPatients(page); fetchAllPatients();
    showToast(msg);
  };

  const onDeleted = () => {
    setIsDeleteOpen(false); setIsPanelOpen(false); setSelected(null);
    fetchPatients(page); fetchAllPatients();
    showToast('Employee deleted.');
  };

  const onBulkComplete = (count: number) => {
    fetchPatients(page); fetchAllPatients();
    showToast(`${count} employee${count !== 1 ? 's' : ''} imported successfully.`);
  };

  /* ── Dashboard stats ── */
  const totalPatients  = meta?.total_items ?? allPatients.length;
  const maleCount      = allPatients.filter(p => p.gender === 'MALE').length;
  const femaleCount    = allPatients.filter(p => p.gender === 'FEMALE').length;
  const recentPatients = [...allPatients].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  /* ── Renderers ── */
  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: 'Total Employees',  value: totalPatients, icon: <Users size={20} />,    color: 'from-emerald-500 to-teal-600' },
          { label: 'Male',            value: maleCount,     icon: <UserCircle2 size={20} />, color: 'from-blue-500 to-indigo-600' },
          { label: 'Female',          value: femaleCount,   icon: <UserCircle2 size={20} />, color: 'from-pink-500 to-rose-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${s.color} flex items-center justify-center text-white shadow-md shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">{s.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent patients + quick action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-lg">Recent Employees</h3>
            <button onClick={() => setActiveTab('patients')}
              className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1">
              View All <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
            ) : recentPatients.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No employees yet.</div>
            ) : recentPatients.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                  {initials(p)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-slate-400 font-medium">{p.phone_number ?? 'No phone'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.gender && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{p.gender}</span>
                  )}
                  <p className="text-xs text-slate-400">{fmtDate(p.created_at)}</p>
                </div>
                <button onClick={() => { setSelected(p); setIsPanelOpen(true); }}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                  <Eye size={15} />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-emerald-950 rounded-3xl p-7 shadow-xl relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute top-0 right-0 w-40 h-40 bg-teal-400/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="relative flex-1 flex flex-col">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 mb-5 w-fit">
              <Activity size={12} className="text-emerald-400" />
              <span className="text-emerald-200 text-[11px] font-bold uppercase tracking-wider">Quick Actions</span>
            </div>
            <h3 className="text-white font-extrabold text-xl mb-2 leading-tight">Manage Your Employees</h3>
            <p className="text-emerald-300/60 text-sm mb-8 leading-relaxed">Add employees one by one or import your entire team at once via CSV.</p>
            <div className="space-y-3 mt-auto">
              <button onClick={() => { setSelected(null); setModal('add'); }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white text-emerald-950 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 shadow-md">
                <UserPlus size={15} /> Add New Employee
              </button>
              <button onClick={() => setIsBulkOpen(true)}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-700/60 border border-emerald-600/40 text-white hover:bg-emerald-700/80 transition-colors flex items-center justify-center gap-2">
                <Upload size={15} /> Bulk Upload via CSV
              </button>
              <button onClick={() => setActiveTab('patients')}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                <Users size={15} /> View All Employees
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm" />
        </div>
        <button onClick={() => setIsBulkOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 hover:border-emerald-300 transition-colors shadow-sm shrink-0">
          <Upload size={16} className="text-emerald-600" /> Bulk Upload
        </button>
        <button onClick={() => { setSelected(null); setModal('add'); }}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm shrink-0">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950 flex items-center justify-center shadow-lg">
              <Loader2 size={24} className="animate-spin text-emerald-400" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Loading employees…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6">
            <Users size={36} className="text-slate-300" />
          </div>
          <p className="font-extrabold text-slate-700 text-xl mb-2">{search ? 'No results found' : 'No employees yet'}</p>
          <p className="text-slate-400 text-sm max-w-xs mb-6">{search ? 'Try a different name or phone.' : 'Add employees one by one or import your team via CSV.'}</p>
          {!search && (
            <button onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm">
              <Upload size={16} /> Bulk Upload CSV
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
              <div className="h-1.5 w-full bg-linear-to-r from-emerald-500 to-teal-400" />
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-sm">
                    {initials(p)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-900 text-base truncate">{p.first_name} {p.last_name}</p>
                    {p.phone_number && <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{p.phone_number}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {p.gender && <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">{p.gender}</span>}
                  {p.blood_group && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-500 flex items-center gap-1">
                      <Droplets size={10} />{p.blood_group}
                    </span>
                  )}
                  {p.date_of_birth && <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-500">{fmtDate(p.date_of_birth)}</span>}
                </div>
                <div className="mt-auto flex gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => { setSelected(p); setIsPanelOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                    <Eye size={13} /> View
                  </button>
                  <button onClick={() => { setSelected(p); setModal('edit'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <Edit2 size={13} /> Edit
                  </button>
                  <button onClick={() => { setSelected(p); setIsDeleteOpen(true); }}
                    className="flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.total_pages > 1 && !search && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!meta.has_prev}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: meta.total_pages }, (_, i) => i + 1).map(pg => (
            <button key={pg} onClick={() => setPage(pg)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${pg === page ? 'bg-emerald-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {pg}
            </button>
          ))}
          <button onClick={() => setPage(p => p + 1)} disabled={!meta.has_next}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-100 flex bg-[#f8fafc] text-slate-900 overflow-hidden">

      {/* ── Sidebar overlay (mobile) ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-40 lg:hidden" />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-emerald-950 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Building2 size={16} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Partner Portal</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          <p className="px-3 text-[10px] font-bold text-emerald-500/50 uppercase tracking-wider mb-3">Menu</p>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-left ${isActive ? 'bg-emerald-900/50 text-white border border-white/5 shadow-inner' : 'hover:bg-white/5 hover:text-white'}`}>
                <item.icon size={18} className={`shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                {item.label}
                {item.id === 'patients' && meta && (
                  <span className="ml-auto text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                    {meta.total_items}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-3 pb-5 shrink-0 border-t border-white/10 pt-4">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-6 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 capitalize">
                {activeTab === 'dashboard' ? 'Dashboard' : 'My Employees'}
              </h1>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                {activeTab === 'dashboard' ? 'Overview of your employee base' : 'Manage corporate employee records'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'patients' && (
              <>
                <button onClick={() => setIsBulkOpen(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 hover:border-emerald-300 transition-colors shadow-sm">
                  <Upload size={13} className="text-emerald-600" /> Bulk Upload
                </button>
                <button onClick={() => { setSelected(null); setModal('add'); }}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-900 text-white rounded-xl font-bold text-xs hover:bg-emerald-800 transition-colors shadow-sm">
                  <Plus size={14} /> Add Employee
                </button>
              </>
            )}
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Building2 size={16} className="text-emerald-700" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'patients'  && renderPatients()}
        </main>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {isBulkOpen && (
          <BulkUploadModal key="bulk"
            onClose={() => setIsBulkOpen(false)}
            onComplete={onBulkComplete} />
        )}
        {modal && (
          <PatientModal key="modal" mode={modal} patient={selected ?? undefined}
            onClose={() => { setModal(null); setSelected(null); }}
            onSaved={() => onSaved(modal === 'add' ? 'Employee created successfully.' : 'Employee updated.')} />
        )}
        {isDeleteOpen && selected && (
          <DeleteConfirm key="delete" patient={selected}
            onClose={() => { setIsDeleteOpen(false); setSelected(null); }} onDeleted={onDeleted} />
        )}
        {isPanelOpen && selected && (
          <PatientPanel key="panel" patient={selected}
            onClose={() => { setIsPanelOpen(false); setSelected(null); }}
            onEdit={() => { setIsPanelOpen(false); setModal('edit'); }} />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div key="toast" initial={{ opacity: 0, y: 24, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 24, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl font-semibold text-sm"
            style={{ background: toast.type === 'success' ? '#022c22' : '#7f1d1d', color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5' }}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PartnerPortalPage() {
  return (
    <ProtectedRoute requiredRole="PARTNER">
      <PartnerContent />
    </ProtectedRoute>
  );
}
