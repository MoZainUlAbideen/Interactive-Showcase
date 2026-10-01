// ─────────────────────────────────────────────────────────────
//  Boot: renderer, input, camera, game loop.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SITE, PODIUMS } from './content.js';
import { buildArena, buildBall, FIELD, TEAM } from './arena.js';
import { buildCar } from './car.js';
import { buildPodiums, updatePodiums, REACH } from './podiums.js';
import { Physics, SPAWN } from './physics.js';
import { FX } from './fx.js';
import { UI } from './ui.js';
import { ArenaAudio } from './audio.js';
import { buildDugout } from './dugout.js';
import { buildScreens } from './screens.js';
import { Academy } from './academy/academy.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

// ── splash text ──

await Promise.all([
  document.fonts.load('italic 700 64px "Chakra Petch"'),
  document.fonts.load('900 64px "Orbitron"'),
  document.fonts.load('32px "Press Start 2P"'),
]).catch(() => {});

// ── renderer ──
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // 1.5 keeps integrated GPUs smooth
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
// soft reflections so metal (rollers, podiums) and the car's clear-coat actually shine
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 600);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.65, 0.5, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ── world ──
buildArena(scene);
const car = buildCar();
scene.add(car.group);
const { ball, marker } = buildBall();
scene.add(ball, marker);
const pods = buildPodiums(scene, PODIUMS);
const dugout = buildDugout(scene);
const screens = buildScreens(scene);
const academy = new Academy();
// everything the car can press E at: the podiums plus the dugout's technical area
const spots = [...pods, dugout.spot];
const fx = new FX(scene);
const ui = new UI();
const audio = new ArenaAudio();
const muteBtn = document.getElementById('mute');
const showMute = () => { muteBtn.querySelector('span').textContent = audio.muted ? 'Sound off' : 'Sound on'; muteBtn.setAttribute('aria-pressed', String(audio.muted)); };
showMute();
muteBtn.addEventListener('click', () => { audio.toggleMute(); showMute(); canvas.focus(); });

let goals = 0;
let shake = 0;
const physics = new Physics(pods, {
  onGoal(goalSide, pos) {
    goals++;
    ui.setScore(goals);
    ui.goal(goalSide);
    fx.goal(pos, goalSide === 'orange' ? TEAM.orange : TEAM.blue);
    audio.goal();
    shake = 0.8;
  },
  onHit(kind, strength) {
    if (kind === 'car') shake = Math.max(shake, Math.min(0.25, strength / 120));
    if (strength > 4) audio.hit(kind === 'car' ? strength : strength * 0.5);
  },
});

