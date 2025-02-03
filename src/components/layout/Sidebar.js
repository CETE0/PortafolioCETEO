'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState('photography');

  const categories = {
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
    },
    artworks: {
      name: 'ARTWORKS',
      projects: [
        'traducciones',
        'atento-sargento',
        'tomautoma',
        'autorretrato',
        'una-flor-para-otra...',
        'para-ti-esto-es-un-juego',
      ]
    }
  };

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-white p-6 border-r border-gray-200">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="block">
          <h1 className="text-xl font-bold text-red-600 " >CETEO</h1>
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
        className="absolute bottom-6 text-sm text-gray-600 hover:text-gray-900"
      >
        CONTACT-ABOUT
      </Link>
    </nav>
  );
};

export default Sidebar;