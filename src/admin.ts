import type {
  CampaignEvent,
  CampaignKind,
  CaseStudy,
  ChannelFilter,
  ClientRecord,
  ClientStatus,
  SiteContent,
  SubmissionRecord,
  SubmissionStatus,
} from './types/cms';

interface AdminState {
  siteContent: SiteContent | null;
  caseStudies: CaseStudy[];
  campaigns: CampaignEvent[];
  clients: ClientRecord[];
  submissions: SubmissionRecord[];
}

const state: AdminState = {
  siteContent: null,
  caseStudies: [],
  campaigns: [],
  clients: [],
  submissions: [],
};

function showToast(message: string): void {
  const el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => {
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

function setAuthenticatedUi(authenticated: boolean): void {
  const authGate = document.getElementById('auth-gate');
  const workspace = document.getElementById('admin-workspace');
  const logoutBtn = document.getElementById('logout-btn');
  if (authGate) authGate.hidden = authenticated;
  if (workspace) workspace.hidden = !authenticated;
  if (logoutBtn) logoutBtn.hidden = !authenticated;
}

function populateSiteContentForm(): void {
  const c = state.siteContent;
  if (!c) return;
  const setVal = (id: string, val: string) => {
    const input = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
    if (input) input.value = val;
  };
  setVal('cms-brand-title', c.brandTitle);
  setVal('cms-brand-subtitle', c.brandSubtitle);
  setVal('cms-primary-cta', c.primaryCtaLabel);
  setVal('cms-secondary-cta', c.secondaryCtaLabel);
  setVal('cms-work-heading', c.workHeading);
  setVal('cms-work-subtitle', c.workSubtitle);
  setVal('cms-services-heading', c.servicesHeading);
  setVal('cms-culture-quote', c.cultureQuote);
  setVal('cms-culture-author', c.cultureQuoteAuthor);
}

function renderCaseEditors(): void {
  const list = document.getElementById('case-editor-list');
  if (!list) return;

  list.replaceChildren(
    ...state.caseStudies.map((study, index) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.index = String(index);
      card.innerHTML = `
        <div class="item-card-head">
          <h3>Case Study ${index + 1}: ${study.client}</h3>
          <button type="button" class="btn btn-secondary" data-remove-case="${index}">Remove</button>
        </div>
        <div class="form-grid-2">
          <div class="field">
            <label>Client</label>
            <input type="text" data-case-field="client" value="${escapeAttr(study.client)}" />
          </div>
          <div class="field">
            <label>Sector</label>
            <input type="text" data-case-field="sector" value="${escapeAttr(study.sector)}" />
          </div>
          <div class="field">
            <label>Channel Discipline</label>
            <select data-case-field="channel" class="select-input">
              <option value="short-form" ${study.channel === 'short-form' ? 'selected' : ''}>TikTok &amp; Reels</option>
              <option value="creators" ${study.channel === 'creators' ? 'selected' : ''}>Creator Ecosystems</option>
              <option value="paid-social" ${study.channel === 'paid-social' ? 'selected' : ''}>Paid Social &amp; Launch</option>
            </select>
          </div>
          <div class="field">
            <label>Headline Metric</label>
            <input type="text" data-case-field="headlineMetric" value="${escapeAttr(study.headlineMetric)}" />
          </div>
          <div class="field">
            <label>Secondary Metric</label>
            <input type="text" data-case-field="secondaryMetric" value="${escapeAttr(study.secondaryMetric)}" />
          </div>
          <div class="field">
            <label>Editorial Title</label>
            <input type="text" data-case-field="title" value="${escapeAttr(study.title)}" />
          </div>
        </div>
        <div class="field">
          <label>Card Summary</label>
          <textarea data-case-field="summary" rows="2">${escapeHtml(study.summary)}</textarea>
        </div>
        <div class="field">
          <label>Challenge</label>
          <textarea data-case-field="challenge" rows="2">${escapeHtml(study.challenge)}</textarea>
        </div>
        <div class="field">
          <label>Strategy</label>
          <textarea data-case-field="strategy" rows="2">${escapeHtml(study.strategy)}</textarea>
        </div>
        <div class="field">
          <label>Deliverables (comma-separated)</label>
          <input type="text" data-case-field="deliverables" value="${escapeAttr(study.deliverables.join(', '))}" />
        </div>
      `;
      return card;
    }),
  );
}

function collectCaseStudiesFromDom(): CaseStudy[] {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('#case-editor-list .item-card'));
  const channelLabels: Record<Exclude<ChannelFilter, 'all'>, string> = {
    'short-form': 'TikTok & Reels',
    creators: 'Creator Ecosystems',
    'paid-social': 'Paid Social & Launch',
  };

  return cards.map((card, idx) => {
    const existing = state.caseStudies[idx];
    const getVal = (field: string) =>
      (card.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[data-case-field="${field}"]`,
      )?.value ?? '').trim();

    const channel = (getVal('channel') as Exclude<ChannelFilter, 'all'>) || 'short-form';
    const client = getVal('client') || 'New Client';
    return {
      id: existing?.id || `case-${Date.now()}-${idx}`,
      client,
      sector: getVal('sector') || 'Brand',
      title: getVal('title') || client,
      channel,
      channelLabel: channelLabels[channel],
      headlineMetric: getVal('headlineMetric') || '0M Views',
      secondaryMetric: getVal('secondaryMetric') || '0x ROAS',
      summary: getVal('summary'),
      challenge: getVal('challenge'),
      strategy: getVal('strategy'),
      deliverables: getVal('deliverables')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      accentColor: existing?.accentColor || '#F4A6C1',
    };
  });
}

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
            <button type="button" class="btn btn-secondary" data-delete-client="${client.id}">Delete</button>
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
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-head">
          <div>
            <h3>${escapeHtml(sub.fullName)} · ${escapeHtml(sub.brand)}</h3>
            <p>${escapeHtml(sub.email)} · Budget: ${escapeHtml(sub.budget)} · Channels: ${escapeHtml(sub.channels.join(', ') || 'General')}</p>
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
          <button type="button" class="btn btn-secondary" data-delete-sub="${sub.id}">Delete</button>
        </div>
      `;
      return card;
    }),
  );
}

