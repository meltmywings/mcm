import { FAQ_ITEMS } from '../data/agency';

export function initFaq(container: HTMLElement | null): void {
  if (!container) return;

  const nodes = FAQ_ITEMS.map((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'faq-item';

    const panelId = `${item.id}-panel`;
    wrapper.innerHTML = `
      <h3 class="faq-heading">
        <button
          type="button"
          class="faq-trigger"
          aria-expanded="false"
          aria-controls="${panelId}"
        >
          <span>${item.question}</span>
          <span class="faq-icon" aria-hidden="true">+</span>
        </button>
      </h3>
      <div id="${panelId}" class="faq-panel" hidden>
        <p>${item.answer}</p>
      </div>
    `;

    const button = wrapper.querySelector<HTMLButtonElement>('.faq-trigger');
    const panel = wrapper.querySelector<HTMLElement>(`#${panelId}`);

    button?.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isExpanded));
      if (panel) {
        panel.hidden = isExpanded;
      }
    });

    return wrapper;
  });

  container.replaceChildren(...nodes);
}

