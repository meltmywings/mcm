import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CMS_STATE } from '../api/_lib/defaultState';
import { mountAdminMagazineClone } from '../src/scripts/adminMagazineClone';
import { applyElementLayouts, applyTextOverrides } from '../src/scripts/cmsView';

function dispatchPointer(
  target: EventTarget,
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number,
): void {
  const evt = new Event(type, { bubbles: true, cancelable: true }) as unknown as PointerEvent;
  Object.defineProperty(evt, 'pointerId', { value: pointerId });
  Object.defineProperty(evt, 'pointerType', { value: 'touch' });
  Object.defineProperty(evt, 'isPrimary', { value: pointerId === 1 });
  Object.defineProperty(evt, 'button', { value: 0 });
  Object.defineProperty(evt, 'clientX', { value: clientX });
  Object.defineProperty(evt, 'clientY', { value: clientY });
  target.dispatchEvent(evt);
}

describe('Admin Live Magazine Clone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('mounts the exact live magazine structure with interactive flipping pages and direct +, pencil, and bin controls', () => {
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);
    window.scrollTo = vi.fn();

    const host = document.createElement('div');
    document.body.append(host);

    const onAction = vi.fn();
    const state = structuredClone(DEFAULT_CMS_STATE);
    const clone = mountAdminMagazineClone(host, state, onAction);

    expect(clone.controller).not.toBeNull();
    const pages = clone.controller!.getPages();
    expect(pages).toHaveLength(14);
    expect(pages[0].id).toBe('cover');
    expect(pages[1].id).toBe('glossary-1');

    // Can flip pages just like the main site
    const nextBtn = host.querySelector<HTMLButtonElement>('#mag-next-btn')!;
    nextBtn.click();
    expect(clone.controller!.getCurrentIndex()).toBe(1);

    // Every editable surface exposes direct add (+), edit (pencil), and delete (bin) buttons
    expect(host.querySelector('#cover [data-action="edit-hero"]')).not.toBeNull();
    expect(host.querySelector('#cover [data-action="add-hero-btn"]')).not.toBeNull();
    expect(host.querySelector('#metrics [data-action="add-metric"]')).not.toBeNull();
    expect(host.querySelector('#work [data-action="edit-case"]')).not.toBeNull();
    expect(host.querySelector('#work [data-action="edit-page-photo"]')).not.toBeNull();
    expect(host.querySelector('#work [data-action="delete-page-photo"]')).not.toBeNull();
    expect(host.querySelector('[data-page-note-cutout="work"]')?.closest('.mag-note-box')?.querySelector('[data-action="edit-page-photo"][data-page="note-work"]')).not.toBeNull();

    // Clicking an overlay icon dispatches directly to onAction without flipping pages
    const editCaseBtn = host.querySelector<HTMLButtonElement>('#work [data-action="edit-case"]')!;
    editCaseBtn.click();
    expect(onAction).toHaveBeenCalledWith(editCaseBtn);
    expect(clone.controller!.getCurrentIndex()).toBe(1);

    clone.destroy();
  });

  it('restores active page position immediately after real-time CMS rebuilds', () => {
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);
    window.scrollTo = vi.fn();

    const host = document.createElement('div');
    document.body.append(host);

    const state = structuredClone(DEFAULT_CMS_STATE);
    state.siteContent.workHeading = 'Updated Live Headline';
    const clone = mountAdminMagazineClone(host, state, vi.fn(), 'work');

    expect(clone.controller!.getCurrentIndex()).toBe(4);
    expect(host.querySelector('#work-heading')?.textContent).toBe('Updated Live Headline');

    clone.destroy();
  });

  it('places pen, bin, and 4-arrow move/resize controls directly on every media item, trio photo, sticker, and text block with 2-finger pinch resize', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);
    window.scrollTo = vi.fn();

    const host = document.createElement('div');
    document.body.append(host);

    const onCommitLayout = vi.fn().mockResolvedValue(undefined);
    const state = structuredClone(DEFAULT_CMS_STATE);
    const clone = mountAdminMagazineClone(host, state, vi.fn(), 'work', onCommitLayout);

    // Every media surface (cover photo, cover logo, cutouts, note sticker, mini-trio thumbnails) has direct overlay buttons ON it
    const coverBg = host.querySelector<HTMLElement>('#cover .mag-photo-figure.is-cover-photo')!;
    expect(coverBg.querySelector('[data-action="edit-page-photo"][data-page="cover"]')).not.toBeNull();
    expect(coverBg.querySelector('[data-action="delete-page-photo"][data-page="cover"]')).not.toBeNull();
    expect(coverBg.querySelector('[data-action="toggle-reposition"]')).not.toBeNull();

    const heroLogo = host.querySelector<HTMLElement>('#cover .hero-brand-title')!;
    expect(heroLogo.querySelector('[data-action="edit-hero-logo"]')).not.toBeNull();
    expect(heroLogo.querySelector('[data-action="toggle-reposition"]')).not.toBeNull();

    const workNoteHost = host.querySelector<HTMLElement>('#work .mag-note-cutout-host')!;
    expect(workNoteHost.querySelector('[data-action="edit-page-photo"][data-page="note-work"]')).not.toBeNull();
    expect(workNoteHost.querySelector('[data-action="delete-page-photo"][data-page="note-work"]')).not.toBeNull();
    expect(workNoteHost.querySelector('[data-action="toggle-reposition"]')).not.toBeNull();

    const trioSlots = host.querySelectorAll<HTMLElement>('#work .mag-ref-mini-trio .mag-trio-slot');
    expect(trioSlots).toHaveLength(3);
    trioSlots.forEach((slot, idx) => {
      expect(slot.querySelector(`[data-action="edit-page-photo"][data-page="trio-work"][data-idx="${idx}"]`)).not.toBeNull();
      expect(slot.querySelector(`[data-action="delete-page-photo"][data-page="trio-work"][data-idx="${idx}"]`)).not.toBeNull();
      expect(slot.querySelector('[data-action="toggle-reposition"]')).not.toBeNull();
    });

    // Every text head & paragraph copy has direct edit, delete/hide, and 4-arrow controls ON the text node itself
    const workHead = host.querySelector<HTMLElement>('#work .mag-zine-head')!;
    expect(workHead.querySelector('[data-action="edit-work-header"]')).not.toBeNull();
    expect(workHead.querySelector('[data-action="hide-section"][data-section="work"]')).not.toBeNull();
    expect(workHead.querySelector('[data-action="toggle-reposition"]')).not.toBeNull();

    const metricsPara = host.querySelector<HTMLElement>('#metrics p.mag-zine-copy')!;
    expect(metricsPara.querySelector('[data-action="edit-text-override"]')).not.toBeNull();
    expect(metricsPara.querySelector('[data-action="delete-text-override"]')).not.toBeNull();
    expect(metricsPara.querySelector('[data-action="toggle-reposition"]')).not.toBeNull();

    // Activate 4-arrow reposition/resize mode on a floating cutout sticker & resize with two fingers + drag
    const workCutout = host.querySelector<HTMLElement>('#work [data-page-photos="work"] > .mag-photo-figure')!;
    const moveBtn = workCutout.querySelector<HTMLButtonElement>('[data-action="toggle-reposition"]')!;
    moveBtn.click();

    const book = host.querySelector<HTMLElement>('#mag-book')!;
    expect(workCutout.classList.contains('is-reposition-active')).toBe(true);
    expect(book.classList.contains('is-repositioning-element')).toBe(true);

    // 1-finger move +24px right, +16px down
    dispatchPointer(workCutout, 'pointerdown', 1, 100, 100);
    dispatchPointer(workCutout, 'pointermove', 1, 124, 116);

    // Add 2nd finger for two-finger pinch resize (distance doubles from 100px -> 150px => 1.5x scale)
    dispatchPointer(workCutout, 'pointerdown', 2, 224, 116);
    dispatchPointer(workCutout, 'pointermove', 2, 274, 116);
    dispatchPointer(workCutout, 'pointerup', 2, 274, 116);
    dispatchPointer(workCutout, 'pointerup', 1, 124, 116);

    expect(Number(workCutout.style.getPropertyValue('--el-scale'))).toBeCloseTo(1.5, 1);

    // Done button commits layout changes via onCommitLayout
    const doneBtn = host.querySelector<HTMLButtonElement>('.admin-reposition-hud [data-repo-cmd="done"]')!;
    doneBtn.click();
    await Promise.resolve();

    expect(onCommitLayout).toHaveBeenCalledWith(
      workCutout.dataset.layoutKey,
      expect.objectContaining({
        scale: expect.any(Number),
      }),
    );
    expect(workCutout.classList.contains('is-reposition-active')).toBe(false);
    expect(book.classList.contains('is-repositioning-element')).toBe(false);

    // Text overrides and element layouts apply identically onto DOM
    applyTextOverrides(host, {
      'note:work:copy': { text: 'Updated work desk caption' },
    });
    expect(host.querySelector('#work .mag-note-box > p.mag-zine-copy')?.textContent).toBe(
      'Updated work desk caption',
    );
    applyElementLayouts(host, {
      'work:head': { x: 12, y: -8, scale: 1.2 },
    });
    expect(workHead.style.getPropertyValue('--el-tx')).toBe('12px');
    expect(workHead.style.getPropertyValue('--el-scale')).toBe('1.2');

    clone.destroy();
  });
});
