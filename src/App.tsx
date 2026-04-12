import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, Home, FileText, Settings, Menu, X, ChevronRight, 
  Send, Plus, Trash2, Edit2, Save, LogIn, Moon, Sun, Phone, 
  Instagram, MessageCircle, Download, Search, Users, Eye, 
  Calendar, Quote, CheckCircle2, Play
} from "lucide-react";
import { FormDefinition, ContentBlock, SiteSettings, Submission, FormField, SocialLink } from "./types";

// --- Context & Theme ---

const ThemeContext = createContext<{
  isDark: boolean;
  toggleTheme: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}>({ isDark: false, toggleTheme: () => {}, primaryColor: "#2563eb", setPrimaryColor: () => {} });

const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#2563eb");

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, primaryColor, setPrimaryColor }}>
      <div 
        className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"}`} 
        dir="rtl" 
        style={{ "--primary-color": primaryColor } as any}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// --- Helpers ---

const getPersianDate = () => {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" }).format(new Date());
};

const exportToCSV = (data: Submission[]) => {
  const headers = ["ID", "Form", "Email", "Date", "Data"];
  const rows = data.map(sub => [
    sub.id,
    sub.form_name,
    sub.email,
    sub.created_at,
    JSON.stringify(sub.data).replace(/"/g, '""')
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");
  
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `leads_${new Date().toISOString()}.csv`;
  link.click();
};

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 20, x: "-50%" }}
      className={`fixed bottom-10 left-1/2 z-[100] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
        type === "success" 
          ? "bg-emerald-500/90 text-white border-emerald-400" 
          : "bg-rose-500/90 text-white border-rose-400"
      }`}
    >
      {type === "success" ? <CheckCircle2 size={24} /> : <X size={24} />}
      <span className="font-bold text-lg">{message}</span>
    </motion.div>
  );
};

