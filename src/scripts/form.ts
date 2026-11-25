import { BUDGET_TIERS, CHANNEL_OPTIONS } from '../data/agency';

export interface BriefPayload {
  fullName: string;
  email: string;
  brand: string;
  budget: string;
  channels: string[];
  notes: string;
}

export function renderBriefChoices(root: ParentNode = document): void {
  const budgetContainer = root.querySelector<HTMLElement>('#budget-options');
  const channelContainer = root.querySelector<HTMLElement>('#channel-options');

  if (budgetContainer) {
    budgetContainer.replaceChildren(
      ...BUDGET_TIERS.map((tier, index) => {
        const label = document.createElement('label');
        label.className = 'choice-item';
        label.setAttribute('for', tier.id);

        const input = document.createElement('input');
        input.type = 'radio';
        input.id = tier.id;
        input.name = 'budget';
        input.value = tier.value;
        if (index === 0) input.checked = true;

        const span = document.createElement('span');
        span.textContent = tier.label;

        label.append(input, span);
        return label;
      }),
    );
  }

  if (channelContainer) {
    channelContainer.replaceChildren(
      ...CHANNEL_OPTIONS.map((channel, index) => {
        const label = document.createElement('label');
        label.className = 'choice-item';
        label.setAttribute('for', channel.id);

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = channel.id;
        input.name = 'channels';
        input.value = channel.value;
        if (index < 2) input.checked = true;

        const span = document.createElement('span');
        span.textContent = channel.label;

        label.append(input, span);
        return label;
      }),
    );
  }
}

