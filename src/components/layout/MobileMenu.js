'use client';

import { useState, useEffect } from 'react';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  // Close icon reset when sidebar closes via link click
  useEffect(() => {
    const handler = () => setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('sidebarClosed', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('sidebarClosed', handler);
      }
    };
  }, []);

  const toggleMenu = () => {
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) {
      if (isOpen) {
        // Close sidebar
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('translate-x-full');
      } else {
        // Open sidebar
        sidebar.classList.remove('translate-x-full');
        sidebar.classList.add('translate-x-0');
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <button
      className="h-16 w-16 flex items-center justify-center text-black hover:text-red-500 transition-colors"
      onClick={toggleMenu}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        // X icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        // Hamburger icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );
} 