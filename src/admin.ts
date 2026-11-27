import { DEFAULT_CMS_STATE } from '../api/_lib/defaultState';
import { initInstallPrompt, registerAppServiceWorker } from './scripts/install';
import { formatPlatformLabel, safeHref } from './scripts/cmsView';
import type {
  BuiltinSectionKey,
  CampaignEvent,
  CampaignKind,
  CaseStudy,
  ChannelFilter,
  ClientRecord,
  ClientStatus,
  CustomElement,
  CustomSection,
  FaqItem,
  HeroButton,
  MagazinePhoto,
  MediaPlatform,
  MediaReference,
  MetricItem,
  PageTextBlock,
  ProcessStep,
  ServicePillar,
  SiteContent,
  SubmissionRecord,
  SubmissionStatus,
} from './types/cms';

interface AdminCmsState {
  siteContent: SiteContent;
  heroButtons: HeroButton[];
  metrics: MetricItem[];
  tickerItems: string[];
  caseStudies: CaseStudy[];
  campaigns: CampaignEvent[];
  services: ServicePillar[];
  processSteps: ProcessStep[];
  faqs: FaqItem[];
  customSections: CustomSection[];
  hiddenSections: BuiltinSectionKey[];
  pagePhotos: Record<string, MagazinePhoto[]>;
  pageTextBlocks: Record<string, PageTextBlock[]>;
  clients: ClientRecord[];
  submissions: SubmissionRecord[];
}

const state: AdminCmsState = {
  siteContent: structuredClone(DEFAULT_CMS_STATE.siteContent),
  heroButtons: structuredClone(DEFAULT_CMS_STATE.heroButtons),
  metrics: structuredClone(DEFAULT_CMS_STATE.metrics),
  tickerItems: structuredClone(DEFAULT_CMS_STATE.tickerItems),
  caseStudies: structuredClone(DEFAULT_CMS_STATE.caseStudies),
  campaigns: structuredClone(DEFAULT_CMS_STATE.campaigns),
  services: structuredClone(DEFAULT_CMS_STATE.services),
  processSteps: structuredClone(DEFAULT_CMS_STATE.processSteps),
  faqs: structuredClone(DEFAULT_CMS_STATE.faqs),
  customSections: [],
  hiddenSections: [],
  pagePhotos: structuredClone(DEFAULT_CMS_STATE.pagePhotos),
  pageTextBlocks: structuredClone(DEFAULT_CMS_STATE.pageTextBlocks),
  clients: [],
  submissions: [],
};

const EDITORIAL_CUTOUT_STICKERS: string[] = Array.from(
  { length: 15 },
  (_, idx) => `/magazines/cutouts/mag-${String(idx + 1).padStart(2, '0')}.png`,
);

const EDITORIAL_SHOOT_PHOTOS: string[] = Array.from(
  { length: 15 },
  (_, idx) => `/magazines/mag-${String(idx + 1).padStart(2, '0')}.jpg`,
);

const DEFAULT_NOTE_CUTOUTS: Record<string, string> = {
  metrics: '/magazines/cutouts/mag-05.png',
  work: '/magazines/cutouts/mag-06.png',
  'work-2': '/magazines/cutouts/mag-10.png',
  events: '/magazines/cutouts/mag-03.png',
  services: '/magazines/cutouts/mag-09.png',
  'services-2': '/magazines/cutouts/mag-08.png',
  'culture-lab': '/magazines/cutouts/mag-13.png',
  faq: '/magazines/cutouts/mag-06.png',
  'faq-2': '/magazines/cutouts/mag-04.png',
  brief: '/magazines/cutouts/mag-11.png',
  directory: '/magazines/cutouts/mag-09.png',
};

const isCutoutStickerSrc = (src: string): boolean => src.includes('/cutouts/');

const SECTION_LABELS: Record<BuiltinSectionKey, string> = {
  hero: 'Hero Showcase',
  metrics: 'Impact Metrics',
  ticker: 'Capabilities Ticker',
  work: 'Cover Stories & Case Studies',
  events: 'Live Campaigns & Events',
  services: 'Capabilities & Services',
  'culture-lab': 'Culture Lab & Quote',
  faq: 'FAQ',
  brief: 'Start a Project Brief',
};

const ICON_PENCIL = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const ICON_BIN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const ICON_PLUS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replaceAll('"', '&quot;');
}

