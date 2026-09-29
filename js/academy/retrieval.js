// ─────────────────────────────────────────────────────────────
//  Retrieval Relay: choose which document chunks the model gets to
//  read (max 3), then see what answer comes out.
//  Final round: an automatic retriever ranks by similarity and gets
//  fooled by a look-alike quarter, until you add a metadata filter.
//  (Companies and figures are made up; the WCAG facts are real.)
// ─────────────────────────────────────────────────────────────
import { el, svgIcon, ICONS } from './dom.js';

// role: 'answer' (contains the answer) · 'wrong' (look-alike that leads to a wrong answer)
//       'related' (on-topic, doesn't answer) · 'noise' (off-topic)
export const ROUNDS = [
  {
    title: 'Margin call',
    question: 'What was Nimbus Robotics’ gross margin in Q3 2025?',
    chunks: [
      { doc: '10-Q', tag: 'Q2 2025', text: 'Gross margin for the quarter ended June 30, 2025 was 58.9%.', role: 'wrong' },
      { doc: '10-Q', tag: 'Q3 2025', text: 'Revenue for the quarter was $412.6 million, up 18% year over year.', role: 'related' },
      { doc: 'Board', tag: '2025', text: 'The board of directors appointed two new independent members.', role: 'noise' },
      { doc: '10-Q', tag: 'Q3 2025', text: 'Gross margin for the quarter ended September 30, 2025 was 61.2%.', role: 'answer' },
      { doc: 'HR', tag: '2025', text: 'Employee headcount reached 1,240 across four offices.', role: 'noise' },
      { doc: '10-Q', tag: 'Q3 2025', text: 'Research and development spend was $88.1 million.', role: 'related' },
      { doc: 'Lease', tag: '2024', text: 'The company signed a 7-year lease for its Austin headquarters.', role: 'noise' },
    ],
    outcomes: {
      good: 'Nimbus Robotics’ gross margin in Q3 2025 was 61.2%.',
      wrong: 'Gross margin in Q3 2025 was 58.9%.',
      conflict: 'Gross margin was either 58.9% or 61.2%. The context disagrees with itself.',
      none: 'Gross margin was probably around 60%, in line with industry peers.',
    },
  },
  {
    title: 'Bill due date',
    question: 'When is my August electricity bill due?',
    chunks: [
      { doc: 'Bill', tag: 'Jul 2025', text: 'Billing month: July 2025. Due date: 19 Aug 2025.', role: 'wrong' },
      { doc: 'Notice', tag: 'NEPRA', text: 'Revised tariff schedule notified for the next fiscal year.', role: 'noise' },
      { doc: 'Bill', tag: 'Aug 2025', text: 'Units consumed: 312. Meter status: OK.', role: 'related' },
      { doc: 'Bill', tag: 'Aug 2025', text: 'Billing month: August 2025. Due date: 18 Sep 2025.', role: 'answer' },
      { doc: 'Guide', tag: 'Solar', text: 'Net-metering customers are credited for units exported to the grid.', role: 'noise' },
      { doc: 'Bill', tag: 'Aug 2025', text: 'Payable within due date: Rs 18,450.', role: 'related' },
      { doc: 'Help', tag: 'Support', text: 'For complaints, call the customer helpline or visit the sub-division office.', role: 'noise' },
    ],
    outcomes: {
      good: 'Your August 2025 bill is due on 18 September 2025.',
      wrong: 'Your bill is due on 19 August 2025.',
      conflict: 'It’s due on 19 August or 18 September. Two bills are mixed up in the context.',
      none: 'Bills are usually due around the middle of the following month.',
    },
  },
  {
    title: 'Contrast rules',
    question: 'What contrast ratio does normal body text need to meet WCAG level AA?',
    chunks: [
      { doc: 'WCAG 2.2', tag: 'SC 1.4.6 · AAA', text: 'Contrast (Enhanced): text has a contrast ratio of at least 7:1.', role: 'wrong' },
      { doc: 'WCAG 2.2', tag: 'SC 1.1.1 · A', text: 'Non-text content: images need a text alternative.', role: 'noise' },
      { doc: 'WCAG 2.2', tag: 'SC 1.4.3 · AA', text: 'Contrast (Minimum): text has a contrast ratio of at least 4.5:1, except large-scale text (3:1).', role: 'answer' },
      { doc: 'WCAG 2.2', tag: 'Definition', text: 'Large-scale text: at least 18 point, or 14 point bold.', role: 'related' },
      { doc: 'WCAG 2.2', tag: 'SC 2.1.1 · A', text: 'Keyboard: all functionality is operable through a keyboard.', role: 'noise' },
      { doc: 'WCAG 2.2', tag: 'SC 2.4.7 · AA', text: 'Focus visible: keyboard focus indicator is visible.', role: 'noise' },
    ],
    outcomes: {
      good: 'For level AA, normal text needs at least 4.5:1 (large text 3:1).',
      wrong: 'Body text needs a contrast ratio of at least 7:1.',
      conflict: 'It needs 4.5:1, or maybe 7:1. The context mixes AA and AAA rules.',
      none: 'A contrast ratio of about 3:1 is usually considered enough.',
    },
  },
  {
    title: 'The retriever’s blind spot',
    auto: true,
    question: 'What was Nimbus Robotics’ revenue in Q3 2025?',
    filterLabel: 'Only search filings where quarter = Q3 2025',
    filterTag: 'Q3 2025',
    chunks: [
      { doc: '10-Q', tag: 'Q2 2025', text: 'Revenue for the quarter was $371.4 million, a record for the company.', role: 'wrong', sim: 0.93 },
      { doc: '10-Q', tag: 'Q2 2025', text: 'Management expects next-quarter revenue growth to continue.', role: 'wrong', sim: 0.9 },
      { doc: '10-K', tag: 'FY 2024', text: 'Annual revenue for fiscal 2024 was $1.31 billion.', role: 'wrong', sim: 0.89 },
      { doc: '10-Q', tag: 'Q3 2025', text: 'Revenue for the quarter was $412.6 million, up 18% year over year.', role: 'answer', sim: 0.87 },
      { doc: '10-Q', tag: 'Q3 2025', text: 'Gross margin for the quarter was 61.2%.', role: 'related', sim: 0.74 },
      { doc: '10-Q', tag: 'Q3 2025', text: 'Research and development spend was $88.1 million.', role: 'related', sim: 0.66 },
      { doc: 'Board', tag: '2025', text: 'The board appointed two new independent members.', role: 'noise', sim: 0.31 },
    ],
    outcomes: {
      good: 'Q3 2025 revenue was $412.6 million, up 18% year over year.',
      wrong: 'Nimbus Robotics’ revenue was $371.4 million, a record for the company.',
      conflict: 'Revenue was $371.4 million or $412.6 million. The context mixes quarters.',
      none: 'I couldn’t find the Q3 2025 revenue in the documents provided.',
    },
  },
];

