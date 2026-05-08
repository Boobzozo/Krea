import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { scrollToElement, scrollToTop } from '../lib/scrollUtils';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Ateliers', href: '#ateliers' },
    { name: 'Galerie', href: '#univers' },
    { name: 'Réserver', href: '#reservation' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-500 ${scrolled ? 'bg-paper/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <a 
          href="#accueil" 
          onClick={(e) => { e.preventDefault(); scrollToTop(); }}
          className={`text-2xl font-serif font-bold tracking-[0.2em] transition-colors duration-500 ${scrolled ? 'text-leaf' : 'text-paper'}`}
        >
          KRÉA
        </a>
        
        <div className={`hidden md:flex items-center space-x-8 text-xs uppercase tracking-widest font-medium transition-colors duration-500 ${scrolled ? 'text-dark' : 'text-paper'}`}>
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              onClick={(e) => { e.preventDefault(); scrollToElement(link.href, { offset: 80 }); }}
              className="hover:text-leaf transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        <button className={`md:hidden transition-colors ${scrolled ? 'text-dark' : 'text-paper'}`} onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-paper border-b border-dark/5 p-6 flex flex-col space-y-4 text-center md:hidden shadow-xl"
          >
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setIsOpen(false); 
                  scrollToElement(link.href, { offset: 80 }); 
                }} 
                className="text-sm uppercase tracking-widest font-medium text-dark hover:text-leaf transition-colors"
              >
                {link.name}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
