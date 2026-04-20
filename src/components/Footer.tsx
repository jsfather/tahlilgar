
import React, { useContext } from 'react';
import { SettingsContext } from '../App';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function Footer() {
  const { settings } = useContext(SettingsContext);

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12 mt-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            {!!(settings.header_logo && settings.header_logo !== "") ? (
              <img 
                src={settings.header_logo || null} 
                alt="Logo" 
                className="h-10 opacity-60 grayscale hover:grayscale-0 transition-all"
                referrerPolicy="no-referrer"
              />
            ) : (
              <img 
                src="https://picsum.photos/seed/pordanash/100/100" 
                alt="Logo Placeholder" 
                className="h-10 opacity-60 grayscale hover:grayscale-0 transition-all"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-gray-400 font-medium">|</span>
            <span className="text-gray-500 dark:text-gray-400 font-semibold">{settings.site_title}</span>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
            <div 
              className="text-gray-400 text-sm text-center md:text-right"
              dangerouslySetInnerHTML={{ __html: settings.footer_text }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
