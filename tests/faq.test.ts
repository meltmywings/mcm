import { afterEach, describe, expect, it } from 'vitest';
import { FAQ_ITEMS } from '../src/data/agency';
import { initFaq } from '../src/scripts/faq';

describe('FAQ disclosure accordion', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders all FAQ items collapsed and toggles aria-expanded and panel hidden state', () => {
    document.body.innerHTML = '<div id="faq-list"></div>';
    const container = document.getElementById('faq-list');
    initFaq(container);

    const triggers = document.querySelectorAll<HTMLButtonElement>('.faq-trigger');
    expect(triggers).toHaveLength(FAQ_ITEMS.length);

    const firstTrigger = triggers[0];
    const firstPanel = document.getElementById(firstTrigger.getAttribute('aria-controls')!)!;

    expect(firstTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(firstPanel.hidden).toBe(true);

    firstTrigger.click();
    expect(firstTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(firstPanel.hidden).toBe(false);

    firstTrigger.click();
    expect(firstTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(firstPanel.hidden).toBe(true);
  });
});

