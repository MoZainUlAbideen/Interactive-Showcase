// ─────────────────────────────────────────────────────────────
//  Stadium screens above each end.
//  Main screen (the end you face at kick-off): types "Welcome to My World !!!"
//  next to the retro portrait. Small screen (the other end): cycles tips.
//  Both are canvases redrawn only when a new character appears.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { FIELD } from './arena.js';

const PIXEL = '"Press Start 2P", "Orbitron", monospace';

export const MAIN_LINES = {
  title: 'Welcome to My World !!!',
  sub: 'Muhammad Zain-ul-Abideen · AI Full Stack Engineer',
};

export const TIPS = [
  'Think you can beat my AI puzzles? Head to My Academy in the dugout.',
  'See what production AI looks like on the Projects podium.',
  'My full-stack toolkit lives on the Stack podium.',
  'Curious how this arena began? Find the Vision podium.',
  'Press E at any glowing podium to open it.',
  'Off the clock? Visit Life Uncoded.',
  'Line it up, hit boost, and put one in the net.',
];

function makeScreen(scene, { w, h, px, x, y, z, rotY, color }) {
  const canvas = document.createElement('canvas');
  canvas.width = px; canvas.height = Math.round(px * h / w);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0d1124, roughness: 0.5, metalness: 0.6 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, h + 1.2, 0.8), frameMat);
  frame.position.z = -0.45;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.18, 0.9), new THREE.MeshBasicMaterial({ color }));
  trim.position.set(0, -(h / 2 + 0.65), -0.4);
  const trimTop = trim.clone(); trimTop.position.y = h / 2 + 0.65;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: 0xe6e6e6, toneMapped: false }));
  // legs down to the top of the stand
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a3150, roughness: 0.6, metalness: 0.5 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, y, 0.8), legMat);
    leg.position.set(s * w * 0.32, -y / 2, -0.9);
    g.add(leg);
  }
  g.add(frame, trim, trimTop, panel);
  scene.add(g);
  return { canvas, ctx: canvas.getContext('2d'), tex };
}

// LED-panel backdrop: dark gradient, faint dot grid and scanlines
function backdrop(ctx, W, H, accent) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#070b24'); bg.addColorStop(1, '#0b0f30');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(120,150,255,.06)';
  for (let y = 4; y < H; y += 8) for (let x = 4; x < W; x += 8) ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.strokeStyle = accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.globalAlpha = 1;
}

