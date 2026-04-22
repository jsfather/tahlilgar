
import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { SettingsContext } from '../App';
import { 
  Users, Settings as SettingsIcon, FileText, Download, MessageSquare, 
  BarChart3, LogOut, LogIn, Search, Trash2, DownloadCloud, Plus, X, Save,
  Eye, Monitor, Camera, Palette, ShieldCheck, TrendingUp, Globe, Menu,
  Clock, Lock, Shield, UserPlus, CheckCircle2, UserCircle2, Filter, AlertCircle,
  Video, Image as ImageIcon, ExternalLink, Star, Phone, History, Calendar, Check, Send, Bell,
  User as UserIcon, LifeBuoy, Paperclip, MessageCircle, ChevronLeft, RefreshCw, Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Lead, Download as DownloadType, Stat, User, Testimonial, LeadActivity, FollowUp, SMSTemplate, Ticket, TicketMessage } from '../types';
import toast from 'react-hot-toast';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import RichTextEditor from './RichTextEditor';
import { LeadProfileModal } from './LeadProfileModal';
import Countdown from './Countdown';
import * as XLSX from 'xlsx';
import jalaali from 'jalaali-js';

const MENU_ITEMS = [
  { id: 'stats', label: 'آمار و گزارشات', icon: BarChart3, roles: ['admin', 'expert', 'supervisor', 'editor'] },
  { id: 'accounting', label: 'حسابداری و فیش‌ها', icon: ShieldCheck, roles: ['admin', 'expert', 'supervisor'] },
  { id: 'leads', label: 'بانک سرنخ‌ها', icon: Users, roles: ['admin', 'expert', 'supervisor', 'editor'] },
  { id: 'teams', label: 'مدیریت تیم‌ها', icon: UserCircle2, roles: ['admin', 'supervisor'] },
  { id: 'scheduled_sms', label: 'پیامک زمان‌بندی شده', icon: Clock, roles: ['admin'] },
  { id: 'customers', label: 'مشتریان ما', icon: Users, roles: ['admin', 'expert', 'supervisor'] },
  { id: 'tasks', label: 'کارهای امروز', icon: Calendar, roles: ['expert'] },
  { id: 'announcements', label: 'اعلان‌های سیستم', icon: Bell, roles: ['admin', 'expert', 'supervisor'] },
  { id: 'tickets', label: 'پشتیبانی / تیکت', icon: LifeBuoy, roles: ['admin', 'expert', 'supervisor'] },
  { id: 'content', label: 'محتوای سایت', icon: FileText, roles: ['admin', 'editor'] },
  { id: 'products', label: 'محصولات و خدمات', icon: Star, roles: ['admin', 'editor'] },
  { id: 'fields', label: 'مدیریت فیلدها', icon: Filter, roles: ['admin'] },
  { id: 'testimonials', label: 'رضایت مشتریان', icon: Video, roles: ['admin', 'editor'] },
  { id: 'downloads', label: 'فایل‌های دانلود', icon: Download, roles: ['admin', 'editor'] },
  { id: 'site_settings', label: 'تنظیمات سایت', icon: SettingsIcon, roles: ['admin'] },
  { id: 'sms', label: 'تنظیمات پیامک', icon: MessageSquare, roles: ['admin'] },
  { id: 'admins', label: 'دسترسی‌ها', icon: Shield, roles: ['admin'] },
];

