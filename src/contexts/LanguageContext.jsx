"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dict } from '@/i18n/dict';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key, params) => '',
});

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(.*?)\}/g, (_, k) => {
    if (Object.prototype.hasOwnProperty.call(params, k)) return String(params[k]);
    return `{${k}}`;
  });
}

function getFromDict(lang, key) {
  const parts = key.split('.');
  let node = dict[lang] || dict.en;
  for (const p of parts) {
    node = node?.[p];
    if (node == null) return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null;
    if (stored === 'en' || stored === 'es') {
      setLangState(stored);
      return;
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
    setLangState(nav?.startsWith('es') ? 'es' : 'en');
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lang', lang);
    }
  }, [lang]);

  const setLang = (next) => {
    setLangState(next === 'es' ? 'es' : 'en');
  };

  const t = useMemo(() => {
    return (key, params) => {
      const value = getFromDict(lang, key) ?? getFromDict('en', key) ?? key;
      return interpolate(value, params);
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}


