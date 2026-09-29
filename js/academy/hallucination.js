// ─────────────────────────────────────────────────────────────
//  Hallucination Hunt: read the sources, then flag every sentence
//  in the AI's answer that the sources do NOT support.
//  (All companies and documents here are made up for the game.)
// ─────────────────────────────────────────────────────────────
import { el, svgIcon, ICONS } from './dom.js';

export const ROUNDS = [
  {
    title: 'Earnings check',
    question: 'Summarise Nimbus Robotics’ Q3 2025 results.',
    sources: [
      { name: 'Nimbus Robotics · 10-Q · Q3 2025', text: 'Revenue for the quarter ended September 30, 2025 was $412.6 million, up 18% year over year. Gross margin was 61.2%. During the quarter the company repurchased $50 million of its common stock.' },
    ],
    answer: [
      { t: 'Nimbus Robotics reported Q3 2025 revenue of $412.6 million.', ok: true },
      { t: 'That was a 28% increase on the same quarter last year.', ok: false, why: 'The filing says 18%, not 28%. One wrong digit is still a hallucination.', hint: 'Compare the growth percentage with the filing.' },
      { t: 'Gross margin came in at 61.2%.', ok: true },
      { t: 'The company also announced a new $200 million buyback programme.', ok: false, why: 'The filing only says $50 million of stock was repurchased. There is no new $200 million programme anywhere in the source.', hint: 'Look closely at what the filing says about buying back stock.' },
    ],
  },
  {
    title: 'The wrong quarter',
    question: 'What was Nimbus Robotics’ revenue in Q2 2025?',
    sources: [
      { name: 'Nimbus Robotics · 10-Q · Q2 2025', text: 'Revenue for the quarter ended June 30, 2025 was $371.4 million.' },
      { name: 'Nimbus Robotics · 10-Q · Q3 2025', text: 'Revenue for the quarter ended September 30, 2025 was $412.6 million.' },
    ],
    answer: [
      { t: 'Nimbus Robotics earned $412.6 million in Q2 2025.', ok: false, why: '$412.6M is the Q3 figure. The model grabbed the right kind of number from the wrong quarter, the exact bug I fixed in EdgarIQ with date-aware retrieval.', hint: 'Which filing does that number actually come from?' },
      { t: 'Revenue grew from Q2 to Q3 2025.', ok: true },
      { t: 'The Q2 figure comes from the report for the period ending June 30, 2025.', ok: true },
    ],
  },
  {
    title: 'Electricity bill',
    question: 'Explain my August electricity bill in simple words.',
    sources: [
      { name: 'Electricity bill · August 2025', text: 'Units consumed: 312. Billing month: August 2025. Due date: 18 Sep 2025. Payable within due date: Rs 18,450. A late payment surcharge applies after the due date.' },
    ],
    answer: [
      { t: 'You used 312 units of electricity in August 2025.', ok: true },
      { t: 'Your bill is Rs 18,450 if you pay by 18 September 2025.', ok: true },
      { t: 'Because you crossed 300 units, you lost your protected-customer discount.', ok: false, why: 'It might even be true, but nothing on this bill says it. A grounded answer only states what the sources support. Everything else is a guess wearing a confident voice.', hint: 'Is there anything on the bill about discounts?' },
      { t: 'If you pay after the due date, a late surcharge is added.', ok: true },
    ],
  },
  {
    title: 'Accessibility audit',
    question: 'What did the accessibility scan of the website find?',
    sources: [
      { name: 'axe-core scan report', text: '3 violations found. (1) image-alt: 2 images on /home have no alt text. (2) color-contrast: button text contrast is 3.1:1 (required 4.5:1). (3) label: the search input has no label.' },
    ],
    answer: [
      { t: 'The scan found three accessibility violations.', ok: true },
      { t: 'Two images on the home page are missing alt text.', ok: true },
      { t: 'Button text contrast is 3.1:1, below the 4.5:1 minimum.', ok: true },
      { t: 'The checkout page also fails keyboard navigation.', ok: false, why: 'The report never mentions a checkout page or keyboard testing. The model invented a fourth problem.', hint: 'Count the violations in the report, then count them in the answer.' },
      { t: 'Fixing these three issues will make the site fully WCAG compliant.', ok: false, why: 'An automated scan only catches part of WCAG. Claiming full compliance is an over-claim the source cannot back up.', hint: 'Does a scan report ever promise full compliance?' },
    ],
  },
  {
    title: 'Job match',
    question: 'What does this job post require?',
    sources: [
      { name: 'Job post · AI Engineer', text: 'Requirements: 3+ years of Python, hands-on experience building RAG systems, familiarity with Docker. Location: remote (EU time zones).' },
    ],
    answer: [
      { t: 'The role needs 3+ years of Python.', ok: true },
      { t: 'Hands-on RAG experience is required.', ok: true },
      { t: 'Kubernetes experience is mandatory.', ok: false, why: 'Only Docker is mentioned. Kubernetes sounds related, which is exactly why models slip it in.', hint: 'Which container tool does the post actually name?' },
      { t: 'The job is remote, aligned to EU time zones.', ok: true },
      { t: 'The salary range is $120k to $150k.', ok: false, why: 'The post says nothing about salary. Invented numbers are the most dangerous hallucinations.', hint: 'Find the salary in the post. Can you?' },
    ],
  },
];

