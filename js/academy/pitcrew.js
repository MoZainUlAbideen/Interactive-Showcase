// ─────────────────────────────────────────────────────────────
//  Agent Pit Crew: line up the tools so the agent can finish the job.
//  Running the pipeline is a real dependency check: each tool needs
//  certain inputs and produces outputs, so any valid order passes.
// ─────────────────────────────────────────────────────────────
import { el, svgIcon, ICONS } from './dom.js';

export const ARTIFACTS = {
  bill_photo: 'bill photo', question: 'question', bill_text: 'bill text', fields: 'bill fields',
  expected: 'expected amount', findings: 'findings', draft: 'draft answer', verified: 'verified answer',
  plan: 'search plan', chunks: 'filing excerpts', summary: 'summary of everything',
  url: 'website URL', pages: 'page snapshots', violations: 'rule violations', alt: 'alt-text issues',
  keys: 'keyboard issues', issues: 'merged issues', report: 'fix report', web: 'web results',
};

export const MISSIONS = [
  {
    title: 'Bill auditor',
    request: 'Here’s a photo of my electricity bill. Am I being overcharged?',
    start: ['bill_photo', 'question'],
    goal: 'verified',
    slots: 6,
    tools: [
      { id: 'guess', name: 'Guess Answer', needs: ['question'], gives: ['draft'], trap: 'Guess Answer wrote a reply without looking at the bill. Fast, confident, and ungrounded, so the pit crew rejects it.' },
      { id: 'extract', name: 'Extract Fields', needs: ['bill_text'], gives: ['fields'] },
      { id: 'critic', name: 'Critic Check', needs: ['draft', 'findings'], gives: ['verified'] },
      { id: 'ocr', name: 'Read Photo', needs: ['bill_photo'], gives: ['bill_text'] },
      { id: 'web', name: 'Web Search', needs: ['question'], gives: ['web'], extra: true },
      { id: 'write', name: 'Write Answer', needs: ['findings', 'question'], gives: ['draft'] },
      { id: 'calc', name: 'Calculate Slabs', needs: ['fields'], gives: ['expected'] },
      { id: 'compare', name: 'Compare & Flag', needs: ['fields', 'expected'], gives: ['findings'] },
    ],
    lesson: 'This is Rehnuma’s pipeline: read the photo, pull out the numbers, recompute the bill deterministically, then let the model explain, with a critic checking the explanation.',
  },
  {
    title: 'Filings researcher',
    request: 'How did Nimbus Robotics’ revenue change between Q2 and Q3 2025?',
    start: ['question'],
    goal: 'verified',
    slots: 5,
    tools: [
      { id: 'draft', name: 'Draft Answer', needs: ['chunks', 'question'], gives: ['draft'] },
      { id: 'ask', name: 'Ask Model Directly', needs: ['question'], gives: ['draft'], trap: 'Asking the model directly skips the filings entirely. It will happily invent revenue numbers.' },
      { id: 'plan', name: 'Plan Query', needs: ['question'], gives: ['plan'] },
      { id: 'sumall', name: 'Summarise All Filings', needs: ['question'], gives: ['summary'], extra: true },
      { id: 'numcheck', name: 'Check Numbers', needs: ['draft', 'chunks'], gives: ['verified'] },
      { id: 'retrieve', name: 'Retrieve Filings', needs: ['plan'], gives: ['chunks'] },
    ],
    lesson: 'This is EdgarIQ: plan which company and quarters to fetch, retrieve only those filings, draft, then verify every number against the source text.',
  },
  {
    title: 'Accessibility scanner',
    request: 'Audit my website for accessibility problems and tell me how to fix them.',
    start: ['url'],
    goal: 'report',
    slots: 6,
    tools: [
      { id: 'kb', name: 'Keyboard Walk', needs: ['pages'], gives: ['keys'] },
      { id: 'report', name: 'Write Fix Report', needs: ['issues'], gives: ['report'] },
      { id: 'pass', name: 'Mark All Passed', needs: ['url'], gives: ['report'], trap: 'Mark All Passed produced a report without checking anything. That’s not an audit, it’s a liability.' },
      { id: 'crawl', name: 'Crawl Pages', needs: ['url'], gives: ['pages'] },
      { id: 'axe', name: 'Run axe Rules', needs: ['pages'], gives: ['violations'] },
      { id: 'merge', name: 'Merge & Dedupe', needs: ['violations', 'alt', 'keys'], gives: ['issues'] },
      { id: 'vision', name: 'Vision Alt-Text Check', needs: ['pages'], gives: ['alt'] },
    ],
    lesson: 'This is Parity: crawl, run three different checkers (the order of those three doesn’t matter), merge their findings, then write the fixes.',
  },
];

// Pure simulation, so it can be tested: returns a step-by-step log
export function simulate(mission, pipeline) {
  const have = new Set(mission.start);
  const steps = [];
  for (const id of pipeline) {
    const t = mission.tools.find((x) => x.id === id);
    if (t.trap) { steps.push({ id, ok: false, msg: t.trap }); return { ok: false, steps }; }
    const missing = t.needs.filter((n) => !have.has(n));
    if (missing.length) {
      const producer = mission.tools.find((x) => !x.trap && missing.some((m) => x.gives.includes(m)));
      steps.push({ id, ok: false, msg: `${t.name} needs the ${missing.map((m) => ARTIFACTS[m]).join(' and ')}, but nothing has produced ${missing.length > 1 ? 'them' : 'it'} yet.${producer ? ` Try putting ${producer.name} earlier.` : ''}` });
      return { ok: false, steps };
    }
    t.gives.forEach((g) => have.add(g));
    steps.push({ id, ok: true, msg: `${t.name} → ${t.gives.map((g) => ARTIFACTS[g]).join(', ')}`, extra: !!t.extra });
  }
  if (!have.has(mission.goal)) {
    return { ok: false, steps, msg: `The pipeline finished, but never produced a ${ARTIFACTS[mission.goal]}. Something is missing at the end.` };
  }
  const extras = steps.filter((s) => s.extra).length;
  return { ok: true, steps, extras };
}

