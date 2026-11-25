import { TICKER_ITEMS } from '../data/agency';

export function renderTicker(track: HTMLElement | null): void {
  if (!track) return;
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  track.replaceChildren(
    ...items.map((text, index) => {
      const li = document.createElement('li');
      li.className = 'ticker-item';
      li.textContent = text;
      if (index >= TICKER_ITEMS.length) {
        li.setAttribute('aria-hidden', 'true');
      }
      return li;
    }),
  );
}

/**
 * WCAG 2.2.2 Pause, Stop, Hide control:
 * Toggles button label between "Pause ticker" and "Play ticker" without aria-pressed.
 */
export function initTickerToggle(
  button: HTMLButtonElement | null,
  track: HTMLElement | null,
): (() => void) | null {
  if (!button || !track) return null;

  const handleToggle = () => {
    const paused = track.classList.toggle('is-paused');
    button.textContent = paused ? 'Play ticker' : 'Pause ticker';
  };

  button.addEventListener('click', handleToggle);
  return () => button.removeEventListener('click', handleToggle);
}

/**
 * Scroll-driven reveal fallback for browsers lacking CSS view() + animation-range support.
 */
export function initScrollRevealFallback(root: ParentNode = document): IntersectionObserver | null {
  const supportsViewTimeline =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('(animation-timeline: view()) and (animation-range: entry)');

  const prefersNoMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  if (supportsViewTimeline || prefersNoMotion || typeof IntersectionObserver === 'undefined') {
    return null;
  }

  const elements = Array.from(root.querySelectorAll<HTMLElement>('.reveal-card'));
  if (!elements.length) return null;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const progress = Math.min(1, Math.max(0.2, entry.intersectionRatio + 0.2));
        el.style.opacity = String(progress);
        el.style.transform = `translateY(${((1 - progress) * 16).toFixed(1)}px)`;
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );

  elements.forEach((el) => observer.observe(el));
  return observer;
}

