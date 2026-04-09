'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT_TEXT } from './_data/about';
import { CV_ITEMS } from './_data/cv';

export default function Contact() {
  const { t, lang } = useLanguage();
  const [isCvOpen, setIsCvOpen] = useState(false);

  const aboutText = ABOUT_TEXT[lang] ?? ABOUT_TEXT.en;
  const cvItems = CV_ITEMS[lang] ?? CV_ITEMS.en;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <h1 className="sr-only">{t('sidebar.contact')}</h1>
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
            <section aria-labelledby="contact-h-contact" className="space-y-4">
              <h2 id="contact-h-contact" className="text-xl font-light text-black">{t('contact.contact')}</h2>
              <div className="space-y-2 text-black text-sm font-light">
                <a
                  href="mailto:contacto.ceteo@gmail.com"
                  className="block text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
                >
                  contacto.ceteo@gmail.com
                </a>
              </div>
            </section>

            {/* About */}
            <section aria-labelledby="contact-h-about" className="space-y-4">
              <h2 id="contact-h-about" className="text-xl font-light text-black">{t('contact.about')}</h2>
              <p className="text-black text-sm font-light leading-relaxed">
                {aboutText}
              </p>
            </section>

            {/* Social */}
            <section aria-labelledby="contact-h-social" className="space-y-4">
              <h2 id="contact-h-social" className="text-xl font-light text-black">{t('contact.social')}</h2>
              <div className="space-y-2">
                <a
                  href="https://www.instagram.com/c.e.teo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors font-light"
                >
                  Instagram
                </a>
              </div>
            </section>
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
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* CV Section */}
      <div>
        {/* CV Header/Toggle */}
        <motion.button
          type="button"
          id="contact-cv-toggle"
          aria-expanded={isCvOpen}
          aria-controls="contact-cv-panel"
          className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
          onClick={() => setIsCvOpen(!isCvOpen)}
        >
          <span className="text-xl font-light">{t('contact.cv')}</span>
          <motion.span
            aria-hidden="true"
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
              id="contact-cv-panel"
              role="region"
              aria-labelledby="contact-cv-toggle"
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
      </div>
    </div>
  );
}