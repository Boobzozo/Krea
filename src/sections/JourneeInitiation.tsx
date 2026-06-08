import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Sparkles, Users } from 'lucide-react';
import { scrollToElement } from '../lib/scrollUtils';

const EVENT_DATE = new Date('2026-06-27T15:00:00');

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, over: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      over: false,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

const JourneeInitiation = () => {
  const { days, hours, minutes, seconds, over } = useCountdown(EVENT_DATE);

  // Ne plus afficher la section si l'événement est passé
  if (over && days === 0 && hours === 0 && minutes === 0 && seconds === 0) return null;

  return (
    <section id="journee-initiation" className="relative py-20 bg-forest overflow-hidden">

      {/* Fond texturé subtil */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #C9A961 0%, transparent 50%), radial-gradient(circle at 80% 20%, #C9A961 0%, transparent 40%)' }}
      />

      <div className="relative max-w-5xl mx-auto px-6">

        {/* Badge événement */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center gap-2 bg-gold/20 border border-gold/40 text-gold text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-full">
            <Sparkles size={12} />
            Événement spécial · Entrée libre
          </div>
        </motion.div>

        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-center mb-4"
        >
          <h2 className="text-4xl md:text-6xl font-serif text-paper font-light leading-tight">
            Journée d'initiation
          </h2>
          <p className="text-gold font-serif italic text-xl md:text-2xl mt-2">
            Samedi 27 juin 2026
          </p>
        </motion.div>

        {/* Compte à rebours */}
        {!over && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-4 md:gap-8 mb-12"
          >
            {[
              { value: days, label: 'jours' },
              { value: hours, label: 'heures' },
              { value: minutes, label: 'minutes' },
              { value: seconds, label: 'secondes' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl md:text-5xl font-serif font-bold text-paper tabular-nums w-16 md:w-20">
                  {String(value).padStart(2, '0')}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-paper/40 mt-1">{label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Deux temps forts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="grid md:grid-cols-2 gap-4 mb-10"
        >
          {/* Temps 1 */}
          <div className="bg-white/8 border border-white/12 rounded-2xl p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
                <Sparkles className="text-gold" size={16} />
              </div>
              <span className="text-gold font-bold text-sm uppercase tracking-widest">15h – 17h</span>
            </div>
            <h3 className="text-paper font-serif text-xl mb-2">Transmission & Pratique</h3>
            <p className="text-paper/60 text-sm leading-relaxed">
              Atelier ouvert avec une <span className="text-paper/90 font-medium">initiation gratuite</span>. Découvrez ma démarche pédagogique et testez une nouvelle pratique artistique.
            </p>
          </div>

          {/* Temps 2 */}
          <div className="bg-white/8 border border-white/12 rounded-2xl p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
                <Users className="text-gold" size={16} />
              </div>
              <span className="text-gold font-bold text-sm uppercase tracking-widest">17h – 19h</span>
            </div>
            <h3 className="text-paper font-serif text-xl mb-2">Célébration & Networking</h3>
            <p className="text-paper/60 text-sm leading-relaxed">
              Le <span className="text-paper/90 font-medium">vernissage de l'exposition des élèves</span>. Un moment convivial pour valoriser leur travail et échanger entre passionnés et professionnels de la région.
            </p>
          </div>
        </motion.div>

        {/* Message d'accueil + infos pratiques */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
          className="text-center mb-10"
        >
          <p className="text-paper/70 text-sm leading-relaxed max-w-xl mx-auto">
            Que vous souhaitiez vous initier ou simplement soutenir les talents de l'atelier,
            <span className="text-paper/95 font-medium"> vous êtes les bienvenus.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-paper/55 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gold" />
              Samedi 27 juin 2026
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-gold" />
              À partir de 15h
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-gold" />
              La Marjolaine, Moulay
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#reservation"
            onClick={(e) => { e.preventDefault(); scrollToElement('#reservation', { offset: 80 }); }}
            className="bg-gold text-white text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-xl hover:bg-paper hover:text-forest transition-colors duration-300 active:scale-[0.98]"
          >
            Je confirme ma présence
          </a>
          <a
            href="#reservation"
            onClick={(e) => { e.preventDefault(); scrollToElement('#reservation', { offset: 80 }); }}
            className="text-paper/60 text-xs uppercase tracking-widest font-medium hover:text-gold transition-colors duration-300 underline underline-offset-4 decoration-paper/20"
          >
            Réserver un atelier découverte
          </a>
        </motion.div>

      </div>
    </section>
  );
};

export default JourneeInitiation;
