
import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../App';
import Header from './Header';
import Footer from './Footer';
import OTPForm from './OTPForm';
import VideoPlayer from './VideoPlayer';
import Countdown from './Countdown';
import DownloadBox from './DownloadBox';
import ContactPopup from './ContactPopup';
import { TestimonialsSlider } from './TestimonialsSlider';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share2, MessageCircle, AlertCircle, Clock, LogOut } from 'lucide-react';
import jalaali from 'jalaali-js';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Testimonial } from '../types';

export default function LandingPage() {
  const { settings } = useContext(SettingsContext);
  const [isVerified, setIsVerified] = useState(false);
  const [userName, setUserName] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [customStats, setCustomStats] = useState<any[]>([]);

  useEffect(() => {
    if (settings.show_testimonials === '1') {
      axios.get('/api/testimonials')
        .then(res => setTestimonials(res.data))
        .catch(err => console.error(err));
    }
    axios.get('/api/custom-stats')
      .then(res => setCustomStats(res.data))
      .catch(err => console.error(err));
  }, [settings.show_testimonials]);

  useEffect(() => {
    // Only track if not already session-tracked this visit
    const isTracked = sessionStorage.getItem('pageTracked');
    if (!isTracked) {
      axios.get('/api/stats?track=true')
        .catch(err => console.error(err));
      sessionStorage.setItem('pageTracked', 'true');
    }

    const verified = sessionStorage.getItem('isVerified');
    const name = sessionStorage.getItem('userName');
    if (verified === 'true') {
      setIsVerified(true);
      if (name) setUserName(name);
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerified = (name: string) => {
    setIsVerified(true);
    setUserName(name);
    sessionStorage.setItem('isVerified', 'true');
    sessionStorage.setItem('userName', name);
  };

  const handleLogout = () => {
    setIsVerified(false);
    setUserName('');
    sessionStorage.removeItem('isVerified');
    sessionStorage.removeItem('userName');
    toast.success('با موفقیت خارج شدید');
  };

  const getSolarDate = () => {
    const j = jalaali.toJalaali(currentTime.getFullYear(), currentTime.getMonth() + 1, currentTime.getDate());
    const weekDays = ['یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    const months = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    return `${weekDays[currentTime.getDay()]} ${j.jd} ${months[j.jm - 1]} ${j.jy}`;
  };

  const getFaTime = () => {
    return currentTime.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {isVerified && <Header />}
      
      {/* Welcome Banner & Clock */}
      {isVerified && (
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="container mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full md:w-auto md:gap-8">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm md:text-base"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{userName} عزیز، خوش آمدید</span>
              </motion.div>
              
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors text-[10px] md:text-xs font-bold px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg md:mr-4"
              >
                <LogOut size={14} />
                <span>خروج</span>
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-gray-400 text-[10px] md:text-xs font-medium bg-white dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                <Clock size={14} className="text-primary" />
                <span dir="ltr">{getSolarDate()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="opacity-60">ساعت:</span>
                <span className="font-mono font-bold text-primary" dir="ltr">{getFaTime()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <main 
        className={`flex-grow container mx-auto px-4 py-8 ${!isVerified ? 'flex items-center justify-center min-w-full' : ''}`}
        style={!isVerified ? { 
          backgroundColor: settings.registration_bg_color || undefined,
          backgroundImage: settings.registration_bg_image ? `url(${settings.registration_bg_image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        {!isVerified ? (
          <div className="max-w-xl mx-auto w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 p-8 md:p-12"
            >
              <OTPForm onVerified={handleVerified} settings={settings} />
            </motion.div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 max-w-5xl mx-auto"
          >
            {/* Main Title */}
            <header className="text-center space-y-4">
              <h1 
                className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary py-2 leading-tight rtl-editor-content"
                style={{ 
                  fontSize: window.innerWidth > 768 ? `${settings.main_title_fs_d}px` : `${settings.main_title_fs_m}px` 
                }}
                dangerouslySetInnerHTML={{ __html: settings.main_title }}
              />
              <div 
                className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 py-2 px-4 md:py-3 md:px-6 rounded-2xl border border-amber-200 dark:border-amber-800 animate-pulse-soft rtl-editor-content"
                style={{
                  fontSize: window.innerWidth > 768 ? `${settings.lottery_info_fs_d}px` : `${settings.lottery_info_fs_m}px`
                }}
              >
                <AlertCircle size={20} className="shrink-0" />
                <span className="font-semibold" dangerouslySetInnerHTML={{ __html: settings.lottery_info }} />
              </div>
            </header>

            {/* Top Banner (Above Video) */}
            {settings.top_banner_enabled === '1' && settings.top_banner_image && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-lg border border-gray-100"
              >
                <img 
                  src={settings.top_banner_image} 
                  alt="Top Banner" 
                  className="w-full h-auto object-cover" 
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            )}

            {/* Video Banner (Optional) */}
            {settings.video_banner_enabled === '1' && settings.video_banner_image && (
              <div className="w-full">
                 <img src={settings.video_banner_image} className="w-full rounded-2xl md:rounded-[2rem] shadow-md" alt="Video Banner" referrerPolicy="no-referrer" />
              </div>
            )}

            {/* Video Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
              <VideoPlayer 
                type={settings.video_type} 
                link={settings.video_link} 
                cover={settings.video_cover}
                showVideo={settings.video_no_timer === '1' || settings.show_video === '1'}
                countdownEnd={settings.countdown_end}
                placeholderTitle={settings.timer_title}
                placeholderText={settings.video_placeholder_text}
              />
            </div>

            <div className={`grid grid-cols-1 ${settings.show_video === '1' && settings.show_timer === '1' ? 'md:grid-cols-2' : ''} gap-6 md:gap-8`}>
              {settings.show_video === '1' && settings.show_timer === '1' && (
                <div className="bg-gradient-to-br from-indigo-900 to-blue-800 rounded-3xl md:rounded-[2rem] p-6 md:p-8 text-white shadow-xl flex flex-col items-center justify-center text-center">
                  <h3 className="text-sm md:text-lg font-medium opacity-80 mb-4">{settings.timer_title}</h3>
                  <div className="w-full flex justify-center">
                    <Countdown targetDate={settings.countdown_end} />
                  </div>
                </div>
              )}
              
              <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-[2rem] p-6 md:p-8 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-center space-y-4 text-center md:text-right">
                <div className="flex items-center justify-center md:justify-start gap-3 text-emerald-600 dark:text-emerald-400">
                  <MessageCircle size={24} className="md:w-8 md:h-8" />
                  <span className="text-lg md:text-xl font-bold">مشارکت در تجارت</span>
                </div>
                <p 
                  className="text-gray-600 dark:text-gray-400 leading-relaxed rtl-editor-content"
                  style={{
                    fontSize: window.innerWidth > 768 ? `${settings.participation_text_fs_d}px` : `${settings.participation_text_fs_m}px`
                  }}
                  dangerouslySetInnerHTML={{ __html: settings.participation_text }}
                />
                <div className="flex items-center justify-center md:justify-start gap-2 bg-gray-50 dark:bg-gray-900 p-3 md:p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                  <span className="text-[10px] md:text-xs uppercase text-gray-400 font-mono">Code:</span>
                  <span className="text-xl md:text-2xl font-bold tracking-widest text-primary">31</span>
                  <span className="mx-1 md:mx-2 text-gray-300">|</span>
                  <span className="text-sm md:text-lg font-medium">100010007008</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-8">
               <div className="text-center md:text-right space-y-2">
                 <h4 className="text-2xl md:text-3xl font-black text-gray-900">{settings.stats_title || 'فرصت‌های درآمدزایی اجرایی شده'}</h4>
                 <p className="text-gray-500 font-medium">{settings.stats_description || 'مجموعه پوردانش تا کنون مسیر موفقیت هزاران نفر را هموار کرده است.'}</p>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                 {/* Default Stat (Total) */}
                 <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 border border-amber-100 dark:border-amber-900/30 flex flex-col items-center justify-center text-center space-y-2">
                    <span className="text-3xl md:text-4xl font-black text-amber-600 line-clamp-1">{settings.missed_opportunities_count}</span>
                    <span className="text-[10px] md:text-xs text-amber-700 dark:text-amber-400 font-black uppercase tracking-widest">مجموع کل</span>
                 </div>
                 
                 {/* Custom Stats Cards */}
                 {customStats.map((cs, idx) => (
                   <div key={cs.id || idx} className="bg-blue-50 dark:bg-blue-900/10 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center justify-center text-center space-y-2 group hover:scale-[1.02] transition-transform">
                      <span className="text-3xl md:text-4xl font-black text-blue-600 line-clamp-1">{cs.count}</span>
                      <span className="text-[10px] md:text-xs text-blue-700 dark:text-blue-400 font-black uppercase tracking-widest">{cs.title}</span>
                   </div>
                 ))}
               </div>
            </div>

            {/* Downloads */}
            <DownloadBox title={settings.download_box_title} />

            {/* Testimonials */}
            {settings.show_testimonials === '1' && (
              <TestimonialsSlider data={testimonials} title={settings.testimonials_title} />
            )}

            {/* Bottom Banner */}
            {settings.show_bottom_banner === '1' && settings.bottom_banner_image && (
              <a 
                href={settings.bottom_banner_link || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl transition-transform hover:scale-[1.01]"
              >
                <img 
                  src={settings.bottom_banner_image} 
                  alt="Bottom Banner" 
                  className="w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </a>
            )}

            {/* Legacy Bottom Banner (if exists and show_bottom_banner is off) */}
            {settings.show_bottom_banner !== '1' && !!(settings.bottom_banner && settings.bottom_banner !== "") && (
              <div className="rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl">
                <img 
                  src={settings.bottom_banner || null} 
                  alt="Bottom Banner" 
                  className="w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </motion.div>
        )}
      </main>

      {isVerified && <Footer />}

      {/* Floating Action PopUps */}
      <button 
        onClick={() => setShowContact(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40 animate-bounce"
      >
        <MessageCircle size={32} />
      </button>

      <AnimatePresence>
        {showContact && (
          <ContactPopup 
            onClose={() => setShowContact(false)}
            insta={settings.instagram_link}
            phone={settings.phone_link}
            customLink={settings.custom_popup_link}
            customLabel={settings.custom_popup_label}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const textStyles = {
  primary: "text-[var(--color-primary)]",
  secondary: "text-[var(--color-secondary)]",
  bgPrimary: "bg-[var(--color-primary)]",
  bgSecondary: "bg-[var(--color-secondary)]",
};

