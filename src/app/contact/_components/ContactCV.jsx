'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { CV_ITEMS } from '../_data/cv';

export default function ContactCV() {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const items = CV_ITEMS[lang] ?? CV_ITEMS.en;

  return (
    <div>
      <motion.button
        type="button"
        id="contact-cv-toggle"
        aria-expanded={isOpen}
        aria-controls="contact-cv-panel"
        className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="text-xl font-light">{t('contact.cv')}</span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ↓
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
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
              {items.map((item, index) => (
                <div key={`${item.period}-${index}`} className="space-y-1">
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
  );
}