export default function AdminDashboard() {
  const { settings, refreshSettings } = useContext(SettingsContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<typeof MENU_ITEMS[number]['id']>('stats');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [downloads, setDownloads] = useState<DownloadType[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [experts, setExperts] = useState<User[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SMSTemplate[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [customStats, setCustomStats] = useState<any[]>([]);
  const [newCustomStat, setNewCustomStat] = useState({ title: '', count: '' });
  const [accountingStats, setAccountingStats] = useState({ totalSales: 0, productsSales: [], expertSales: [] });
  const [teams, setTeams] = useState<any[]>([]);
  const [scheduledSms, setScheduledSms] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [newTeam, setNewTeam] = useState({ name: '', supervisor_id: 0, id: null as number | null });
  const [newScheduledSms, setNewScheduledSms] = useState({ title: '', message: '', send_after_days: 1, target: 'leads', is_active: 1, id: null as number | null });
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', id: null as number | null, installments_enabled: false });
  const [newField, setNewField] = useState({ name: '', label: '', type: 'text', target: 'registration', is_required: false, options: '', id: null as number | null });

  // Inactivity Logout State
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);
  const [promptTimer, setPromptTimer] = useState(60);

  useEffect(() => {
    if (!isLoggedIn) return;

    const handlePing = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', handlePing);
    window.addEventListener('keydown', handlePing);
    window.addEventListener('scroll', handlePing);
    window.addEventListener('click', handlePing);

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastActivity;
      
      if (diff > 10 * 60 * 1000) { // 10 minutes
        if (!showLogoutPrompt) {
          setShowLogoutPrompt(true);
          setPromptTimer(60);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handlePing);
      window.removeEventListener('keydown', handlePing);
      window.removeEventListener('scroll', handlePing);
      window.removeEventListener('click', handlePing);
      clearInterval(interval);
    };
  }, [isLoggedIn, lastActivity, showLogoutPrompt]);

  useEffect(() => {
    let timer: any;
    if (showLogoutPrompt && promptTimer > 0) {
      timer = setInterval(() => setPromptTimer(p => p - 1), 1000);
    } else if (showLogoutPrompt && promptTimer === 0) {
      handleLogout();
    }
    return () => clearInterval(timer);
  }, [showLogoutPrompt, promptTimer]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', department: 'دپارتمان فروش', priority: 'medium', lead_id: '', content: '', expert_id: '' });
  const [newMessage, setNewMessage] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [reschedulingTask, setReschedulingTask] = useState<FollowUp | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState<DateObject | null>(null);
  const [newAdmin, setNewAdmin] = useState<{id: number | null, username: string, password?: string, role: string, permissions: string[], team_id?: number | null}>({ 
    id: null, username: '', password: '', role: 'expert', permissions: ['leads', 'tasks'], team_id: null 
  });
  const [newDownload, setNewDownload] = useState({ title: '', size: '', link: '' });
  const [newTestimonial, setNewTestimonial] = useState({ title: '', video_link: '', video_type: 'direct' as const, video_cover: '' });
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Lead Creation States
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showBulkLeadModal, setShowBulkLeadModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', surname: '', phone: '', expert: '' });
  const [bulkLeadParams, setBulkLeadParams] = useState({ assignment_mode: 'manual', expert: '' });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState<{ start: DateObject | null, end: DateObject | null }>({ start: null, end: null });
  const [updateStatusOnExport, setUpdateStatusOnExport] = useState(false);
  const [targetExportStatus, setTargetExportStatus] = useState('تخصیص داده شده');
  
  // Bulk Assign State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetExpert, setTargetExpert] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('adminAuth');
    if (auth) {
      try {
        const u = JSON.parse(auth);
        setCurrentUser(u);
        setIsLoggedIn(true);
        axios.defaults.headers.common['x-user-id'] = u.id.toString();
      } catch (e) {
        localStorage.removeItem('adminAuth');
      }
    }
  }, []);

  const fetchLeads = async (customSearch?: string) => {
    try {
      const q = customSearch !== undefined ? customSearch : search;
      let url = `/api/leads?search=${q}`;
      if (currentUser?.role === 'expert') {
        url += `&expert=${currentUser.username}`;
      } else if (currentUser?.role === 'supervisor') {
        url += `&supervisor_id=${currentUser.id}`;
      }
      const res = await axios.get(url);
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchDetails = async (id: number) => {
    try {
      const [lRes, aRes] = await Promise.all([
        axios.get(`/api/leads/${id}`),
        axios.get(`/api/leads/${id}/activities`)
      ]);
      setSelectedLead(lRes.data);
      setActivities(aRes.data);
      setShowLeadDetails(true);
    } catch (err) { toast.error('خطا در دریافت اطلاعات'); }
  };

  const fetchFollowups = async () => {
    try {
      const expertParam = currentUser?.role === 'expert' ? `&expert_id=${currentUser.id}` : '';
      // get YYYY-MM-DD in local timezone
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const day = String(new Date().getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      const res = await axios.get(`/api/followups?date=${today}${expertParam}`);
      setFollowups(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchSmsTemplates = async () => {
    try {
      const res = await axios.get('/api/sms-templates');
      setSmsTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try {
      if (currentUser?.role === 'expert' || currentUser?.role === 'supervisor') {
        const param = currentUser.role === 'supervisor' ? `supervisor_id=${currentUser.id}` : `expert_id=${currentUser.id}&username=${currentUser.username}`;
        const res = await axios.get(`/api/stats?${param}`);
        const data = res.data;
        setStats([
          { label: 'کل لیدهای تخصیص یافته', value: data.totalLeads, icon: Users, color: 'blue' },
          { label: 'مشتریان نهایی شده', value: data.convertedLeads, icon: ShieldCheck, color: 'emerald' },
          { label: 'پیگیری‌های امروز', value: data.todayFollowups, icon: Calendar, color: 'amber' },
        ] as any);
      } else {
        const res = await axios.get('/api/stats');
        setStats(res.data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchTeams = async () => {
    try {
      const res = await axios.get('/api/teams');
      setTeams(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchScheduledSms = async () => {
    try {
      const res = await axios.get('/api/scheduled-sms');
      setScheduledSms(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`/api/announcements?user_id=${currentUser?.id}`);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchAccountingStats = async () => {
    try {
      let url = '/api/accounting/stats';
      if (currentUser?.role === 'expert') {
        url += `?expert_id=${currentUser.id}`;
      } else if (currentUser?.role === 'supervisor') {
        url += `?supervisor_id=${currentUser.id}`;
      }
      const res = await axios.get(url);
      setAccountingStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchDeposits = async () => {
    try {
      const expertParam = currentUser?.role === 'expert' ? `?expert_id=${currentUser.id}` : '';
      const res = await axios.get(`/api/deposits${expertParam}`);
      setDeposits(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const handleUpdateDepositStatus = async (id: number, status: string, reason?: string) => {
    try {
      await axios.patch(`/api/deposits/${id}/status`, { status, rejection_reason: reason });
      fetchDeposits();
      fetchAccountingStats();
      toast.success('وضعیت فیش بروزرسانی شد');
    } catch (err) { toast.error('خطا در بروزرسانی وضعیت'); }
  };
  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement) return;
    try {
      await axios.post('/api/announcements', { user_id: currentUser?.id, content: newAnnouncement });
      setNewAnnouncement('');
      fetchAnnouncements();
      toast.success('اعلان با موفقیت ثبت شد');
    } catch (err) { toast.error('خطا در ثبت اعلان'); }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('آیا از حذف این اعلان مطمئن هستید؟')) return;
    try {
      await axios.delete(`/api/announcements/${id}`);
      fetchAnnouncements();
      toast.success('اعلان حذف شد');
    } catch (err) { toast.error('خطا در حذف اعلان'); }
  };

  const fetchDownloads = async () => {
    try {
      const res = await axios.get('/api/downloads');
      setDownloads(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchTestimonials = async () => {
    try {
      const res = await axios.get('/api/testimonials');
      setTestimonials(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchCustomFields = async () => {
    try {
      const res = await axios.get('/api/custom-fields');
      setCustomFields(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name) return;
    try {
      await axios.post('/api/products', newProduct);
      setNewProduct({ name: '', description: '', price: '', id: null, installments_enabled: false });
      fetchProducts();
      toast.success('محصول با موفقیت ذخیره شد');
    } catch (err) { toast.error('خطا در ذخیره محصول'); }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
    try {
      await axios.delete(`/api/products/${id}`);
      fetchProducts();
      toast.success('محصول حذف شد');
    } catch (err) { toast.error('خطا در حذف محصول'); }
  };

  const handleSaveField = async () => {
    if (!newField.name || !newField.label) return;
    try {
      await axios.post('/api/custom-fields', newField);
      setNewField({ name: '', label: '', type: 'text', target: 'registration', is_required: false, options: '', id: null });
      fetchCustomFields();
      toast.success('فیلد با موفقیت ذخیره شد');
    } catch (err) { toast.error('خطا در ذخیره فیلد'); }
  };

  const handleDeleteField = async (id: number) => {
    if (!confirm('آیا از حذف این فیلد مطمئن هستید؟')) return;
    try {
      await axios.delete(`/api/custom-fields/${id}`);
      fetchCustomFields();
      toast.success('فیلد حذف شد');
    } catch (err) { toast.error('خطا در حذف فیلد'); }
  };

  const exportToExcel = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
      toast.error('داده‌ای برای خروجی وجود ندارد');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    toast.success('فایل اکسل با موفقیت ایجاد شد');
  };

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('/api/admins');
      const data = Array.isArray(res.data) ? res.data : [];
      setAdmins(data);
      // Filter experts
      const exps = data.filter((u: any) => u.role === 'expert' || u.role === 'admin');
      setExperts(exps);
    } catch (err) { console.error(err); }
  };

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`/api/tickets?user_id=${currentUser?.id}&role=${currentUser?.role}`);
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchTicketMessages = async (ticketId: number) => {
    try {
      const res = await axios.get(`/api/tickets/${ticketId}/messages`);
      setTicketMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const getSolarDate = () => {
    const j = jalaali.toJalaali(new Date());
    const weekDays = ['یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return `${weekDays[new Date().getDay()]} ${j.jd} ${months[j.jm - 1]} ${j.jy}`;
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صبحت بخیر";
    if (hour < 17) return "ظهرت بخیر";
    return "شبت بخیر";
  };

  useEffect(() => {
    if (isLoggedIn) {
      if (activeTab === 'leads') {
        fetchLeads();
        if (currentUser?.role === 'admin') fetchAdmins();
      }
      if (activeTab === 'stats') fetchStats();
      if (activeTab === 'downloads') fetchDownloads();
      if (activeTab === 'testimonials') fetchTestimonials();
      if (activeTab === 'products') fetchProducts();
      if (activeTab === 'fields') fetchCustomFields();
      if (activeTab === 'admins' && currentUser?.role === 'admin') fetchAdmins();
      if (activeTab === 'tasks') {
        fetchFollowups();
        setReschedulingTask(null);
      }
      if (activeTab === 'sms') fetchSmsTemplates();
      if (activeTab === 'tickets') {
        fetchTickets();
        fetchAdmins();
      }
      if (activeTab === 'announcements') fetchAnnouncements();
      if (activeTab === 'content') {
        axios.get('/api/custom-stats').then(res => setCustomStats(res.data)).catch(console.error);
      }
      if (activeTab === 'accounting') {
        fetchDeposits();
        fetchAccountingStats();
      }
    }
  }, [isLoggedIn, activeTab, search, currentUser]);

  useEffect(() => {
    setSearch('');
    setSelectedLeads([]);
  }, [activeTab]);

  useEffect(() => {
    const container = document.getElementById('chat-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [ticketMessages, selectedTicket]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.get('/api/admins');
      const allAdmins = res.data;
      let userToLog = null;
      
      if (loginData.username === 'admin' && loginData.password === 'admin123') {
        userToLog = { id: 1, username: 'admin', role: 'admin', permissions: JSON.stringify(MENU_ITEMS.map(m => m.id)) };
      } else {
        const staff = allAdmins.find((a: any) => a.username === loginData.username);
        // In this demo we accept any password for other admins for simplicity as per previous code
        if (staff) userToLog = staff;
      }

      if (userToLog) {
        setCurrentUser(userToLog);
        setIsLoggedIn(true);
        localStorage.setItem('adminAuth', JSON.stringify(userToLog));
        await axios.post('/api/auth/log', { user_id: userToLog.id, type: 'login' });
        toast.success(`خوش آمدید، ${userToLog.username}`);
      } else {
        toast.error('نام کاربری یا رمز عبور اشتباه است');
      }
    } catch (e) {
      toast.error('خطا در برقراری ارتباط با سرور');
    }
  };

  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
       const beat = () => axios.post('/api/heartbeat', { userId: currentUser.id });
       beat(); // initial
       const interval = setInterval(beat, 60000);
       return () => clearInterval(interval);
    }
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (activeTab === 'stats' && currentUser?.role === 'admin') {
      const fetchOnline = () => axios.get('/api/online-users').then(res => setOnlineUsers(res.data));
      fetchOnline();
      const interval = setInterval(fetchOnline, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser]);

  const fetchUserProfile = async (id: number) => {
    try {
      const res = await axios.get(`/api/user-profile/${id}`);
      setSelectedUserProfile(res.data);
      setShowUserProfile(true);
    } catch (err) {
      toast.error('خطا در دریافت اطلاعات پروفایل');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
       await axios.post('/api/auth/log', { user_id: currentUser.id, type: 'logout' });
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('adminAuth');
    toast.success('خارج شدید');
  };

  const handleMarkAsCustomer = async (id: number) => {
    try {
      await axios.post(`/api/leads/${id}/status`, { status: 'مشتری' });
      fetchLeads();
      toast.success('وضعیت به مشتری تغییر یافت');
    } catch (err) { toast.error('خطا در تغییر وضعیت'); }
  };

  const handleBulkAssign = async () => {
    if (!targetExpert) return toast.error('نام کارشناس را وارد کنید');
    try {
      await axios.post('/api/leads/bulk-assign', { ids: selectedLeads, expert: targetExpert });
      setShowAssignModal(false);
      setSelectedLeads([]);
      fetchLeads();
      toast.success('لیدها با موفقیت تخصیص داده شدند');
    } catch (err) { toast.error('خطا در تخصیص'); }
  };

  const hasPermission = (tabId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    try {
      const perms = JSON.parse(currentUser.permissions);
      return Array.isArray(perms) && perms.includes(tabId);
    } catch (e) { return false; }
  };

  const handleSaveCustomStat = async () => {
    if(!newCustomStat.title || !newCustomStat.count) return;
    await axios.post('/api/custom-stats', newCustomStat);
    setNewCustomStat({ title: '', count: '' });
    axios.get('/api/custom-stats').then(res => setCustomStats(res.data));
    toast.success('آیتم جدید اضافه شد');
  };

  const handleDeleteCustomStat = async (id: number) => {
    if(!confirm('آیا از حذف این مورد آمار مطمئن هستید؟')) return;
    await axios.delete(`/api/custom-stats/${id}`);
    axios.get('/api/custom-stats').then(res => setCustomStats(res.data));
    toast.success('آیتم حذف شد');
  };

  const handleSaveSettings = async (directUpdates?: any) => {
    try {
      const data = directUpdates || localSettings;
      await axios.post('/api/settings', data);
      refreshSettings();
      if (directUpdates) {
        setLocalSettings(prev => ({ ...prev, ...directUpdates }));
      }
      toast.success('تنظیمات با موفقیت ذخیره شد');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'خطا در ذخیره تنظیمات';
      toast.error(msg);
    }
  };

  const handleDeleteLead = async (id: number) => {
    if (!window.confirm('آیا از حذف این لید مطمئن هستید؟')) return;
    try {
      console.log('Attempting to delete lead:', id);
      await axios.delete(`/api/leads/${id}`);
      fetchLeads();
      toast.success('لید حذف شد');
    } catch (err) { 
      console.error('Delete error:', err);
      toast.error('خطا در حذف'); 
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm('آیا از حذف دسته‌جمعی موارد انتخاب شده مطمئن هستید؟')) return;
    try {
      console.log('Attempting bulk delete:', selectedLeads);
      await axios.post('/api/leads/bulk-delete', { ids: selectedLeads });
      setSelectedLeads([]);
      fetchLeads();
      toast.success('موارد انتخاب شده حذف شدند');
    } catch (err) { 
      console.error('Bulk delete error:', err);
      toast.error('خطا در حذف'); 
    }
  };

  const handleAddSingleLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.phone) return toast.error('شماره موبایل الزامی است');
    try {
      await axios.post('/api/leads/create', newLeadForm);
      toast.success('لید با موفقیت ثبت شد');
      setShowAddLeadModal(false);
      setNewLeadForm({ name: '', surname: '', phone: '', expert: '' });
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'خطا در ثبت لید');
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return toast.error('فایلی انتخاب نشده است');
    setIsProcessingBulk(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('assignment_mode', bulkLeadParams.assignment_mode);
      if (bulkLeadParams.assignment_mode === 'manual') {
        formData.append('expert', bulkLeadParams.expert);
      }

      const res = await axios.post('/api/leads/bulk-upload', formData);
      toast.success(`${res.data.count} لید با موفقیت وارد شد (${res.data.skipped} مورد تکراری یا ناقص رد شد)`);
      setShowBulkLeadModal(false);
      setBulkFile(null);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'خطا در آپلود');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newTeam.id) {
        await axios.put(`/api/teams`, newTeam);
        toast.success('تیم با موفقیت بروزرسانی شد');
      } else {
        await axios.post('/api/teams', newTeam);
        toast.success('تیم جدید با موفقیت ثبت شد');
      }
      setNewTeam({ name: '', supervisor_id: 0, id: null });
      fetchTeams();
    } catch (err: any) { toast.error('خطا در ثبت تیم'); }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!window.confirm('آیا از حذف این تیم مطمئن هستید؟')) return;
    try {
      await axios.delete(`/api/teams/${id}`);
      fetchTeams();
      toast.success('تیم حذف شد');
    } catch (err) { toast.error('خطا در حذف تیم'); }
  };

  const handleSaveScheduledSms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newScheduledSms.id) {
        await axios.put(`/api/scheduled-sms/${newScheduledSms.id}`, newScheduledSms);
      } else {
        await axios.post('/api/scheduled-sms', newScheduledSms);
      }
      toast.success('ذخیره شد');
      setNewScheduledSms({ title: '', message: '', send_after_days: 1, target: 'leads', is_active: 1, id: null });
      fetchScheduledSms();
    } catch (err) { toast.error('خطا در ذخیره'); }
  };

  const handleDeleteScheduledSms = async (id: number) => {
    if (!window.confirm('حذف شود؟')) return;
    try {
      await axios.delete(`/api/scheduled-sms/${id}`);
      fetchScheduledSms();
    } catch (err) { toast.error('خطا'); }
  };

  const isOnline = (lastActive?: string) => {
    if (!lastActive) return false;
    const diff = Date.now() - new Date(lastActive).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
  };

  const downloadLeadTemplate = () => {
    const data = [
      { name: 'نام', surname: 'نام خانوادگی', phone: 'شماره موبایل' },
      { name: 'مثال: علی', surname: 'رضایی', phone: '09121234567' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "lead_template.xlsx");
  };

  const handleAddDownload = async () => {
    if (!newDownload.title || !newDownload.link) return;
    try {
      await axios.post('/api/downloads', newDownload);
      setNewDownload({ title: '', size: '', link: '' });
      fetchDownloads();
      toast.success('فایل اضافه شد');
    } catch (err) { toast.error('خطا در افزودن فایل'); }
  };

  const handleDeleteDownload = async (id: number) => {
    try {
      await axios.delete(`/api/downloads/${id}`);
      fetchDownloads();
      toast.success('فایل حذف شد');
    } catch (err) { toast.error('خطا در حذف'); }
  };

  const handleAddTestimonial = async () => {
    if (!newTestimonial.title || !newTestimonial.video_link) return;
    try {
      await axios.post('/api/testimonials', newTestimonial);
      setNewTestimonial({ title: '', video_link: '', video_type: 'direct', video_cover: '' });
      fetchTestimonials();
      toast.success('ویدیو رضایت مشتری اضافه شد');
    } catch (err) { toast.error('خطا در افزودن ویدیو'); }
  };

  const handleDeleteTestimonial = async (id: number) => {
    try {
      await axios.delete(`/api/testimonials/${id}`);
      fetchTestimonials();
      toast.success('ویدیو رضایت مشتری حذف شد');
    } catch (err) { toast.error('خطا در حذف'); }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.username) return;
    try {
      await axios.post('/api/admins', { 
        ...newAdmin, 
        permissions: JSON.stringify(newAdmin.permissions) 
      });
      setNewAdmin({ id: null, username: '', password: '', role: 'editor', permissions: ['stats', 'leads'] });
      fetchAdmins();
      toast.success('تغییرات ادمین ذخیره شد');
    } catch (err) { toast.error('خطا در ذخیره ادمین'); }
  };

  const togglePermission = (perm: string) => {
    setNewAdmin(prev => {
      const perms = prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: perms };
    });
  };

  const handleExportWithFilters = async () => {
    try {
      let url = '/api/leads?';
      if (exportRange.start) url += `startDate=${exportRange.start.toDate().toISOString()}&`;
      if (exportRange.end) url += `endDate=${exportRange.end.toDate().toISOString()}&`;
      
      const res = await axios.get(url);
      const dataToExport = res.data;

      if (dataToExport.length === 0) {
        toast.error('در این بازه زمانی لیدی ثبت نشده است');
        return;
      }

      // Update status if requested
      if (updateStatusOnExport) {
        const ids = dataToExport.map((l: any) => l.id);
        await axios.post('/api/leads/bulk-status', { ids, status: targetExportStatus });
        fetchLeads();
      }

      // Generate CSV
      const headers = ["ID", "نام", "نام خانوادگی", "موبایل", "وضعیت", "کارشناس", "تاریخ", "منبع"];
      const rows = dataToExport.map((l: any) => [
        l.id, l.name, l.surname, l.phone, l.status, l.expert || '-', 
        new Date(l.created_at).toLocaleString('fa-IR'), l.form_id
      ]);
      
      let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map((r: any) => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.setAttribute("href", urlBlob);
      link.setAttribute("download", `leads_export_${new Date().toLocaleDateString('fa-IR')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowExportModal(false);
      toast.success('فایل خروجی با موفقیت آماده شد');
    } catch (e) {
      toast.error('خطا در استخراج اطلاعات');
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm('آیا از حذف این دسترسی مطمئن هستید؟')) return;
    try {
      await axios.delete(`/api/admins/${id}`);
      fetchAdmins();
      toast.success('دسترسی حذف شد');
    } catch (err) { toast.error('خطا در حذف'); }
  };

  const exportCSV = () => {
    const headers = ["ID", "Name", "Surname", "Phone", "Date", "Source"];
    const validLeads = Array.isArray(leads) ? leads : [];
    const rows = validLeads.map(l => [l.id, l.name, l.surname, l.phone, l.created_at, l.form_id]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success('فایل خروجی آماده شد');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex p-4 rounded-full bg-blue-100 text-blue-600 mb-4">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-2xl font-black">ورود به پنل مدیریت</h2>
            <p className="text-gray-500">برای دسترسی به تنظیمات وارد شوید</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" 
              placeholder="نام کاربری"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={loginData.username}
              onChange={(e) => setLoginData({...loginData, username: e.target.value})}
            />
            <input 
              type="password" 
              placeholder="رمز عبور"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
              ورود به سیستم
            </button>
          </form>
        </div>
      </div>
    );
  }

  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => {
        setActiveTab(id as any);
        setIsSidebarOpen(false);
      }}
      className={`flex items-center gap-3 px-6 py-4 w-full text-right transition-all font-bold ${activeTab === id ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-dana">
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 bg-white border border-gray-200 rounded-xl shadow-xl text-gray-700"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 right-0 z-50 w-64 bg-white border-l border-gray-200 flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-blue-600">پنل مدیریت</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mt-1">
              <Shield size={10} />
              <span>{currentUser?.username} ({currentUser?.role === 'admin' ? 'مدیر کل' : 'دسترسی محدود'})</span>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <nav className="flex-grow py-4 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const currentRole = currentUser?.role || 'expert';
            const itemRoles = (item.roles as unknown as string[]);
            const hasRole = currentUser?.role === 'admin' || itemRoles.includes(currentRole);
            const hasPerm = hasPermission(item.id);
            if (hasRole || hasPerm) {
              return <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} />;
            }
            return null;
          })}
        </nav>
        <button 
          onClick={handleLogout}
          className="p-6 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100 font-bold"
        >
          <LogOut size={20} />
          <span>خروج از پنل</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-grow transition-all duration-300 w-full lg:mr-64 p-4 md:p-8`}>
        <div className="max-w-6xl mx-auto space-y-8 pt-12 lg:pt-0">
          
          <div className="flex flex-col md:flex-row items-center justify-between bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <UserIcon size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900">{getTimeGreeting()}، {currentUser?.username}</h3>
                <p className="text-xs text-gray-400 font-bold">{currentUser?.role === 'admin' ? 'مدیر ارشد سامانه' : 'کارشناس فروش'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
              <Calendar size={18} className="text-primary" />
              <span className="text-sm font-bold text-gray-600">{getSolarDate()}</span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-black">
              {activeTab === 'stats' && "داشبورد تحلیلی"}
              {activeTab === 'accounting' && "حسابداری و تایید فیش‌ها"}
              {activeTab === 'leads' && "بانک اطلاعاتی سرنخ‌ها"}
              {activeTab === 'customers' && "مدیریت مشتریان"}
              {activeTab === 'tasks' && "پیگیری‌های امروز"}
              {activeTab === 'tickets' && "مرکز پشتیبانی"}
              {activeTab === 'content' && "مدیریت محتوای سایت"}
              {activeTab === 'products' && "محصولات و خدمات شرکت"}
              {activeTab === 'fields' && "مدیریت فیلدهای اختصاصی"}
              {activeTab === 'testimonials' && "رضایت مشتریان"}
              {activeTab === 'downloads' && "فایل‌های پیوست"}
              {activeTab === 'sms' && "تنظیمات سامانه پیامک"}
              {activeTab === 'site_settings' && "تنظیمات کلی و سئو"}
              {activeTab === 'admins' && "مدیریت مدیران و دسترسی"}
            </h1>
            <div className="flex gap-2 w-full sm:w-auto">
               {activeTab !== 'stats' && activeTab !== 'leads' && activeTab !== 'downloads' && activeTab !== 'testimonials' && activeTab !== 'admins' && (
                 <button onClick={() => handleSaveSettings()} className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                    <Save size={18} />
                    <span>ذخیره</span>
                 </button>
               )}
               <a href="/" className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-600 px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all text-sm">
                  <Eye size={18} />
                  <span>مشاهده</span>
               </a>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-4 md:p-8">
            {activeTab === 'accounting' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-500/20">
                       <p className="text-emerald-100 font-bold text-sm mb-2 opacity-80 underline underline-offset-4 decoration-emerald-300">کل فروش تایید شده</p>
                       <h4 className="text-3xl font-black">{(accountingStats.totalSales || 0).toLocaleString()} <span className="text-sm font-medium">تومان</span></h4>
                    </div>
                    <div className="md:col-span-2 bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm">
                       <h5 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                         <Star size={20} className="text-amber-500" />
                         فروش به تفکیک محصول
                       </h5>
                       <div className="flex flex-wrap gap-3">
                          {accountingStats.productsSales.map((ps: any, i: number) => (
                            <div key={i} className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl">
                               <p className="text-[10px] text-gray-400 font-bold">{ps.name}</p>
                               <p className="font-black text-blue-600">{(ps.total || 0).toLocaleString()} تومان</p>
                            </div>
                          ))}
                          {accountingStats.productsSales.length === 0 && <p className="text-gray-400 text-sm font-bold">داده‌ای یافت نشد.</p>}
                       </div>
                    </div>
                 </div>

                 {currentUser?.role === 'admin' && (
                   <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm">
                      <h5 className="font-black text-gray-900 mb-6 flex items-center gap-2">
                        <Users size={20} className="text-blue-500" />
                        عملکرد کارشناسان (فروش تایید شده)
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                         {accountingStats.expertSales.map((es: any, i: number) => (
                           <div key={i} className="bg-blue-50/30 border border-blue-100 p-4 rounded-2xl">
                              <p className="font-black text-gray-900 mb-1">{es.username}</p>
                              <div className="flex justify-between items-end">
                                 <p className="text-[10px] text-blue-600 font-black">{(es.total || 0).toLocaleString()} تومان</p>
                                 <span className="text-[8px] bg-white px-2 py-0.5 rounded-full text-gray-400 font-bold uppercase">Rank {i+1}</span>
                              </div>
                           </div>
                         ))}
                         {accountingStats.expertSales.length === 0 && <p className="text-gray-400 text-sm font-bold">داده‌ای یافت نشد.</p>}
                      </div>
                   </div>
                 )}

                 <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-4 md:p-8">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-black flex items-center gap-2 text-right">
                          <CheckCircle2 size={24} className="text-blue-600" />
                          مدیریت فیش‌های واریزی
                       </h3>
                    </div>
                    <div className="overflow-x-auto">
                       <table className="w-full text-right border-collapse">
                          <thead>
                             <tr className="border-b border-gray-100">
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">مشتری</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">محصول</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">مبلغ (تومان)</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">تاریخ</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">وضعیت</th>
                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">عملیات</th>
                             </tr>
                          </thead>
                          <tbody>
                             {deposits.map(d => (
                               <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all font-medium group">
                                  <td className="p-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-black">
                                           {d.lead_name?.[0]}{d.lead_surname?.[0]}
                                        </div>
                                        <div>
                                           <p className="text-gray-900 font-black text-sm">{d.lead_name} {d.lead_surname}</p>
                                           <p className="text-[10px] text-gray-400 font-bold">توسط: {d.expert_name || '-'}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="p-4 text-sm font-bold text-gray-600">{d.product_name}</td>
                                  <td className="p-4 text-sm font-black text-blue-600">{(parseInt(d.amount) || 0).toLocaleString()}</td>
                                  <td className="p-4 text-[10px] font-mono text-gray-400">{new Date(d.payment_date).toLocaleDateString('fa-IR')}</td>
                                  <td className="p-4">
                                     <div className="flex flex-col gap-2">
                                       <span className={`px-3 py-1 rounded-full text-[10px] font-black text-center ${
                                          d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                          d.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                       }`}>
                                          {d.status === 'approved' ? 'تایید شده' : d.status === 'rejected' ? 'رد شده' : 'در انتظار'}
                                       </span>
                                       {d.status === 'rejected' && d.rejection_reason && (
                                         <p className="text-[8px] text-red-400 font-bold max-w-[100px] truncate" title={d.rejection_reason}>علت: {d.rejection_reason}</p>
                                       )}
                                     </div>
                                  </td>
                                  <td className="p-4">
                                     <div className="flex items-center justify-center gap-2">
                                        <div className="flex -space-x-2 rtl:space-x-reverse items-center">
                                           {(JSON.parse(d.receipt_urls || '[]') as string[]).map((url, i) => (
                                             <a key={i} href={url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-gray-100 hover:z-10 transition-all">
                                                <img src={url} className="w-full h-full object-cover" alt="فیش" referrerPolicy="no-referrer" />
                                             </a>
                                           ))}
                                        </div>
                                        {currentUser?.role === 'admin' && d.status === 'pending' && (
                                          <div className="flex gap-1 pr-2 border-r border-gray-100 mr-2">
                                             <button 
                                               onClick={() => handleUpdateDepositStatus(d.id, 'approved')}
                                               className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                               title="تایید"
                                             >
                                                <Check size={18} />
                                             </button>
                                             <button 
                                               onClick={() => {
                                                 const r = prompt('علت رد فیش را وارد کنید (مثلاً: تصویر ناخوانا، مبلغ اشتباه و...):');
                                                 if (r !== null) handleUpdateDepositStatus(d.id, 'rejected', r);
                                               }}
                                               className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                               title="عدم تایید"
                                             >
                                                <X size={18} />
                                             </button>
                                          </div>
                                        )}
                                     </div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                       {deposits.length === 0 && <div className="text-center py-20 text-gray-400 font-bold">هیچ فیشی تاکنون ثبت نشده است.</div>}
                    </div>
                 </div>
              </div>
            )}
            {activeTab === 'stats' && (
              <div className="space-y-8">
                {currentUser?.role === 'expert' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {Array.isArray(stats) && stats.map((s: any, idx) => (
                      <StatCard key={idx} label={s.label} value={s.value} icon={s.icon} color={s.color} />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      <StatCard label="بازدید کل" value={(stats as any).summary?.find((s: any) => s.label === 'بازدید کل')?.value || 0} icon={Users} color="blue" />
                      <StatCard label="بازدید امروز" value={(stats as any).summary?.find((s: any) => s.label === 'بازدید امروز')?.value || 0} icon={TrendingUp} color="emerald" />
                      <StatCard label="سرنخ‌های کل" value={leads.length} icon={ShieldCheck} color="amber" />
                      <StatCard label="پیگیری‌های باز" value={followups.length} icon={Calendar} color="purple" />
                    </div>
                    <div className="grid lg:grid-cols-3 gap-8">
                       <div className="lg:col-span-2 h-[300px] md:h-[400px] w-full bg-gray-50 rounded-2xl p-2 md:p-4 border border-gray-100">
                         <h3 className="text-base md:text-lg font-bold mb-6 flex items-center gap-2">
                           <BarChart3 size={20} className="text-blue-500" />
                           نمودار بازدید ۳۰ روز اخیر
                         </h3>
                         <div className="w-full h-[250px] md:h-full">
                           <ResponsiveContainer width="100%" height="90%">
                             <LineChart data={(stats as any).timeline || []}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                               <XAxis dataKey="date" stroke="#999" fontSize={10} tickMargin={10} />
                               <YAxis stroke="#999" fontSize={10} tickMargin={10} />
                               <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', direction: 'rtl' }} />
                               <Line type="monotone" dataKey="visits" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                             </LineChart>
                           </ResponsiveContainer>
                         </div>
                       </div>
                       
                       <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col h-[400px]">
                          <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-gray-700">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                             افراد آنلاین در سیستم
                          </h3>
                          <div className="divide-y divide-gray-50 overflow-y-auto pr-2 custom-scrollbar">
                             {onlineUsers.map(u => (
                               <div key={u.id} className="py-3 flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <UserIcon size={18} />
                                     </div>
                                     <div>
                                        <p className="text-sm font-bold text-gray-900">{u.username}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{u.role}</p>
                                     </div>
                                  </div>
                                  <button onClick={() => fetchUserProfile(u.id)} className="p-2 text-gray-300 hover:text-blue-500 transition-colors">
                                     <ChevronLeft size={20} />
                                  </button>
                               </div>
                             ))}
                             {onlineUsers.length === 0 && <p className="text-center py-10 text-gray-300 text-xs font-bold">هیچ کاربری آنلاین نیست</p>}
                          </div>
                       </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <UserCircle2 size={24} className="text-blue-600" />
                    مدیریت تیم‌ها و کارشناسان
                  </h3>
                  <form onSubmit={handleSaveTeam} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl">
                    <div>
                      <label className="block text-xs font-black text-gray-400 mb-2">نام تیم</label>
                      <input 
                        type="text" 
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                        value={newTeam.name}
                        onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                        placeholder="مثلاً: تیم فروش شمال"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 mb-2">سرپرست تیم</label>
                      <select 
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                        value={newTeam.supervisor_id}
                        onChange={e => setNewTeam({...newTeam, supervisor_id: Number(e.target.value)})}
                      >
                        <option value={0}>انتخاب سرپرست...</option>
                        {admins.filter(a => a.role === 'supervisor' || a.role === 'admin').map(a => (
                          <option key={a.id} value={a.id}>{a.username}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        <Plus size={20} />
                        <span>{newTeam.id ? 'بروزرسانی تیم' : 'ایجاد تیم جدید'}</span>
                      </button>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {teams.map(team => (
                      <div key={team.id} className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-black text-lg text-gray-900">{team.name}</h4>
                            <p className="text-xs text-blue-600 font-bold mt-1">سرپرست: {team.supervisor_name || 'نامشخص'}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setNewTeam(team)} className="p-2 text-gray-400 hover:text-blue-500"><Palette size={18} /></button>
                            <button onClick={() => handleDeleteTeam(team.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">اعضای تیم</p>
                          <div className="flex flex-wrap gap-2">
                            {admins.filter(a => a.team_id === team.id).map(member => (
                              <div key={member.id} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 group/member relative">
                                <div className={`w-2 h-2 rounded-full ${isOnline(member.last_active_at) ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-gray-300'}`} />
                                <span className="text-[11px] font-bold text-gray-600">{member.username}</span>
                                <button onClick={() => fetchUserProfile(member.id)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover/member:opacity-100"><Eye size={12} /></button>
                              </div>
                            ))}
                            {admins.filter(a => a.team_id === team.id).length === 0 && (
                              <p className="text-xs text-gray-300 italic">بدون عضو</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scheduled_sms' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-4 sm:p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                     <h3 className="text-xl font-black flex items-center gap-2">
                        <Clock size={24} className="text-blue-600" />
                        پیامک‌های زمان‌بندی شده خودکار
                     </h3>
                     <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-gray-500">وضعیت کل سیستم:</span>
                        <button 
                          onClick={() => handleSaveSettings({ auto_sms_enabled: settings.auto_sms_enabled === '1' ? '0' : '1' })}
                          className={`flex-1 sm:flex-none px-4 py-1 rounded-lg text-[10px] font-black transition-all ${settings.auto_sms_enabled === '1' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                        >
                          {settings.auto_sms_enabled === '1' ? 'فعال' : 'غیرفعال'}
                        </button>
                     </div>
                  </div>

                  <div className="bg-white rounded-[2rem] p-4 sm:p-8 border border-gray-100 shadow-xl space-y-8 mb-8">
                     <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                           <SettingsIcon size={24} />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-gray-900">تنظیمات وب‌سرویس پیامک خودکار</h3>
                           <p className="text-xs text-gray-400 font-bold">بصورت جداگانه از پیامک‌های عادی (کمپین و زماندار)</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">نام کاربری (Uname)</label>
                           <input 
                              className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm"
                              value={localSettings.campaign_sms_username || ''}
                              onChange={e => setLocalSettings({...localSettings, campaign_sms_username: e.target.value})}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">رمز عبور (Pass)</label>
                           <input 
                              type="password"
                              className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm"
                              value={localSettings.campaign_sms_password || ''}
                              onChange={e => setLocalSettings({...localSettings, campaign_sms_password: e.target.value})}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">شماره فرستنده</label>
                           <input 
                              className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm"
                              value={localSettings.campaign_sms_sender || ''}
                              onChange={e => setLocalSettings({...localSettings, campaign_sms_sender: e.target.value})}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">API Key (AccessKey)</label>
                           <input 
                              className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm"
                              value={localSettings.campaign_sms_api_key || ''}
                              onChange={e => setLocalSettings({...localSettings, campaign_sms_api_key: e.target.value})}
                           />
                        </div>
                     </div>
                     <button 
                       onClick={() => handleSaveSettings({
                         campaign_sms_username: localSettings.campaign_sms_username,
                         campaign_sms_password: localSettings.campaign_sms_password,
                         campaign_sms_sender: localSettings.campaign_sms_sender,
                         campaign_sms_api_key: localSettings.campaign_sms_api_key
                       })}
                       className="w-full sm:w-auto bg-gray-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                     >
                       <Save size={18} />
                       ذخیره تنظیمات اختصاصی پنل خودکار
                     </button>
                  </div>

                  <form onSubmit={handleSaveScheduledSms} className="bg-gray-50 p-4 sm:p-8 rounded-3xl border border-gray-100 space-y-6 mb-12">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400">عنوان پیامک</label>
                           <input 
                            type="text" 
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                            value={newScheduledSms.title}
                            onChange={e => setNewScheduledSms({...newScheduledSms, title: e.target.value})}
                            placeholder="مثلاً: خوش‌آمدگویی روز دوم"
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400">ارسال پس از (روز)</label>
                              <input 
                               type="number" 
                               className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                               value={newScheduledSms.send_after_days}
                               onChange={e => setNewScheduledSms({...newScheduledSms, send_after_days: Number(e.target.value)})}
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400">هدف ارسال</label>
                              <select 
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                                value={newScheduledSms.target}
                                onChange={e => setNewScheduledSms({...newScheduledSms, target: e.target.value})}
                              >
                                 <option value="leads">فقط لیدها</option>
                                 <option value="all">همه (لید + مشتری)</option>
                              </select>
                           </div>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                           <label className="text-[10px] font-black text-gray-400">متن پیامک</label>
                           <span className="text-[9px] text-blue-500 font-bold">متغیرها: {'{name}'}</span>
                        </div>
                        <textarea 
                          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold min-h-[120px]"
                          value={newScheduledSms.message}
                          onChange={e => setNewScheduledSms({...newScheduledSms, message: e.target.value})}
                          placeholder="سلام {name} عزیز..."
                        />
                     </div>
                     <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        <Save size={18} />
                        <span>ذخیره تنظیمات پیامک خودکار</span>
                     </button>
                  </form>

                  <div className="space-y-4">
                     <h4 className="text-sm font-black text-gray-700 mb-4 px-2">لیست پیامک‌های زمان‌بندی شده</h4>
                     <div className="grid grid-cols-1 gap-4">
                        {scheduledSms.map(sms => (
                          <div key={sms.id} className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 group hover:border-blue-200 transition-all shadow-sm">
                             <div className="flex-1 space-y-3 w-full">
                                <div className="flex items-center gap-3">
                                   <div className="shrink-0 w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                      <Clock size={20} />
                                   </div>
                                   <div className="flex-grow min-w-0">
                                      <h5 className="font-black text-gray-900 text-sm sm:text-base truncate">{sms.title}</h5>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">بعد از {sms.send_after_days} روز - هدف: {sms.target === 'leads' ? 'لیدها' : 'همه'}</p>
                                   </div>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-50 w-full break-words font-medium">{sms.message}</p>
                             </div>
                             <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6 w-full md:w-auto md:border-r md:border-gray-100 md:pr-6 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50">
                                <div className="flex flex-col items-start md:items-start gap-1">
                                   <span className="text-[10px] font-black text-gray-400">وضعیت فعلی</span>
                                   <button 
                                      onClick={() => {
                                        const newVal = sms.is_active ? 0 : 1;
                                        axios.put(`/api/scheduled-sms/${sms.id}`, { ...sms, is_active: newVal }).then(() => fetchScheduledSms());
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all shadow-sm ${sms.is_active ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
                                   >
                                      {sms.is_active ? 'فعال سیستم' : 'متوقف شده'}
                                   </button>
                                </div>
                                <div className="flex gap-2">
                                   <button onClick={() => setNewScheduledSms(sms)} className="p-2 sm:p-3 bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="ویرایش"><Palette size={20} /></button>
                                   <button onClick={() => handleDeleteScheduledSms(sms.id)} className="p-2 sm:p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="حذف"><Trash2 size={20} /></button>
                                </div>
                             </div>
                          </div>
                        ))}
                        {scheduledSms.length === 0 && (
                          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold">هیچ پیامک زمان‌بندی شده‌ای تعریف نشده است.</div>
                        )}
                     </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-6">
                {!selectedTicket ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-black">پشتیبانی و تیکت‌ها</h3>
                      <button 
                        onClick={() => {
                          setTicketForm({ subject: '', department: 'دپارتمان فروش', priority: 'medium', lead_id: '', content: '' });
                          setShowNewTicketModal(true);
                        }}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                      >
                        <Plus size={18} /> تیکت جدید
                      </button>
                    </div>
                    <div className="grid gap-4">
                      {tickets.map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => {
                            setSelectedTicket(t);
                            fetchTicketMessages(t.id);
                          }}
                          className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer group gap-4"
                        >
                          <div className="flex items-start gap-4 text-right">
                             <div className={`p-3 rounded-xl hidden sm:block ${t.priority === 'high' ? 'bg-red-50 text-red-600' : t.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-600'}`}>
                               <MessageSquare size={24} />
                             </div>
                             <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <h4 className="font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors uppercase line-clamp-1">{t.subject}</h4>
                                 <div className={`sm:hidden px-2 py-0.5 rounded-full text-[8px] font-black uppercase
                                   ${t.priority === 'high' ? 'bg-red-100 text-red-600' : t.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                                   {t.priority === 'high' ? 'فوری' : t.priority === 'medium' ? 'متوسط' : 'عادی'}
                                 </div>
                               </div>
                               <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-[10px] text-gray-400 font-bold">
                                 <span className="bg-gray-100 px-2 py-0.5 rounded-md whitespace-nowrap">{t.department}</span>
                                 <span className="whitespace-nowrap">{new Date(t.created_at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                 {t.lead_name && <span className="text-blue-500 line-clamp-1">مربوط به لید: {t.lead_name} {t.lead_surname}</span>}
                               </div>
                             </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 pt-3 sm:pt-0">
                             <div className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black whitespace-nowrap
                               ${t.status === 'new' ? 'bg-blue-100 text-blue-700' : 
                                 t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                 t.status === 'answered' ? 'bg-emerald-100 text-emerald-700' : 
                                 t.status === 'on_hold' ? 'bg-purple-100 text-purple-700' : 
                                 'bg-gray-100 text-gray-700'}`}>
                               {t.status === 'new' ? 'جدید' : 
                                t.status === 'pending' ? 'در حال رسیدگی' : 
                                t.status === 'answered' ? 'پاسخ داده شده' : 
                                t.status === 'on_hold' ? 'نگه داشته شده' : 
                                'بسته شده'}
                             </div>
                             <div className="text-gray-300 sm:group-hover:translate-x-[-4px] transition-transform">
                               <ChevronLeft size={20} />
                             </div>
                          </div>
                        </div>
                      ))}
                      {tickets.length === 0 && <div className="text-center py-20 text-gray-400 font-bold bg-gray-50 rounded-3xl border border-dashed border-gray-200">تبکتی یافت نشد.</div>}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col h-[75vh] sm:h-[70vh] animate-in fade-in slide-in-from-bottom-2 bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 bg-white border-b border-gray-100 gap-4">
                       <div className="flex items-center gap-4 text-right w-full sm:w-auto">
                          <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                            <X size={20} className="text-gray-400" />
                          </button>
                          <div>
                            <h3 className="font-black text-base sm:text-lg line-clamp-1">{selectedTicket.subject}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 font-bold">شناسه: #{selectedTicket.id}</span>
                              <span className="text-[10px] text-blue-500 font-black">• {selectedTicket.department}</span>
                            </div>
                          </div>
                       </div>
                       <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          {currentUser?.role === 'admin' && (
                            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto justify-center">
                              {['pending', 'on_hold', 'answered'].map((s: any) => (
                                <button
                                  key={s}
                                  onClick={async () => {
                                    await axios.post(`/api/tickets/${selectedTicket.id}/status`, { status: s });
                                    toast.success('وضعیت تغییر یافت');
                                    fetchTickets();
                                    setSelectedTicket(prev => prev ? {...prev, status: s} : null);
                                  }}
                                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${selectedTicket.status === s ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-white'}`}
                                >
                                  {s === 'pending' ? 'رسیدگی' : s === 'on_hold' ? 'تعلیق' : 'پاسخ'}
                                </button>
                              ))}
                            </div>
                          )}
                          <button 
                            onClick={async () => {
                              await axios.post(`/api/tickets/${selectedTicket.id}/status`, { status: 'closed' });
                              toast.success('تیکت بسته شد');
                              fetchTickets();
                              setSelectedTicket(null);
                            }}
                            className="flex-1 sm:flex-none bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-100 transition-all border border-red-100"
                          >
                            بستن تیکت
                          </button>
                       </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-6 px-4 mb-6 scrollbar-hide py-6" id="chat-container">
                       {ticketMessages.map((m, idx) => (
                         <motion.div 
                           initial={{ opacity: 0, y: 10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           transition={{ delay: idx * 0.05 }}
                           key={m.id} 
                           className={`flex ${m.user_id === currentUser?.id ? 'justify-start' : 'justify-end'}`}
                         >
                            <div className={`max-w-[85%] sm:max-w-[70%] p-4 sm:p-5 rounded-3xl shadow-sm ${
                              m.user_id === currentUser?.id 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                            }`}>
                               <div className="flex items-center justify-between gap-4 mb-2">
                                 <span className={`text-[9px] font-black ${m.user_id === currentUser?.id ? 'text-blue-100' : 'text-gray-400'}`}>
                                   {m.username} • {m.role === 'admin' ? 'مدیریت' : 'کارشناس'}
                                 </span>
                                 <span className={`text-[8px] font-bold ${m.user_id === currentUser?.id ? 'opacity-60' : 'text-gray-300'}`}>
                                   {new Date(m.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                               </div>
                               <p className="text-sm leading-[1.8] font-medium whitespace-pre-wrap">{m.content}</p>
                               {m.file_url && (
                                 <a href={m.file_url} target="_blank" className={`mt-3 block p-3 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                                   m.user_id === currentUser?.id ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                                 }`}>
                                   <div className="flex items-center gap-2">
                                     <Paperclip size={16} />
                                     <span className="text-[10px] font-black">فایل پیوست شده</span>
                                   </div>
                                   <ExternalLink size={14} />
                                 </a>
                               )}
                            </div>
                         </motion.div>
                       ))}
                    </div>

                    {selectedTicket.status !== 'closed' && (
                      <div className="p-4 bg-white border-t border-gray-100 mt-auto">
                        <div className="relative group max-w-4xl mx-auto">
                          <textarea 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                // Trigger send logic
                              }
                            }}
                            placeholder="پیام خود را بنویسید..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 pr-6 pl-24 outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 resize-none text-sm transition-all min-h-[60px] max-h-[150px]"
                            rows={1}
                          />
                          <div className="absolute left-3 bottom-1.5 sm:bottom-3 flex gap-1">
                             <input 
                               type="file" 
                               ref={fileInputRef} 
                               className="hidden" 
                               onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 toast.success(`فایل ${file.name} انتخاب شد`);
                                 await axios.post(`/api/tickets/${selectedTicket.id}/messages`, { 
                                   user_id: currentUser?.id, 
                                   content: `فایل ضمیمه شده: ${file.name}`,
                                   file_url: 'https://via.placeholder.com/150'
                                 });
                                 fetchTicketMessages(selectedTicket.id);
                               }}
                             />
                             <button 
                               onClick={() => fileInputRef.current?.click()}
                               className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                             >
                                <Paperclip size={20} />
                             </button>
                             <button 
                               onClick={async () => {
                                 if (!newMessage.trim()) return;
                                 await axios.post(`/api/tickets/${selectedTicket.id}/messages`, { user_id: currentUser?.id, content: newMessage });
                                 setNewMessage('');
                                 fetchTicketMessages(selectedTicket.id);
                               }}
                               disabled={!newMessage.trim()}
                               className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-blue-500/30"
                             >
                               <Send size={20} />
                             </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'leads' && (
              <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow max-w-md">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="جستجو در نام، موبایل یا کارشناس..."
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pr-11 pl-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    {currentUser?.role === 'admin' && (
                      <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                         <span className="text-[10px] font-black text-gray-400 mr-2">تخصیص:</span>
                         <button 
                          onClick={() => handleSaveSettings({ lead_assignment_mode: 'manual' })}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${settings.lead_assignment_mode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                         >
                           دستی
                         </button>
                         <button 
                          onClick={() => handleSaveSettings({ lead_assignment_mode: 'round_robin' })}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${settings.lead_assignment_mode === 'round_robin' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                         >
                           راند بین (عادلانه)
                         </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {(currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                      <>
                        <button onClick={() => setShowAddLeadModal(true)} className="flex-1 md:flex-none justify-center bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 text-sm">
                          <UserPlus size={18} />
                          <span>افزودن تکی</span>
                        </button>
                        <button onClick={() => setShowBulkLeadModal(true)} className="flex-1 md:flex-none justify-center bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 text-sm">
                          <Plus size={18} />
                          <span>افزودن دسته‌جمعی</span>
                        </button>
                      </>
                    )}
                    {selectedLeads.length > 0 && currentUser?.role === 'admin' && (
                      <>
                        <button onClick={() => setShowAssignModal(true)} className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-100 text-sm">
                          <UserCircle2 size={18} />
                          <span>تخصیص به کارشناس ({selectedLeads.length})</span>
                        </button>
                        <button onClick={handleBulkDelete} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-red-100 text-sm">
                          <Trash2 size={18} />
                          <span>حذف ({selectedLeads.length})</span>
                        </button>
                      </>
                    )}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                      <button onClick={() => setShowExportModal(true)} className="flex-1 md:flex-none justify-center bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                        <DownloadCloud size={18} />
                        <span>خروجی CSV</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="md:border md:border-gray-100 dark:md:border-gray-700 md:rounded-2xl overflow-hidden">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right min-w-[800px]">
                      <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs uppercase">
                        <tr>
                          <th className="p-4"><input type="checkbox" onChange={(e) => e.target.checked ? setSelectedLeads(leads.map(l => l.id)) : setSelectedLeads([])} /></th>
                          <th className="p-4 font-black">نام و نام خانوادگی</th>
                          <th className="p-4 font-black">شماره موبایل</th>
                          <th className="p-4 font-black">وضعیت</th>
                          <th className="p-4 font-black text-center">تعداد ورود</th>
                          <th className="p-4 font-black">کارشناس</th>
                          <th className="p-4 font-black">تاریخ ثبت</th>
                          <th className="p-4 font-black text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {Array.isArray(leads) && leads.map(lead => (
                          <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="p-4"><input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={(e) => e.target.checked ? setSelectedLeads([...selectedLeads, lead.id]) : setSelectedLeads(selectedLeads.filter(id => id !== lead.id))} /></td>
                            <td className="p-4 font-bold dark:text-gray-200">{lead.name} {lead.surname}</td>
                            <td className="p-4 text-gray-600 dark:text-gray-400 font-mono text-sm">{lead.phone}</td>
                            <td className="p-4">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                lead.status === 'مشتری' ? 'bg-green-100 text-green-600' :
                                lead.status === 'تخصیص داده شده' ? 'bg-blue-100 text-blue-600' :
                                'bg-amber-100 text-amber-600'
                              }`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                {lead.visit_count || 1}
                              </span>
                            </td>
                            <td className="p-4 text-gray-500 dark:text-gray-400 text-sm font-bold">{lead.expert || '-'}</td>
                            <td className="p-4 text-gray-400 text-[10px]" dir="ltr">{new Date(lead.created_at).toLocaleString('fa-IR')}</td>
                            <td className="p-4 flex items-center justify-center gap-1">
                               <button 
                                onClick={() => fetchDetails(lead.id)}
                                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black"
                                title="مشاهده پروفایل و پیگیری"
                               >
                                  <UserCircle2 size={16} />
                                  <span>پروفایل</span>
                               </button>
                               {currentUser?.role === 'admin' && (
                                 <button onClick={() => handleDeleteLead(lead.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors" title="حذف">
                                   <Trash2 size={18} />
                                 </button>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {Array.isArray(leads) && leads.map(lead => (
                      <div key={lead.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={(e) => e.target.checked ? setSelectedLeads([...selectedLeads, lead.id]) : setSelectedLeads(selectedLeads.filter(id => id !== lead.id))} />
                            <div>
                               <h4 className="font-black text-gray-900 dark:text-white text-sm">{lead.name} {lead.surname}</h4>
                               <p className="text-[10px] text-gray-400 font-bold mt-0.5 font-mono" dir="ltr">{lead.phone}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                             lead.status === 'مشتری' ? 'bg-green-100 text-green-600' :
                             lead.status === 'تخصیص داده شده' ? 'bg-blue-100 text-blue-600' :
                             'bg-amber-100 text-amber-600'
                          }`}>
                            {lead.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-[10px] font-bold border-t border-gray-50 dark:border-gray-800 pt-3">
                           <div className="text-gray-400">کارشناس: <span className="text-gray-700 dark:text-gray-300">{lead.expert || '-'}</span></div>
                           <div className="text-gray-400">دفعات ورود: <span className="text-gray-700 dark:text-gray-300">{lead.visit_count || 1}</span></div>
                           <div className="text-gray-400 col-span-2">تاریخ ثبت: <span className="text-gray-700 dark:text-gray-300 font-mono" dir="ltr">{new Date(lead.created_at).toLocaleString('fa-IR')}</span></div>
                        </div>

                        <div className="flex gap-2 pt-2">
                           <button 
                            onClick={() => fetchDetails(lead.id)}
                            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                           >
                              <UserCircle2 size={16} />
                              <span>مشاهده پروفایل</span>
                           </button>
                           {currentUser?.role === 'admin' && (
                             <button onClick={() => handleDeleteLead(lead.id)} className="shrink-0 aspect-square bg-red-50 text-red-500 flex items-center justify-center rounded-xl hover:bg-red-100 transition-all active:scale-95">
                               <Trash2 size={18} />
                             </button>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {leads.length === 0 && <div className="p-20 text-center text-gray-400 font-bold bg-gray-50 dark:bg-gray-900/50">موردی یافت نشد.</div>}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                   <table className="w-full text-right border-collapse">
                     <thead>
                       <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-[10px] uppercase tracking-widest text-gray-400">
                         <th className="p-4 w-10 text-center">
                            <input type="checkbox" onChange={(e) => {
                               if (e.target.checked) setSelectedLeads(leads.map(l => l.id));
                               else setSelectedLeads([]);
                            }} checked={leads.length > 0 && selectedLeads.length === leads.length} />
                         </th>
                         <th className="p-4 font-black">نام و نام خانوادگی</th>
                         <th className="p-4 font-black">تلفن/موبایل</th>
                         <th className="p-4 font-black">وضعیت</th>
                         <th className="p-4 font-black text-center">ورود</th>
                         <th className="p-4 font-black">کارشناس</th>
                         <th className="p-4 font-black">تاریخ ثبت</th>
                         <th className="p-4 font-black text-center">عملیات</th>
                       </tr>
                     </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {Array.isArray(leads) && leads.map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="p-4"><input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={(e) => e.target.checked ? setSelectedLeads([...selectedLeads, lead.id]) : setSelectedLeads(selectedLeads.filter(id => id !== lead.id))} /></td>
                          <td className="p-4 font-bold dark:text-gray-200">{lead.name} {lead.surname}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-400 font-mono text-sm">{lead.phone}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                              lead.status === 'مشتری' ? 'bg-green-100 text-green-600' :
                              lead.status === 'تخصیص داده شده' ? 'bg-blue-100 text-blue-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {lead.visit_count || 1}
                            </span>
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400 text-sm font-bold">{lead.expert || '-'}</td>
                          <td className="p-4 text-gray-400 text-[10px]" dir="ltr">{new Date(lead.created_at).toLocaleString('fa-IR')}</td>
                          <td className="p-4 flex items-center justify-center gap-1">
                             <button 
                              onClick={() => fetchDetails(lead.id)}
                              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black"
                              title="مشاهده پروفایل و پیگیری"
                             >
                                <UserCircle2 size={16} />
                                <span>پروفایل</span>
                             </button>
                             {currentUser?.role === 'admin' && (
                               <button onClick={() => handleDeleteLead(lead.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors" title="حذف">
                                 <Trash2 size={18} />
                               </button>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {leads.length === 0 && <div className="p-20 text-center text-gray-400">موردی یافت نشد.</div>}
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <Section title="مدیریت کارت‌های آمار (فرصت‌ها)" icon={LineChart}>
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 mr-2">عنوان کارت</label>
                            <input 
                               value={newCustomStat.title} 
                               onChange={e => setNewCustomStat({...newCustomStat, title: e.target.value})}
                               className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none"
                               placeholder="مثلاً: پروژه‌های موفق"
                            />
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 mr-2">عدد یا مقدار</label>
                            <input 
                               value={newCustomStat.count} 
                               onChange={e => setNewCustomStat({...newCustomStat, count: e.target.value})}
                               className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none"
                               placeholder="مثلاً: ۱۲۰۰"
                            />
                         </div>
                         <button 
                           onClick={handleSaveCustomStat}
                           className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                         >
                           افزودن کارت جدید
                         </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                         {Array.isArray(customStats) && customStats.map(cs => (
                           <div key={cs.id} className="bg-gray-50 border border-gray-100 p-5 rounded-2xl relative group">
                              <p className="text-2xl font-black text-blue-600">{cs.count}</p>
                              <p className="text-xs font-bold text-gray-500">{cs.title}</p>
                              <button 
                                onClick={() => handleDeleteCustomStat(cs.id)}
                                className="absolute top-2 left-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                              >
                                <X size={14} />
                              </button>
                           </div>
                         ))}
                      </div>
                   </div>
                </Section>

                <div className="grid lg:grid-cols-2 gap-8">
                  <Section title="تنظیمات هدر و فوتر" icon={Palette}>
                    <ImageUploadInput label="لوگو سایت (لینک)" value={localSettings.header_logo} onChange={(v: string) => setLocalSettings({...localSettings, header_logo: v})} />
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">متن فوتر</label>
                      <textarea
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                        value={localSettings.footer_text || ''}
                        onChange={e => setLocalSettings({...localSettings, footer_text: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Instagram" value={localSettings.instagram_link} onChange={(v: string) => setLocalSettings({...localSettings, instagram_link: v})} />
                      <Input label="Phone" value={localSettings.phone_link} onChange={(v: string) => setLocalSettings({...localSettings, phone_link: v})} />
                      <Input label="لینک دلخواه پاپ‌آپ" value={localSettings.custom_popup_link} onChange={(v: string) => setLocalSettings({...localSettings, custom_popup_link: v})} />
                      <Input label="عنوان لینک پاپ‌آپ" value={localSettings.custom_popup_label} onChange={(v: string) => setLocalSettings({...localSettings, custom_popup_label: v})} />
                    </div>
                  </Section>
                  <Section title="متون اصلی لندینگ" icon={FileText}>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">عنوان کلان</label>
                        <textarea
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                          value={localSettings.main_title || ''}
                          onChange={e => setLocalSettings({...localSettings, main_title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">متن اعلان قرعه‌کشی</label>
                        <textarea
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                          value={localSettings.lottery_info || ''}
                          onChange={e => setLocalSettings({...localSettings, lottery_info: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">متن فراخوان مشارکت</label>
                        <textarea
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                          value={localSettings.participation_text || ''}
                          onChange={e => setLocalSettings({...localSettings, participation_text: e.target.value})}
                        />
                      </div>
                      <Input label="تعداد فرصت‌های بی نصیب" value={localSettings.missed_opportunities_count} onChange={(v: string) => setLocalSettings({...localSettings, missed_opportunities_count: v})} />
                      <Input label="عنوان بخش آمار (فرصت‌ها)" value={localSettings.stats_title} onChange={(v: string) => setLocalSettings({...localSettings, stats_title: v})} />
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">توضیحات بخش آمار</label>
                        <textarea
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                          value={localSettings.stats_description || ''}
                          onChange={e => setLocalSettings({...localSettings, stats_description: e.target.value})}
                        />
                      </div>
                    </div>
                  </Section>
                </div>

                <Section title="تنظیمات فرم ثبت‌نام" icon={UserPlus}>
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                    <ImageUploadInput label="لینک آواتار پروفایل" value={localSettings.form_avatar} onChange={(v: string) => setLocalSettings({...localSettings, form_avatar: v})} />
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">عنوان فرم</label>
                        <textarea
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                          value={localSettings.form_title || ''}
                          onChange={e => setLocalSettings({...localSettings, form_title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">توضیحات فرم</label>
                        <textarea
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none"
                          value={localSettings.form_description || ''}
                          onChange={e => setLocalSettings({...localSettings, form_description: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Input label="لیبل فیلد نام" value={localSettings.form_name_label} onChange={(v: string) => setLocalSettings({...localSettings, form_name_label: v})} />
                      <Input label="لیبل فیلد موبایل" value={localSettings.form_phone_label} onChange={(v: string) => setLocalSettings({...localSettings, form_phone_label: v})} />
                      
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-700">نمایش فیلد محصولات</label>
                          <select 
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none text-sm"
                            value={localSettings.show_registration_products}
                            onChange={e => setLocalSettings({...localSettings, show_registration_products: e.target.value})}
                          >
                            <option value="1">فعال</option>
                            <option value="0">غیرفعال</option>
                          </select>
                        </div>
                        {localSettings.show_registration_products === '1' && (
                          <Input 
                            label="لیبل فیلد محصولات" 
                            value={localSettings.registration_product_label} 
                            onChange={(v: string) => setLocalSettings({...localSettings, registration_product_label: v})} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </Section>
                
                <Section title="تنظیمات بنر انتهای صفحه" icon={ImageIcon}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">وضعیت نمایش بنر</label>
                        <select 
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none"
                          value={localSettings.show_bottom_banner}
                          onChange={e => setLocalSettings({...localSettings, show_bottom_banner: e.target.value})}
                        >
                          <option value="1">نمایش بنر</option>
                          <option value="0">عدم نمایش بنر</option>
                        </select>
                      </div>
                      <ImageUploadInput label="لینک تصویر بنر" value={localSettings.bottom_banner_image} onChange={(v: string) => setLocalSettings({...localSettings, bottom_banner_image: v})} />
                      <Input label="لینک مقصد بنر" value={localSettings.bottom_banner_link} onChange={(v: string) => setLocalSettings({...localSettings, bottom_banner_link: v})} />
                   </div>
                </Section>
                
                <Section title="مدیریت ویدیو و تایمر" icon={Monitor}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                        <label className="block text-sm font-bold text-gray-700">وضعیت نمایش ویدیو</label>
                        <select 
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none"
                          value={localSettings.show_video}
                          onChange={e => setLocalSettings({...localSettings, show_video: e.target.value})}
                        >
                          <option value="1">نمایش ویدیو</option>
                          <option value="0">عدم نمایش ویدیو (نمایش پیام جایگزین)</option>
                        </select>
                        {localSettings.show_video === '0' && (
                           <Input label="متن جایگزین ویدیو" value={localSettings.video_placeholder_text} onChange={(v: string) => setLocalSettings({...localSettings, video_placeholder_text: v})} />
                        )}
                      </div>

                      <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                        <label className="block text-sm font-black text-gray-700">وضعیت نمایش ویدیو (حالت بدون تایمر)</label>
                        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100">
                           <input 
                             type="checkbox" 
                             id="video_no_timer"
                             className="w-5 h-5 rounded text-blue-600"
                             checked={localSettings.video_no_timer === '1'}
                             onChange={e => setLocalSettings({...localSettings, video_no_timer: e.target.checked ? '1' : '0'})}
                           />
                           <label htmlFor="video_no_timer" className="text-xs font-bold text-gray-500 cursor-pointer">آیا ویدیو "بدون انتظار" نمایش داده شود؟ (حالت غیر تایمری)</label>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-100 mt-2 space-y-4">
                           <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                              <ImageIcon size={18} className="text-emerald-500" />
                              تصویر بنر اختصاصی ویدیو
                           </h4>
                           <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                id="video_banner_enabled"
                                className="w-5 h-5 rounded text-emerald-600"
                                checked={localSettings.video_banner_enabled === '1'}
                                onChange={e => setLocalSettings({...localSettings, video_banner_enabled: e.target.checked ? '1' : '0'})}
                              />
                              <label htmlFor="video_banner_enabled" className="text-[10px] font-bold text-gray-500 cursor-pointer">نمایش بنر بالای ویدیو فعال باشد؟</label>
                           </div>
                           <ImageUploadInput label="لینک عکس بنر ویدیو" value={localSettings.video_banner_image} onChange={(v: string) => setLocalSettings({...localSettings, video_banner_image: v})} />
                        </div>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                        <label className="block text-sm font-bold text-gray-700">نوع تایمر نمایشی</label>
                        <select 
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none"
                          value={localSettings.timer_type}
                          onChange={e => setLocalSettings({...localSettings, timer_type: e.target.value})}
                        >
                          <option value="lottery">تایمر قرعه‌کشی</option>
                          <option value="webinar">تایمر شروع وبینار</option>
                        </select>
                        <Input label="عنوان تایمر" value={localSettings.timer_title} onChange={(v: string) => setLocalSettings({...localSettings, timer_title: v})} />
                        
                        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded text-blue-600"
                            checked={localSettings.show_timer === '1'}
                            onChange={e => setLocalSettings({...localSettings, show_timer: e.target.checked ? '1' : '0'})}
                          />
                          <span className="text-sm font-bold text-gray-700">نمایش تایمر در سایت فعال باشد؟ (حالت بدون تایمر)</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50 p-6 rounded-2xl space-y-4 border border-emerald-100">
                        <h4 className="font-black text-emerald-900 text-sm mb-2 flex items-center gap-2">
                           <ImageIcon size={18} />
                           بنر بالای ویدیو (Top Banner)
                        </h4>
                        <div className="flex items-center gap-3 mb-4">
                           <input 
                             type="checkbox" 
                             className="w-5 h-5 rounded text-emerald-600"
                             checked={localSettings.top_banner_enabled === '1'}
                             onChange={e => setLocalSettings({...localSettings, top_banner_enabled: e.target.checked ? '1' : '0'})}
                           />
                           <span className="text-xs font-bold text-emerald-800">نمایش بنر بالای ویدیو فعال باشد؟</span>
                        </div>
                        <ImageUploadInput label="لینک عکس بنر" value={localSettings.top_banner_image} onChange={(v: string) => setLocalSettings({...localSettings, top_banner_image: v})} />
                        <p className="text-[10px] text-emerald-600 font-bold">این بنر دقیقاً بالای بخش ویدیو در لندینگ نمایش داده می‌شود.</p>
                      </div>

                      <div className="bg-purple-50 p-6 rounded-2xl space-y-4 border border-purple-100">
                         <h4 className="font-black text-purple-900 text-sm mb-2 flex items-center gap-2">
                            <Palette size={18} />
                            ظاهر فرم ثبت‌نام نهایی
                         </h4>
                         <div className="grid grid-cols-1 gap-4">
                            <Input label="رنگ پس‌زمینه (HEX)" value={localSettings.registration_bg_color} onChange={(v: string) => setLocalSettings({...localSettings, registration_bg_color: v})} />
                            <ImageUploadInput label="لینک عکس پس‌زمینه (اختیاری)" value={localSettings.registration_bg_image} onChange={(v: string) => setLocalSettings({...localSettings, registration_bg_image: v})} />
                         </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                        <label className="block text-sm font-bold text-gray-700">تنظیمات ریسپانسیو ویدیو</label>
                        <select 
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none"
                          value={localSettings.video_type}
                          onChange={e => setLocalSettings({...localSettings, video_type: e.target.value as any})}
                        >
                          <option value="direct">لینک مستقیم (MP4)</option>
                          <option value="aparat">سرویس آپارات</option>
                        </select>
                        <Input label={localSettings.video_type === 'direct' ? "لینک ویدیو" : "شناسه آپارات"} value={localSettings.video_link} onChange={(v: string) => setLocalSettings({...localSettings, video_link: v})} />
                        <ImageUploadInput label="کاور ویدیو (Image URL)" value={localSettings.video_cover} onChange={(v: string) => setLocalSettings({...localSettings, video_cover: v})} />
                      </div>

                      <div className="bg-blue-50 p-6 rounded-2xl space-y-4 border border-blue-100">
                        <label className="block text-sm font-bold text-blue-900 mb-2">تاریخ و زمان (تقویم شمسی)</label>
                        <DatePicker
                          calendar={persian}
                          locale={persian_fa}
                          value={localSettings.countdown_end}
                          onChange={(date: any) => setLocalSettings({...localSettings, countdown_end: date?.toDate?.().toISOString() || ''})}
                          format="YYYY/MM/DD HH:mm:ss"
                          plugins={[<TimePicker position="bottom" />]}
                          className="shamsi-picker"
                          inputClass="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          containerClassName="w-full"
                        />
                        <p className="text-[10px] text-blue-600">این تاریخ برای تایمر انتخاب شده اعمال می‌شود.</p>
                        
                        {localSettings.countdown_end && (
                          <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-gray-400 mb-2">پیش‌نمایش تایمر:</span>
                            <Countdown targetDate={localSettings.countdown_end} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Section>

                <div className="flex justify-center pt-10">
                   <button 
                     onClick={() => handleSaveSettings()}
                     className="bg-gray-900 text-white font-black px-16 py-5 rounded-2xl hover:bg-black transition-all shadow-2xl flex items-center gap-3 text-lg"
                   >
                     <Save size={24} />
                     <span>ذخیره نهایی تمامی تغییرات محتوایی</span>
                   </button>
                </div>
              </div>
            )}

            {activeTab === 'announcements' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 {currentUser?.role === 'admin' && (
                   <Section title="ثبت اعلان جدید برای کارشناسان" icon={Plus}>
                      <div className="flex flex-col sm:flex-row gap-4">
                         <textarea 
                           className="flex-grow bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                           placeholder="متن اعلان خود را وارد کنید..."
                           value={newAnnouncement}
                           onChange={e => setNewAnnouncement(e.target.value)}
                         />
                         <button 
                           onClick={handleCreateAnnouncement}
                           className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap self-end"
                         >
                            ثبت و ارسال
                         </button>
                      </div>
                   </Section>
                 )}

                 <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 space-y-6">
                    <h3 className="text-xl font-black flex items-center gap-2">
                       <AlertCircle size={24} className="text-amber-500" />
                       لیست آخرین اطلاعیه‌ها
                    </h3>
                    <div className="space-y-4">
                       {announcements.map(a => (
                         <div key={a.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative group overflow-hidden">
                            <div className="flex items-center gap-3 mb-3">
                               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                                  <UserIcon size={20} />
                               </div>
                               <div>
                                  <p className="font-black text-gray-900 leading-none">{a.author_name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">
                                     {new Date(a.created_at).toLocaleString('fa-IR', { dateStyle: 'long', timeStyle: 'short' })}
                                  </p>
                               </div>
                            </div>
                            <p className="text-gray-700 leading-relaxed font-medium">{a.content}</p>
                            
                            {currentUser?.role === 'admin' && (
                              <button 
                                onClick={() => handleDeleteAnnouncement(a.id)}
                                className="absolute top-4 left-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                 <Trash2 size={18} />
                              </button>
                            )}
                         </div>
                       ))}
                       {announcements.length === 0 && (
                         <div className="py-20 text-center text-gray-400 font-bold">هیچ اعلانی یافت نشد.</div>
                       )}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'testimonials' && (
              <div className="space-y-8">
                <Section title="تنظیمات کلی" icon={SettingsIcon}>
                   <div className="flex flex-col md:flex-row gap-6 items-end">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        <div className="space-y-4">
                          <label className="block text-sm font-bold text-gray-700">وضعیت نمایش بخش رضایت</label>
                          <select 
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none"
                            value={localSettings.show_testimonials}
                            onChange={e => setLocalSettings({...localSettings, show_testimonials: e.target.value})}
                          >
                            <option value="1">نمایش بخش</option>
                            <option value="0">عدم نمایش بخش</option>
                          </select>
                        </div>
                        <Input label="عنوان بخش رضایت" value={localSettings.testimonials_title} onChange={(v: string) => setLocalSettings({...localSettings, testimonials_title: v})} />
                      </div>
                      <button 
                        onClick={() => handleSaveSettings()}
                        className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Save size={20} />
                        <span>ذخیره تنظیمات</span>
                      </button>
                   </div>
                </Section>

                <Section title="افزودن ویدیو جدید" icon={Plus}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <Input label="عنوان ویدیو" value={newTestimonial.title} onChange={(v: string) => setNewTestimonial({...newTestimonial, title: v})} />
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">نوع ویدیو</label>
                      <select 
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none text-sm"
                        value={newTestimonial.video_type}
                        onChange={e => setNewTestimonial({...newTestimonial, video_type: e.target.value as any})}
                      >
                        <option value="direct">لینک مستقیم / Embed</option>
                        <option value="aparat">آپارات (شناسه ویدیو)</option>
                      </select>
                    </div>
                    <Input label="لینک / شناسه ویدیو" value={newTestimonial.video_link} onChange={(v: string) => setNewTestimonial({...newTestimonial, video_link: v})} />
                    <Input label="لینک کاور (تصویر)" value={newTestimonial.video_cover} onChange={(v: string) => setNewTestimonial({...newTestimonial, video_cover: v})} />
                    <button 
                      onClick={handleAddTestimonial}
                      className="bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                      <Plus size={20} />
                      <span>افزودن</span>
                    </button>
                  </div>
                </Section>

                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <Star size={24} className="text-amber-500" />
                    لیست ویدیوهای رضایت
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonials.map(item => (
                      <div key={item.id} className="bg-gray-50 rounded-2xl p-4 space-y-3 group relative">
                        <div className="aspect-video bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center relative">
                           {item.video_cover ? (
                             <img src={item.video_cover} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={item.title} />
                           ) : (
                             <Video size={32} className="text-gray-400" />
                           )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{item.title}</p>
                          <p className="text-[10px] text-gray-400 mt-1 truncate">{item.video_link}</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (window.confirm('آیا از حذف این ویدیو مطمئن هستید؟')) {
                              handleDeleteTestimonial(item.id);
                            }
                          }}
                          className="absolute top-2 left-2 p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-full shadow-md hover:bg-red-50 transition-all z-10"
                          title="حذف ویدیو"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {testimonials.length === 0 && <div className="p-20 text-center text-gray-400">ویدیویی یافت نشد.</div>}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-10 border border-gray-100 dark:border-gray-700 shadow-xl">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black flex items-center gap-3 dark:text-white">
                       <Calendar size={28} className="text-blue-600" />
                       کارهای امروز شما
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {followups.map(f => (
                       <div key={f.id} className="flex flex-col md:flex-row items-center justify-between p-6 bg-gray-50 dark:bg-gray-700/50 rounded-3xl border border-gray-200 dark:border-gray-600 gap-6">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                               <Phone size={24} />
                            </div>
                            <div>
                               <h4 className="font-black text-gray-900 dark:text-white">{f.name} {f.surname}</h4>
                               <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{f.phone}</p>
                            </div>
                         </div>
                         
                         <div className="flex-1 bg-amber-50/50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">یادداشت پیگیری:</span>
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mt-1">{f.notes || 'بدون یادداشت مشخص'}</p>
                         </div>

                         <div className="flex flex-col items-end gap-2">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">بخش عملیات</span>
                           <div className="flex flex-wrap gap-2 justify-end items-center">
                             <button 
                              onClick={() => fetchDetails(f.lead_id)}
                              className="bg-white border p-3 rounded-xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm group/btn"
                              title="مشاهده پروفایل"
                             >
                               <UserIcon size={18} className="group-hover/btn:scale-110 transition-transform" />
                             </button>
                             <button 
                              onClick={() => {
                                setReschedulingTask(f);
                                setNewScheduleDate(null);
                              }}
                              className="bg-amber-100 text-amber-600 px-4 py-3 rounded-xl hover:bg-amber-200 transition-all font-bold flex items-center gap-2 shadow-sm"
                             >
                               <Calendar size={18} />
                               <span className="text-xs">تغییر زمان</span>
                             </button>
                             <button 
                              onClick={async () => {
                                try {
                                  await axios.post(`/api/followups/${f.id}/complete`);
                                  // Log activity
                                  await axios.post(`/api/leads/${f.lead_id}/activities`, {
                                    type: 'note',
                                    content: '✅ کار پیگیری با موفقیت انجام شد و بسته شد.',
                                    expert_id: currentUser?.id
                                  });
                                  toast.success('موفقیت‌آمیز بود');
                                  fetchFollowups();
                                } catch(e) { toast.error('خطا در ثبت'); }
                              }}
                              className="bg-emerald-600 text-white px-5 py-3 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all font-bold flex items-center gap-2"
                             >
                               <Check size={18} />
                               <span className="text-xs">انجام شد</span>
                             </button>
                           </div>
                        </div>
                      </div>
                    ))}
                    {followups.length === 0 && (
                      <div className="py-20 text-center space-y-4">
                         <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={40} />
                         </div>
                         <h3 className="text-xl font-black text-gray-900">تبریک! تمام کارها انجام شده</h3>
                         <p className="text-gray-500">مشتاقانه منتظر سرنخ‌های جدید باشید</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'downloads' && (
              <div className="space-y-8">
                <Section title="تنظیمات بخش دانلودها" icon={SettingsIcon}>
                   <div className="flex flex-col md:flex-row gap-4 items-end">
                      <Input label="عنوان بخش دانلود" value={localSettings.download_box_title} onChange={v => setLocalSettings({...localSettings, download_box_title: v})} />
                      <button 
                        onClick={() => handleSaveSettings()}
                        className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Save size={20} />
                        <span>ذخیره عنوان</span>
                      </button>
                   </div>
                </Section>

                <Section title="افزودن فایل جدید" icon={Plus}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:items-end">
                    <Input label="عنوان فایل" value={newDownload.title} onChange={v => setNewDownload({...newDownload, title: v})} />
                    <Input label="حجم" value={newDownload.size} onChange={v => setNewDownload({...newDownload, size: v})} />
                    <Input label="لینک" value={newDownload.link} onChange={v => setNewDownload({...newDownload, link: v})} />
                    <button onClick={handleAddDownload} className="bg-primary text-white w-full py-3 rounded-xl font-bold">افزودن</button>
                  </div>
                </Section>
                <div className="grid gap-4">
                   {Array.isArray(downloads) && downloads.map(item => (
                     <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 gap-4 text-center sm:text-right">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                           <DownloadCloud className="text-gray-400" />
                           <div>
                             <h4 className="font-bold">{item.title}</h4>
                             <p className="text-xs text-gray-400 max-w-[200px] truncate">{item.size} | {item.link}</p>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteDownload(item.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg">
                           <X size={20} />
                        </button>
                     </div>
                   ))}
                   {downloads.length === 0 && <div className="p-20 text-center text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">فایلی یافت نشد.</div>}
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] p-4 md:p-10 border border-gray-100 shadow-xl overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="relative flex-1 group">
                      <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                      <input 
                        type="text" 
                        placeholder="جستجو در بین مشتریان..." 
                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl px-14 py-4 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && fetchLeads()}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      {(currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                        <button 
                          onClick={() => {
                            const customerData = leads.filter(l => l.status === 'مشتری');
                            exportToExcel(customerData.map(c => ({
                              'نام': c.name,
                              'نام خانوادگی': c.surname,
                              'تلفن': c.phone,
                              'شهر': c.city || '',
                              'کارشناس': c.expert || '',
                              'تاریخ ثبت': new Date(c.created_at).toLocaleDateString('fa-IR'),
                              'محصول': products.find(p => p.id === c.requested_product_id)?.name || ''
                            })), 'Customers_List');
                          }}
                          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all font-dana"
                        >
                           <DownloadCloud size={18} />
                           <span className="text-xs">خروجی اکسل مشتریان</span>
                        </button>
                      )}
                      <button 
                        onClick={fetchLeads} 
                        className="w-14 h-14 bg-blue-600 text-white flex items-center justify-center rounded-2xl shadow-lg shadow-blue-500/30 hover:rotate-180 transition-all duration-500"
                      >
                        <RefreshCw size={24} />
                      </button>
                    </div>
                  </div>

                  <div className="md:border md:border-gray-50 md:rounded-3xl overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-right border-separate border-spacing-y-2">
                         <thead>
                           <tr className="text-gray-400 text-sm font-black uppercase tracking-widest">
                             <th className="py-4 pr-4">نام مشتری</th>
                             <th className="py-4">اطلاعات تماس</th>
                             <th className="py-4">کارشناس پیگیری</th>
                             <th className="py-4">محصول خریداری شده</th>
                             <th className="py-4">تاریخ ثبت</th>
                             <th className="pl-4 py-4 text-center">پروفایل</th>
                           </tr>
                         </thead>
                         <tbody className="text-sm">
                           {leads.filter(l => l.status === 'مشتری').map(lead => (
                             <tr key={lead.id} className="bg-white hover:bg-blue-50/30 transition-all border-y border-gray-100">
                               <td className="py-6 pr-4 rounded-r-2xl border-y border-r border-gray-50">
                                 <div className="flex items-center gap-3">
                                   <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black shadow-sm">
                                     <ShieldCheck size={24} />
                                   </div>
                                   <div className="flex flex-col">
                                     <span className="font-black text-gray-900 text-lg">{lead.name} {lead.surname}</span>
                                     <span className="text-[10px] text-emerald-500 font-dana font-black">ACTIVE CUSTOMER</span>
                                   </div>
                                 </div>
                               </td>
                               <td className="py-4 border-y border-gray-50">
                                 <div className="font-mono text-sm font-bold text-gray-700" dir="ltr">{lead.phone}</div>
                               </td>
                               <td className="py-4 border-y border-gray-50 font-bold text-gray-500">
                                  {lead.expert}
                               </td>
                               <td className="py-4 border-y border-gray-50">
                                 <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg inline-block text-xs font-black">
                                   {products.find(p => p.id === lead.requested_product_id)?.name || 'سایر'}
                                 </div>
                               </td>
                               <td className="py-4 border-y border-gray-50 text-xs font-medium text-gray-400">
                                 {new Date(lead.created_at).toLocaleDateString('fa-IR')}
                               </td>
                               <td className="pl-4 py-4 rounded-l-2xl border-y border-l border-gray-50 text-left">
                                 <button 
                                   onClick={() => fetchDetails(lead.id)}
                                   className="p-3 bg-white border border-gray-100 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                 >
                                    <Eye size={18} />
                                 </button>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-4">
                      {leads.filter(l => l.status === 'مشتری').map(lead => (
                        <div key={lead.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 shadow-xl shadow-gray-200/20">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                              <ShieldCheck size={28} />
                            </div>
                            <div>
                               <h4 className="font-black text-gray-900 dark:text-white text-base">{lead.name} {lead.surname}</h4>
                               <p className="text-[11px] text-emerald-500 font-black">ACTIVE CUSTOMER</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-[11px] font-bold bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                             <div>
                               <p className="text-gray-400 mb-1">شماره تماس</p>
                               <p className="text-gray-900 dark:text-gray-200 font-mono" dir="ltr">{lead.phone}</p>
                             </div>
                             <div>
                               <p className="text-gray-400 mb-1">کارشناس</p>
                               <p className="text-gray-900 dark:text-gray-200">{lead.expert || '-'}</p>
                             </div>
                             <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                               <p className="text-gray-400 mb-1">محصول خریداری شده</p>
                               <span className="text-blue-600 dark:text-blue-400 font-black">
                                 {products.find(p => p.id === lead.requested_product_id)?.name || 'سایر'}
                               </span>
                             </div>
                          </div>

                          <button 
                            onClick={() => fetchDetails(lead.id)}
                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                          >
                             <Eye size={18} />
                             <span>مشاهده کامل پروفایل مشتری</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="grid lg:grid-cols-2 gap-8">
                <Section title="افزودن محصول یا خدمت جدید" icon={Plus}>
                   <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl space-y-4">
                     <Input label="نام محصول/خدمت" value={newProduct.name} onChange={(v: string) => setNewProduct({...newProduct, name: v})} />
                     <Input label="قیمت (تومان / توضیحی)" value={newProduct.price} onChange={(v: string) => setNewProduct({...newProduct, price: v})} />
                     <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded text-blue-600 outline-none" 
                          checked={newProduct.installments_enabled} 
                          onChange={e => setNewProduct({...newProduct, installments_enabled: e.target.checked})} 
                        />
                        <span className="text-sm font-bold text-gray-700">امکام فروش اقساطی برای این محصول فعال باشد؟</span>
                     </div>
                     <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">توضیحات کوتاه</label>
                        <textarea 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm h-32"
                          value={newProduct.description}
                          onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                        />
                     </div>
                     <button 
                        onClick={handleSaveProduct}
                        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                     >
                        <Save size={20} />
                        ذخیره اطلاعات محصول
                     </button>
                   </div>
                </Section>

                <Section title="لیست محصولات فعلی" icon={Star}>
                  <div className="space-y-4">
                    {products.map(p => (
                      <div key={p.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shadow-sm">
                             <Monitor size={24} />
                           </div>
                           <div>
                             <h4 className="font-black text-gray-900">{p.name}</h4>
                             <p className="text-xs text-amber-600 font-bold">{p.price} تومان</p>
                           </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => setNewProduct(p)} className="p-3 bg-gray-50 text-blue-500 rounded-xl hover:bg-blue-50 transition-all"><SettingsIcon size={18} /></button>
                           <button onClick={() => handleDeleteProduct(p.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="grid lg:grid-cols-2 gap-8">
                <Section title="ساخت فیلد سفارشی" icon={Plus}>
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl space-y-4">
                    <Input label="نام انگلیسی فیلد (شناسه)" value={newField.name} onChange={(v: string) => setNewField({...newField, name: v.replace(/\s+/g, '_').toLowerCase()})} />
                    <Input label="برچسب (فارسی)" value={newField.label} onChange={(v: string) => setNewField({...newField, label: v})} />
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700">نوع فیلد</label>
                          <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}>
                             <option value="text">متن کوتاه</option>
                             <option value="number">عدد</option>
                             <option value="select">انتخاب (Select Box)</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700">محل نمایش</label>
                          <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" value={newField.target} onChange={e => setNewField({...newField, target: e.target.value as any})}>
                             <option value="registration">فرم ثبت‌نام عمومی</option>
                             <option value="profile">فقط داخل پروفایل لید</option>
                          </select>
                       </div>
                    </div>

                    {newField.type === 'select' && (
                       <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700">گزینه‌ها (با کاما جدا کنید)</label>
                          <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" placeholder="آیتم ۱, آیتم ۲, ..." value={newField.options} onChange={e => setNewField({...newField, options: e.target.value})} />
                       </div>
                    )}

                    <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl cursor-pointer">
                       <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={newField.is_required} onChange={e => setNewField({...newField, is_required: e.target.checked})} />
                       <span className="text-sm font-bold text-gray-700">این فیلد اجباری است؟</span>
                    </label>

                    <button 
                       onClick={handleSaveField}
                       className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                       <Save size={20} />
                       ایجاد فیلد جدید
                    </button>
                  </div>
                </Section>

                <Section title="فیلدهای تعریف شده" icon={Filter}>
                  <div className="space-y-4">
                    {customFields.map(f => (
                      <div key={f.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center">
                        <div>
                           <div className="flex items-center gap-2">
                              <h4 className="font-black text-gray-900">{f.label}</h4>
                              <span className="text-[9px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full uppercase font-black">{f.name}</span>
                           </div>
                           <div className="flex items-center gap-3 mt-1">
                              <span className={`text-[10px] font-bold ${f.target === 'registration' ? 'text-blue-500' : 'text-purple-500'}`}>
                                {f.target === 'registration' ? 'عمومی (ثبت‌نام)' : 'اختصاصی (پروفایل)'}
                              </span>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteField(f.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {activeTab === 'site_settings' && (
              <div className="space-y-8">
                <div className="grid lg:grid-cols-2 gap-8">
                   <Section title="تنظیمات هویت بصری" icon={Palette}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-sm font-bold text-gray-700">رنگ اصلی (Primary)</label>
                           <div className="flex gap-4">
                              <input 
                                type="color" 
                                className="w-12 h-12 rounded-lg cursor-pointer border-0 shadow-sm"
                                value={localSettings.primary_color || '#2563eb'}
                                onChange={(e) => setLocalSettings({...localSettings, primary_color: e.target.value})}
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-bold text-gray-700">رنگ ثانویه (Accent)</label>
                           <div className="flex gap-4">
                              <input 
                                type="color" 
                                className="w-12 h-12 rounded-lg cursor-pointer border-0 shadow-sm"
                                value={localSettings.secondary_color || '#f59e0b'}
                                onChange={(e) => setLocalSettings({...localSettings, secondary_color: e.target.value})}
                              />
                           </div>
                        </div>
                      </div>
                      
                      <div className="mt-8 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                         <h4 className="text-xs font-black text-gray-400 mb-4 uppercase">پیش‌نمایش زنده رنگ‌ها</h4>
                         <div className="flex flex-wrap gap-4">
                            <button className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-md">دکمه اصلی</button>
                            <button className="px-6 py-2 bg-secondary text-white rounded-xl font-bold shadow-md">دکمه ثانویه</button>
                            <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-xl">
                               <Star size={24} />
                            </div>
                         </div>
                      </div>

                      <button 
                        onClick={async () => {
                          await axios.post('/api/settings', { 
                            primary_color: localSettings.primary_color,
                            secondary_color: localSettings.secondary_color
                          });
                          toast.success('تنظیمات ظاهری ذخیره شد');
                          refreshSettings();
                        }}
                        className="mt-6 w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        بروزرسانی ظاهر سایت
                      </button>
                   </Section>

                   <Section title="سایز فونت‌های لندینگ (Desktop / Mobile)" icon={Palette}>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                           <Input label="سایز عنوان اصلی (Desktop)" type="number" value={localSettings.main_title_fs_d} onChange={(v: string) => setLocalSettings({...localSettings, main_title_fs_d: v})} />
                           <Input label="سایز عنوان اصلی (Mobile)" type="number" value={localSettings.main_title_fs_m} onChange={(v: string) => setLocalSettings({...localSettings, main_title_fs_m: v})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <Input label="سایز باکس جایزه (Desktop)" type="number" value={localSettings.lottery_info_fs_d} onChange={(v: string) => setLocalSettings({...localSettings, lottery_info_fs_d: v})} />
                           <Input label="سایز باکس جایزه (Mobile)" type="number" value={localSettings.lottery_info_fs_m} onChange={(v: string) => setLocalSettings({...localSettings, lottery_info_fs_m: v})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <Input label="سایز متن مشارکت (Desktop)" type="number" value={localSettings.participation_text_fs_d} onChange={(v: string) => setLocalSettings({...localSettings, participation_text_fs_d: v})} />
                           <Input label="سایز متن مشارکت (Mobile)" type="number" value={localSettings.participation_text_fs_m} onChange={(v: string) => setLocalSettings({...localSettings, participation_text_fs_m: v})} />
                        </div>
                        <button 
                          onClick={() => handleSaveSettings()}
                          className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg"
                        >
                          ذخیره سایز فونت‌ها
                        </button>
                      </div>
                   </Section>

                   <Section title="تنظیمات سئو و متا" icon={Globe}>
                      <div className="space-y-4">
                        <Input label="عنوان متا (Title Tag)" value={localSettings.seo_title} onChange={(v: string) => setLocalSettings({...localSettings, seo_title: v})} />
                        <div className="space-y-2">
                           <label className="block text-sm font-bold text-gray-700">توضیحات متا (Description)</label>
                           <textarea 
                             className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm h-32"
                             value={localSettings.seo_description || ''}
                             onChange={e => setLocalSettings({...localSettings, seo_description: e.target.value})}
                           />
                        </div>
                        <Input label="کلمات کلیدی (با کاما)" value={localSettings.seo_keywords} onChange={(v: string) => setLocalSettings({...localSettings, seo_keywords: v})} />
                        <button 
                          onClick={() => handleSaveSettings()}
                          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg"
                        >
                          ذخیره تنظیمات سئو
                        </button>
                      </div>
                   </Section>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                       <SettingsIcon size={24} className="text-gray-400" />
                       اطلاعات کلی سایت
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                       <Input label="نام برند / مجموعه" value={localSettings.site_title} onChange={(v: string) => setLocalSettings({...localSettings, site_title: v})} />
                       <ImageUploadInput label="فاویکون (لینک تصویر)" value={localSettings.favicon_url} onChange={(v: string) => setLocalSettings({...localSettings, favicon_url: v})} />
                    </div>
                    <button onClick={() => handleSaveSettings()} className="mt-6 bg-gray-900 text-white px-10 py-4 rounded-xl font-black hover:bg-black transition-all">
                       ذخیره نهایی تمامی تنظیمات
                    </button>
                </div>
              </div>
            )}

            {activeTab === 'sms' && (
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <Section title="تنظیمات پنل پیامک (OTP & Notification)" icon={ShieldCheck}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <Input label="نام کاربری پنل" value={localSettings.sms_username} onChange={(v: string) => setLocalSettings({...localSettings, sms_username: v})} />
                          <Input label="رمز عبور پنل" type="password" value={localSettings.sms_password} onChange={(v: string) => setLocalSettings({...localSettings, sms_password: v})} />
                          <Input label="شماره فرستنده" value={localSettings.sms_sender} onChange={(v: string) => setLocalSettings({...localSettings, sms_sender: v})} />
                       </div>
                       <div className="space-y-4">
                          <Input label="کلید API جدید" value={localSettings.sms_api_key} onChange={(v: string) => setLocalSettings({...localSettings, sms_api_key: v})} />
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">متد ارسال اصلی</label>
                            <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" value={localSettings.sms_is_pattern} onChange={e => setLocalSettings({...localSettings, sms_is_pattern: e.target.value})}>
                              <option value="1">Pattern Code (کد الگو)</option>
                              <option value="0">Normal Text (متن عادی)</option>
                            </select>
                          </div>
                          <Input label="کد الگوی OTP" value={localSettings.sms_pattern_code} onChange={(v: string) => setLocalSettings({...localSettings, sms_pattern_code: v})} />
                       </div>
                    </div>
                  </Section>

                  <Section title="تنظیمات پیامک‌های انبوه و خودکار (Campaign SMS)" icon={TrendingUp}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <Input label="نام کاربری اختصاصی" value={localSettings.campaign_sms_username} onChange={(v: string) => setLocalSettings({...localSettings, campaign_sms_username: v})} />
                          <Input label="رمز عبور اختصاصی" type="password" value={localSettings.campaign_sms_password} onChange={(v: string) => setLocalSettings({...localSettings, campaign_sms_password: v})} />
                       </div>
                       <div className="space-y-4">
                          <Input label="کلید API اختصاصی" value={localSettings.campaign_sms_api_key} onChange={(v: string) => setLocalSettings({...localSettings, campaign_sms_api_key: v})} />
                          <Input label="شماره فرستنده تبلیغاتی" value={localSettings.campaign_sms_sender} onChange={(v: string) => setLocalSettings({...localSettings, campaign_sms_sender: v})} />
                       </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold mt-4">نکته: سیستم پیامک‌های زمان‌بندی شده از این تنظیمات استفاده می‌کند. در صورت خالی بودن، از تنظیمات اصلی استفاده می‌شود.</p>
                  </Section>

                  <div className="flex justify-center">
                    <button onClick={() => handleSaveSettings()} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                       <Save size={20} />
                       <span>ذخیره تمامی تنظیمات پنل</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <Section title="افزودن قالب پیامک جدید" icon={Plus}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          id="new-sms-name"
                          placeholder="نام قالب (مثلاً: پیگیری اول)" 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" 
                        />
                        <input 
                          type="text" 
                          id="new-sms-pattern"
                          placeholder="کد الگوی IPPanel (اختیاری)" 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" 
                        />
                      </div>
                      <textarea 
                        id="new-sms-content"
                        placeholder="متن پیامک..." 
                        rows={4} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none resize-none" 
                      />
                      <button 
                         onClick={async () => {
                           const name = (document.getElementById('new-sms-name') as HTMLInputElement).value;
                           const pattern = (document.getElementById('new-sms-pattern') as HTMLInputElement).value;
                           const content = (document.getElementById('new-sms-content') as HTMLTextAreaElement).value;
                           if(!name || !content) return toast.error('فیلدها را پر کنید');
                           await axios.post('/api/sms-templates', { name, content, pattern_code: pattern });
                           toast.success('قالب اضافه شد');
                           fetchSmsTemplates();
                           (document.getElementById('new-sms-name') as HTMLInputElement).value = '';
                           (document.getElementById('new-sms-pattern') as HTMLInputElement).value = '';
                           (document.getElementById('new-sms-content') as HTMLTextAreaElement).value = '';
                         }}
                         className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                         <Save size={20} /> ذخیره قالب پیامک
                      </button>
                    </div>
                  </Section>

                  <Section title="لیست قالب‌های پیامک" icon={MessageSquare}>
                    <div className="space-y-3">
                      {smsTemplates.map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                               <h4 className="font-bold text-gray-900">{t.name}</h4>
                               {t.pattern_code && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-black">کد الگو: {t.pattern_code}</span>}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">{t.content}</p>
                          </div>
                          <button 
                            onClick={async () => {
                              if(confirm('آیا از حذف این قالب مطمئن هستید؟')) {
                                await axios.delete(`/api/sms-templates/${t.id}`);
                                fetchSmsTemplates();
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              </div>
            )}

            {activeTab === 'admins' && (
              <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                <Section title="افزودن مدیر یا کارشناس جدید" icon={UserPlus}>
                  <form onSubmit={handleSaveAdmin} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl space-y-6">
                    <div className="space-y-1">
                      <Input 
                        label="نام کاربری (ID کاربری - انگلیسی)" 
                        value={newAdmin.username} 
                        dir="ltr"
                        onChange={(v: string) => {
                          const clean = v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
                          setNewAdmin({...newAdmin, username: clean});
                        }} 
                        placeholder="example_user"
                      />
                      <p className="text-[10px] text-gray-400 font-bold mr-2">فقط حروف انگلیسی، اعداد و خط تیره (_)</p>
                    </div>
                    <Input label="رمز عبور" type="password" value={newAdmin.password || ''} onChange={(v: string) => setNewAdmin({...newAdmin, password: v})} />
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-black text-gray-700 mb-2">نوع حساب کاربری</label>
                        <select 
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                          value={newAdmin.role}
                          onChange={(e) => {
                            const role = e.target.value;
                            let perms = ['leads', 'tasks'];
                            if (role === 'admin') perms = MENU_ITEMS.map(m => m.id);
                            if (role === 'editor') perms = ['content', 'testimonials', 'downloads', 'site_settings'];
                            if (role === 'supervisor') perms = ['leads', 'teams', 'stats', 'accounting', 'announcements'];
                            setNewAdmin({...newAdmin, role, permissions: perms});
                          }}
                        >
                           <option value="expert">کارشناس فروش (CRM)</option>
                           <option value="supervisor">سرپرست تیم فروش</option>
                           <option value="admin">مدیر کل (دسترسی کامل)</option>
                           <option value="editor">ویرایشگر محتوا</option>
                        </select>
                      </div>

                      {(newAdmin.role === 'expert' || newAdmin.role === 'supervisor') && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-black text-gray-700 mb-2">تخصیص به تیم</label>
                          <select 
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                            value={newAdmin.team_id || ''}
                            onChange={(e) => setNewAdmin({...newAdmin, team_id: e.target.value ? Number(e.target.value) : null})}
                          >
                             <option value="">بدون تیم</option>
                             {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl space-y-4">
                      <label className="block text-sm font-black text-gray-700 mb-2">تعیین سطح دسترسی کاربر</label>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {MENU_ITEMS.map(item => (
                          <label key={item.id} className={`flex items-center gap-3 bg-white p-3 rounded-xl border cursor-pointer hover:border-blue-500 transition-all ${newAdmin.permissions.includes(item.id) ? 'border-blue-500 ring-2 ring-blue-500/5' : 'border-gray-100'}`}>
                            <div className="relative flex items-center">
                              <input 
                                type="checkbox" 
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-all"
                                checked={newAdmin.permissions.includes(item.id)}
                                onChange={() => togglePermission(item.id)}
                              />
                              <Check className="absolute h-3.5 w-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2" />
                            </div>
                            <span className={`text-[10px] font-black transition-colors ${newAdmin.permissions.includes(item.id) ? 'text-blue-600' : 'text-gray-500'}`}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
                       <Save size={20} />
                       {newAdmin.id ? 'بروزرسانی کاربر' : 'ثبت و ایجاد کاربر'}
                    </button>
                  </form>
                </Section>
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-4 sm:p-8 space-y-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-black flex items-center gap-2">
                        <ShieldCheck size={24} className="text-blue-600" />
                        مدیران و کارشناسان
                     </h3>
                     <button onClick={fetchAdmins} className="p-2 text-gray-400 hover:text-blue-600 transition-all"><RefreshCw size={18} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {admins.map(admin => (
                      <div key={admin.id} className="p-5 bg-gray-50 rounded-3xl border border-transparent hover:border-blue-200 transition-all group flex flex-col justify-between h-full">
                        <div className="flex items-start justify-between mb-4">
                           <div className="flex items-center gap-3">
                              <div className="relative">
                                 <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300 border border-gray-100">
                                    <UserCircle2 size={24} />
                                 </div>
                                 <div className={`absolute -top-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${isOnline(admin.last_active_at) ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-gray-300'}`} />
                              </div>
                              <div>
                                 <p className="font-black text-gray-900 text-sm">
                                   {admin.username}
                                 </p>
                                 <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md font-bold uppercase">{admin.role}</span>
                              </div>
                           </div>
                           <div className="flex gap-1">
                              <button onClick={() => fetchUserProfile(admin.id)} className="p-2 text-gray-400 hover:text-blue-500 transition-all"><Eye size={16} /></button>
                           </div>
                        </div>

                        <div className="space-y-2 mb-4">
                           {admin.team_id && (
                              <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                 <Users size={12} />
                                 تیم: {teams.find(t => t.id === admin.team_id)?.name}
                              </p>
                           )}
                           <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                              <Clock size={12} />
                              بازدید: {admin.last_active_at ? new Date(admin.last_active_at).toLocaleTimeString('fa-IR') : 'نامشخص'}
                           </p>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                           <button 
                             onClick={() => {
                               const p = Array.isArray(JSON.parse(admin.permissions)) ? JSON.parse(admin.permissions) : [];
                               setNewAdmin({...admin, password: '', permissions: p});
                             }} 
                             className="flex-1 py-2 bg-white text-blue-600 border border-blue-50 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                           >
                             ویرایش
                           </button>
                           <button 
                             onClick={() => handleDeleteAdmin(admin.id)} 
                             className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showLeadDetails && selectedLead && (
          <LeadProfileModal 
            leadId={selectedLead.id}
            expertId={currentUser?.id || 0}
            smsTemplates={smsTemplates}
            experts={experts}
            userRole={currentUser?.role}
            products={products}
            customFields={customFields}
            onClose={() => {
              setShowLeadDetails(false);
              fetchLeads(); // Refresh leads in background
            }}
          />
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowExportModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
            >
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <DownloadCloud size={32} />
                  </div>
                  <h3 className="text-2xl font-black">تنظیمات خروجی CSV</h3>
                  <p className="text-gray-500 text-sm">بازه زمانی و وضعیت مورد نظر خود را انتخاب کنید</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">از تاریخ</label>
                      <DatePicker
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        className="custom-datepicker"
                        value={exportRange.start}
                        onChange={(date) => setExportRange(prev => ({ ...prev, start: date as DateObject }))}
                        placeholder="انتخاب تاریخ"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">تا تاریخ</label>
                      <DatePicker
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        className="custom-datepicker"
                        value={exportRange.end}
                        onChange={(date) => setExportRange(prev => ({ ...prev, end: date as DateObject }))}
                        placeholder="انتخاب تاریخ"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg text-blue-600 appearance-none border-2 border-blue-200 checked:bg-blue-600 transition-all checked:border-transparent"
                        checked={updateStatusOnExport}
                        onChange={(e) => setUpdateStatusOnExport(e.target.checked)}
                      />
                      <span className="text-sm font-black text-blue-900">تغییر وضعیت لیدهای انتخابی پس از خروجی؟</span>
                    </label>

                    {updateStatusOnExport && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <select 
                          className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 outline-none text-sm font-bold text-gray-700"
                          value={targetExportStatus}
                          onChange={(e) => setTargetExportStatus(e.target.value)}
                        >
                          <option value="سرنخ جدید">سرنخ جدید</option>
                          <option value="تخصیص داده شده">تخصیص داده شده</option>
                          <option value="مشتری">مشتری</option>
                        </select>
                        <p className="text-[10px] text-blue-500 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} />
                          پس از دانلود، وضعیت لیدها به "{targetExportStatus}" تغییر خواهد کرد.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl transition-all"
                  >
                    انصراف
                  </button>
                  <button 
                    onClick={handleExportWithFilters}
                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 transition-all"
                  >
                    تایید و دانلود فایل
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Single Lead Modal */}
      <AnimatePresence>
        {showAddLeadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">افزودن سرنخ جدید</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">ثبت اطلاعات به صورت تکی</p>
                  </div>
                </div>
                <button onClick={() => setShowAddLeadModal(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddSingleLead} className="p-8 space-y-6 text-right" dir="rtl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="نام" value={newLeadForm.name} onChange={(v: string) => setNewLeadForm({...newLeadForm, name: v})} />
                  <Input label="نام خانوادگی" value={newLeadForm.surname} onChange={(v: string) => setNewLeadForm({...newLeadForm, surname: v})} />
                </div>
                <Input label="شماره موبایل *" value={newLeadForm.phone} onChange={(v: string) => setNewLeadForm({...newLeadForm, phone: v})} />
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">تخصیص به کارشناس</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    value={newLeadForm.expert}
                    onChange={e => setNewLeadForm({...newLeadForm, expert: e.target.value})}
                  >
                    <option value="">تخصیص خودکار (راند بین)</option>
                    <option value="none">بدون تخصیص</option>
                    {admins.filter(a => a.role === 'expert').map(a => (
                      <option key={a.id} value={a.username}>{a.username}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">ثبت سرنخ</button>
                  <button type="button" onClick={() => setShowAddLeadModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkLeadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">آپلود دسته‌جمعی</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">وارد کردن لیدها از طریق فایل اکسل</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkLeadModal(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6 text-right" dir="rtl">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md text-emerald-600">
                    <Plus size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-gray-700">{bulkFile ? bulkFile.name : 'انتخاب فایل اکسل (.xlsx)'}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">حداکثر حجم: ۱۰ مگابایت</p>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setBulkFile(e.target.files[0]);
                    }
                  }} />
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-amber-600" size={20} />
                    <p className="text-xs text-amber-900 font-bold leading-relaxed">فایل باید دارای ستون‌های 'نام'، 'نام خانوادگی' و 'شماره' باشد.</p>
                  </div>
                  <button onClick={downloadLeadTemplate} className="w-full sm:w-auto text-[10px] font-black text-amber-700 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm whitespace-nowrap">دانلود نمونه اکسل</button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">شیوه تخصیص</label>
                    <div className="flex gap-2">
                      {['manual', 'round_robin'].map((mode: any) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setBulkLeadParams({...bulkLeadParams, assignment_mode: mode})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${bulkLeadParams.assignment_mode === mode ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-500'}`}
                        >
                          {mode === 'manual' ? 'تخصیص دستی' : 'راند بین (خودکار)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {bulkLeadParams.assignment_mode === 'manual' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-gray-700">انتخاب کارشناس مقصد</label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        value={bulkLeadParams.expert}
                        onChange={e => setBulkLeadParams({...bulkLeadParams, expert: e.target.value})}
                      >
                        <option value="">انتخاب کارشناس...</option>
                        {admins.filter(a => a.role === 'expert').map(a => (
                          <option key={a.id} value={a.username}>{a.username}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    disabled={isProcessingBulk || !bulkFile}
                    onClick={handleBulkUpload} 
                    className="flex-3 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessingBulk ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    <span>{isProcessingBulk ? 'در حال پردازش...' : 'تایید و آپلود نهایی'}</span>
                  </button>
                  <button type="button" onClick={() => setShowBulkLeadModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAssignModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10"
            >
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                    <UserCircle2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black">تخصیص به کارشناس</h3>
                  <p className="text-gray-500 text-sm">{selectedLeads.length} مورد انتخاب شده است</p>
                </div>

                <div className="space-y-2 text-right">
                  <label className="text-xs font-bold text-gray-500 mr-2">انتخاب کارشناس مربوطه</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold"
                    value={targetExpert}
                    onChange={(e) => setTargetExpert(e.target.value)}
                  >
                    <option value="">انتخاب کنید...</option>
                    {experts.map(ex => (
                      <option key={ex.id} value={ex.username}>{ex.username}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl transition-all"
                  >
                    لغو
                  </button>
                  <button 
                    onClick={handleBulkAssign}
                    className="flex-[2] py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-lg shadow-amber-500/30 transition-all"
                  >
                    تایید تخصیص
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNewTicketModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowNewTicketModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-10 overflow-hidden text-right"
              dir="rtl"
            >
              <h2 className="text-2xl font-black mb-6">ارسال تیکت جدید</h2>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-hide">
                <Input 
                  label="موضوع تیکت" 
                  value={ticketForm.subject} 
                  onChange={(v: string) => setTicketForm({...ticketForm, subject: v})} 
                />
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">دپارتمان</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                    value={ticketForm.department}
                    onChange={e => setTicketForm({...ticketForm, department: e.target.value})}
                  >
                    <option value="دپارتمان فروش">دپارتمان فروش</option>
                    <option value="واحد مدیریت">واحد مدیریت</option>
                    <option value="پشتیبانی فنی">پشتیبانی فنی</option>
                    <option value="حسابداری">حسابداری</option>
                  </select>
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ارسال برای کارشناس (اختیاری)</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                      value={ticketForm.expert_id}
                      onChange={e => setTicketForm({...ticketForm, expert_id: e.target.value})}
                    >
                      <option value="">سیستم / مدیریت</option>
                      {experts.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.username}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">اولویت</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={ticketForm.priority}
                    onChange={e => setTicketForm({...ticketForm, priority: e.target.value as any})}
                  >
                    <option value="low">کم</option>
                    <option value="medium">متوسط</option>
                    <option value="high">فوری (بالا)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">لید مرتبط (اختیاری)</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={ticketForm.lead_id}
                    onChange={e => setTicketForm({...ticketForm, lead_id: e.target.value})}
                  >
                    <option value="">انتخاب لید...</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} {l.surname} ({l.phone})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">توضیحات تیکت</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px]"
                    value={ticketForm.content}
                    onChange={e => setTicketForm({...ticketForm, content: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowNewTicketModal(false)}
                  className="flex-1 py-4 bg-gray-100 font-bold rounded-2xl"
                >
                  انصراف
                </button>
                <button 
                  onClick={async () => {
                    if (!ticketForm.subject || !ticketForm.content) return toast.error('لطفا موضوع و متن تیکت را وارد کنید');
                    await axios.post('/api/tickets', { ...ticketForm, user_id: currentUser?.id });
                    toast.success('تیکت با موفقیت ارسال شد');
                    setShowNewTicketModal(false);
                    setTicketForm({ subject: '', department: 'دپارتمان فروش', priority: 'medium', lead_id: '', content: '', expert_id: '' });
                    fetchTickets();
                  }}
                  className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20"
                >
                  ارسال تیکت به مدیریت
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-50/50">
                <Clock size={40} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-black">هنوز حضور دارید؟</h3>
                <p className="text-gray-500 mt-2 text-sm">به دلیل عدم خروج و امنیت سیستم، تا {promptTimer} ثانیه دیگر از حساب خود خارج خواهید شد.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={handleLogout} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all">خروج</button>
                <button onClick={() => { setShowLogoutPrompt(false); setLastActivity(Date.now()); }} className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">ادامه فعالیت</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUserProfile && selectedUserProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-end p-0 sm:p-4 overflow-hidden">
             <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="bg-white h-full sm:h-[calc(100vh-2rem)] w-full max-w-lg sm:rounded-[2.5rem] shadow-2xl relative flex flex-col"
               dir="rtl"
             >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-l from-gray-50 to-white">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                         <UserIcon size={32} />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black text-gray-900">{selectedUserProfile.user.username}</h2>
                         <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-black uppercase tracking-tighter">
                               {selectedUserProfile.user.role}
                            </span>
                            {new Date(selectedUserProfile.user.last_active_at) > new Date(Date.now() - 5 * 60 * 1000) ? (
                               <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  ONLINE
                               </span>
                            ) : (
                               <span className="text-[10px] font-black text-gray-400">آخرین بازدید: {new Date(selectedUserProfile.user.last_active_at).toLocaleString('fa-IR', { timeStyle: 'short', dateStyle: 'short' })}</span>
                            )}
                         </div>
                      </div>
                   </div>
                   <button onClick={() => setShowUserProfile(false)} className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                      <X size={24} />
                   </button>
                </div>

                 <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">فروش تایید شده</p>
                          <p className="text-xl font-black text-emerald-900">{(selectedUserProfile.stats.total_amount || 0).toLocaleString()} <span className="text-[10px] font-medium">تومان</span></p>
                       </div>
                       <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase mb-1">تعداد فاکتورها</p>
                          <p className="text-xl font-black text-blue-900">{selectedUserProfile.stats.total_sales || 0} <span className="text-[10px] font-medium">عدد</span></p>
                       </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="space-y-4">
                       <h3 className="font-black text-gray-900 flex items-center gap-2">
                          <History size={20} className="text-gray-400" />
                          تاریخچه فعالیت‌های اخیر
                       </h3>
                       <div className="space-y-4 relative before:absolute before:right-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100">
                          {(selectedUserProfile.activity || []).map((act: any) => (
                            <div key={act.id} className="relative pr-12">
                               <div className="absolute right-4 top-1 w-4 h-4 bg-white border-2 border-gray-200 rounded-full z-10" />
                               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-50 group hover:border-gray-200 transition-colors">
                                  <div className="flex justify-between items-start mb-2">
                                     <span className="text-[9px] bg-white px-2 py-0.5 rounded-full text-gray-400 font-bold border border-gray-100 uppercase">
                                        {act.type}
                                     </span>
                                     <span className="text-[9px] text-gray-400 font-mono" dir="ltr">
                                        {new Date(act.created_at).toLocaleString('fa-IR', { timeStyle: 'short', dateStyle: 'short' })}
                                     </span>
                                  </div>
                                  <p className="text-xs text-gray-700 font-medium leading-relaxed">{act.content}</p>
                               </div>
                            </div>
                          ))}
                          {(selectedUserProfile.activity || []).length === 0 && (
                             <div className="text-center py-5 text-gray-300 text-xs font-bold">هیچ فعالیت ثبتی موجود نیست</div>
                          )}
                       </div>
                    </div>

                    {/* Login/Logout History */}
                    <div className="space-y-4 pb-8">
                       <h3 className="font-black text-gray-900 flex items-center gap-2">
                          <LogIn size={20} className="text-gray-400" />
                          تاریخچه ورود و خروج
                       </h3>
                       <div className="bg-gray-50 rounded-3xl p-4 space-y-2">
                          {(selectedUserProfile.logs || []).map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                               <div className="flex items-center gap-2">
                                 {log.type === 'login' ? <LogIn size={14} className="text-emerald-500" /> : <LogOut size={14} className="text-rose-500" />}
                                 <span className={`text-[10px] font-black ${log.type === 'login' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {log.type === 'login' ? 'ورود به سیستم' : 'خروج از سیستم'}
                                 </span>
                               </div>
                               <span className="text-[9px] text-gray-400 font-mono" dir="ltr">
                                  {new Date(log.created_at).toLocaleString('fa-IR', { timeStyle: 'short', dateStyle: 'short' })}
                               </span>
                            </div>
                          ))}
                          {(selectedUserProfile.logs || []).length === 0 && (
                             <p className="text-center py-5 text-gray-300 text-[10px] font-black tracking-widest uppercase">داده‌ای یافت نشد</p>
                          )}
                       </div>
                    </div>
                 </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reschedulingTask && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative text-right"
              dir="rtl"
            >
              <button onClick={() => setReschedulingTask(null)} className="absolute left-6 top-6 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                   <Calendar size={32} />
                </div>
                <h2 className="text-2xl font-black text-gray-900">تغییر زمان</h2>
                <p className="text-gray-500 mt-1 text-xs">در صورت عدم پاسخگویی یا درخواست لید، تاریخ جدید پیگیری را ثبت کنید</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest">تاریخ و ساعت جایگزین</label>
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    format="YYYY/MM/DD HH:mm"
                    plugins={[<TimePicker position="bottom" />]}
                    containerClassName="w-full"
                    inputClass="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center focus:ring-4 focus:ring-amber-500/10 transition-all font-dana font-black text-amber-700"
                    value={newScheduleDate}
                    onChange={(date: any) => setNewScheduleDate(date)}
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!newScheduleDate) return toast.error('لطفاً تاریخ را انتخاب کنید');
                    try {
                      await axios.post(`/api/followups/${reschedulingTask.id}/reschedule`, {
                        scheduled_at: newScheduleDate.format("YYYY-MM-DD HH:mm")
                      });
                      toast.success('برنامه‌ریزی مجدد انجام شد');
                      setReschedulingTask(null);
                      fetchFollowups();
                    } catch (err) {
                      toast.error('خطا در ذخیره زمان جدید');
                    }
                  }}
                  className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                >
                  ثبت زمان جدید پیگیری
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

const Section = ({ title, icon: Icon, children }: any) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
      <div className="p-2 bg-gray-50 rounded-lg text-blue-500">
        <Icon size={20} />
      </div>
      <h3 className="font-black text-lg">{title}</h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const Input = ({ label, value, onChange, type = "text", placeholder = "", dir = "rtl" }: any) => (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-gray-700">{label}</label>
    <input 
      type={type} 
      dir={dir}
      placeholder={placeholder}
      className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 ${dir === 'ltr' ? 'text-left font-mono' : 'text-right'}`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const ImageUploadInput = ({ label, value, onChange }: any) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      const res = await axios.post('/api/upload', formData);
      onChange(res.data.url);
      toast.success('فایل با موفقیت آپلود شد');
    } catch (err) {
      toast.error('خطا در آپلود فایل');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <input 
            type="text" 
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <ImageIcon size={18} />
          </div>
        </div>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleUpload}
          accept="image/*"
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 min-w-[100px] disabled:opacity-50 shadow-lg shadow-blue-500/20"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          <span className="text-xs font-bold">{uploading ? 'درحال آپلود...' : 'آپلود'}</span>
        </button>
      </div>
    </div>
  );
};

const ICON_MAP: any = {
  Users, TrendingUp, CheckCircle2, Clock, Calendar, ShieldCheck, Globe, Star
};

const StatCard = ({ label, value, icon, color }: any) => {
  const Icon = (typeof icon === 'string' ? ICON_MAP[icon] : icon) || BarChart3;
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600"
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4 transition-all hover:translate-y-[-4px] hover:shadow-lg">
      <div className={`p-4 rounded-2xl ${colors[color]}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-gray-400 text-xs font-bold uppercase">{label}</p>
        <p className="text-2xl font-black">{typeof value === 'number' ? value.toLocaleString('fa-IR') : value}</p>
      </div>
    </div>
  );
};
