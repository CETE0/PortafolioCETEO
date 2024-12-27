'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';

export default function Contact() {
  const [isCvOpen, setIsCvOpen] = useState(false);

  const cvItems = [
    {
      period: '2021 - X',
      title: 'Ingeniería Civil Telemática (Telematics Civil Engineering)',
      institution: 'Universidad Técnica Federico Santa María',
    },
    {
      period: '2022 - 2025',
      title: 'Licenciatura en Artes (Bachelor of Arts)',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2022',
      title: 'Full Stack Web Development Bootcamp',
      institution: 'Universidad del Desarrollo',
    },
    {
      period: '2023',
      title: 'International Workshop on Fashion Production, Coolhunting and Styling in NYC',
      institution: 'Chile Fashion Studios',
    },
    {
      period: '2024',
      title: 'TOMA#1 Exhibition',
      institution: 'Production & Curation',
    },
    {
      period: '2024',
      title: 'TOMA#2 Exhibition',
      institution: 'Production & Curation',
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Contenido principal */}
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="flex max-w-5xl w-full gap-16">
          {/* Columna izquierda - Información */}
          <motion.div 
            className="w-1/2 space-y-12"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Contact */}
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">Contact</h2>
              <div className="space-y-2 text-black text-sm font-light">
                <p>contacto.ceteo@gmail.com</p>
              </div>
            </div>

            {/* About */}
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">About</h2>
              <p className="text-black text-sm font-light leading-relaxed">
                New media artist based in Santiago, Chile. Working at the intersection of 
                digital art, photography, and experimental filmmaking. Currently exploring 
                themes of memory, technology, and human perception through various mediums.
              </p>
            </div>

            {/* Social */}
            <div className="space-y-4">
  <h2 className="text-xl font-light text-black">Social</h2>
  <div className="space-y-2">
    <a 
      href="https://www.instagram.com/c.e.teo/" 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block text-sm text-black hover:text-red-500 transition-colors font-light"
    >
      Instagram
    </a>
  </div>
</div>
          </motion.div>

          {/* Columna derecha - GIF */}
          <motion.div 
            className="w-1/2 flex items-center justify-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
>
            <div className="relative w-full">
    <Image
      src="/images/contact/gifcontacto.gif"
      alt="Animated graphic"
      width={800}
      height={1067}
      className="w-auto h-auto"
      priority
    />
  </div>
</motion.div>
        </div>
      </div>

      {/* CV Section */}
      <motion.div 
        className="border-t border-gray-100"
        initial={false}
      >
        {/* CV Header/Toggle */}
        <motion.button
          className="w-full py-4 px-8 flex items-center justify-between text-black hover:text-red-500 transition-colors"
          onClick={() => setIsCvOpen(!isCvOpen)}
        >
          <span className="text-xl font-light">CV</span>
          <motion.span
            animate={{ rotate: isCvOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            ↓
          </motion.span>
        </motion.button>

        {/* CV Content */}
        <AnimatePresence>
          {isCvOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-8 pb-8 max-w-5xl mx-auto">
                <div className="space-y-6">
                  {cvItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-8"
                    >
                      <span className="w-24 text-sm font-light text-gray-500">
                        {item.period}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-sm font-light text-black">
                          {item.title}
                        </h3>
                        <p className="text-sm font-light text-gray-500">
                          {item.institution}
                        </p>
                        <span className="text-sm font-light text-gray-400">
                          {item.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}