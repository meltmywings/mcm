import type { ElementLayout } from '../types/cms';

export interface RepositionController {
  toggle: (target: HTMLElement, layoutKey: string, label: string) => void;
  getActiveKey: () => string | null;
  commitAndExit: () => Promise<void>;
  destroy: () => void;
}

const MIN_SCALE = 0.35;
const MAX_SCALE = 2.6;
const MIN_OFFSET = -280;
const MAX_OFFSET = 280;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function readElementLayout(el: HTMLElement, saved?: ElementLayout): ElementLayout {
  const inlineTx = parseFloat(el.style.getPropertyValue('--el-tx') || '');
  const inlineTy = parseFloat(el.style.getPropertyValue('--el-ty') || '');
  const inlineScale = parseFloat(el.style.getPropertyValue('--el-scale') || '');
  return {
    x: Number.isFinite(inlineTx) ? inlineTx : saved?.x ?? 0,
    y: Number.isFinite(inlineTy) ? inlineTy : saved?.y ?? 0,
    scale: Number.isFinite(inlineScale) ? inlineScale : saved?.scale ?? 1,
  };
}

function writeElementLayout(el: HTMLElement, layout: ElementLayout): void {
  const isDefault =
    Math.abs(layout.x) < 0.5 && Math.abs(layout.y) < 0.5 && Math.abs(layout.scale - 1) < 0.01;
  if (isDefault) {
    el.style.removeProperty('--el-tx');
    el.style.removeProperty('--el-ty');
    el.style.removeProperty('--el-scale');
    el.classList.remove('has-el-layout');
    return;
  }
  el.style.setProperty('--el-tx', `${Math.round(layout.x)}px`);
  el.style.setProperty('--el-ty', `${Math.round(layout.y)}px`);
  el.style.setProperty('--el-scale', String(Number(layout.scale.toFixed(3))));
  el.classList.add('has-el-layout');
}

/**
 * Coordinates interactive 1-finger move, 2-finger pinch resize, corner handle resize,
 * and keyboard nudging for a single selected magazine image, sticker, or text element.
 */