function iconBtn(
  kind: 'edit' | 'delete' | 'add',
  label: string,
  action: string,
  dataAttrs: Record<string, string | number> = {},
  textLabel?: string,
): string {
  const icon = kind === 'edit' ? ICON_PENCIL : kind === 'delete' ? ICON_BIN : ICON_PLUS;
  const cls = kind === 'delete' ? 'icon-action is-delete' : kind === 'add' ? 'icon-action is-add' : 'icon-action';
  const attrs = Object.entries(dataAttrs)
    .map(([k, v]) => `data-${k}="${escapeAttr(String(v))}"`)
    .join(' ');
  const labelSpan = textLabel ? `<span>${escapeHtml(textLabel)}</span>` : '';
  return `<button type="button" class="${cls}" data-action="${escapeAttr(action)}" ${attrs} aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">${icon}${labelSpan}</button>`;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

function showToast(message: string): void {
  const el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 4000);
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

async function persistCmsPatch(
  patch: Partial<Omit<AdminCmsState, 'clients' | 'submissions'>>,
  toastMsg: string,
): Promise<void> {
  const updated = await apiJson<Partial<AdminCmsState>>('/api/cms', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  Object.assign(state, updated);
  renderVisualEditor();
  showToast(toastMsg);
}

function setAuthenticatedUi(authenticated: boolean): void {
  const authGate = document.getElementById('auth-gate');
  const workspace = document.getElementById('admin-workspace');
  const logoutBtn = document.getElementById('logout-btn');
  const passcodeInput = document.getElementById('studio-passcode') as HTMLInputElement | null;

  if (authGate) authGate.hidden = authenticated;
  if (workspace) {
    workspace.hidden = false;
    workspace.classList.toggle('is-locked', !authenticated);
    if (authenticated) {
      workspace.removeAttribute('inert');
      workspace.removeAttribute('aria-hidden');
    } else {
      workspace.setAttribute('inert', '');
      workspace.setAttribute('aria-hidden', 'true');
    }
  }
  if (logoutBtn) logoutBtn.hidden = !authenticated;
  if (!authenticated && passcodeInput) {
    passcodeInput.focus();
  }
}

/* ==========================================================================
   Modal Editor Dialog (native <dialog> with dynamic fields)
   ========================================================================== */

interface DialogField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'select' | 'checkbox';
  value: string | boolean;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

let activeDialogSubmit: ((fd: FormData) => Promise<void>) | null = null;

function openEditorDialog(
  title: string,
  fields: DialogField[],
  onSubmit: (fd: FormData) => Promise<void>,
): void {
  const dialog = document.getElementById('editor-dialog') as HTMLDialogElement | null;
  const titleEl = document.getElementById('editor-dialog-title');
  const fieldsContainer = document.getElementById('editor-dialog-fields');
  if (!dialog || !titleEl || !fieldsContainer) return;

  titleEl.textContent = title;
  activeDialogSubmit = onSubmit;

  fieldsContainer.innerHTML = fields
    .map((f, index) => {
      const id = `ed-field-${f.name}`;
      const auto = index === 0 ? 'autofocus' : '';
      const req = f.required ? 'required' : '';
      if (f.type === 'textarea') {
        return `
          <div class="field">
            <label for="${id}">${escapeHtml(f.label)}</label>
            <textarea id="${id}" name="${escapeAttr(f.name)}" rows="3" ${req} ${auto} placeholder="${escapeAttr(f.placeholder || '')}">${escapeHtml(String(f.value))}</textarea>
          </div>`;
      }
      if (f.type === 'select') {
        const opts = (f.options ?? [])
          .map(
            (o) =>
              `<option value="${escapeAttr(o.value)}" ${String(f.value) === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`,
          )
          .join('');
        return `
          <div class="field">
            <label for="${id}">${escapeHtml(f.label)}</label>
            <select id="${id}" name="${escapeAttr(f.name)}" class="select-input" ${auto}>${opts}</select>
          </div>`;
      }
      if (f.type === 'checkbox') {
        return `
          <label class="editable-chip" for="${id}" style="padding:0.5rem 0.85rem;justify-self:start;cursor:pointer;">
            <input type="checkbox" id="${id}" name="${escapeAttr(f.name)}" ${f.value ? 'checked' : ''} />
            <span>${escapeHtml(f.label)}</span>
          </label>`;
      }
      return `
        <div class="field">
          <label for="${id}">${escapeHtml(f.label)}</label>
          <input type="${f.type}" id="${id}" name="${escapeAttr(f.name)}" value="${escapeAttr(String(f.value))}" ${req} ${auto} placeholder="${escapeAttr(f.placeholder || '')}" />
        </div>`;
    })
    .join('');

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function closeEditorDialog(): void {
  const dialog = document.getElementById('editor-dialog') as HTMLDialogElement | null;
  if (!dialog) return;
  if (typeof dialog.close === 'function' && dialog.open) {
    dialog.close('cancel');
  } else {
    dialog.removeAttribute('open');
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function openPhotoEditorDialog(
  title: string,
  existing: MagazinePhoto | undefined,
  onSave: (photo: { src: string; caption: string }) => Promise<void>,
): void {
  const dialog = document.getElementById('editor-dialog') as HTMLDialogElement | null;
  const titleEl = document.getElementById('editor-dialog-title');
  const fieldsContainer = document.getElementById('editor-dialog-fields');
  if (!dialog || !titleEl || !fieldsContainer) return;

  titleEl.textContent = title;
  const currentSrc = existing?.src || '/magazines/cutouts/mag-05.png';
  const currentCaption = existing?.caption || '';

  fieldsContainer.innerHTML = `
    <div class="field">
      <label for="ed-photo-file">Upload New Image or Sticker (PNG cutout, JPG, WebP, GIF · max 4 MB)</label>
      <input type="file" id="ed-photo-file" accept="image/jpeg,image/png,image/webp,image/gif" />
      <p id="ed-photo-upload-status" class="preview-card-copy" hidden></p>
    </div>
    <div class="field">
      <label>Choose Torn-Paper Cutout Sticker (15 Stickers)</label>
      <div class="photo-gallery-picker">
        ${EDITORIAL_CUTOUT_STICKERS.map(
          (src, idx) => `
          <button type="button" class="photo-pick-btn ${currentSrc === src ? 'is-selected' : ''}" data-pick-src="${escapeAttr(src)}" title="Use Sticker ${idx + 1}">
            <img src="${escapeAttr(src)}" alt="Cutout sticker ${idx + 1}" />
          </button>`,
        ).join('')}
      </div>
    </div>
    <div class="field">
      <label>Or Choose Editorial Shoot Photo (15 Photos)</label>
      <div class="photo-gallery-picker">
        ${EDITORIAL_SHOOT_PHOTOS.map(
          (src, idx) => `
          <button type="button" class="photo-pick-btn ${currentSrc === src ? 'is-selected' : ''}" data-pick-src="${escapeAttr(src)}" title="Use Shoot ${idx + 1}">
            <img src="${escapeAttr(src)}" alt="Editorial photo ${idx + 1}" />
          </button>`,
        ).join('')}
      </div>
    </div>
    <div class="photo-dialog-preview-row">
      <img id="ed-photo-preview" class="photo-dialog-preview" src="${escapeAttr(currentSrc)}" alt="Selected magazine image or sticker preview" />
      <div class="field" style="flex:1;">
        <label for="ed-field-src">Image or Sticker URL / Path</label>
        <input type="text" id="ed-field-src" name="src" value="${escapeAttr(currentSrc)}" required placeholder="/magazines/cutouts/mag-05.png" />
      </div>
    </div>
    <div class="field">
      <label for="ed-field-caption">Label / Caption (optional)</label>
      <input type="text" id="ed-field-caption" name="caption" value="${escapeAttr(currentCaption)}" placeholder="e.g., Runway Sticker or Autumn Feature" />
    </div>
  `;

  const srcInput = document.getElementById('ed-field-src') as HTMLInputElement | null;
  const previewImg = document.getElementById('ed-photo-preview') as HTMLImageElement | null;
  const fileInput = document.getElementById('ed-photo-file') as HTMLInputElement | null;
  const uploadStatus = document.getElementById('ed-photo-upload-status');

  fieldsContainer.querySelectorAll<HTMLButtonElement>('[data-pick-src]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const picked = btn.dataset.pickSrc || '';
      if (srcInput) srcInput.value = picked;
      if (previewImg) previewImg.src = picked;
      fieldsContainer.querySelectorAll<HTMLButtonElement>('[data-pick-src]').forEach((b) => {
        b.classList.toggle('is-selected', b === btn);
      });
    });
  });

  srcInput?.addEventListener('input', () => {
    if (previewImg && srcInput.value.trim()) {
      previewImg.src = srcInput.value.trim();
    }
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (uploadStatus) {
      uploadStatus.textContent = `Uploading ${file.name}…`;
      uploadStatus.hidden = false;
    }
    try {
      const dataBase64 = await readFileAsDataUrl(file);
      const uploaded = await apiJson<{ ok: boolean; url: string }>('/api/media', {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type, dataBase64 }),
      });
      if (srcInput) srcInput.value = uploaded.url;
      if (previewImg) previewImg.src = uploaded.url;
      if (uploadStatus) {
        uploadStatus.textContent = 'Photo uploaded to magazine archive. Click Save & Publish to apply.';
      }
    } catch (err) {
      if (uploadStatus) {
        uploadStatus.textContent = err instanceof Error ? err.message : 'Upload failed.';
      }
    }
  });

  activeDialogSubmit = async (fd) => {
    const src = String(fd.get('src') || '').trim();
    const caption = String(fd.get('caption') || '').trim();
    if (!src) return;
    await onSave({ src, caption });
  };

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function getEffectivePagePhotos(pageKey: string, customIdx = 0): MagazinePhoto[] {
  if (Object.prototype.hasOwnProperty.call(state.pagePhotos, pageKey)) {
    return state.pagePhotos[pageKey] ?? [];
  }
  if (pageKey.startsWith('note-')) {
    const baseKey = pageKey.slice(5);
    const noteSrc = DEFAULT_NOTE_CUTOUTS[baseKey];
    return noteSrc ? [{ id: `default-${pageKey}`, src: noteSrc, caption: 'Sidebar Note Sticker' }] : [];
  }
  if (pageKey.startsWith('custom-')) {
    const src = EDITORIAL_CUTOUT_STICKERS[(customIdx + 7) % EDITORIAL_CUTOUT_STICKERS.length];
    return [{ id: `default-${pageKey}`, src, caption: 'Editorial Feature Sticker' }];
  }
  return DEFAULT_CMS_STATE.pagePhotos[pageKey] ?? [];
}

function renderPageMediaAndTextStrip(
  pageKey: string,
  pageLabel: string,
  customIdx = 0,
): string {
  const photos = getEffectivePagePhotos(pageKey, customIdx);
  const texts = state.pageTextBlocks[pageKey] ?? [];
  const noteKey = `note-${pageKey}`;
  const noteStickers = DEFAULT_NOTE_CUTOUTS[pageKey] ? getEffectivePagePhotos(noteKey, customIdx) : null;

  return `
    <div class="preview-media-strip">
      <div class="preview-media-col">
        <div class="preview-refs-head">
          <span>Images &amp; Stickers (${escapeHtml(pageLabel)})</span>
          ${iconBtn('add', `Add image or sticker to ${pageLabel}`, 'add-page-photo', { page: pageKey, 'c-idx': customIdx }, 'Sticker / Image')}
        </div>
        <div class="preview-photo-grid">
          ${
            photos
              .map(
                (ph, idx) => `
            <div class="preview-photo-card">
              <img class="preview-photo-thumb" src="${escapeAttr(ph.src)}" alt="" />
              <div class="preview-photo-meta">
                <div>
                  <span class="meta-pill">${isCutoutStickerSrc(ph.src) ? 'Sticker' : 'Image'}</span>
                  <span class="preview-card-copy">${escapeHtml(ph.caption || 'Magazine Asset')}</span>
                </div>
                <div class="action-cluster">
                  ${iconBtn('edit', `Replace image or sticker on ${pageLabel}`, 'edit-page-photo', { page: pageKey, idx, 'c-idx': customIdx }, 'Replace')}
                  ${iconBtn('delete', `Remove image or sticker from ${pageLabel}`, 'delete-page-photo', { page: pageKey, idx, 'c-idx': customIdx }, 'Remove')}
                </div>
              </div>
            </div>`,
              )
              .join('') || '<p class="preview-card-copy">No images or stickers on this page — click + Sticker / Image to add one.</p>'
          }
        </div>
        ${
          noteStickers !== null
            ? `
        <div class="preview-refs-head" style="margin-top:0.75rem;">
          <span>Sidebar Note Box Sticker (${escapeHtml(pageLabel)})</span>
          ${
            noteStickers.length === 0
              ? iconBtn('add', `Add sidebar note sticker to ${pageLabel}`, 'add-page-photo', { page: noteKey, 'c-idx': customIdx }, 'Note Sticker')
              : ''
          }
        </div>
        <div class="preview-photo-grid">
          ${
            noteStickers
              .map(
                (ph, idx) => `
            <div class="preview-photo-card">
              <img class="preview-photo-thumb" src="${escapeAttr(ph.src)}" alt="" />
              <div class="preview-photo-meta">
                <span class="meta-pill">Note Sticker</span>
                <div class="action-cluster">
                  ${iconBtn('edit', `Replace note sticker on ${pageLabel}`, 'edit-page-photo', { page: noteKey, idx, 'c-idx': customIdx }, 'Replace')}
                  ${iconBtn('delete', `Remove note sticker from ${pageLabel}`, 'delete-page-photo', { page: noteKey, idx, 'c-idx': customIdx }, 'Remove')}
                </div>
              </div>
            </div>`,
              )
              .join('') || '<p class="preview-card-copy">Sidebar note sticker removed — click + Note Sticker to restore or add one.</p>'
          }
        </div>`
            : ''
        }
      </div>

      <div class="preview-media-col">
        <div class="preview-refs-head">
          <span>Extra Editorial Text (${escapeHtml(pageLabel)})</span>
          ${iconBtn('add', `Add text block to ${pageLabel}`, 'add-page-text', { page: pageKey }, 'Text')}
        </div>
        <div class="preview-text-list">
          ${
            texts
              .map(
                (tb, idx) => `
            <div class="preview-text-item">
              <div class="preview-card-top">
                <span class="meta-pill">${tb.style === 'pullquote' ? 'Pull Quote' : 'Editorial Column'}</span>
                <div class="action-cluster">
                  ${iconBtn('edit', `Edit text block on ${pageLabel}`, 'edit-page-text', { page: pageKey, idx })}
                  ${iconBtn('delete', `Delete text block on ${pageLabel}`, 'delete-page-text', { page: pageKey, idx })}
                </div>
              </div>
              ${tb.title ? `<strong>${escapeHtml(tb.title)}</strong>` : ''}
              <p class="preview-card-copy">${escapeHtml(tb.body)}</p>
            </div>`,
              )
              .join('') || '<p class="preview-card-copy">No extra columns added — click + Text to add a column or pull quote.</p>'
          }
        </div>
      </div>
    </div>`;
}

/* ==========================================================================
   Visual Website-Mirrored Rendering
   ========================================================================== */

function renderRefsBlock(
  refs: readonly MediaReference[] | undefined,
  ownerType: 'case' | 'campaign',
  ownerIdx: number,
): string {
  const items = refs ?? [];
  const rows = items
    .map(
      (r, rIdx) => `
      <div class="preview-ref-row">
        <a class="preview-ref-link" href="${escapeAttr(safeHref(r.url, '#'))}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(formatPlatformLabel(r.platform))}: ${escapeHtml(r.label)}${r.handle ? ` (${escapeHtml(r.handle)})` : ''} ↗
        </a>
        <div class="action-cluster">
          ${iconBtn('edit', `Edit reference ${r.label}`, 'edit-ref', { owner: ownerType, 'owner-idx': ownerIdx, 'ref-idx': rIdx })}
          ${iconBtn('delete', `Delete reference ${r.label}`, 'delete-ref', { owner: ownerType, 'owner-idx': ownerIdx, 'ref-idx': rIdx })}
        </div>
      </div>`,
    )
    .join('');

  return `
    <div class="preview-refs-box">
      <div class="preview-refs-head">
        <span>References (TikToks, Reels, Links)</span>
        ${iconBtn('add', 'Add TikTok or media reference', 'add-ref', { owner: ownerType, 'owner-idx': ownerIdx }, 'Ref')}
      </div>
      ${rows || '<p style="font-size:0.8rem;opacity:0.8;">No references attached yet.</p>'}
    </div>`;
}

function renderSectionHeaderHtml(options: {
  eyebrow: string;
  heading: string;
  subtitle: string;
  editAction: string;
  sectionKey: BuiltinSectionKey;
  extraControls?: string;
}): string {
  return `
    <div class="preview-section-bar">
      <div class="preview-section-header">
        ${options.eyebrow ? `<p class="eyebrow">${escapeHtml(options.eyebrow)}</p>` : ''}
        <h2 class="preview-section-title">${escapeHtml(options.heading)}</h2>
        ${options.subtitle ? `<p class="preview-section-subtitle">${escapeHtml(options.subtitle)}</p>` : ''}
      </div>
      <div class="action-cluster">
        ${options.extraControls ?? ''}
        ${iconBtn('edit', `Edit ${SECTION_LABELS[options.sectionKey]} header`, options.editAction)}
        ${iconBtn('delete', `Delete ${SECTION_LABELS[options.sectionKey]} section`, 'hide-section', { section: options.sectionKey })}
      </div>
    </div>`;
}

function renderVisualEditor(): void {
  const hiddenBar = document.getElementById('hidden-sections-bar');
  const root = document.getElementById('visual-site-editor');
  if (!root) return;

  if (hiddenBar) {
    if (state.hiddenSections.length === 0) {
      hiddenBar.hidden = true;
      hiddenBar.replaceChildren();
    } else {
      hiddenBar.hidden = false;
      hiddenBar.innerHTML = `
        <strong>Deleted / Hidden Sections:</strong>
        ${state.hiddenSections
          .map((sec) =>
            iconBtn('add', `Restore ${SECTION_LABELS[sec]}`, 'restore-section', { section: sec }, `Restore ${SECTION_LABELS[sec]}`),
          )
          .join('')}
      `;
    }
  }

  const hidden = new Set(state.hiddenSections);
  const c = state.siteContent;
  const blocks: string[] = [];

  // 1. Hero
  if (!hidden.has('hero')) {
    blocks.push(`
      <section class="preview-section tone-blush" data-admin-section="hero">
        <div class="preview-section-bar">
          <span class="eyebrow">Hero Showcase</span>
          <div class="action-cluster">
            ${iconBtn('edit', 'Edit hero title & subtitle', 'edit-hero')}
            ${iconBtn('delete', 'Delete Hero section', 'hide-section', { section: 'hero' })}
          </div>
        </div>
        <div class="preview-hero-box">
          <h2 class="preview-hero-title">${escapeHtml(c.brandTitle)}</h2>
          <p class="preview-hero-subtitle">${escapeHtml(c.brandSubtitle)}</p>
          <div class="preview-hero-actions">
            ${state.heroButtons
              .map(
                (btn, idx) => `
              <div class="editable-chip">
                <span class="btn btn-sm ${btn.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}">${escapeHtml(btn.label)}</span>
                ${iconBtn('edit', `Edit button ${btn.label}`, 'edit-hero-btn', { idx })}
                ${iconBtn('delete', `Delete button ${btn.label}`, 'delete-hero-btn', { idx })}
              </div>`,
              )
              .join('')}
            ${iconBtn('add', 'Add hero button', 'add-hero-btn', {}, 'Button')}
          </div>
        </div>
        ${renderPageMediaAndTextStrip('cover', 'Cover Page')}
      </section>`);
  }

  // 2. Metrics
  if (!hidden.has('metrics')) {
    blocks.push(`
      <section class="preview-section" data-admin-section="metrics">
        <div class="preview-section-bar">
          <span class="eyebrow">Page 01 · Impact Metrics Strip</span>
          <div class="action-cluster">
            ${iconBtn('add', 'Add metric', 'add-metric', {}, 'Metric')}
            ${iconBtn('delete', 'Delete Metrics section', 'hide-section', { section: 'metrics' })}
          </div>
        </div>
        <div class="preview-metrics-grid">
          ${state.metrics
            .map(
              (m, idx) => `
            <div class="preview-metric-card">
              <div class="preview-card-top">
                <span class="preview-metric-value">${escapeHtml(m.value)}</span>
                <div class="action-cluster">
                  ${iconBtn('edit', `Edit metric ${m.label}`, 'edit-metric', { idx })}
                  ${iconBtn('delete', `Delete metric ${m.label}`, 'delete-metric', { idx })}
                </div>
              </div>
              <p class="preview-card-copy">${escapeHtml(m.label)}</p>
            </div>`,
            )
            .join('')}
        </div>
        ${renderPageMediaAndTextStrip('metrics', 'Page 01: Impact & Pulse')}
      </section>`);
  }

  // 3. Ticker
  if (!hidden.has('ticker')) {
    blocks.push(`
      <section class="preview-section" data-admin-section="ticker">
        <div class="preview-section-bar">
          <span class="eyebrow">Capabilities Ticker</span>
          <div class="action-cluster">
            ${iconBtn('add', 'Add ticker item', 'add-ticker', {}, 'Ticker Item')}
            ${iconBtn('delete', 'Delete Ticker section', 'hide-section', { section: 'ticker' })}
          </div>
        </div>
        <div class="preview-ticker-band">
          ${state.tickerItems
            .map(
              (item, idx) => `
            <span class="preview-ticker-pill">
              <span>${escapeHtml(item)}</span>
              ${iconBtn('edit', `Edit ticker ${item}`, 'edit-ticker', { idx })}
              ${iconBtn('delete', `Delete ticker ${item}`, 'delete-ticker', { idx })}
            </span>`,
            )
            .join('')}
        </div>
      </section>`);
  }

  // 4. Case Studies
  if (!hidden.has('work')) {
    blocks.push(`
      <section class="preview-section tone-blush" data-admin-section="work">
        ${renderSectionHeaderHtml({
          eyebrow: c.workEyebrow || 'Cover Stories',
          heading: c.workHeading,
          subtitle: c.workSubtitle,
          editAction: 'edit-work-header',
          sectionKey: 'work',
          extraControls: iconBtn('add', 'Add case study', 'add-case', {}, 'Case Study'),
        })}
        <div class="preview-grid">
          ${state.caseStudies
            .map(
              (study, idx) => `
            <article class="preview-card">
              <div>
                <div class="preview-card-top">
                  <span class="meta-pill">${escapeHtml(study.channelLabel)} · ${escapeHtml(study.sector)}</span>
                  <div class="action-cluster">
                    ${iconBtn('edit', `Edit case study ${study.client}`, 'edit-case', { idx })}
                    ${iconBtn('delete', `Delete case study ${study.client}`, 'delete-case', { idx })}
                  </div>
                </div>
                <h3 class="preview-card-title" style="margin-block-start:0.65rem;">${escapeHtml(study.client)}</h3>
                <p class="preview-card-copy" style="margin-block-start:0.35rem;">${escapeHtml(study.summary)}</p>
                ${renderRefsBlock(study.references, 'case', idx)}
              </div>
              <div class="preview-metrics-line">
                <span>${escapeHtml(study.headlineMetric)}</span>
                <span>${escapeHtml(study.secondaryMetric)}</span>
              </div>
            </article>`,
            )
            .join('')}
        </div>
        ${renderPageMediaAndTextStrip('work', 'Ch. 02: Cover Stories I')}
        ${renderPageMediaAndTextStrip('work-2', 'Ch. 03: Cover Stories II')}
      </section>`);
  }

  // 5. Campaigns & Events
  if (!hidden.has('events')) {
    blocks.push(`
      <section class="preview-section" data-admin-section="events">
        ${renderSectionHeaderHtml({
          eyebrow: c.eventsEyebrow || 'On Now',
          heading: c.eventsHeading || 'Live Campaigns & Events.',
          subtitle: c.eventsSubtitle || '',
          editAction: 'edit-events-header',
          sectionKey: 'events',
          extraControls: iconBtn('add', 'Add campaign or event', 'add-campaign', {}, 'Campaign / Event'),
        })}
        <div class="preview-grid">
          ${state.campaigns
            .map(
              (camp, idx) => `
            <article class="preview-card">
              <div>
                <div class="preview-card-top">
                  <button type="button" class="meta-pill" data-action="toggle-campaign" data-idx="${idx}" style="cursor:pointer;">
                    ${escapeHtml(camp.kind)} · ${camp.isActive ? 'LIVE ✦' : 'DRAFT (Click to go live)'}
                  </button>
                  <div class="action-cluster">
                    ${iconBtn('edit', `Edit campaign ${camp.title}`, 'edit-campaign', { idx })}
                    ${iconBtn('delete', `Delete campaign ${camp.title}`, 'delete-campaign', { idx })}
                  </div>
                </div>
                <h3 class="preview-card-title" style="margin-block-start:0.65rem;">${escapeHtml(camp.title)}</h3>
                <p class="preview-card-copy" style="margin-block-start:0.2rem;">${escapeHtml(camp.dateLabel)} · ${escapeHtml(camp.location)}</p>
                <p class="preview-card-copy" style="margin-block-start:0.45rem;">${escapeHtml(camp.description)}</p>
                ${renderRefsBlock(camp.references, 'campaign', idx)}
              </div>
              <div>
                <span class="btn btn-sm btn-secondary">${escapeHtml(camp.ctaLabel)} (${escapeHtml(camp.ctaHref)})</span>
              </div>
            </article>`,
            )
            .join('')}
        </div>
        ${renderPageMediaAndTextStrip('events', 'Page 03: Live Campaigns')}
      </section>`);
  }

  // 6. Services / Capabilities
  if (!hidden.has('services')) {
    blocks.push(`
      <section class="preview-section" data-admin-section="services">
        ${renderSectionHeaderHtml({
          eyebrow: c.servicesEyebrow || 'Capabilities',
          heading: c.servicesHeading,
          subtitle: c.servicesSubtitle || '',
          editAction: 'edit-services-header',
          sectionKey: 'services',
          extraControls: iconBtn('add', 'Add capability card', 'add-service', {}, 'Service'),
        })}
        <div class="preview-grid">
          ${state.services
            .map(
              (srv, idx) => `
            <article class="preview-card">
              <div>
                <div class="preview-card-top">
                  <span class="meta-pill">${escapeHtml(srv.number)}</span>
                  <div class="action-cluster">
                    ${iconBtn('edit', `Edit service ${srv.title}`, 'edit-service', { idx })}
                    ${iconBtn('delete', `Delete service ${srv.title}`, 'delete-service', { idx })}
                  </div>
                </div>
                <h3 class="preview-card-title" style="margin-block-start:0.65rem;">${escapeHtml(srv.title)}</h3>
                <p class="preview-card-copy" style="margin-block-start:0.25rem;"><strong>${escapeHtml(srv.tagline)}</strong></p>
                <p class="preview-card-copy" style="margin-block-start:0.35rem;">${escapeHtml(srv.description)}</p>
              </div>
              <ul style="margin:0;padding-inline-start:1.1rem;font-size:0.85rem;font-weight:700;">
                ${srv.outcomes.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}
              </ul>
            </article>`,
            )
            .join('')}
        </div>
        ${renderPageMediaAndTextStrip('services', 'Ch. 05: Capabilities I')}
        ${renderPageMediaAndTextStrip('services-2', 'Ch. 06: Capabilities II')}
      </section>`);
  }

  // 7. Culture Lab & Quote
  if (!hidden.has('culture-lab')) {
    blocks.push(`
      <section class="preview-section tone-lilac" data-admin-section="culture-lab">
        ${renderSectionHeaderHtml({
          eyebrow: c.cultureEyebrow || 'Culture Lab',
          heading: c.cultureHeading || 'How we turn attention into icon status.',
          subtitle: c.cultureSubtitle || '',
          editAction: 'edit-culture-header',
          sectionKey: 'culture-lab',
          extraControls: iconBtn('add', 'Add process step', 'add-step', {}, 'Step'),
        })}
        <div class="preview-grid">
          ${state.processSteps
            .map(
              (step, idx) => `
            <article class="preview-card">
              <div class="preview-card-top">
                <span class="preview-metric-value">${escapeHtml(step.step)}</span>
                <div class="action-cluster">
                  ${iconBtn('edit', `Edit step ${step.title}`, 'edit-step', { idx })}
                  ${iconBtn('delete', `Delete step ${step.title}`, 'delete-step', { idx })}
                </div>
              </div>
              <h3 class="preview-card-title">${escapeHtml(step.title)}</h3>
              <p class="preview-card-copy">${escapeHtml(step.description)}</p>
            </article>`,
            )
            .join('')}
        </div>
        <div class="preview-quote-block">
          <div class="preview-card-top">
            <span class="eyebrow">Featured Client Quote</span>
            ${iconBtn('edit', 'Edit Culture Lab quote', 'edit-quote')}
          </div>
          <p class="preview-quote-text">${escapeHtml(c.cultureQuote)}</p>
          <p class="preview-card-copy">${escapeHtml(c.cultureQuoteAuthor)}</p>
        </div>
        ${renderPageMediaAndTextStrip('culture-lab', 'Page 05: Culture Lab')}
      </section>`);
  }

  // 8. FAQ
  if (!hidden.has('faq')) {
    blocks.push(`
      <section class="preview-section tone-blush" data-admin-section="faq">
        ${renderSectionHeaderHtml({
          eyebrow: c.faqEyebrow || 'FAQ',
          heading: c.faqHeading || 'Working with the studio.',
          subtitle: c.faqSubtitle || '',
          editAction: 'edit-faq-header',
          sectionKey: 'faq',
          extraControls: iconBtn('add', 'Add FAQ item', 'add-faq', {}, 'FAQ'),
        })}
        <div class="preview-faq-list">
          ${state.faqs
            .map(
              (faq, idx) => `
            <div class="preview-faq-item">
              <div class="preview-card-top">
                <strong>${escapeHtml(faq.question)}</strong>
                <div class="action-cluster">
                  ${iconBtn('edit', `Edit FAQ ${faq.question}`, 'edit-faq', { idx })}
                  ${iconBtn('delete', `Delete FAQ ${faq.question}`, 'delete-faq', { idx })}
                </div>
              </div>
              <p class="preview-card-copy">${escapeHtml(faq.answer)}</p>
            </div>`,
            )
            .join('')}
        </div>
        ${renderPageMediaAndTextStrip('faq', 'Ch. 08: Studio Q&A I')}
        ${renderPageMediaAndTextStrip('faq-2', 'Ch. 09: Studio Q&A II')}
      </section>`);
  }

  // 9. Custom Creative Sections
  state.customSections.forEach((sec, sIdx) => {
    blocks.push(`
      <section class="preview-section" data-admin-custom-section="${escapeAttr(sec.id)}">
        <div class="preview-section-bar">
          <div class="preview-section-header">
            ${sec.eyebrow ? `<p class="eyebrow">${escapeHtml(sec.eyebrow)}</p>` : ''}
            <h2 class="preview-section-title">${escapeHtml(sec.heading || 'Custom Section')}</h2>
            ${sec.subtitle ? `<p class="preview-section-subtitle">${escapeHtml(sec.subtitle)}</p>` : ''}
          </div>
          <div class="action-cluster">
            ${iconBtn('add', 'Add text block', 'add-custom-el', { 's-idx': sIdx, kind: 'text' }, 'Text')}
            ${iconBtn('add', 'Add button', 'add-custom-el', { 's-idx': sIdx, kind: 'button' }, 'Button')}
            ${iconBtn('add', 'Add TikTok or media reference', 'add-custom-el', { 's-idx': sIdx, kind: 'reference' }, 'TikTok / Ref')}
            ${iconBtn('edit', `Edit section ${sec.heading}`, 'edit-custom-section', { 's-idx': sIdx })}
            ${iconBtn('delete', `Delete entire section ${sec.heading}`, 'delete-custom-section', { 's-idx': sIdx })}
          </div>
        </div>
        <div class="preview-grid">
          ${sec.elements
            .map((el, eIdx) => {
              if (el.type === 'text') {
                return `
                  <article class="preview-card">
                    <div>
                      <div class="preview-card-top">
                        <span class="meta-pill">Text Block</span>
                        <div class="action-cluster">
                          ${iconBtn('edit', 'Edit text block', 'edit-custom-el', { 's-idx': sIdx, 'e-idx': eIdx })}
                          ${iconBtn('delete', 'Delete text block', 'delete-custom-el', { 's-idx': sIdx, 'e-idx': eIdx })}
                        </div>
                      </div>
                      ${el.title ? `<h3 class="preview-card-title" style="margin-block-start:0.65rem;">${escapeHtml(el.title)}</h3>` : ''}
                      <p class="preview-card-copy" style="margin-block-start:0.35rem;">${escapeHtml(el.body)}</p>
                    </div>
                  </article>`;
              }
              if (el.type === 'button') {
                return `
                  <article class="preview-card">
                    <div class="preview-card-top">
                      <span class="meta-pill">Button Element</span>
                      <div class="action-cluster">
                        ${iconBtn('edit', `Edit button ${el.label}`, 'edit-custom-el', { 's-idx': sIdx, 'e-idx': eIdx })}
                        ${iconBtn('delete', `Delete button ${el.label}`, 'delete-custom-el', { 's-idx': sIdx, 'e-idx': eIdx })}
                      </div>
                    </div>
                    <div>
                      <span class="btn btn-sm ${el.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}">${escapeHtml(el.label)}</span>
                      <p class="preview-card-copy" style="margin-block-start:0.4rem;">Link: ${escapeHtml(el.href)}</p>
                    </div>
                  </article>`;
              }
              return `
                <article class="preview-card">
                  <div>
                    <div class="preview-card-top">
                      <span class="eyebrow">${escapeHtml(formatPlatformLabel(el.platform))}</span>
                      <div class="action-cluster">
                        ${iconBtn('edit', `Edit reference ${el.title}`, 'edit-custom-el', { 's-idx': sIdx, 'e-idx': eIdx })}
                        ${iconBtn('delete', `Delete reference ${el.title}`, 'delete-custom-el', { 's-idx': sIdx, 'e-idx': eIdx })}
                      </div>
                    </div>
                    <h3 class="preview-card-title" style="margin-block-start:0.65rem;">${escapeHtml(el.title)}</h3>
                    ${el.handle ? `<p class="preview-card-copy">${escapeHtml(el.handle)}</p>` : ''}
                    ${el.caption ? `<p class="preview-card-copy" style="margin-block-start:0.35rem;">${escapeHtml(el.caption)}</p>` : ''}
                  </div>
                  <div>
                    <a class="btn btn-sm btn-secondary" href="${escapeAttr(safeHref(el.url, '#'))}" target="_blank" rel="noopener noreferrer">
                      Open ${escapeHtml(formatPlatformLabel(el.platform))} ↗
                    </a>
                  </div>
                </article>`;
            })
            .join('') || '<p class="preview-card-copy">No elements yet — click + Text, + Button, or + TikTok / Ref above.</p>'}
        </div>
        ${renderPageMediaAndTextStrip(`custom-${sec.id}`, sec.heading || 'Custom Page', sIdx)}
      </section>`);
  });

  // 10. Brief Section
  if (!hidden.has('brief')) {
    blocks.push(`
      <section class="preview-section tone-sky" data-admin-section="brief">
        ${renderSectionHeaderHtml({
          eyebrow: c.briefEyebrow || 'Start a Project',
          heading: c.briefHeading || 'Put your brand in the spotlight.',
          subtitle: c.briefSubtitle || '',
          editAction: 'edit-brief-header',
          sectionKey: 'brief',
        })}
        <div>
          <span class="btn btn-primary">${escapeHtml(c.briefSubmitLabel || 'Launch Your Brief')}</span>
        </div>
        ${renderPageMediaAndTextStrip('brief', 'Ch. 10: Start a Brief')}
        ${renderPageMediaAndTextStrip('directory', 'Ch. 11: Studio Directory')}
      </section>`);
  }

  root.innerHTML = blocks.join('');
}

/* ==========================================================================
   Action Dispatcher for Pencils, Bins, and Plusses
   ========================================================================== */

async function handleVisualEditorClick(target: HTMLElement): Promise<void> {
  const btn = target.closest<HTMLButtonElement>('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'add-page-photo' || action === 'edit-page-photo') {
    const pageKey = btn.dataset.page || '';
    const cIdx = Number(btn.dataset.cIdx || 0);
    if (!pageKey) return;
    const current = getEffectivePagePhotos(pageKey, cIdx);
    const idx = action === 'edit-page-photo' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? current[idx] : undefined;

    openPhotoEditorDialog(
      existing ? 'Replace Magazine Image / Sticker' : 'Add Magazine Image / Sticker',
      existing,
      async ({ src, caption }) => {
        const nextPhoto: MagazinePhoto = {
          id: existing?.id || `ph-${Date.now()}`,
          src,
          caption,
        };
        const nextList = pageKey.startsWith('note-')
          ? [nextPhoto]
          : idx >= 0
            ? current.map((p, i) => (i === idx ? nextPhoto : p))
            : [...current, nextPhoto];
        const nextMap = { ...state.pagePhotos, [pageKey]: nextList };
        await persistCmsPatch({ pagePhotos: nextMap }, 'Magazine image / sticker saved.');
      },
    );
    return;
  }

  if (action === 'delete-page-photo') {
    const pageKey = btn.dataset.page || '';
    const cIdx = Number(btn.dataset.cIdx || 0);
    const idx = Number(btn.dataset.idx);
    if (!pageKey || Number.isNaN(idx)) return;
    const current = getEffectivePagePhotos(pageKey, cIdx);
    const nextList = current.filter((_, i) => i !== idx);
    const nextMap = { ...state.pagePhotos, [pageKey]: nextList };
    await persistCmsPatch({ pagePhotos: nextMap }, 'Magazine image / sticker removed.');
    return;
  }

  if (action === 'add-page-text' || action === 'edit-page-text') {
    const pageKey = btn.dataset.page || '';
    if (!pageKey) return;
    const current = state.pageTextBlocks[pageKey] ?? [];
    const idx = action === 'edit-page-text' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? current[idx] : undefined;

    openEditorDialog(
      existing ? 'Edit Magazine Text Block' : 'Add Magazine Text Block',
      [
        {
          name: 'style',
          label: 'Editorial Style',
          type: 'select',
          value: existing?.style || 'article',
          options: [
            { value: 'article', label: 'Editorial Column' },
            { value: 'pullquote', label: 'Pull Quote' },
          ],
        },
        {
          name: 'title',
          label: 'Heading or Speaker Attribution (optional)',
          type: 'text',
          value: existing?.title || '',
          placeholder: 'e.g., Editor’s Note',
        },
        {
          name: 'body',
          label: 'Magazine Copy',
          type: 'textarea',
          value: existing?.body || '',
          required: true,
        },
      ],
      async (fd) => {
        const nextBlock: PageTextBlock = {
          id: existing?.id || `tb-${Date.now()}`,
          style: fd.get('style') === 'pullquote' ? 'pullquote' : 'article',
          title: String(fd.get('title') || '').trim(),
          body: String(fd.get('body') || '').trim(),
        };
        const nextList =
          idx >= 0 ? current.map((t, i) => (i === idx ? nextBlock : t)) : [...current, nextBlock];
        const nextMap = { ...state.pageTextBlocks, [pageKey]: nextList };
        await persistCmsPatch({ pageTextBlocks: nextMap }, 'Magazine text published.');
      },
    );
    return;
  }

  if (action === 'delete-page-text') {
    const pageKey = btn.dataset.page || '';
    const idx = Number(btn.dataset.idx);
    if (!pageKey || Number.isNaN(idx)) return;
    const current = state.pageTextBlocks[pageKey] ?? [];
    const nextList = current.filter((_, i) => i !== idx);
    const nextMap = { ...state.pageTextBlocks, [pageKey]: nextList };
    await persistCmsPatch({ pageTextBlocks: nextMap }, 'Magazine text deleted.');
    return;
  }

  if (action === 'hide-section') {
    const sec = btn.dataset.section as BuiltinSectionKey;
    if (!state.hiddenSections.includes(sec)) {
      await persistCmsPatch(
        { hiddenSections: [...state.hiddenSections, sec] },
        `${SECTION_LABELS[sec]} hidden from main site.`,
      );
    }
    return;
  }

  if (action === 'restore-section') {
    const sec = btn.dataset.section as BuiltinSectionKey;
    await persistCmsPatch(
      { hiddenSections: state.hiddenSections.filter((s) => s !== sec) },
      `${SECTION_LABELS[sec]} restored to main site.`,
    );
    return;
  }

  if (action === 'edit-hero') {
    openEditorDialog(
      'Edit Hero Copy',
      [
        { name: 'brandTitle', label: 'Hero Brand Title', type: 'text', value: state.siteContent.brandTitle, required: true },
        { name: 'brandSubtitle', label: 'Hero Subtitle', type: 'text', value: state.siteContent.brandSubtitle, required: true },
      ],
      async (fd) => {
        await persistCmsPatch(
          {
            siteContent: {
              ...state.siteContent,
              brandTitle: String(fd.get('brandTitle') || ''),
              brandSubtitle: String(fd.get('brandSubtitle') || ''),
            },
          },
          'Hero copy published.',
        );
      },
    );
    return;
  }

  if (action === 'add-hero-btn' || action === 'edit-hero-btn') {
    const idx = action === 'edit-hero-btn' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? state.heroButtons[idx] : undefined;
    openEditorDialog(
      existing ? 'Edit Hero Button' : 'Add Hero Button',
      [
        { name: 'label', label: 'Button Label', type: 'text', value: existing?.label ?? 'Book a Call', required: true },
        { name: 'href', label: 'Link Target (#section or https://...)', type: 'text', value: existing?.href ?? '#brief', required: true },
        {
          name: 'variant',
          label: 'Button Style',
          type: 'select',
          value: existing?.variant ?? 'secondary',
          options: [
            { value: 'primary', label: 'Primary (Rose)' },
            { value: 'secondary', label: 'Secondary (Blush)' },
          ],
        },
      ],
      async (fd) => {
        const nextBtn: HeroButton = {
          id: existing?.id ?? `hero-btn-${Date.now()}`,
          label: String(fd.get('label') || '').trim(),
          href: String(fd.get('href') || '#brief').trim(),
          variant: (fd.get('variant') as 'primary' | 'secondary') || 'secondary',
        };
        const nextButtons =
          idx >= 0
            ? state.heroButtons.map((b, i) => (i === idx ? nextBtn : b))
            : [...state.heroButtons, nextBtn];
        await persistCmsPatch({ heroButtons: nextButtons }, 'Hero buttons updated.');
      },
    );
    return;
  }

  if (action === 'delete-hero-btn') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch(
      { heroButtons: state.heroButtons.filter((_, i) => i !== idx) },
      'Hero button deleted.',
    );
    return;
  }

  if (action === 'add-metric' || action === 'edit-metric') {
    const idx = action === 'edit-metric' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? state.metrics[idx] : undefined;
    openEditorDialog(
      existing ? 'Edit Impact Metric' : 'Add Impact Metric',
      [
        { name: 'value', label: 'Metric Value (e.g. 480M+)', type: 'text', value: existing?.value ?? '100M+', required: true },
        { name: 'label', label: 'Metric Label', type: 'text', value: existing?.label ?? 'Creator Impressions', required: true },
      ],
      async (fd) => {
        const nextItem: MetricItem = {
          id: existing?.id ?? `metric-${Date.now()}`,
          value: String(fd.get('value') || '').trim(),
          label: String(fd.get('label') || '').trim(),
        };
        const nextMetrics =
          idx >= 0 ? state.metrics.map((m, i) => (i === idx ? nextItem : m)) : [...state.metrics, nextItem];
        await persistCmsPatch({ metrics: nextMetrics }, 'Impact metrics published.');
      },
    );
    return;
  }

  if (action === 'delete-metric') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch(
      { metrics: state.metrics.filter((_, i) => i !== idx) },
      'Metric deleted.',
    );
    return;
  }

  if (action === 'add-ticker' || action === 'edit-ticker') {
    const idx = action === 'edit-ticker' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? state.tickerItems[idx] : '';
    openEditorDialog(
      idx >= 0 ? 'Edit Ticker Item' : 'Add Ticker Item',
      [{ name: 'text', label: 'Ticker Label', type: 'text', value: existing || 'VIRAL TIKTOK CAMPAIGNS', required: true }],
      async (fd) => {
        const val = String(fd.get('text') || '').trim();
        const next = idx >= 0 ? state.tickerItems.map((t, i) => (i === idx ? val : t)) : [...state.tickerItems, val];
        await persistCmsPatch({ tickerItems: next }, 'Ticker updated.');
      },
    );
    return;
  }

  if (action === 'delete-ticker') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch(
      { tickerItems: state.tickerItems.filter((_, i) => i !== idx) },
      'Ticker item deleted.',
    );
    return;
  }

  if (action === 'edit-work-header' || action === 'edit-events-header' || action === 'edit-services-header' || action === 'edit-culture-header' || action === 'edit-faq-header' || action === 'edit-brief-header') {
    const map = {
      'edit-work-header': { title: 'Edit Work Section Header', eb: 'workEyebrow', hd: 'workHeading', sub: 'workSubtitle' },
      'edit-events-header': { title: 'Edit Campaigns Section Header', eb: 'eventsEyebrow', hd: 'eventsHeading', sub: 'eventsSubtitle' },
      'edit-services-header': { title: 'Edit Capabilities Header', eb: 'servicesEyebrow', hd: 'servicesHeading', sub: 'servicesSubtitle' },
      'edit-culture-header': { title: 'Edit Culture Lab Header', eb: 'cultureEyebrow', hd: 'cultureHeading', sub: 'cultureSubtitle' },
      'edit-faq-header': { title: 'Edit FAQ Header', eb: 'faqEyebrow', hd: 'faqHeading', sub: 'faqSubtitle' },
      'edit-brief-header': { title: 'Edit Brief Section', eb: 'briefEyebrow', hd: 'briefHeading', sub: 'briefSubtitle' },
    }[action];

    const fields: DialogField[] = [
      { name: 'eyebrow', label: 'Eyebrow Badge', type: 'text', value: String(state.siteContent[map.eb as keyof SiteContent] ?? '') },
      { name: 'heading', label: 'Section Heading', type: 'text', value: String(state.siteContent[map.hd as keyof SiteContent] ?? ''), required: true },
      { name: 'subtitle', label: 'Section Subtitle', type: 'textarea', value: String(state.siteContent[map.sub as keyof SiteContent] ?? '') },
    ];
    if (action === 'edit-brief-header') {
      fields.push({ name: 'submitLabel', label: 'Submit Button Label', type: 'text', value: state.siteContent.briefSubmitLabel ?? 'Launch Your Brief', required: true });
    }

    openEditorDialog(map.title, fields, async (fd) => {
      const nextSite: SiteContent = {
        ...state.siteContent,
        [map.eb]: String(fd.get('eyebrow') || ''),
        [map.hd]: String(fd.get('heading') || ''),
        [map.sub]: String(fd.get('subtitle') || ''),
      };
      if (action === 'edit-brief-header') {
        nextSite.briefSubmitLabel = String(fd.get('submitLabel') || 'Launch Your Brief');
      }
      await persistCmsPatch({ siteContent: nextSite }, 'Section header published.');
    });
    return;
  }

  if (action === 'add-case' || action === 'edit-case') {
    const idx = action === 'edit-case' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? state.caseStudies[idx] : undefined;
    openEditorDialog(
      existing ? `Edit Case Study: ${existing.client}` : 'Add Case Study',
      [
        { name: 'client', label: 'Client Name', type: 'text', value: existing?.client ?? 'New Brand Partner', required: true },
        { name: 'sector', label: 'Sector', type: 'text', value: existing?.sector ?? 'Beauty & Lifestyle', required: true },
        {
          name: 'channel',
          label: 'Channel Discipline',
          type: 'select',
          value: existing?.channel ?? 'short-form',
          options: [
            { value: 'short-form', label: 'TikTok & Reels' },
            { value: 'creators', label: 'Creator Ecosystems' },
            { value: 'paid-social', label: 'Paid Social & Launch' },
          ],
        },
        { name: 'headlineMetric', label: 'Headline Metric', type: 'text', value: existing?.headlineMetric ?? '12M Views', required: true },
        { name: 'secondaryMetric', label: 'Secondary Metric', type: 'text', value: existing?.secondaryMetric ?? '3.9x ROAS', required: true },
        { name: 'title', label: 'Editorial Title', type: 'text', value: existing?.title ?? 'Viral launch campaign', required: true },
        { name: 'summary', label: 'Card Summary', type: 'textarea', value: existing?.summary ?? '', required: true },
        { name: 'challenge', label: 'Challenge', type: 'textarea', value: existing?.challenge ?? '', required: true },
        { name: 'strategy', label: 'Strategy', type: 'textarea', value: existing?.strategy ?? '', required: true },
        { name: 'deliverables', label: 'Deliverables (comma-separated)', type: 'text', value: existing?.deliverables.join(', ') ?? 'Short-form series, Creator seeding' },
      ],
      async (fd) => {
        const channelLabels: Record<Exclude<ChannelFilter, 'all'>, string> = {
          'short-form': 'TikTok & Reels',
          creators: 'Creator Ecosystems',
          'paid-social': 'Paid Social & Launch',
        };
        const channel = (fd.get('channel') as Exclude<ChannelFilter, 'all'>) || 'short-form';
        const nextStudy: CaseStudy = {
          id: existing?.id ?? `case-${Date.now()}`,
          client: String(fd.get('client') || '').trim(),
          sector: String(fd.get('sector') || '').trim(),
          title: String(fd.get('title') || '').trim(),
          channel,
          channelLabel: channelLabels[channel],
          headlineMetric: String(fd.get('headlineMetric') || '').trim(),
          secondaryMetric: String(fd.get('secondaryMetric') || '').trim(),
          summary: String(fd.get('summary') || '').trim(),
          challenge: String(fd.get('challenge') || '').trim(),
          strategy: String(fd.get('strategy') || '').trim(),
          deliverables: String(fd.get('deliverables') || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          accentColor: existing?.accentColor ?? '#F4A6C1',
          references: existing?.references ?? [],
        };
        const nextList =
          idx >= 0 ? state.caseStudies.map((c, i) => (i === idx ? nextStudy : c)) : [nextStudy, ...state.caseStudies];
        await persistCmsPatch({ caseStudies: nextList }, 'Case studies published.');
      },
    );
    return;
  }

  if (action === 'delete-case') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch(
      { caseStudies: state.caseStudies.filter((_, i) => i !== idx) },
      'Case study deleted.',
    );
    return;
  }

  if (action === 'add-campaign' || action === 'edit-campaign') {
    const idx = action === 'edit-campaign' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? state.campaigns[idx] : undefined;
    openEditorDialog(
      existing ? `Edit ${existing.kind}` : 'Add Campaign / Event',
      [
        { name: 'title', label: 'Title', type: 'text', value: existing?.title ?? '', required: true },
        {
          name: 'kind',
          label: 'Type',
          type: 'select',
          value: existing?.kind ?? 'Campaign',
          options: [
            { value: 'Campaign', label: 'Campaign' },
            { value: 'Event', label: 'Event' },
            { value: 'Drop', label: 'Drop' },
          ],
        },
        { name: 'dateLabel', label: 'Date / Window', type: 'text', value: existing?.dateLabel ?? 'Dec 2026', required: true },
        { name: 'location', label: 'Location / Channel', type: 'text', value: existing?.location ?? 'NYC · TikTok', required: true },
        { name: 'description', label: 'Description', type: 'textarea', value: existing?.description ?? '', required: true },
        { name: 'ctaLabel', label: 'CTA Button Label', type: 'text', value: existing?.ctaLabel ?? 'Apply Now', required: true },
        { name: 'ctaHref', label: 'CTA Target Link', type: 'text', value: existing?.ctaHref ?? '#brief', required: true },
        { name: 'isActive', label: 'Live on Main Site', type: 'checkbox', value: existing ? existing.isActive : true },
      ],
      async (fd) => {
        const nextCamp: CampaignEvent = {
          id: existing?.id ?? `camp-${Date.now()}`,
          title: String(fd.get('title') || '').trim(),
          kind: (fd.get('kind') as CampaignKind) || 'Campaign',
          dateLabel: String(fd.get('dateLabel') || '').trim(),
          location: String(fd.get('location') || '').trim(),
          description: String(fd.get('description') || '').trim(),
          ctaLabel: String(fd.get('ctaLabel') || 'Apply Now').trim(),
          ctaHref: String(fd.get('ctaHref') || '#brief').trim(),
          isActive: fd.get('isActive') === 'on',
          references: existing?.references ?? [],
        };
        const nextList =
          idx >= 0 ? state.campaigns.map((c, i) => (i === idx ? nextCamp : c)) : [nextCamp, ...state.campaigns];
        await persistCmsPatch({ campaigns: nextList }, 'Campaigns updated.');
      },
    );
    return;
  }

  if (action === 'toggle-campaign') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch(
      { campaigns: state.campaigns.map((c, i) => (i === idx ? { ...c, isActive: !c.isActive } : c)) },
      'Campaign live status updated.',
    );
    return;
  }

  if (action === 'delete-campaign') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch(
      { campaigns: state.campaigns.filter((_, i) => i !== idx) },
      'Campaign deleted.',
    );
    return;
  }

  if (action === 'add-ref' || action === 'edit-ref') {
    const owner = btn.dataset.owner as 'case' | 'campaign';
    const ownerIdx = Number(btn.dataset.ownerIdx);
    const refIdx = action === 'edit-ref' ? Number(btn.dataset.refIdx) : -1;
    const refs =
      owner === 'case'
        ? state.caseStudies[ownerIdx]?.references ?? []
        : state.campaigns[ownerIdx]?.references ?? [];
    const existing = refIdx >= 0 ? refs[refIdx] : undefined;

    openEditorDialog(
      existing ? 'Edit Social / Media Reference' : 'Add TikTok / Social Reference',
      [
        {
          name: 'platform',
          label: 'Platform',
          type: 'select',
          value: existing?.platform ?? 'tiktok',
          options: [
            { value: 'tiktok', label: 'TikTok' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'link', label: 'Web Link' },
          ],
        },
        { name: 'label', label: 'Reference Title / Label', type: 'text', value: existing?.label ?? 'TikTok Spotlight Video', required: true },
        { name: 'handle', label: 'Creator / Brand Handle (optional)', type: 'text', value: existing?.handle ?? '', placeholder: '@creator' },
        { name: 'url', label: 'Reference URL (https://...)', type: 'url', value: existing?.url ?? 'https://www.tiktok.com/', required: true },
      ],
      async (fd) => {
        const nextRef: MediaReference = {
          id: existing?.id ?? `ref-${Date.now()}`,
          platform: (fd.get('platform') as MediaPlatform) || 'tiktok',
          label: String(fd.get('label') || '').trim(),
          handle: String(fd.get('handle') || '').trim() || undefined,
          url: String(fd.get('url') || '').trim(),
        };
        const nextRefs = refIdx >= 0 ? refs.map((r, i) => (i === refIdx ? nextRef : r)) : [...refs, nextRef];
        if (owner === 'case') {
          await persistCmsPatch(
            { caseStudies: state.caseStudies.map((c, i) => (i === ownerIdx ? { ...c, references: nextRefs } : c)) },
            'Reference saved to case study.',
          );
        } else {
          await persistCmsPatch(
            { campaigns: state.campaigns.map((c, i) => (i === ownerIdx ? { ...c, references: nextRefs } : c)) },
            'Reference saved to campaign.',
          );
        }
      },
    );
    return;
  }

  if (action === 'delete-ref') {
    const owner = btn.dataset.owner as 'case' | 'campaign';
    const ownerIdx = Number(btn.dataset.ownerIdx);
    const refIdx = Number(btn.dataset.refIdx);
    if (owner === 'case') {
      const refs = (state.caseStudies[ownerIdx]?.references ?? []).filter((_, i) => i !== refIdx);
      await persistCmsPatch(
        { caseStudies: state.caseStudies.map((c, i) => (i === ownerIdx ? { ...c, references: refs } : c)) },
        'Reference deleted.',
      );
    } else {
      const refs = (state.campaigns[ownerIdx]?.references ?? []).filter((_, i) => i !== refIdx);
      await persistCmsPatch(
        { campaigns: state.campaigns.map((c, i) => (i === ownerIdx ? { ...c, references: refs } : c)) },
        'Reference deleted.',
      );
    }
    return;
  }

  if (action === 'add-service' || action === 'edit-service') {
    const idx = action === 'edit-service' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? state.services[idx] : undefined;
    openEditorDialog(
      existing ? `Edit Capability: ${existing.title}` : 'Add Capability Card',
      [
        { name: 'number', label: 'Number Label', type: 'text', value: existing?.number ?? `0${state.services.length + 1}`, required: true },
        { name: 'title', label: 'Title', type: 'text', value: existing?.title ?? '', required: true },
        { name: 'tagline', label: 'Tagline', type: 'text', value: existing?.tagline ?? '', required: true },
        { name: 'description', label: 'Description', type: 'textarea', value: existing?.description ?? '', required: true },
        { name: 'outcomes', label: 'Outcomes (comma-separated)', type: 'text', value: existing?.outcomes.join(', ') ?? '' },
      ],
      async (fd) => {
        const nextSrv: ServicePillar = {
          id: existing?.id ?? `srv-${Date.now()}`,
          number: String(fd.get('number') || '').trim(),
          title: String(fd.get('title') || '').trim(),
          tagline: String(fd.get('tagline') || '').trim(),
          description: String(fd.get('description') || '').trim(),
          outcomes: String(fd.get('outcomes') || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        };
        const nextList =
          idx >= 0 ? state.services.map((s, i) => (i === idx ? nextSrv : s)) : [...state.services, nextSrv];
        await persistCmsPatch({ services: nextList }, 'Capabilities published.');
      },
    );
    return;
  }

  if (action === 'delete-service') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch(
      { services: state.services.filter((_, i) => i !== idx) },
      'Capability deleted.',
    );
    return;
  }

  if (action === 'add-step' || action === 'edit-step') {
    const idx = action === 'edit-step' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? state.processSteps[idx] : undefined;
    openEditorDialog(
      existing ? `Edit Step: ${existing.title}` : 'Add Process Step',
      [
        { name: 'step', label: 'Step Number', type: 'text', value: existing?.step ?? `0${state.processSteps.length + 1}`, required: true },
        { name: 'title', label: 'Step Title', type: 'text', value: existing?.title ?? '', required: true },
        { name: 'description', label: 'Description', type: 'textarea', value: existing?.description ?? '', required: true },
      ],
      async (fd) => {
        const nextStep: ProcessStep = {
          id: existing?.id ?? `proc-${Date.now()}`,
          step: String(fd.get('step') || '').trim(),
          title: String(fd.get('title') || '').trim(),
          description: String(fd.get('description') || '').trim(),
        };
        const nextList =
          idx >= 0 ? state.processSteps.map((s, i) => (i === idx ? nextStep : s)) : [...state.processSteps, nextStep];
        await persistCmsPatch({ processSteps: nextList }, 'Process steps published.');
      },
    );
    return;
  }

  if (action === 'delete-step') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch(
      { processSteps: state.processSteps.filter((_, i) => i !== idx) },
      'Process step deleted.',
    );
    return;
  }

  if (action === 'edit-quote') {
    openEditorDialog(
      'Edit Featured Quote',
      [
        { name: 'cultureQuote', label: 'Quote Text', type: 'textarea', value: state.siteContent.cultureQuote, required: true },
        { name: 'cultureQuoteAuthor', label: 'Attribution', type: 'text', value: state.siteContent.cultureQuoteAuthor, required: true },
      ],
      async (fd) => {
        await persistCmsPatch(
          {
            siteContent: {
              ...state.siteContent,
              cultureQuote: String(fd.get('cultureQuote') || ''),
              cultureQuoteAuthor: String(fd.get('cultureQuoteAuthor') || ''),
            },
          },
          'Featured quote published.',
        );
      },
    );
    return;
  }

  if (action === 'add-faq' || action === 'edit-faq') {
    const idx = action === 'edit-faq' ? Number(btn.dataset.idx) : -1;
    const existing = idx >= 0 ? state.faqs[idx] : undefined;
    openEditorDialog(
      existing ? 'Edit FAQ Item' : 'Add FAQ Item',
      [
        { name: 'question', label: 'Question', type: 'text', value: existing?.question ?? '', required: true },
        { name: 'answer', label: 'Answer', type: 'textarea', value: existing?.answer ?? '', required: true },
      ],
      async (fd) => {
        const nextFaq: FaqItem = {
          id: existing?.id ?? `faq-${Date.now()}`,
          question: String(fd.get('question') || '').trim(),
          answer: String(fd.get('answer') || '').trim(),
        };
        const nextList = idx >= 0 ? state.faqs.map((f, i) => (i === idx ? nextFaq : f)) : [...state.faqs, nextFaq];
        await persistCmsPatch({ faqs: nextList }, 'FAQ published.');
      },
    );
    return;
  }

  if (action === 'delete-faq') {
    const idx = Number(btn.dataset.idx);
    await persistCmsPatch({ faqs: state.faqs.filter((_, i) => i !== idx) }, 'FAQ item deleted.');
    return;
  }

  if (action === 'edit-custom-section') {
    const sIdx = Number(btn.dataset.sidx ?? btn.dataset.sIdx);
    const existing = state.customSections[sIdx];
    if (!existing) return;
    openEditorDialog(
      'Edit Custom Section Header',
      [
        { name: 'eyebrow', label: 'Eyebrow Badge', type: 'text', value: existing.eyebrow },
        { name: 'heading', label: 'Heading', type: 'text', value: existing.heading, required: true },
        { name: 'subtitle', label: 'Subtitle', type: 'textarea', value: existing.subtitle },
      ],
      async (fd) => {
        const updated = state.customSections.map((s, i) =>
          i === sIdx
            ? {
                ...s,
                eyebrow: String(fd.get('eyebrow') || '').trim(),
                heading: String(fd.get('heading') || '').trim(),
                subtitle: String(fd.get('subtitle') || '').trim(),
              }
            : s,
        );
        await persistCmsPatch({ customSections: updated }, 'Custom section updated.');
      },
    );
    return;
  }

  if (action === 'delete-custom-section') {
    const sIdx = Number(btn.dataset.sidx ?? btn.dataset.sIdx);
    await persistCmsPatch(
      { customSections: state.customSections.filter((_, i) => i !== sIdx) },
      'Custom section deleted.',
    );
    return;
  }

  if (action === 'add-custom-el' || action === 'edit-custom-el') {
    const sIdx = Number(btn.dataset.sidx ?? btn.dataset.sIdx);
    const eIdx = action === 'edit-custom-el' ? Number(btn.dataset.eidx ?? btn.dataset.eIdx) : -1;
    const sec = state.customSections[sIdx];
    if (!sec) return;
    const existing = eIdx >= 0 ? sec.elements[eIdx] : undefined;
    const kind = existing?.type ?? (btn.dataset.kind as CustomElement['type']) ?? 'text';

    if (kind === 'text') {
      const cur = existing?.type === 'text' ? existing : undefined;
      openEditorDialog(
        cur ? 'Edit Text Block' : 'Add Text Block',
        [
          { name: 'title', label: 'Card Heading (optional)', type: 'text', value: cur?.title ?? '' },
          { name: 'body', label: 'Body Text', type: 'textarea', value: cur?.body ?? '', required: true },
        ],
        async (fd) => {
          const nextEl: CustomElement = {
            id: cur?.id ?? `el-${Date.now()}`,
            type: 'text',
            title: String(fd.get('title') || '').trim(),
            body: String(fd.get('body') || '').trim(),
          };
          const elements = eIdx >= 0 ? sec.elements.map((e, i) => (i === eIdx ? nextEl : e)) : [...sec.elements, nextEl];
          await persistCmsPatch(
            { customSections: state.customSections.map((s, i) => (i === sIdx ? { ...s, elements } : s)) },
            'Text block published.',
          );
        },
      );
    } else if (kind === 'button') {
      const cur = existing?.type === 'button' ? existing : undefined;
      openEditorDialog(
        cur ? 'Edit Button' : 'Add Button',
        [
          { name: 'label', label: 'Button Label', type: 'text', value: cur?.label ?? 'Explore Drop', required: true },
          { name: 'href', label: 'Button URL or #Anchor', type: 'text', value: cur?.href ?? '#brief', required: true },
          {
            name: 'variant',
            label: 'Style',
            type: 'select',
            value: cur?.variant ?? 'primary',
            options: [
              { value: 'primary', label: 'Primary (Rose)' },
              { value: 'secondary', label: 'Secondary (Blush)' },
            ],
          },
        ],
        async (fd) => {
          const nextEl: CustomElement = {
            id: cur?.id ?? `el-${Date.now()}`,
            type: 'button',
            label: String(fd.get('label') || '').trim(),
            href: String(fd.get('href') || '#brief').trim(),
            variant: (fd.get('variant') as 'primary' | 'secondary') || 'primary',
          };
          const elements = eIdx >= 0 ? sec.elements.map((e, i) => (i === eIdx ? nextEl : e)) : [...sec.elements, nextEl];
          await persistCmsPatch(
            { customSections: state.customSections.map((s, i) => (i === sIdx ? { ...s, elements } : s)) },
            'Button published.',
          );
        },
      );
    } else {
      const cur = existing?.type === 'reference' ? existing : undefined;
      openEditorDialog(
        cur ? 'Edit TikTok / Social Reference' : 'Add TikTok / Social Reference',
        [
          {
            name: 'platform',
            label: 'Platform',
            type: 'select',
            value: cur?.platform ?? 'tiktok',
            options: [
              { value: 'tiktok', label: 'TikTok' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'youtube', label: 'YouTube' },
              { value: 'link', label: 'Web Link' },
            ],
          },
          { name: 'title', label: 'Reference Title', type: 'text', value: cur?.title ?? '', required: true },
          { name: 'handle', label: 'Handle / Creator (optional)', type: 'text', value: cur?.handle ?? '', placeholder: '@creator' },
          { name: 'url', label: 'Reference URL (https://...)', type: 'url', value: cur?.url ?? 'https://www.tiktok.com/', required: true },
          { name: 'caption', label: 'Caption / Context (optional)', type: 'textarea', value: cur?.caption ?? '' },
        ],
        async (fd) => {
          const nextEl: CustomElement = {
            id: cur?.id ?? `el-${Date.now()}`,
            type: 'reference',
            platform: (fd.get('platform') as MediaPlatform) || 'tiktok',
            title: String(fd.get('title') || '').trim(),
            handle: String(fd.get('handle') || '').trim(),
            url: String(fd.get('url') || '').trim(),
            caption: String(fd.get('caption') || '').trim(),
          };
          const elements = eIdx >= 0 ? sec.elements.map((e, i) => (i === eIdx ? nextEl : e)) : [...sec.elements, nextEl];
          await persistCmsPatch(
            { customSections: state.customSections.map((s, i) => (i === sIdx ? { ...s, elements } : s)) },
            'Reference published.',
          );
        },
      );
    }
    return;
  }

  if (action === 'delete-custom-el') {
    const sIdx = Number(btn.dataset.sidx ?? btn.dataset.sIdx);
    const eIdx = Number(btn.dataset.eidx ?? btn.dataset.eIdx);
    const sec = state.customSections[sIdx];
    if (!sec) return;
    await persistCmsPatch(
      {
        customSections: state.customSections.map((s, i) =>
          i === sIdx ? { ...s, elements: s.elements.filter((_, j) => j !== eIdx) } : s,
        ),
      },
      'Element deleted.',
    );
  }
}

