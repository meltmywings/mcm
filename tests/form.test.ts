import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initBriefForm, type BriefPayload } from '../src/scripts/form';

function setupFormDom() {
  document.body.innerHTML = `
    <div id="brief-status" hidden>
      <h3 id="brief-status-heading">Campaign brief received.</h3>
      <p id="brief-status-copy"></p>
      <button type="button" id="brief-reset-btn">Send another brief</button>
    </div>
    <form id="brief-form" novalidate>
      <label for="full-name">Full name</label>
      <input id="full-name" name="fullName" type="text" required minlength="2" data-error="full-name-error" />
      <span id="full-name-error" class="error-msg">Enter your full name.</span>

      <label for="work-email">Work email</label>
      <span id="email-hint">Format: you@company.com</span>
      <input id="work-email" name="email" type="email" required aria-describedby="email-hint" data-error="email-error" />
      <span id="email-error" class="error-msg">Enter a valid work email.</span>

      <label for="brand-name">Brand</label>
      <input id="brand-name" name="brand" type="text" required data-error="brand-error" />
      <span id="brand-error" class="error-msg">Enter your brand.</span>

      <fieldset>
        <legend>Budget</legend>
        <div id="budget-options"></div>
      </fieldset>
      <fieldset>
        <legend>Channels</legend>
        <div id="channel-options"></div>
      </fieldset>

      <label for="project-notes">Campaign goals</label>
      <span id="notes-hint">Minimum 20 characters.</span>
      <textarea id="project-notes" name="notes" required minlength="20" aria-describedby="notes-hint" data-error="notes-error"></textarea>
      <span id="notes-error" class="error-msg">Tell us a bit more.</span>

      <button type="submit" id="brief-submit">Launch Your Brief</button>
    </form>
  `;
}

describe('Campaign brief form & accessible validation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('initializes fields with aria-invalid="false" and preserves existing aria-describedby hints', () => {
    setupFormDom();
    const ctrl = initBriefForm(document);

    const email = document.getElementById('work-email') as HTMLInputElement;
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(email.getAttribute('aria-describedby')).toBe('email-hint');

    ctrl?.destroy();
  });

  it('shows aria-invalid and links error message after interaction + blur, and clears on valid input', () => {
    setupFormDom();
    const ctrl = initBriefForm(document);

    const email = document.getElementById('work-email') as HTMLInputElement;

    // Blurring without typing should not prematurely mark invalid
    email.dispatchEvent(new FocusEvent('blur'));
    expect(email.getAttribute('aria-invalid')).toBe('false');

    // Typing an invalid email and blurring triggers aria-invalid + aria-describedby linking + polite announcement
    email.value = 'not-an-email';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    email.dispatchEvent(new FocusEvent('blur'));

    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('email-hint email-error');

    vi.advanceTimersByTime(550);
    const liveRegion = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(liveRegion.textContent).toContain('Work email');
    expect(liveRegion.textContent).toContain('Enter a valid work email.');

    // Fixing the email clears the error immediately on input
    email.value = 'alex@vespera.co';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(email.getAttribute('aria-describedby')).toBe('email-hint');
    expect(liveRegion.textContent).toBe('');

    ctrl?.destroy();
  });

  it('blocks invalid submit, focuses first invalid control, and submits complete brief cleanly', () => {
    setupFormDom();
    const submitted: BriefPayload[] = [];
    const ctrl = initBriefForm(document, (payload) => submitted.push(payload));

    const form = document.getElementById('brief-form') as HTMLFormElement;
    const fullName = document.getElementById('full-name') as HTMLInputElement;
    const email = document.getElementById('work-email') as HTMLInputElement;
    const brand = document.getElementById('brand-name') as HTMLInputElement;
    const notes = document.getElementById('project-notes') as HTMLTextAreaElement;
    const submitBtn = document.getElementById('brief-submit') as HTMLButtonElement;
    const statusBox = document.getElementById('brief-status') as HTMLElement;

    const focusSpy = vi.spyOn(fullName, 'focus');
    form.dispatchEvent(new SubmitEvent('submit', { cancelable: true }));

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(fullName.getAttribute('aria-invalid')).toBe('true');
    expect(submitted).toHaveLength(0);

    fullName.value = 'Jordan Reyes';
    email.value = 'jordan@kinetix.io';
    brand.value = '@kinetixaudio';
    notes.value = 'Launching our Q3 open-ear hardware across TikTok and run-club creator pods.';

    form.dispatchEvent(new SubmitEvent('submit', { cancelable: true }));

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      fullName: 'Jordan Reyes',
      email: 'jordan@kinetix.io',
      brand: '@kinetixaudio',
      budget: '15k-25k',
      channels: ['tiktok', 'instagram'],
    });
    expect(submitBtn.disabled).toBe(true);
    expect(form.hidden).toBe(true);
    expect(statusBox.hidden).toBe(false);

    // Clicking reset restores form
    document.getElementById('brief-reset-btn')?.click();
    expect(form.hidden).toBe(false);
    expect(submitBtn.disabled).toBe(false);
    expect(statusBox.hidden).toBe(true);

    ctrl?.destroy();
  });
});

