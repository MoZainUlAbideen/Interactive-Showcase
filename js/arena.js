// ─────────────────────────────────────────────────────────────
//  The arena: pitch, glass walls, two goals, small stands, lights, ball.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

export const FIELD = {
  halfX: 50,      // goal lines at x = ±50
  halfZ: 32,      // touchlines at z = ±32
  goalHalfW: 10,  // goal mouth is 20 wide
  goalH: 8,
  goalDepth: 8,
  wallH: 9,
  postR: 0.35,
  ballR: 2,
};

export const TEAM = { blue: 0x2f7bff, orange: 0xff7a1a };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pitchTexture() {
  const { halfX, halfZ, goalHalfW } = FIELD;
  const S = 20; // px per unit
  return canvasTex(halfX * 2 * S, halfZ * 2 * S, (ctx, w, h) => {
    const P = (x, z) => [(x + halfX) * S, (z + halfZ) * S];
    // mowing stripes
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = i % 2 ? '#2c8a3c' : '#277a35';
      ctx.fillRect((i * w) / bands, 0, w / bands + 1, h);
    }
    // grain
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    // team tint toward each goal
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(47,123,255,.28)');
    g.addColorStop(0.3, 'rgba(47,123,255,0)');
    g.addColorStop(0.7, 'rgba(255,122,26,0)');
    g.addColorStop(1, 'rgba(255,122,26,.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // lines
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = 0.3 * S;
    const rect = (x0, z0, x1, z1) => {
      const [a, b] = P(x0, z0); const [c, d] = P(x1, z1);
      ctx.strokeRect(a, b, c - a, d - b);
    };
    rect(-halfX + 0.5, -halfZ + 0.5, halfX - 0.5, halfZ - 0.5);
    ctx.beginPath(); ctx.moveTo(...P(0, -halfZ)); ctx.lineTo(...P(0, halfZ)); ctx.stroke();
    ctx.beginPath(); ctx.arc(...P(0, 0), 9.15 * S, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(...P(0, 0), 0.5 * S, 0, Math.PI * 2); ctx.fill();
    for (const s of [-1, 1]) {
      const gx = s * (halfX - 0.5);
      rect(Math.min(gx, s * 34), -21, Math.max(gx, s * 34), 21);                           // penalty box
      rect(Math.min(gx, s * 44), -(goalHalfW + 3), Math.max(gx, s * 44), goalHalfW + 3);  // six-yard box
      ctx.beginPath(); ctx.arc(...P(s * 39, 0), 0.4 * S, 0, Math.PI * 2); ctx.fill();      // spot
      ctx.beginPath();                                                                    // D arc
      const [cx, cy] = P(s * 39, 0);
      const a = Math.acos(5 / 9.15);
      if (s > 0) ctx.arc(cx, cy, 9.15 * S, Math.PI - a, Math.PI + a);
      else ctx.arc(cx, cy, 9.15 * S, -a, a);
      ctx.stroke();
      for (const t of [-1, 1]) {                                                          // corner arcs
        ctx.beginPath();
        ctx.arc(...P(s * (halfX - 0.5), t * (halfZ - 0.5)), 1.5 * S, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
}

function netTexture(color) {
  const t = canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    const n = 8;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo((i * w) / n, 0); ctx.lineTo((i * w) / n, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (i * h) / n); ctx.lineTo(w, (i * h) / n); ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function skyTexture() {
  return canvasTex(16, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04061a');
    g.addColorStop(0.55, '#101a4a');
    g.addColorStop(0.78, '#2a2a6e');
    g.addColorStop(1, '#3b2358');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function ballTexture(emissive) {
  return canvasTex(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = emissive ? '#000' : '#5c6270';
    ctx.fillRect(0, 0, w, h);
    // hex panels
    const r = 34;
    const hx = r * Math.sqrt(3);
    for (let row = -1; row < h / (r * 1.5) + 1; row++) {
      for (let col = -1; col < w / hx + 1; col++) {
        const cx = col * hx + (row % 2 ? hx / 2 : 0);
        const cy = row * r * 1.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          const px = cx + Math.cos(a) * (r - 3), py = cy + Math.sin(a) * (r - 3);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        if (emissive) {
          ctx.strokeStyle = 'rgba(80,200,255,.22)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          const shade = 128 + ((col * 7 + row * 13) % 5) * 10;
          ctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 14})`;
          ctx.fill();
        }
      }
    }
    // glowing equator band + a ring
    if (emissive) {
      ctx.fillStyle = '#39d7ff';
      ctx.fillRect(0, h / 2 - 5, w, 10);
      ctx.beginPath(); ctx.arc(w * 0.25, h / 2, 40, 0, Math.PI * 2); ctx.lineWidth = 8; ctx.strokeStyle = '#39d7ff'; ctx.stroke();
      ctx.beginPath(); ctx.arc(w * 0.75, h / 2, 40, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#2b2f38';
      ctx.fillRect(0, h / 2 - 9, w, 18);
    }
  });
}

export function buildBall() {
  const mat = new THREE.MeshStandardMaterial({
    map: ballTexture(false), emissiveMap: ballTexture(true), emissive: 0xffffff, emissiveIntensity: 1.4,
    roughness: 0.35, metalness: 0.55,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(FIELD.ballR, 48, 32), mat);
  ball.castShadow = true;

  // ring on the ground under the ball (helps judge where it will land)
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(FIELD.ballR * 0.75, FIELD.ballR * 0.95, 40),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.04;
  return { ball, marker };
}

export function buildArena(scene) {
  const { halfX, halfZ, goalHalfW, goalH, goalDepth, wallH, postR } = FIELD;

  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0x0b1036, 140, 320);

  // ── lights ──
  scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x1c2a22, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(35, 70, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 55, bottom: -55, near: 10, far: 180 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);

  // ── ground + pitch ──
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x0d1330, roughness: 1 }),
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.03;
  outer.receiveShadow = true;
  scene.add(outer);

  const pitchMat = new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.92 });
  pitchMat.map.anisotropy = 8;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(halfX * 2, halfZ * 2), pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);

  // ── glass walls with neon rails ──
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9fd8ff, transparent: true, opacity: 0.1, roughness: 0.1, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const neon = (color) => new THREE.MeshBasicMaterial({ color });
  const blueN = neon(TEAM.blue), orangeN = neon(TEAM.orange), whiteN = neon(0xdff4ff);
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  // long side walls, split so each half glows in its team colour
  for (const s of [-1, 1]) {
    box(halfX * 2, wallH, 0.2, glass, 0, wallH / 2, s * (halfZ + 0.1));
    for (const [side, mat] of [[-1, blueN], [1, orangeN]]) {
      box(halfX, 0.18, 0.3, mat, side * halfX / 2, wallH, s * (halfZ + 0.1));
      box(halfX, 0.12, 0.3, mat, side * halfX / 2, 0.08, s * (halfZ + 0.1));
    }
  }
  // end walls either side of the goal mouth, and above it
  for (const s of [-1, 1]) {
    const mat = s < 0 ? blueN : orangeN;
    const segW = halfZ - goalHalfW;
    for (const t of [-1, 1]) {
      const zc = t * (goalHalfW + segW / 2);
      box(0.2, wallH, segW, glass, s * (halfX + 0.1), wallH / 2, zc);
      box(0.3, 0.18, segW, mat, s * (halfX + 0.1), wallH, zc);
      box(0.3, 0.12, segW, mat, s * (halfX + 0.1), 0.08, zc);
    }
    box(0.2, wallH - goalH, goalHalfW * 2, glass, s * (halfX + 0.1), (wallH + goalH) / 2, 0);
    box(0.3, 0.18, goalHalfW * 2, mat, s * (halfX + 0.1), wallH, 0);
    // corner pillars
    for (const t of [-1, 1]) box(0.5, wallH + 0.4, 0.5, whiteN, s * (halfX + 0.1), (wallH + 0.4) / 2, t * (halfZ + 0.1));
  }

  // ── goals ──
  const goals = [];
  for (const s of [-1, 1]) {
    const color = s < 0 ? TEAM.blue : TEAM.orange;
    const css = s < 0 ? '#7fb3ff' : '#ffb27a';
    const g = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.6, roughness: 0.3 });
    const post = (x, z) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, goalH, 16), frame);
      m.position.set(x, goalH / 2, z);
      m.castShadow = true;
      g.add(m);
    };
    post(s * halfX, -goalHalfW); post(s * halfX, goalHalfW);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, goalHalfW * 2 + postR * 2, 16), frame);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(s * halfX, goalH, 0);
    g.add(bar);
    // back frame
    const thin = new THREE.MeshStandardMaterial({ color: 0xcfd6e6, roughness: 0.4, metalness: 0.6 });
    const bx = s * (halfX + goalDepth);
    for (const z of [-goalHalfW, goalHalfW]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, goalH, 8), thin);
      m.position.set(bx, goalH / 2, z);
      g.add(m);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, goalDepth, 8), thin);
      top.rotation.z = Math.PI / 2;
      top.position.set(s * (halfX + goalDepth / 2), goalH, z);
      g.add(top);
    }
    // nets
    const netMat = (rx, ry) => {
      const t = netTexture(css);
      t.repeat.set(rx, ry);
      return new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 });
    };
    const back = new THREE.Mesh(new THREE.PlaneGeometry(goalHalfW * 2, goalH), netMat(5, 2));
    back.rotation.y = Math.PI / 2;
    back.position.set(bx, goalH / 2, 0);
    g.add(back);
    for (const z of [-goalHalfW, goalHalfW]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(goalDepth, goalH), netMat(2, 2));
      side.position.set(s * (halfX + goalDepth / 2), goalH / 2, z);
      g.add(side);
    }
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(goalDepth, goalHalfW * 2), netMat(2, 5));
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(s * (halfX + goalDepth / 2), goalH, 0);
    g.add(roof);
    // glowing floor inside the goal
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(goalDepth, goalHalfW * 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(s * (halfX + goalDepth / 2), 0.02, 0);
    g.add(floor);
    // goal-line glow strip
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.5, goalHalfW * 2), new THREE.MeshBasicMaterial({ color }));
    line.rotation.x = -Math.PI / 2;
    line.position.set(s * halfX, 0.03, 0);
    g.add(line);
    scene.add(g);
    goals.push({ side: s, group: g, frame });
  }

  // ── small stands with a crowd ──
  const standMat = new THREE.MeshStandardMaterial({ color: 0x161c3c, roughness: 0.9 });
  const crowdPalette = [0x2f7bff, 0xff7a1a, 0xe9ecf5, 0x6d5dfc, 0x16213f, 0x2bd4ff, 0xffc93c, 0x384066];
  const seats = [];
  const tiers = 5, step = 2.4, rise = 1.3;
  const addStand = (len, alongX, sign, base) => {
    for (let i = 0; i < tiers; i++) {
      const off = base + 1.2 + i * step;
      const h = 1 + i * rise;
      const m = alongX
        ? new THREE.Mesh(new THREE.BoxGeometry(len, h, step), standMat)
        : new THREE.Mesh(new THREE.BoxGeometry(step, h, len), standMat);
      if (alongX) m.position.set(0, h / 2, sign * off); else m.position.set(sign * off, h / 2, 0);
      m.receiveShadow = true;
      scene.add(m);
      for (let p = -len / 2 + 0.8; p < len / 2 - 0.6; p += 1.05) {
        if (Math.random() < 0.12) continue;
        seats.push(alongX ? [p, h, sign * off] : [sign * off, h, p]);
      }
    }
  };
  addStand(halfX * 2 + 4, true, -1, halfZ + 1);
  addStand(halfX * 2 + 4, true, 1, halfZ + 1);
  addStand(halfZ * 2 - 4, false, -1, halfX + goalDepth + 2);
  addStand(halfZ * 2 - 4, false, 1, halfX + goalDepth + 2);

  const crowd = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 0.9, 0.45),
    new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    seats.length,
  );
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  seats.forEach(([x, y, z], i) => {
    m4.makeTranslation(x + (Math.random() - 0.5) * 0.2, y + 0.45, z + (Math.random() - 0.5) * 0.3);
    crowd.setMatrixAt(i, m4);
    const base = x < -2 ? 0 : x > 2 ? 1 : Math.floor(Math.random() * 2);
    col.setHex(Math.random() < 0.55 ? crowdPalette[base] : crowdPalette[2 + Math.floor(Math.random() * 6)]);
    crowd.setColorAt(i, col);
  });
  scene.add(crowd);

  // ── floodlight towers in the corners ──
  const pole = new THREE.MeshStandardMaterial({ color: 0x3b4262, roughness: 0.6, metalness: 0.5 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (halfX + 16), z = sz * (halfZ + 16);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 30, 10), pole);
    p.position.set(x, 15, z);
    scene.add(p);
    const head = new THREE.Group();
    head.position.set(x, 31, z);
    head.lookAt(0, 0, 0);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 0.4), pole);
    head.add(panel);
    for (let i = -1; i <= 1; i++) for (let j = -0.5; j <= 0.5; j++) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), lamp);
      l.position.set(i * 2.1, j * 1.8, 0.21);
      head.add(l);
    }
    scene.add(head);
  }

  return { goals };
}