/* ==========================================================================
   Clients & Inbox Rendering
   ========================================================================== */

function renderClients(): void {
  const list = document.getElementById('clients-list');
  const filter = (document.getElementById('client-filter') as HTMLSelectElement | null)?.value || 'all';
  if (!list) return;

  const filtered =
    filter === 'all' ? state.clients : state.clients.filter((c) => c.status === filter);

  if (filtered.length === 0) {
    list.innerHTML = '<p>No clients match this status filter.</p>';
    return;
  }

  list.replaceChildren(
    ...filtered.map((client) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.clientId = client.id;
      card.innerHTML = `
        <div class="item-card-head">
          <div>
            <h3>${escapeHtml(client.name)} (${escapeHtml(client.handle)})</h3>
            <p>${escapeHtml(client.email)} · ${escapeHtml(client.retainer)}</p>
          </div>
          <div class="inline-actions">
            <select data-client-status="${client.id}" class="select-pill" aria-label="Moderation status for ${escapeAttr(client.name)}">
              <option value="pending" ${client.status === 'pending' ? 'selected' : ''}>Pending Review</option>
              <option value="approved" ${client.status === 'approved' ? 'selected' : ''}>Approved</option>
              <option value="active" ${client.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="paused" ${client.status === 'paused' ? 'selected' : ''}>Paused</option>
              <option value="flagged" ${client.status === 'flagged' ? 'selected' : ''}>Flagged</option>
            </select>
            <button type="button" class="icon-action is-delete" data-delete-client="${client.id}" aria-label="Delete client ${escapeAttr(client.name)}" title="Delete client">${ICON_BIN}</button>
          </div>
        </div>
        <div class="field">
          <label>Moderation Notes</label>
          <textarea data-client-notes="${client.id}" rows="2">${escapeHtml(client.notes)}</textarea>
        </div>
        <div>
          <button type="button" class="btn btn-primary" data-save-client="${client.id}">Save Moderation Update</button>
        </div>
      `;
      return card;
    }),
  );
}

