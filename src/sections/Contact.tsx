import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { MapPin, Mail, Phone, Instagram, Facebook, Send, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { scrollToElement } from '../lib/scrollUtils';

const Contact = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'Atelier enfants',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/contact', {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        type: formState.type,
        message: formState.message
      });
      setLoading(false);
      setSubmitted(true);
      setFormState({ name: '', email: '', phone: '', type: 'Atelier enfants', message: '' });
      if (containerRef.current) {
        scrollToElement(containerRef.current);
      }
    } catch (err) {
      setLoading(false);
      alert("Erreur lors de l'envoi du message. Veuillez réessayer.");
      console.error(err);
    }
  };

  return (
    <section id="contact" className="py-32 bg-sage relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20">
          {/* Left Column: Form */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            ref={containerRef}
            className="bg-white rounded-3xl p-10 shadow-2xl border-2 border-gold/20 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gold"></div>
            <h2 className="text-3xl font-serif font-bold text-dark mb-8">Envoyez-nous un message</h2>
            
            {submitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-sage/10 text-sage rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-dark mb-4">Message envoyé !</h3>
                <p className="text-dark/60 mb-8">
                  Merci pour votre message. Karine vous recontactera dans les plus brefs délais.
                </p>
                <button onClick={() => setSubmitted(false)} className="btn-primary w-full">Envoyer un autre message</button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold text-dark/40 ml-2">Nom complet</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-6 py-4 rounded-2xl bg-dark/5 border-transparent focus:bg-white focus:border-gold focus:ring-0 transition-all outline-none"
                      value={formState.name}
                      onChange={(e) => setFormState({...formState, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold text-dark/40 ml-2">Email</label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-6 py-4 rounded-2xl bg-dark/5 border-transparent focus:bg-white focus:border-gold focus:ring-0 transition-all outline-none"
                      value={formState.email}
                      onChange={(e) => setFormState({...formState, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold text-dark/40 ml-2">Téléphone</label>
                    <input 
                      type="tel" 
                      className="w-full px-6 py-4 rounded-2xl bg-dark/5 border-transparent focus:bg-white focus:border-gold focus:ring-0 transition-all outline-none"
                      value={formState.phone}
                      onChange={(e) => setFormState({...formState, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold text-dark/40 ml-2">Type de demande</label>
                    <select 
                      className="w-full px-6 py-4 rounded-2xl bg-dark/5 border-transparent focus:bg-white focus:border-gold focus:ring-0 transition-all outline-none appearance-none"
                      value={formState.type}
                      onChange={(e) => setFormState({...formState, type: e.target.value})}
                    >
                      <option>Atelier enfants</option>
                      <option>Atelier adultes</option>
                      <option>Atelier entreprise</option>
                      <option>Autre</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-dark/40 ml-2">Message</label>
                  <textarea 
                    rows={4}
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-dark/5 border-transparent focus:bg-white focus:border-gold focus:ring-0 transition-all outline-none resize-none"
                    value={formState.message}
                    onChange={(e) => setFormState({...formState, message: e.target.value})}
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-3"
                >
                  {loading ? 'Envoi...' : (
                    <>
                      Envoyer le message <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>

          {/* Right Column: Info */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center"
          >
            <span className="text-xs uppercase tracking-[0.3em] font-semibold text-paper mb-6 block">Contact</span>
            <h2 className="text-4xl md:text-6xl font-serif text-paper mb-12 leading-tight">Parlons de votre projet créatif</h2>
            
            <div className="space-y-10">
              <div className="flex items-start gap-6 p-6 rounded-2xl border border-paper/10 bg-paper/5 hover:border-gold/30 transition-colors duration-300">
                <div className="w-12 h-12 rounded-2xl bg-paper/10 flex items-center justify-center text-paper border border-paper/20 shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-paper font-serif text-xl mb-1">Adresse</h3>
                  <p className="text-paper/60">Moulay, France</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6 p-6 rounded-2xl border border-paper/10 bg-paper/5 hover:border-gold/30 transition-colors duration-300">
                <div className="w-12 h-12 rounded-2xl bg-paper/10 flex items-center justify-center text-paper border border-paper/20 shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-paper font-serif text-xl mb-1">Email</h3>
                  <p className="text-paper/60">fromentink@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-6 p-6 rounded-2xl border border-paper/10 bg-paper/5 hover:border-gold/30 transition-colors duration-300">
                <div className="w-12 h-12 rounded-2xl bg-paper/10 flex items-center justify-center text-paper border border-paper/20 shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-paper font-serif text-xl mb-1">Téléphone</h3>
                  <p className="text-paper/60">07 86 82 73 54</p>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-16 border-t border-paper/10">
              <h3 className="text-paper font-serif text-xl mb-6">Suivez l'atelier</h3>
              <div className="flex gap-6">
                <a href="https://www.instagram.com/karine_fromentin_artiste?igsh=MTloaG52bHA0emZxbg==" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-paper text-sage flex items-center justify-center hover:bg-gold hover:text-paper transition-all duration-300">
                  <Instagram size={24} />
                </a>
                <a href="#" className="w-12 h-12 rounded-full bg-paper text-sage flex items-center justify-center hover:bg-gold hover:text-paper transition-all duration-300">
                  <Facebook size={24} />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative organic shape */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl -z-0"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[600px] h-[600px] bg-gold/10 rounded-full blur-3xl -z-0"></div>
    </section>
  );
};

export default Contact;
