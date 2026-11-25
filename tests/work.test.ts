import { afterEach, describe, expect, it, vi } from 'vitest';
import { initWorkSection } from '../src/scripts/work';

function setupWorkDom() {
  document.body.innerHTML = `
    <div class="filter-bar">
      <button type="button" class="filter-btn" data-filter="all" aria-pressed="true">All Work</button>
      <button type="button" class="filter-btn" data-filter="short-form" aria-pressed="false">TikTok &amp; Reels</button>
      <button type="button" class="filter-btn" data-filter="creators" aria-pressed="false">Creator Ecosystems</button>
      <button type="button" class="filter-btn" data-filter="paid-social" aria-pressed="false">Paid Social</button>
    </div>
    <p id="work-count"></p>
    <ul id="work-grid"></ul>
    <dialog id="case-dialog" closedby="any" aria-labelledby="case-dialog-title">
      <p id="case-dialog-channel"></p>
      <h1 id="case-dialog-title"></h1>
      <div id="case-dialog-metrics"></div>
      <p id="case-dialog-challenge"></p>
      <p id="case-dialog-strategy"></p>
      <ul id="case-dialog-deliverables"></ul>
      <a href="#brief" id="case-dialog-cta">Build a Campaign</a>
    </dialog>
  `;
}

describe('Work section & case study modal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('filters cards, toggles aria-pressed, and updates live count', () => {
    setupWorkDom();
    initWorkSection(document);

    const creatorsBtn = document.querySelector<HTMLButtonElement>('[data-filter="creators"]')!;
    creatorsBtn.click();

    expect(creatorsBtn.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-filter="all"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('work-count')?.textContent).toBe('Showing 2 case studies');

    const visibleCards = Array.from(document.querySelectorAll<HTMLLIElement>('.case-card')).filter(
      (el) => !el.hidden,
    );
    expect(visibleCards).toHaveLength(2);
    expect(visibleCards.every((el) => el.dataset.channel === 'creators')).toBe(true);
  });

  it('opens the native dialog with populated case study details and resets returnValue on close', () => {
    setupWorkDom();
    const dialog = document.getElementById('case-dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => {
      dialog.setAttribute('open', '');
    });
    dialog.close = vi.fn((val?: string) => {
      if (val !== undefined) dialog.returnValue = val;
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });

    initWorkSection(document);

    const trigger = document.querySelector<HTMLButtonElement>('[data-open-case="vespera-botanicals"]')!;
    trigger.click();

    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(document.getElementById('case-dialog-title')?.textContent).toContain('Vespera Botanicals');
    expect(document.querySelectorAll('#case-dialog-deliverables li')).toHaveLength(3);

    dialog.returnValue = 'stale';
    dialog.dispatchEvent(new Event('close'));
    expect(dialog.returnValue).toBe('');
  });
});

