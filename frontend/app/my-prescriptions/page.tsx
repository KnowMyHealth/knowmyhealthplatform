'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  ExternalLink,
  Video,
  MapPin,
  HeartPulse,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface Consultation {
  id: string;
  doctor_id: string;
  status: string;
  consultation_type: 'ONLINE' | 'OFFLINE';
  scheduled_at: string;
  prescription_url: string | null;
  notes: string | null;
}

interface DoctorInfo {
  first_name: string;
  last_name: string;
  specialization: string;
  avatar_url: string | null;
}

type DoctorMap = Record<string, DoctorInfo>;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/* ─── Prescription Card ────────────────────────────────────────────────────── */

function PrescriptionCard({
  consultation,
  doctor,
  index,
}: {
  consultation: Consultation;
  doctor: DoctorInfo | undefined;
  index: number;
}) {
  const firstName = doctor?.first_name ?? 'Unknown';
  const lastName = doctor?.last_name ?? 'Doctor';
  const specialization = doctor?.specialization ?? 'Specialist';
  const initials = getInitials(firstName, lastName);
  const hasPrescription = Boolean(consultation.prescription_url);
  const isVideo = consultation.consultation_type === 'ONLINE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative flex flex-col rounded-3xl overflow-hidden border border-slate-200/80 bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.07)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.13)] transition-shadow duration-300 group"
    >
      {/* Card top strip — avatar + status badge */}
      <div className="bg-gradient-to-b from-emerald-50 to-white px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          {/* Doctor avatar */}
          <div className="flex items-center gap-4">
            {doctor?.avatar_url ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm border border-slate-100 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doctor.avatar_url}
                  alt={`Dr. ${firstName} ${lastName}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                <span className="text-white font-extrabold text-lg tracking-tight">
                  {initials}
                </span>
              </div>
            )}
            <div>
              <p className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-emerald-900 transition-colors">
                Dr. {firstName} {lastName}
              </p>
              <p className="text-emerald-600 font-bold text-xs mt-0.5">{specialization}</p>
            </div>
          </div>

          {/* Rx badge */}
          {hasPrescription ? (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200/60">
              <FileText size={11} />
              Rx Ready
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold border border-slate-200/60">
              <FileText size={11} />
              Awaiting Rx
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-slate-100" />

      {/* Card body */}
      <div className="px-6 py-5 flex-1 flex flex-col gap-4">
        {/* Consult type + date row */}
        <div className="flex items-center justify-between">
          {isVideo ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              <Video size={11} />
              Video Consult
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
              <MapPin size={11} />
              In-Clinic Visit
            </span>
          )}
          <p className="text-slate-400 text-xs font-semibold">
            {formatDate(consultation.scheduled_at)}
          </p>
        </div>

        {/* Notes preview if present */}
        {consultation.notes && (
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
            {consultation.notes}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        {hasPrescription ? (
          <a
            href={consultation.prescription_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-900 text-white hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 group/btn shadow-[0_8px_24px_-8px_rgba(2,44,34,0.35)] hover:shadow-[0_12px_28px_-8px_rgba(2,44,34,0.45)]"
          >
            <FileText size={15} />
            View Prescription
            <ExternalLink size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </a>
        ) : (
          <div className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-slate-50 text-slate-400 flex items-center justify-center gap-2 border border-slate-200/60 cursor-default select-none">
            <FileText size={15} />
            Awaiting Prescription
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Empty State ──────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-32 text-center px-6"
    >
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_16px_40px_-10px_rgba(5,150,105,0.4)] mb-8">
        <FileText size={40} className="text-white" strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
        No prescriptions yet
      </h3>
      <p className="text-slate-500 max-w-sm leading-relaxed mb-8">
        Prescriptions from completed consultations will appear here. Book a consultation
        to get started.
      </p>
      <Link
        href="/consultations"
        className="group inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-900 text-white rounded-full font-bold text-sm hover:bg-emerald-800 transition-colors shadow-[0_8px_24px_-8px_rgba(2,44,34,0.4)]"
      >
        Book a Consultation
        <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function MyPrescriptionsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [doctorMap, setDoctorMap] = useState<DoctorMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          'ngrok-skip-browser-warning': 'true',
        };

        const [consRes, docsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/v1/consultations/me`, { headers }),
          fetch(`${BACKEND_URL}/api/v1/doctors/approved?limit=100`, { headers }),
        ]);

        // Build doctor map
        if (docsRes.ok) {
          const docsJson = await docsRes.json();
          const items: any[] = Array.isArray(docsJson.data)
            ? docsJson.data
            : (docsJson.data?.items ?? []);
          const map: DoctorMap = {};
          items.forEach((d: any) => {
            map[d.id] = {
              first_name: d.first_name,
              last_name: d.last_name,
              specialization: d.specialization,
              avatar_url: d.avatar_url ?? null,
            };
          });
          setDoctorMap(map);
        }

        // Filter completed consultations, sort newest first
        if (consRes.ok) {
          const consJson = await consRes.json();
          const raw: any[] = consJson.data ?? [];
          const completed = raw
            .filter((c: any) => c.status === 'COMPLETED')
            .sort(
              (a: any, b: any) =>
                new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
            );
          setConsultations(completed);
        }
      } catch (e) {
        console.error('Failed to load prescriptions', e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="flex flex-col w-full min-h-screen">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="py-24 bg-emerald-950 relative overflow-hidden">
          {/* Dot-grid pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(rgba(167,243,208,0.15) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Radial glow blurs */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[900px] bg-emerald-700/10 blur-[120px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-500/10 blur-[100px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Pill */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/20 mb-6">
                <HeartPulse size={14} className="text-teal-400" />
                <span className="text-sm font-bold tracking-wider text-teal-300 uppercase">
                  Health Records
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-5">
                My{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  Prescriptions
                </span>
              </h1>

              <p className="text-lg text-emerald-300/60 max-w-xl mx-auto leading-relaxed">
                Doctor-issued prescriptions from your completed consultations, all in one
                place.
              </p>
            </motion.div>

            {/* Stat pill */}
            {!isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="mt-10 inline-flex items-center gap-2 px-6 py-3 bg-white/[0.05] border border-white/[0.08] rounded-2xl"
              >
                <FileText size={16} className="text-teal-400" />
                <span className="text-white font-bold tabular-nums">
                  {consultations.length}
                </span>
                <span className="text-emerald-400/60 font-semibold text-sm">
                  prescription{consultations.length !== 1 ? 's' : ''} available
                </span>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── Content ────────────────────────────────────────────────────────── */}
        <section className="flex-1 py-16 bg-slate-50/60 relative overflow-hidden">
          {/* Background glows */}
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-emerald-50 blur-[120px] rounded-full pointer-events-none opacity-50" />
          <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-teal-50 blur-[100px] rounded-full pointer-events-none opacity-50" />

          <div className="max-w-7xl mx-auto px-6 relative">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-center py-32"
              >
                <Loader2 size={40} className="animate-spin text-emerald-600" />
              </motion.div>
            ) : consultations.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {consultations.map((c, i) => (
                  <PrescriptionCard
                    key={c.id}
                    consultation={c}
                    doctor={doctorMap[c.doctor_id]}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
