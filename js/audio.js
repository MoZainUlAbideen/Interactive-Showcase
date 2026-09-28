// ─────────────────────────────────────────────────────────────
//  Sound, generated live with Web Audio (no audio files needed):
//   · arena ambience: low crowd murmur + a dark drone
//   · car engine (pitch follows speed) and the boost whoosh
//   · goal: crowd roar + goal horn
//   · car/ball hits
// ─────────────────────────────────────────────────────────────

export class ArenaAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('arena-muted') === '1'; } catch {}
  }

  // must be called from a click/keypress (browsers block audio before that)
  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.noise = this.makeNoise(4);
    this.ambience();
    this.boostSetup();
    this.engineSetup();
  }

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('arena-muted', this.muted ? '1' : '0'); } catch {}
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  // pinkish noise buffer, looped by whoever uses it
  makeNoise(seconds) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048;
      d[i] = (b0 + b1 + b2 + w * 0.02) * 1.6;
    }
    return buf;
  }

  noiseSource() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random() * 2;
    return s;
  }

  lfo(target, rate, depth) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.value = rate;
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
  }

  ambience() {
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 3); // fade in (kept low so the engine sits on top)
    bus.connect(this.master);

    // crowd murmur: band-passed noise that swells slowly
    const murmur = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
    const mg = ctx.createGain(); mg.gain.value = 0.28;
    murmur.connect(bp).connect(mg).connect(bus);
    this.lfo(mg.gain, 0.07, 0.1);
    this.lfo(bp.frequency, 0.05, 120);
    murmur.start();

    // stadium rumble
    const rumble = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 140;
    const rg = ctx.createGain(); rg.gain.value = 0.55;
    rumble.connect(lp).connect(rg).connect(bus);
    rumble.start();

    // dark drone (two detuned lows + a quiet fifth)
    const dl = ctx.createBiquadFilter();
    dl.type = 'lowpass'; dl.frequency.value = 320;
    const dg = ctx.createGain(); dg.gain.value = 0.05;
    dl.connect(dg).connect(bus);
    for (const [f, type] of [[55, 'sawtooth'], [55.6, 'sawtooth'], [82.4, 'triangle']]) {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f;
      o.connect(dl); o.start();
    }
    this.lfo(dl.frequency, 0.03, 110);
    this.lfo(dg.gain, 0.045, 0.02);
  }

  boostSetup() {
    const ctx = this.ctx;
    const src = this.noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass'; hp.frequency.value = 1400; hp.Q.value = 0.5;
    this.boostGain = ctx.createGain();
    this.boostGain.gain.value = 0;
    src.connect(hp).connect(this.boostGain).connect(this.master);
    src.start();
  }

  // Engine: two detuned saws + a sub square through a lowpass.
  // Pitch and brightness follow speed; volume rises with throttle.
  engineSetup() {
    const ctx = this.ctx;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 380;
    this.engFilter.Q.value = 3;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.engFilter.connect(this.engGain).connect(this.master);
    this.engOsc = [['sawtooth', 1, 0], ['sawtooth', 1.01, 0], ['square', 0.5, 0]].map(([type, mult]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = 42 * mult;
      o.connect(this.engFilter);
      o.start();
      return { o, mult };
    });
    // little rumble so it never sounds like a pure tone
    this.lfo(this.engGain.gain, 17, 0.015);
  }

  // speed in units/s, throttle -1..1, onGround bool
  engine(speed, throttle, boosting, onGround) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = Math.min(1, Math.abs(speed) / 40);
    const rev = onGround ? s : Math.max(s, 0.55); // revs up in the air
    const f = 42 + rev * 120 + (boosting ? 18 : 0);
    for (const { o, mult } of this.engOsc) o.frequency.setTargetAtTime(f * mult, t, 0.08);
    this.engFilter.frequency.setTargetAtTime(260 + rev * 1500 + (throttle ? 250 : 0), t, 0.1);
    const vol = 0.06 + rev * 0.1 + (throttle ? 0.07 : 0) + (boosting ? 0.05 : 0);
    this.engGain.gain.setTargetAtTime(vol, t, 0.12);
  }

  engineOff() {
    if (this.ctx) this.engGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  setBoost(on) {
    if (!this.ctx) return;
    this.boostGain.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, on ? 0.04 : 0.12);
  }

  hit(strength) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const v = Math.min(1, strength / 35);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    g.gain.setValueAtTime(0.9 * v + 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.3);
    // metallic click on top
    const n = this.noiseSource();
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.35 * v, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    n.connect(f).connect(ng).connect(this.master);
    n.start(t); n.stop(t + 0.08);
  }

  goal() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;

    // crowd roar
    for (const [freq, q, peak] of [[900, 0.5, 0.9], [300, 0.7, 0.8], [2200, 0.9, 0.3]]) {
      const n = this.noiseSource();
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.35);
      g.gain.setValueAtTime(peak, t + 1.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
      n.connect(f).connect(g).connect(this.master);
      n.start(t); n.stop(t + 5.1);
    }

    // goal horn: a bright chord that swells and fades
    const horn = ctx.createGain();
    const hl = ctx.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 1800;
    horn.gain.setValueAtTime(0.0001, t);
    horn.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
    horn.gain.setValueAtTime(0.16, t + 1.1);
    horn.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    hl.connect(horn).connect(this.master);
    for (const f of [196, 246.9, 293.7, 392]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(hl); o.start(t); o.stop(t + 2);
    }
  }
}
