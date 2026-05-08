import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { scrollToElement } from '../lib/scrollUtils';

interface AppSettings {
  hero_image?: string;
}

const Hero = ({ settings }: { settings: AppSettings | null }) => {
  const heroImage = settings?.hero_image || "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=2000";

  return (
    <section id="accueil" className="relative min-h-screen flex items-center justify-center pt-20 bg-forest overflow-hidden">
      {/* Photo de fond — UX-03 : voile sombre renforcé pour ancrer le texte */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.65 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <img
          src={heroImage}
          alt="Atelier de création artistique Kréa - Karine Fromentin"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </motion.div>
      {/* Voile 30% + dégradé bas→haut pour ancrer le texte (UX-03) */}
      <div className="absolute inset-0 z-[1] bg-black/40"></div>
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-dark/50 via-transparent to-paper"></div>

      {/* UX-01 : accroche concrète + 3 ancres, citation en signature */}
      <div className="relative z-10 text-center px-6 max-w-4xl">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs uppercase tracking-[0.3em] font-semibold text-paper/70 mb-6 block"
        >
          Atelier de création artistique · Moulay
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl md:text-8xl font-serif mb-4 leading-tight luxury-text-shadow text-paper"
        >
          Kréa
        </motion.h1>

        {/* Promesse concrète */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-xl md:text-2xl font-serif text-paper/90 mb-6 max-w-xl mx-auto leading-snug"
        >
          Cours de peinture et dessin<br className="hidden sm:block" /> pour enfants, ados et adultes.
        </motion.p>

        {/* 3 ancres : public · fréquence · lieu */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-8"
        >
          {[
            { icon: '🎨', label: 'Enfants, ados & adultes' },
            { icon: '📅', label: 'Mercredi & jeudi' },
            { icon: '📍', label: 'Moulay, Mayenne (53)' },
          ].map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 text-paper/90 text-xs font-medium px-3 py-1.5 rounded-full"
            >
              <span>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </motion.div>

        {/* Citation déplacée en signature discrète */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="text-sm font-serif italic text-paper/50 mb-10 max-w-md mx-auto"
        >
          "Ouvrons notre cœur chaque fois que nous prenons le pinceau"
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
        >
          {/* CTA primaire — action principale */}
          <a
            href="#ateliers"
            onClick={(e) => { e.preventDefault(); scrollToElement('#ateliers', { offset: 80 }); }}
            className="btn-primary w-full sm:w-auto"
          >
            Découvrir les ateliers
          </a>
          {/* CTA secondaire — lien discret pour ne pas concurrencer le primaire */}
          <a
            href="#reservation"
            onClick={(e) => { e.preventDefault(); scrollToElement('#reservation', { offset: 80 }); }}
            className="text-paper/80 text-xs uppercase tracking-widest font-medium hover:text-gold transition-colors duration-300 underline underline-offset-4 decoration-paper/30 hover:decoration-gold w-full sm:w-auto text-center"
          >
            Réserver une place
          </a>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-sage animate-bounce"
      >
        <ChevronDown size={32} />
      </motion.div>

      {/* Organic shape separator */}
      <div className="absolute bottom-0 left-0 right-0 z-[3] leading-[0]">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-paper">
          <path d="M0 120L60 110C120 100 240 80 360 76.7C480 73.3 600 86.7 720 93.3C840 100 960 100 1080 90C1200 80 1320 60 1380 50L1440 40V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor"/>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
