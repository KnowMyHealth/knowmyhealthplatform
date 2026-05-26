'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, Stethoscope, Building2,
  Settings, Menu, X, CheckCircle2, XCircle,
  TrendingUp, LogOut, Sparkles, Activity, CalendarDays,
  ShieldCheck, MapPin, Mail, Clock, FileText, Loader2, ArrowUpRight,
  ExternalLink, Briefcase, DollarSign, ChevronLeft, ChevronRight, ChevronDown, Ticket,
  Microscope, Plus, Trash2, AlertCircle, BookOpen, PenTool, Wand2, Tag,
  Image as ImageIcon, UploadCloud, Eye, Search, Handshake, Globe, Phone,
  HeartPulse, Pencil, Save, ToggleLeft, ToggleRight, PhoneCall, Copy, ClipboardList, Video
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import Markdown from 'react-markdown';
import dynamic from 'next/dynamic';

// --- DYNAMICALLY IMPORT MD EDITOR TO AVOID SSR ISSUES ---
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

// --- TYPES ---
interface DoctorListItem {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  status: string;
  created_at: string;
}

interface DoctorDetails extends DoctorListItem {
  email: string;
  bio: string;
  license_id: string;
  license_url: string;
  consultation_fee: number;
  years_of_experience: number;
  user_id: string | null;
}

interface LabCategory {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface LabTest {
  id: string;
  name: string;
  category_id: string;
  category?: { id: string; name: string };
  organization: string;
  results_in: number;
  price: number;
  discount_percentage: number;
  is_active: boolean;
  clinic_address?: string;
  clinic_open_time?: string;
  clinic_close_time?: string;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  status: 'Published' | 'Draft';
  excerpt: string;
  content: string;
  imageUrl: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  category_id: string | null;
  lab_test_id: string | null;
  is_active: boolean;
  valid_until: string | null;
}

interface PatientObject {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  phone_number: string;
  address: string;
  emergency_contact: string;
  created_at: string;
}

interface HealthPackage {
  id: string;
  title: string;
  organization: string;
  description: string | null;
  price: number;
  discount_percentage: number;
  included_tests: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CallbackRequest {
  id: string;
  name: string;
  phone: string;
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PartnerApplication {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  partner_type: 'PHARMACY' | 'LABORATORY' | 'HOSPITAL' | 'CLINIC' | 'OTHER';
  address: string;
  website: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  discount_percentage?: number | null;
  coupon_code?: string | null;
  coupon_id?: string | null;
  coupon_is_active?: boolean;
  created_at: string;
  updated_at: string;
}

// --- MOCK DATA FOR OTHER TABS ---

const mockLabs = [
  { id: 1, name: 'Apollo Diagnostics', location: 'New York, NY', tests: 145, status: 'Active' },
  { id: 2, name: 'Metropolis Healthcare', location: 'San Francisco, CA', tests: 89, status: 'Active' },
];

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Stethoscope, label: 'Doctors', id: 'doctors' },
  { icon: Microscope, label: 'Diagnostic Tests', id: 'lab-tests' },
  { icon: Wand2, label: 'Health Packages', id: 'health-packages' },
  { icon: Ticket, label: 'Coupons', id: 'coupons' },
  { icon: Handshake, label: 'Partners', id: 'partners' },
  { icon: Users, label: 'Patients', id: 'patients' },
  { icon: PhoneCall, label: 'Callbacks', id: 'callbacks' },
  { icon: BookOpen, label: 'Blogs & Insights', id: 'blogs' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

const bookingSubItems = [
  { icon: CalendarDays, label: 'All Bookings', id: 'all' },
  { icon: Microscope, label: 'Test Bookings', id: 'test-bookings' },
  { icon: HeartPulse, label: 'Package Bookings', id: 'package-bookings' },
  { icon: ClipboardList, label: 'Consultations', id: 'consultations' },
];

export default function AdminPortal() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bookingSubTab, setBookingSubTab] = useState<'all' | 'test-bookings' | 'package-bookings' | 'consultations'>('all');
  const [adminName, setAdminName] = useState<string>('Admin');
  const [dashboardMetrics, setDashboardMetrics] = useState<{
    total_patients: { count: number; percentage_change: number; is_positive: boolean };
    active_doctors: { count: number; percentage_change: number; is_positive: boolean };
    partner_labs: { count: number; percentage_change: number; is_positive: boolean };
    pending_verifications: { count: number; percentage_change: number; is_positive: boolean };
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { logout } = useAuth();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  const showToast = (type: 'success' | 'error', text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg({ type, text });
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 4000);
  };

  // Doctor States
  const [allDoctors, setAllDoctors] = useState<DoctorListItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDetails | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [doctorActionError, setDoctorActionError] = useState<string | null>(null);

