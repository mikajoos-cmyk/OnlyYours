import { useEffect } from 'react';

export function useVisualViewport() {
  useEffect(() => {
    const handleResize = () => {
      if (!window.visualViewport) return;

      // Setzt eine CSS-Variable auf die exakte Höhe des sichtbaren Bereichs
      const height = window.visualViewport.height;
      document.documentElement.style.setProperty('--app-height', `${height}px`);

      // Optional: Scrollt bei iOS ganz nach oben, um Grafikfehler zu vermeiden
      window.scrollTo(0, 0);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      handleResize(); // Initial aufrufen
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);
}