// ── input ──
const keys = new Set();
let ballCam = false;
const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
addEventListener('keydown', (e) => {
  if (state !== 'play') return;
  if (academy.isOpen) { if (e.code === 'Escape') academy.back(); return; }
  if (ui.panelOpen) { if (e.code === 'Escape') ui.close(); return; }
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyE' && nearPod) {
    keys.clear();
    if (nearPod.data.id === 'academy') { ui.setPrompt(null); academy.open(); } else ui.open(nearPod.data);
  }
  if (e.code === 'KeyC') { ballCam = !ballCam; ui.setBallCam(ballCam); }
  if (e.code === 'KeyR') { physics.resetCar(); physics.resetBall(); }
  if (e.code === 'KeyM') { audio.toggleMute(); showMute(); }
  if (e.code === "KeyH") document.getElementById('help').classList.toggle('is-hidden');
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

function readInput() {
  const k = (...c) => c.some((x) => keys.has(x));
  return {
    throttle: (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0),
    steer: (k('KeyA', 'ArrowLeft') ? 1 : 0) - (k('KeyD', 'ArrowRight') ? 1 : 0),
    boost: k('ShiftLeft', 'ShiftRight'),
    jump: k('Space'),
  };
}
const IDLE = { throttle: 0, steer: 0, boost: false, jump: false };

// ── start ──
let state = 'splash';
const startBtn = document.getElementById('start');
startBtn.disabled = false;
startBtn.querySelector('span').textContent = 'Explore';
startBtn.addEventListener('click', () => {
  state = 'play';
  audio.start();
  document.getElementById('splash').classList.add('is-leaving');
  setTimeout(() => (document.getElementById('splash').hidden = true), 500);
  document.getElementById('hud').hidden = false;
  canvas.focus();
});

// ── camera ──
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const want = new THREE.Vector3(), look = new THREE.Vector3(), dir = new THREE.Vector3();
let camYaw = SPAWN.yaw;
camera.position.set(-24, 5, -9);

function updateCamera(dt, t) {
  const c = physics.car, b = physics.ball;
  const offset = 0; // splash content is centred, so the car orbits dead centre behind it
  if (offset) camera.setViewOffset(innerWidth, innerHeight, offset, 0, innerWidth, innerHeight);
  else if (camera.view?.enabled) camera.clearViewOffset();
  if (state === 'splash') {
    // slow orbit around the car so visitors can admire it
    const a = t * 0.25;
    want.set(c.pos.x + Math.sin(a) * 8.5, 3.2, c.pos.z + Math.cos(a) * 8.5);
    look.set(c.pos.x, 1.1, c.pos.z);
    camera.position.lerp(want, 1 - Math.exp(-3 * dt));
    camLook.lerp(look, 1 - Math.exp(-3 * dt));
    camera.lookAt(camLook);
    return;
  }
  if (ballCam) {
    dir.set(b.pos.x - c.pos.x, 0, b.pos.z - c.pos.z);
    if (dir.lengthSq() < 1) dir.set(Math.sin(c.yaw), 0, Math.cos(c.yaw));
    dir.normalize();
    want.set(c.pos.x - dir.x * 11, c.pos.y + 4.6, c.pos.z - dir.z * 11);
    look.set((c.pos.x * 0.6 + b.pos.x * 0.4), Math.min(b.pos.y, 10) * 0.4 + 1.5, (c.pos.z * 0.6 + b.pos.z * 0.4));
  } else {
    // chase cam trails the car's heading; smooth so turns feel weighty
    let d = c.yaw - camYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    camYaw += d * (1 - Math.exp(-5 * dt));
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    want.set(c.pos.x - fx * 10.5, c.pos.y + 4.4, c.pos.z - fz * 10.5);
    look.set(c.pos.x + fx * 4, c.pos.y + 1.4, c.pos.z + fz * 4);
  }
  // keep the camera inside the arena
  want.x = THREE.MathUtils.clamp(want.x, -FIELD.halfX - FIELD.goalDepth + 1, FIELD.halfX + FIELD.goalDepth - 1);
  want.z = THREE.MathUtils.clamp(want.z, -FIELD.halfZ + 1, FIELD.halfZ - 1);
  camPos.lerp(want, 1 - Math.exp(-7 * dt));
  camLook.lerp(look, 1 - Math.exp(-10 * dt));
  camera.position.copy(camPos);
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    shake = Math.max(0, shake - dt * 1.5);
  }
  camera.lookAt(camLook);
  const targetFov = physics.car.boosting ? 80 : 70;
  camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-4 * dt));
  camera.updateProjectionMatrix();
}
camPos.copy(camera.position);
camLook.set(SPAWN.car.x, 1, SPAWN.car.z);

// ── loop ──
let nearPod = null;
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const busy = ui.panelOpen || academy.isOpen;
  const input = state === 'play' && !busy ? readInput() : IDLE;
  physics.step(dt, input);

  // car visuals
  const c = physics.car;
  car.group.position.copy(c.pos);
  car.group.rotation.y = c.yaw;
  car.group.rotation.x = c.onGround ? 0 : THREE.MathUtils.clamp(-c.vel.y * 0.012, -0.2, 0.2);
  for (const w of car.wheels) {
    w.spin.rotation.x = c.roll;
    if (w.front) w.pivot.rotation.y = c.steer * 0.4;
  }
  for (const r of car.rollers) r.rotation.y += c.speed * dt * 0.6;
  car.flames.visible = c.boosting;
  audio.setBoost(c.boosting && state === 'play' && !busy);
  // car sound only while actually driving; silent behind popups and in the academy
  if (state === 'play' && !busy) audio.engine(c.speed, input.throttle || input.boost, c.boosting, c.onGround);
  else audio.engineOff();
  if (c.boosting) {
    car.flames.scale.set(1, 1, 0.8 + Math.random() * 0.5);
    car.group.updateMatrixWorld();
    fx.boost(car.group, dt);
  }

  // ball visuals
  const b = physics.ball;
  ball.position.copy(b.pos);
  ball.quaternion.copy(b.quat);
  marker.position.set(b.pos.x, 0.04, b.pos.z);
  marker.material.opacity = THREE.MathUtils.clamp((b.pos.y - FIELD.ballR - 0.5) / 6, 0, 0.5);

  // nearest podium in reach
  nearPod = null;
  let best = REACH;
  for (const p of spots) {
    const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z);
    if (d < best) { best = d; nearPod = p; }
  }
  if (state === 'play' && !busy) ui.setPrompt(nearPod?.data);
  updatePodiums(pods, t, dt, nearPod?.data.id);
  dugout.update(t, nearPod?.data.id === 'academy' ? 1 : 0);
  if (!academy.isOpen) screens.update(dt);
  ui.setBoost(c.boost);

  fx.update(dt);
  if (!window.freezeCam) updateCamera(dt, t);
  // the academy covers the whole screen, so skip drawing the arena behind it (saves the GPU)
  if (!academy.isOpen) composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (DEBUG) Object.assign(window, { physics, camera, scene, ui, pods, audio, academy, dugout, THREE, setState: (s) => (state = s), keys });
