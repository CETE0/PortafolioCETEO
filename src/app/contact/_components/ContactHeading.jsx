'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function ContactHeading() {
  const { t } = useLanguage();
  return <h1 className="sr-only">{t('sidebar.contact')}</h1>;
}
