import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn } from 'lucide-react';
import axios from 'axios';

interface GalleryImage {
  id: number;
  url: string;
  caption: string;
}

interface AppSettings {
  profile_image?: string;
}

const Univers = ({ settings }: { settings: AppSettings | null }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const profileImage = settings?.profile_image || "https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&q=80&w=1000";

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await axios.get('/api/gallery');
        setImages(response.data);
      } catch (error) {
        console.error("Error fetching gallery:", error);
      }
    };
    fetchGallery();
  }, []);

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };

    if (selectedImage) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  return (
    <section id="univers" className="py-32 bg-forest relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-center mb-24">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs uppercase tracking-[0.3em] font-semibold text-sage mb-6 block">Démarche Artistique</span>
            <h2 className="text-4xl md:text-6xl font-serif text-paper mb-10 leading-tight">L'Univers de Karine</h2>
            <p className="text-paper/70 text-lg leading-relaxed font-sans mb-8">
              "Mon travail artistique explore les liens entre le corps, le paysage et la mémoire, à travers une pratique mêlant photographie, peinture et intégration de matières..."
            </p>
            <div className="w-20 h-1 bg-sage"></div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={profileImage} 
                alt="Karine Fromentin dans son atelier" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-gold/20 rounded-full blur-3xl"></div>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <motion.div 
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-lg border-2 border-gold/5 hover:border-gold/30 transition-all duration-500"
              onClick={() => setSelectedImage(image)}
            >
              <img 
                src={image.url} 
                alt={image.caption} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-forest/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center p-6 text-center">
                <ZoomIn className="text-sage mb-4" size={32} />
                <h3 className="text-paper font-serif text-lg">{image.caption}</h3>
              </div>
              <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/20 transition-all duration-500 rounded-2xl pointer-events-none"></div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-dark/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 md:top-10 md:right-10 text-paper hover:text-gold transition-colors z-[110] bg-dark/50 p-2 rounded-full backdrop-blur-sm"
              onClick={() => setSelectedImage(null)}
              aria-label="Fermer"
            >
              <X size={32} className="md:w-10 md:h-10" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-full flex flex-col items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedImage.url} 
                alt={selectedImage.caption} 
                className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="mt-6 md:mt-8 text-center px-4">
                <h3 className="text-gold font-serif text-2xl md:text-3xl mb-2">{selectedImage.caption}</h3>
                <div className="w-12 h-0.5 bg-paper/20 mx-auto"></div>
                <p className="text-paper/40 text-[10px] uppercase tracking-widest mt-4">Cliquez n'importe où pour fermer</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Organic shape separator */}
      <div className="absolute bottom-0 left-0 right-0 z-[3] leading-[0]">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-paper">
          <path d="M0 120L60 110C120 100 240 80 360 76.7C480 73.3 600 86.7 720 93.3C840 100 960 100 1080 90C1200 80 1320 60 1380 50L1440 40V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor"/>
        </svg>
      </div>
    </section>
  );
};

export default Univers;