const Navbar = ({ settings }: { settings: SiteSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className={`sticky top-0 z-50 border-b transition-all duration-300 ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-gray-100"} backdrop-blur-md`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-4">
            {settings.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded-lg" referrerPolicy="no-referrer" />
            )}
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              {settings.site_name}
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Calendar size={16} />
              {getPersianDate()}
            </div>
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all ${isDark ? "bg-slate-800 text-yellow-400" : "bg-gray-100 text-slate-600"}`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link to="/" className="hover:text-primary transition-colors">خانه</Link>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 text-gray-600">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-600">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden border-b overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}
          >
            <div className="px-4 py-4 space-y-4">
              <div className="text-sm text-gray-500 mb-4">{getPersianDate()}</div>
              <Link to="/" onClick={() => setIsOpen(false)} className="block">خانه</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ content, settings }: { content: ContentBlock, settings: SiteSettings }) => {
  const { isDark } = useTheme();
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-right">
            <motion.h1 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {content.title}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-xl mb-10 leading-relaxed ${isDark ? "text-slate-400" : "text-gray-600"}`}
            >
              {content.body}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <a href="#forms" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-xl shadow-primary/20">
                شروع تحلیل دارایی
                <ChevronRight size={20} />
              </a>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
          >
            <div className="absolute -inset-4 bg-primary/20 rounded-[2rem] blur-2xl group-hover:bg-primary/30 transition-all" />
            <div className="relative aspect-video bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/10">
              {settings.video_url ? (
                <video 
                  src={settings.video_url} 
                  controls 
                  className="w-full h-full object-cover"
                  poster="https://picsum.photos/seed/video/800/450"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Play size={64} />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FloatingActions = ({ settings }: { settings: SiteSettings }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (name: string) => {
    switch (name) {
      case "Instagram": return <Instagram size={20} />;
      case "Send": return <Send size={20} />;
      case "MessageCircle": return <MessageCircle size={20} />;
      default: return <Phone size={20} />;
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="flex flex-col items-end gap-3"
          >
            {settings.social_links?.map((link, idx) => (
              <a 
                key={idx}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 bg-white text-gray-700 px-4 py-3 rounded-2xl shadow-xl hover:bg-primary/5 hover:text-primary transition-all group"
              >
                <span className="text-sm font-bold">{link.platform}</span>
                <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-all">
                  {getIcon(link.icon)}
                </div>
              </a>
            ))}
            <a 
              href={`tel:${settings.contact_phone}`}
              className="flex items-center gap-3 bg-white text-gray-700 px-4 py-3 rounded-2xl shadow-xl hover:bg-primary/5 hover:text-primary transition-all group"
            >
              <span className="text-sm font-bold">تماس مستقیم</span>
              <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-all">
                <Phone size={20} />
              </div>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
      >
        {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
      </button>
    </div>
  );
};

const QuoteSection = ({ quotes }: { quotes: string[] }) => {
  const [quote, setQuote] = useState("");
  const { isDark } = useTheme();

  useEffect(() => {
    if (quotes && quotes.length > 0) {
      setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }, [quotes]);

  return (
    <section className="py-12 max-w-4xl mx-auto px-4 text-center">
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className={`p-10 rounded-[3rem] border transition-all ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-primary/5 border-primary/10"}`}
      >
        <Quote size={40} className="mx-auto mb-6 text-primary opacity-50" />
        <p className={`text-2xl font-medium leading-relaxed italic ${isDark ? "text-slate-300" : "text-primary-900"}`}>
          {quote}
        </p>
      </motion.div>
    </section>
  );
};

const PublicForm = ({ form, settings }: { form: FormDefinition, settings: SiteSettings }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { isDark } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/submit/${form.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsSuccess(true);
        setFormData({});
        setNotification({ message: "اطلاعات با موفقیت ثبت شد", type: "success" });
      } else {
        setNotification({ message: "خطا در ثبت اطلاعات", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: "خطا در برقراری ارتباط با سرور", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-10 rounded-[3rem] text-center border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100 shadow-2xl shadow-primary/10"}`}
      >
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className={`text-3xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>اطلاعات با موفقیت ثبت شد</h3>
        <p className={`text-lg mb-8 ${isDark ? "text-slate-400" : "text-gray-600"}`}>کارشناسان ما به زودی با شما تماس خواهند گرفت. تا آن زمان می‌توانید ویدیوی زیر را مشاهده کنید.</p>
        
        <div className="aspect-video bg-slate-900 rounded-3xl overflow-hidden mb-8 shadow-xl">
          {settings.success_video_url ? (
            <video src={settings.success_video_url} controls autoPlay className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">ویدیو موجود نیست</div>
          )}
        </div>

        <button 
          onClick={() => setIsSuccess(false)} 
          className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:opacity-90 transition-all"
        >
          ارسال فرم دیگر
        </button>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {notification && (
          <Toast 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        className={`p-10 rounded-[3rem] border transition-all ${isDark ? "bg-slate-800 border-slate-700 shadow-2xl" : "bg-white border-gray-100 shadow-2xl shadow-blue-100"}`}
      >
        <h3 className={`text-3xl font-bold mb-10 text-center ${isDark ? "text-white" : "text-gray-900"}`}>{form.name}</h3>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {form.fields?.map((field) => (
              <div key={field.id} className={`space-y-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
                <label className={`block text-sm font-bold pr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    required={field.required}
                    className={`w-full px-6 py-4 rounded-2xl border outline-none focus:ring-4 focus:ring-primary/20 transition-all min-h-[150px] ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    value={formData[field.id] || ""}
                  />
                ) : field.type === "select" ? (
                  <select
                    required={field.required}
                    className={`w-full px-6 py-4 rounded-2xl border outline-none focus:ring-4 focus:ring-primary/20 transition-all ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    value={formData[field.id] || ""}
                  >
                    <option value="">انتخاب کنید...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    required={field.required}
                    className={`w-full px-6 py-4 rounded-2xl border outline-none focus:ring-4 focus:ring-primary/20 transition-all ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    value={formData[field.id] || ""}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-primary/20"
          >
            {isSubmitting ? "در حال ارسال..." : "ثبت و ارسال اطلاعات"}
            <Send size={24} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Pages ---

const HomePage = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [content, setContent] = useState<ContentBlock[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const { isDark, setPrimaryColor } = useTheme();

  useEffect(() => {
    fetch("/api/settings").then(res => res.json()).then(data => {
      setSettings(data);
      if (data.primary_color) setPrimaryColor(data.primary_color);
    });
    fetch("/api/content").then(res => res.json()).then(setContent);
    fetch("/api/forms").then(res => res.json()).then(setForms);
  }, []);

  if (!settings) return <div className="min-h-screen flex items-center justify-center">در حال بارگذاری...</div>;

  const heroContent = content.find(c => c.id === "hero") || { id: "hero", title: settings.site_name, body: settings.site_description };

  return (
    <>
      <Navbar settings={settings} />
      <Hero content={heroContent} settings={settings} />
      
      <QuoteSection quotes={settings.quotes} />

      <section id="forms" className="py-20 max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className={`text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>فرم‌های تحلیل هوشمند</h2>
          <p className={`${isDark ? "text-slate-400" : "text-gray-600"}`}>برای دریافت مشاوره اختصاصی و تحلیل دقیق دارایی‌های خود، فرم مربوطه را تکمیل نمایید.</p>
        </div>
        
        <div className="space-y-20">
          {forms?.map((form) => (
            <PublicForm key={form.id} form={form} settings={settings} />
          ))}
        </div>
      </section>

      <FloatingActions settings={settings} />

      <footer className={`border-t py-12 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}>
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          <p>© {new Date().getFullYear()} {settings.site_name}. تمامی حقوق محفوظ است.</p>
        </div>
      </footer>
    </>
  );
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<"leads" | "forms" | "content" | "settings">("leads");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [content, setContent] = useState<ContentBlock[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [stats, setStats] = useState({ online: 0, total: 0 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { isDark, toggleTheme, setPrimaryColor } = useTheme();

  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = () => {
        fetch("/api/submissions").then(res => res.json()).then(data => {
          const emails = data.map((s: any) => s.email).filter((e: string) => e && e.trim() !== "");
          const counts = emails.reduce((acc: any, email: string) => {
            acc[email] = (acc[email] || 0) + 1;
            return acc;
          }, {});
          setSubmissions(data.map((s: any) => ({ ...s, is_duplicate: s.email && s.email.trim() !== "" && counts[s.email] > 1 })));
        });
        fetch("/api/forms").then(res => res.json()).then(setForms);
        fetch("/api/content").then(res => res.json()).then(setContent);
        fetch("/api/settings").then(res => res.json()).then(data => {
          setSettings(data);
          if (data.primary_color) setPrimaryColor(data.primary_color);
        });
        fetch("/api/stats").then(res => res.json()).then(setStats);
      };
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsLoggedIn(true);
        setNotification({ message: "خوش آمدید", type: "success" });
      } else {
        const data = await res.json();
        setNotification({ message: data.message || "رمز عبور اشتباه است", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: "خطا در برقراری ارتباط با سرور", type: "error" });
    }
  };

  const filteredLeads = submissions
    .filter(sub => 
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.form_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(sub.data).toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <LogIn size={40} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">ورود به پنل مدیریت</h2>
            <p className="text-gray-500">لطفا رمز عبور مدیریت را وارد کنید</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="password"
              placeholder="رمز عبور"
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
              ورود به سیستم
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${isDark ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"}`} dir="rtl">
      {/* Sidebar */}
      <aside className={`w-72 border-l flex flex-col sticky top-0 h-screen ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
        <div className={`p-8 border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>مدیریت تحلیلگر</h1>
          <div className="mt-4 flex gap-4">
            <div className={`flex-1 p-3 rounded-2xl ${isDark ? "bg-blue-900/30" : "bg-blue-50"}`}>
              <span className={`text-xs block ${isDark ? "text-blue-300" : "text-blue-400"}`}>آنلاین</span>
              <span className={`text-lg font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>{stats.online}</span>
            </div>
            <div className={`flex-1 p-3 rounded-2xl ${isDark ? "bg-indigo-900/30" : "bg-indigo-50"}`}>
              <span className={`text-xs block ${isDark ? "text-indigo-300" : "text-indigo-400"}`}>کل بازدید</span>
              <span className={`text-lg font-bold ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>{stats.total}</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-3">
          <button 
            onClick={() => setActiveTab("leads")}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === "leads" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Users size={22} />
            لیدها (درخواست‌ها)
          </button>
          <button 
            onClick={() => setActiveTab("forms")}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === "forms" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Plus size={22} />
            مدیریت فرم‌ها
          </button>
          <button 
            onClick={() => setActiveTab("content")}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === "content" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Edit2 size={22} />
            محتوای سایت
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === "settings" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Settings size={22} />
            تنظیمات کلی
          </button>
          <button 
            onClick={toggleTheme}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            {isDark ? <Sun size={22} /> : <Moon size={22} />}
            {isDark ? "حالت روز" : "حالت شب"}
          </button>
        </nav>
        <div className={`p-6 border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
          <Link to="/" className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"}`}>
            <Home size={22} />
            مشاهده سایت
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <AnimatePresence>
          {notification && (
            <Toast 
              message={notification.message} 
              type={notification.type} 
              onClose={() => setNotification(null)} 
            />
          )}
        </AnimatePresence>
        <div className="max-w-6xl mx-auto">
          {activeTab === "leads" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>لیدهای دریافتی</h2>
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      placeholder="جستجو در لیدها..."
                      className={`pr-12 pl-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-100 text-gray-900"}`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                    className={`px-4 py-3 border rounded-xl transition-all flex items-center gap-2 ${isDark ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" : "bg-white border-gray-100 text-gray-900 hover:bg-gray-50"}`}
                  >
                    <Calendar size={18} />
                    {sortOrder === "desc" ? "جدیدترین" : "قدیمی‌ترین"}
                  </button>
                  <button 
                    onClick={() => exportToCSV(filteredLeads)}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-bold"
                  >
                    <Download size={18} />
                    خروجی CSV
                  </button>
                </div>
              </div>

              <div className="grid gap-6">
                {filteredLeads?.map((sub) => (
                  <div key={sub.id} className={`p-8 rounded-[2rem] border transition-all ${sub.is_duplicate ? (isDark ? "border-amber-900 bg-amber-900/10" : "border-amber-200 bg-amber-50/30") : (isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100 shadow-sm")}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                          <Users size={24} />
                        </div>
                        <div>
                          <h3 className={`font-bold text-xl flex items-center gap-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                            {sub.form_name}
                            {sub.is_duplicate && (
                              <span className={`text-xs px-3 py-1 rounded-full font-bold ${isDark ? "bg-amber-900/50 text-amber-400" : "bg-amber-100 text-amber-700"}`}>درخواست مکرر</span>
                            )}
                          </h3>
                          <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>{new Date(sub.created_at).toLocaleString("fa-IR")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block mb-1">ایمیل شناسایی</span>
                        <span className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-gray-700"}`}>{sub.email || "نامشخص"}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {sub.data && Object.entries(sub.data).map(([key, val]) => (
                        <div key={key} className={`p-4 rounded-2xl ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                          <span className="text-xs text-gray-400 block mb-1">{key}</span>
                          <span className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-gray-700"}`}>{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredLeads?.length === 0 && <p className="text-center text-gray-500 py-20">هیچ لیدی یافت نشد.</p>}
              </div>
            </div>
          )}

          {activeTab === "forms" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>مدیریت فرم‌ها</h2>
                <button 
                  onClick={() => {
                    const name = prompt("نام فرم جدید:");
                    if (name) {
                      fetch("/api/forms", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, fields: [] }),
                      }).then(() => fetch("/api/forms").then(res => res.json()).then(setForms));
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100"
                >
                  <Plus size={20} />
                  افزودن فرم جدید
                </button>
              </div>
              
              <div className="grid gap-8">
                {forms?.map((form) => (
                  <div key={form.id} className={`p-8 rounded-[2.5rem] border transition-all ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100 shadow-sm"}`}>
                    <div className="flex justify-between items-center mb-8">
                      <h3 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{form.name}</h3>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            if (confirm("آیا از حذف این فرم مطمئن هستید؟")) {
                              fetch(`/api/forms/${form.id}`, { method: "DELETE" })
                                .then(() => fetch("/api/forms").then(res => res.json()).then(setForms));
                            }
                          }}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <h4 className="font-bold text-sm text-gray-400 uppercase tracking-widest">ساختار فیلدها</h4>
                      {form.fields?.map((field, idx) => (
                        <div key={idx} className={`flex items-center gap-6 p-6 rounded-[2rem] ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                          <div className="flex-1 grid grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <span className="text-[10px] text-gray-400 mr-2">برچسب فیلد</span>
                              <input 
                                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                                value={field.label}
                                onChange={(e) => {
                                  const newFields = [...(form.fields || [])];
                                  newFields[idx].label = e.target.value;
                                  const newForms = forms.map(f => f.id === form.id ? { ...f, fields: newFields } : f);
                                  setForms(newForms as FormDefinition[]);
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-gray-400 mr-2">نوع داده</span>
                              <select 
                                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                                value={field.type}
                                onChange={(e) => {
                                  const newFields = [...(form.fields || [])];
                                  newFields[idx].type = e.target.value as any;
                                  const newForms = forms.map(f => f.id === form.id ? { ...f, fields: newFields } : f);
                                  setForms(newForms as FormDefinition[]);
                                }}
                              >
                                <option value="text">متن کوتاه</option>
                                <option value="number">عدد</option>
                                <option value="email">ایمیل</option>
                                <option value="tel">شماره تلفن</option>
                                <option value="textarea">متن طولانی</option>
                                <option value="select">انتخابی</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-3 pt-4">
                              <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded-lg text-blue-600"
                                checked={field.required}
                                onChange={(e) => {
                                  const newFields = [...(form.fields || [])];
                                  newFields[idx].required = e.target.checked;
                                  const newForms = forms.map(f => f.id === form.id ? { ...f, fields: newFields } : f);
                                  setForms(newForms as FormDefinition[]);
                                }}
                              />
                              <span className={`text-sm font-bold ${isDark ? "text-slate-400" : "text-gray-600"}`}>اجباری</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const newFields = (form.fields || []).filter((_, i) => i !== idx);
                              const newForms = forms.map(f => f.id === form.id ? { ...f, fields: newFields } : f);
                              setForms(newForms as FormDefinition[]);
                            }}
                            className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-6 pt-4">
                        <button 
                          onClick={() => {
                            const newFields: FormField[] = [...(form.fields || []), { id: `f_${Date.now()}`, label: "فیلد جدید", type: "text", required: false }];
                            const newForms = forms.map(f => f.id === form.id ? { ...f, fields: newFields } : f);
                            setForms(newForms as FormDefinition[]);
                          }}
                          className={`flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all ${isDark ? "text-blue-400 hover:bg-blue-900/20" : "text-blue-600 hover:bg-blue-50"}`}
                        >
                          <Plus size={20} />
                          افزودن فیلد جدید
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/forms/${form.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: form.name, fields: form.fields }),
                              });
                              if (res.ok) setNotification({ message: "تغییرات فرم با موفقیت ذخیره شد", type: "success" });
                              else setNotification({ message: "خطا در ذخیره فرم", type: "error" });
                            } catch (err) {
                              console.error(err);
                              setNotification({ message: "خطا در برقراری ارتباط با سرور", type: "error" });
                            }
                          }}
                          className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 shadow-lg"
                        >
                          <Save size={20} />
                          ذخیره نهایی فرم
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "content" && (
            <div className="space-y-8">
              <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>محتوای سایت</h2>
              <div className="grid gap-8">
                {content?.map((block) => (
                  <div key={block.id} className={`p-8 rounded-[2.5rem] border shadow-sm space-y-6 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-blue-600 rounded-full" />
                      <h3 className="font-bold text-gray-400 text-sm uppercase tracking-widest">{block.id}</h3>
                    </div>
                    <div className="space-y-3">
                      <label className={`block text-sm font-bold mr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>عنوان بخش</label>
                      <input 
                        className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all text-lg font-bold ${isDark ? "bg-slate-900 border-slate-700 text-white focus:ring-blue-500/20" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/10"}`}
                        value={block.title}
                        onChange={(e) => setContent(content.map(c => c.id === block.id ? { ...c, title: e.target.value } : c))}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className={`block text-sm font-bold mr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>متن توضیحات</label>
                      <textarea 
                        className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all min-h-[180px] leading-relaxed ${isDark ? "bg-slate-900 border-slate-700 text-white focus:ring-blue-500/20" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/10"}`}
                        value={block.body}
                        onChange={(e) => setContent(content.map(c => c.id === block.id ? { ...c, body: e.target.value } : c))}
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/content", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(block),
                          });
                          if (res.ok) setNotification({ message: "محتوای بخش ذخیره شد", type: "success" });
                          else setNotification({ message: "خطا در ذخیره محتوا", type: "error" });
                        } catch (err) {
                          console.error(err);
                          setNotification({ message: "خطا در برقراری ارتباط با سرور", type: "error" });
                        }
                      }}
                      className="flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 shadow-lg"
                    >
                      <Save size={22} />
                      ذخیره تغییرات محتوا
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "settings" && settings && (
            <div className="space-y-8">
              <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>تنظیمات کلی سیستم</h2>
              <div className={`p-10 rounded-[3rem] border shadow-sm space-y-10 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className={`block text-sm font-bold mr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>نام سایت</label>
                    <input 
                      className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all ${isDark ? "bg-slate-900 border-slate-700 text-white focus:ring-blue-500/20" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/10"}`}
                      value={settings.site_name}
                      onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className={`block text-sm font-bold mr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>لینک لوگو</label>
                    <input 
                      className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all ${isDark ? "bg-slate-900 border-slate-700 text-white focus:ring-blue-500/20" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/10"}`}
                      value={settings.logo_url}
                      onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className={`block text-sm font-bold mr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>رنگ اصلی سایت</label>
                    <div className="flex gap-4">
                      <input 
                        type="color"
                        className="w-16 h-14 rounded-xl cursor-pointer"
                        value={settings.primary_color}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      />
                      <input 
                        className={`flex-1 px-6 py-4 rounded-2xl border outline-none ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                        value={settings.primary_color}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className={`block text-sm font-bold mr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>شماره تماس</label>
                    <input 
                      className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all ${isDark ? "bg-slate-900 border-slate-700 text-white focus:ring-blue-500/20" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/10"}`}
                      value={settings.contact_phone}
                      onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <label className={`block text-sm font-bold mr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>لینک ویدیو (صفحه اصلی)</label>
                    <input 
                      className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all ${isDark ? "bg-slate-900 border-slate-700 text-white focus:ring-blue-500/20" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/10"}`}
                      value={settings.video_url}
                      onChange={(e) => setSettings({ ...settings, video_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <label className={`block text-sm font-bold mr-2 ${isDark ? "text-slate-400" : "text-gray-700"}`}>لینک ویدیو (پس از ثبت موفق)</label>
                    <input 
                      className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all ${isDark ? "bg-slate-900 border-slate-700 text-white focus:ring-blue-500/20" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/10"}`}
                      value={settings.success_video_url}
                      onChange={(e) => setSettings({ ...settings, success_video_url: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className={`font-bold text-lg border-b pb-4 ${isDark ? "text-white border-slate-700" : "text-gray-900 border-gray-100"}`}>شبکه‌های اجتماعی</h4>
                  {settings.social_links?.map((link, idx) => (
                    <div key={idx} className={`flex gap-6 items-end p-6 rounded-[2rem] ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                      <div className="flex-1 space-y-2">
                        <span className="text-xs text-gray-400 mr-2">نام پلتفرم</span>
                        <input 
                          className={`w-full px-4 py-3 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                          value={link.platform}
                          onChange={(e) => {
                            const newLinks = [...(settings.social_links || [])];
                            newLinks[idx].platform = e.target.value;
                            setSettings({ ...settings, social_links: newLinks });
                          }}
                        />
                      </div>
                      <div className="flex-[2] space-y-2">
                        <span className="text-xs text-gray-400 mr-2">لینک کامل</span>
                        <input 
                          className={`w-full px-4 py-3 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...(settings.social_links || [])];
                            newLinks[idx].url = e.target.value;
                            setSettings({ ...settings, social_links: newLinks });
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newLinks = (settings.social_links || []).filter((_, i) => i !== idx);
                          setSettings({ ...settings, social_links: newLinks });
                        }}
                        className="p-3 text-red-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newLinks = [...(settings.social_links || []), { platform: "جدید", url: "https://", icon: "Link" }];
                      setSettings({ ...settings, social_links: newLinks });
                    }}
                    className="flex items-center gap-2 text-blue-600 font-bold hover:underline"
                  >
                    <Plus size={18} />
                    افزودن شبکه اجتماعی
                  </button>
                </div>

                <div className="space-y-6">
                  <h4 className={`font-bold text-lg border-b pb-4 ${isDark ? "text-white border-slate-700" : "text-gray-900 border-gray-100"}`}>جملات انگیزشی</h4>
                  {settings.quotes?.map((quote, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <input 
                        className={`flex-1 px-6 py-4 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                        value={quote}
                        onChange={(e) => {
                          const newQuotes = [...(settings.quotes || [])];
                          newQuotes[idx] = e.target.value;
                          setSettings({ ...settings, quotes: newQuotes });
                        }}
                      />
                      <button 
                        onClick={() => {
                          const newQuotes = (settings.quotes || []).filter((_, i) => i !== idx);
                          setSettings({ ...settings, quotes: newQuotes });
                        }}
                        className="p-3 text-red-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newQuotes = [...(settings.quotes || []), "جمله جدید"];
                      setSettings({ ...settings, quotes: newQuotes });
                    }}
                    className="flex items-center gap-2 text-blue-600 font-bold hover:underline"
                  >
                    <Plus size={18} />
                    افزودن جمله جدید
                  </button>
                </div>

                <button 
                  onClick={async () => {
                    if (!settings) return;
                    try {
                      const res = await fetch("/api/settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ settings }),
                      });
                      if (res.ok) setNotification({ message: "تمامی تنظیمات با موفقیت ذخیره شدند", type: "success" });
                      else setNotification({ message: "خطا در ذخیره تنظیمات", type: "error" });
                    } catch (err) {
                      console.error(err);
                      setNotification({ message: "خطا در برقراری ارتباط با سرور", type: "error" });
                    }
                  }}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-bold text-xl hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all"
                >
                  ذخیره نهایی تمامی تنظیمات
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
