
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, FileText } from 'lucide-react';
import { Download as DownloadType } from '../types';

interface Props {
  title: string;
}

export default function DownloadBox({ title }: Props) {
  const [downloads, setDownloads] = useState<DownloadType[]>([]);

  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    try {
      const res = await axios.get('/api/downloads');
      setDownloads(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-primary/10 dark:bg-primary/20 p-2 md:p-3 rounded-xl md:rounded-2xl text-primary dark:text-primary">
          <Download size={24} className="md:w-7 md:h-7" />
        </div>
        <h3 className="text-lg md:text-2xl font-bold">{title}</h3>
      </div>

      <div className="space-y-3 md:space-y-4">
        {Array.isArray(downloads) && downloads.length > 0 ? downloads.map((item) => (
          <div 
            key={item.id}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 md:p-5 rounded-xl md:rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
              <div className="bg-white dark:bg-gray-800 p-2 md:p-2.5 rounded-lg md:rounded-xl shadow-sm text-gray-400 group-hover:text-primary transition-colors shrink-0">
                <FileText size={18} className="md:w-5 md:h-5" />
              </div>
              <div className="text-right flex-grow overflow-hidden">
                <h4 className="font-bold text-xs md:text-sm lg:text-base truncate">{item.title}</h4>
                <p className="text-[9px] md:text-xs text-gray-500">حجم فایل: {item.size}</p>
              </div>
            </div>
            
            <a 
              href={item.link} 
              target="_blank" 
              rel="noreferrer"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 text-xs lg:text-sm shrink-0 whitespace-nowrap"
            >
              <Download size={14} className="md:w-4 md:h-4" />
              <span>دانلود فایل</span>
            </a>
          </div>
        )) : (
          <p className="text-gray-400 text-center py-4">فایلی برای دانلود موجود نیست.</p>
        )}
      </div>
    </div>
  );
}
