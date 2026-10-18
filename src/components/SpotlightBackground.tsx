'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

export default function SpotlightBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm) root.classList.add('is-idle');

    let idleTimer: NodeJS.Timeout;

    const handlePointerMove = (e: PointerEvent) => {
      root.classList.remove('is-idle');
      const xPercent = ((e.clientX / window.innerWidth) * 100).toFixed(2) + '%';
      const yPercent = ((e.clientY / window.innerHeight) * 100).toFixed(2) + '%';

      root.style.setProperty('--bga-02-mx', xPercent);
      root.style.setProperty('--bga-02-my', yPercent);

      // Return to idle orbit after 4 seconds of mouse inactivity
      clearTimeout(idleTimer);
      if (!calm) {
        idleTimer = setTimeout(() => {
          root.classList.add('is-idle');
        }, 4000);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      clearTimeout(idleTimer);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="bga-02 fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Grid Pattern */}
      <div className="bga-02__grid" />

      {/* Spotlight Reveal with Tech Background Photo */}
      <div className="bga-02__reveal">
        <Image
          className="bga-02__photo"
          src="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1800&auto=format&fit=crop"
          alt="Tech background pattern"
          width={1800}
          height={1200}
          loading="lazy"
        />
      </div>


      {/* Spotlight Beam */}
      <div className="bga-02__beam" />

      {/* Edge Vignette */}
      <div className="bga-02__vig" />
    </div>
  );
}