function renderCampaignsAdmin(): void {
  const list = document.getElementById('campaigns-list');
  if (!list) return;

  if (state.campaigns.length === 0) {
    list.innerHTML = '<p>No campaigns or events created yet.</p>';
    return;
  }

  list.replaceChildren(
    ...state.campaigns.map((camp, idx) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-head">
          <div>
            <span class="meta-pill">${camp.kind} · ${camp.isActive ? 'LIVE ON SITE' : 'DRAFT'}</span>
            <h3 style="margin-block-start:0.4rem;">${escapeHtml(camp.title)}</h3>
            <p>${escapeHtml(camp.dateLabel)} · ${escapeHtml(camp.location)}</p>
          </div>
          <div class="inline-actions">
            <button type="button" class="btn btn-primary" data-toggle-camp="${idx}">
              ${camp.isActive ? 'Pause / Hide' : 'Go Live'}
            </button>
            <button type="button" class="btn btn-secondary" data-delete-camp="${idx}">Delete</button>
          </div>
        </div>
        <p>${escapeHtml(camp.description)}</p>
      `;
      return card;
    }),
  );
}

async function loadWorkspaceData(): Promise<void> {
  const [cms, clientsRes, subsRes] = await Promise.all([
    apiJson<{ siteContent: SiteContent; caseStudies: CaseStudy[]; campaigns: CampaignEvent[] }>(
      '/api/cms?admin=1',
    ),
    apiJson<{ clients: ClientRecord[] }>('/api/clients'),
    apiJson<{ submissions: SubmissionRecord[] }>('/api/submissions'),
  ]);

  state.siteContent = cms.siteContent;
  state.caseStudies = cms.caseStudies;
  state.campaigns = cms.campaigns;
  state.clients = clientsRes.clients;
  state.submissions = subsRes.submissions;

  populateSiteContentForm();
  renderCaseEditors();
  renderClients();
  renderInbox();
  renderCampaignsAdmin();
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replaceAll('"', '&quot;');
}

export async function initAdminApp(): Promise<void> {
  const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
  const passcodeError = document.getElementById('passcode-error');
  const logoutBtn = document.getElementById('logout-btn');

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
    setAuthenticatedUi(false);
    showToast('Studio locked.');
  });

  // Save site copy
  document.getElementById('site-content-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const siteContent: SiteContent = {
      brandTitle: String(fd.get('brandTitle') || ''),
      brandSubtitle: String(fd.get('brandSubtitle') || ''),
      primaryCtaLabel: String(fd.get('primaryCtaLabel') || ''),
      secondaryCtaLabel: String(fd.get('secondaryCtaLabel') || ''),
      workHeading: String(fd.get('workHeading') || ''),
      workSubtitle: String(fd.get('workSubtitle') || ''),
      servicesHeading: String(fd.get('servicesHeading') || ''),
      cultureQuote: String(fd.get('cultureQuote') || ''),
      cultureQuoteAuthor: String(fd.get('cultureQuoteAuthor') || ''),
    };
    const updated = await apiJson<{ siteContent: SiteContent }>('/api/cms', {
      method: 'PUT',
      body: JSON.stringify({ siteContent }),
    });
    state.siteContent = updated.siteContent;
    showToast('Live website copy updated.');
  });

  // Case study editor actions
  document.getElementById('add-case-btn')?.addEventListener('click', () => {
    state.caseStudies = collectCaseStudiesFromDom();
    state.caseStudies.push({
      id: `case-${Date.now()}`,
      client: 'New Brand Partner',
      sector: 'Fashion & Beauty',
      title: 'Viral launch campaign title',
      channel: 'short-form',
      channelLabel: 'TikTok & Reels',
      headlineMetric: '12M Views',
      secondaryMetric: '3.9x ROAS',
      summary: 'Short campaign summary displayed on the main website card.',
      challenge: 'Describe the client challenge.',
      strategy: 'Describe the creative strategy.',
      deliverables: ['Short-form series', 'Creator seeding'],
      accentColor: '#F4A6C1',
    });
    renderCaseEditors();
  });

  document.getElementById('case-editor-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-remove-case]');
    if (!btn) return;
    const idx = Number(btn.dataset.removeCase);
    state.caseStudies = collectCaseStudiesFromDom().filter((_, i) => i !== idx);
    renderCaseEditors();
  });

  document.getElementById('save-cases-btn')?.addEventListener('click', async () => {
    const caseStudies = collectCaseStudiesFromDom();
    const updated = await apiJson<{ caseStudies: CaseStudy[] }>('/api/cms', {
      method: 'PUT',
      body: JSON.stringify({ caseStudies }),
    });
    state.caseStudies = updated.caseStudies;
    renderCaseEditors();
    showToast('Case studies published to main website.');
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

  // Campaigns & Events
  document.getElementById('new-campaign-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const nextCampaign: CampaignEvent = {
      id: `camp-${Date.now()}`,
      title: String(fd.get('title') || ''),
      kind: (fd.get('kind') as CampaignKind) || 'Campaign',
      dateLabel: String(fd.get('dateLabel') || ''),
      location: String(fd.get('location') || ''),
      description: String(fd.get('description') || ''),
      ctaLabel: String(fd.get('ctaLabel') || 'Apply Now'),
      ctaHref: String(fd.get('ctaHref') || '#brief'),
      isActive: true,
    };

    const res = await apiJson<{ campaigns: CampaignEvent[] }>('/api/cms', {
      method: 'PUT',
      body: JSON.stringify({ campaigns: [nextCampaign, ...state.campaigns] }),
    });
    state.campaigns = res.campaigns;
    form.reset();
    renderCampaignsAdmin();
    showToast('Campaign/Event published live to main site.');
  });

  document.getElementById('campaigns-list')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement | null;
    const toggleBtn = target?.closest<HTMLButtonElement>('[data-toggle-camp]');
    if (toggleBtn) {
      const idx = Number(toggleBtn.dataset.toggleCamp);
      const updated = state.campaigns.map((c, i) =>
        i === idx ? { ...c, isActive: !c.isActive } : c,
      );
      const res = await apiJson<{ campaigns: CampaignEvent[] }>('/api/cms', {
        method: 'PUT',
        body: JSON.stringify({ campaigns: updated }),
      });
      state.campaigns = res.campaigns;
      renderCampaignsAdmin();
      showToast('Campaign visibility updated on main site.');
      return;
    }

    const delBtn = target?.closest<HTMLButtonElement>('[data-delete-camp]');
    if (delBtn) {
      const idx = Number(delBtn.dataset.deleteCamp);
      const updated = state.campaigns.filter((_, i) => i !== idx);
      const res = await apiJson<{ campaigns: CampaignEvent[] }>('/api/cms', {
        method: 'PUT',
        body: JSON.stringify({ campaigns: updated }),
      });
      state.campaigns = res.campaigns;
      renderCampaignsAdmin();
      showToast('Campaign deleted.');
    }
  });
}

if (typeof document !== 'undefined') {
  void initAdminApp();
}

