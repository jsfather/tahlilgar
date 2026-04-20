
import React from 'react';
import { motion } from 'motion/react';
import { Camera, Phone, X, MessageCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  insta: string;
  phone: string;
  customLink?: string;
  customLabel?: string;
}

export default function ContactPopup({ onClose, insta, phone, customLink, customLabel }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white dark:bg-gray-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute left-4 top-4 md:left-6 md:top-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400"
        >
          <X size={20} />
        </button>

        <div className="text-center space-y-6">
          <div className="inline-flex p-5 rounded-3xl bg-primary/10 text-primary">
            <MessageCircle size={40} className="md:w-16 md:h-16" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-black">پل‌های ارتباطی</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base px-4">کارشناسان ما آماده پاسخگویی به شما هستند.</p>
          </div>

          <div className="grid gap-4">
            <a 
              href={`https://instagram.com/${insta.replace('@', '')}`} 
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl md:rounded-3xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold group hover:shadow-lg hover:shadow-pink-500/30 transition-all shadow-md"
            >
              <div className="flex items-center gap-3">
                <Camera size={22} className="md:w-6 md:h-6" />
                <span className="text-sm md:text-base">اینستاگرام</span>
              </div>
              <span className="text-xs opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all">مشاهده</span>
            </a>

            <a 
              href={`tel:${phone}`}
              className="flex items-center justify-between p-4 rounded-2xl md:rounded-3xl bg-blue-600 text-white font-bold group hover:shadow-lg hover:shadow-blue-500/30 transition-all shadow-md"
            >
              <div className="flex items-center gap-3">
                <Phone size={22} className="md:w-6 md:h-6" />
                <span className="text-sm md:text-base">تماس مستقیم</span>
              </div>
              <span className="text-xs opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all">تماس بگیرید</span>
            </a>

            {customLink && (
              <a 
                href={customLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 rounded-2xl md:rounded-3xl bg-emerald-600 text-white font-bold group hover:shadow-lg hover:shadow-emerald-500/30 transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle size={22} className="md:w-6 md:h-6" />
                  <span className="text-sm md:text-base">{customLabel || 'لینک دلخواه'}</span>
                </div>
                <span className="text-xs opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all">مشاهده</span>
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
