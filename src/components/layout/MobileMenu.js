'use client';

import { useState, useEffect, useRef } from 'react';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  const wiggleTimeoutRef = useRef(null);
  const hasInteractedRef = useRef(false);

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

  // Attention animation - wiggle periodically when menu is closed
  useEffect(() => {
    const scheduleWiggle = () => {
      // Random delay between 4 and 10 seconds
      const delay = 4000 + Math.random() * 6000;
      
      wiggleTimeoutRef.current = setTimeout(() => {
        // Only wiggle if menu is closed and user hasn't interacted yet
        if (!isOpen && !hasInteractedRef.current) {
          setIsWiggling(true);
          // Remove animation class after it completes
          setTimeout(() => setIsWiggling(false), 600);
        }
        // Schedule next wiggle
        scheduleWiggle();
      }, delay);
    };

    // Start the wiggle cycle after initial delay
    const initialDelay = setTimeout(() => {
      if (!hasInteractedRef.current) {
        setIsWiggling(true);
        setTimeout(() => setIsWiggling(false), 600);
      }
      scheduleWiggle();
    }, 3000); // First wiggle after 3 seconds

    return () => {
      clearTimeout(initialDelay);
      if (wiggleTimeoutRef.current) {
        clearTimeout(wiggleTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const toggleMenu = () => {
    hasInteractedRef.current = true; // User has interacted, stop wiggling
    const sidebar = document.getElementById('mobile-sidebar');
    const nextIsOpen = !isOpen;
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
    setIsOpen(nextIsOpen);

    // Notificar a otras partes (ej. el juego) que el menú móvil está abierto/cerrado
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mobileMenuState', { detail: { isOpen: nextIsOpen } }));
    }
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
        // Hamburger icon with attention animation
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-8 w-8 ${isWiggling ? 'animate-menu-attention' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );
} 