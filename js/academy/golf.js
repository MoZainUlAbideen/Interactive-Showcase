// ─────────────────────────────────────────────────────────────
//  Learning-Rate Golf: real gradient descent on a 1-D loss curve.
//  Pick a learning rate (and, on the last hole, momentum) and see
//  whether the ball settles in the lowest valley within the step budget.
// ─────────────────────────────────────────────────────────────
import { el } from './dom.js';

const gauss = (x, mu, s) => Math.exp(-((x - mu) ** 2) / s);

export const HOLES = [
  { name: 'The Bowl', tip: 'A nice smooth valley. Find a learning rate that gets there without wasting steps.',
    f: (x) => 0.5 * x * x, g: (x) => x, x0: -8, xs: 0, steps: 30, tol: 0.25, lr: [0.005, 30], start: 0.05, range: [-10, 10] },
  { name: 'The Cliff', tip: 'This valley is steep. A big step will fling the ball straight out.',
    f: (x) => 4 * x * x, g: (x) => 8 * x, x0: 5, xs: 0, steps: 30, tol: 0.25, lr: [0.005, 30], range: [-7, 7] },
  { name: 'The Plateau', tip: 'Almost flat. Tiny steps crawl forever here.',
    f: (x) => 0.05 * x * x, g: (x) => 0.1 * x, x0: 9, xs: 0, steps: 30, tol: 0.25, lr: [0.005, 30], range: [-10, 10] },
  { name: 'The Trap', tip: 'There’s a fake valley on the way down. Plain steps get stuck in it, so turn on momentum.',
    f: (x) => 0.05 * (x + 4) ** 2 - 1.2 * gauss(x, 4, 1.2),
    g: (x) => 0.1 * (x + 4) + 2 * (x - 4) * gauss(x, 4, 1.2),
    x0: 9, xs: -4, steps: 80, tol: 0.35, lr: [0.005, 1], momentum: true, range: [-10, 11] },
];

// one full training run, used by the game and by the tests
export function train(h, lr, beta = 0) {
  let x = h.x0, v = 0;
  const path = [x];
  for (let i = 1; i <= h.steps; i++) {
    v = beta * v - lr * h.g(x);
    x += v;
    path.push(x);
    if (!Number.isFinite(x) || Math.abs(x) > 60) return { result: 'diverged', path, steps: i };
    if (Math.abs(x - h.xs) < h.tol && Math.abs(v) < h.tol) return { result: 'holed', path, steps: i };
  }
  return { result: 'short', path, steps: h.steps };
}

const logScale = (t, [a, b]) => a * Math.pow(b / a, t);
const invLog = (v, [a, b]) => Math.log(v / a) / Math.log(b / a);

