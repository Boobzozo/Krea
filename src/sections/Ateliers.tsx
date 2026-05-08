import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building2, CheckCircle2, Sparkles } from 'lucide-react';
import axios from 'axios';
import { scrollToElement } from '../lib/scrollUtils';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category_id: string;
}

interface AteliersProps {
  settings: {
    price_kids?: string;
    price_adults?: string;
  } | null;
}

const Ateliers = ({ settings }: AteliersProps) => {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get('/api/services');
        setServices(response.data);
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };
    fetchServices();
  }, []);

  const getDisplayPrice = (type: 'enfants' | 'adultes') => {
    const service = services.find(s => {
      const name = s.name.toLowerCase();
      if (type === 'enfants') return name.includes('enfant') || name.includes('ado');
      return name.includes('adulte');
    });
    if (service) return service.price;
    if (type === 'enfants') return Number(settings?.price_kids || 25);
    return Number(settings?.price_adults || 35);
  };

  const priceEnfants = getDisplayPrice('enfants');
  const priceAdultes = getDisplayPrice('adultes');

  // ATL-01 : cartes comparables avec photo, âges, horaire, tarif, durée
  const atelierCards = [
    {
      id: 'enfants',
      label: 'Dès 6 ans',
      title: 'Enfants & Ados',
      photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=800&h=400',
      photoAlt: "Enfants peignant à l'atelier Kréa",
      photoPosition: 'object-center',
      ages: '6 – 17 ans',
      schedule: [
        { day: 'Mercredi', time: '14h – 15h30', detail: 'Enfants & familles' },
        { day: 'Mercredi', time: '16h – 17h30', detail: 'Adolescents' },
        { day: 'Stages', time: 'Ponctuels', detail: 'Sur programme' },
      ],
      techniques: 'Peinture · Dessin · Techniques mixtes',
      price: priceEnfants,
      priceSuffix: '/ séance · 1h30',
      priceAlt: 'Formule trimestrielle sur demande',
      hasTrial: true,
      cta: 'Réserver',
      accentClass: 'border-gold/30',
      barClass: 'bg-gold',
      labelClass: 'bg-gold/10 text-gold',
    },
    {
      id: 'adultes',
      label: 'Tous niveaux',
      title: 'Adultes',
      photo: '/Photo atelier adulte.JPG',
      photoAlt: "Adultes en cours de peinture à l'atelier Kréa",
      photoPosition: 'object-[50%_35%]',
      ages: 'À partir de 18 ans',
      schedule: [
        { day: 'Jeudi', time: '14h – 16h', detail: 'Atelier du jour' },
        { day: 'Jeudi', time: '17h – 19h', detail: 'Atelier du soir' },
        { day: 'Stages', time: 'Ponctuels', detail: 'Sur programme' },
      ],
      techniques: 'Acrylique · Aquarelle · Techniques mixtes',
      price: priceAdultes,
      priceSuffix: '/ séance · 2h',
      priceAlt: 'Formule trimestrielle sur demande',
      hasTrial: true,
      cta: 'Réserver',
      accentClass: 'border-sage/30',
      barClass: 'bg-sage',
      labelClass: 'bg-sage/10 text-sage',
    },
    {
      id: 'entreprises',
      label: 'Sur mesure',
      title: 'Entreprises',
      photo: '/photo atelier entreprise.jpg',
      photoAlt: 'Atelier team building créatif pour entreprises',
      photoPosition: 'object-center',
      ages: 'Groupes',
      schedule: [
        { day: 'Lundi', time: 'Sur rendez-vous', detail: '' },
        { day: 'Mercredi', time: 'Sur rendez-vous', detail: '' },
        { day: 'Demi-journée', time: 'ou journée complète', detail: '' },
      ],
      techniques: 'Team building · Créativité · Bien-être',
      price: null,
      priceSuffix: '',
      priceAlt: 'Devis personnalisé sous 48h',
      hasTrial: false,
      cta: 'Nous contacter',
      accentClass: 'border-forest/20',
      barClass: 'bg-forest',
      labelClass: 'bg-forest/10 text-forest',
    },
  ];

  return (
    <section className="py-32 bg-forest/5 relative">
      <div id="ateliers" className="max-w-7xl mx-auto px-6">

        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-leaf mb-4 block">Nos formules</span>
          <h2 className="text-4xl md:text-6xl font-serif text-dark">Les ateliers</h2>
        </motion.div>

        {/* ATL-03 : bandeau "1er cours découverte" */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mb-14 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gold/8 border border-gold/25 rounded-2xl px-6 py-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
              <Sparkles className="text-gold" size={20} />
            </div>
            <div>
              <p className="font-semibold text-dark text-sm">1er cours découverte à tarif réduit</p>
              <p className="text-xs text-dark/55 mt-0.5">Venez tester l'atelier avant de vous engager — pour enfants, ados et adultes.</p>
            </div>
          </div>
          <a
            href="#reservation"
            onClick={(e) => { e.preventDefault(); scrollToElement('#reservation', { offset: 80 }); }}
            className="shrink-0 bg-gold text-white text-xs uppercase tracking-widest font-bold px-6 py-3 rounded-xl hover:bg-forest transition-colors duration-300 active:scale-[0.98]"
          >
            Je réserve mon essai
          </a>
        </motion.div>

        {/* ATL-01 : grille 3 cartes comparables */}
        <div className="grid md:grid-cols-3 gap-6">
          {atelierCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-2xl border-2 ${card.accentClass} flex flex-col bg-white hover:shadow-xl transition-shadow duration-500 overflow-hidden`}
            >
              {/* Photo */}
              <div className="relative h-44 overflow-hidden">
                <img
                  src={card.photo}
                  alt={card.photoAlt}
                  className={`w-full h-full object-cover ${card.photoPosition} transition-transform duration-700 hover:scale-105`}
                  referrerPolicy="no-referrer"
                />
                <div className={`absolute top-0 left-0 w-full h-1 ${card.barClass}`}></div>
                {/* Badge public */}
                <div className={`absolute top-3 right-3 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${card.labelClass} backdrop-blur-sm`}>
                  {card.label}
                </div>
                {/* Badge cours d'essai */}
                {card.hasTrial && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] uppercase tracking-widest font-bold text-gold px-2.5 py-1 rounded-full">
                    <Sparkles size={10} />
                    Cours d'essai dispo
                  </div>
                )}
              </div>

              <div className="p-7 flex flex-col flex-1">
                {/* Titre + âges */}
                <div className="mb-5">
                  <h3 className="text-xl font-serif font-bold text-dark">{card.title}</h3>
                  <p className="text-xs text-dark/45 mt-1 uppercase tracking-wider font-medium">{card.ages}</p>
                </div>

                {/* Horaires structurés */}
                <div className="mb-5 space-y-2 flex-1">
                  {card.schedule.map((slot, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/50 mt-[7px] shrink-0"></span>
                      <div>
                        <span className="font-medium text-dark/80">{slot.day}</span>
                        <span className="text-dark/50"> · {slot.time}</span>
                        {slot.detail && <span className="text-dark/40 text-xs block">{slot.detail}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Techniques */}
                <p className="text-[11px] text-dark/40 uppercase tracking-widest mb-6 border-t border-dark/5 pt-4">
                  {card.techniques}
                </p>

                {/* Tarif + CTA — alignés en bas de carte */}
                <div className="mt-auto">
                  <div className="mb-4">
                    {card.price !== null ? (
                      <>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-3xl font-serif font-bold text-dark">{card.price}€</span>
                          <span className="text-xs text-dark/45 font-medium">{card.priceSuffix}</span>
                        </div>
                        <p className="text-xs text-dark/35 mt-1">{card.priceAlt}</p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-serif font-bold text-dark">Sur devis</div>
                        <p className="text-xs text-dark/35 mt-1">{card.priceAlt}</p>
                      </>
                    )}
                  </div>
                  <a
                    href={card.id === 'entreprises' ? '#contact' : '#reservation'}
                    onClick={(e) => { e.preventDefault(); scrollToElement(card.id === 'entreprises' ? '#contact' : '#reservation', { offset: 80 }); }}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs uppercase tracking-widest font-bold transition-all duration-300 active:scale-[0.98] ${
                      card.id === 'entreprises'
                        ? 'bg-forest text-white hover:bg-dark'
                        : 'bg-leaf text-white hover:bg-forest'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    {card.cta}
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-14 text-dark/40 italic text-sm"
        >
          "Un temps d'échange est prévu pour convenir des techniques adaptées à chacun."
        </motion.p>
      </div>

      {/* Séparateur organique */}
      <div className="absolute bottom-0 left-0 right-0 z-[3] leading-[0]">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-forest">
          <path d="M0 120L60 110C120 100 240 80 360 76.7C480 73.3 600 86.7 720 93.3C840 100 960 100 1080 90C1200 80 1320 60 1380 50L1440 40V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor"/>
        </svg>
      </div>
    </section>
  );
};

export default Ateliers;
