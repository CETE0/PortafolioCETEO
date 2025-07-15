'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState('artworks');

  const categories = {
    artworks: {
      name: 'ARTWORKS',
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
      ]
    },
    photography: {
      name: 'PHOTOGRAPHY',
      projects: [
        'yofelia'
      ]
    },
    motion: {
      name: 'MOTION',
      projects: [
        'video-art',
        'animation',
        'virtual-reality'
      ]
    },
    thrdworks: {
      name: '3D MODELS',
      projects: [
        'photogrammetry',
        //'organic'
      ]
    },
    experimental: {
      name: 'EXPERIMENTAL',
      projects: [
        'dopa'
      ]
    }
  };

  return (
    <nav className="h-screen w-full bg-white px-8 pb-6 pt-24 md:p-6 md:pt-6 border-r border-white overflow-y-auto flex flex-col items-center justify-center md:items-start md:justify-between">
      <div>
        {/* Header (hidden on mobile) */}
        <div className="hidden md:block mb-8">
          <Link href="/" className="block">
            <h1 className="text-xl font-bold text-red-600">CETEO</h1>
            <p className="text-sm text-gray-600">new?-media artist</p>
          </Link>
        </div>

        {/* Navigation */}
        <div className="space-y-8 md:space-y-4 w-full flex flex-col items-center md:items-start">
          {Object.entries(categories).map(([key, category]) => (
            <div key={key} className="space-y-2">
              <button
                onClick={() => setActiveCategory(key)}
                className={`block w-full text-center md:text-left text-sm font-medium ${
                  activeCategory === key ? 'text-red-500' : 'text-gray-900'
                }`}
              >
                {category.name}
              </button>
              
              {activeCategory === key && (
                <div className={`space-y-1 transition-all duration-300 w-full flex flex-col items-center md:items-start ${activeCategory === key ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}` }>
                  {category.projects.map((project) => (
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
                  ))}
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
          CONTACT-ABOUT
        </Link>
      </div>
    </nav>
  );
};

export default Sidebar;