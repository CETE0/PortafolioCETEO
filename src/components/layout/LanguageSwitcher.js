"use client";

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage();
  const next = lang === 'en' ? 'es' : 'en';

  return (
    <button
      type="button"
      aria-label="Change language"
      className={`inline-flex items-center justify-center text-xs text-gray-700 hover:text-red-600 transition-colors appearance-none bg-transparent border-0 p-0 m-0 leading-none focus:outline-none focus:ring-0 ${className}`}
      onClick={() => setLang(next)}
    >
      <span className="inline-block align-middle select-none">{lang.toUpperCase()}</span>
    </button>
  );
}


