import React from 'react';
import { motion } from 'motion/react';
import { Palette, Users, Sparkles } from 'lucide-react';

const Philosophie = () => {
  const values = [
    {
      icon: <Palette className="text-gold" size={32} />,
      title: "Expérimentation libre",
      description: "Un espace pour explorer sans jugement, où l'erreur est une opportunité de création."
    },
    {
      icon: <Users className="text-gold" size={32} />,
      title: "Accompagnement personnalisé",
      description: "Chaque élève est guidé selon son propre rythme et ses affinités artistiques."
    },
    {
      icon: <Sparkles className="text-gold" size={32} />,
      title: "Expression de soi",
      description: "L'art comme moyen de traduire ses émotions et de partager sa vision du monde."
    }
  ];

  return (
    <section id="philosophie" className="py-32 bg-paper relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-24"
        >
          <h2 className="text-3xl md:text-5xl font-serif mb-12 leading-relaxed text-dark italic">
            "Je pense sincèrement que l'on est là pour partager avec les autres ce que nous sommes et pas uniquement ce que nous faisons. Notre valeur n'est pas liée à nos résultats."
          </h2>
          <div className="w-24 h-1 bg-gold mx-auto"></div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-16">
          {values.map((value, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="text-center flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center mb-8 border-2 border-gold/20">
                {value.icon}
              </div>
              <h3 className="text-xl font-serif font-bold mb-4 text-dark">{value.title}</h3>
              <p className="text-dark/60 leading-relaxed font-sans text-sm">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Decorative organic shape */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-sage/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl -z-10"></div>
    </section>
  );
};

export default Philosophie;