// wrap text to a width; returns lines
function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export function buildScreens(scene) {
  const { halfX } = FIELD;
  const back = halfX + FIELD.goalDepth + 2 + 1.2 + 10 * 2.2 + 3; // behind the end stands

  // ── main screen: the +x end (what you see at kick-off) ──
  const main = makeScreen(scene, { w: 46, h: 13, px: 1840, x: back, y: 24, z: 0, rotY: -Math.PI / 2, color: 0xff7a1a });
  const portrait = new Image();
  portrait.src = 'assets/life/zain-retro.png';

  // ── small screen: the -x end ──
  const tips = makeScreen(scene, { w: 30, h: 6, px: 1500, x: -back, y: 21, z: 0, rotY: Math.PI / 2, color: 0x2f7bff });

  // typewriter state
  const mainSeq = { phase: 'title', i: 0, t: 0, hold: 0 };
  const tipSeq = { idx: 0, i: 0, t: 0, hold: 0, erase: false };
  let lastMain = '', lastTip = '', blink = 0;

  function drawMain(titleN, subN, cursorOn) {
    const { ctx, canvas: { width: W, height: H } } = main;
    backdrop(ctx, W, H, '#ff7a1a');
    // portrait on the right
    const ph = H - 40, pw = portrait.complete && portrait.naturalWidth ? ph * portrait.naturalWidth / portrait.naturalHeight : 0;
    const px = W - pw - 60;
    if (pw) {
      const glow = ctx.createRadialGradient(px + pw / 2, H * 0.55, 10, px + pw / 2, H * 0.55, ph * 0.7);
      glow.addColorStop(0, 'rgba(255,122,26,.25)'); glow.addColorStop(1, 'rgba(255,122,26,0)');
      ctx.fillStyle = glow; ctx.fillRect(px - 80, 0, pw + 160, H);
      ctx.drawImage(portrait, px, 30, pw, ph);
    }
    // text on the left
    const left = 70, maxW = (pw ? px : W) - left - 50;
    ctx.textBaseline = 'top';
    ctx.font = `64px ${PIXEL}`;
    const title = MAIN_LINES.title.slice(0, titleN);
    const tl = wrap(ctx, title, maxW);
    let y = 120;
    ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd27a';
    tl.forEach((l, k) => { ctx.fillText(l, left, y + k * 88); });
    const lastLine = tl[tl.length - 1] || '';
    const cx = left + ctx.measureText(lastLine).width + 10, cy = y + (tl.length - 1 || 0) * 88;
    y += tl.length * 88 + 40;
    ctx.shadowBlur = 0;
    ctx.font = `26px ${PIXEL}`;
    ctx.fillStyle = '#9fc4ff';
    const sl = wrap(ctx, MAIN_LINES.sub.slice(0, subN), maxW);
    sl.forEach((l, k) => ctx.fillText(l, left, y + k * 40));
    if (cursorOn) {
      ctx.fillStyle = '#ffd27a';
      if (subN > 0) { const last = sl[sl.length - 1] || ''; ctx.fillRect(left + ctx.measureText(last).width + 8, y + (sl.length - 1) * 40, 18, 28); }
      else ctx.fillRect(cx, cy, 34, 62);
    }
    main.tex.needsUpdate = true;
  }

  function drawTip(text, cursorOn) {
    const { ctx, canvas: { width: W, height: H } } = tips;
    backdrop(ctx, W, H, '#2f7bff');
    ctx.textBaseline = 'middle';
    ctx.font = `20px ${PIXEL}`;
    ctx.fillStyle = '#7fb3ff';
    ctx.fillText('TIP', 50, 52);
    ctx.font = `34px ${PIXEL}`;
    ctx.shadowColor = '#5aa0ff'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#e6f0ff';
    const lines = wrap(ctx, text, W - 120);
    const lh = 54, top = H / 2 - ((lines.length - 1) * lh) / 2 + 16;
    lines.forEach((l, k) => ctx.fillText(l, 50, top + k * lh));
    ctx.shadowBlur = 0;
    if (cursorOn) {
      const last = lines[lines.length - 1] || '';
      ctx.fillStyle = '#e6f0ff';
      ctx.fillRect(50 + ctx.measureText(last).width + 8, top + (lines.length - 1) * lh - 18, 18, 34);
    }
    tips.tex.needsUpdate = true;
  }

  function update(dt) {
    blink += dt;
    const cursorOn = Math.floor(blink * 2.2) % 2 === 0;

    // main: type title, type subtitle, hold, wipe, repeat
    const m = mainSeq;
    m.t += dt;
    if (m.phase === 'title' && m.t > 0.09) { m.t = 0; m.i++; if (m.i >= MAIN_LINES.title.length) { m.phase = 'sub'; m.i = 0; m.hold = 0.6; } }
    else if (m.phase === 'sub') {
      if (m.hold > 0) m.hold -= dt;
      else if (m.t > 0.04) { m.t = 0; m.i++; if (m.i >= MAIN_LINES.sub.length) { m.phase = 'hold'; m.hold = 7; } }
    } else if (m.phase === 'hold') { m.hold -= dt; if (m.hold <= 0) { m.phase = 'title'; m.i = 0; } }
    const titleN = m.phase === 'title' ? m.i : MAIN_LINES.title.length;
    const subN = m.phase === 'sub' ? m.i : m.phase === 'hold' ? MAIN_LINES.sub.length : 0;
    const keyM = `${titleN}|${subN}|${cursorOn}|${portrait.complete}`;
    if (keyM !== lastMain) { lastMain = keyM; drawMain(titleN, subN, cursorOn); }

    // tips: type, hold, erase, next
    const s = tipSeq;
    const tip = TIPS[s.idx];
    s.t += dt;
    if (s.hold > 0) { s.hold -= dt; if (s.hold <= 0) s.erase = true; }
    else if (s.erase) { if (s.t > 0.012) { s.t = 0; s.i = Math.max(0, s.i - 2); if (s.i === 0) { s.erase = false; s.idx = (s.idx + 1) % TIPS.length; } } }
    else if (s.t > 0.045) { s.t = 0; s.i++; if (s.i >= tip.length) s.hold = 3.2; }
    const keyT = `${s.idx}|${s.i}|${cursorOn}`;
    if (keyT !== lastTip) { lastTip = keyT; drawTip(TIPS[s.idx].slice(0, s.i), cursorOn); }
  }

  return { update };
}
