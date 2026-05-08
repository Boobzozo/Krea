import React from 'react';
import { motion } from 'motion/react';
import { Home, Sparkles } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-6 pt-24">
        <div className="max-w-2xl w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative inline-block mb-8">
              <span className="text-[12rem] font-serif leading-none text-gold/10 select-none">404</span>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-gold w-16 h-16 animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-serif text-leaf mb-6">Chemin égaré dans la création</h1>
            
            <p className="text-lg text-dark/70 font-sans leading-relaxed mb-12 max-w-md mx-auto">
              Il semble que cette page se soit perdue dans un mélange de couleurs et de textures. 
              Même dans l'art, certains chemins sont des impasses créatives.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="/" 
                className="btn-primary flex items-center gap-2 group"
              >
                <Home size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                Retourner à l'accueil
              </a>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