export function mount(root, { onDone }) {
  let m = 0, cleanRuns = 0, attempts = 0;
  let timer = 0;

  function render() {
    const mission = MISSIONS[m];
    let pipe = [];
    let running = false;
    let tries = 0;
    root.replaceChildren();

    const head = el('div', { class: 'ag-head' },
      el('span', { class: 'ag-chip' }, `Mission ${m + 1} / ${MISSIONS.length}`),
      el('h3', { class: 'ag-title' }, mission.title),
      el('span', { class: 'ag-chip ag-chip--score' }, `Clean runs ${cleanRuns}`),
    );
    const brief = el('div', { class: 'ag-question' }, el('span', {}, 'Request'), el('p', {}, mission.request),
      el('div', { class: 'pc-io' },
        el('span', {}, 'Starts with: ', ...mission.start.map((s) => el('b', { class: 'pc-art' }, ARTIFACTS[s]))),
        el('span', {}, 'Goal: ', el('b', { class: 'pc-art pc-art--goal' }, ARTIFACTS[mission.goal])),
      ));

    const lane = el('ol', { class: 'pc-lane' });
    const log = el('ol', { class: 'pc-log', 'aria-live': 'polite' });
    const note = el('p', { class: 'ag-note' });

    const toolById = (id) => mission.tools.find((t) => t.id === id);
    const drawLane = (states = []) => {
      lane.replaceChildren(...Array.from({ length: mission.slots }, (_, i) => {
        const id = pipe[i];
        if (!id) return el('li', { class: 'pc-slot' }, el('span', { class: 'pc-slot__n' }, i + 1));
        const t = toolById(id);
        const st = states[i] || '';
        const b = el('button', { class: `pc-slot is-full ${st}`, type: 'button', 'aria-label': `Remove ${t.name}` },
          el('span', { class: 'pc-slot__n' }, i + 1), el('span', {}, t.name));
        b.addEventListener('click', () => { if (running) return; pipe.splice(i, 1); log.replaceChildren(); drawLane(); });
        return el('li', {}, b);
      }));
    };

    const palette = el('div', { class: 'pc-tools' }, ...mission.tools.map((t) => {
      const b = el('button', { class: 'pc-tool', type: 'button' },
        el('strong', {}, t.name),
        el('span', { class: 'pc-tool__io' }, 'needs ', ...t.needs.map((n) => el('i', {}, ARTIFACTS[n]))),
        el('span', { class: 'pc-tool__io' }, 'gives ', ...t.gives.map((n) => el('i', { class: 'is-give' }, ARTIFACTS[n]))),
      );
      b.addEventListener('click', () => {
        if (running) return;
        if (pipe.length >= mission.slots) { note.textContent = 'The pit lane is full. Click a step to remove it.'; return; }
        pipe.push(t.id); note.textContent = ''; log.replaceChildren(); drawLane();
      });
      return b;
    }));

    const runBtn = el('button', { class: 'ag-btn', type: 'button' }, svgIcon(ICONS.flag), 'Run pipeline');
    const resetBtn = el('button', { class: 'ag-btn ag-btn--ghost', type: 'button' }, 'Clear');
    const actions = el('div', { class: 'ag-actions' }, resetBtn, runBtn);
    resetBtn.addEventListener('click', () => { if (!running) { pipe = []; log.replaceChildren(); note.textContent = ''; drawLane(); } });

    runBtn.addEventListener('click', () => {
      if (running) return;
      if (!pipe.length) { note.textContent = 'Add some tools to the pit lane first.'; return; }
      running = true; tries++; attempts++;
      const res = simulate(mission, pipe);
      const states = [];
      log.replaceChildren();
      let i = 0;
      const tick = () => {
        if (i < res.steps.length) {
          const s = res.steps[i];
          states[i] = s.ok ? 'is-ok' : 'is-bad';
          drawLane(states);
          log.append(el('li', { class: s.ok ? 'is-ok' : 'is-bad' }, s.msg));
          i++;
          timer = setTimeout(tick, 480);
          return;
        }
        running = false;
        if (res.ok) {
          if (tries === 1 && !res.extras) cleanRuns++;
          head.lastChild.textContent = `Clean runs ${cleanRuns}`;
          log.append(el('li', { class: 'is-win' }, `Pit stop complete: ${ARTIFACTS[mission.goal]} delivered in ${res.steps.length} steps.${res.extras ? ` (${res.extras} unnecessary stop${res.extras > 1 ? 's' : ''}, which work but cost time.)` : ''}`));
          note.textContent = mission.lesson;
          runBtn.remove(); resetBtn.remove();
          const last = m === MISSIONS.length - 1;
          actions.append(el('button', { class: 'ag-btn', type: 'button', onclick: () => {
            if (last) onDone({ score: cleanRuns, total: MISSIONS.length, attempts }); else { m++; render(); }
          } }, last ? 'See results' : 'Next mission →'));
        } else if (res.msg) {
          log.append(el('li', { class: 'is-bad' }, res.msg));
        }
      };
      tick();
    });

    drawLane();
    root.append(head, brief,
      el('div', { class: 'pc-grid' },
        el('div', {}, el('p', { class: 'ag-label' }, 'Tools · click to add to the pit lane'), palette),
        el('div', {}, el('p', { class: 'ag-label' }, 'Pit lane · runs left to right, click a step to remove it'), lane, log)),
      note, actions);
  }
  render();
  return { destroy() { clearTimeout(timer); } };
}
