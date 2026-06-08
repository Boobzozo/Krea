import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import { scrollToElement } from '../lib/scrollUtils';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category_id: string;
  day_of_week?: string;
  start_time?: string;
  is_group_rate?: number;
  specific_date?: Date;
  is_special_event?: boolean;
}

// Événement spécial : Journée initiation — 27 juin 2026
const JOURNEE_INITIATION_DATE = new Date('2026-06-27T00:00:00');
const JOURNEE_INITIATION_SERVICE: Service = {
  id: 'journee-initiation-27-juin',
  name: "Journée d'initiation",
  price: 0,
  duration: 240,
  category_id: 'special',
  start_time: '15:00',
  specific_date: JOURNEE_INITIATION_DATE,
  is_special_event: true,
};

interface DiscountRule {
  participants: number;
  discount: number;
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
  discount_rules?: string;
}

interface ReservationProps {
  settings: AppSettings | null;
}

const DAY_MAP: { [key: string]: number } = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

const Reservation = ({ settings }: ReservationProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    participants: 1,
    message: ''
  });
  const [loading, setLoading] = useState(true); // Default to loading
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFetchError, setInitialFetchError] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const scrollToFormTop = () => {
    if (cardRef.current) {
      const top = cardRef.current.getBoundingClientRect().top + window.scrollY - 50;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/services');
        setServices(res.data);
        setInitialFetchError(false);
      } catch (err) {
        console.error("Error fetching services:", err);
        setInitialFetchError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (settings && settings.discount_rules) {
      try {
        setDiscountRules(JSON.parse(settings.discount_rules));
      } catch (e) {
        console.error("Error parsing discount rules", e);
      }
    }
  }, [settings]);

  // Generate next 8 occurrences of a specific day of the week
  const generateDates = (dayOfWeek: string) => {
    const targetDay = DAY_MAP[dayOfWeek.toLowerCase()];
    if (targetDay === undefined) return [];

    const dates: Date[] = [];
    let current = new Date();
    current.setHours(0, 0, 0, 0);

    while (dates.length < 8) {
      if (current.getDay() === targetDay) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    if (service.specific_date) {
      setAvailableDates([service.specific_date]);
    } else if (service.day_of_week) {
      setAvailableDates(generateDates(service.day_of_week));
    } else {
      setAvailableDates([]);
    }
    setStep(2);
    setSelectedDate(null);
    scrollToFormTop();
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedDate) return;

    setLoading(true);
    setError(null);

    const { totalPrice } = calculatePrice();

    try {
      const [hours, minutes] = (selectedService.start_time || "09:00").split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + selectedService.duration);

      await axios.post('/api/bookings', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        customer_email: formData.email,
        customer_phone: formData.phone,
        message: formData.message,
        service_type: selectedService.name,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        participants: formData.participants,
        total_price: totalPrice
      });
      setSuccess(true);
      setStep(4);
      scrollToFormTop();
    } catch (err: any) {
      setError(err.response?.data?.error || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const getServicePrice = (service: Service): number => {
    return service.price;
  };

  const calculatePrice = () => {
    if (!selectedService) return { subtotal: 0, discountPercent: 0, discountAmount: 0, totalPrice: 0 };
    
    const unitPrice = getServicePrice(selectedService);
    const subtotal = unitPrice * formData.participants;
    let discountPercent = 0;
    
    if (selectedService.is_group_rate && discountRules.length > 0) {
      // Find the best rule for current participants
      const applicableRules = discountRules
        .filter(r => formData.participants >= r.participants)
        .sort((a, b) => b.participants - a.participants);
      
      if (applicableRules.length > 0) {
        discountPercent = applicableRules[0].discount;
      }
    } else if (selectedService.is_group_rate && formData.participants >= 2) {
      // Fallback to legacy logic if no rules are defined
      discountPercent = 10 + (formData.participants - 2) * 5;
      discountPercent = Math.min(discountPercent, 50);
    }
    
    const discountAmount = (subtotal * discountPercent) / 100;
    const totalPrice = subtotal - discountAmount;
    
    return { subtotal, discountPercent, discountAmount, totalPrice };
  };

  const reset = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate(null);
    setSuccess(false);
    setError(null);
    setFormData({ firstName: '', lastName: '', email: '', phone: '', participants: 1, message: '' });
    scrollToFormTop();
  };

  return (
    <section id="reservation-section" className="py-32 bg-paper relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sage/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-forest/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <div className="max-w-5xl mx-auto px-6 relative z-10" ref={formRef}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-sage mb-4 block">Réservation</span>
          <h2 className="text-4xl md:text-6xl font-serif text-dark mb-6">Réserver votre Atelier</h2>
          <div className="flex items-center justify-center gap-4 text-dark/40 text-sm">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-leaf font-bold' : ''}`}>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${step >= 1 ? 'border-leaf bg-leaf text-white' : 'border-dark/20'}`}>1</span>
              Atelier
            </div>
            <ArrowRight size={14} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-leaf font-bold' : ''}`}>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${step >= 2 ? 'border-leaf bg-leaf text-white' : 'border-dark/20'}`}>2</span>
              Date
            </div>
            <ArrowRight size={14} />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-leaf font-bold' : ''}`}>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${step >= 3 ? 'border-leaf bg-leaf text-white' : 'border-dark/20'}`}>3</span>
              Infos
            </div>
          </div>
        </motion.div>

        <div id="reservation" className="bg-white rounded-[2rem] shadow-2xl border border-gold/10 overflow-hidden min-h-[500px] flex flex-col" ref={cardRef}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-12 flex-1"
              >
                <h3 className="text-2xl font-serif mb-8 flex items-center gap-3">
                  <Sparkles className="text-leaf" size={24} /> Quel atelier vous intéresse ?
                </h3>
                
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-dark/40">
                    <div className="w-8 h-8 border-2 border-leaf border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p>Chargement des ateliers...</p>
                  </div>
                ) : initialFetchError ? (
                  <div className="text-center py-20 px-6 bg-red-50 rounded-2xl">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={32} />
                    <p className="text-red-600 mb-4">Erreur de connexion avec le serveur.</p>
                    <button onClick={() => window.location.reload()} className="btn-outline">Réessayer</button>
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-20 px-6 bg-leaf/5 rounded-2xl">
                    <AlertCircle className="mx-auto text-leaf mb-4" size={32} />
                    <p className="text-leaf/60 mb-4">Aucun atelier disponible pour le moment.</p>
                    <p className="text-xs text-dark/40">Vérifiez la base de données sur le serveur.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Carte spéciale : Journée d'initiation (visible uniquement avant le 27 juin 2026) */}
                    {Date.now() < JOURNEE_INITIATION_DATE.getTime() && (
                      <button
                        onClick={() => handleServiceSelect(JOURNEE_INITIATION_SERVICE)}
                        className="group p-6 rounded-2xl border-2 border-gold/40 bg-gold/5 hover:border-gold hover:bg-gold/10 transition-all text-left relative overflow-hidden md:col-span-2"
                      >
                        <div className="absolute top-3 right-3">
                          <span className="flex items-center gap-1 bg-gold text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full">
                            <Sparkles size={10} /> Événement spécial
                          </span>
                        </div>
                        <div className="relative z-10">
                          <div className="font-serif text-xl text-dark mb-1 group-hover:text-gold transition-colors">
                            Journée d'initiation
                          </div>
                          <div className="flex items-center gap-4 text-xs text-dark/40 uppercase tracking-widest font-bold">
                            <span className="flex items-center gap-1"><Clock size={12} /> 4h (15h – 19h)</span>
                            <span className="flex items-center gap-1"><Sparkles size={12} /> Entrée libre</span>
                          </div>
                          <div className="mt-3 text-[10px] text-gold font-bold uppercase tracking-tighter">
                            Samedi 27 juin 2026 · La Marjolaine, Moulay
                          </div>
                        </div>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-gold opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-2" />
                      </button>
                    )}
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="group p-6 rounded-2xl border-2 border-dark/5 hover:border-leaf/50 hover:bg-leaf/5 transition-all text-left relative overflow-hidden"
                      >
                        <div className="relative z-10">
                          <div className="font-serif text-xl text-dark mb-1 group-hover:text-leaf transition-colors">{service.name}</div>
                          <div className="flex items-center gap-4 text-xs text-dark/40 uppercase tracking-widest font-bold">
                            <span className="flex items-center gap-1"><Clock size={12} /> {service.duration} min</span>
                            <span className="flex items-center gap-1"><Sparkles size={12} /> {getServicePrice(service) > 0 ? `${getServicePrice(service)}€` : 'Sur devis'}</span>
                          </div>
                          {service.day_of_week && (
                            <div className="mt-3 text-[10px] text-sage font-bold uppercase tracking-tighter">
                              Disponible tous les {service.day_of_week === 'monday' ? 'lundis' :
                                                 service.day_of_week === 'tuesday' ? 'mardis' :
                                                 service.day_of_week === 'wednesday' ? 'mercredis' :
                                                 service.day_of_week === 'thursday' ? 'jeudis' :
                                                 service.day_of_week === 'friday' ? 'vendredis' :
                                                 service.day_of_week === 'saturday' ? 'samedis' : 'dimanches'}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-leaf opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-2" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-12 flex-1"
              >
                <button 
                  onClick={() => {
                    setStep(1);
                    scrollToFormTop();
                  }} 
                  className="flex items-center gap-2 text-dark/40 hover:text-leaf transition-colors text-sm mb-8"
                >
                  <ChevronLeft size={16} /> Retour aux ateliers
                </button>
                <h3 className="text-2xl font-serif mb-2">Choisissez votre date</h3>
                <p className="text-dark/40 text-sm mb-8">Pour l'atelier : <span className="text-leaf font-bold">{selectedService?.name}</span></p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableDates.map((date, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        selectedDate?.getTime() === date.getTime() 
                        ? 'border-leaf bg-leaf text-white shadow-lg scale-105' 
                        : 'border-dark/5 hover:border-leaf/30'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
                        {date.toLocaleDateString('fr-FR', { month: 'short' })}
                      </div>
                      <div className="text-2xl font-serif font-bold">{date.getDate()}</div>
                      <div className="text-[10px] uppercase font-bold mt-1">
                        {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-12 flex justify-end">
                  <button 
                    disabled={!selectedDate}
                    onClick={() => {
                      setStep(3);
                      setTimeout(() => {
                        if (cardRef.current) {
                          cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                    }}
                    className="btn-primary disabled:opacity-50"
                  >
                    Continuer <ChevronRight className="inline ml-2" size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-12 flex-1"
              >
                <button 
                  onClick={() => {
                    setStep(2);
                    scrollToFormTop();
                  }} 
                  className="flex items-center gap-2 text-dark/40 hover:text-gold transition-colors text-sm mb-8"
                >
                  <ChevronLeft size={16} /> Retour aux dates
                </button>
                <h3 className="text-2xl font-serif mb-8">Vos coordonnées</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-sage mb-2 block font-serif">Prénom</label>
                        <User className="absolute left-4 bottom-5 text-dark/20" size={18} />
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Marie"
                          style={{ borderColor: '#C9A961' }}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 focus:border-[#1F3A2E] focus:ring-0 transition-all outline-none text-dark"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        />
                      </div>
                      <div className="relative">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-sage mb-2 block font-serif">Nom</label>
                        <User className="absolute left-4 bottom-5 text-dark/20" size={18} />
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Durand"
                          style={{ borderColor: '#C9A961' }}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 focus:border-[#1F3A2E] focus:ring-0 transition-all outline-none text-dark"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20" size={18} />
                      <input 
                        type="email" 
                        placeholder="Email"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-dark/5 border-transparent focus:bg-white focus:border-gold focus:ring-0 transition-all outline-none"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/20" size={18} />
                      <input 
                        type="tel" 
                        placeholder="Téléphone"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-dark/5 border-transparent focus:bg-white focus:border-gold focus:ring-0 transition-all outline-none"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>

                    <div className="relative">
                      <textarea 
                        placeholder="Message (facultatif)"
                        className="w-full p-6 rounded-2xl bg-dark/5 border-transparent focus:bg-white focus:border-gold focus:ring-0 transition-all outline-none min-h-[120px] resize-none"
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                      />
                    </div>
                    
                    <div className="p-6 bg-leaf/5 rounded-2xl border border-leaf/10">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-leaf mb-4 block">Nombre de participants</label>
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => setFormData(prev => ({...prev, participants: Math.max(1, prev.participants - 1)}))}
                          className="w-10 h-10 rounded-full border border-leaf/20 flex items-center justify-center hover:bg-leaf hover:text-white transition-all"
                        >
                          -
                        </button>
                        <span className="text-2xl font-serif font-bold w-8 text-center">{formData.participants}</span>
                        <button 
                          onClick={() => setFormData(prev => ({...prev, participants: Math.min(10, prev.participants + 1)}))}
                          className="w-10 h-10 rounded-full border border-leaf/20 flex items-center justify-center hover:bg-leaf hover:text-white transition-all"
                        >
                          +
                        </button>
                      </div>
                      {selectedService?.is_group_rate && formData.participants >= 2 && (
                        <p className="text-[10px] text-sage font-bold uppercase mt-4 flex items-center gap-2">
                          <Sparkles size={12} /> Réduction groupe appliquée !
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-leaf/5 rounded-3xl p-8 border border-leaf/10">
                    <h4 className="text-xs uppercase tracking-widest font-bold text-leaf mb-4">Récapitulatif</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-dark/40">Client</span>
                        <span className="font-bold">{formData.firstName} {formData.lastName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark/40">Atelier</span>
                        <span className="font-bold">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark/40">Participants</span>
                        <span className="font-bold">{formData.participants}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark/40">Date</span>
                        <span className="font-bold">{selectedDate?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      
                      {selectedService?.is_special_event ? (
                        <div className="pt-3 border-t border-gold/20 flex justify-between items-center">
                          <span className="text-dark/40">Participation</span>
                          <span className="text-xl font-serif font-bold text-gold">Entrée libre</span>
                        </div>
                      ) : selectedService?.price > 0 ? (
                        <>
                          <div className="pt-3 border-t border-gold/10 flex justify-between text-sm">
                            <span className="text-dark/40">Sous-total</span>
                            <span>{calculatePrice().subtotal}€</span>
                          </div>
                          {calculatePrice().discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-sage">
                              <span>Réduction ({calculatePrice().discountPercent}%)</span>
                              <span>-{calculatePrice().discountAmount.toFixed(2)}€</span>
                            </div>
                          )}
                          <div className="pt-3 border-t border-leaf/20 flex justify-between items-center">
                            <span className="text-dark/40">Total à régler</span>
                            <span className="text-xl font-serif font-bold text-leaf">
                              {calculatePrice().totalPrice.toFixed(2)}€
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="pt-3 border-t border-gold/20 flex justify-between items-center">
                          <span className="text-dark/40">Total</span>
                          <span className="text-xl font-serif font-bold text-gold">Sur devis</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-3">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="mt-12 flex justify-end">
                  <button 
                    onClick={handleBooking} 
                    disabled={loading || !formData.firstName || !formData.lastName || !formData.email}
                    className="btn-primary px-12 disabled:opacity-50"
                  >
                    {loading ? 'Réservation...' : 'Confirmer la réservation'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-12 text-center flex-1 flex flex-col items-center justify-center"
              >
                <div className="w-24 h-24 bg-sage/10 text-sage rounded-full flex items-center justify-center mb-8">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-4xl font-serif mb-4">Réservation confirmée !</h3>
                <p className="text-dark/60 max-w-md mx-auto mb-12">
                  Merci {formData.firstName}, votre demande pour l'atelier <span className="text-leaf font-bold">{selectedService?.name}</span> le {selectedDate?.toLocaleDateString('fr-FR')} a bien été enregistrée. Un email de confirmation vous a été envoyé.
                </p>
                <button onClick={reset} className="btn-outline">Réserver un autre atelier</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default Reservation;