export function mount(root, { onDone }) {
  let hole = 0, cleared = 0, shots = 0;
  let raf = 0;
  let lr = HOLES[0].start;

  function render() {
    const h = HOLES[hole];
    let beta = 0;
    let animating = false;
    let path = [h.x0];
    let shown = 1;
    cancelAnimationFrame(raf);
    root.replaceChildren();
    lr = Math.min(Math.max(lr, h.lr[0]), h.lr[1]);

    const head = el('div', { class: 'ag-head' },
      el('span', { class: 'ag-chip' }, `Hole ${hole + 1} / ${HOLES.length}`),
      el('h3', { class: 'ag-title' }, h.name),
      el('span', { class: 'ag-chip ag-chip--score' }, `Holes cleared ${cleared}`),
    );
    const tip = el('div', { class: 'ag-question' }, el('span', {}, 'Caddie says'), el('p', {}, h.tip));
    const canvas = el('canvas', { class: 'lg-canvas', width: 900, height: 360, 'aria-label': 'Loss curve with the ball' });
    const ctx = canvas.getContext('2d');

    const lrOut = el('output', { class: 'lg-val' });
    const lrIn = el('input', { type: 'range', min: 0, max: 1000, value: Math.round(invLog(lr, h.lr) * 1000), 'aria-label': 'Learning rate' });
    const mOut = el('output', { class: 'lg-val' });
    const mIn = el('input', { type: 'range', min: 0, max: 95, value: 0, 'aria-label': 'Momentum' });
    const setLr = () => { lr = logScale(lrIn.value / 1000, h.lr); lrOut.textContent = lr < 0.1 ? lr.toFixed(3) : lr < 10 ? lr.toFixed(2) : lr.toFixed(1); };
    const setM = () => { beta = mIn.value / 100; mOut.textContent = beta.toFixed(2); };
    lrIn.addEventListener('input', setLr); mIn.addEventListener('input', setM);
    setLr(); setM();

    const stats = el('div', { class: 'lg-stats' });
    const note = el('p', { class: 'ag-note', role: 'status' });
    const trainBtn = el('button', { class: 'ag-btn', type: 'button' }, 'Train ▶');
    const actions = el('div', { class: 'ag-actions' }, trainBtn);

    // drawing
    const [x0r, x1r] = h.range;
    let ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i <= 400; i++) { const y = h.f(x0r + (x1r - x0r) * i / 400); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    const pad = (ymax - ymin) * 0.12;
    const W = canvas.width, H = canvas.height, M = 30;
    const sx = (x) => M + (x - x0r) / (x1r - x0r) * (W - 2 * M);
    const sy = (y) => H - M - (Math.min(y, ymax + pad) - (ymin - pad)) / (ymax - ymin + 2 * pad) * (H - 2 * M);
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#34d399';

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // grid
      ctx.strokeStyle = 'rgba(160,190,255,.08)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) { const x = M + i * (W - 2 * M) / 10; ctx.beginPath(); ctx.moveTo(x, M); ctx.lineTo(x, H - M); ctx.stroke(); }
      // fill under curve
      ctx.beginPath(); ctx.moveTo(sx(x0r), H - M);
      for (let i = 0; i <= 400; i++) { const x = x0r + (x1r - x0r) * i / 400; ctx.lineTo(sx(x), sy(h.f(x))); }
      ctx.lineTo(sx(x1r), H - M); ctx.closePath();
      const grad = ctx.createLinearGradient(0, M, 0, H);
      grad.addColorStop(0, 'rgba(52,211,153,.22)'); grad.addColorStop(1, 'rgba(52,211,153,0)');
      ctx.fillStyle = grad; ctx.fill();
      // curve
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) { const x = x0r + (x1r - x0r) * i / 400; const p = [sx(x), sy(h.f(x))]; i ? ctx.lineTo(...p) : ctx.moveTo(...p); }
      ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke();
      // hole + flag at the global minimum
      const hx = sx(h.xs), hy = sy(h.f(h.xs));
      ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.ellipse(hx, hy + 2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy - 46); ctx.stroke();
      ctx.fillStyle = '#ff4fa8'; ctx.beginPath(); ctx.moveTo(hx, hy - 46); ctx.lineTo(hx + 22, hy - 39); ctx.lineTo(hx, hy - 32); ctx.fill();
      // trail
      for (let i = 0; i < shown - 1; i++) {
        const a = path[i], b = path[i + 1];
        if (!Number.isFinite(b)) break;
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx(a), sy(h.f(a)) - 9); ctx.lineTo(sx(Math.max(x0r, Math.min(x1r, b))), sy(h.f(b)) - 9); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(sx(a), sy(h.f(a)) - 9, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      // ball
      const bx = path[shown - 1];
      if (Number.isFinite(bx) && bx >= x0r - 1 && bx <= x1r + 1) {
        ctx.fillStyle = '#fff'; ctx.shadowColor = accent; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(sx(Math.max(x0r, Math.min(x1r, bx))), sy(h.f(bx)) - 9, 9, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      const x = path[shown - 1];
      stats.replaceChildren(
        el('span', {}, 'Step ', el('b', {}, `${shown - 1} / ${h.steps}`)),
        el('span', {}, 'Position ', el('b', {}, Number.isFinite(x) && Math.abs(x) < 1e4 ? x.toFixed(2) : '∞')),
        el('span', {}, 'Loss ', el('b', {}, Number.isFinite(x) && Math.abs(x) < 1e4 ? h.f(x).toFixed(3) : '∞')),
      );
    }

    trainBtn.addEventListener('click', () => {
      if (animating) return;
      shots++;
      const run = train(h, lr, h.momentum ? beta : 0);
      path = run.path; shown = 1; animating = true;
      trainBtn.disabled = true; note.textContent = '';
      let last = 0;
      const stepMs = h.steps > 40 ? 45 : 90;
      const loop = (t) => {
        if (t - last > stepMs) { last = t; shown++; draw(); }
        if (shown < path.length) { raf = requestAnimationFrame(loop); return; }
        animating = false; trainBtn.disabled = false;
        if (run.result === 'holed') {
          cleared++;
          head.lastChild.textContent = `Holes cleared ${cleared}`;
          note.textContent = `In the hole in ${run.steps} steps with learning rate ${lrOut.textContent}${h.momentum ? ` and momentum ${mOut.textContent}` : ''}.`;
          trainBtn.remove();
          const lastHole = hole === HOLES.length - 1;
          actions.append(el('button', { class: 'ag-btn', type: 'button', onclick: () => {
            if (lastHole) onDone({ score: cleared, total: HOLES.length, attempts: shots }); else { hole++; render(); }
          } }, lastHole ? 'See results' : 'Next hole →'));
        } else if (run.result === 'diverged') {
          note.textContent = 'Diverged! Each step overshot further than the last. Lower the learning rate.';
        } else {
          const stuck = h.momentum && Math.abs(path[path.length - 1] - 3.55) < 1;
          note.textContent = stuck
            ? 'Stuck in the fake valley. Plain gradient descent can’t climb out. Give it momentum.'
            : 'Out of steps before reaching the hole. The steps are too small, so raise the learning rate.';
        }
      };
      raf = requestAnimationFrame(loop);
    });

    const controls = el('div', { class: 'lg-controls' },
      el('label', { class: 'lg-ctl' }, el('span', {}, 'Learning rate'), lrIn, lrOut),
      h.momentum
        ? el('label', { class: 'lg-ctl' }, el('span', {}, 'Momentum'), mIn, mOut)
        : el('p', { class: 'lg-lock' }, 'Momentum unlocks on the last hole'),
    );
    root.append(head, tip, el('div', { class: 'lg-stage' }, canvas, stats), controls, note, actions);
    draw();
  }
  render();
  return { destroy() { cancelAnimationFrame(raf); } };
}