  // Lab Tests States
  const [labCategories, setLabCategories] = useState<LabCategory[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [isLoadingLabTests, setIsLoadingLabTests] = useState(false);
  const [labTab, setLabTab] = useState<'tests' | 'categories' | 'bookings'>('tests');
  const [testCurrentPage, setTestCurrentPage] = useState(1);
  const [testFilterStatus, setTestFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const testsPerPage = 10;
  
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  
  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [testForm, setTestForm] = useState({
    name: '', category_id: '', organization: '', results_in: '',
    price: '', discount_percentage: '', is_active: true,
    clinic_address: '', clinic_open_time: '', clinic_close_time: ''
  });

  // Lab Bookings States
  const [labBookings, setLabBookings] = useState<any[]>([]);
  const [isLoadingLabBookings, setIsLoadingLabBookings] = useState(false);
  const [labBookingPage, setLabBookingPage] = useState(1);
  const [labBookingTotalPages, setLabBookingTotalPages] = useState(1);
  const [labBookingStatusFilter, setLabBookingStatusFilter] = useState<'all' | 'PENDING' | 'PAID' | 'CANCELLED' | 'COMPLETED'>('all');
  const labBookingsPerPage = 10;
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [patientBookings, setPatientBookings] = useState<any[]>([]);
  const [isLoadingPatientBookings, setIsLoadingPatientBookings] = useState(false);

  // Health Package Bookings States
  const [pkgBookings, setPkgBookings] = useState<any[]>([]);
  const [isLoadingPkgBookings, setIsLoadingPkgBookings] = useState(false);
  const [pkgBookingPage, setPkgBookingPage] = useState(1);
  const [pkgBookingTotalPages, setPkgBookingTotalPages] = useState(1);
  const [pkgBookingStatusFilter, setPkgBookingStatusFilter] = useState<'all' | 'PENDING' | 'PAID' | 'CANCELLED' | 'COMPLETED'>('all');
  const pkgBookingsPerPage = 10;
  const [selectedPkgBooking, setSelectedPkgBooking] = useState<any | null>(null);
  const [patientPkgBookings, setPatientPkgBookings] = useState<any[]>([]);
  const [isLoadingPatientPkgBookings, setIsLoadingPatientPkgBookings] = useState(false);

  const [testError, setTestError] = useState<string | null>(null);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [editTestForm, setEditTestForm] = useState({ name: '', category_id: '', organization: '', results_in: '', price: '', discount_percentage: '', is_active: true, clinic_address: '', clinic_open_time: '', clinic_close_time: '' });
  const [editTestError, setEditTestError] = useState<string | null>(null);
  const [isSavingTest, setIsSavingTest] = useState(false);

  // Coupons States
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [couponCurrentPage, setCouponCurrentPage] = useState(1);
  const couponsPerPage = 10;
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState({ code: '', discount_percentage: '', category_id: '', lab_test_id: '', valid_until: '', is_active: true });
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  // Partner approval
  const [approveDiscountPct, setApproveDiscountPct] = useState('');

  // --- BLOGS STATES & LOGIC ---
  const [blogTab, setBlogTab] = useState<'list' | 'write' | 'ai'>('list');
  const [blogsList, setBlogsList] = useState<BlogPost[]>([]);
  const [blogCurrentPage, setBlogCurrentPage] = useState(1);
  const blogsPerPage = 10;
  const [blogToDelete, setBlogToDelete] = useState<string | null>(null);
  
  const [blogForm, setBlogForm] = useState({ id: '', title: '', category: '', readTime: '', excerpt: '', content: '' });
  const [blogImagePreview, setBlogImagePreview] = useState<string | null>(null);
  const [blogImageFile, setBlogImageFile] = useState<File | null>(null);
  
  const [markdownView, setMarkdownView] = useState<'write' | 'preview' | 'split'>('write');
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

  const [aiBlogForm, setAiBlogForm] = useState({ topic: '', tone: 'Professional & Authoritative', audience: 'General Patients', instructions: '' });
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  const [blogSuccess, setBlogSuccess] = useState<string | null>(null);

  // --- PATIENTS STATES ---
  const [patients, setPatients] = useState<PatientObject[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientObject | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isLoadingPatientDetails, setIsLoadingPatientDetails] = useState(false);

  // --- PARTNER APPLICATIONS STATES ---
  const [partnerApplications, setPartnerApplications] = useState<PartnerApplication[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [partnerFilterStatus, setPartnerFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'>('ALL');
  const [partnerCurrentPage, setPartnerCurrentPage] = useState(1);
  const partnersPerPage = 10;
  const [selectedPartner, setSelectedPartner] = useState<PartnerApplication | null>(null);
  const [isPartnerPanelOpen, setIsPartnerPanelOpen] = useState(false);
  const [isUpdatingPartnerStatus, setIsUpdatingPartnerStatus] = useState(false);
  const [isDeletingPartner, setIsDeletingPartner] = useState(false);
  const [confirmDeletePartner, setConfirmDeletePartner] = useState(false);

  // --- CONSULTATIONS STATES ---
  const [consultations, setConsultations] = useState<any[]>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);
  const [consultationPage, setConsultationPage] = useState(1);
  const [consultationTotalPages, setConsultationTotalPages] = useState(1);
  const [consultationStatusFilter, setConsultationStatusFilter] = useState<'all' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('all');
  const consultationsPerPage = 10;
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);
  const [consultationDetail, setConsultationDetail] = useState<any | null>(null);
  const [isLoadingConsultationDetail, setIsLoadingConsultationDetail] = useState(false);

  // --- CALLBACKS STATES ---
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);
  const [isLoadingCallbacks, setIsLoadingCallbacks] = useState(false);
  const [callbackStatusFilter, setCallbackStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'IGNORED'>('ALL');
  const [callbackCurrentPage, setCallbackCurrentPage] = useState(1);
  const callbacksPerPage = 15;
  const [updatingCallbackId, setUpdatingCallbackId] = useState<string | null>(null);
  const [callbackNotes, setCallbackNotes] = useState<Record<string, string>>({});
  const [openNotesId, setOpenNotesId] = useState<string | null>(null);

  // Health Packages states
  const [healthPackages, setHealthPackages] = useState<HealthPackage[]>([]);
  const [isLoadingHealthPackages, setIsLoadingHealthPackages] = useState(false);
  const [hpSearchQuery, setHpSearchQuery] = useState('');
  const [selectedHp, setSelectedHp] = useState<HealthPackage | null>(null);
  const [isHpPanelOpen, setIsHpPanelOpen] = useState(false);
  const [isHpPanelCreate, setIsHpPanelCreate] = useState(false);
  const [isSavingHp, setIsSavingHp] = useState(false);
  const [isDeletingHp, setIsDeletingHp] = useState(false);
  const [confirmDeleteHp, setConfirmDeleteHp] = useState(false);
  const defaultHpForm = { title: '', organization: '', description: '', price: '', discount_percentage: '', included_tests: '' };
  const [hpForm, setHpForm] = useState(defaultHpForm);

  useEffect(() => {
    fetchAdminDetails();
    fetchAllDoctors();
    fetchDashboardMetrics();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'lab-tests') {
      fetchLabCategories();
      fetchLabTests();
    }
    if (activeTab === 'coupons') {
      fetchCoupons();
      fetchLabCategories(); // Used in coupon dropdown for category restrictions
      fetchLabTests();      // Used in coupon dropdown for test restrictions
    }
    if (activeTab === 'blogs') {
      fetchBlogs();
    }
    if (activeTab === 'patients') {
      fetchPatients();
    }
    if (activeTab === 'partners') {
      fetchPartnerApplications();
    }
    if (activeTab === 'callbacks') {
      fetchCallbacks();
    }
    if (activeTab === 'all-bookings') {
      fetchLabBookings(1, labBookingStatusFilter);
      fetchPkgBookings(1, pkgBookingStatusFilter);
      fetchConsultations(1, consultationStatusFilter);
    }
    if (activeTab === 'health-packages') {
      fetchHealthPackages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  useEffect(() => {
    setTestCurrentPage(1);
  }, [testFilterStatus, testSearchQuery]);

  const fetchTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BACKEND_URL}/api/v1/payments?limit=10&page=1`, {
        headers: { Authorization: `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BACKEND_URL}/api/v1/users/admin/dashboard/metrics`, {
        headers: { Authorization: `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      if (res.ok) {
        const json = await res.json();
        setDashboardMetrics(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard metrics', e);
    }
  };

  const fetchAdminDetails = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
          headers: { 
            Authorization: `Bearer ${session.access_token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.full_name) {
            setAdminName(data.data.full_name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch admin details", error);
      }
    }
  };

  const fetchAllDoctors = async () => {
    setIsLoadingDocs(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      let allItems: DoctorListItem[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`${BACKEND_URL}/api/v1/doctors?limit=100&page=${page}`, {
          headers: { 
            Authorization: `Bearer ${session.access_token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json.data) ? json.data : (json.data?.items || []);
          allItems = [...allItems, ...items];
          if (items.length < 100) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }
      setAllDoctors(allItems);
    } catch (error) {
      console.error("Failed to fetch doctors", error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // --- LAB TESTS API FUNCTIONS ---
  const fetchLabCategories = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests/categories`, {
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const json = await res.json();
        setLabCategories(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const fetchLabTests = async () => {
    setIsLoadingLabTests(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      let allItems: LabTest[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests?limit=100&page=${page}`, {
          headers: { 
            Authorization: `Bearer ${session.access_token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json.data) ? json.data : (json.data?.items || []);
          allItems = [...allItems, ...items];
          if (items.length < 100) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }
      setLabTests(allItems);
    } catch (error) {
      console.error("Failed to fetch lab tests", error);
    } finally {
      setIsLoadingLabTests(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests/categories`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(categoryForm)
      });
      if (res.ok) {
        setCategoryForm({ name: '', description: '' });
        setIsAddCategoryOpen(false);
        fetchLabCategories();
      } else {
        const err = await res.json();
        setCategoryError(err.message || 'Failed to create category');
      }
    } catch (error: any) {
      setCategoryError(error.message || 'An unexpected error occurred');
    }
  };

  const executeDeleteCategory = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests/categories/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        setCategoryToDelete(null);
        fetchLabCategories();
        fetchLabTests();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const payload: any = {
        ...testForm,
        results_in: parseInt(testForm.results_in, 10),
        price: parseFloat(testForm.price),
        discount_percentage: parseFloat(testForm.discount_percentage) || 0,
      };
      if (!payload.clinic_address) delete payload.clinic_address;
      if (!payload.clinic_open_time) delete payload.clinic_open_time;
      if (!payload.clinic_close_time) delete payload.clinic_close_time;
      const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setTestForm({ name: '', category_id: '', organization: '', results_in: '', price: '', discount_percentage: '', is_active: true, clinic_address: '', clinic_open_time: '', clinic_close_time: '' });
        setIsAddTestOpen(false);
        fetchLabTests();
      } else {
        const err = await res.json();
        setTestError(err.message || 'Failed to create test');
      }
    } catch (error: any) {
      setTestError(error.message || 'An unexpected error occurred');
    }
  };

  const fetchLabBookings = async (page = 1, status = labBookingStatusFilter) => {
    setIsLoadingLabBookings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const statusParam = status !== 'all' ? `&status=${status}` : '';
      const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests/bookings/list?page=${page}&limit=${labBookingsPerPage}${statusParam}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      const json = await res.json();
      if (json.success) {
        setLabBookings(Array.isArray(json.data) ? json.data : (json.data?.items ?? []));
        setLabBookingTotalPages(json.data?.total_pages ?? 1);
      }
    } catch (e) { console.error('Failed to fetch lab bookings', e); }
    finally { setIsLoadingLabBookings(false); }
  };

  const fetchPatientBookings = async (patientUserId: string) => {
    setIsLoadingPatientBookings(true);
    setPatientBookings([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests/bookings/patient/${patientUserId}?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const json = await res.json();
        setPatientBookings(Array.isArray(json.data) ? json.data : (json.data?.items ?? []));
      }
    } catch (e) { console.error('Failed to fetch patient bookings', e); }
    finally { setIsLoadingPatientBookings(false); }
  };

  const fetchPkgBookings = async (page = 1, status = pkgBookingStatusFilter) => {
    setIsLoadingPkgBookings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const statusParam = status !== 'all' ? `&status=${status}` : '';
      const res = await fetch(`${BACKEND_URL}/api/v1/health-packages/bookings/list?page=${page}&limit=${pkgBookingsPerPage}${statusParam}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const json = await res.json();
        setPkgBookings(Array.isArray(json.data) ? json.data : (json.data?.items ?? []));
        setPkgBookingTotalPages(json.data?.total_pages ?? 1);
      }
    } catch (e) { console.error('Failed to fetch package bookings', e); }
    finally { setIsLoadingPkgBookings(false); }
  };

  const fetchPatientPkgBookings = async (patientUserId: string) => {
    setIsLoadingPatientPkgBookings(true);
    setPatientPkgBookings([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BACKEND_URL}/api/v1/health-packages/bookings/patient/${patientUserId}?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const json = await res.json();
        setPatientPkgBookings(Array.isArray(json.data) ? json.data : (json.data?.items ?? []));
      }
    } catch (e) { console.error('Failed to fetch patient package bookings', e); }
    finally { setIsLoadingPatientPkgBookings(false); }
  };

  const fetchConsultations = async (page = 1, status = consultationStatusFilter) => {
    setIsLoadingConsultations(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const statusParam = status !== 'all' ? `&status=${status}` : '';
      const res = await fetch(`${BACKEND_URL}/api/v1/consultations?page=${page}&limit=${consultationsPerPage}${statusParam}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const json = await res.json();
        setConsultations(Array.isArray(json.data) ? json.data : []);
        setConsultationTotalPages(json.meta?.total_pages ?? 1);
      }
    } catch (e) { console.error('Failed to fetch consultations', e); }
    finally { setIsLoadingConsultations(false); }
  };

  const fetchConsultationDetail = async (id: string) => {
    setIsLoadingConsultationDetail(true);
    setConsultationDetail(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BACKEND_URL}/api/v1/consultations/${id}/details`, {
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const json = await res.json();
        setConsultationDetail(json.data);
      }
    } catch (e) { console.error('Failed to fetch consultation detail', e); }
    finally { setIsLoadingConsultationDetail(false); }
  };

  const executeDeleteTest = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        setTestToDelete(null);
        fetchLabTests();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditTestClick = (test: LabTest) => {
    setEditingTest(test);
    setEditTestError(null);
    setEditTestForm({
      name: test.name,
      category_id: test.category_id,
      organization: test.organization,
      results_in: String(test.results_in),
      price: String(test.price),
      discount_percentage: String(test.discount_percentage),
      is_active: test.is_active,
      clinic_address: test.clinic_address || '',
      clinic_open_time: test.clinic_open_time || '',
      clinic_close_time: test.clinic_close_time || '',
    });
  };

  const executeUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;
    setIsSavingTest(true);
    setEditTestError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsSavingTest(false); return; }
    try {
      const payload: any = {
        ...editTestForm,
        results_in: parseInt(editTestForm.results_in, 10),
        price: parseFloat(editTestForm.price),
        discount_percentage: parseFloat(editTestForm.discount_percentage) || 0,
      };
      if (!payload.clinic_address) delete payload.clinic_address;
      if (!payload.clinic_open_time) delete payload.clinic_open_time;
      if (!payload.clinic_close_time) delete payload.clinic_close_time;
      const res = await fetch(`${BACKEND_URL}/api/v1/lab-tests/${editingTest.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingTest(null);
        fetchLabTests();
      } else {
        const err = await res.json();
        setEditTestError(err.detail || 'Failed to update test.');
      }
    } catch (error) {
      setEditTestError('Something went wrong.');
    } finally {
      setIsSavingTest(false);
    }
  };
  // --- END LAB TESTS API FUNCTIONS ---

  // --- COUPONS API FUNCTIONS ---
  const fetchCoupons = async () => {
    setIsLoadingCoupons(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      let allItems: Coupon[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`${BACKEND_URL}/api/v1/coupons?limit=100&page=${page}`, {
          headers: { 
            Authorization: `Bearer ${session.access_token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json.data) ? json.data : (json.data?.items || []);
          allItems = [...allItems, ...items];
          if (items.length < 100) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }
      setCoupons(allItems);
    } catch (error) {
      console.error("Failed to fetch coupons", error);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  const resetCouponForm = () => {
    setCouponForm({ code: '', discount_percentage: '', category_id: '', lab_test_id: '', valid_until: '', is_active: true });
    setEditingCouponId(null);
    setCouponError(null);
    setIsAddCouponOpen(false);
  };

  const handleEditCouponClick = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code,
      discount_percentage: coupon.discount_percentage ? coupon.discount_percentage.toString() : '',
      category_id: coupon.category_id || '',
      lab_test_id: coupon.lab_test_id || '',
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
      is_active: coupon.is_active
    });
    setIsAddCouponOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    try {
      const payload = {
        code: couponForm.code.toUpperCase(),
        discount_percentage: parseFloat(couponForm.discount_percentage),
        category_id: couponForm.category_id || null,
        lab_test_id: couponForm.lab_test_id || null,
        valid_until: couponForm.valid_until ? new Date(couponForm.valid_until).toISOString() : null,
        is_active: couponForm.is_active
      };

      const url = editingCouponId 
        ? `${BACKEND_URL}/api/v1/coupons/${editingCouponId}` 
        : `${BACKEND_URL}/api/v1/coupons`;
        
      const method = editingCouponId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        resetCouponForm();
        fetchCoupons();
      } else {
        const err = await res.json();
        setCouponError(err.message || `Failed to ${editingCouponId ? 'update' : 'create'} coupon`);
      }
    } catch (error: any) {
      setCouponError(error.message || 'An unexpected error occurred');
    }
  };

  const executeDeleteCoupon = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/coupons/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        setCouponToDelete(null);
        fetchCoupons();
      }
    } catch (error) {
      console.error(error);
    }
  };
  // --- END COUPONS API FUNCTIONS ---

  const handleViewDoctorDetails = async (id: string) => {
    setIsPanelOpen(true);
    setIsLoadingDetails(true);
    setSelectedDoctor(null);
    setDoctorActionError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/${id}`, {
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedDoctor(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch doctor details", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleApproveDoctor = async (id: string) => {
    setIsApproving(true);
    setDoctorActionError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (res.ok) {
        await fetchAllDoctors();
        setIsPanelOpen(false);
      } else {
        const errorData = await res.json();
        setDoctorActionError(errorData.message || 'Failed to approve doctor');
      }
    } catch (error: any) {
      setDoctorActionError(error.message || 'An unexpected error occurred');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectDoctor = async (id: string) => {
    setIsRejecting(true);
    setDoctorActionError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/doctors/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ status: 'REJECTED' })
      });
      
      if (res.ok) {
        await fetchAllDoctors();
        setIsPanelOpen(false);
      } else {
        const errorData = await res.json();
        setDoctorActionError(errorData.message || 'Failed to reject doctor');
      }
    } catch (error: any) {
      setDoctorActionError(error.message || 'An unexpected error occurred');
    } finally {
      setIsRejecting(false);
    }
  };

  // --- BLOGS LOGIC (API INTEGRATED) ---

  const fetchBlogs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const resPub = await fetch(`${BACKEND_URL}/api/v1/blogs?limit=100&is_published=true`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const dataPub = await resPub.json();
      const pubItems = Array.isArray(dataPub.data) ? dataPub.data : (dataPub.data?.items || []);
      
      const resDraft = await fetch(`${BACKEND_URL}/api/v1/blogs?limit=100&is_published=false`, {
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const dataDraft = await resDraft.json();
      const draftItems = Array.isArray(dataDraft.data) ? dataDraft.data : (dataDraft.data?.items || []);

      const combined = [...pubItems, ...draftItems];
      // Sort newest first
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setBlogsList(combined.map(b => ({
        id: b.id,
        title: b.title,
        category: b.category || 'Uncategorized',
        date: new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        readTime: '5 min read',
        status: b.is_published ? 'Published' : 'Draft',
        excerpt: '',
        content: b.content || '',
        imageUrl: b.cover_image_url || ''
      })));
    } catch (error) {
      console.error("Failed to fetch blogs", error);
    }
  };

  const resetBlogForm = () => {
    setBlogForm({ id: '', title: '', category: '', readTime: '', excerpt: '', content: '' });
    setBlogImageFile(null);
    setBlogImagePreview(null);
    setMarkdownView('write');
  };

  const handleCreateNewBlogClick = () => {
    resetBlogForm();
    setBlogTab('write');
  };

  const handleEditBlogClick = async (blog: BlogPost) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/blogs/${blog.id}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const result = await res.json();
      
      if (res.ok && result.success && result.data) {
        const fullBlog = result.data;
        setBlogForm({
          id: fullBlog.id,
          title: fullBlog.title,
          category: fullBlog.category || blog.category,
          readTime: '5 min read',
          excerpt: '',
          content: fullBlog.content || ''
        });
        setBlogImagePreview(fullBlog.cover_image_url || null);
        setBlogImageFile(null);
        setMarkdownView('write');
        setBlogTab('write');
      } else {
        showToast('error', 'Failed to load blog details.');
      }
    } catch (error) {
      console.error("Error fetching blog details", error);
      showToast('error', 'Failed to load blog details.');
    }
  };

  const handleDeleteBlog = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        fetchBlogs();
        showToast('success', 'Blog deleted successfully.');
      } else {
        showToast('error', 'Failed to delete blog.');
      }
    } catch(e) {
      console.error(e);
      showToast('error', 'Failed to delete blog.');
    }
  };

  const handleBlogImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBlogImageFile(file);
      setBlogImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveBlog = async (status: 'Published' | 'Draft') => {
    if (!blogForm.title.trim() || !blogForm.content.trim()) {
      showToast('error', 'Title and content are required.');
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const is_published = status === 'Published';
    const payload = {
      title: blogForm.title,
      category: blogForm.category || 'Uncategorized',
      content: blogForm.content,
      cover_image_url: blogImagePreview || 'https://picsum.photos/seed/health-placeholder/1200/800',
      is_published: is_published
    };

    try {
      let res;
      if (blogForm.id) {
        res = await fetch(`${BACKEND_URL}/api/v1/blogs/${blogForm.id}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`, 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${BACKEND_URL}/api/v1/blogs`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`, 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setBlogSuccess(`Blog successfully saved as ${status}!`);
        resetBlogForm();
        fetchBlogs();
        setBlogTab('list');
        setTimeout(() => setBlogSuccess(null), 3000);
      } else {
        const err = await res.json();
        showToast('error', err.message || 'Failed to save blog.');
      }
    } catch(e) {
      console.error(e);
      showToast('error', 'Error saving blog. Please try again.');
    }
  };

  const handleGenerateAIBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingBlog(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsGeneratingBlog(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/blogs/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          research_topic: aiBlogForm.topic,
          target_audience: aiBlogForm.audience,
          tone_of_voice: aiBlogForm.tone,
          additional_instructions: aiBlogForm.instructions
        })
      });

      const result = await res.json();
      
      if (res.ok && result.success) {
        setBlogForm({
           id: '',
           title: result.data.title || '',
           category: result.data.category || '',
           readTime: '5 min read',
           excerpt: '',
           content: result.data.content || ''
        });
        setBlogImagePreview(result.data.cover_image_url || `https://picsum.photos/seed/${Math.random()}/1200/800`);
        setBlogImageFile(null);
        
        setAiBlogForm({ topic: '', tone: 'Professional & Authoritative', audience: 'General Patients', instructions: '' });
        setBlogTab('write'); 
      } else {
        showToast('error', result.message || 'Failed to generate blog via AI.');
      }
    } catch(e) {
      console.error(e);
      showToast('error', 'Failed to generate blog via AI. Please check your connection or try again.');
    } finally {
      setIsGeneratingBlog(false);
    }
  };

  // --- PATIENTS FETCHING LOGIC ---
  const fetchPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${BACKEND_URL}/api/v1/patients/?limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const json = await res.json();
        setPatients(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch patients", e);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handleViewPatientDetails = async (patientId: string) => {
    setIsPatientModalOpen(true);
    setIsLoadingPatientDetails(true);
    setSelectedPatient(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BACKEND_URL}/api/v1/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedPatient(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch patient details", error);
    } finally {
      setIsLoadingPatientDetails(false);
    }
  };

  const fetchHealthPackages = async () => {
    setIsLoadingHealthPackages(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BACKEND_URL}/api/v1/health-packages?limit=100`, {
        headers: { Authorization: `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      if (res.ok) {
        const json = await res.json();
        setHealthPackages(json.data?.items ?? json.data ?? []);
      }
    } catch (e) { console.error('Failed to fetch health packages', e); }
    finally { setIsLoadingHealthPackages(false); }
  };

  const saveHealthPackage = async () => {
    setIsSavingHp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const body = {
        title: hpForm.title.trim(),
        organization: hpForm.organization.trim(),
        description: hpForm.description.trim() || null,
        price: parseFloat(hpForm.price),
        discount_percentage: parseFloat(hpForm.discount_percentage),
        included_tests: hpForm.included_tests.split('\n').map(t => t.trim()).filter(Boolean),
      };
      const url = isHpPanelCreate
        ? `${BACKEND_URL}/api/v1/health-packages`
        : `${BACKEND_URL}/api/v1/health-packages/${selectedHp!.id}`;
      const res = await fetch(url, {
        method: isHpPanelCreate ? 'POST' : 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(body),
      });
      if (res.ok) { setIsHpPanelOpen(false); fetchHealthPackages(); }
    } catch (e) { console.error('Failed to save health package', e); }
    finally { setIsSavingHp(false); }
  };

  const toggleHpActive = async (pkg: HealthPackage) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${BACKEND_URL}/api/v1/health-packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ is_active: !pkg.is_active }),
      });
      fetchHealthPackages();
    } catch (e) { console.error('Failed to toggle package', e); }
  };

  const deleteHealthPackage = async (id: string) => {
    setIsDeletingHp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${BACKEND_URL}/api/v1/health-packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      setIsHpPanelOpen(false);
      fetchHealthPackages();
    } catch (e) { console.error('Failed to delete health package', e); }
    finally { setIsDeletingHp(false); setConfirmDeleteHp(false); }
  };

  const fetchPartnerApplications = async () => {
    setIsLoadingPartners(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsLoadingPartners(false); return; }
    try {
      let all: PartnerApplication[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`${BACKEND_URL}/api/v1/partners?page=${page}&limit=100`, {
          headers: { Authorization: `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' }
        });
        if (!res.ok) break;
        const json = await res.json();
        const items: PartnerApplication[] = Array.isArray(json.data) ? json.data : [];
        all = [...all, ...items];
        hasMore = json.meta?.has_next ?? false;
        page++;
      }
      setPartnerApplications(all);
    } catch (err) {
      console.error('Failed to fetch partner applications', err);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  const updatePartnerStatus = async (partnerId: string, newStatus: PartnerApplication['status']) => {
    setIsUpdatingPartnerStatus(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsUpdatingPartnerStatus(false); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/${partnerId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        const updated: PartnerApplication = json.data;
        setPartnerApplications(prev => prev.map(p => p.id === partnerId ? updated : p));
        setSelectedPartner(updated);
      }
    } catch (err) {
      console.error('Failed to update partner status', err);
    } finally {
      setIsUpdatingPartnerStatus(false);
    }
  };

  const approvePartner = async (partnerId: string, discountPct: number) => {
    setIsUpdatingPartnerStatus(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsUpdatingPartnerStatus(false); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/${partnerId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ discount_percentage: discountPct }),
      });
      if (res.ok) {
        const json = await res.json();
        const updated: PartnerApplication = json.data;
        setPartnerApplications(prev => prev.map(p => p.id === partnerId ? updated : p));
        setSelectedPartner(updated);
        setApproveDiscountPct('');
      }
    } catch (err) {
      console.error('Failed to approve partner', err);
    } finally {
      setIsUpdatingPartnerStatus(false);
    }
  };

  const deletePartner = async (partnerId: string) => {
    setIsDeletingPartner(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsDeletingPartner(false); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/partners/${partnerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      if (res.status === 204 || res.ok) {
        setPartnerApplications(prev => prev.filter(p => p.id !== partnerId));
        setIsPartnerPanelOpen(false);
        setSelectedPartner(null);
        setConfirmDeletePartner(false);
      }
    } catch (err) {
      console.error('Failed to delete partner application', err);
    } finally {
      setIsDeletingPartner(false);
    }
  };

  const fetchCallbacks = async () => {
    setIsLoadingCallbacks(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsLoadingCallbacks(false); return; }
    try {
      const all: CallbackRequest[] = [];
      let page = 1;
      while (true) {
        const res = await fetch(`${BACKEND_URL}/api/v1/callbacks?page=${page}&limit=50`, {
          headers: { Authorization: `Bearer ${session.access_token}`, 'ngrok-skip-browser-warning': 'true' },
        });
        if (!res.ok) break;
        const json = await res.json();
        const items: CallbackRequest[] = json.data?.items || json.data || [];
        all.push(...items);
        if (items.length < 50) break;
        page++;
      }
      // Sort newest first
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCallbacks(all);
    } catch (err) {
      console.error('Failed to fetch callbacks', err);
    } finally {
      setIsLoadingCallbacks(false);
    }
  };

  const updateCallbackStatus = async (id: string, newStatus: 'RESOLVED' | 'IGNORED') => {
    setUpdatingCallbackId(id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUpdatingCallbackId(null); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/callbacks/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ status: newStatus, admin_notes: callbackNotes[id] || null }),
      });
      if (res.ok) {
        const json = await res.json();
        setCallbacks(prev => prev.map(c => c.id === id ? json.data : c));
        setOpenNotesId(null);
      }
    } catch (err) {
      console.error('Failed to update callback', err);
    } finally {
      setUpdatingCallbackId(null);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Pagination filters & arrays
  const filteredDoctors = allDoctors.filter(doc =>
    filterStatus === 'all' ? true : doc.status.toLowerCase() === filterStatus.toLowerCase()
  );
  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / itemsPerPage));
  const paginatedDoctors = filteredDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const pendingDoctors = allDoctors.filter(doc => doc.status.toLowerCase() === 'pending');

  const filteredLabTests = labTests.filter(test => {
    const matchesFilter = testFilterStatus === 'all' 
      ? true 
      : testFilterStatus === 'active' 
        ? test.is_active 
        : !test.is_active;
    const matchesSearch = test.name.toLowerCase().includes(testSearchQuery.toLowerCase()) || 
                          test.organization.toLowerCase().includes(testSearchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });
  const totalTestPages = Math.max(1, Math.ceil(filteredLabTests.length / testsPerPage));
  const paginatedTests = filteredLabTests.slice((testCurrentPage - 1) * testsPerPage, testCurrentPage * testsPerPage);

  const totalCouponPages = Math.max(1, Math.ceil(coupons.length / couponsPerPage));
  const paginatedCoupons = coupons.slice((couponCurrentPage - 1) * couponsPerPage, couponCurrentPage * couponsPerPage);

  const totalBlogPages = Math.max(1, Math.ceil(blogsList.length / blogsPerPage));
  const paginatedBlogs = blogsList.slice((blogCurrentPage - 1) * blogsPerPage, blogCurrentPage * blogsPerPage);

  // --- TAB RENDERERS ---
  const renderDashboard = () => {
    const metricCards = dashboardMetrics ? [
      { title: 'Total Patients', count: dashboardMetrics.total_patients.count, pct: dashboardMetrics.total_patients.percentage_change, isUp: dashboardMetrics.total_patients.is_positive },
      { title: 'Active Doctors', count: dashboardMetrics.active_doctors.count, pct: dashboardMetrics.active_doctors.percentage_change, isUp: dashboardMetrics.active_doctors.is_positive },
      { title: 'Partner Labs', count: dashboardMetrics.partner_labs.count, pct: dashboardMetrics.partner_labs.percentage_change, isUp: dashboardMetrics.partner_labs.is_positive },
      { title: 'Pending Verifications', count: dashboardMetrics.pending_verifications.count, pct: dashboardMetrics.pending_verifications.percentage_change, isUp: dashboardMetrics.pending_verifications.is_positive },
    ] : null;

    return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards ? metricCards.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] relative overflow-hidden group">
            <p className="text-sm font-medium text-slate-500 mb-2">{stat.title}</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.count.toLocaleString('en-IN')}</h3>
              <span className={`flex items-center text-sm font-bold mb-1 ${stat.isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {stat.isUp ? <TrendingUp size={16} className="mr-1" /> : <TrendingUp size={16} className="mr-1 rotate-180" />}
                {stat.isUp ? '+' : ''}{stat.pct}%
              </span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10" />
          </motion.div>
        )) : Array.from({ length: 4 }).map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] relative overflow-hidden animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-2/3 mb-4" />
            <div className="h-8 bg-slate-100 rounded w-1/2" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200/60 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-extrabold text-slate-900">Recent Applications</h3>
            <button onClick={() => setActiveTab('doctors')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">View All</button>
          </div>
          
          <div className="space-y-4">
            {isLoadingDocs ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : allDoctors.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No applications found.</p>
            ) : (
              allDoctors.slice(0, 4).map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      {getInitials(`${doc.first_name} ${doc.last_name}`)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Dr. {doc.first_name} {doc.last_name}</p>
                      <p className="text-xs text-slate-500 font-medium">{doc.specialization}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleViewDoctorDetails(doc.id)}
                    className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-emerald-950 rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/20 blur-[40px] rounded-full pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/20 blur-[40px] rounded-full pointer-events-none" />
          <div className="absolute right-1/3 top-1/2 w-32 h-32 bg-emerald-400/10 blur-[60px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                <ShieldCheck size={14} className="text-emerald-300" />
                <span className="text-emerald-100">Verification Queue</span>
              </div>
              {pendingDoctors.length > 0 && (
                <div className="flex items-center gap-1.5 text-amber-300/90 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                  Action Required
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-3 mb-1">
              <h3 className="text-5xl font-black text-white tracking-tighter">{pendingDoctors.length}</h3>
              <span className="text-sm text-emerald-100/70 font-medium">awaiting review</span>
            </div>
            <p className="text-sm text-emerald-100/60 mb-6">Approve or reject doctor applications inline.</p>

            {isLoadingDocs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-emerald-300" />
              </div>
            ) : pendingDoctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} className="text-emerald-300" />
                </div>
                <p className="text-sm font-bold text-white">All caught up</p>
                <p className="text-xs text-emerald-100/60 mt-1">No verifications pending right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5 mb-5">
                {pendingDoctors.slice(0, 3).map(doc => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-black text-emerald-950 text-sm shrink-0">
                      {getInitials(`${doc.first_name} ${doc.last_name}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">Dr. {doc.first_name} {doc.last_name}</p>
                      <p className="text-xs text-emerald-100/60 font-medium truncate">{doc.specialization}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          setActioningId(doc.id);
                          await handleRejectDoctor(doc.id);
                          setActioningId(null);
                        }}
                        disabled={actioningId !== null}
                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center text-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Reject"
                      >
                        {actioningId === doc.id && isRejecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      </button>
                      <button
                        onClick={async () => {
                          setActioningId(doc.id);
                          await handleApproveDoctor(doc.id);
                          setActioningId(null);
                        }}
                        disabled={actioningId !== null}
                        className="w-8 h-8 rounded-lg bg-emerald-400/20 border border-emerald-400/30 hover:bg-emerald-400/30 flex items-center justify-center text-emerald-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Approve"
                      >
                        {actioningId === doc.id && isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {pendingDoctors.length > 0 && (
              <button
                onClick={() => { setActiveTab('doctors'); setFilterStatus('pending'); }}
                className="w-full py-3 bg-white text-emerald-950 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg flex items-center justify-center gap-2 group"
              >
                {pendingDoctors.length > 3 ? `View all ${pendingDoctors.length} pending` : 'Open verification queue'}
                <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Recent Transactions</h3>
            <p className="text-sm text-slate-500 mt-0.5">Latest payments across the platform.</p>
          </div>
          <div className="flex items-center gap-2">
            {(['SUCCESS', 'PENDING', 'FAILED'] as const).map(s => (
              <span key={s} className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                s === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' :
                s === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-600'
              }`}>{s}</span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoadingTransactions ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-emerald-500" size={28} /></div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-medium">No transactions yet.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 pl-8">Patient</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4 pr-8">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trx) => {
                  const name = trx.user?.patient_profile
                    ? `${trx.user.patient_profile.first_name} ${trx.user.patient_profile.last_name}`
                    : trx.user?.email ?? '—';
                  const dateIST = new Date(trx.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-8">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{name}</p>
                          <p className="text-xs text-slate-400">{trx.user?.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          trx.booking_type === 'CONSULTATION' ? 'bg-blue-50 text-blue-700' :
                          trx.booking_type === 'LAB_TEST' ? 'bg-violet-50 text-violet-700' :
                          'bg-teal-50 text-teal-700'
                        }`}>{trx.booking_type?.replace('_', ' ')}</span>
                      </td>
                      <td className="p-4 font-black text-slate-900">₹{Number(trx.amount).toLocaleString('en-IN')}</td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          trx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' :
                          trx.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-600'
                        }`}>{trx.status}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 font-mono">{trx.razorpay_order_id ?? '—'}</td>
                      <td className="p-4 pr-8 text-sm text-slate-500">{dateIST}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
    );
  };

  const renderDoctors = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
      
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Doctor Verification</h2>
          <p className="text-sm text-slate-500 mt-1">Review and manage doctor applications to join the platform.</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0">
          {['all', 'pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                filterStatus === status ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 pl-8">Doctor Info</th>
              <th className="p-4">Specialization</th>
              <th className="p-4">Applied Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 pr-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingDocs ? (
              <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin text-emerald-500 mx-auto" /></td></tr>
            ) : paginatedDoctors.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">No doctors found for this status.</td></tr>
            ) : (
              paginatedDoctors.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                        {getInitials(`${doc.first_name} ${doc.last_name}`)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Dr. {doc.first_name} {doc.last_name}</p>
                        <p className="text-xs text-slate-400 font-medium font-mono mt-0.5">ID: {doc.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-600">{doc.specialization}</td>
                  <td className="p-4 text-sm font-medium text-slate-600">{formatDate(doc.created_at)}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      doc.status.toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                      doc.status.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                      'bg-red-50 text-red-700 border-red-200/50'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-4 pr-8 text-right">
                    <button 
                      onClick={() => handleViewDoctorDetails(doc.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <Eye size={14} /> Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-auto">
          <p className="text-xs text-slate-500 font-bold px-4">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2 pr-4">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderLabTests = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
      
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Microscope className="text-emerald-600" />
            Diagnostic Tests
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage test categories and offerings available to patients.</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <button
            onClick={() => setLabTab('tests')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              labTab === 'tests' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Tests
          </button>
          <button
            onClick={() => setLabTab('categories')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              labTab === 'categories' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => { setLabTab('bookings'); fetchLabBookings(1, labBookingStatusFilter); }}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              labTab === 'bookings' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Bookings
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 flex-1 flex flex-col">
        {labTab === 'categories' && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex justify-end">
              <button 
                onClick={() => setIsAddCategoryOpen(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus size={18} /> Add Category
              </button>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-100 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4">Category Name</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labCategories.length === 0 ? (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">No categories found.</td></tr>
                  ) : (
                    labCategories.map(cat => (
                      <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{cat.name}</td>
                        <td className="p-4 text-sm text-slate-600">{cat.description}</td>
                        <td className="p-4 text-right">
                          {categoryToDelete === cat.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs font-bold text-red-500">Sure?</span>
                              <button onClick={() => executeDeleteCategory(cat.id)} className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100">Yes</button>
                              <button onClick={() => setCategoryToDelete(null)} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setCategoryToDelete(cat.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {labTab === 'tests' && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search tests..." 
                    value={testSearchQuery}
                    onChange={(e) => { setTestSearchQuery(e.target.value); setTestCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm shrink-0 w-full sm:w-auto overflow-x-auto">
                  {['all', 'active', 'inactive'].map(status => (
                    <button
                      key={status}
                      onClick={() => setTestFilterStatus(status as any)}
                      className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                        testFilterStatus === status ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setIsAddTestOpen(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm text-sm shrink-0 w-full sm:w-auto justify-center"
              >
                <Plus size={18} /> Add Test
              </button>
            </div>

            {isLoadingLabTests ? (
              <div className="flex justify-center py-20 flex-1"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-4">Test Name</th>
                      <th className="p-4">Category & Lab</th>
                      <th className="p-4">Pricing</th>
                      <th className="p-4">Turnaround</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTests.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">No tests found.</td></tr>
                    ) : (
                      paginatedTests.map(test => {
                        const discounted = test.price - (test.price * (test.discount_percentage / 100));
                        return (
                          <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-slate-900">{test.name}</p>
                              {!test.is_active && <span className="inline-block mt-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">Inactive</span>}
                            </td>
                            <td className="p-4">
                              <p className="text-sm font-semibold text-emerald-700">{test.category?.name || 'Uncategorized'}</p>
                              <p className="text-xs text-slate-500">{test.organization}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-sm font-bold text-slate-900">₹{discounted.toFixed(0)}</p>
                              <p className="text-xs text-slate-400 line-through">₹{test.price}</p>
                            </td>
                            <td className="p-4 text-sm text-slate-600">{test.results_in} hours</td>
                            <td className="p-4 text-right">
                              {testToDelete === test.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs font-bold text-red-500">Sure?</span>
                                  <button onClick={() => executeDeleteTest(test.id)} className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100">Yes</button>
                                  <button onClick={() => setTestToDelete(null)} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleEditTestClick(test)} className="p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors">
                                    <PenTool size={18} />
                                  </button>
                                  <button onClick={() => setTestToDelete(test.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {labTab === 'bookings' && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex flex-wrap gap-2">
              {(['all', 'PENDING', 'PAID', 'CANCELLED', 'COMPLETED'] as const).map(s => (
                <button key={s} onClick={() => { setLabBookingStatusFilter(s); setLabBookingPage(1); fetchLabBookings(1, s); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${labBookingStatusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-400'}`}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
            {isLoadingLabBookings ? (
              <div className="flex justify-center py-20 flex-1"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-4">Patient</th>
                      <th className="p-4">Test</th>
                      <th className="p-4">Lab</th>
                      <th className="p-4">Scheduled Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Booked On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {labBookings.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">No bookings found.</td></tr>
                    ) : (
                      labBookings.map((booking: any) => {
                        const statusColors: Record<string, string> = {
                          PENDING: 'bg-amber-100 text-amber-700',
                          PAID: 'bg-emerald-100 text-emerald-700',
                          CANCELLED: 'bg-red-100 text-red-700',
                          COMPLETED: 'bg-blue-100 text-blue-700',
                        };
                        return (
                          <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              {booking.patient_user ? (
                                <>
                                  <p className="text-sm font-bold text-slate-900">{booking.patient_user.patient_profile?.first_name} {booking.patient_user.patient_profile?.last_name}</p>
                                  <p className="text-xs text-slate-400">{booking.patient_user.email}</p>
                                  {booking.patient_user.patient_profile?.phone_number && <p className="text-xs text-slate-400">{booking.patient_user.patient_profile.phone_number}</p>}
                                </>
                              ) : (
                                <span className="text-sm text-slate-400 font-mono">{booking.patient_user_id?.slice(0, 8)}…</span>
                              )}
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-900 text-sm">{booking.lab_test?.name ?? '—'}</p>
                            </td>
                            <td className="p-4 text-sm text-slate-500">{booking.lab_test?.organization ?? '—'}</td>
                            <td className="p-4 text-sm text-slate-600 font-medium">{booking.scheduled_date ?? '—'}</td>
                            <td className="p-4">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors[booking.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-400">{new Date(booking.created_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {labBookingTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500 font-bold">Page {labBookingPage} of {labBookingTotalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => { const p = Math.max(1, labBookingPage - 1); setLabBookingPage(p); fetchLabBookings(p, labBookingStatusFilter); }} disabled={labBookingPage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
                  <button onClick={() => { const p = Math.min(labBookingTotalPages, labBookingPage + 1); setLabBookingPage(p); fetchLabBookings(p, labBookingStatusFilter); }} disabled={labBookingPage === labBookingTotalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {labTab === 'tests' && totalTestPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-auto">
          <p className="text-xs text-slate-500 font-bold px-4">Page {testCurrentPage} of {totalTestPages}</p>
          <div className="flex gap-2 pr-4">
            <button 
              onClick={() => setTestCurrentPage(p => Math.max(1, p - 1))}
              disabled={testCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setTestCurrentPage(p => Math.min(totalTestPages, p + 1))}
              disabled={testCurrentPage === totalTestPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      <AnimatePresence>
        {isAddCategoryOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddCategoryOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Create Category</h2>
              
              {categoryError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} /> {categoryError}
                </div>
              )}

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Name</label>
                  <input required type="text" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                  <textarea required rows={3} value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none resize-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => {setIsAddCategoryOpen(false); setCategoryError(null);}} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Test Modal */}
      <AnimatePresence>
        {isAddTestOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddTestOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Create Lab Test</h2>
              
              {testError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} /> {testError}
                </div>
              )}

              <form onSubmit={handleCreateTest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Test Name</label>
                  <input required type="text" value={testForm.name} onChange={e => setTestForm({...testForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                  <select required value={testForm.category_id} onChange={e => setTestForm({...testForm, category_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none">
                    <option value="">Select Category</option>
                    {labCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lab / Organization</label>
                  <input required type="text" value={testForm.organization} onChange={e => setTestForm({...testForm, organization: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Turnaround Time (Hours)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[2, 4, 6, 12, 24, 48, 72].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setTestForm({...testForm, results_in: String(h)})}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                          testForm.results_in === String(h)
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      min="1"
                      value={testForm.results_in}
                      onChange={e => setTestForm({...testForm, results_in: e.target.value})}
                      placeholder="Or type custom hours…"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none pr-16"
                    />
                    {testForm.results_in && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">
                        hrs
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Base Price (₹)</label>
                    <input required type="number" min="0" step="0.01" value={testForm.price} onChange={e => setTestForm({...testForm, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Discount (%)</label>
                    <input required type="number" min="0" max="100" step="0.01" value={testForm.discount_percentage} onChange={e => setTestForm({...testForm, discount_percentage: Math.min(100, parseFloat(e.target.value) || 0).toString()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Clinic Address <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                  <input type="text" value={testForm.clinic_address} onChange={e => setTestForm({...testForm, clinic_address: e.target.value})} placeholder="e.g. 12, MG Road, Bangalore" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(['clinic_open_time', 'clinic_close_time'] as const).map((field, idx) => {
                    const label = idx === 0 ? 'Clinic Opens' : 'Clinic Closes';
                    const raw = testForm[field]; // stored as "HH:MM:SS" or ""
                    const hh = raw ? raw.slice(0, 2) : '';
                    const mm = raw ? raw.slice(3, 5) : '';
                    const setTime = (newH: string, newM: string) => {
                      if (!newH && !newM) { setTestForm({...testForm, [field]: ''}); return; }
                      setTestForm({...testForm, [field]: `${newH || '00'}:${newM || '00'}:00`});
                    };
                    return (
                      <div key={field}>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          {label} <span className="normal-case font-normal text-slate-400">(optional)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={hh}
                            onChange={e => setTime(e.target.value, mm)}
                            className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 appearance-none text-center"
                          >
                            <option value="">HH</option>
                            {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <span className="text-slate-400 font-bold text-lg">:</span>
                          <select
                            value={mm}
                            onChange={e => setTime(hh, e.target.value)}
                            className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 appearance-none text-center"
                          >
                            <option value="">MM</option>
                            {['00','15','30','45'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        {hh && mm && (
                          <p className="text-xs text-emerald-600 font-semibold mt-1.5 ml-1">
                            {parseInt(hh) === 0 ? '12' : parseInt(hh) > 12 ? String(parseInt(hh) - 12).padStart(2,'0') : hh}:{mm} {parseInt(hh) >= 12 ? 'PM' : 'AM'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <label className="flex items-center gap-3 pt-2 cursor-pointer">
                  <input type="checkbox" checked={testForm.is_active} onChange={e => setTestForm({...testForm, is_active: e.target.checked})} className="w-5 h-5 accent-emerald-600 rounded" />
                  <span className="text-sm font-bold text-slate-700">Test is Active</span>
                </label>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => {setIsAddTestOpen(false); setTestError(null);}} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md">Create Test</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Test Modal */}
      <AnimatePresence>
        {editingTest && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSavingTest && setEditingTest(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Edit Lab Test</h2>
              <p className="text-sm text-slate-400 mb-6">{editingTest.name}</p>

              {editTestError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} /> {editTestError}
                </div>
              )}

              <form onSubmit={executeUpdateTest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Test Name</label>
                  <input required type="text" value={editTestForm.name} onChange={e => setEditTestForm({...editTestForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                  <select required value={editTestForm.category_id} onChange={e => setEditTestForm({...editTestForm, category_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none">
                    <option value="">Select Category</option>
                    {labCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lab / Organization</label>
                  <input required type="text" value={editTestForm.organization} onChange={e => setEditTestForm({...editTestForm, organization: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Turnaround Time (Hours)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[2, 4, 6, 12, 24, 48, 72].map(h => (
                      <button key={h} type="button" onClick={() => setEditTestForm({...editTestForm, results_in: String(h)})}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${editTestForm.results_in === String(h) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600'}`}>
                        {h}h
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <input required type="number" min="1" value={editTestForm.results_in} onChange={e => setEditTestForm({...editTestForm, results_in: e.target.value})} placeholder="Or type custom hours…" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none pr-16" />
                    {editTestForm.results_in && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">hrs</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Base Price (₹)</label>
                    <input required type="number" min="0" step="0.01" value={editTestForm.price} onChange={e => setEditTestForm({...editTestForm, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Discount (%)</label>
                    <input required type="number" min="0" max="100" step="0.01" value={editTestForm.discount_percentage} onChange={e => setEditTestForm({...editTestForm, discount_percentage: Math.min(100, parseFloat(e.target.value) || 0).toString()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Clinic Address <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                  <input type="text" value={editTestForm.clinic_address} onChange={e => setEditTestForm({...editTestForm, clinic_address: e.target.value})} placeholder="e.g. 12, MG Road, Bangalore" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(['clinic_open_time', 'clinic_close_time'] as const).map((field, idx) => {
                    const label = idx === 0 ? 'Clinic Opens' : 'Clinic Closes';
                    const raw = editTestForm[field];
                    const hh = raw ? raw.slice(0, 2) : '';
                    const mm = raw ? raw.slice(3, 5) : '';
                    const setTime = (newH: string, newM: string) => {
                      if (!newH && !newM) { setEditTestForm({...editTestForm, [field]: ''}); return; }
                      setEditTestForm({...editTestForm, [field]: `${newH || '00'}:${newM || '00'}:00`});
                    };
                    return (
                      <div key={field}>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          {label} <span className="normal-case font-normal text-slate-400">(optional)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <select value={hh} onChange={e => setTime(e.target.value, mm)} className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 appearance-none text-center">
                            <option value="">HH</option>
                            {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span className="text-slate-400 font-bold text-lg">:</span>
                          <select value={mm} onChange={e => setTime(hh, e.target.value)} className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 appearance-none text-center">
                            <option value="">MM</option>
                            {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        {hh && mm && (
                          <p className="text-xs text-emerald-600 font-semibold mt-1.5 ml-1">
                            {parseInt(hh) === 0 ? '12' : parseInt(hh) > 12 ? String(parseInt(hh) - 12).padStart(2,'0') : hh}:{mm} {parseInt(hh) >= 12 ? 'PM' : 'AM'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <label className="flex items-center gap-3 pt-2 cursor-pointer">
                  <input type="checkbox" checked={editTestForm.is_active} onChange={e => setEditTestForm({...editTestForm, is_active: e.target.checked})} className="w-5 h-5 accent-emerald-600 rounded" />
                  <span className="text-sm font-bold text-slate-700">Test is Active</span>
                </label>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setEditingTest(null); setEditTestError(null); }} disabled={isSavingTest} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isSavingTest} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
                    {isSavingTest ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );

  const renderCoupons = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Ticket className="text-emerald-600" />
            Promo Codes & Coupons
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage discount codes for diagnostic tests.</p>
        </div>
        <button
          onClick={() => { resetCouponForm(); setIsAddCouponOpen(true); }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Create Coupon
        </button>
      </div>

      <div className="p-6 sm:p-8 flex-1">
        {isLoadingCoupons ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Expires</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCoupons.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">No coupons found.</td></tr>
                ) : (
                  paginatedCoupons.map(coupon => (
                    <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                        <Tag size={16} className="text-emerald-600" /> {coupon.code}
                      </td>
                      <td className="p-4 text-sm font-bold text-emerald-700">{coupon.discount_percentage}%</td>
                      <td className="p-4">
                        {coupon.is_active
                          ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Active</span>
                          : <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Inactive</span>
                        }
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {coupon.valid_until ? formatDate(coupon.valid_until) : 'Never'}
                      </td>
                      <td className="p-4 text-right">
                        {couponToDelete === coupon.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-bold text-red-500">Sure?</span>
                            <button onClick={() => executeDeleteCoupon(coupon.id)} className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100">Yes</button>
                            <button onClick={() => setCouponToDelete(null)} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200">No</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEditCouponClick(coupon)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 rounded-lg transition-colors">
                              <PenTool size={18} />
                            </button>
                            <button onClick={() => setCouponToDelete(coupon.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalCouponPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-auto">
          <p className="text-xs text-slate-500 font-bold px-4">Page {couponCurrentPage} of {totalCouponPages}</p>
          <div className="flex gap-2 pr-4">
            <button
              onClick={() => setCouponCurrentPage(p => Math.max(1, p - 1))}
              disabled={couponCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCouponCurrentPage(p => Math.min(totalCouponPages, p + 1))}
              disabled={couponCurrentPage === totalCouponPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Coupon Modal */}
      <AnimatePresence>
        {isAddCouponOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetCouponForm} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-6">{editingCouponId ? 'Edit Promo Code' : 'Create Promo Code'}</h2>
              
              {couponError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} /> {couponError}
                </div>
              )}

              <form onSubmit={handleSaveCoupon} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Code</label>
                    <input required type="text" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} placeholder="e.g. SUMMER50" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none uppercase font-bold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Discount (%)</label>
                    <input required type="number" min="1" max="100" step="0.01" value={couponForm.discount_percentage} onChange={e => setCouponForm({...couponForm, discount_percentage: Math.min(100, parseFloat(e.target.value) || 0).toString()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none font-bold text-emerald-600" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Restrict to Category (Optional)</label>
                  <select value={couponForm.category_id} onChange={e => setCouponForm({...couponForm, category_id: e.target.value, lab_test_id: ''})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-sm">
                    <option value="">Global (All Categories)</option>
                    {labCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valid Until (Optional)</label>
                  <input type="datetime-local" value={couponForm.valid_until} onChange={e => setCouponForm({...couponForm, valid_until: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-sm text-slate-700" />
                </div>

                <label className="flex items-center gap-3 pt-2 cursor-pointer">
                  <input type="checkbox" checked={couponForm.is_active} onChange={e => setCouponForm({...couponForm, is_active: e.target.checked})} className="w-5 h-5 accent-emerald-600 rounded" />
                  <span className="text-sm font-bold text-slate-700">Coupon is Active</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={resetCouponForm} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md">
                    {editingCouponId ? 'Update Coupon' : 'Save Coupon'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderBlogs = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-emerald-600" />
            Blogs & Insights
          </h2>
          <p className="text-sm text-slate-500 mt-1">Publish and manage health articles, or let AI write them for you.</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setBlogTab('list')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              blogTab === 'list' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Blogs
          </button>
          <button
            onClick={handleCreateNewBlogClick}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              blogTab === 'write' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Write Blog
          </button>
          <button
            onClick={() => setBlogTab('ai')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              blogTab === 'ai' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles size={16} className={blogTab === 'ai' ? 'text-amber-300' : ''} /> AI Writer
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 flex-1">
        
        {blogSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 font-bold">
            <CheckCircle2 size={20} /> {blogSuccess}
          </motion.div>
        )}

        {blogTab === 'list' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">Title & Category</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Read Time</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBlogs.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">No blogs published yet.</td></tr>
                ) : (
                  paginatedBlogs.map(blog => (
                    <tr key={blog.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 line-clamp-1">{blog.title}</p>
                        <p className="text-xs text-emerald-600 font-bold uppercase mt-1">{blog.category}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600 font-medium">{blog.date}</td>
                      <td className="p-4 text-sm text-slate-600 font-medium">{blog.readTime}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${blog.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 'bg-amber-50 text-amber-700 border-amber-200/50'}`}>
                            {blog.status}
                          </span>
                          <button 
                            onClick={() => handleEditBlogClick(blog)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            title="Edit Blog"
                          >
                            <PenTool size={16} />
                          </button>
                          <button
                            onClick={() => setBlogToDelete(blog.id)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete Blog"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {blogTab === 'write' && (
          <form onSubmit={(e) => e.preventDefault()} className="max-w-5xl mx-auto space-y-6">
            
            {/* Top Bar for Actions */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">{blogForm.id ? 'Edit Blog Post' : 'Draft New Story'}</h3>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { resetBlogForm(); setBlogTab('list'); }} 
                  className="px-4 py-2 font-bold text-sm text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  Discard
                </button>
                <button 
                  type="button"
                  onClick={() => handleSaveBlog('Draft')}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 font-bold rounded-full hover:bg-slate-200 transition-colors"
                >
                  Save Draft
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSaveBlog('Published')}
                  className="px-5 py-2 text-sm bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700 shadow-sm transition-all"
                >
                  Publish
                </button>
              </div>
            </div>

            {/* Cover Image Upload - Cinematic style */}
            <div className="relative group rounded-[2rem] overflow-hidden bg-slate-50 border border-slate-200 transition-all hover:border-emerald-300">
               {blogImagePreview ? (
                 <div className="relative h-64 md:h-80 w-full">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={blogImagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Cover preview" />
                   <label className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/60 cursor-pointer backdrop-blur-sm">
                      <UploadCloud size={32} className="text-white mb-2" />
                      <p className="text-sm font-bold text-white">Change Cover Image</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleBlogImageChange} />
                   </label>
                 </div>
               ) : (
                 <label className="flex flex-col items-center justify-center w-full h-48 cursor-pointer text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors">
                   <ImageIcon size={32} className="mb-2" />
                   <p className="text-sm font-bold">Add a cover image</p>
                   <input type="file" accept="image/*" className="hidden" onChange={handleBlogImageChange} />
                 </label>
               )}
            </div>

            {/* Title & Metadata */}
            <div className="py-4">
              <input 
                type="text" 
                value={blogForm.title} 
                onChange={e => setBlogForm({...blogForm, title: e.target.value})} 
                placeholder="Title" 
                className="w-full bg-transparent border-none text-4xl md:text-5xl font-black text-slate-900 placeholder:text-slate-300 focus:ring-0 px-0 outline-none leading-tight mb-4" 
              />
              
              <div className="flex flex-wrap gap-4">
                <input 
                  type="text" 
                  value={blogForm.category} 
                  onChange={e => setBlogForm({...blogForm, category: e.target.value})} 
                  placeholder="Category (e.g. Wellness)" 
                  className="bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400 focus:bg-white" 
                />
                <input 
                  type="text" 
                  value={blogForm.readTime} 
                  onChange={e => setBlogForm({...blogForm, readTime: e.target.value})} 
                  placeholder="Read Time (e.g. 5 min)" 
                  className="bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400 focus:bg-white" 
                />
              </div>
            </div>

            {/* Robust Markdown Editor Component */}
            <div data-color-mode="light" className="w-full flex-1 flex flex-col min-h-[500px] border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
               <MDEditor
                  value={blogForm.content}
                  onChange={(val) => setBlogForm({...blogForm, content: val || ''})}
                  height={500}
                  className="flex-1 w-full"
                  previewOptions={{
                    className: "prose prose-emerald max-w-none p-4"
                  }}
               />
            </div>
            
          </form>
        )}

        {blogTab === 'ai' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-emerald-950 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 blur-[60px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-8 shadow-inner">
                  <Wand2 size={32} className="text-emerald-300" />
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">AI Blog Generator</h3>
                <p className="text-emerald-100/80 text-lg mb-10 max-w-2xl">Let our specialized medical AI draft a highly professional, well-researched blog post in seconds. You can review and edit it before publishing.</p>

                {isGeneratingBlog ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="animate-spin text-emerald-400 mb-6" size={48} />
                    <h4 className="text-2xl font-bold mb-2">Researching & Writing...</h4>
                    <p className="text-emerald-100/70">The AI is structuring the article, optimizing markdown, and polishing the tone.</p>
                  </div>
                ) : (
                  <form onSubmit={handleGenerateAIBlog} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-emerald-100 mb-2">Research Topic & Directions *</label>
                      <textarea 
                        required 
                        rows={3} 
                        value={aiBlogForm.topic} 
                        onChange={e => setAiBlogForm({...aiBlogForm, topic: e.target.value})} 
                        placeholder="E.g., The benefits of intermittent fasting on metabolic health..." 
                        className="w-full px-5 py-4 bg-emerald-900/50 border border-emerald-700/50 rounded-2xl focus:outline-none focus:border-emerald-400 focus:bg-emerald-900 transition-all text-white placeholder:text-emerald-500/50 resize-none" 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-emerald-100 mb-2">Target Audience</label>
                        <select 
                          value={aiBlogForm.audience} 
                          onChange={e => setAiBlogForm({...aiBlogForm, audience: e.target.value})} 
                          className="w-full px-5 py-4 bg-emerald-900/50 border border-emerald-700/50 rounded-2xl focus:outline-none focus:border-emerald-400 transition-all text-white appearance-none"
                        >
                          <option value="General Patients">General Patients</option>
                          <option value="Medical Professionals">Medical Professionals</option>
                          <option value="Health Enthusiasts">Health Enthusiasts</option>
                          <option value="Elderly Care">Elderly Care</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-emerald-100 mb-2">Tone of Voice</label>
                        <select 
                          value={aiBlogForm.tone} 
                          onChange={e => setAiBlogForm({...aiBlogForm, tone: e.target.value})} 
                          className="w-full px-5 py-4 bg-emerald-900/50 border border-emerald-700/50 rounded-2xl focus:outline-none focus:border-emerald-400 transition-all text-white appearance-none"
                        >
                          <option value="Professional & Authoritative">Professional & Authoritative</option>
                          <option value="Empathetic & Caring">Empathetic & Caring</option>
                          <option value="Scientific & Analytical">Scientific & Analytical</option>
                          <option value="Conversational & Accessible">Conversational & Accessible</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-emerald-100 mb-2">Additional Instructions (Optional)</label>
                      <input 
                        type="text" 
                        value={aiBlogForm.instructions} 
                        onChange={e => setAiBlogForm({...aiBlogForm, instructions: e.target.value})} 
                        placeholder="E.g., Include a section about dietary changes, keep it under 800 words." 
                        className="w-full px-5 py-4 bg-emerald-900/50 border border-emerald-700/50 rounded-2xl focus:outline-none focus:border-emerald-400 transition-all text-white placeholder:text-emerald-500/50" 
                      />
                    </div>
                    <button type="submit" disabled={!aiBlogForm.topic.trim()} className="w-full py-5 bg-white text-emerald-950 font-black text-lg rounded-2xl hover:bg-emerald-50 transition-colors shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4">
                      <Sparkles size={24} className="text-emerald-600" /> Generate Article Draft
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {blogTab === 'list' && totalBlogPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-auto">
          <p className="text-xs text-slate-500 font-bold px-4">Page {blogCurrentPage} of {totalBlogPages}</p>
          <div className="flex gap-2 pr-4">
            <button 
              onClick={() => setBlogCurrentPage(p => Math.max(1, p - 1))}
              disabled={blogCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setBlogCurrentPage(p => Math.min(totalBlogPages, p + 1))}
              disabled={blogCurrentPage === totalBlogPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderTestBookings = () => {
    const statusColors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700',
      PAID: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-red-100 text-red-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
    };
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarDays className="text-emerald-600" size={22} />
                Test Bookings
              </h2>
              <p className="text-sm text-slate-500 mt-1">Click any row to see full booking & patient details.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'PENDING', 'PAID', 'CANCELLED', 'COMPLETED'] as const).map(s => (
                <button key={s} onClick={() => { setLabBookingStatusFilter(s); setLabBookingPage(1); fetchLabBookings(1, s); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${labBookingStatusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-400'}`}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col p-6 sm:p-8">
            {isLoadingLabBookings ? (
              <div className="flex justify-center py-20 flex-1"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-4">Patient</th>
                      <th className="p-4">Test</th>
                      <th className="p-4">Lab</th>
                      <th className="p-4">Scheduled Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Booked On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {labBookings.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">No bookings found.</td></tr>
                    ) : (
                      labBookings.map((booking: any) => (
                        <tr key={booking.id}
                          onClick={() => { setSelectedBooking(booking); fetchPatientBookings(booking.patient_user_id); }}
                          className="hover:bg-emerald-50/40 cursor-pointer transition-colors">
                          <td className="p-4">
                            {booking.patient_user ? (
                              <>
                                <p className="text-sm font-bold text-slate-900">{booking.patient_user.patient_profile?.first_name} {booking.patient_user.patient_profile?.last_name}</p>
                                <p className="text-xs text-slate-400">{booking.patient_user.email}</p>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400 font-mono">{booking.patient_user_id?.slice(0, 8)}…</span>
                            )}
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900 text-sm">{booking.lab_test?.name ?? '—'}</p>
                          </td>
                          <td className="p-4 text-sm text-slate-500">{booking.lab_test?.organization ?? '—'}</td>
                          <td className="p-4 text-sm text-slate-600 font-medium">{booking.scheduled_date ?? '—'}</td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors[booking.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-400">{new Date(booking.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {labBookingTotalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500 font-bold">Page {labBookingPage} of {labBookingTotalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => { const p = Math.max(1, labBookingPage - 1); setLabBookingPage(p); fetchLabBookings(p, labBookingStatusFilter); }} disabled={labBookingPage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
                  <button onClick={() => { const p = Math.min(labBookingTotalPages, labBookingPage + 1); setLabBookingPage(p); fetchLabBookings(p, labBookingStatusFilter); }} disabled={labBookingPage === labBookingTotalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Booking Detail Panel */}
        <AnimatePresence>
          {selectedBooking && (
            <div className="fixed inset-0 z-[110] flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedBooking(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60 shrink-0">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Booking Detail</p>
                    <h3 className="text-lg font-extrabold text-slate-900">{selectedBooking.lab_test?.name ?? 'Lab Test'}</h3>
                    <p className="text-sm text-slate-500">{selectedBooking.lab_test?.organization ?? '—'}</p>
                  </div>
                  <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors shrink-0"><X size={20} /></button>
                </div>

                <div className="flex-1 p-6 space-y-6">
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${statusColors[selectedBooking.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {selectedBooking.status}
                    </span>
                    <span className="text-xs text-slate-400">Booking ID: <span className="font-mono">{selectedBooking.id?.slice(0, 12)}…</span></span>
                  </div>

                  {/* Patient Info */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</p>
                    {selectedBooking.patient_user ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="text-emerald-700 font-bold text-sm">
                              {selectedBooking.patient_user.patient_profile?.first_name?.[0]}{selectedBooking.patient_user.patient_profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{selectedBooking.patient_user.patient_profile?.first_name} {selectedBooking.patient_user.patient_profile?.last_name}</p>
                            <p className="text-xs text-slate-500">{selectedBooking.patient_user.email}</p>
                          </div>
                        </div>
                        {selectedBooking.patient_user.patient_profile?.phone_number && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            {selectedBooking.patient_user.patient_profile.phone_number}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 font-mono">{selectedBooking.patient_user_id}</p>
                    )}
                  </div>

                  {/* Booking Info */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Info</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Scheduled Date</span>
                        <span className="font-bold text-slate-900">{selectedBooking.scheduled_date ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Booked On</span>
                        <span className="font-semibold text-slate-700">{new Date(selectedBooking.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinic Info */}
                  {(selectedBooking.lab_test?.clinic_address || selectedBooking.lab_test?.clinic_open_time) && (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic</p>
                      <div className="space-y-2 text-sm">
                        {selectedBooking.lab_test?.clinic_address && (
                          <div className="flex gap-2 text-slate-600">
                            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            {selectedBooking.lab_test.clinic_address}
                          </div>
                        )}
                        {selectedBooking.lab_test?.clinic_open_time && selectedBooking.lab_test?.clinic_close_time && (
                          <div className="flex gap-2 text-slate-600">
                            <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            {selectedBooking.lab_test.clinic_open_time.slice(0, 5)} – {selectedBooking.lab_test.clinic_close_time.slice(0, 5)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All bookings by this patient */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">All Bookings by This Patient</p>
                    {isLoadingPatientBookings ? (
                      <div className="flex justify-center py-6"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
                    ) : patientBookings.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No other bookings found.</p>
                    ) : (
                      <div className="space-y-2">
                        {patientBookings.map((b: any) => (
                          <div key={b.id} onClick={() => { setSelectedBooking(b); fetchPatientBookings(b.patient_user_id); }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${b.id === selectedBooking.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-slate-50'}`}>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{b.lab_test?.name ?? '—'}</p>
                              <p className="text-xs text-slate-400">{b.scheduled_date ?? '—'}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[b.status] ?? 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  };

  const renderPackageBookings = () => {
    const statusColors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700',
      PAID: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-red-100 text-red-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
    };
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <HeartPulse className="text-emerald-600" size={22} />
                Package Bookings
              </h2>
              <p className="text-sm text-slate-500 mt-1">Click any row to see full booking & patient details.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'PENDING', 'PAID', 'CANCELLED', 'COMPLETED'] as const).map(s => (
                <button key={s} onClick={() => { setPkgBookingStatusFilter(s); setPkgBookingPage(1); fetchPkgBookings(1, s); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${pkgBookingStatusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-400'}`}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col p-6 sm:p-8">
            {isLoadingPkgBookings ? (
              <div className="flex justify-center py-20 flex-1"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-4">Patient</th>
                      <th className="p-4">Package</th>
                      <th className="p-4">Organization</th>
                      <th className="p-4">Scheduled Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Booked On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pkgBookings.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">No bookings found.</td></tr>
                    ) : (
                      pkgBookings.map((booking: any) => (
                        <tr key={booking.id}
                          onClick={() => { setSelectedPkgBooking(booking); fetchPatientPkgBookings(booking.patient_user_id); }}
                          className="hover:bg-emerald-50/40 cursor-pointer transition-colors">
                          <td className="p-4">
                            {booking.patient_user ? (
                              <>
                                <p className="text-sm font-bold text-slate-900">{booking.patient_user.patient_profile?.first_name} {booking.patient_user.patient_profile?.last_name}</p>
                                <p className="text-xs text-slate-400">{booking.patient_user.email}</p>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400 font-mono">{booking.patient_user_id?.slice(0, 8)}…</span>
                            )}
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900 text-sm">{booking.health_package?.title ?? '—'}</p>
                          </td>
                          <td className="p-4 text-sm text-slate-500">{booking.health_package?.organization ?? '—'}</td>
                          <td className="p-4 text-sm text-slate-600 font-medium">{booking.scheduled_date ?? '—'}</td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors[booking.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-400">{new Date(booking.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {pkgBookingTotalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500 font-bold">Page {pkgBookingPage} of {pkgBookingTotalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => { const p = Math.max(1, pkgBookingPage - 1); setPkgBookingPage(p); fetchPkgBookings(p, pkgBookingStatusFilter); }} disabled={pkgBookingPage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
                  <button onClick={() => { const p = Math.min(pkgBookingTotalPages, pkgBookingPage + 1); setPkgBookingPage(p); fetchPkgBookings(p, pkgBookingStatusFilter); }} disabled={pkgBookingPage === pkgBookingTotalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Package Booking Detail Panel */}
        <AnimatePresence>
          {selectedPkgBooking && (
            <div className="fixed inset-0 z-[110] flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedPkgBooking(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto">

                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60 shrink-0">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Package Booking</p>
                    <h3 className="text-lg font-extrabold text-slate-900">{selectedPkgBooking.health_package?.title ?? 'Health Package'}</h3>
                    <p className="text-sm text-slate-500">{selectedPkgBooking.health_package?.organization ?? '—'}</p>
                  </div>
                  <button onClick={() => setSelectedPkgBooking(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors shrink-0"><X size={20} /></button>
                </div>

                <div className="flex-1 p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${statusColors[selectedPkgBooking.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {selectedPkgBooking.status}
                    </span>
                    <span className="text-xs text-slate-400">ID: <span className="font-mono">{selectedPkgBooking.id?.slice(0, 12)}…</span></span>
                  </div>

                  {/* Patient */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</p>
                    {selectedPkgBooking.patient_user ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="text-emerald-700 font-bold text-sm">
                              {selectedPkgBooking.patient_user.patient_profile?.first_name?.[0]}{selectedPkgBooking.patient_user.patient_profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{selectedPkgBooking.patient_user.patient_profile?.first_name} {selectedPkgBooking.patient_user.patient_profile?.last_name}</p>
                            <p className="text-xs text-slate-500">{selectedPkgBooking.patient_user.email}</p>
                          </div>
                        </div>
                        {selectedPkgBooking.patient_user.patient_profile?.phone_number && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            {selectedPkgBooking.patient_user.patient_profile.phone_number}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 font-mono">{selectedPkgBooking.patient_user_id}</p>
                    )}
                  </div>

                  {/* Booking Info */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Info</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Scheduled Date</span>
                        <span className="font-bold text-slate-900">{selectedPkgBooking.scheduled_date ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Booked On</span>
                        <span className="font-semibold text-slate-700">{new Date(selectedPkgBooking.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {selectedPkgBooking.health_package?.price && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Price</span>
                          <span className="font-bold text-slate-900">₹{selectedPkgBooking.health_package.price}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Package Tests */}
                  {selectedPkgBooking.health_package?.included_tests?.length > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Included Tests</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPkgBooking.health_package.included_tests.map((t: string) => (
                          <span key={t} className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-100">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinic Info */}
                  {(selectedPkgBooking.health_package?.clinic_address || selectedPkgBooking.health_package?.clinic_open_time) && (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic</p>
                      <div className="space-y-2 text-sm">
                        {selectedPkgBooking.health_package?.clinic_address && (
                          <div className="flex gap-2 text-slate-600">
                            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            {selectedPkgBooking.health_package.clinic_address}
                          </div>
                        )}
                        {selectedPkgBooking.health_package?.clinic_open_time && selectedPkgBooking.health_package?.clinic_close_time && (
                          <div className="flex gap-2 text-slate-600">
                            <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            {selectedPkgBooking.health_package.clinic_open_time.slice(0, 5)} – {selectedPkgBooking.health_package.clinic_close_time.slice(0, 5)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All bookings by this patient */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">All Package Bookings by This Patient</p>
                    {isLoadingPatientPkgBookings ? (
                      <div className="flex justify-center py-6"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
                    ) : patientPkgBookings.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No other bookings found.</p>
                    ) : (
                      <div className="space-y-2">
                        {patientPkgBookings.map((b: any) => (
                          <div key={b.id} onClick={() => { setSelectedPkgBooking(b); fetchPatientPkgBookings(b.patient_user_id); }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${b.id === selectedPkgBooking.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-slate-50'}`}>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{b.health_package?.title ?? '—'}</p>
                              <p className="text-xs text-slate-400">{b.scheduled_date ?? '—'}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[b.status] ?? 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  };

  const renderLabs = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Partner Labs</h2>
          <p className="text-sm text-slate-500 mt-1">Manage diagnostic center partnerships.</p>
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors">Add New Lab</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 pl-8">Lab Name</th>
              <th className="p-4">Location</th>
              <th className="p-4">Active Tests</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockLabs.map(lab => (
              <tr key={lab.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 pl-8 font-bold text-slate-900">{lab.name}</td>
                <td className="p-4 text-sm text-slate-600">{lab.location}</td>
                <td className="p-4 text-sm font-medium text-emerald-600">{lab.tests} Tests</td>
                <td className="p-4"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-md border border-emerald-200/50">{lab.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderHealthPackages = () => {
    const filtered = healthPackages.filter(p =>
      p.title.toLowerCase().includes(hpSearchQuery.toLowerCase()) ||
      p.organization?.toLowerCase().includes(hpSearchQuery.toLowerCase())
    );
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] overflow-hidden">

          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Health Packages</h2>
              <p className="text-sm text-slate-500 mt-1">{healthPackages.length} packages · {healthPackages.filter(p => p.is_active).length} active</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={hpSearchQuery} onChange={e => setHpSearchQuery(e.target.value)}
                  placeholder="Search packages…"
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-56" />
              </div>
              <button onClick={() => { setIsHpPanelCreate(true); setSelectedHp(null); setHpForm(defaultHpForm); setConfirmDeleteHp(false); setIsHpPanelOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20">
                <Plus size={16} /> New Package
              </button>
            </div>
          </div>

          {/* Table */}
          {isLoadingHealthPackages ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium">No packages found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 pl-8">Title</th>
                    <th className="p-4">Org</th>
                    <th className="p-4">Original Price</th>
                    <th className="p-4">Discount</th>
                    <th className="p-4">Final Price</th>
                    <th className="p-4">Tests</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(pkg => {
                    const fp = Math.round(pkg.price - (pkg.price * pkg.discount_percentage) / 100);
                    return (
                      <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-8">
                          <p className="font-bold text-slate-900 capitalize group-hover:text-emerald-700 transition-colors">{pkg.title}</p>
                          {pkg.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{pkg.description}</p>}
                        </td>
                        <td className="p-4 text-sm text-slate-600">{pkg.organization || '—'}</td>
                        <td className="p-4 text-sm text-slate-500 line-through">₹{pkg.price.toLocaleString('en-IN')}</td>
                        <td className="p-4">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                            {Math.round(pkg.discount_percentage)}% off
                          </span>
                        </td>
                        <td className="p-4 font-extrabold text-emerald-700 text-sm">₹{fp.toLocaleString('en-IN')}</td>
                        <td className="p-4 text-sm text-slate-600">{pkg.included_tests.length}</td>
                        <td className="p-4">
                          <button onClick={() => toggleHpActive(pkg)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${pkg.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
                            {pkg.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                            {pkg.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-4 pr-8 text-right">
                          <button onClick={() => {
                            setSelectedHp(pkg);
                            setIsHpPanelCreate(false);
                            setHpForm({
                              title: pkg.title,
                              organization: pkg.organization || '',
                              description: pkg.description || '',
                              price: String(pkg.price),
                              discount_percentage: String(pkg.discount_percentage),
                              included_tests: pkg.included_tests.join('\n'),
                            });
                            setConfirmDeleteHp(false);
                            setIsHpPanelOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                            <Pencil size={13} /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Slide-in Panel */}
        <AnimatePresence>
          {isHpPanelOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setIsHpPanelOpen(false)} />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-extrabold text-slate-900">{isHpPanelCreate ? 'New Health Package' : 'Edit Package'}</h3>
                  <button onClick={() => setIsHpPanelOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {[
                    { key: 'title', label: 'Title', placeholder: 'e.g. heart package', type: 'text' },
                    { key: 'organization', label: 'Organization', placeholder: 'e.g. Isha', type: 'text' },
                    { key: 'price', label: 'Original Price (₹)', placeholder: '3980', type: 'number' },
                    { key: 'discount_percentage', label: 'Discount %', placeholder: '22.11', type: 'number' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={(hpForm as any)[key]}
                        min={type === 'number' ? 0 : undefined}
                        max={key === 'discount_percentage' ? 100 : undefined}
                        onChange={e => {
                          const val = key === 'discount_percentage'
                            ? Math.min(100, parseFloat(e.target.value) || 0).toString()
                            : e.target.value;
                          setHpForm(p => ({ ...p, [key]: val }));
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  ))}

                  {/* Preview final price */}
                  {hpForm.price && hpForm.discount_percentage && (
                    <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <span className="text-xs font-bold text-slate-500">Final Price Preview</span>
                      <span className="font-extrabold text-emerald-700 text-lg">
                        ₹{Math.round(parseFloat(hpForm.price) - (parseFloat(hpForm.price) * parseFloat(hpForm.discount_percentage)) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                    <textarea rows={2} placeholder="Optional short description…" value={hpForm.description}
                      onChange={e => setHpForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Included Tests <span className="text-slate-400 font-normal normal-case">(one per line)</span></label>
                    <textarea rows={8} placeholder={"FBS/PPBS\nLipid Profile\nHbA1c"} value={hpForm.included_tests}
                      onChange={e => setHpForm(p => ({ ...p, included_tests: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none font-mono" />
                  </div>

                  {/* Delete */}
                  {!isHpPanelCreate && selectedHp && (
                    <div className="pt-2 border-t border-slate-100">
                      {confirmDeleteHp ? (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                          <AlertCircle size={18} className="text-red-500 shrink-0" />
                          <p className="text-sm font-medium text-red-700 flex-1">Permanently delete this package?</p>
                          <button onClick={() => deleteHealthPackage(selectedHp.id)} disabled={isDeletingHp}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-1">
                            {isDeletingHp ? <Loader2 size={12} className="animate-spin" /> : null} Delete
                          </button>
                          <button onClick={() => setConfirmDeleteHp(false)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteHp(true)}
                          className="flex items-center gap-2 text-red-500 text-sm font-bold hover:text-red-600 transition-colors px-2">
                          <Trash2 size={15} /> Delete Package
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 shrink-0">
                  <button onClick={saveHealthPackage} disabled={isSavingHp || !hpForm.title || !hpForm.price || !hpForm.discount_percentage}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSavingHp ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isHpPanelCreate ? 'Create Package' : 'Save Changes'}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderPatients = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Patients Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Overview of all registered patients in the system.</p>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 pl-8">Patient Name</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Joined Date</th>
              <th className="p-4 text-right pr-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingPatients ? (
              <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin text-emerald-500 mx-auto" /></td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No patients registered yet.</td></tr>
            ) : (
              patients.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                        {getInitials(`${p.first_name} ${p.last_name}`)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-slate-400 font-medium">{p.gender} • {p.blood_group || 'Blood Group N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-600">{p.phone_number || 'No Phone Provided'}</td>
                  <td className="p-4 text-sm font-medium text-slate-600">{formatDate(p.created_at)}</td>
                  <td className="p-4 text-right pr-8">
                    <button 
                      onClick={() => handleViewPatientDetails(p.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <Eye size={14} /> View Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Patient Details Modal */}
      <AnimatePresence>
        {isPatientModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPatientModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <h2 className="text-xl font-bold text-slate-900">Patient Details</h2>
                <button onClick={() => setIsPatientModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 sm:p-8">
                {isLoadingPatientDetails ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Loader2 className="animate-spin mb-4 text-emerald-500" size={32} />
                    <p>Loading details...</p>
                  </div>
                ) : selectedPatient ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shrink-0">
                        {getInitials(`${selectedPatient.first_name} ${selectedPatient.last_name}`)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">{selectedPatient.first_name} {selectedPatient.last_name}</h3>
                        <p className="text-emerald-600 font-medium">Patient ID: {selectedPatient.id.substring(0, 8).toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</p>
                        <p className="font-bold text-slate-900">{selectedPatient.gender}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</p>
                        <p className="font-bold text-slate-900">{selectedPatient.date_of_birth ? formatDate(selectedPatient.date_of_birth) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Group</p>
                        <p className="font-bold text-red-500">{selectedPatient.blood_group || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</p>
                        <p className="font-bold text-slate-900">{selectedPatient.phone_number || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Emergency Contact</p>
                        <p className="font-bold text-slate-900">{selectedPatient.emergency_contact || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Address</p>
                        <p className="font-medium text-slate-700">{selectedPatient.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-red-500">Failed to load patient data.</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderPartners = () => {
    const PARTNER_STATUS_COLORS: Record<PartnerApplication['status'], string> = {
      PENDING:   'bg-yellow-50 text-yellow-700 border-yellow-200',
      APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED:  'bg-red-50 text-red-600 border-red-200',
      SUSPENDED: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    const filtered = partnerFilterStatus === 'ALL'
      ? partnerApplications
      : partnerApplications.filter(p => p.status === partnerFilterStatus);
    const totalPages = Math.ceil(filtered.length / partnersPerPage);
    const paginated = filtered.slice((partnerCurrentPage - 1) * partnersPerPage, partnerCurrentPage * partnersPerPage);

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Partners</h2>
            <p className="text-sm text-slate-500 mt-1">Review and manage incoming partnership requests.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const).map(s => (
              <button key={s} onClick={() => { setPartnerFilterStatus(s); setPartnerCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors border ${
                  partnerFilterStatus === s
                    ? s === 'PENDING'   ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                    : s === 'APPROVED'  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : s === 'REJECTED'  ? 'bg-red-100 text-red-600 border-red-300'
                    : s === 'SUSPENDED' ? 'bg-slate-200 text-slate-600 border-slate-300'
                    : 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}>
                {s === 'ALL' ? `All (${partnerApplications.length})` : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 pl-8">Company</th>
                <th className="p-4">Type</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Applied</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingPartners ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin text-emerald-500 mx-auto" /></td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No applications found.</td></tr>
              ) : paginated.map(partner => (
                <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {getInitials(partner.company_name)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{partner.company_name}</p>
                        <p className="text-xs text-slate-400">{partner.contact_person}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md border border-slate-200">
                      {partner.partner_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-600 font-medium">{partner.email}</p>
                    <p className="text-xs text-slate-400">{partner.phone}</p>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-600">{formatDate(partner.created_at)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${PARTNER_STATUS_COLORS[partner.status]}`}>
                      {partner.status}
                    </span>
                  </td>
                  <td className="p-4 text-right pr-8">
                    <button onClick={() => { setSelectedPartner(partner); setIsPartnerPanelOpen(true); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                      <Eye size={14} /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {partnerCurrentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPartnerCurrentPage(p => Math.max(1, p - 1))} disabled={partnerCurrentPage === 1}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPartnerCurrentPage(p => Math.min(totalPages, p + 1))} disabled={partnerCurrentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Partner Detail Panel */}
        <AnimatePresence>
          {isPartnerPanelOpen && selectedPartner && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setIsPartnerPanelOpen(false); setConfirmDeletePartner(false); }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[120] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h2 className="text-lg font-extrabold text-slate-900">Partner Details</h2>
                  <button onClick={() => { setIsPartnerPanelOpen(false); setConfirmDeletePartner(false); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shrink-0">
                      {getInitials(selectedPartner.company_name)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{selectedPartner.company_name}</h3>
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${PARTNER_STATUS_COLORS[selectedPartner.status]}`}>
                        {selectedPartner.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    {[
                      { label: 'Contact Person', value: selectedPartner.contact_person, icon: <Briefcase size={14} /> },
                      { label: 'Partner Type', value: selectedPartner.partner_type, icon: <Tag size={14} /> },
                      { label: 'Email', value: selectedPartner.email, icon: <Mail size={14} />, span: true },
                      { label: 'Phone', value: selectedPartner.phone, icon: <Phone size={14} /> },
                      { label: 'Applied On', value: formatDate(selectedPartner.created_at), icon: <CalendarDays size={14} /> },
                      { label: 'Address', value: selectedPartner.address, icon: <MapPin size={14} />, span: true },
                      ...(selectedPartner.website ? [{ label: 'Website', value: selectedPartner.website, icon: <Globe size={14} />, span: true }] : []),
                    ].map(({ label, value, icon, span }) => (
                      <div key={label} className={span ? 'col-span-2' : ''}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">{icon}{label}</p>
                        <p className="font-semibold text-slate-800 text-sm break-words">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Corporate Coupon Card — visible once approved */}
                  {selectedPartner.status === 'APPROVED' && selectedPartner.coupon_code && (
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag size={12} /> Corporate Coupon
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-2.5 bg-white text-emerald-800 font-black text-base rounded-xl border border-emerald-200 tracking-widest text-center">
                          {selectedPartner.coupon_code}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedPartner.coupon_code!);
                            setCopiedCouponId(selectedPartner.id);
                            setTimeout(() => setCopiedCouponId(null), 1800);
                          }}
                          title="Copy code"
                          className="p-2.5 bg-white border border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shrink-0"
                        >
                          {copiedCouponId === selectedPartner.id
                            ? <CheckCircle2 size={16} className="text-emerald-600" />
                            : <Copy size={16} />}
                        </button>
                      </div>
                      <p className="text-xs text-emerald-700">
                        <span className="font-black">{selectedPartner.discount_percentage ?? 10}%</span> discount · shared with all employees of this organisation
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Update Status</p>

                    {/* Discount % input — shown before approval */}
                    {selectedPartner.status !== 'APPROVED' && (
                      <div className="mb-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Corporate Discount % <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number" min="1" max="100" step="0.01"
                          placeholder="e.g. 15"
                          value={approveDiscountPct}
                          onChange={e => setApproveDiscountPct(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-sm font-bold text-emerald-700"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Required to generate the corporate coupon on approval.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={isUpdatingPartnerStatus || (selectedPartner.status as string) === 'APPROVED' || (!approveDiscountPct && (selectedPartner.status as string) !== 'APPROVED')}
                        onClick={() => approvePartner(selectedPartner.id, parseFloat(approveDiscountPct))}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-colors border disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                          selectedPartner.status === 'APPROVED'
                            ? PARTNER_STATUS_COLORS['APPROVED'] + ' cursor-default'
                            : 'bg-emerald-900 text-white border-emerald-900 hover:bg-emerald-800'
                        }`}
                      >
                        {isUpdatingPartnerStatus && selectedPartner.status !== 'APPROVED'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <CheckCircle2 size={14} />}
                        Approve
                      </button>
                      <button
                        disabled={isUpdatingPartnerStatus || selectedPartner.status === 'REJECTED'}
                        onClick={() => updatePartnerStatus(selectedPartner.id, 'REJECTED')}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-colors border disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                          selectedPartner.status === 'REJECTED'
                            ? PARTNER_STATUS_COLORS['REJECTED'] + ' cursor-default'
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                        }`}
                      >
                        {isUpdatingPartnerStatus && selectedPartner.status !== 'REJECTED'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <XCircle size={14} />}
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    {confirmDeletePartner ? (
                      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                        <AlertCircle size={18} className="text-red-500 shrink-0" />
                        <p className="text-sm font-medium text-red-700 flex-1">Permanently delete this application?</p>
                        <button onClick={() => deletePartner(selectedPartner.id)} disabled={isDeletingPartner}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-1">
                          {isDeletingPartner ? <Loader2 size={12} className="animate-spin" /> : null}
                          Delete
                        </button>
                        <button onClick={() => setConfirmDeletePartner(false)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeletePartner(true)}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                        <Trash2 size={15} /> Delete Application
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderCallbacks = () => {
    const filtered = callbacks.filter(c => callbackStatusFilter === 'ALL' || c.status === callbackStatusFilter);
    const totalPages = Math.ceil(filtered.length / callbacksPerPage);
    const paginated = filtered.slice((callbackCurrentPage - 1) * callbacksPerPage, callbackCurrentPage * callbacksPerPage);
    const pendingCount = callbacks.filter(c => c.status === 'PENDING').length;

    const STATUS_COLORS: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      RESOLVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      IGNORED: 'bg-slate-100 text-slate-500 border-slate-200',
    };

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <PhoneCall className="text-emerald-600" size={28} /> Callback Requests
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {pendingCount > 0 ? (
                <span className="text-amber-600 font-bold">{pendingCount} pending</span>
              ) : (
                'All requests handled'
              )} · {callbacks.length} total
            </p>
          </div>
          <button onClick={fetchCallbacks} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <Activity size={16} /> Refresh
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PENDING', 'RESOLVED', 'IGNORED'] as const).map(s => (
            <button key={s} onClick={() => { setCallbackStatusFilter(s); setCallbackCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
                callbackStatusFilter === s
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {s} {s !== 'ALL' && <span className="ml-1 opacity-70">({callbacks.filter(c => c.status === s).length})</span>}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoadingCallbacks ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
            <PhoneCall size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">No callback requests</h3>
            <p className="text-slate-400 text-sm">Requests submitted from the website will appear here.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-xs">Name</th>
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-xs">Phone</th>
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-xs">Status</th>
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-xs">Submitted</th>
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-xs">Notes</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((cb) => (
                    <React.Fragment key={cb.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{cb.name}</td>
                        <td className="px-6 py-4">
                          <a href={`tel:${cb.phone}`} className="flex items-center gap-1.5 text-emerald-700 font-bold hover:text-emerald-900 transition-colors">
                            <Phone size={14} /> {cb.phone}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${STATUS_COLORS[cb.status]}`}>
                            {cb.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-medium">{formatDate(cb.created_at)}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs max-w-[180px] truncate">
                          {cb.admin_notes || <span className="italic">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {cb.status === 'PENDING' && (
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => setOpenNotesId(openNotesId === cb.id ? null : cb.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors"
                              >
                                + Notes
                              </button>
                              <button
                                onClick={() => updateCallbackStatus(cb.id, 'RESOLVED')}
                                disabled={updatingCallbackId === cb.id}
                                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {updatingCallbackId === cb.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Resolved
                              </button>
                              <button
                                onClick={() => updateCallbackStatus(cb.id, 'IGNORED')}
                                disabled={updatingCallbackId === cb.id}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                              >
                                Ignore
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Inline notes expander */}
                      {openNotesId === cb.id && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="px-6 pb-4 pt-0">
                            <div className="flex gap-3 items-start">
                              <textarea
                                rows={2}
                                placeholder="Add admin notes (optional)..."
                                value={callbackNotes[cb.id] || ''}
                                onChange={(e) => setCallbackNotes(prev => ({ ...prev, [cb.id]: e.target.value }))}
                                className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                              />
                              <div className="flex flex-col gap-2 shrink-0">
                                <button
                                  onClick={() => updateCallbackStatus(cb.id, 'RESOLVED')}
                                  disabled={updatingCallbackId === cb.id}
                                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {updatingCallbackId === cb.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                  Mark Resolved
                                </button>
                                <button
                                  onClick={() => updateCallbackStatus(cb.id, 'IGNORED')}
                                  disabled={updatingCallbackId === cb.id}
                                  className="px-4 py-2 bg-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-300 transition-colors disabled:opacity-50"
                                >
                                  Ignore
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">
                  Showing {(callbackCurrentPage - 1) * callbacksPerPage + 1}–{Math.min(callbackCurrentPage * callbacksPerPage, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setCallbackCurrentPage(p => Math.max(1, p - 1))} disabled={callbackCurrentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setCallbackCurrentPage(p => Math.min(totalPages, p + 1))} disabled={callbackCurrentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderConsultations = () => {
    const statusColors: Record<string, string> = {
      SCHEDULED: 'bg-sky-100 text-sky-700',
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    const typeColors: Record<string, string> = {
      ONLINE: 'bg-violet-50 text-violet-700 border border-violet-100',
      OFFLINE: 'bg-amber-50 text-amber-700 border border-amber-100',
    };
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <ClipboardList className="text-emerald-600" size={22} />
                Consultations
              </h2>
              <p className="text-sm text-slate-500 mt-1">All doctor consultations across the platform. Click a row for details.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const).map(s => (
                <button key={s} onClick={() => { setConsultationStatusFilter(s); setConsultationPage(1); fetchConsultations(1, s); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${consultationStatusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-400'}`}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col p-6 sm:p-8">
            {isLoadingConsultations ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-4">Patient</th>
                      <th className="p-4">Doctor</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Scheduled At</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Booked On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consultations.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">No consultations found.</td></tr>
                    ) : consultations.map((c: any) => (
                      <tr key={c.id} onClick={() => { setSelectedConsultation(c); fetchConsultationDetail(c.id); }}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors">
                        <td className="p-4">
                          {c.patient_user ? (
                            <>
                              <p className="text-sm font-bold text-slate-900">{c.patient_user.patient_profile?.first_name} {c.patient_user.patient_profile?.last_name}</p>
                              <p className="text-xs text-slate-400">{c.patient_user.email}</p>
                            </>
                          ) : <span className="text-sm text-slate-400 font-mono">{c.patient_user_id?.slice(0,8)}…</span>}
                        </td>
                        <td className="p-4">
                          {c.doctor ? (
                            <>
                              <p className="text-sm font-bold text-slate-900">Dr. {c.doctor.first_name} {c.doctor.last_name}</p>
                              <p className="text-xs text-slate-400">{c.doctor.specialization}</p>
                            </>
                          ) : <span className="text-sm text-slate-400 font-mono">{c.doctor_id?.slice(0,8)}…</span>}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${typeColors[c.consultation_type] ?? 'bg-slate-100 text-slate-600'}`}>
                            {c.consultation_type === 'ONLINE' ? <Video size={10} /> : <MapPin size={10} />}
                            {c.consultation_type}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-700 font-medium">
                          {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors[c.status] ?? 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                        </td>
                        <td className="p-4 text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {consultationTotalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500 font-bold">Page {consultationPage} of {consultationTotalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => { const p = Math.max(1, consultationPage-1); setConsultationPage(p); fetchConsultations(p, consultationStatusFilter); }} disabled={consultationPage===1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16}/></button>
                  <button onClick={() => { const p = Math.min(consultationTotalPages, consultationPage+1); setConsultationPage(p); fetchConsultations(p, consultationStatusFilter); }} disabled={consultationPage===consultationTotalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16}/></button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Consultation Detail Panel */}
        <AnimatePresence>
          {selectedConsultation && (
            <div className="fixed inset-0 z-[110] flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedConsultation(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto">

                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60 shrink-0">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Consultation</p>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {selectedConsultation.doctor ? `Dr. ${selectedConsultation.doctor.first_name} ${selectedConsultation.doctor.last_name}` : 'Doctor Consultation'}
                    </h3>
                    <p className="text-sm text-slate-500">{selectedConsultation.doctor?.specialization ?? '—'}</p>
                  </div>
                  <button onClick={() => setSelectedConsultation(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 shrink-0"><X size={20}/></button>
                </div>

                <div className="flex-1 p-6 space-y-5">
                  {/* Status + Type */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${statusColors[selectedConsultation.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {selectedConsultation.status}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${typeColors[selectedConsultation.consultation_type] ?? 'bg-slate-100 text-slate-600'}`}>
                      {selectedConsultation.consultation_type === 'ONLINE' ? <Video size={11}/> : <MapPin size={11}/>}
                      {selectedConsultation.consultation_type}
                    </span>
                  </div>

                  {/* Patient */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</p>
                    {isLoadingConsultationDetail ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={14} className="animate-spin"/> Loading details…</div>
                    ) : consultationDetail?.patient ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="text-emerald-700 font-bold text-sm">{consultationDetail.patient.first_name?.[0]}{consultationDetail.patient.last_name?.[0]}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{consultationDetail.patient.first_name} {consultationDetail.patient.last_name}</p>
                            {selectedConsultation.patient_user?.email && <p className="text-xs text-slate-500">{selectedConsultation.patient_user.email}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
                          {consultationDetail.patient.phone_number && <div className="flex gap-1.5 items-center text-slate-600"><Phone size={12} className="text-slate-400"/>{consultationDetail.patient.phone_number}</div>}
                          {consultationDetail.patient.gender && <div className="text-slate-600"><span className="text-slate-400 text-xs">Gender </span>{consultationDetail.patient.gender}</div>}
                          {consultationDetail.patient.blood_group && <div className="text-slate-600"><span className="text-slate-400 text-xs">Blood </span>{consultationDetail.patient.blood_group}</div>}
                          {consultationDetail.patient.date_of_birth && <div className="text-slate-600"><span className="text-slate-400 text-xs">DOB </span>{consultationDetail.patient.date_of_birth}</div>}
                        </div>
                      </>
                    ) : selectedConsultation.patient_user ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="text-emerald-700 font-bold text-sm">{selectedConsultation.patient_user.patient_profile?.first_name?.[0]}{selectedConsultation.patient_user.patient_profile?.last_name?.[0]}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{selectedConsultation.patient_user.patient_profile?.first_name} {selectedConsultation.patient_user.patient_profile?.last_name}</p>
                          <p className="text-xs text-slate-500">{selectedConsultation.patient_user.email}</p>
                          {selectedConsultation.patient_user.patient_profile?.phone_number && <p className="text-xs text-slate-400">{selectedConsultation.patient_user.patient_profile.phone_number}</p>}
                        </div>
                      </div>
                    ) : <p className="text-sm text-slate-400 font-mono">{selectedConsultation.patient_user_id}</p>}
                  </div>

                  {/* Doctor */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doctor</p>
                    {isLoadingConsultationDetail ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={14} className="animate-spin"/> Loading details…</div>
                    ) : consultationDetail?.doctor ? (
                      <>
                        <p className="font-bold text-slate-900">Dr. {consultationDetail.doctor.first_name} {consultationDetail.doctor.last_name}</p>
                        <p className="text-sm text-emerald-700 font-semibold">{consultationDetail.doctor.specialization}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                          {consultationDetail.doctor.consultation_fee && <div className="text-slate-600"><span className="text-slate-400 text-xs">Fee </span>₹{consultationDetail.doctor.consultation_fee}</div>}
                          {consultationDetail.doctor.license_id && <div className="text-slate-600"><span className="text-slate-400 text-xs">License </span>{consultationDetail.doctor.license_id}</div>}
                          {consultationDetail.doctor.clinic_address && (
                            <div className="col-span-2 flex gap-1.5 items-start text-slate-600"><MapPin size={12} className="text-slate-400 mt-0.5 shrink-0"/>{consultationDetail.doctor.clinic_address}</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="font-bold text-slate-900">Dr. {selectedConsultation.doctor?.first_name} {selectedConsultation.doctor?.last_name} <span className="text-xs text-slate-400 font-normal">· {selectedConsultation.doctor?.specialization}</span></p>
                    )}
                  </div>

                  {/* Booking details */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Details</p>
                    <div className="flex justify-between"><span className="text-slate-500">Scheduled</span><span className="font-bold text-slate-900">{selectedConsultation.scheduled_at ? new Date(selectedConsultation.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Booked On</span><span className="font-semibold text-slate-700">{new Date(selectedConsultation.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                    {selectedConsultation.channel_name && <div className="flex justify-between"><span className="text-slate-500">Channel</span><span className="font-mono text-xs text-slate-600">{selectedConsultation.channel_name}</span></div>}
                    {selectedConsultation.prescription_url && (
                      <a href={selectedConsultation.prescription_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs mt-1 hover:underline">
                        <FileText size={13}/> View Prescription
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  };

  const renderSettings = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] p-6 sm:p-8 max-w-2xl mx-auto">
      <h2 className="text-xl font-extrabold text-slate-900 mb-6">System Settings</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Admin Name</label>
          <input type="text" value={adminName} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none" />
        </div>
        <p className="text-sm text-slate-500">More configuration options coming soon.</p>
      </div>
    </motion.div>
  );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="fixed inset-0 z-[100] flex bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">

        {/* Global Toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -50, x: '-50%' }}
              className={`fixed top-6 left-1/2 z-[500] px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border ${
                toastMsg.type === 'error'
                  ? 'bg-red-950 text-white border-red-800'
                  : 'bg-emerald-950 text-white border-emerald-700'
              }`}
            >
              {toastMsg.type === 'error'
                ? <AlertCircle size={20} className="text-red-400 shrink-0" />
                : <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />}
              <span className="font-bold text-sm">{toastMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        <motion.aside 
          className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-emerald-950 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="h-20 flex items-center px-8 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Activity size={18} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">KnowMyHealth</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-hide">
            <p className="px-4 text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-4 mt-2">Menu</p>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-emerald-900/50 text-white font-medium shadow-inner border border-white/5'
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className={`shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'callbacks' && callbacks.filter(c => c.status === 'PENDING').length > 0 && (
                    <span className="ml-auto text-[10px] font-black bg-amber-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                      {callbacks.filter(c => c.status === 'PENDING').length}
                    </span>
                  )}
                </button>
              );
            })}

            {/* All Bookings — single flat nav item */}
            <button
              onClick={() => { setActiveTab('all-bookings'); setBookingSubTab('all'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                activeTab === 'all-bookings'
                  ? 'bg-emerald-900/50 text-white font-medium shadow-inner border border-white/5'
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <CalendarDays size={20} className={`shrink-0 ${activeTab === 'all-bookings' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="flex-1 text-left">All Bookings</span>
            </button>
          </div>

          <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400/80 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
              <span>Logout Account</span>
            </button>
          </div>
        </motion.aside>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          
          <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-10 shrink-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-bold text-slate-900 hidden sm:block">
                {activeTab === 'all-bookings'
                  ? 'All Bookings'
                  : navItems.find(item => item.id === activeTab)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    {adminName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">System Admin</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 shadow-sm">
                  {getInitials(adminName)}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-slate-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="max-w-[1600px] mx-auto">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  {activeTab === 'dashboard' && renderDashboard()}
                  {activeTab === 'doctors' && renderDoctors()}
                  {activeTab === 'all-bookings' && (
                    <div className="space-y-6">
                      {/* Filter chips */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {bookingSubItems.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setBookingSubTab(s.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                              bookingSubTab === s.id
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                            }`}
                          >
                            <s.icon size={15} />
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {bookingSubTab === 'all' && <div className="space-y-10">{renderTestBookings()}{renderPackageBookings()}{renderConsultations()}</div>}
                      {bookingSubTab === 'test-bookings' && renderTestBookings()}
                      {bookingSubTab === 'package-bookings' && renderPackageBookings()}
                      {bookingSubTab === 'consultations' && renderConsultations()}
                    </div>
                  )}
                  {activeTab === 'lab-tests' && renderLabTests()}
                  {activeTab === 'health-packages' && renderHealthPackages()}
                  {activeTab === 'coupons' && renderCoupons()}
                  {activeTab === 'partners' && renderPartners()}
                  {activeTab === 'patients' && renderPatients()}
                  {activeTab === 'callbacks' && renderCallbacks()}
                  {activeTab === 'blogs' && renderBlogs()}
                  {activeTab === 'settings' && renderSettings()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          <AnimatePresence>
            {isPanelOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsPanelOpen(false)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]"
                />
                <motion.div 
                  initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[120] flex flex-col border-l border-slate-200"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <h2 className="text-xl font-bold text-slate-900">Doctor Profile Review</h2>
                    <button onClick={() => setIsPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                    {isLoadingDetails ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p>Loading details...</p>
                      </div>
                    ) : selectedDoctor ? (
                      <div className="space-y-8">
                        
                        {doctorActionError && (
                          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium">
                            <AlertCircle size={18} />
                            {doctorActionError}
                          </div>
                        )}

                        <div className="flex items-start gap-5">
                          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold shrink-0">
                            {getInitials(`${selectedDoctor.first_name} ${selectedDoctor.last_name}`)}
                          </div>
                          <div className="pt-2">
                            <h3 className="text-2xl font-bold text-slate-900">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</h3>
                            <p className="text-emerald-600 font-semibold">{selectedDoctor.specialization}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                selectedDoctor.status.toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                                selectedDoctor.status.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                                'bg-red-50 text-red-700 border-red-200/50'
                              }`}>
                                {selectedDoctor.status}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                Applied {formatDate(selectedDoctor.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</p>
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              <Mail size={16} className="text-slate-400" /> {selectedDoctor.email}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience</p>
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              <Briefcase size={16} className="text-slate-400" /> {selectedDoctor.years_of_experience} Years
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medical License</p>
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              <ShieldCheck size={16} className="text-slate-400" /> {selectedDoctor.license_id}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation Fee</p>
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              <DollarSign size={16} className="text-slate-400" /> ₹{selectedDoctor.consultation_fee}
                            </p>
                          </div>
                        </div>

                        {selectedDoctor.bio && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Professional Bio</p>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-sm text-slate-700 leading-relaxed">{selectedDoctor.bio}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Attached Documents</p>
                          <button 
                            onClick={() => window.open(selectedDoctor.license_url, '_blank')}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <FileText size={20} />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-slate-900 group-hover:text-emerald-700">Medical_License.pdf</p>
                                <p className="text-xs text-slate-500">Click to view in new tab</p>
                              </div>
                            </div>
                            <ExternalLink size={20} className="text-slate-400 group-hover:text-emerald-600" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-full text-red-500 font-medium">
                        Failed to load details.
                      </div>
                    )}
                  </div>

                  {selectedDoctor && selectedDoctor.status.toLowerCase() === 'pending' && (
                    <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-4 shrink-0">
                      <button 
                        onClick={() => handleRejectDoctor(selectedDoctor.id)}
                        disabled={isApproving || isRejecting}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {isRejecting ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                        Reject
                      </button>
                      <button 
                        onClick={() => handleApproveDoctor(selectedDoctor.id)}
                        disabled={isApproving || isRejecting}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:scale-100 hover:-translate-y-0.5"
                      >
                        {isApproving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Approve Doctor
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>

        {/* Blog Delete Confirmation Modal */}
        <AnimatePresence>
          {blogToDelete && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
                onClick={() => setBlogToDelete(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 size={24} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Delete Blog Post?</h3>
                  <p className="text-sm text-slate-500">This action is permanent and cannot be undone.</p>
                  <div className="flex gap-3 w-full mt-2">
                    <button
                      onClick={() => setBlogToDelete(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { handleDeleteBlog(blogToDelete); setBlogToDelete(null); }}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </ProtectedRoute>
  );
}