export function linkErrorToDescribedBy(el: HTMLElement, shown: boolean): void {
  const errorId = el.dataset.error;
  if (!errorId) return;

  const ids = (el.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter((id) => id && id !== errorId);

  if (shown) {
    ids.push(errorId);
  }

  if (ids.length > 0) {
    el.setAttribute('aria-describedby', ids.join(' '));
  } else {
    el.removeAttribute('aria-describedby');
  }
}

function spokenText(node: HTMLElement): string {
  const copy = node.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  copy
    .querySelectorAll('[role="img"][aria-label]')
    .forEach((n) => n.replaceWith(`${n.getAttribute('aria-label')}: `));
  return (copy.textContent || '').replace(/\s+/g, ' ').trim();
}

function supportsUserInvalid(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  try {
    return CSS.supports('selector(:user-invalid)');
  } catch {
    return false;
  }
}

function matchesUserInvalid(el: Element): boolean {
  try {
    return el.matches(':user-invalid');
  } catch {
    return false;
  }
}

export function extractBriefPayload(form: HTMLFormElement): BriefPayload {
  const data = new FormData(form);
  return {
    fullName: String(data.get('fullName') || '').trim(),
    email: String(data.get('email') || '').trim(),
    brand: String(data.get('brand') || '').trim(),
    budget: String(data.get('budget') || '15k-25k'),
    channels: data.getAll('channels').map((item) => String(item)),
    notes: String(data.get('notes') || '').trim(),
  };
}

export interface BriefFormController {
  destroy: () => void;
}

export function initBriefForm(
  root: ParentNode = document,
  onSubmit?: (payload: BriefPayload) => void,
): BriefFormController | null {
  renderBriefChoices(root);

  const form = root.querySelector<HTMLFormElement>('#brief-form');
  const submitBtn = root.querySelector<HTMLButtonElement>('#brief-submit');
  const statusBox = root.querySelector<HTMLElement>('#brief-status');
  const statusCopy = root.querySelector<HTMLElement>('#brief-status-copy');
  const resetBtn = root.querySelector<HTMLButtonElement>('#brief-reset-btn');

  if (!form) return null;

  const doc = form.ownerDocument;
  const announcer = doc.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.classList.add('visually-hidden');
  doc.body.append(announcer);

  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  let announcedField: Element | undefined;

  const flagged = new WeakSet<Element>();
  const announced = new WeakSet<Element>();
  const dirtyState = new WeakMap<Element, { hasInteracted: boolean; hasBlurred: boolean }>();
  const nativeUserInvalid = supportsUserInvalid();

  const announceError = (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const errorEl = doc.getElementById(errorId);
    if (!errorEl) return;

    const labelEl = el.labels?.[0];
    const labelText = labelEl ? `${spokenText(labelEl)}: ` : '';
    clearTimeout(announceTimer);
    announcer.textContent = '';
    announcedField = el;

    announceTimer = setTimeout(() => {
      announcer.textContent = labelText + spokenText(errorEl);
    }, 500);
  };

  const syncAria = (el: Element | null, announce = false, forceCheck = false) => {
    if (!el || !el.matches?.('input, select, textarea')) return;
    const field = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    const isInvalid = nativeUserInvalid
      ? matchesUserInvalid(field) || (forceCheck && !field.validity.valid)
      : (() => {
          const state = dirtyState.get(field);
          if (forceCheck) return !field.validity.valid;
          if (!state || !state.hasBlurred || !state.hasInteracted) return false;
          return !field.validity.valid;
        })();

    if (!nativeUserInvalid && (forceCheck || (dirtyState.get(field)?.hasBlurred && dirtyState.get(field)?.hasInteracted))) {
      field.classList.toggle('user-invalid-fallback', isInvalid);
      field.classList.toggle('user-valid-fallback', !isInvalid);
    }

    if (isInvalid) {
      if (announce && !announced.has(field)) {
        announceError(field);
        announced.add(field);
      }
      field.setAttribute('aria-invalid', 'true');
      linkErrorToDescribedBy(field, true);
      flagged.add(field);
    } else if (flagged.has(field) || field.getAttribute('aria-invalid') !== 'true') {
      field.setAttribute('aria-invalid', 'false');
      linkErrorToDescribedBy(field, false);
      flagged.delete(field);
      announced.delete(field);
      if (announcedField === field) {
        clearTimeout(announceTimer);
        announcer.textContent = '';
      }
    }
  };

  form.querySelectorAll('input, select, textarea').forEach((el) => {
    el.setAttribute('aria-invalid', 'false');
    syncAria(el);
  });

  const onBlur = (e: Event) => {
    const target = e.target as Element;
    if (!target.matches?.('input, select, textarea')) return;
    const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
    state.hasBlurred = true;
    dirtyState.set(target, state);
    syncAria(target, true);
  };

  const onInput = (e: Event) => {
    const target = e.target as Element;
    if (!target.matches?.('input, select, textarea')) return;
    const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
    state.hasInteracted = true;
    dirtyState.set(target, state);
    if (target.hasAttribute('aria-invalid')) {
      syncAria(target);
    }
  };

  const onChange = (e: Event) => {
    const target = e.target as Element;
    if (!target.matches?.('input, select, textarea')) return;
    const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
    state.hasInteracted = true;
    dirtyState.set(target, state);
    syncAria(target, true);
  };

  const onInvalid = (e: Event) => {
    const target = e.target as Element;
    dirtyState.set(target, { hasInteracted: true, hasBlurred: true });
    announced.add(target);
    syncAria(target, false, true);
  };

  const onReset = () => {
    setTimeout(() => {
      form.querySelectorAll('input, select, textarea').forEach((el) => {
        dirtyState.delete(el);
        el.classList.remove('user-invalid-fallback', 'user-valid-fallback');
        flagged.delete(el);
        announced.delete(el);
        el.setAttribute('aria-invalid', 'false');
        linkErrorToDescribedBy(el as HTMLElement, false);
      });
    });
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    const controls = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input:not([type="radio"]):not([type="checkbox"]), select, textarea',
      ),
    );

    const invalidControls = controls.filter((control) => !control.validity.valid);

    if (invalidControls.length > 0) {
      invalidControls.forEach((control) => {
        dirtyState.set(control, { hasInteracted: true, hasBlurred: true });
        announced.add(control);
        syncAria(control, false, true);
      });
      invalidControls[0].focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    const payload = extractBriefPayload(form);
    onSubmit?.(payload);

    form.hidden = true;
    if (statusBox && statusCopy) {
      const channelText = payload.channels.length ? payload.channels.join(', ') : 'multi-channel';
      statusCopy.textContent = `Thanks, ${payload.fullName}. Our producers are reviewing the ${payload.brand} brief (${channelText}) and will reply to ${payload.email} within one business day.`;
      statusBox.hidden = false;
      statusBox.focus?.();
    }
    announcer.textContent = 'Campaign brief submitted successfully.';
  };

  const handleResetClick = () => {
    form.reset();
    form.hidden = false;
    if (statusBox) statusBox.hidden = true;
    if (submitBtn) submitBtn.disabled = false;
    form.querySelector<HTMLInputElement>('#full-name')?.focus();
  };

  form.addEventListener('blur', onBlur, true);
  form.addEventListener('input', onInput);
  form.addEventListener('change', onChange, true);
  form.addEventListener('invalid', onInvalid, true);
  form.addEventListener('reset', onReset, true);
  form.addEventListener('submit', handleSubmit);
  resetBtn?.addEventListener('click', handleResetClick);

  return {
    destroy: () => {
      clearTimeout(announceTimer);
      form.removeEventListener('blur', onBlur, true);
      form.removeEventListener('input', onInput);
      form.removeEventListener('change', onChange, true);
      form.removeEventListener('invalid', onInvalid, true);
      form.removeEventListener('reset', onReset, true);
      form.removeEventListener('submit', handleSubmit);
      resetBtn?.removeEventListener('click', handleResetClick);
      announcer.remove();
    },
  };
}

