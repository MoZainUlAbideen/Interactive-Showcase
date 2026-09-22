/* Zayn's portfolio: a tiny top-down game on a plain <canvas>. No build step, no libraries. */
(() => {
  'use strict';

  const W = window.WORLD, ATLAS = window.ZAYN_ATLAS, SITE = window.SITE;
  const $ = (sel) => document.querySelector(sel);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const DEBUG = /[?&]debug\b/.test(location.search);
  const COARSE = window.matchMedia('(pointer: coarse)').matches;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Tuning ────────────────────────────────────────────────
  const CFG = {
    spriteScale: 0.66,   // atlas pixels -> map pixels (Zayn ends up ~127 px tall on a 1264 px map)
    walkSpeed: 108,      // map px per second
    runSpeed: 182,
    hitRx: 9, hitRy: 5,  // size of his feet for collisions
    interactRadius: 68,  // how close he must be to a pad
    viewHeight: 720,     // map px visible top-to-bottom (sets the zoom)
    walkStride: 13.5,    // map px of travel per walk frame (keeps feet from sliding)
    runStride: 17.5,
  };

  // ── DOM ───────────────────────────────────────────────────
  const splash = $('#splash'), stage = $('#stage'), canvas = $('#game');
  const ctx = canvas.getContext('2d');
  const startBtn = $('#start'), menuBtn = $('#menu'), hint = $('#hint');
  const bubble = $('#bubble'), actBtn = $('#act');
  const dialog = $('#dialog'), dlgTitle = $('#dlg-title'), dlgBody = $('#dlg-body');

  // ── Start-screen copy ─────────────────────────────────────
  $('#splash-intro').textContent = SITE.splashIntro;
  $('#stats').innerHTML = [
    ['1', 'zone to explore'],
    [String(W.pods.length), 'podiums placed'],
    [String(W.pods.filter((p) => p.active).length), 'open so far'],
  ].map(([n, t]) => `<li><strong>${n}</strong><span>${t}</span></li>`).join('');

  // ── Assets ────────────────────────────────────────────────
  const loadImg = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
  const fontsReady = Promise.race([
    Promise.all([document.fonts.load('600 16px "Pixelify Sans"'), document.fonts.load('700 16px "Pixelify Sans"'), document.fonts.load('500 16px Manrope')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});

  let bgImg, atlasImg;

  // ── Collision grid (rasterised from js/world.js) ──────────
  let grid;
  function buildGrid() {
    const c = document.createElement('canvas');
    c.width = W.width; c.height = W.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); };
    g.fillStyle = '#000'; g.fillRect(0, 0, W.width, W.height);
    g.fillStyle = '#fff'; W.walk.forEach(poly);
    g.fillStyle = '#000'; W.block.forEach((b) => poly(b.pts));
    const px = g.getImageData(0, 0, W.width, W.height).data;
    grid = new Uint8Array(W.width * W.height);
    for (let i = 0; i < grid.length; i++) grid[i] = px[i * 4] > 127 ? 1 : 0;
  }
  const FOOT = (() => {
    const pts = [[0, 0]];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; pts.push([Math.cos(a) * CFG.hitRx, Math.sin(a) * CFG.hitRy]); }
    return pts;
  })();
  function canStand(x, y) {
    for (const [ox, oy] of FOOT) {
      const gx = Math.round(x + ox), gy = Math.round(y + oy);
      if (gx < 0 || gy < 0 || gx >= W.width || gy >= W.height || !grid[gy * W.width + gx]) return false;
    }
    return true;
  }

  // ── Input ─────────────────────────────────────────────────
  const keys = new Set();
  const stickVec = { x: 0, y: 0 };
  const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
  let running = false;      // is the game screen active?
  let dialogOpen = false;

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (dialogOpen) {
      if (e.code === 'Escape') { e.preventDefault(); closeDialog(); }
      return;
    }
    if (!running) return;
    const onButton = e.target && e.target.closest && e.target.closest('button');
    if (onButton && (e.code === 'Enter' || e.code === 'Space')) return;
    if (MOVE_KEYS.has(e.code) || e.code === 'Space') e.preventDefault();
    if (e.code === 'Escape') return;
    if (MOVE_KEYS.has(e.code) || e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.add(e.code);
    if (!e.repeat && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) interact();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); });

  // Touch stick
  const stick = $('#stick'), knob = $('#knob');
  let stickId = null;
  function moveStick(e) {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const max = r.width / 2 - 10;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const m = Math.hypot(dx, dy);
    if (m > max) { dx *= max / m; dy *= max / m; }
    stickVec.x = dx / max; stickVec.y = dy / max;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  function endStick(e) {
    if (e.pointerId !== stickId) return;
    stickId = null; stickVec.x = stickVec.y = 0;
    knob.style.transform = 'translate(-50%, -50%)';
  }
  stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); e.preventDefault(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  // ── Player ────────────────────────────────────────────────
  const P = {
    x: W.spawn[0], y: W.spawn[1],
    dir: 'down', moving: false, run: false,
    travel: 0,   // total distance walked (drives animation)
    t: 0,        // idle clock
    waving: false,
  };

  function readInput() {
    let vx = 0, vy = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) vx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) vx += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) vy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) vy += 1;
    const kbd = vx !== 0 || vy !== 0;
    if (kbd) { const m = Math.hypot(vx, vy); vx /= m; vy /= m; }
    let mag = kbd ? 1 : 0;
    if (!kbd) {
      const sm = Math.hypot(stickVec.x, stickVec.y);
      if (sm > 0.14) { vx = stickVec.x / sm; vy = stickVec.y / sm; mag = Math.min(1, (sm - 0.14) / 0.72); }
    }
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || (!kbd && Math.hypot(stickVec.x, stickVec.y) > 0.9);
    return { vx, vy, mag, run };
  }

  function updatePlayer(dt) {
    P.t += dt;
    if (dialogOpen) { P.moving = false; return; }
    const { vx, vy, mag, run } = readInput();
    if (mag <= 0) { P.moving = false; return; }
    const speed = (run ? CFG.runSpeed : CFG.walkSpeed) * Math.max(0.55, mag);
    const step = speed * dt;
    const ox = P.x, oy = P.y;
    if (canStand(P.x + vx * step, P.y)) P.x += vx * step;
    if (canStand(P.x, P.y + vy * step)) P.y += vy * step;
    const moved = Math.hypot(P.x - ox, P.y - oy);
    P.moving = moved > step * 0.2;
    P.run = run;
    if (P.moving) {
      P.travel += moved;
      if (P.travel > 240) hint.classList.add('is-gone');
      P.waving = false;
      if (Math.abs(vx) >= Math.abs(vy)) P.dir = vx < 0 ? 'left' : 'right';
      else P.dir = vy < 0 ? 'up' : 'down';
    }
  }

  // ── Camera ────────────────────────────────────────────────
  const cam = { x: W.spawn[0], y: W.spawn[1] };
  let cssW = 0, cssH = 0, dpr = 1, zoom = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = stage.clientWidth; cssH = stage.clientHeight;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    zoom = clamp(cssH / CFG.viewHeight, 0.8, 1.75);
  }
  window.addEventListener('resize', () => { if (running) resize(); });
  function camTarget() {
    const vw = cssW / zoom, vh = cssH / zoom;
    const tx = P.x, ty = P.y - 40;
    return {
      x: vw >= W.width ? W.width / 2 : clamp(tx, vw / 2, W.width - vw / 2),
      y: vh >= W.height ? W.height / 2 : clamp(ty, vh / 2, W.height - vh / 2),
    };
  }
  function updateCamera(dt, snap) {
    const t = camTarget();
    const k = snap ? 1 : 1 - Math.exp(-7 * dt);
    cam.x += (t.x - cam.x) * k; cam.y += (t.y - cam.y) * k;
  }

  // ── Sprites ───────────────────────────────────────────────
  const F = ATLAS.frames;
  const IDLE_SEQ = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];  // breathing loop

  function pickSprite() {
    const side = P.dir === 'left' || P.dir === 'right';
    const flip = P.dir === 'left';
    if (P.waving) return { f: F.celebration[2], flip: false, bob: 0, tilt: 0, sy: 1 };
    if (P.moving) {
      const stride = P.run ? CFG.runStride : CFG.walkStride;
      if (side) {
        const seq = P.run ? F.run.slice(0, 9) : F.walk;
        return { f: seq[Math.floor(P.travel / stride) % seq.length], flip, bob: 0, tilt: 0, sy: 1 };
      }
      // No walk cycle exists for up/down, so hop between steps and sway a little.
      const s = Math.sin(Math.PI * P.travel / (P.run ? 64 : 50));
      return { f: P.dir === 'up' ? F.ref[1] : F.ref[0], flip: false, bob: -Math.abs(s) * 3.4, tilt: s * 0.04, sy: 1 - Math.abs(s) * 0.018 };
    }
    if (side) return { f: F.ref[3], flip, bob: 0, tilt: 0, sy: 1 };
    if (P.dir === 'up') return { f: F.ref[1], flip: false, bob: 0, tilt: 0, sy: 1 };
    const i = IDLE_SEQ[Math.floor(Math.max(0, P.t) * 4) % IDLE_SEQ.length];
    return { f: F.idle[i], flip: false, bob: 0, tilt: 0, sy: 1 };
  }

  function drawPlayer() {
    const S = CFG.spriteScale;
    // soft ground shadow
    ctx.save();
    ctx.translate(P.x, P.y); ctx.scale(1, 0.36);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
    sh.addColorStop(0, 'rgba(8,18,14,.42)'); sh.addColorStop(1, 'rgba(8,18,14,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const s = pickSprite(), f = s.f;
    ctx.save();
    ctx.translate(P.x, P.y + s.bob);
    ctx.rotate(s.tilt);
    ctx.scale((s.flip ? -1 : 1) * S, S * s.sy);
    ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    ctx.restore();
  }

  // ── Podiums ───────────────────────────────────────────────
  let nearPod = null;
  function findNearPod() {
    let best = null, bd = CFG.interactRadius;
    for (const p of W.pods) {
      const d = Math.hypot(P.x - p.x, P.y - (p.y + 8));
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function drawLock(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#c9d3d8';
    ctx.beginPath(); ctx.arc(0, -1.5, 2.6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#c9d3d8'; ctx.strokeStyle = '#0d1a1a'; ctx.lineWidth = 1;
    ctx.fillRect(-4, -1.5, 8, 6.5); ctx.strokeRect(-4, -1.5, 8, 6.5);
    ctx.restore();
  }

  function glow(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function drawPodiums(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of W.pods) {
      const near = p === nearPod;
      if (p.active) glow(p.x, p.y, near ? 78 : 66, '90,225,255', (REDUCED ? 0.4 : 0.34 + 0.14 * Math.sin(t * 2.4)) + (near ? 0.2 : 0));
      else glow(p.x, p.y, 54, '150,125,255', 0.12);
    }
    ctx.restore();

    ctx.font = '600 12px "Pixelify Sans", ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4.5; ctx.strokeStyle = '#0d1a1a';
    for (const p of W.pods) {
      const ly = p.y + 44;
      const w = ctx.measureText(p.label).width;
      ctx.strokeText(p.label, p.x, ly);
      ctx.fillStyle = p.active ? '#f6fbf8' : '#b7c3ca';
      ctx.fillText(p.label, p.x, ly);
      if (!p.active) drawLock(p.x - w / 2 - 9, ly);
    }

    // bobbing marker over the open podium until Zayn has visited it
    if (!visited.size) {
      for (const p of W.pods) {
        if (!p.active) continue;
        if (Math.hypot(P.x - p.x, P.y - p.y) < 90) continue;
        const bob = REDUCED ? 0 : Math.sin(t * 3.2) * 4;
        const x = p.x, y = p.y - 46 + bob;
        ctx.save();
        ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#0d1a1a'; ctx.fillStyle = '#ffd36b';
        ctx.beginPath(); ctx.moveTo(x - 9, y - 8); ctx.lineTo(x + 9, y - 8); ctx.lineTo(x, y + 6); ctx.closePath();
        ctx.stroke(); ctx.fill();
        ctx.restore();
      }
    }
  }

  // ── Ambient life ──────────────────────────────────────────
  const flies = [];
  (() => {
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 34; i++) flies.push({ x: rnd() * W.width, y: rnd() * W.height, ax: 8 + rnd() * 18, ay: 6 + rnd() * 14, sp: 0.25 + rnd() * 0.5, ph: rnd() * 6.28, hue: rnd() < 0.6 ? '190,255,170' : '150,235,255' });
  })();

  function drawAmbient(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of W.glows) {
      const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.6 + g.x * 0.05);
      glow(g.x, g.y, 34, g.k === 'p' ? '255,120,220' : '90,215,255', 0.16 + 0.12 * pulse);
    }
    if (!REDUCED) {
      for (const f of flies) {
        const x = f.x + Math.sin(t * f.sp + f.ph) * f.ax, y = f.y + Math.cos(t * f.sp * 0.8 + f.ph) * f.ay;
        const a = 0.25 + 0.6 * Math.max(0, Math.sin(t * 1.7 + f.ph * 3));
        glow(x, y, 6, f.hue, a);
      }
    }
    ctx.restore();
  }

  // ── Debug overlay (?debug) ────────────────────────────────
  let debugCanvas;
  function makeDebug() {
    debugCanvas = document.createElement('canvas');
    debugCanvas.width = W.width; debugCanvas.height = W.height;
    const g = debugCanvas.getContext('2d'), im = g.createImageData(W.width, W.height);
    for (let i = 0; i < grid.length; i++) if (!grid[i]) { im.data[i * 4] = 255; im.data[i * 4 + 3] = 90; }
    g.putImageData(im, 0, 0);
  }

  // ── Render ────────────────────────────────────────────────
  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = zoom * dpr;
    const left = cam.x - cssW / zoom / 2, top = cam.y - cssH / zoom / 2;
    ctx.setTransform(k, 0, 0, k, -left * k, -top * k);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(bgImg, 0, 0, W.width, W.height);
    drawAmbient(t);
    drawPodiums(t);
    drawPlayer();

    if (DEBUG) {
      ctx.drawImage(debugCanvas, 0, 0);
      ctx.strokeStyle = 'yellow'; ctx.lineWidth = 1;
      for (const p of W.pods) { ctx.beginPath(); ctx.arc(p.x, p.y + 8, CFG.interactRadius, 0, 6.283); ctx.stroke(); }
    }

    // soft vignette (screen space)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.45, cssW / 2, cssH / 2, Math.hypot(cssW, cssH) * 0.62);
    v.addColorStop(0, 'rgba(6,16,12,0)'); v.addColorStop(1, 'rgba(6,16,12,.34)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, cssW, cssH);

    placeBubble(left, top);
  }

  // ── Prompt bubble ─────────────────────────────────────────
  let bubbleFor = null;
  function placeBubble(left, top) {
    const pod = dialogOpen ? null : nearPod;
    if (pod !== bubbleFor) {
      bubbleFor = pod;
      if (!pod) { bubble.hidden = true; actBtn.hidden = true; }
      else if (pod.active) {
        bubble.className = 'bubble'; bubble.hidden = false;
        bubble.innerHTML = COARSE ? 'Tap Talk to open' : '<kbd>E</kbd> Open';
        actBtn.hidden = !COARSE;
      } else {
        bubble.className = 'bubble bubble--locked'; bubble.hidden = false;
        bubble.textContent = 'Locked \u00b7 ' + SITE.lockedHint.toLowerCase();
        actBtn.hidden = true;
      }
    }
    if (pod) {
      const headY = P.y - 200 * CFG.spriteScale - 12;      // keep the bubble clear of his head
      const sx = (pod.x - left) * zoom, sy = (Math.min(pod.y - 62, headY) - top) * zoom;
      bubble.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
    }
  }
  bubble.addEventListener('click', () => interact());
  actBtn.addEventListener('click', () => interact());

  // ── Popup ─────────────────────────────────────────────────
  const visited = new Set();
  let lastFocus = null;
  function interact() {
    if (dialogOpen || !nearPod || !nearPod.active) return;
    openDialog(nearPod);
  }
  function openDialog(pod) {
    const c = SITE.pods[pod.id] || { title: pod.label, paragraphs: ['Add text for this podium in js/content.js.'], links: [] };
    dlgTitle.textContent = c.title;
    dlgBody.replaceChildren(...c.paragraphs.map((t) => Object.assign(document.createElement('p'), { textContent: t })));
    if (c.links && c.links.length) {
      const wrap = document.createElement('div'); wrap.className = 'dialog__links';
      c.links.forEach((l) => wrap.append(Object.assign(document.createElement('a'), { textContent: l.label, href: l.href, target: '_blank', rel: 'noopener noreferrer' })));
      dlgBody.append(wrap);
    }
    visited.add(pod.id);
    hint.classList.add('is-gone');
    P.dir = 'down'; P.waving = true; P.moving = false;
    dialogOpen = true; keys.clear();
    lastFocus = document.activeElement;
    dialog.hidden = false;
    $('#dlg-close').focus();
  }
  function closeDialog() {
    dialogOpen = false; dialog.hidden = true; P.waving = false;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  dialog.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDialog(); });

  // ── Loop ──────────────────────────────────────────────────
  let last = 0, clock = 0, raf = 0;
  function frame(now) {
    if (!running) return;
    // First frame after (re)starting only sets the clock; dt can never be negative.
    const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
    last = now; clock += dt;
    updatePlayer(dt);
    nearPod = findNearPod();
    updateCamera(dt, false);
    render(clock);
    raf = requestAnimationFrame(frame);
  }

  function showGame() {
    splash.classList.add('is-leaving');
    stage.hidden = false;
    resize();
    if (!hint.dataset.set) {
      hint.textContent = COARSE ? 'Drag the stick to walk to the glowing podium.' : 'Use WASD or the arrow keys to walk to the glowing podium.';
      hint.dataset.set = '1';
    }
    updateCamera(0, true);
    running = true; last = 0;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    setTimeout(() => { if (running) splash.hidden = true; }, REDUCED ? 0 : 460);
  }
  function showSplash() {
    running = false; keys.clear();
    stickVec.x = stickVec.y = 0; knob.style.transform = 'translate(-50%, -50%)';
    cancelAnimationFrame(raf);
    bubbleFor = null; bubble.hidden = true; actBtn.hidden = true;
    stage.hidden = true;
    splash.hidden = false;
    void splash.offsetWidth;
    splash.classList.remove('is-leaving');
    startBtn.textContent = 'Back to the forest';
    startBtn.focus({ preventScroll: true });
  }
  startBtn.addEventListener('click', showGame);
  menuBtn.addEventListener('click', showSplash);

  // ── Boot ──────────────────────────────────────────────────
  Promise.all([loadImg('assets/forest.jpg'), loadImg(ATLAS.image), fontsReady])
    .then(([bg, atlas]) => {
      bgImg = bg; atlasImg = atlas;
      buildGrid();
      if (DEBUG) makeDebug();
      if (!canStand(P.x, P.y)) console.warn('Spawn point is not on walkable ground. Check js/world.js.');
      startBtn.disabled = false;
      startBtn.textContent = 'Enter the forest';
      startBtn.focus({ preventScroll: true });
    })
    .catch((err) => {
      console.error(err);
      const box = $('#load-error');
      box.hidden = false;
      box.textContent = 'The forest did not load. Check your connection and reload the page.';
      startBtn.removeEventListener('click', showGame);
      startBtn.textContent = 'Reload';
      startBtn.disabled = false;
      startBtn.addEventListener('click', () => location.reload());
    });

  // Test hook: lets automated checks drive the game without a keyboard.
  window.__zayn = { P, cam, CFG, canStand, get nearPod() { return nearPod; }, render: (t) => render(t || 0), step: (dt) => { updatePlayer(dt); nearPod = findNearPod(); updateCamera(dt, false); } };
})();