function renderInbox(): void {
  const list = document.getElementById('inbox-list');
  const badge = document.getElementById('inbox-badge');
  const filter = (document.getElementById('inbox-filter') as HTMLSelectElement | null)?.value || 'all';
  if (!list) return;

  const newCount = state.submissions.filter((s) => s.status === 'new').length;
  if (badge) badge.textContent = String(newCount);

  const filtered =
    filter === 'all' ? state.submissions : state.submissions.filter((s) => s.status === filter);

  if (filtered.length === 0) {
    list.innerHTML = '<p>No messages or applications in this view yet.</p>';
    return;
  }

  list.replaceChildren(
    ...filtered.map((sub) => {
      const createdMs = Date.parse(sub.createdAt);
      const daysLeft = Number.isNaN(createdMs)
        ? 30
        : Math.max(0, Math.ceil((createdMs + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)));
      const dateLabel = Number.isNaN(createdMs)
        ? ''
        : new Date(createdMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-head">
          <div>
            <h3>${escapeHtml(sub.fullName)} · ${escapeHtml(sub.brand)}</h3>
            <p>${escapeHtml(sub.email)} · Budget: ${escapeHtml(sub.budget)} · Channels: ${escapeHtml(sub.channels.join(', ') || 'General')}</p>
            <p style="font-size:0.8rem;opacity:0.85;">${dateLabel ? `Sent ${escapeHtml(dateLabel)} · ` : ''}${daysLeft}d left in 30-day archive</p>
          </div>
          <span class="meta-pill">${sub.status.toUpperCase()}</span>
        </div>
        <p>${escapeHtml(sub.notes)}</p>
        <div class="inline-actions">
          <select data-sub-status="${sub.id}" class="select-pill" aria-label="Status for ${escapeAttr(sub.fullName)}">
            <option value="new" ${sub.status === 'new' ? 'selected' : ''}>New</option>
            <option value="reviewed" ${sub.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
            <option value="approved" ${sub.status === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="archived" ${sub.status === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
          <button type="button" class="btn btn-primary" data-promote-sub="${sub.id}">Promote to Client</button>
          <button type="button" class="icon-action is-delete" data-delete-sub="${sub.id}" aria-label="Delete message from ${escapeAttr(sub.fullName)}" title="Delete message">${ICON_BIN}</button>
        </div>
      `;
      return card;
    }),
  );
}

async function loadWorkspaceData(): Promise<void> {
  const [cms, clientsRes, subsRes] = await Promise.all([
    apiJson<Partial<AdminCmsState>>('/api/cms?admin=1'),
    apiJson<{ clients: ClientRecord[] }>('/api/clients'),
    apiJson<{ submissions: SubmissionRecord[] }>('/api/submissions'),
  ]);

  Object.assign(state, {
    siteContent: cms.siteContent ?? state.siteContent,
    heroButtons: cms.heroButtons ?? state.heroButtons,
    metrics: cms.metrics ?? state.metrics,
    tickerItems: cms.tickerItems ?? state.tickerItems,
    caseStudies: cms.caseStudies ?? state.caseStudies,
    campaigns: cms.campaigns ?? state.campaigns,
    services: cms.services ?? state.services,
    processSteps: cms.processSteps ?? state.processSteps,
    faqs: cms.faqs ?? state.faqs,
    customSections: cms.customSections ?? state.customSections,
    hiddenSections: cms.hiddenSections ?? state.hiddenSections,
    pagePhotos: cms.pagePhotos ?? state.pagePhotos,
    pageTextBlocks: cms.pageTextBlocks ?? state.pageTextBlocks,
    clients: clientsRes.clients,
    submissions: subsRes.submissions,
  });

  renderVisualEditor();
  renderClients();
  renderInbox();
}

export async function initAdminApp(): Promise<void> {
  initInstallPrompt(document);
  registerAppServiceWorker();

  const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
  const passcodeError = document.getElementById('passcode-error');
  const logoutBtn = document.getElementById('logout-btn');
  const editorDialog = document.getElementById('editor-dialog') as HTMLDialogElement | null;
  const editorForm = document.getElementById('editor-dialog-form') as HTMLFormElement | null;

  // Editor dialog handlers
  editorDialog?.addEventListener('close', () => {
    editorDialog.returnValue = '';
  });
  document.getElementById('editor-dialog-cancel')?.addEventListener('click', closeEditorDialog);
  editorForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeDialogSubmit) return;
    const fd = new FormData(editorForm);
    await activeDialogSubmit(fd);
    closeEditorDialog();
  });

  if (editorDialog && typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    const isOutside = (e: PointerEvent) => {
      const r = editorDialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    editorDialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e);
    });
    editorDialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e)) editorDialog.close('dismiss');
      pressedOutside = false;
    });
  }

  // Tab switching
  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((b) => {
        b.setAttribute('aria-selected', String(b === btn));
      });
      document.querySelectorAll<HTMLElement>('.tab-panel').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== target;
      });
    });
  });

  // Check existing session
  try {
    const auth = await apiJson<{ authenticated: boolean }>('/api/auth');
    if (auth.authenticated) {
      setAuthenticatedUi(true);
      await loadWorkspaceData();
    } else {
      setAuthenticatedUi(false);
    }
  } catch {
    setAuthenticatedUi(false);
  }

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('studio-passcode') as HTMLInputElement;
    if (passcodeError) passcodeError.hidden = true;

    try {
      await apiJson('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: input.value }),
      });
      input.value = '';
      setAuthenticatedUi(true);
      await loadWorkspaceData();
      showToast('Studio unlocked.');
    } catch (err) {
      if (passcodeError) {
        passcodeError.textContent = err instanceof Error ? err.message : 'Authentication failed.';
        passcodeError.hidden = false;
      }
      input.focus();
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    await apiJson('/api/auth', { method: 'DELETE' }).catch(() => {});
    state.clients = [];
    state.submissions = [];
    const clientsList = document.getElementById('clients-list');
    const inboxList = document.getElementById('inbox-list');
    if (clientsList) clientsList.replaceChildren();
    if (inboxList) inboxList.replaceChildren();
    setAuthenticatedUi(false);
    showToast('Studio locked.');
  });

  // Add new custom section
  document.getElementById('add-custom-section-top')?.addEventListener('click', () => {
    openEditorDialog(
      'Add Custom Section',
      [
        { name: 'eyebrow', label: 'Eyebrow Badge', type: 'text', value: 'Featured Spotlight' },
        { name: 'heading', label: 'Section Heading', type: 'text', value: 'Viral TikToks & Cultural Moments.', required: true },
        { name: 'subtitle', label: 'Section Subtitle', type: 'textarea', value: 'Live cultural references, creator cutdowns, and custom calls to action.' },
      ],
      async (fd) => {
        const nextSection: CustomSection = {
          id: `sec-${Date.now()}`,
          eyebrow: String(fd.get('eyebrow') || '').trim(),
          heading: String(fd.get('heading') || '').trim(),
          subtitle: String(fd.get('subtitle') || '').trim(),
          elements: [],
        };
        await persistCmsPatch(
          { customSections: [...state.customSections, nextSection] },
          'New section added — use + Text, + Button, or + TikTok / Ref to populate it.',
        );
      },
    );
  });

  // Visual Editor delegation (pencils, bins, plusses)
  document.getElementById('visual-site-editor')?.addEventListener('click', (e) => {
    void handleVisualEditorClick(e.target as HTMLElement);
  });
  document.getElementById('hidden-sections-bar')?.addEventListener('click', (e) => {
    void handleVisualEditorClick(e.target as HTMLElement);
  });

  // Client tracking & moderation
  document.getElementById('client-filter')?.addEventListener('change', renderClients);

  document.getElementById('new-client-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const res = await apiJson<{ clients: ClientRecord[] }>('/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: fd.get('name'),
        handle: fd.get('handle'),
        email: fd.get('email'),
        retainer: fd.get('retainer'),
        notes: fd.get('notes'),
      }),
    });
    state.clients = res.clients;
    form.reset();
    renderClients();
    showToast('Client added to roster.');
  });

  document.getElementById('clients-list')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement | null;
    const saveBtn = target?.closest<HTMLButtonElement>('[data-save-client]');
    if (saveBtn) {
      const id = saveBtn.dataset.saveClient!;
      const status = document.querySelector<HTMLSelectElement>(`[data-client-status="${id}"]`)
        ?.value as ClientStatus;
      const notes =
        document.querySelector<HTMLTextAreaElement>(`[data-client-notes="${id}"]`)?.value ?? '';
      const res = await apiJson<{ clients: ClientRecord[] }>('/api/clients', {
        method: 'PATCH',
        body: JSON.stringify({ id, status, notes }),
      });
      state.clients = res.clients;
      renderClients();
      showToast('Client moderation saved.');
      return;
    }

    const delBtn = target?.closest<HTMLButtonElement>('[data-delete-client]');
    if (delBtn) {
      const id = delBtn.dataset.deleteClient!;
      const res = await apiJson<{ clients: ClientRecord[] }>('/api/clients', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      state.clients = res.clients;
      renderClients();
      showToast('Client removed.');
    }
  });

  // Inbox moderation & promote to client
  document.getElementById('inbox-filter')?.addEventListener('change', renderInbox);

  document.getElementById('inbox-list')?.addEventListener('change', async (e) => {
    const select = (e.target as HTMLElement | null)?.closest<HTMLSelectElement>('[data-sub-status]');
    if (!select) return;
    const res = await apiJson<{ submissions: SubmissionRecord[] }>('/api/submissions', {
      method: 'PATCH',
      body: JSON.stringify({
        id: select.dataset.subStatus,
        status: select.value as SubmissionStatus,
      }),
    });
    state.submissions = res.submissions;
    renderInbox();
    showToast('Submission status updated.');
  });

  document.getElementById('inbox-list')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement | null;
    const promoteBtn = target?.closest<HTMLButtonElement>('[data-promote-sub]');
    if (promoteBtn) {
      const sub = state.submissions.find((s) => s.id === promoteBtn.dataset.promoteSub);
      if (!sub) return;
      const [clientsRes, subsRes] = await Promise.all([
        apiJson<{ clients: ClientRecord[] }>('/api/clients', {
          method: 'POST',
          body: JSON.stringify({
            name: sub.fullName,
            handle: sub.brand,
            email: sub.email,
            retainer: sub.budget,
            status: 'approved',
            notes: sub.notes,
          }),
        }),
        apiJson<{ submissions: SubmissionRecord[] }>('/api/submissions', {
          method: 'PATCH',
          body: JSON.stringify({ id: sub.id, status: 'approved' }),
        }),
      ]);
      state.clients = clientsRes.clients;
      state.submissions = subsRes.submissions;
      renderClients();
      renderInbox();
      showToast('Promoted application to approved client.');
      return;
    }

    const delBtn = target?.closest<HTMLButtonElement>('[data-delete-sub]');
    if (delBtn) {
      const res = await apiJson<{ submissions: SubmissionRecord[] }>('/api/submissions', {
        method: 'DELETE',
        body: JSON.stringify({ id: delBtn.dataset.deleteSub }),
      });
      state.submissions = res.submissions;
      renderInbox();
      showToast('Message removed.');
    }
  });
}

if (typeof document !== 'undefined') {
  void initAdminApp();
}
