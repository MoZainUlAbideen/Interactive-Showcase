// ─────────────────────────────────────────────────────────────
//  Stadium screen above the end you face at kick-off.
//  Types "Welcome to My World !" next to the retro portrait and shows
//  the goals count. A canvas, redrawn only when something on it changes.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { FIELD } from './arena.js';

const PIXEL = '"Press Start 2P", "Orbitron", monospace';

export const MAIN_TITLE = 'Welcome to My World !';

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

  // the +x end: what you see at kick-off
  const main = makeScreen(scene, { w: 54, h: 19, px: 2000, x: back, y: 27, z: 0, rotY: -Math.PI / 2, color: 0xff7a1a });
  const portrait = new Image();
  portrait.src = 'assets/life/zain-retro.png';

  const seq = { i: 0, t: 0, hold: 0 };
  let goals = 0, flash = 0, last = '', blink = 0;

  function draw(n, cursorOn) {
    const { ctx, canvas: { width: W, height: H } } = main;
    backdrop(ctx, W, H, '#ff7a1a');

    // portrait: right side, full height, standing on the bottom edge
    const ok = portrait.complete && portrait.naturalWidth;
    const ph = H - 24, pw = ok ? ph * portrait.naturalWidth / portrait.naturalHeight : 0;
    const px = W - pw - 50;
    if (ok) {
      const glow = ctx.createRadialGradient(px + pw / 2, H * 0.5, 20, px + pw / 2, H * 0.5, ph * 0.75);
      glow.addColorStop(0, 'rgba(255,122,26,.3)'); glow.addColorStop(1, 'rgba(255,122,26,0)');
      ctx.fillStyle = glow; ctx.fillRect(px - 120, 0, pw + 240, H);
      ctx.drawImage(portrait, px, H - ph, pw, ph);
    }

    const left = 80, maxW = (ok ? px : W) - left - 60;

    // title
    ctx.textBaseline = 'top';
    ctx.font = `92px ${PIXEL}`;
    const lines = wrap(ctx, MAIN_TITLE.slice(0, n), maxW);
    const lh = 126, top = 100;
    ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffd27a';
    lines.forEach((l, k) => ctx.fillText(l, left, top + k * lh));
    ctx.shadowBlur = 0;
    if (cursorOn) {
      const lastLine = lines[lines.length - 1] || '';
      ctx.fillRect(left + ctx.measureText(lastLine).width + 12, top + (lines.length - 1) * lh, 48, 90);
    }

    // goals counter, same pixel font as the title
    const hot = flash > 0 && Math.floor(flash * 6) % 2 === 0;
    const gy = H - 150;
    ctx.textBaseline = 'top';
    ctx.font = `64px ${PIXEL}`;
    ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd27a';
    const label = 'GOALS : ';
    ctx.fillText(label, left, gy);
    const nx = left + ctx.measureText(label).width + 10;
    ctx.font = `88px ${PIXEL}`;
    ctx.shadowColor = hot ? '#ffffff' : '#ffb347'; ctx.shadowBlur = hot ? 30 : 18;
    ctx.fillStyle = hot ? '#ffffff' : '#ffd27a';
    ctx.fillText(String(goals), nx, gy - 12);
    ctx.shadowBlur = 0;

    main.tex.needsUpdate = true;
  }

  function update(dt) {
    blink += dt;
    const cursorOn = Math.floor(blink * 2.2) % 2 === 0;
    if (flash > 0) flash = Math.max(0, flash - dt);

    // type the title, hold, then type it again
    seq.t += dt;
    if (seq.hold > 0) { seq.hold -= dt; if (seq.hold <= 0) seq.i = 0; }
    else if (seq.t > 0.1) { seq.t = 0; seq.i++; if (seq.i >= MAIN_TITLE.length) seq.hold = 8; }
    const n = Math.min(seq.i, MAIN_TITLE.length);

    const key = `${n}|${cursorOn}|${goals}|${flash > 0 ? Math.floor(flash * 6) : -1}|${portrait.complete}`;
    if (key !== last) { last = key; draw(n, cursorOn); }
  }

  function setGoals(g) { goals = g; flash = 2.4; }

  return { update, setGoals };
}