export function mount(root, { onDone }) {
  let round = 0, score = 0, total = 0, hintsUsed = 0;

  function render() {
    const r = ROUNDS[round];
    const flagged = new Set();
    let checked = false;
    root.replaceChildren();

    const head = el('div', { class: 'ag-head' },
      el('span', { class: 'ag-chip' }, `Round ${round + 1} / ${ROUNDS.length}`),
      el('h3', { class: 'ag-title' }, r.title),
      el('span', { class: 'ag-chip ag-chip--score' }, `Score ${score} / ${total}`),
    );
    const q = el('div', { class: 'ag-question' }, el('span', {}, 'User asked'), el('p', {}, r.question));
    const sources = el('div', { class: 'hh-sources' },
      el('p', { class: 'ag-label' }, 'Sources the AI was given'),
      ...r.sources.map((s) => el('article', { class: 'hh-source' }, el('p', { class: 'hh-source__name' }, s.name), el('p', {}, s.text))),
    );
    const sentBtns = r.answer.map((s, i) => {
      const b = el('button', { class: 'hh-sent', type: 'button', 'aria-pressed': 'false' },
        el('span', { class: 'hh-sent__mark', 'aria-hidden': 'true' }),
        el('span', { class: 'hh-sent__t' }, s.t),
      );
      b.addEventListener('click', () => {
        if (checked) return;
        if (flagged.has(i)) flagged.delete(i); else flagged.add(i);
        b.classList.toggle('is-flagged', flagged.has(i));
        b.setAttribute('aria-pressed', String(flagged.has(i)));
      });
      return b;
    });
    const answer = el('div', { class: 'hh-answer' },
      el('p', { class: 'ag-label' }, 'AI answer · click every sentence the sources don’t support'),
      ...sentBtns,
    );
    const note = el('p', { class: 'ag-note', role: 'status' });
    const hintBtn = el('button', { class: 'ag-btn ag-btn--ghost', type: 'button' }, svgIcon(ICONS.bulb), 'Hint');
    const checkBtn = el('button', { class: 'ag-btn', type: 'button' }, svgIcon(ICONS.check), 'Check answer');
    const actions = el('div', { class: 'ag-actions' }, hintBtn, checkBtn);

    hintBtn.addEventListener('click', () => {
      const i = r.answer.findIndex((s, k) => !s.ok && !flagged.has(k) && !sentBtns[k].classList.contains('is-hinted'));
      if (i < 0) { note.textContent = 'You’ve found every made-up sentence you had a hint for. Check your answer!'; return; }
      hintsUsed++;
      sentBtns[i].classList.add('is-hinted');
      note.textContent = `Hint: ${r.answer[i].hint}`;
    });

    checkBtn.addEventListener('click', () => {
      if (checked) return;
      checked = true;
      let got = 0;
      r.answer.forEach((s, i) => {
        const f = flagged.has(i);
        const correct = f === !s.ok;
        if (correct) got++;
        const b = sentBtns[i];
        b.disabled = true;
        b.classList.add(correct ? (s.ok ? 'is-ok' : 'is-caught') : (s.ok ? 'is-false' : 'is-missed'));
        const verdict = !s.ok
          ? (f ? 'Caught it: not supported.' : 'Missed: this one is made up.')
          : (f ? 'Actually supported by the source.' : '');
        if (verdict || !s.ok) b.append(el('span', { class: 'hh-sent__why' }, [verdict, !s.ok ? ` ${s.why}` : ''].join('')));
      });
      score += got; total += r.answer.length;
      head.lastChild.textContent = `Score ${score} / ${total}`;
      const perfect = got === r.answer.length;
      note.textContent = perfect ? 'Perfect round. Every claim judged correctly.' : `${got} of ${r.answer.length} sentences judged correctly.`;
      hintBtn.remove();
      checkBtn.remove();
      const last = round === ROUNDS.length - 1;
      actions.append(el('button', { class: 'ag-btn', type: 'button', onclick: () => {
        if (last) onDone({ score, total, hintsUsed }); else { round++; render(); }
      } }, last ? 'See results' : 'Next round →'));
    });

    root.append(head, q, el('div', { class: 'hh-grid' }, sources, answer), note, actions);
  }
  render();
  return { destroy() {} };
}
