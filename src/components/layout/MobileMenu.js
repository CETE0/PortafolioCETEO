'use client';

import { useState } from 'react';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('translate-x-0');
      sidebar.classList.toggle('-translate-x-full');
    }
    setIsOpen(!isOpen);
  };

  return (
    <button 
      className="h-16 w-16 flex items-center justify-center text-black hover:text-red-500 transition-colors"
      onClick={toggleMenu}
      aria-label="Open menu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
} 