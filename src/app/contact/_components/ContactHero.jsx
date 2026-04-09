'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT_TEXT } from '../_data/about';
import ContactSection from './ContactSection';

export default function ContactHero() {
  const { t, lang } = useLanguage();
  const aboutText = ABOUT_TEXT[lang] ?? ABOUT_TEXT.en;

  return (
    <div className="flex-grow flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col md:flex-row max-w-5xl w-full gap-8 md:gap-16">
        <motion.div
          className="w-full md:w-1/2 space-y-8 md:space-y-12"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ContactSection id="contact" title={t('contact.contact')}>
            <div className="space-y-2 text-black text-sm font-light">
              <a
                href="mailto:contacto.ceteo@gmail.com"
                className="block text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
              >
                contacto.ceteo@gmail.com
              </a>
            </div>
          </ContactSection>

          <ContactSection id="about" title={t('contact.about')}>
            <p className="text-black text-sm font-light leading-relaxed">
              {aboutText}
            </p>
          </ContactSection>

          <ContactSection id="social" title={t('contact.social')}>
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
          </ContactSection>
        </motion.div>

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
  );
}
