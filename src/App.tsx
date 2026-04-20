
import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import { Settings } from './types';
import { Toaster } from 'react-hot-toast';

export const SettingsContext = createContext<{
  settings: Settings;
  refreshSettings: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}>({
  settings: {} as Settings,
  refreshSettings: () => {},
  isDarkMode: false,
  toggleDarkMode: () => {},
});

export default function App() {
  const [settings, setSettings] = useState<Settings>({} as Settings);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const refreshSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      console.log('Settings fetched:', res.data);
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  useEffect(() => {
    refreshSettings();
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') setIsDarkMode(true);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('darkMode', (!isDarkMode).toString());
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // CSS Variables for custom colors
  const rootStyle: React.CSSProperties = {
    // @ts-ignore
    '--color-primary': settings.primary_color || '#2563eb',
    '--color-secondary': settings.secondary_color || '#f59e0b',
  };

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings, isDarkMode, toggleDarkMode }}>
      <Toaster position="top-center" reverseOrder={false} />
      <div style={rootStyle} className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Routes>
        </Router>
      </div>
    </SettingsContext.Provider>
  );
}
