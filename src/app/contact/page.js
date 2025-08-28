'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Contact() {
  const { t, lang } = useLanguage();
  const [isCvOpen, setIsCvOpen] = useState(false);

  const aboutText = useMemo(() => {
    if (lang === 'es') {
      return 'Mateo Cereceda (CETEO) es un artista de nuevos medios radicado en Santiago, Chile. Actualmente trabaja en la intersección entre el arte digital y la instalación escultórica experimental.';
    }
    return 'Mateo Cereceda (CETEO) is a new media artist based in Santiago, Chile. Currently working at the intersection of digital art and experimental sculptural installation.';
  }, [lang]);

  const cvItems = useMemo(() => {
    if (lang === 'es') {
      return [
        {
          period: '2021 - X',
          title: 'Ingeniería Civil Telemática',
          institution: 'Universidad Técnica Federico Santa María',
        },
        {
          period: '2022 - 2025',
          title: 'Licenciatura en Artes',
          institution: 'Pontificia Universidad Católica de Chile',
        },
        {
          period: '2022',
          title: 'Bootcamp de Desarrollo Web Full Stack',
          institution: 'Universidad del Desarrollo',
        },
        {
          period: '2023',
          title: 'Taller Internacional de Producción de Moda, Coolhunting y Styling en NYC',
          institution: 'Chile Fashion Studios',
        },
        {
          period: '2024',
          title: 'Exposición TOMA#1',
          institution: 'Producción y Curaduría',
        },
        {
          period: '2024',
          title: 'Exposición TOMA#2',
          institution: 'Producción y Curaduría',
        },
        {
          period: '2024',
          title: 'Ayudante Pregrado - Fotogrametria y Modelado 3D',
          institution: 'Pontificia Universidad Católica de Chile',
        },
        {
          period: '2025',
          title: 'Ayudante Laboratorio LAITEC',
          institution: 'Pontificia Universidad Católica de Chile',
        },
        {
          period: '2025',
          title: 'Ayudante Posgrado - Laboratorio de Creación Interdisciplinaria en Artes y Tecnología',
          institution: 'Pontificia Universidad Católica de Chile',
        },
        {
          period: '2025',
          title: 'Exposición TOMA#3',
          institution: 'Producción y Curaduría',
        },
        {
          period: '2025',
          title: 'Exposición TOMA#4',
          institution: 'Producción y Curaduría',
        },
        {
          period: '2025',
          title: '17 Bienal de Artes Mediales de Santiago',
          institution: 'Colectivo TOMA - Participante',
        },
      ];
    }
    return [
      {
        period: '2021 - X',
        title: 'Telematics Civil Engineering',
        institution: 'Universidad Técnica Federico Santa María',
      },
      {
        period: '2022 - 2025',
        title: 'Bachelor of Arts',
        institution: 'Pontificia Universidad Católica de Chile',
      },
      {
        period: '2022',
        title: 'Full Stack Web Development Bootcamp',
        institution: 'Universidad del Desarrollo',
      },
      {
        period: '2023',
        title: 'International Workshop on Fashion Production, Coolhunting and Styling in NYC',
        institution: 'Chile Fashion Studios',
      },
      {
        period: '2024',
        title: 'TOMA#1 Exhibition',
        institution: 'Production & Curation',
      },
      {
        period: '2024',
        title: 'TOMA#2 Exhibition',
        institution: 'Production & Curation',
      },
      {
        period: '2024',
        title: 'Undergraduate Teaching Assistant - Photogrammetry and 3D Modeling',
        institution: 'Pontificia Universidad Católica de Chile',
      },
      {
        period: '2025',
        title: 'Laboratory Assistant LAITEC',
        institution: 'Pontificia Universidad Católica de Chile',
      },
      {
        period: '2025',
        title: 'Graduate Teaching Assistant - Laboratory of Interdisciplinary Creation in Arts and Technology',
        institution: 'Pontificia Universidad Católica de Chile',
      },
      {
        period: '2025',
        title: 'TOMA#3 Exhibition',
        institution: 'Production & Curation',
      },
      {
        period: '2025',
        title: 'TOMA#4 Exhibition',
        institution: 'Production & Curation',
      },
      {
        period: '2025',
        title: '17th Santiago Media Arts Biennial',
        institution: 'TOMA Collective - Participant',
      },
    ];
  }, [lang]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Contenido principal */}
      <div className="flex-grow flex items-center justify-center p-4 md:p-8">
        <div className="flex flex-col md:flex-row max-w-5xl w-full gap-8 md:gap-16">
          {/* Columna izquierda - Información */}
          <motion.div 
            className="w-full md:w-1/2 space-y-8 md:space-y-12"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Contact */}
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">{t('contact.contact')}</h2>
              <div className="space-y-2 text-black text-sm font-light">
                <p>contacto.ceteo@gmail.com</p>
              </div>
            </div>

            {/* About */}
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">{t('contact.about')}</h2>
              <p className="text-black text-sm font-light leading-relaxed">
                {aboutText}
              </p>
            </div>

            {/* Social */}
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">{t('contact.social')}</h2>
              <div className="space-y-2">
                <a 
                  href="https://www.instagram.com/c.e.teo/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-sm text-black hover:text-red-500 transition-colors font-light"
                >
                  Instagram
                </a>
              </div>
            </div>
          </motion.div>

          {/* Columna derecha - GIF */}
          <motion.div 
            className="w-full md:w-1/2 flex items-center justify-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative w-full">
              <Image
                src="/images/contact/gifcontacto.gif"
                alt={t('contact.altGif')}
                width={800}
                height={1067}
                className="w-auto h-auto"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* CV Section */}
      <motion.div 
        className="border-t border-white"
        initial={false}
      >
        {/* CV Header/Toggle */}
        <motion.button
          className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 transition-colors"
          onClick={() => setIsCvOpen(!isCvOpen)}
        >
          <span className="text-xl font-light">{t('contact.cv')}</span>
          <motion.span
            animate={{ rotate: isCvOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            ↓
          </motion.span>
        </motion.button>

        {/* CV Content */}
        <AnimatePresence>
          {isCvOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 md:px-8 py-4 space-y-4">
                {cvItems.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-sm font-medium text-black">{item.period}</p>
                    <p className="text-sm text-black">{item.title}</p>
                    <p className="text-sm text-black/70">{item.institution}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}