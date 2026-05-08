import React from 'react';
import { scrollToElement } from '../lib/scrollUtils';

const Footer = () => {
  return (
    <footer className="py-24 bg-forest text-paper relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <div className="text-4xl font-serif font-bold tracking-[0.3em] text-sage mb-12">
          KRÉA
        </div>
        
        <div className="flex flex-wrap justify-center gap-12 mb-16 text-xs uppercase tracking-widest font-medium text-paper/80">
          <a href="#ateliers" onClick={(e) => { e.preventDefault(); scrollToElement('#ateliers'); }} className="hover:text-gold transition-colors">Ateliers</a>
          <a href="#univers" onClick={(e) => { e.preventDefault(); scrollToElement('#univers'); }} className="hover:text-gold transition-colors">Univers</a>
          <a href="#reservation" onClick={(e) => { e.preventDefault(); scrollToElement('#reservation'); }} className="hover:text-gold transition-colors">Réserver</a>
          <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToElement('#contact'); }} className="hover:text-gold transition-colors">Contact</a>
        </div>

        <div className="w-24 h-px bg-sage/30 mx-auto mb-12"></div>

        <div className="text-sm text-paper/60 space-y-4 font-light">
          <p>© {new Date().getFullYear()} Kréa – Karine Fromentin. Tous droits réservés.</p>
          <div className="flex justify-center gap-6">
            <a href="#" className="hover:text-sage transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-sage transition-colors">Politique de confidentialité</a>
          </div>
        </div>
      </div>

      {/* Decorative organic shape */}
      <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-leaf/10 rounded-full blur-3xl -z-0"></div>
      <div className="absolute top-0 left-0 -translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-sage/10 rounded-full blur-3xl -z-0"></div>
    </footer>
  );
};

export default Footer;
