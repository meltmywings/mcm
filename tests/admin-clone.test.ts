import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CMS_STATE } from '../api/_lib/defaultState';
import { mountAdminMagazineClone } from '../src/scripts/adminMagazineClone';

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
});