const K = 3;

// What the "model" says given the chunks in its context
export function judge(chunks) {
  const hasAnswer = chunks.some((c) => c.role === 'answer');
  const hasWrong = chunks.some((c) => c.role === 'wrong');
  if (hasAnswer && !hasWrong) return 'good';
  if (hasAnswer && hasWrong) return 'conflict';
  if (hasWrong) return 'wrong';
  return 'none';
}

const VERDICT = {
  good: ['Grounded', 'Every claim is backed by the context. That’s the goal.'],
  wrong: ['Confidently wrong', 'The model trusted a look-alike chunk. It sounds right, and it isn’t.'],
  conflict: ['Conflicted', 'Right and wrong chunks together. The model hedges, or worse, picks the wrong one.'],
  none: ['Made it up', 'Nothing useful in the context, so the model filled the gap with a guess.'],
};

export function mount(root, { onDone }) {
  let round = 0, firstTry = 0, attempts = 0;

  function render() {
    const r = ROUNDS[round];
    let tries = 0;
    let picked = [];
    let filterOn = false;
    root.replaceChildren();

    const head = el('div', { class: 'ag-head' },
      el('span', { class: 'ag-chip' }, `Round ${round + 1} / ${ROUNDS.length}`),
      el('h3', { class: 'ag-title' }, r.title),
      el('span', { class: 'ag-chip ag-chip--score' }, `First-try wins ${firstTry}`),
    );
    const q = el('div', { class: 'ag-question' }, el('span', {}, 'User asked'), el('p', {}, r.question));
    const slots = el('div', { class: 'rr-slots' });
    const ctx = el('div', { class: 'rr-context' },
      el('p', { class: 'ag-label' }, `Context window · ${K} chunks max`), slots);
    const out = el('div', { class: 'rr-out', role: 'status' });
    const note = el('p', { class: 'ag-note' });
    const actions = el('div', { class: 'ag-actions' });

    const drawSlots = () => {
      slots.replaceChildren(...Array.from({ length: K }, (_, i) => {
        const c = picked[i];
        return c
          ? el('div', { class: 'rr-slot is-full' }, el('span', { class: 'rr-tag' }, `${c.doc} · ${c.tag}`), el('p', {}, c.text))
          : el('div', { class: 'rr-slot' }, el('p', {}, 'empty'));
      }));
    };

    let library;
    if (!r.auto) {
      const cards = r.chunks.map((c) => {
        const b = el('button', { class: 'rr-card', type: 'button', 'aria-pressed': 'false' },
          el('span', { class: 'rr-tag' }, `${c.doc} · ${c.tag}`), el('p', {}, c.text));
        b.addEventListener('click', () => {
          const i = picked.indexOf(c);
          if (i >= 0) picked.splice(i, 1);
          else if (picked.length < K) picked.push(c);
          else { note.textContent = `The context window only fits ${K} chunks. Remove one first.`; return; }
          note.textContent = '';
          cards.forEach((cb, k) => { const on = picked.includes(r.chunks[k]); cb.classList.toggle('is-picked', on); cb.setAttribute('aria-pressed', String(on)); });
          drawSlots();
        });
        return b;
      });
      library = el('div', { class: 'rr-library' },
        el('p', { class: 'ag-label' }, 'Document store · click to add to the context'),
        el('div', { class: 'rr-cards' }, ...cards));
    } else {
      // automatic retriever: rank by similarity, optionally filter by metadata
      const list = el('ol', { class: 'rr-rank' });
      const toggle = el('input', { type: 'checkbox', id: 'rr-filter' });
      const drawRank = () => {
        const pool = r.chunks.filter((c) => !filterOn || c.tag === r.filterTag);
        const ranked = [...pool].sort((a, b) => b.sim - a.sim);
        picked = ranked.slice(0, K);
        list.replaceChildren(...ranked.map((c, i) => el('li', { class: `rr-rank__row${i < K ? ' is-top' : ''}` },
          el('span', { class: 'rr-tag' }, `${c.doc} · ${c.tag}`),
          el('span', { class: 'rr-rank__text' }, c.text),
          el('span', { class: 'rr-bar' }, el('span', { style: `width:${Math.round(c.sim * 100)}%` })),
          el('span', { class: 'rr-sim' }, c.sim.toFixed(2)),
        )));
        drawSlots();
      };
      toggle.addEventListener('change', () => { filterOn = toggle.checked; out.replaceChildren(); drawRank(); });
      library = el('div', { class: 'rr-library' },
        el('p', { class: 'ag-label' }, 'Retriever · ranks every chunk by similarity to the question, keeps the top 3'),
        el('label', { class: 'rr-filter', for: 'rr-filter' }, toggle, el('span', {}, r.filterLabel)),
        list);
      requestAnimationFrame(drawRank);
    }

    const send = el('button', { class: 'ag-btn', type: 'button' }, 'Send to model →');
    send.addEventListener('click', () => {
      if (!picked.length) { note.textContent = 'Give the model at least one chunk to read.'; return; }
      tries++; attempts++;
      const v = judge(picked);
      const [label, lesson] = VERDICT[v];
      out.replaceChildren(
        el('div', { class: `rr-verdict rr-verdict--${v}` }, el('strong', {}, label), el('span', {}, lesson)),
        el('div', { class: 'rr-bubble' }, el('span', { class: 'ag-label' }, 'Model says'), el('p', {}, r.outcomes[v])),
      );
      if (v === 'good') {
        if (tries === 1) firstTry++;
        head.lastChild.textContent = `First-try wins ${firstTry}`;
        note.textContent = r.auto
          ? 'Same model, same question. The only change was filtering by date. That one fix took EdgarIQ from 29% to 100% on its test set.'
          : 'Right chunks in, right answer out.';
        send.remove();
        const last = round === ROUNDS.length - 1;
        actions.append(el('button', { class: 'ag-btn', type: 'button', onclick: () => {
          if (last) onDone({ score: firstTry, total: ROUNDS.length, attempts }); else { round++; render(); }
        } }, last ? 'See results' : 'Next round →'));
      } else {
        note.textContent = r.auto
          ? (filterOn ? 'Hmm, look at what made the top 3.' : 'Similarity alone loves the Q2 filing: same words, wrong quarter. Try the filter.')
          : 'Swap some chunks and send again.';
      }
    });
    actions.append(send);
    drawSlots();
    root.append(head, q, el('div', { class: 'rr-grid' }, library, el('div', {}, ctx, out)), note, actions);
  }
  render();
  return { destroy() {} };
}