export function createRepositionController(
  stage: HTMLElement,
  book: HTMLElement,
  getInitialLayout: (layoutKey: string) => ElementLayout | undefined,
  onCommit: (layoutKey: string, layout: ElementLayout | null) => Promise<void>,
): RepositionController {
  let activeEl: HTMLElement | null = null;
  let activeKey: string | null = null;
  let activeLabel = '';
  let initialLayout: ElementLayout = { x: 0, y: 0, scale: 1 };
  let currentLayout: ElementLayout = { x: 0, y: 0, scale: 1 };

  const activePointers = new Map<number, { x: number; y: number }>();
  let dragAnchor: { startX: number; startY: number; origX: number; origY: number } | null = null;
  let pinchAnchor: {
    startDist: number;
    startScale: number;
    startMidX: number;
    startMidY: number;
    origX: number;
    origY: number;
  } | null = null;
  let touchPinchActive = false;
  let cornerResizeAnchor: {
    centerX: number;
    centerY: number;
    startDist: number;
    startScale: number;
  } | null = null;

  const liveRegion = document.createElement('div');
  liveRegion.className = 'visually-hidden';
  liveRegion.setAttribute('aria-live', 'polite');
  stage.append(liveRegion);

  const hud = document.createElement('div');
  hud.className = 'admin-reposition-hud';
  hud.hidden = true;
  hud.innerHTML = `
    <span class="admin-reposition-title"></span>
    <span class="admin-reposition-hint">Drag to move · Pinch 2 fingers to resize</span>
    <div class="admin-reposition-actions">
      <button type="button" class="admin-mag-btn" data-repo-cmd="smaller" aria-label="Decrease size">-</button>
      <span class="admin-reposition-scale">100%</span>
      <button type="button" class="admin-mag-btn" data-repo-cmd="larger" aria-label="Increase size">+</button>
      <button type="button" class="admin-mag-btn" data-repo-cmd="reset">Reset</button>
      <button type="button" class="admin-mag-btn is-add" data-repo-cmd="done">✓ Done</button>
    </div>
  `;
  stage.append(hud);

  const cornerKnob = document.createElement('button');
  cornerKnob.type = 'button';
  cornerKnob.className = 'admin-resize-corner';
  cornerKnob.dataset.resizeCorner = 'true';
  cornerKnob.setAttribute('aria-label', 'Drag corner to resize element');
  cornerKnob.title = 'Drag corner or pinch with 2 fingers to resize';

  const announce = (msg: string) => {
    liveRegion.textContent = msg;
  };

  const syncHud = () => {
    if (!activeEl) {
      hud.hidden = true;
      return;
    }
    hud.hidden = false;
    const titleEl = hud.querySelector<HTMLElement>('.admin-reposition-title');
    const scaleEl = hud.querySelector<HTMLElement>('.admin-reposition-scale');
    if (titleEl) titleEl.textContent = activeLabel;
    if (scaleEl) scaleEl.textContent = `${Math.round(currentLayout.scale * 100)}%`;
  };

  const applyCurrent = () => {
    if (!activeEl) return;
    writeElementLayout(activeEl, currentLayout);
    syncHud();
  };

  const anchorSingleDrag = (pt: { x: number; y: number }) => {
    pinchAnchor = null;
    dragAnchor = {
      startX: pt.x,
      startY: pt.y,
      origX: currentLayout.x,
      origY: currentLayout.y,
    };
  };

  const anchorPinch = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    dragAnchor = null;
    pinchAnchor = {
      startDist: Math.max(12, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
      startScale: currentLayout.scale,
      startMidX: (p1.x + p2.x) / 2,
      startMidY: (p1.y + p2.y) / 2,
      origX: currentLayout.x,
      origY: currentLayout.y,
    };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!activeEl || !activeKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('.admin-reposition-hud')) return;

    if (target?.closest('[data-resize-corner]')) {
      e.preventDefault();
      e.stopPropagation();
      const rect = activeEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      cornerResizeAnchor = {
        centerX,
        centerY,
        startDist: Math.max(12, Math.hypot(e.clientX - centerX, e.clientY - centerY)),
        startScale: currentLayout.scale,
      };
      cornerKnob.setPointerCapture?.(e.pointerId);
      return;
    }

    if (target?.closest('.admin-el-controls')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    activeEl.setPointerCapture?.(e.pointerId);

    if (activePointers.size === 1) {
      anchorSingleDrag({ x: e.clientX, y: e.clientY });
    } else if (activePointers.size >= 2) {
      const pts = Array.from(activePointers.values());
      anchorPinch(pts[0], pts[1]);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!activeEl) return;

    if (cornerResizeAnchor) {
      e.preventDefault();
      e.stopPropagation();
      const dist = Math.max(
        12,
        Math.hypot(e.clientX - cornerResizeAnchor.centerX, e.clientY - cornerResizeAnchor.centerY),
      );
      currentLayout.scale = clamp(
        Number((cornerResizeAnchor.startScale * (dist / cornerResizeAnchor.startDist)).toFixed(3)),
        MIN_SCALE,
        MAX_SCALE,
      );
      applyCurrent();
      return;
    }

    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();

    if (activePointers.size >= 2) {
      const [p1, p2] = Array.from(activePointers.values());
      if (!pinchAnchor) anchorPinch(p1, p2);
      if (pinchAnchor) {
        const dist = Math.max(12, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        currentLayout.scale = clamp(
          Number((pinchAnchor.startScale * (dist / pinchAnchor.startDist)).toFixed(3)),
          MIN_SCALE,
          MAX_SCALE,
        );
        currentLayout.x = clamp(
          Math.round(pinchAnchor.origX + (midX - pinchAnchor.startMidX)),
          MIN_OFFSET,
          MAX_OFFSET,
        );
        currentLayout.y = clamp(
          Math.round(pinchAnchor.origY + (midY - pinchAnchor.startMidY)),
          MIN_OFFSET,
          MAX_OFFSET,
        );
        applyCurrent();
      }
      return;
    }

    if (dragAnchor) {
      currentLayout.x = clamp(
        Math.round(dragAnchor.origX + (e.clientX - dragAnchor.startX)),
        MIN_OFFSET,
        MAX_OFFSET,
      );
      currentLayout.y = clamp(
        Math.round(dragAnchor.origY + (e.clientY - dragAnchor.startY)),
        MIN_OFFSET,
        MAX_OFFSET,
      );
      applyCurrent();
    }
  };

  const onPointerUpOrCancel = (e: PointerEvent) => {
    if (cornerResizeAnchor) {
      cornerResizeAnchor = null;
      return;
    }
    if (!activePointers.has(e.pointerId)) return;
    activePointers.delete(e.pointerId);
    pinchAnchor = null;
    if (activePointers.size === 1) {
      const [remaining] = Array.from(activePointers.values());
      anchorSingleDrag(remaining);
    } else if (activePointers.size === 0) {
      dragAnchor = null;
    }
  };

  // Fallback for touch devices that coalesce multi-touch pinch into TouchEvent
  const onTouchStart = (e: TouchEvent) => {
    if (!activeEl || activePointers.size >= 2 || e.touches.length !== 2) return;
    e.preventDefault();
    e.stopPropagation();
    touchPinchActive = true;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    anchorPinch({ x: t1.clientX, y: t1.clientY }, { x: t2.clientX, y: t2.clientY });
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!activeEl || !touchPinchActive || activePointers.size >= 2 || e.touches.length !== 2) return;
    e.preventDefault();
    e.stopPropagation();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    if (!pinchAnchor) {
      anchorPinch({ x: t1.clientX, y: t1.clientY }, { x: t2.clientX, y: t2.clientY });
      return;
    }
    const dist = Math.max(12, Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY));
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    currentLayout.scale = clamp(
      Number((pinchAnchor.startScale * (dist / pinchAnchor.startDist)).toFixed(3)),
      MIN_SCALE,
      MAX_SCALE,
    );
    currentLayout.x = clamp(
      Math.round(pinchAnchor.origX + (midX - pinchAnchor.startMidX)),
      MIN_OFFSET,
      MAX_OFFSET,
    );
    currentLayout.y = clamp(
      Math.round(pinchAnchor.origY + (midY - pinchAnchor.startMidY)),
      MIN_OFFSET,
      MAX_OFFSET,
    );
    applyCurrent();
  };

  const onTouchEnd = () => {
    touchPinchActive = false;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!activeEl) return;
    const step = e.shiftKey ? 18 : 6;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      currentLayout.x = clamp(currentLayout.x - step, MIN_OFFSET, MAX_OFFSET);
      applyCurrent();
      announce(`${activeLabel} moved left`);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      currentLayout.x = clamp(currentLayout.x + step, MIN_OFFSET, MAX_OFFSET);
      applyCurrent();
      announce(`${activeLabel} moved right`);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentLayout.y = clamp(currentLayout.y - step, MIN_OFFSET, MAX_OFFSET);
      applyCurrent();
      announce(`${activeLabel} moved up`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentLayout.y = clamp(currentLayout.y + step, MIN_OFFSET, MAX_OFFSET);
      applyCurrent();
      announce(`${activeLabel} moved down`);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      currentLayout.scale = clamp(Number((currentLayout.scale + 0.1).toFixed(2)), MIN_SCALE, MAX_SCALE);
      applyCurrent();
      announce(`${activeLabel} resized to ${Math.round(currentLayout.scale * 100)}%`);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      currentLayout.scale = clamp(Number((currentLayout.scale - 0.1).toFixed(2)), MIN_SCALE, MAX_SCALE);
      applyCurrent();
      announce(`${activeLabel} resized to ${Math.round(currentLayout.scale * 100)}%`);
    } else if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      void commitAndExit();
    }
  };

  const detachElementListeners = (el: HTMLElement) => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUpOrCancel);
    el.removeEventListener('pointercancel', onPointerUpOrCancel);
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchEnd);
    el.removeEventListener('keydown', onKeyDown);
    el.classList.remove('is-reposition-active');
    if (cornerKnob.parentElement === el) cornerKnob.remove();
  };

  const commitAndExit = async () => {
    if (!activeEl || !activeKey) return;
    const key = activeKey;
    const prev = initialLayout;
    const next = { ...currentLayout };
    const el = activeEl;

    activePointers.clear();
    dragAnchor = null;
    pinchAnchor = null;
    touchPinchActive = false;
    cornerResizeAnchor = null;

    detachElementListeners(el);
    activeEl = null;
    activeKey = null;
    book.classList.remove('is-repositioning-element');
    syncHud();
    announce(`${activeLabel} layout saved`);

    const changed =
      Math.round(prev.x) !== Math.round(next.x) ||
      Math.round(prev.y) !== Math.round(next.y) ||
      Math.round(prev.scale * 100) !== Math.round(next.scale * 100);

    if (changed) {
      const isReset =
        Math.abs(next.x) < 0.5 && Math.abs(next.y) < 0.5 && Math.abs(next.scale - 1) < 0.01;
      await onCommit(key, isReset ? null : next);
    }
  };

  const enter = (target: HTMLElement, layoutKey: string, label: string) => {
    activeEl = target;
    activeKey = layoutKey;
    activeLabel = label;

    const saved = getInitialLayout(layoutKey);
    currentLayout = readElementLayout(target, saved);
    initialLayout = { ...currentLayout };

    target.classList.add('is-reposition-active');
    if (!target.hasAttribute('tabindex')) {
      target.tabIndex = 0;
    }
    target.append(cornerKnob);

    target.addEventListener('pointerdown', onPointerDown);
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUpOrCancel);
    target.addEventListener('pointercancel', onPointerUpOrCancel);
    target.addEventListener('touchstart', onTouchStart, { passive: false });
    target.addEventListener('touchmove', onTouchMove, { passive: false });
    target.addEventListener('touchend', onTouchEnd);
    target.addEventListener('touchcancel', onTouchEnd);
    target.addEventListener('keydown', onKeyDown);

    book.classList.add('is-repositioning-element');
    syncHud();
    announce(`Reposition mode active on ${label}. Drag to move or pinch two fingers to resize.`);
  };

  const onHudClick = (e: Event) => {
    const cmdBtn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-repo-cmd]');
    if (!cmdBtn || !activeEl) return;
    e.preventDefault();
    e.stopPropagation();
    const cmd = cmdBtn.dataset.repoCmd;
    if (cmd === 'smaller') {
      currentLayout.scale = clamp(Number((currentLayout.scale - 0.1).toFixed(2)), MIN_SCALE, MAX_SCALE);
      applyCurrent();
    } else if (cmd === 'larger') {
      currentLayout.scale = clamp(Number((currentLayout.scale + 0.1).toFixed(2)), MIN_SCALE, MAX_SCALE);
      applyCurrent();
    } else if (cmd === 'reset') {
      currentLayout = { x: 0, y: 0, scale: 1 };
      applyCurrent();
    } else if (cmd === 'done') {
      void commitAndExit();
    }
  };

  hud.addEventListener('click', onHudClick);

  const toggle = (target: HTMLElement, layoutKey: string, label: string) => {
    if (activeEl === target && activeKey === layoutKey) {
      void commitAndExit();
      return;
    }
    if (activeEl) {
      void commitAndExit().then(() => enter(target, layoutKey, label));
      return;
    }
    enter(target, layoutKey, label);
  };

  return {
    toggle,
    getActiveKey: () => activeKey,
    commitAndExit,
    destroy: () => {
      if (activeEl) {
        detachElementListeners(activeEl);
      }
      activePointers.clear();
      activeEl = null;
      activeKey = null;
      book.classList.remove('is-repositioning-element');
      hud.removeEventListener('click', onHudClick);
      hud.remove();
      liveRegion.remove();
    },
  };
}
