'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Plus, Search, Edit2, Trash2, Eye, X, Loader2,
  Building2, ChevronLeft, ChevronRight, Phone, MapPin,
  CalendarDays, Droplets, AlertCircle, CheckCircle2, UserCircle2,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

/* ─── Types ────────────────────────────────────────────────────────────────── */

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

const EMPTY_FORM: FormData = {
  email: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  phone_number: '',
  address: '',
  emergency_contact: '',
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function authHeaders() {
  const token = localStorage.getItem('supabase_access_token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
}

function initials(p: Patient) {
  return `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Add / Edit Modal ─────────────────────────────────────────────────────── */

function PatientModal({
  mode,
  patient,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  patient?: Patient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(
    mode === 'edit' && patient
      ? {
          email: '',
          first_name: patient.first_name,
          last_name: patient.last_name,
          date_of_birth: patient.date_of_birth ?? '',
          gender: patient.gender ?? '',
          blood_group: patient.blood_group ?? '',
          phone_number: patient.phone_number ?? '',
          address: patient.address ?? '',
          emergency_contact: patient.emergency_contact ?? '',
        }
      : EMPTY_FORM
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const body: Record<string, string> = {};
      (Object.keys(form) as (keyof FormData)[]).forEach(k => {
        if (form[k]) body[k] = form[k];
      });

      const url =
        mode === 'add'
          ? `${BACKEND_URL}/api/v1/partners/patients`
          : `${BACKEND_URL}/api/v1/partners/patients/${patient!.id}`;

      const res = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.detail ?? json?.message ?? 'Something went wrong.');
        return;
      }
      onSaved();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const fields: { key: keyof FormData; label: string; type?: string; placeholder?: string; required?: boolean }[] = [
    ...(mode === 'add' ? [{ key: 'email' as const, label: 'Email', type: 'email', placeholder: 'patient@email.com', required: true }] : []),
    { key: 'first_name', label: 'First Name', placeholder: 'John', required: true },
    { key: 'last_name', label: 'Last Name', placeholder: 'Doe', required: true },
    { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
    { key: 'phone_number', label: 'Phone Number', placeholder: '+91 9876543210' },
    { key: 'blood_group', label: 'Blood Group', placeholder: 'A+' },
    { key: 'address', label: 'Address', placeholder: '123, Main St, City' },
    { key: 'emergency_contact', label: 'Emergency Contact', placeholder: '+91 9876543210' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 bg-emerald-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest mb-0.5">
                {mode === 'add' ? 'New Patient' : 'Edit Patient'}
              </p>
              <h2 className="font-extrabold text-white text-xl">
                {mode === 'add' ? 'Add a Patient' : `${patient?.first_name} ${patient?.last_name}`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key} className={f.key === 'address' || f.key === 'email' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {f.label} {f.required && <span className="text-emerald-600">*</span>}
                </label>
                <input
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  required={f.required}
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                />
              </div>
            ))}

            {/* Gender select */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white bg-emerald-900 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
              {mode === 'add' ? 'Create Patient' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Delete Confirm ───────────────────────────────────────────────────────── */

function DeleteConfirm({
  patient,
  onClose,
  onDeleted,
}: {
  patient: Patient;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/patients/${patient.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 204 || res.ok) {
        onDeleted();
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json?.detail ?? 'Failed to delete patient.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <Trash2 size={26} className="text-red-500" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-xl mb-2">Delete Patient?</h3>
        <p className="text-slate-500 text-sm mb-1">
          This will permanently remove{' '}
          <span className="font-bold text-slate-800">{patient.first_name} {patient.last_name}</span>{' '}
          and delete their login account.
        </p>
        <p className="text-xs text-red-500 font-semibold mb-6">This action cannot be undone.</p>
        {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Patient Detail Panel ─────────────────────────────────────────────────── */

function PatientPanel({
  patient,
  onClose,
  onEdit,
}: {
  patient: Patient;
  onClose: () => void;
  onEdit: () => void;
}) {
  const rows: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'Date of Birth', value: formatDate(patient.date_of_birth), icon: <CalendarDays size={14} /> },
    { label: 'Gender', value: patient.gender ?? '—', icon: <UserCircle2 size={14} /> },
    { label: 'Blood Group', value: patient.blood_group ?? '—', icon: <Droplets size={14} /> },
    { label: 'Phone', value: patient.phone_number ?? '—', icon: <Phone size={14} /> },
    { label: 'Address', value: patient.address ?? '—', icon: <MapPin size={14} /> },
    { label: 'Emergency Contact', value: patient.emergency_contact ?? '—', icon: <Phone size={14} /> },
    { label: 'Registered', value: formatDate(patient.created_at), icon: <CalendarDays size={14} /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-emerald-950/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="h-full w-full max-w-sm bg-white shadow-2xl flex flex-col"
      >
        <div className="px-6 pt-6 pb-5 bg-emerald-950 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                {initials(patient)}
              </div>
              <div>
                <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest">Patient</p>
                <h2 className="font-extrabold text-white text-lg leading-tight">{patient.first_name} {patient.last_name}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
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
          <button
            onClick={onEdit}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-900 text-white hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Edit2 size={14} />
            Edit Patient
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */

function PartnerContent() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPatients = useCallback(async (pg = 1) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/v1/partners/patients/list?page=${pg}&limit=9`,
        { headers: authHeaders() }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setPatients(json.data ?? []);
        setMeta(json.meta ?? null);
      }
    } catch {
      showToast('Failed to load patients.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(page); }, [page, fetchPatients]);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.phone_number ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const onSaved = (msg: string) => {
    setModal(null);
    setSelectedPatient(null);
    fetchPatients(page);
    showToast(msg);
  };

  const onDeleted = () => {
    setIsDeleteOpen(false);
    setIsPanelOpen(false);
    setSelectedPatient(null);
    fetchPatients(page);
    showToast('Patient deleted.');
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-emerald-950 overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(167,243,208,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-400/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-emerald-900/60 border border-emerald-700/50 rounded-full px-4 py-2 mb-6">
              <Building2 size={14} className="text-emerald-400" />
              <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Partner Portal</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
                  Patient{' '}
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                    Management
                  </span>
                </h1>
                <p className="text-emerald-300/70 text-lg">Add, manage, and monitor all your corporate patients.</p>
              </div>
              {!isLoading && meta && (
                <div className="flex items-center gap-3">
                  <div className="px-5 py-3 bg-white/[0.07] border border-white/10 rounded-2xl text-center">
                    <p className="text-2xl font-extrabold text-white">{meta.total_items}</p>
                    <p className="text-emerald-400/60 text-xs font-semibold mt-0.5">Total Patients</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients by name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
            />
          </div>
          <button
            onClick={() => { setSelectedPatient(null); setModal('add'); }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm shrink-0"
          >
            <Plus size={16} />
            Add Patient
          </button>
        </motion.div>

        {/* Patient Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950 flex items-center justify-center shadow-lg">
                <Loader2 size={24} className="animate-spin text-emerald-400" />
              </div>
              <p className="text-slate-400 text-sm font-medium">Loading patients…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6">
              <Users size={36} className="text-slate-300" />
            </div>
            <p className="font-extrabold text-slate-700 text-xl mb-2">
              {search ? 'No patients match your search' : 'No patients yet'}
            </p>
            <p className="text-slate-400 text-sm max-w-xs">
              {search ? 'Try a different name or phone number.' : 'Click "Add Patient" to register your first corporate patient.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
              >
                {/* Card header strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />

                <div className="p-5 flex flex-col flex-1">
                  {/* Doctor info row */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-sm">
                      {initials(p)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-900 text-base truncate">
                        {p.first_name} {p.last_name}
                      </p>
                      {p.phone_number && (
                        <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{p.phone_number}</p>
                      )}
                    </div>
                  </div>

                  {/* Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {p.gender && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">
                        {p.gender}
                      </span>
                    )}
                    {p.blood_group && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-500 flex items-center gap-1">
                        <Droplets size={10} />{p.blood_group}
                      </span>
                    )}
                    {p.date_of_birth && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-500">
                        {formatDate(p.date_of_birth)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => { setSelectedPatient(p); setIsPanelOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      onClick={() => { setSelectedPatient(p); setModal('edit'); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => { setSelectedPatient(p); setIsDeleteOpen(true); }}
                      className="flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                    >
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
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!meta.has_prev}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: meta.total_pages }, (_, i) => i + 1).map(pg => (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                  pg === page
                    ? 'bg-emerald-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!meta.has_next}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </section>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <PatientModal
            key="patient-modal"
            mode={modal}
            patient={selectedPatient ?? undefined}
            onClose={() => { setModal(null); setSelectedPatient(null); }}
            onSaved={() => onSaved(modal === 'add' ? 'Patient created successfully.' : 'Patient updated.')}
          />
        )}
        {isDeleteOpen && selectedPatient && (
          <DeleteConfirm
            key="delete-confirm"
            patient={selectedPatient}
            onClose={() => { setIsDeleteOpen(false); setSelectedPatient(null); }}
            onDeleted={onDeleted}
          />
        )}
        {isPanelOpen && selectedPatient && (
          <PatientPanel
            key="patient-panel"
            patient={selectedPatient}
            onClose={() => { setIsPanelOpen(false); setSelectedPatient(null); }}
            onEdit={() => { setIsPanelOpen(false); setModal('edit'); }}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 24, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 24, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl font-semibold text-sm"
            style={{
              background: toast.type === 'success' ? '#022c22' : '#7f1d1d',
              color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5',
            }}
          >
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
