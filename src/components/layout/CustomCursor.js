"use client";

import { useEffect } from 'react';

export default function CustomCursor() {
  useEffect(() => {
    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    
    const crosshair = document.createElement('div');
    crosshair.classList.add('crosshair');
    cursor.appendChild(crosshair);
    
    document.body.appendChild(cursor);

    const moveCursor = (e) => {
      requestAnimationFrame(() => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      });
    };

    const clickCursor = () => {
      if (cursor.classList.contains('clicked')) {
        cursor.classList.remove('clicked');
        // Trigger reflow to restart animation
        void cursor.offsetWidth;
      }
      cursor.classList.add('clicked');
    };

    const handleTransitionEnd = () => {
      // Remove rotation instantly (no reverse animation)
      crosshair.style.transition = 'none';
      cursor.classList.remove('clicked');
      // Force reflow so the style takes effect immediately
      void crosshair.offsetWidth;
      // Restore transition property for next click
      crosshair.style.transition = '';
    }

    const handleMouseOver = (e) => {
      if (e.target.closest('a, button, [role="button"], .cursor-pointer')) {
        cursor.classList.add('hover');
      }
    };

    const handleMouseOut = () => {
      cursor.classList.remove('hover');
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousedown', clickCursor);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    crosshair.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousedown', clickCursor);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      crosshair.removeEventListener('transitionend', handleTransitionEnd);
      if (document.body.contains(cursor)) {
        document.body.removeChild(cursor);
      }
    };
  }, []);

  return null;
}
