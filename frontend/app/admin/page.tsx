'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, Stethoscope, Building2, 
  Settings, Menu, X, CheckCircle2, XCircle, 
  TrendingUp, LogOut, Sparkles, Activity, CalendarDays,
  ShieldCheck, MapPin, Mail, Clock, FileText, Loader2, ArrowUpRight,
  ExternalLink, Briefcase, DollarSign, ChevronLeft, ChevronRight, Ticket,
  Microscope, Plus, Trash2, AlertCircle, BookOpen, PenTool, Wand2, Tag,
  Image as ImageIcon, UploadCloud, Eye, Search
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

// --- MOCK DATA FOR OTHER TABS ---
const stats = [
  { title: 'Total Patients', value: '24,592', trend: '+14.5%', isUp: true },
  { title: 'Active Doctors', value: '1,843', trend: '+5.2%', isUp: true },
  { title: 'Partner Labs', value: '428', trend: '+1.2%', isUp: true },
  { title: 'Pending Verifications', value: '38', trend: '-12%', isUp: false },
];

const mockLabs = [
  { id: 1, name: 'Apollo Diagnostics', location: 'New York, NY', tests: 145, status: 'Active' },
  { id: 2, name: 'Metropolis Healthcare', location: 'San Francisco, CA', tests: 89, status: 'Active' },
];

const mockPatients = [
  { id: 1, name: 'Alice Cooper', email: 'alice.c@example.com', joined: 'Oct 12, 2023', consults: 4 },
  { id: 2, name: 'Marcus Johnson', email: 'marcus.j@example.com', joined: 'Oct 15, 2023', consults: 1 },
];

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Stethoscope, label: 'Doctors', id: 'doctors' },
  { icon: Microscope, label: 'Diagnostic Tests', id: 'lab-tests' },
  { icon: Ticket, label: 'Coupons', id: 'coupons' },
  { icon: Building2, label: 'Partner Labs', id: 'labs' },
  { icon: Users, label: 'Patients', id: 'patients' },
  { icon: BookOpen, label: 'Blogs & Insights', id: 'blogs' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

export default function AdminPortal() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminName, setAdminName] = useState<string>(''); 
  const { logout } = useAuth();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

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
  const [doctorActionError, setDoctorActionError] = useState<string | null>(null);

  // Lab Tests States
  const [labCategories, setLabCategories] = useState<LabCategory[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [isLoadingLabTests, setIsLoadingLabTests] = useState(false);
  const [labTab, setLabTab] = useState<'tests' | 'categories'>('tests');
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
    price: '', discount_percentage: '', is_active: true
  });
  const [testError, setTestError] = useState<string | null>(null);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);

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

  // --- BLOGS STATES & LOGIC ---
  const [blogTab, setBlogTab] = useState<'list' | 'write' | 'ai'>('list');
  const [blogsList, setBlogsList] = useState<BlogPost[]>([]);
  const [blogCurrentPage, setBlogCurrentPage] = useState(1);
  const blogsPerPage = 10;
  
  const [blogForm, setBlogForm] = useState({ id: '', title: '', category: '', readTime: '', excerpt: '', content: '' });
  const [blogImagePreview, setBlogImagePreview] = useState<string | null>(null);
  const [blogImageFile, setBlogImageFile] = useState<File | null>(null);
  
  const [markdownView, setMarkdownView] = useState<'write' | 'preview' | 'split'>('write');
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

  const [aiBlogForm, setAiBlogForm] = useState({ topic: '', tone: 'Professional & Authoritative', audience: 'General Patients', instructions: '' });
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  const [blogSuccess, setBlogSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDetails();
    fetchAllDoctors();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  useEffect(() => {
    setTestCurrentPage(1);
  }, [testFilterStatus, testSearchQuery]);

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
      const payload = {
        ...testForm,
        results_in: parseInt(testForm.results_in, 10),
        price: parseFloat(testForm.price),
        discount_percentage: parseFloat(testForm.discount_percentage)
      };
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
        setTestForm({ name: '', category_id: '', organization: '', results_in: '', price: '', discount_percentage: '', is_active: true });
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
        alert("Failed to load blog details.");
      }
    } catch (error) {
      console.error("Error fetching blog details", error);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this blog?")) return;
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
      } else {
        alert("Failed to delete blog.");
      }
    } catch(e) {
      console.error(e);
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
      alert("Title and content are required.");
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
        alert(err.message || 'Failed to save blog');
      }
    } catch(e) {
      console.error(e);
      alert("Error saving blog");
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
        alert(result.message || "Failed to generate blog via AI.");
      }
    } catch(e) {
      console.error(e);
      alert("Failed to generate blog via AI. Please check your connection or try again.");
    } finally {
      setIsGeneratingBlog(false);
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
  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] relative overflow-hidden group">
            <p className="text-sm font-medium text-slate-500 mb-2">{stat.title}</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
              <span className={`flex items-center text-sm font-bold mb-1 ${stat.isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {stat.isUp ? <TrendingUp size={16} className="mr-1" /> : <TrendingUp size={16} className="mr-1 rotate-180" />}
                {stat.trend}
              </span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10" />
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-emerald-950 rounded-[2rem] p-8 shadow-xl relative overflow-hidden h-fit">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-teal-500/20 blur-[30px] rounded-full" />
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-emerald-500/20 blur-[30px] rounded-full" />
          <div className="relative z-10 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles size={14} className="text-emerald-300" />
              <span className="text-emerald-100">AI Assistant</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Automate Tasks</h3>
            <p className="text-sm text-emerald-100/70 mb-6">Generate reports, draft partner emails, or analyze platform growth using AI.</p>
            <button className="w-full py-3 bg-white text-emerald-950 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg">
              Open AI Console
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );

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
                                <button onClick={() => setTestToDelete(test.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                  <Trash2 size={18} />
                                </button>
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
                  <input required type="number" min="1" value={testForm.results_in} onChange={e => setTestForm({...testForm, results_in: e.target.value})} placeholder="24" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Base Price (₹)</label>
                    <input required type="number" min="0" step="0.01" value={testForm.price} onChange={e => setTestForm({...testForm, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Discount (%)</label>
                    <input required type="number" min="0" max="100" step="0.01" value={testForm.discount_percentage} onChange={e => setTestForm({...testForm, discount_percentage: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
                  </div>
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
                    <input required type="number" min="1" max="100" step="0.01" value={couponForm.discount_percentage} onChange={e => setCouponForm({...couponForm, discount_percentage: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none font-bold text-emerald-600" />
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
                            onClick={() => handleDeleteBlog(blog.id)}
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

  const renderPatients = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Patients</h2>
          <p className="text-sm text-slate-500 mt-1">Overview of registered patients.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 pl-8">Patient Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Joined Date</th>
              <th className="p-4 text-right pr-8">Consults</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockPatients.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 pl-8 font-bold text-slate-900">{p.name}</td>
                <td className="p-4 text-sm text-slate-600">{p.email}</td>
                <td className="p-4 text-sm text-slate-600">{p.joined}</td>
                <td className="p-4 text-right pr-8 font-bold text-emerald-600">{p.consults}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-emerald-900/50 text-white font-medium shadow-inner border border-white/5' 
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
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
                {navItems.find(item => item.id === activeTab)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    {adminName ? adminName : <span className="opacity-50 text-xs font-normal">Loading...</span>}
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
                  {activeTab === 'lab-tests' && renderLabTests()}
                  {activeTab === 'coupons' && renderCoupons()}
                  {activeTab === 'labs' && renderLabs()}
                  {activeTab === 'patients' && renderPatients()}
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
      </div>
    </ProtectedRoute>
  );
}