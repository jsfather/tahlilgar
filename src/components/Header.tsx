
import React, { useContext } from 'react';
import { SettingsContext } from '../App';
import { Sun, Moon } from 'lucide-react';

export default function Header() {
  const { settings, isDarkMode, toggleDarkMode } = useContext(SettingsContext);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!!(settings.header_logo && settings.header_logo !== "") ? (
            <img 
              src={settings.header_logo || null} 
              alt="Logo" 
              className="h-12 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <img 
              src="https://picsum.photos/seed/pordanash/100/100" 
              alt="Logo Placeholder" 
              className="h-12 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          )}
          <h1 className="hidden sm:block text-xl font-black text-gray-800 dark:text-gray-100">
            {settings.site_title}
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
