'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Sidebar = () => {
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState('artworks');
  const [showExperimentalWarning, setShowExperimentalWarning] = useState(false);
  const { t } = useLanguage();

  const categories = {
    artworks: {
      name: t('sidebar.artworks'),
      projects: [
        'reparando',
        'sistemas-del-cuerpo',
        'te-juro-que-es-primera-vez-que-me-pasa',
        'traducciones',
        'atento-sargento',
        'tomautoma',
        'autorretrato',
        'una-flor-para-otra...',
        'para-ti-esto-es-un-juego',
        'santiago-1',
        'medium',
        'donante-universal',
      ]
    },
    photography: {
      name: t('sidebar.photography'),
      projects: [
        'yofelia'
      ]
    },
    motion: {
      name: t('sidebar.motion'),
      projects: [
        'video-art',
        'animation',
        'virtual-reality'
      ]
    },
    thrdworks: {
      name: t('sidebar.models3d'),
      projects: [
        'photogrammetry',
        //'organic'
      ]
    },
    experimental: {
      name: t('sidebar.experimental'),
      projects: [
        'medio condoro',
        'dopa'
      ]
    },
    texts: {
      name: t('sidebar.texts'),
      projects: [
        'statement'
      ]
    }
  };

  return (
    <nav className="h-screen w-full bg-white px-8 pb-6 pt-24 md:p-6 md:pt-6 border-r border-white overflow-y-auto flex flex-col items-center justify-center md:items-start md:justify-between">
      <div className="w-full">
        {/* Header (hidden on mobile) */}
        <div className="hidden md:block mb-8">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <Link href="/" className="block">
                <h1 className="text-xl font-bold text-red-600">CETEO</h1>
              </Link>
              <LanguageSwitcher />
            </div>
            <p className="text-sm text-gray-600">new?-media artist</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-8 md:space-y-4 w-full flex flex-col items-center md:items-start">
          {Object.entries(categories).map(([key, category]) => (
            <div key={key} className="space-y-2 relative">
              <button
                onClick={() => {
                  setActiveCategory(key);
                  if (key === 'experimental' && activeCategory !== 'experimental') {
                    setShowExperimentalWarning(true);
                    setTimeout(() => setShowExperimentalWarning(false), 3000);
                  }
                }}
                className={`block w-full text-center md:text-left text-sm font-medium ${
                  activeCategory === key ? 'text-red-500' : 'text-gray-900'
                }`}
              >
                {category.name}
              </button>
              
              {/* Experimental warning popup */}
              {key === 'experimental' && showExperimentalWarning && (
                <div className="absolute left-0 md:left-full top-0 md:top-auto md:ml-2 mt-6 md:mt-0 z-50 bg-white border border-gray-300 px-3 py-2 text-xs text-gray-700 shadow-sm max-w-[200px] whitespace-normal">
                  {t('experimental.warning')}
                </div>
              )}
              
              {activeCategory === key && (
                <div className={`space-y-1 transition-all duration-300 w-full flex flex-col items-center md:items-start ${activeCategory === key ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}` }>
                  {category.projects.map((project) => {
                    // Handle external link for "medio condoro"
                    if (project === 'medio condoro') {
                      return (
                        <a
                          key={project}
                          href="https://www.maquinacondor.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-center md:text-left text-gray-600 hover:text-gray-900"
                          onClick={() => {
                            // Close mobile menu when a link is clicked
                            const sidebar = document.getElementById('mobile-sidebar');
                            if (sidebar) {
                              sidebar.classList.add('translate-x-full');
                              sidebar.classList.remove('translate-x-0');
                            }
                            // Notify MobileMenu to reset state
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new Event('sidebarClosed'));
                            }
                          }}
                        >
                          {project.replace(/-/g, ' ')}
                        </a>
                      );
                    }
                    // Regular internal link for other projects
                    return (
                      <Link
                        key={project}
                        href={`/${key}/${project}`}
                        className={`block text-sm text-center md:text-left ${
                          pathname === `/${key}/${project}`
                            ? 'text-red-500'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        onClick={() => {
                          // Close mobile menu when a link is clicked
                          const sidebar = document.getElementById('mobile-sidebar');
                          if (sidebar) {
                            sidebar.classList.add('translate-x-full');
                            sidebar.classList.remove('translate-x-0');
                          }
                          // Notify MobileMenu to reset state
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('sidebarClosed'));
                          }
                        }}
                      >
                        {project.replace(/-/g, ' ')}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Contact Link */}
        <Link
          href="/contact"
          className="block text-sm text-gray-600 hover:text-gray-900 text-center mt-8 md:mt-0 md:absolute md:bottom-6 md:left-8"
          onClick={() => {
            // Close mobile menu when contact link is clicked
            const sidebar = document.getElementById('mobile-sidebar');
            if (sidebar) {
              sidebar.classList.add('translate-x-full');
              sidebar.classList.remove('translate-x-0');
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('sidebarClosed'));
            }
          }}
        >
          {t('sidebar.contact')}
        </Link>
      </div>
    </nav>
  );
};

export default Sidebar;