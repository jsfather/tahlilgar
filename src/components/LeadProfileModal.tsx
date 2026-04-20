
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Phone, MessageSquare, History, Calendar, Save, Plus, 
  User as UserIcon, Shield, TrendingUp, Send, CheckCircle2, Clock, MessageCircle,
  FileText, AlertCircle, ExternalLink, Settings as SettingsIcon, Trash2, Upload
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Lead, LeadActivity, SMSTemplate, User, Product, CustomField } from '../types';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import DateObject from "react-date-object";

interface Props {
  leadId: number;
  onClose: () => void;
  expertId: number;
  smsTemplates: SMSTemplate[];
  experts: User[];
  products: Product[];
  customFields: CustomField[];
  userRole?: string;
}

export const LeadProfileModal: React.FC<Props> = ({ leadId, onClose, expertId, smsTemplates, experts, userRole, products, customFields }) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [balance, setBalance] = useState({ debtor: false, paid: 0, total: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'call' | 'sms' | 'deposits'>('info');
  
  // Form states
  const [editData, setEditData] = useState({ 
    name: '', surname: '', stage: 'new', notes: '',
    city: '', province: '', degree: '', background: '', source_type: '',
    expert: '',
    requested_product_id: null as number | null,
    custom_data: {} as Record<string, any>
  });
  const [newNote, setNewNote] = useState('');
  const [followupDate, setFollowupDate] = useState<DateObject | null>(null);
  const [followupNotes, setFollowupNotes] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [newDeposit, setNewDeposit] = useState({
    product_id: null as number | null,
    amount: '',
    payment_date: new DateObject(),
    payment_type: 'cash' as 'cash' | 'installments',
    installments: [] as { amount: string, due_date: DateObject }[],
    receipt_urls: ''
  });

  const addInstallmentRow = () => {
    setNewDeposit(prev => ({
      ...prev,
      installments: [...prev.installments, { amount: '', due_date: new DateObject() }]
    }));
  };

  const removeInstallmentRow = (index: number) => {
    setNewDeposit(prev => ({
      ...prev,
      installments: prev.installments.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const loadingToast = toast.loading('در حال آپلود فایل...');
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const currentUrls = newDeposit.receipt_urls.trim();
      const newUrls = currentUrls ? `${currentUrls}, ${res.data.url}` : res.data.url;
      setNewDeposit({ ...newDeposit, receipt_urls: newUrls });
      toast.success('فایل با موفقیت آپلود شد', { id: loadingToast });
    } catch (err) {
      toast.error('خطا در آپلود فایل', { id: loadingToast });
    }
  };

  const updateInstallment = (index: number, field: string, value: any) => {
    setNewDeposit(prev => {
      const updated = [...prev.installments];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, installments: updated };
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lRes, aRes, dRes, bRes] = await Promise.all([
        axios.get(`/api/leads/${leadId}`),
        axios.get(`/api/leads/${leadId}/activities`),
        axios.get(`/api/deposits?lead_id=${leadId}`),
        axios.get(`/api/leads/${leadId}/balance`)
      ]);
      setLead(lRes.data);
      setActivities(aRes.data);
      setDeposits(dRes.data);
      setBalance(bRes.data);
      let cData = {};
      try { cData = JSON.parse(lRes.data.custom_data || '{}'); } catch(e) {}
      setEditData({
        name: lRes.data.name || '',
        surname: lRes.data.surname || '',
        stage: lRes.data.stage || 'new',
        notes: lRes.data.notes || '',
        city: lRes.data.city || '',
        province: lRes.data.province || '',
        degree: lRes.data.degree || '',
        background: lRes.data.background || '',
        source_type: lRes.data.source_type || '',
        expert: lRes.data.expert || '',
        requested_product_id: lRes.data.requested_product_id || null,
        custom_data: cData
      });
      // Pre-fill product in deposit if lead has one
      if (lRes.data.requested_product_id) {
        setNewDeposit(prev => ({ ...prev, product_id: lRes.data.requested_product_id }));
      }
    } catch (err) { toast.error('خطا در بارگذاری'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [leadId]);

  const handleUpdateProfile = async () => {
    try {
      await axios.post(`/api/leads/${leadId}/profile`, {
        ...editData,
        custom_data: JSON.stringify(editData.custom_data)
      });
      
      // If expert changed, log it if lead.expert was different
      if (editData.expert !== lead?.expert) {
        handleAddActivity('note', `تخصیص داده شد به کارشناس: ${editData.expert || 'بدون کارشناس'}`);
      }
      
      toast.success('پروفایل بروزرسانی شد');
      fetchData();
    } catch (err) { toast.error('خطا در ذخیره'); }
  };

  const handleAddActivity = async (type: LeadActivity['type'], content: string) => {
    try {
      await axios.post(`/api/leads/${leadId}/activities`, { expert_id: expertId, type, content });
      toast.success('ثبت شد');
      setNewNote('');
      fetchData();
    } catch (err) { toast.error('خطا در ثبت'); }
  };

  const handleSetFollowup = async () => {
    if (!followupDate) return toast.error('تاریخ را انتخاب کنید');
    try {
      const gregorianDate = new DateObject(followupDate).convert(gregorian, gregorian_en);
      await axios.post('/api/followups', {
        lead_id: leadId,
        expert_id: expertId,
        scheduled_at: gregorianDate.format("YYYY-MM-DD HH:mm:ss"),
        notes: followupNotes
      });
      toast.success('پیگیری ثبت شد');
      setFollowupDate(null);
      setFollowupNotes('');
      handleAddActivity('note', `پیگیری جدید ثبت شد برای تاریخ: ${followupDate.format("YYYY/MM/DD HH:mm")}`);
    } catch (err) { toast.error('خطا در ثبت پیگیری'); }
  };

  const handleSendSMS = async () => {
    if (!selectedTemplate) return;
    try {
      await axios.post(`/api/leads/${leadId}/send-sms`, {
        templateId: selectedTemplate,
        expert_id: expertId
      });
      toast.success('پیامک در صف ارسال قرار گرفت');
      setSelectedTemplate(null);
      handleAddActivity('sms_sent', `پیامک ارسال شد (قالب شماره ${selectedTemplate})`);
    } catch (err) { toast.error('خطا در ارسال پیامک'); }
  };

  const handleAddDeposit = async () => {
    if (!newDeposit.amount || !newDeposit.product_id || !newDeposit.receipt_urls.trim()) {
      return toast.error('تمامی فیلدها شامل انتخاب محصول، مبلغ و تصویر فیش اجباری هستند.');
    }

    // Validation for installments
    if (newDeposit.payment_type === 'installments') {
      if (newDeposit.installments.length === 0) return toast.error('لطفاً حداقل یک قسط ثبت کنید');
      if (newDeposit.installments.some(i => !i.amount || !i.due_date)) {
        return toast.error('مبلغ و تاریخ تمامی اقساط باید مشخص باشد');
      }
    }

    try {
      const gPayDate = newDeposit.payment_date?.toDate?.().toISOString();
      const urls = newDeposit.receipt_urls.split(',').map(u => u.trim()).filter(u => u);

      const payload = {
        lead_id: leadId,
        product_id: newDeposit.product_id,
        amount: Number(newDeposit.amount),
        payment_type: newDeposit.payment_type,
        total_amount: newDeposit.payment_type === 'installments' 
          ? Number(newDeposit.amount) + newDeposit.installments.reduce((sum, i) => sum + Number(i.amount), 0)
          : Number(newDeposit.amount),
        installments: newDeposit.installments.map(i => ({
          amount: Number(i.amount),
          due_date: i.due_date.toDate().toISOString()
        })),
        receipt_urls: urls,
        payment_date: gPayDate,
        expert_id: expertId
      };

      await axios.post('/api/deposits', payload);
      toast.success('واریزی با موفقیت ثبت شد');
      setNewDeposit({
        product_id: lead?.requested_product_id || null,
        amount: '',
        payment_date: new DateObject(),
        payment_type: 'cash',
        installments: [],
        receipt_urls: ''
      });
      fetchData();
    } catch (err: any) { 
      toast.error(err.response?.data?.error || 'خطا در ثبت'); 
    }
  };

  if (loading || !lead) return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white sm:rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-full sm:h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-100 p-4 sm:p-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 text-right">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <UserIcon size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">{lead.name} {lead.surname}</h2>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  lead.stage === 'customer' ? 'bg-emerald-100 text-emerald-700' : 
                  lead.stage === 'lost' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {lead.stage === 'new' ? 'سرنخ جدید' : 
                   lead.stage === 'contacted' ? 'تماس گرفته شده' : 
                   lead.stage === 'interested' ? 'علاقه‌مند' : 
                   lead.stage === 'negotiation' ? 'در حال مذاکره' : 
                   lead.stage === 'customer' ? 'مشتری نهایی' : 'بایگانی'}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-400 font-mono text-xs font-bold">{lead.phone}</p>
                <span className="text-gray-200">|</span>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">ثبت: {new Date(lead.created_at).toLocaleDateString('fa-IR')}</p>
                {balance.debtor && (
                  <>
                    <span className="text-gray-200">|</span>
                    <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">بدهکار (مانده: {balance.remaining?.toLocaleString() ?? 0} تومان)</span>
                  </>
                )}
                {!balance.debtor && balance.total > 0 && (
                  <>
                    <span className="text-gray-200">|</span>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">تسویه شده</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-blue-100 transition-all">
              <Phone size={16} /> تماس مستقیم
            </button>
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-50/30">
          {/* Navigation Sidebar */}
          <div className="lg:w-72 border-b lg:border-b-0 lg:border-l border-gray-100 p-2 sm:p-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto whitespace-nowrap scrollbar-hide bg-white/50 backdrop-blur-sm">
            {[
              { id: 'info', icon: Shield, label: 'اطلاعات پرونده' },
              { id: 'history', icon: History, label: 'سوابق و فعالیت‌ها' },
              { id: 'deposits', icon: TrendingUp, label: 'واریزی‌ها و اقساط' },
              { id: 'call', icon: Calendar, label: 'قرار پیگیری' },
              { id: 'sms', icon: MessageSquare, label: 'ارسال پیامک' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 lg:flex-none flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black transition-all group ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                    : 'text-gray-500 hover:bg-white hover:text-blue-600 border border-transparent hover:border-blue-100'
                }`}
              >
                <tab.icon size={20} className={activeTab === tab.id ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'} /> 
                <span className="text-xs sm:text-sm">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div layoutId="activeInd" className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-white ring-4 ring-white/20" />
                )}
              </button>
            ))}
          </div>

          {/* Main Panel Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 bg-white/40">
            {activeTab === 'info' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto space-y-10">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-blue-600 rounded-full" />
                    <h3 className="text-xl font-black text-gray-900">مشخصات هویتی و سکونتی</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { label: 'نام', key: 'name' },
                      { label: 'نام خانوادگی', key: 'surname' },
                      { label: 'استان', key: 'province' },
                      { label: 'شهر', key: 'city' },
                      { label: 'مدرک تحصیلی', key: 'degree' },
                      { label: 'نحوه آشنایی', key: 'source_type' },
                    ].map((f) => (
                      <div key={f.key} className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">{f.label}</label>
                        <input 
                          value={(editData as any)[f.key]} 
                          onChange={e => setEditData({...editData, [f.key]: e.target.value})} 
                          className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" 
                        />
                      </div>
                    ))}
                  </div>

                  {/* Custom Fields (Profile Target) */}
                  {customFields.filter(f => f.target === 'profile').length > 0 && (
                    <div className="mt-8 pt-8 border-t border-gray-100">
                       <h4 className="text-sm font-black text-blue-600 mb-4 uppercase tracking-widest">فیلدها و کمال‌گرایی اطلاعات</h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {customFields.filter(f => f.target === 'profile').map(f => (
                            <div key={f.id} className="space-y-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">{f.label}</label>
                               {f.type === 'select' ? (
                                 <select 
                                   value={editData.custom_data[f.name] || ''}
                                   onChange={e => setEditData({...editData, custom_data: {...editData.custom_data, [f.name]: e.target.value}})}
                                   className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-dana"
                                 >
                                    <option value="">انتخاب کنید...</option>
                                    {f.options.split(',').map(opt => <option key={opt} value={opt}> {opt.trim()} </option>)}
                                 </select>
                               ) : (
                                 <input 
                                   type={f.type === 'number' ? 'number' : 'text'}
                                   value={editData.custom_data[f.name] || ''}
                                   onChange={e => setEditData({...editData, custom_data: {...editData.custom_data, [f.name]: e.target.value}})}
                                   className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                                 />
                               )}
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  {/* Registration Custom Fields (Read Only display) */}
                  {customFields.filter(f => f.target === 'registration').length > 0 && (
                    <div className="mt-8 p-4 bg-gray-50 rounded-2xl space-y-2">
                       <h5 className="text-[10px] font-black text-gray-500">داده‌های ثبت نامی:</h5>
                       <div className="flex flex-wrap gap-4">
                          {customFields.filter(f => f.target === 'registration').map(f => (
                            <div key={f.id} className="text-xs">
                               <span className="font-bold text-gray-400">{f.label}: </span>
                               <span className="font-black text-gray-700">{editData.custom_data[f.name] || 'تکمیل نشده'}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-blue-600 rounded-full" />
                    <h3 className="text-xl font-black text-gray-900">جزئیات تخصیص و سوابق</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">کارشناس تخصیص یافته</label>
                      <select 
                        value={editData.expert} 
                        onChange={e => setEditData({...editData, expert: e.target.value})} 
                        disabled={userRole !== 'admin'}
                        className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <option value="">— تایید نشده —</option>
                        {experts.map(ex => <option key={ex.id} value={ex.username}>{ex.username}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">مرحله فعلی در قیف فروش</label>
                      <select 
                        value={editData.stage} 
                        onChange={e => setEditData({...editData, stage: e.target.value as any})} 
                        className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none"
                      >
                        <option value="new">سرنخ جدید (Fresh)</option>
                        <option value="contacted">تماس اول (Contacted)</option>
                        <option value="interested">علاقه‌مند (Nurturing)</option>
                        <option value="negotiation">چانه زنی (Closing)</option>
                        <option value="customer">تبدیل به مشتری (Won)</option>
                        <option value="lost">غیرفعال (Lost)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">سرویس یا محصول مورد نظر</label>
                       <select 
                         value={editData.requested_product_id || ''} 
                         onChange={e => setEditData({...editData, requested_product_id: e.target.value ? Number(e.target.value) : null})} 
                         className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none"
                       >
                         <option value="">— انتخاب نشده —</option>
                         {products.map(p => (
                           <option key={p.id} value={p.id}>{p.name}</option>
                         ))}
                       </select>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">سابقه کاری و رزومه کوتاه</label>
                      <input 
                        value={editData.background} 
                        onChange={e => setEditData({...editData, background: e.target.value})} 
                        className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" 
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1 mb-2">یادداشت‌های فنی و مدیریتی</label>
                  <textarea 
                    rows={4} 
                    value={editData.notes} 
                    onChange={e => setEditData({...editData, notes: e.target.value})} 
                    className="w-full bg-white border border-gray-200 rounded-[2rem] p-6 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all resize-none shadow-inner" 
                    placeholder="مطالب مهم در مورد لید را اینجا یادداشت کنید..."
                  />
                </section>

                <button 
                  onClick={handleUpdateProfile} 
                  className="group relative w-full sm:w-auto overflow-hidden bg-gray-900 text-white font-black px-12 py-5 rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-3"
                >
                  <Save size={20} />
                  <span>تایید و ثبت نهایی تغییرات پروفایل</span>
                </button>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto space-y-10">
                {/* Activity Feed Section */}
                <section>
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                         <History size={20} />
                       </div>
                       <h3 className="text-xl font-black text-gray-900">تاریخچه کامل فعالیت‌ها</h3>
                     </div>
                     <div className="text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                       {activities.length} رویداد ثبت شده
                     </div>
                  </div>

                  <div className="space-y-6 relative before:absolute before:right-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                     {activities.map((act, i) => (
                       <div key={act.id} className="relative pr-12 group">
                          <div className={`absolute right-3.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 ring-gray-50 transition-all group-hover:scale-125 ${
                            act.type === 'call' ? 'bg-blue-500' :
                            act.type === 'sms_sent' ? 'bg-emerald-500' :
                            act.type === 'status_change' ? 'bg-purple-500' : 'bg-gray-400'
                          }`} />
                          <div className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm hover:shadow-md hover:border-gray-100 transition-all">
                             <div className="flex justify-between items-start mb-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                                  act.type === 'call' ? 'bg-blue-50 text-blue-600' :
                                  act.type === 'sms_sent' ? 'bg-emerald-50 text-emerald-600' :
                                  act.type === 'status_change' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-500'
                                }`}>
                                  {act.type === 'call' ? 'تماس تلفنی' :
                                   act.type === 'sms_sent' ? 'ارسال پیامک' :
                                   act.type === 'status_change' ? 'تغییر وضعیت' : 'یادداشت جدید'}
                                </span>
                                <span className="text-[9px] font-mono font-bold text-gray-300">
                                  {new Date(act.created_at).toLocaleString('fa-IR', { timeStyle: 'short', dateStyle: 'short' })}
                                </span>
                             </div>
                             <p className="text-sm text-gray-700 font-bold leading-relaxed">{act.content}</p>
                             <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-black text-gray-400">
                                   {act.expert_name?.[0]}
                                </div>
                                <span className="text-[9px] font-black text-gray-400">{act.expert_name || 'سیستم'}</span>
                             </div>
                          </div>
                       </div>
                     ))}
                     {activities.length === 0 && (
                       <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                          <p className="text-gray-400 font-bold text-sm">هنوز هیچ فعالیتی برای این لید ثبت نشده است.</p>
                       </div>
                     )}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'deposits' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
                 <div className="bg-white border-2 border-blue-50 p-6 sm:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <TrendingUp size={32} />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-gray-900">ثبت واریزی یا قسط جدید</h4>
                        <p className="text-gray-400 text-sm mt-1">اطلاعات فیش واریزی مشتری را وارد کنید</p>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex flex-col md:flex-row gap-6 items-center">
                       <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block px-1">محصول / خدمت انتخاب شده (اجباری)</label>
                          <select 
                            value={newDeposit.product_id || ''}
                            onChange={e => {
                               const pid = e.target.value ? Number(e.target.value) : null;
                               const prod = products.find(p => p.id === pid);
                               setNewDeposit({
                                 ...newDeposit, 
                                 product_id: pid,
                                 amount: prod ? prod.price : ''
                               });
                            }}
                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-dana"
                          >
                             <option value="">انتخاب محصول یا خدمت...</option>
                             {products.map(p => <option key={p.id} value={p.id}>{p.name} ({parseInt(p.price || '0').toLocaleString()} تومان)</option>)}
                          </select>
                       </div>
                       <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                          <button 
                            onClick={() => setNewDeposit({...newDeposit, payment_type: 'cash'})}
                            className={`px-6 py-3 rounded-xl font-black text-xs transition-all ${newDeposit.payment_type === 'cash' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            واریز نقدی
                          </button>
                          <button 
                            onClick={() => {
                               const prod = products.find(p => p.id === newDeposit.product_id);
                               if (prod && !prod.installments_enabled) {
                                 return toast.error('قابلیت اقساط برای این محصول فعال نیست');
                               }
                               setNewDeposit({...newDeposit, payment_type: 'installments'});
                            }}
                            className={`px-6 py-3 rounded-xl font-black text-xs transition-all ${newDeposit.payment_type === 'installments' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            فروش اقساطی
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">{newDeposit.payment_type === 'cash' ? 'کل مبلغ واریزی شده' : 'مبلغ پیش‌پرداخت'} (تومان)</label>
                          <input 
                            type="number"
                            value={newDeposit.amount}
                            onChange={e => setNewDeposit({...newDeposit, amount: e.target.value})}
                            placeholder="مثال: 5000000"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">تاریخ فیش واریزی</label>
                          <DatePicker
                            calendar={persian}
                            locale={persian_fa}
                            plugins={[<TimePicker position="bottom" />]}
                            value={newDeposit.payment_date}
                            onChange={(date) => setNewDeposit({...newDeposit, payment_date: date as DateObject})}
                            inputClass="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                            containerClassName="w-full"
                          />
                       </div>
                    </div>

                    {newDeposit.payment_type === 'installments' && (
                       <div className="md:col-span-2 space-y-4 p-6 bg-amber-50/50 rounded-3xl border border-amber-100">
                          <div className="flex justify-between items-center px-1">
                             <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">برنامه اقساط مشتری</h5>
                             <button onClick={addInstallmentRow} className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-white px-3 py-1 rounded-full border border-amber-200 hover:bg-amber-100 transition-all">
                                <Plus size={12} /> افزودن قسط
                             </button>
                          </div>
                          <div className="space-y-3">
                             {newDeposit.installments.map((inst, idx) => (
                                <div key={idx} className="flex gap-4 items-end animate-in fade-in slide-in-from-right-2">
                                   <div className="flex-1 space-y-1">
                                      <label className="text-[8px] font-black text-amber-400 uppercase pr-2">مبلغ قسط {idx + 1}</label>
                                      <input 
                                        type="number"
                                        placeholder="مبلغ..."
                                        value={inst.amount}
                                        onChange={e => updateInstallment(idx, 'amount', e.target.value)}
                                        className="w-full bg-white border border-amber-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                                      />
                                   </div>
                                   <div className="flex-1 space-y-1">
                                      <label className="text-[8px] font-black text-amber-400 uppercase pr-2">تاریخ سررسید</label>
                                      <DatePicker
                                        calendar={persian}
                                        locale={persian_fa}
                                        value={inst.due_date}
                                        onChange={date => updateInstallment(idx, 'due_date', date)}
                                        inputClass="w-full bg-white border border-amber-100 rounded-xl px-4 py-2 text-xs font-bold"
                                        containerClassName="w-full"
                                      />
                                   </div>
                                   <button onClick={() => removeInstallmentRow(idx)} className="p-2 text-red-300 hover:text-red-500 transition-all">
                                      <Trash2 size={16} />
                                   </button>
                                </div>
                             ))}
                             {newDeposit.installments.length === 0 && <p className="text-center text-amber-300 text-[10px] font-bold py-4">هنوز قسطی اضافه نشده است</p>}
                          </div>
                       </div>
                    )}

                    <div className="md:col-span-2 space-y-2">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">لینک تصاویر فیش (الزامی - با کاما جدا کنید)</label>
                          <label className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all cursor-pointer">
                             <Upload size={14} />
                             آپلود تصویر فیش
                             <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                          </label>
                       </div>
                       <textarea 
                         rows={2}
                         value={newDeposit.receipt_urls}
                         onChange={e => setNewDeposit({...newDeposit, receipt_urls: e.target.value})}
                         placeholder="https://link-to-receipt1.com, https://link-to-receipt2.com"
                         className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none shadow-inner"
                       />
                       <p className="text-[8px] text-gray-400 font-bold px-2">شما می‌توانید لینک مستقیم تصویر یا فایل فیش را در کادر بالا وارد کنید یا با دکمه بالا تصویر را آپلود نمایید.</p>
                    </div>
                    <button 
                      onClick={handleAddDeposit}
                      className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                    >
                      ثبت واریزی و ارسال برای تایید حسابداری
                    </button>
                 </div>

                 <div className="space-y-4">
                    <h5 className="text-sm font-black text-gray-900 border-r-4 border-blue-500 pr-3">تاریخچه واریزی‌های این مشتری</h5>
                    <div className="grid gap-4">
                       {deposits.map(d => (
                         <div key={d.id} className="bg-white border border-gray-100 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                               <div className={`p-3 rounded-xl ${d.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : d.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {d.status === 'approved' ? <CheckCircle2 size={24} /> : d.status === 'rejected' ? <X size={24} /> : <Clock size={24} />}
                               </div>
                               <div>
                                  <p className="font-black text-gray-900">{(parseInt(d.amount) || 0).toLocaleString()} تومان</p>
                                  <p className="text-[10px] font-bold text-gray-400">بابت: {d.product_name || 'خدمات نامشخص'}</p>
                               </div>
                            </div>
                            <div className="text-center sm:text-left">
                               <p className="text-[10px] font-black text-gray-500 mb-1">وضعیت: 
                                 <span className={`mr-1 ${d.status === 'approved' ? 'text-emerald-600' : d.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                                   {d.status === 'approved' ? 'تایید شده' : d.status === 'rejected' ? 'رد شده' : 'در انتظار تایید'}
                                 </span>
                               </p>
                               <p className="text-[10px] text-gray-400 font-mono">
                                 {new Date(d.payment_date).toLocaleDateString('fa-IR')}
                               </p>
                            </div>
                            <div className="flex gap-2">
                               {(JSON.parse(d.receipt_urls || '[]') as string[]).map((url, i) => (
                                 <a key={i} href={url} target="_blank" rel="noreferrer" className="p-2 bg-gray-50 text-blue-600 rounded-lg hover:bg-blue-50 transition-all shadow-sm">
                                   <ExternalLink size={16} />
                                 </a>
                               ))}
                            </div>
                            {d.status === 'rejected' && d.rejection_reason && (
                              <div className="w-full mt-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">
                                 <strong>علت رد:</strong> {d.rejection_reason}
                              </div>
                            )}
                         </div>
                       ))}
                       {deposits.length === 0 && <div className="p-10 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">تاکنون فیشی ثبت نشده است.</div>}
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'call' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 sm:p-10 rounded-[3rem] shadow-2xl shadow-blue-600/20 text-white space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl">
                      <Phone size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">ثبت فعالیت تماس</h3>
                      <p className="text-blue-100 text-sm mt-1">خلاصه‌ای از مکالمه و قول و قرارهای خود را بنویسید</p>
                    </div>
                  </div>
                  <textarea 
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="در حال حاضر لید در چه شرایطی است؟ پیشنهاد شما چه بود؟" 
                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-6 text-white placeholder:text-white/50 outline-none focus:ring-4 focus:ring-white/10 transition-all resize-none min-h-[140px] font-medium"
                  />
                  <button 
                    onClick={() => handleAddActivity('call', newNote)} 
                    disabled={!newNote.trim()}
                    className="w-full sm:w-auto bg-white text-blue-700 font-black px-12 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20 disabled:opacity-50"
                  >
                    ثبت نهایی گزارش تماس
                  </button>
                </div>

                <div className="bg-white border-2 border-emerald-50 p-8 sm:p-10 rounded-[3rem] shadow-sm space-y-8">
                   <div className="flex items-center gap-4">
                     <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                       <Calendar size={32} />
                     </div>
                     <div>
                       <h4 className="text-2xl font-black text-gray-900">تعیین زمان پیگیری بعدی</h4>
                       <p className="text-gray-400 text-sm mt-1">قرار تماس بعدی را تنظیم کنید تا در تسک‌های روزانه نمایش داده شود</p>
                     </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-xs font-black text-gray-500 mr-2 uppercase tracking-widest block">انتخاب تاریخ و ساعت دقیق</label>
                        <DatePicker
                          calendar={persian}
                          locale={persian_fa}
                          plugins={[<TimePicker position="bottom" />]}
                          className="modern-datepicker-container"
                          containerClassName="w-full"
                          inputClass="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-black text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                          value={followupDate}
                          onChange={(date) => setFollowupDate(date as DateObject)}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-gray-500 mr-2 uppercase tracking-widest block">هدف از پیگیری بعدی</label>
                        <input 
                          placeholder="ارسال پیش فاکتور، پیگیری مجدد و..."
                          value={followupNotes} 
                          onChange={e => setFollowupNotes(e.target.value)} 
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                        />
                      </div>
                   </div>
                   <button 
                    onClick={handleSetFollowup} 
                    disabled={!followupDate}
                    className="w-full sm:w-auto bg-emerald-600 text-white font-black px-12 py-4 rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                   >
                     ثبت زمان‌بندی پیگیری
                   </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'sms' && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">ارسال پیامک از قالب‌های هوشمند</h3>
                    <p className="text-gray-400 text-sm mt-1">یک قالب را انتخاب کنید تا متن آن برای مشتری نهایی شود</p>
                  </div>
                  <button className="bg-gray-100 text-gray-600 p-3 rounded-xl hover:bg-gray-200 transition-all">
                    <SettingsIcon size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {smsTemplates.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`group p-6 rounded-[2rem] border-2 text-right transition-all relative ${
                        selectedTemplate === t.id 
                          ? 'border-blue-500 bg-blue-50/30' 
                          : 'border-transparent bg-white shadow-sm hover:shadow-md hover:border-gray-200'
                      }`}
                    >
                       <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${selectedTemplate === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                              <MessageSquare size={18} />
                            </div>
                            <span className="font-extrabold text-gray-900">{t.name}</span>
                         </div>
                         {selectedTemplate === t.id && (
                           <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                             <CheckCircle2 className="text-blue-600" size={20} />
                           </motion.div>
                         )}
                       </div>
                       <p className="text-xs text-gray-500 leading-relaxed font-bold line-clamp-3 mb-4">{t.content}</p>
                       {t.pattern_code && <span className="text-[8px] bg-white border border-gray-100 text-gray-400 px-2 py-1 rounded-md font-mono font-black uppercase">CODE: {t.pattern_code}</span>}
                    </button>
                  ))}
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button 
                    onClick={handleSendSMS}
                    disabled={!selectedTemplate}
                    className="w-full p-5 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 text-lg"
                  >
                    <Send size={24} /> ارسال پیامک بلادرنگ
                  </button>
                  <p className="text-center text-gray-400 text-[10px] mt-4 font-bold flex items-center justify-center gap-1">
                    <AlertCircle size={12} /> محتوا مطابق با قوانین فیلترینگ و پترن‌های تایید شده ارسال خواهد شد
                  </p>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </motion.div>
    </div>
  );
};
