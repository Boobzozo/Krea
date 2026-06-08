import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, LogOut } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

// Configure axios to include cookies in all requests
axios.defaults.withCredentials = true;

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import Hero from './sections/Hero';
import JourneeInitiation from './sections/JourneeInitiation';
import Philosophie from './sections/Philosophie';
import Ateliers from './sections/Ateliers';
import Univers from './sections/Univers';
import Reservation from './sections/Reservation';
import Contact from './sections/Contact';
import AdminDashboard from './components/AdminDashboard';

// Utils
import { scrollToTop } from './lib/scrollUtils';

// --- Types ---
interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category_id?: string;
  day_of_week?: string;
  start_time?: string;
  is_group_rate?: number;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface AppSettings {
  show_gallery: string;
  show_about: string;
  admin_password?: string;
  opening_hours?: string;
  google_calendar_id?: string;
  notification_email?: string;
  hero_image?: string;
  profile_image?: string;
  price_kids?: string;
  price_adults?: string;
}

const App = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/check-auth');
      if (res.data.isAdmin) {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get('/api/services');
      setServices(res.data);
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchSettings();
    fetchServices();
    fetchCategories();

    const socket = io();
    socket.on('data_updated', (data) => {
      if (data.type === 'settings') {
        fetchSettings();
        fetchServices();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleAdminLogin = async () => {
    try {
      await axios.post('/api/login', { password });
      setIsAdmin(true);
      setPassword('');
      scrollToTop('smooth');
    } catch (err) {
      alert("Mot de passe incorrect");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      setIsAdmin(false);
      scrollToTop('smooth');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      await axios.post('/api/settings', { key, value });
      fetchSettings();
    } catch (err) {
      console.error("Error updating setting:", err);
    }
  };

  const updateSettings = async (settings: Partial<AppSettings>) => {
    try {
      await axios.post('/api/settings', { settings });
      fetchSettings();
    } catch (err) {
      console.error("Error updating multiple settings:", err);
    }
  };

  return (
    <div className="min-h-screen selection:bg-gold selection:text-white">
      <Routes>
        <Route path="/" element={
          <main>
            <Navbar />
            {isAdmin && isPreview && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-gold text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-md">
                <span className="text-sm font-bold uppercase tracking-widest">Mode Prévisualisation</span>
                <div className="w-px h-4 bg-white/30"></div>
                <button 
                  onClick={() => {
                    setIsPreview(false);
                    navigate('/admin');
                  }}
                  className="text-sm font-bold hover:underline"
                >
                  Retour à l'admin
                </button>
              </div>
            )}
            <Hero settings={settings} />
            <JourneeInitiation />
            <Philosophie />
            <Ateliers settings={settings} />
            <Univers settings={settings} />
            <Reservation settings={settings} />
            <Contact />
            <Footer />
          </main>
        } />
        
        <Route path="/admin" element={
          isAdmin && !isPreview ? (
            <AdminDashboard 
              onLogout={handleLogout} 
              onPreview={() => {
                setIsPreview(true);
                navigate('/');
              }}
              settings={settings} 
              updateSetting={updateSetting} 
              updateSettings={updateSettings}
              services={services}
              fetchServices={fetchServices}
              categories={categories}
              fetchCategories={fetchCategories}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center bg-paper p-6">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-10 rounded-3xl max-w-sm w-full shadow-2xl border border-dark/5"
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-serif mb-2 text-dark">Kréa</h1>
                  <p className="text-[10px] text-dark/40 uppercase tracking-[0.2em] font-bold">Accès Administration</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-dark/40 ml-1">Mot de passe</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-paper border border-dark/10 rounded-xl px-4 py-3 outline-none focus:border-gold transition-colors"
                      onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                      autoFocus
                    />
                  </div>
                  
                  <button 
                    onClick={handleAdminLogin} 
                    className="w-full bg-forest text-white py-4 rounded-xl flex items-center justify-center gap-2 group font-bold tracking-widest uppercase text-xs"
                  >
                    Connexion
                    <Settings size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                  </button>
                  
                  <div className="pt-4 text-center">
                    <a href="/" className="text-xs text-dark/30 hover:text-gold transition-colors flex items-center justify-center gap-2">
                      ← Retour au site public
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
