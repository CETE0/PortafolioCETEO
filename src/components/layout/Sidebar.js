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
    <nav className="h-screen w-full bg-white p-6 border-r border-white overflow-y-auto relative flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="mb-8 pt-12 md:pt-0">
          <Link href="/" className="block">
            <h1 className="text-xl font-bold text-red-600">CETEO</h1>
            <p className="text-sm text-gray-600">new?-media artist</p>
          </Link>
        </div>

        {/* Navigation */}
        <div className="space-y-6">
          {Object.entries(categories).map(([key, category]) => (
            <div key={key} className="space-y-2">
              <button
                onClick={() => setActiveCategory(key)}
                className={`text-sm font-medium ${
                  activeCategory === key ? 'text-red-500' : 'text-gray-900'
                }`}
              >
                {category.name}
              </button>
              
              {activeCategory === key && (
                <div className="ml-4 space-y-1">
                  {category.projects.map((project) => (
                    <Link
                      key={project}
                      href={`/${key}/${project}`}
                      className={`block text-sm ${
                        pathname === `/${key}/${project}`
                          ? 'text-red-500'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={() => {
                        // Close mobile menu when a link is clicked
                        const sidebar = document.getElementById('mobile-sidebar');
                        if (sidebar) {
                          sidebar.classList.add('-translate-x-full');
                          sidebar.classList.remove('translate-x-0');
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
      </div>

      {/* Contact Link */}
      <div>
        <Link
          href="/contact"
          className="block text-sm text-gray-600 hover:text-gray-900 mb-6 md:mb-0 md:absolute md:bottom-6"
          onClick={() => {
            // Close mobile menu when contact link is clicked
            const sidebar = document.getElementById('mobile-sidebar');
            if (sidebar) {
              sidebar.classList.add('-translate-x-full');
              sidebar.classList.remove('translate-x-0');
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