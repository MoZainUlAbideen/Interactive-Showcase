// ─────────────────────────────────────────────────────────────
//  HTML overlay: HUD, "Press E" prompt, podium popups, goal banner.
// ─────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
}

const isExternal = (href) => /^https?:/.test(href);
function link(href, text, cls) {
  const a = el('a', { href, class: cls || '' }, text);
  if (isExternal(href)) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}

export class UI {
  constructor() {
    this.panelOpen = false;
    this.onClose = null;
    this.prompt = $('prompt');
    this.promptLabel = $('prompt-label');
    this.panel = $('panel');
    this.card = $('panel-card');
    this.boostNum = $('boost-num');
    this.boostArc = $('boost-arc');
    this.goalEl = $('goal');
    this.goalTimer = 0;
    this.panel.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) this.close(); });
    this.lastBoost = -1;
  }

  setPrompt(pod) {
    if (!pod) { this.prompt.hidden = true; this.promptPod = null; return; }
    if (this.promptPod === pod.id && !this.prompt.hidden) return;
    this.promptPod = pod.id;
    this.promptLabel.textContent = pod.label;
    this.prompt.style.setProperty('--accent', pod.color);
    this.prompt.hidden = false;
  }

  setBoost(v) {
    const r = Math.round(v);
    if (r === this.lastBoost) return;
    this.lastBoost = r;
    this.boostNum.textContent = r;
    this.boostArc.style.strokeDashoffset = String(283 * (1 - v / 100));
  }

  setScore(goals) {
    const n = $('score-goals');
    n.textContent = goals;
    n.classList.remove('is-bump');
    void n.offsetWidth;
    n.classList.add('is-bump');
  }

  setBallCam(on) { $('ballcam').classList.toggle('is-on', on); }

  goal(team) {
    this.goalEl.className = `goal goal--${team === 'orange' ? 'blue' : 'orange'}`;
    this.goalEl.hidden = false;
    void this.goalEl.offsetWidth; // restart animation
    this.goalEl.classList.add('is-show');
    clearTimeout(this.goalTimer);
    this.goalTimer = setTimeout(() => { this.goalEl.hidden = true; }, 2600);
  }

  open(pod) {
    const p = pod.panel;
    const body = $('panel-body');
    body.replaceChildren();
    this.card.style.setProperty('--accent', pod.color);
    $('panel-kicker').textContent = p.kicker || '';
    const title = $('panel-title');
    title.replaceChildren(p.href ? link(p.href, p.title, 'title-link') : p.title);
    if (p.href) title.firstChild.append(el('span', { class: 'arrow', 'aria-hidden': 'true' }, ' ↗'));

    if (p.subtitle) body.append(el('p', { class: 'subtitle' }, p.subtitle));
    if (p.tagline) body.append(el('p', { class: 'tagline' }, p.tagline));
    for (const t of p.paragraphs || []) body.append(el('p', {}, t));
    if (p.comingSoon) body.append(el('div', { class: 'soon' }, el('span', { class: 'soon__dot' }), 'Coming soon'));
    if (p.facts) {
      body.append(el('dl', { class: 'facts' }, p.facts.map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v)))));
    }
    if (p.experience) {
      body.append(el('ol', { class: 'timeline' }, p.experience.map((x) => el('li', {},
        el('div', { class: 'timeline__head' }, el('strong', {}, x.role), el('span', {}, x.when)),
        el('p', { class: 'timeline__org' }, x.org),
        el('ul', { class: 'bullets' }, x.points.map((b) => el('li', {}, b))),
      ))));
    }
    if (p.skills) {
      body.append(el('div', { class: 'skills' }, p.skills.map(([group, list]) => el('div', { class: 'skills__row' },
        el('p', { class: 'skills__group' }, group),
        el('ul', { class: 'chips' }, list.map((t) => el('li', {}, t))),
      ))));
    }
    if (p.items) {
      body.append(el('ol', { class: 'projects' }, p.items.map((it, i) => el('li', { class: 'project' },
        el('span', { class: 'project__num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
        el('div', { class: 'project__main' },
          el('h3', { class: 'project__title' }, link(it.href, it.title, 'title-link'), el('span', { class: 'arrow', 'aria-hidden': 'true' }, ' ↗')),
          el('p', { class: 'tagline' }, it.tagline),
          el('ul', { class: 'bullets' }, it.points.map((b) => el('li', {}, b))),
          el('div', { class: 'project__foot' },
            el('ul', { class: 'chips' }, it.tech.map((t) => el('li', {}, t))),
            el('div', { class: 'links links--small' }, it.links.map((l) => link(l.href, l.label, 'btn btn--small'))),
          ),
        ),
      ))));
    }
    if (p.certs) {
      body.append(el('ul', { class: 'certs' }, p.certs.map((c) => el('li', { class: 'cert' },
        el('div', { class: 'cert__medal', 'aria-hidden': 'true' }),
        el('div', {},
          link(c.href, c.title, 'cert__title'),
          el('p', { class: 'cert__meta' }, [c.issuer, c.date].filter(Boolean).join(' · ')),
        ),
        el('span', { class: 'cert__go', 'aria-hidden': 'true' }, '↗'),
      ))));
    }
    if (p.links?.length) {
      body.append(el('div', { class: 'links' }, p.links.map((l) => link(l.href, l.label, 'btn'))));
    }

    this.card.classList.toggle('panel__card--wide', !!(p.items || p.experience || p.skills));
    this.card.scrollTop = 0;
    this.panel.hidden = false;
    this.panelOpen = true;
    this.prompt.hidden = true;
    requestAnimationFrame(() => this.panel.classList.add('is-open'));
    this.card.focus();
  }

  close() {
    if (!this.panelOpen) return;
    this.panel.classList.remove('is-open');
    this.panelOpen = false;
    this.promptPod = null;
    setTimeout(() => { if (!this.panelOpen) this.panel.hidden = true; }, 180);
    this.onClose?.();
  }
}
