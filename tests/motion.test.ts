import { afterEach, describe, expect, it, vi } from 'vitest';
import { TICKER_ITEMS } from '../src/data/agency';
import { initScrollRevealFallback, initTickerToggle, renderTicker } from '../src/scripts/motion';

describe('Motion controls & scroll reveal fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders duplicated ticker items with aria-hidden on duplicates and toggles pause/play', () => {
    document.body.innerHTML = `
      <ul id="ticker-track"></ul>
      <button type="button" id="ticker-toggle">Pause ticker</button>
    `;
    const track = document.getElementById('ticker-track')!;
    const button = document.getElementById('ticker-toggle') as HTMLButtonElement;

    renderTicker(track);
    const items = track.querySelectorAll('li');
    expect(items).toHaveLength(TICKER_ITEMS.length * 2);
    expect(items[0].hasAttribute('aria-hidden')).toBe(false);
    expect(items[TICKER_ITEMS.length].getAttribute('aria-hidden')).toBe('true');

    const cleanup = initTickerToggle(button, track);
    button.click();
    expect(track.classList.contains('is-paused')).toBe(true);
    expect(button.textContent).toBe('Play ticker');
    expect(button.hasAttribute('aria-pressed')).toBe(false);

    button.click();
    expect(track.classList.contains('is-paused')).toBe(false);
    expect(button.textContent).toBe('Pause ticker');
    cleanup?.();
  });

  it('skips IntersectionObserver scroll fallback when user prefers reduced motion', () => {
    document.body.innerHTML = '<div class="reveal-card"></div>';
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false }),
    );
    const result = initScrollRevealFallback(document);
    expect(result).toBeNull();
  });
});

