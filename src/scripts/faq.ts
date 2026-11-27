import { FAQ_ITEMS, type FaqItem } from '../data/agency';

function buildFaqNodes(items: readonly FaqItem[]): HTMLElement[] {
  return items.map((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'faq-item';

    const panelId = `${item.id}-panel`;

    const heading = document.createElement('h3');
    heading.className = 'faq-heading';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'faq-trigger';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panelId);

    const qSpan = document.createElement('span');
    qSpan.textContent = item.question;

    const icon = document.createElement('span');
    icon.className = 'faq-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '+';

    button.append(qSpan, icon);
    heading.append(button);

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'faq-panel';
    panel.hidden = true;

    const answerP = document.createElement('p');
    answerP.textContent = item.answer;
    panel.append(answerP);

    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isExpanded));
      panel.hidden = isExpanded;
      button.dispatchEvent(new CustomEvent('mcm:content-updated', { bubbles: true }));
    });

    wrapper.append(heading, panel);
    return wrapper;
  });
}

export function initFaq(
  container: HTMLElement | null,
  items: readonly FaqItem[] = FAQ_ITEMS,
  container2?: HTMLElement | null,
): void {
  if (!container) return;

  if (container2) {
    container.replaceChildren(...buildFaqNodes(items.slice(0, 2)));
    container2.replaceChildren(...buildFaqNodes(items.slice(2)));
    return;
  }

  container.replaceChildren(...buildFaqNodes(items));
}
