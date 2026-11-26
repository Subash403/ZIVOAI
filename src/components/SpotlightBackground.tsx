'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const CALM_ROUTES = ['/checkout', '/login', '/register', '/account', '/admin', '/orders'];

export default function SpotlightBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isTransactionalRoute = CALM_ROUTES.some((prefix) => pathname?.startsWith(prefix));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let listenerAttached = false;

    const handlePointerMove = (e: PointerEvent) => {
      root.classList.remove('is-idle');
      const xPercent = `${((e.clientX / window.innerWidth) * 100).toFixed(2)}%`;
      const yPercent = `${((e.clientY / window.innerHeight) * 100).toFixed(2)}%`;
      root.style.setProperty('--bga-02-mx', xPercent);
      root.style.setProperty('--bga-02-my', yPercent);

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!reducedMotionQuery.matches && !isTransactionalRoute) {
          root.classList.add('is-idle');
        }
      }, 4500);
    };

    const syncMotionPolicy = () => {
      const shouldDisableMotion =
        reducedMotionQuery.matches || !finePointerQuery.matches || isTransactionalRoute;

      if (shouldDisableMotion) {
        if (idleTimer) clearTimeout(idleTimer);
        root.classList.remove('is-idle');
        root.style.removeProperty('--bga-02-mx');
        root.style.removeProperty('--bga-02-my');
        if (listenerAttached) {
          window.removeEventListener('pointermove', handlePointerMove);
          listenerAttached = false;
        }
      } else {
        root.classList.add('is-idle');
        if (!listenerAttached) {
          window.addEventListener('pointermove', handlePointerMove, { passive: true });
          listenerAttached = true;
        }
      }
    };

    syncMotionPolicy();

    reducedMotionQuery.addEventListener('change', syncMotionPolicy);
    finePointerQuery.addEventListener('change', syncMotionPolicy);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (listenerAttached) {
        window.removeEventListener('pointermove', handlePointerMove);
      }
      reducedMotionQuery.removeEventListener('change', syncMotionPolicy);
      finePointerQuery.removeEventListener('change', syncMotionPolicy);
    };
  }, [isTransactionalRoute]);

  return (
    <div
      ref={rootRef}
      className={`bga-02 fixed inset-0 z-0 h-full w-full overflow-hidden pointer-events-none ${
        isTransactionalRoute ? 'is-calm' : ''
      }`}
      aria-hidden="true"
    >
      {/* Single low-opacity technical grid (no overlapping duplicate grid — ZAI-116) */}
      <div className="bga-02__grid" />

      {/* Pure CSS gradient spotlight reveal (zero external Unsplash image dependency — ZAI-117, ZAI-119) */}
      <div className="bga-02__beam" />

      {/* Soft edge vignette */}
      <div className="bga-02__vig" />
    </div>
  );
}
