'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CV_ITEMS } from '../_data/cv';

export default function ContactCV() {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const items = CV_ITEMS[lang] ?? CV_ITEMS.en;

  return (
    <div className="space-y-4">
      <button
        type="button"
        id="contact-cv-toggle"
        aria-expanded={isOpen}
        aria-controls="contact-cv-panel"
        className="flex items-center gap-2 text-sm font-light text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{t('contact.cv')}</span>
        <span aria-hidden="true">{isOpen ? '↑' : '↓'}</span>
      </button>

      {isOpen && (
        <div
          id="contact-cv-panel"
          role="region"
          aria-labelledby="contact-cv-toggle"
          className="space-y-4"
        >
          {items.map((item, index) => (
            <div key={`${item.period}-${index}`} className="space-y-1">
              <p className="text-sm font-medium text-black">{item.period}</p>
              <p className="text-sm text-black">{item.title}</p>
              <p className="text-sm text-black/70">{item.institution}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
