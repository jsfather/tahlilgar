
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, User, CheckCircle2, ChevronLeft, Loader2, RefreshCw, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomField, Product } from '../types';

interface Props {
  onVerified: (name: string) => void;
  settings: any;
}

export default function OTPForm({ onVerified, settings }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    code: '',
    requested_product_id: null as number | null,
    custom_data: {} as Record<string, string>
  });

  useEffect(() => {
    axios.get('/api/custom-fields').then(res => setCustomFields(res.data)).catch(() => {});
    axios.get('/api/products').then(res => setProducts(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let interval: any;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name) {
      toast.error('لطفاً نام خود را وارد کنید');
      return;
    }
    if (!formData.phone || formData.phone.length < 11) {
      toast.error('شماره موبایل نامعتبر است');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/otp/request', { phone: formData.phone });
      toast.success('کد تایید ارسال شد');
      setStep(2);
      setTimer(60);
      setCanResend(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.code.length < 6) {
      toast.error('کد تایید باید ۶ رقم باشد');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/otp/verify', { 
        ...formData, 
        custom_data: JSON.stringify(formData.custom_data) 
      });
      toast.success(`${formData.name} عزیز، خوش آمدید!`);
      onVerified(formData.name);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'کد تایید اشتباه است');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-11 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white";
  const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5";

  const handlePhoneChange = (val: string) => {
    // Convert Persian/Arabic digits to English digits
    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    let clean = val.replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d).toString());
    clean = clean.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
    
    // Remove non-numeric characters for the phone field
    clean = clean.replace(/[^0-9+]/g, '');
    
    setFormData({...formData, phone: clean});
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-24 h-24 bg-gray-100 rounded-full mb-4 flex items-center justify-center overflow-hidden border-2 border-primary/20 p-1">
          {settings.form_avatar ? (
            <img src={settings.form_avatar} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <User className="text-primary/40 shrink-0" size={48} />
          )}
        </div>
        <h2 
          className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2"
          dangerouslySetInnerHTML={{ __html: settings.form_title }}
        />
        <div 
          className="text-gray-500 dark:text-gray-400 text-xs md:text-sm"
          dangerouslySetInnerHTML={{ __html: settings.form_description }}
        />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleRequestOTP} 
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label className={labelClass}>{settings.form_name_label}</label>
                  <div className="relative">
                     <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                     <input 
                       type="text" 
                       required 
                       placeholder="نام و نام خانوادگی"
                       className={inputClass}
                       value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                     />
                  </div>
               </div>
               <div>
                  <label className={labelClass}>{settings.form_phone_label}</label>
                  <div className="relative">
                     <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                     <input 
                       type="tel" 
                       required 
                       placeholder="0912-------"
                       dir="ltr"
                       className={`${inputClass} text-left tracking-widest`}
                       value={formData.phone}
                       onChange={(e) => handlePhoneChange(e.target.value)}
                     />
                  </div>
               </div>
            </div>

            {settings.show_registration_products === '1' && products.length > 0 && (
              <div className="space-y-1.5">
                <label className={labelClass}>{settings.registration_product_label}</label>
                <div className="relative">
                   <Star className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <select 
                     className={inputClass}
                     value={formData.requested_product_id || ''}
                     onChange={e => setFormData({...formData, requested_product_id: e.target.value ? Number(e.target.value) : null})}
                   >
                      <option value="">انتخاب {settings.registration_product_label} (اختیاری)</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
              </div>
            )}

            {customFields.filter(f => f.target === 'registration').map(f => (
              <div key={f.id} className="space-y-1.5">
                 <label className={labelClass}>{f.label}</label>
                 {f.type === 'select' ? (
                    <select 
                      required={f.is_required}
                      className={inputClass}
                      value={formData.custom_data[f.name] || ''}
                      onChange={e => setFormData({...formData, custom_data: {...formData.custom_data, [f.name]: e.target.value}})}
                    >
                       <option value="">انتخاب {f.label}...</option>
                       {f.options.split(',').map(opt => <option key={opt} value={opt}> {opt.trim()} </option>)}
                    </select>
                 ) : (
                    <input 
                      type={f.type === 'number' ? 'number' : 'text'}
                      required={f.is_required}
                      className={inputClass}
                      placeholder={`${f.label}...`}
                      value={formData.custom_data[f.name] || ''}
                      onChange={e => setFormData({...formData, custom_data: {...formData.custom_data, [f.name]: e.target.value}})}
                    />
                 )}
              </div>
            ))}

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    <span>دریافت کد تایید</span>
                    <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-4">با ورود به سامانه، شرایط و قوانین را می‌پذیرم</p>
            </div>
          </motion.form>
        ) : (
          <motion.form 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleVerifyOTP} 
            className="space-y-6"
          >
            <div className="text-center md:text-right mb-6">
              <h3 className="text-2xl font-bold mb-2">تایید هویت</h3>
              <p className="text-gray-500 text-sm">کد ۶ رقمی ارسال شده به {formData.phone} را وارد کنید</p>
            </div>

            <div>
              <label className={labelClass}>کد تایید</label>
              <input 
                type="text" 
                required 
                placeholder="------"
                className={`${inputClass} text-center text-3xl tracking-[0.5em] font-black`}
                maxLength={6}
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
              />
              <div className="mt-4 flex items-center justify-between px-2">
                {canResend ? (
                  <button 
                    type="button"
                    onClick={() => handleRequestOTP()}
                    className="text-primary font-bold text-sm flex items-center gap-1 hover:text-primary/80 transition-colors"
                  >
                    <RefreshCw size={14} />
                    <span>ارسال مجدد کد</span>
                  </button>
                ) : (
                  <div className="text-gray-400 text-xs font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    <span>زمان باقی‌مانده: </span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">
                      {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-gray-500 text-xs hover:underline hover:text-gray-700 dark:hover:text-gray-300"
                >
                  اصلاح شماره
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    <CheckCircle2 />
                    <span>تایید و ورود</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
