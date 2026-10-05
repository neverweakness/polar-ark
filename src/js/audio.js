'use strict';
/* Звук и музыка: всё синтезируется кодом (WebAudio), аудиофайлов нет.
   Музыка — спокойная «арктическая»: пад, колокольные арпеджио, глубокий бас, 16 тактов ≈ 55 с. */
(function (g) {
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const BPM = 70, STEP = 60 / BPM / 2, STEPS = 128;
  const CH = {
    Dm9: { root: 38, tri: [62, 65, 69, 72] }, Bb: { root: 34, tri: [58, 62, 65, 69] }, F: { root: 41, tri: [60, 64, 69, 72] },
    Cadd9: { root: 36, tri: [60, 64, 67, 74] }, Gm7: { root: 43, tri: [58, 62, 67, 70] }, Am7: { root: 45, tri: [60, 64, 67, 72] }
  };
  const PROG = ['Dm9', 'Bb', 'F', 'Cadd9', 'Dm9', 'Gm7', 'Bb', 'Am7', 'F', 'Cadd9', 'Dm9', 'Bb', 'Gm7', 'Am7', 'Bb', 'Dm9'];
  const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
  const PENTA = [74, 77, 79, 81, 84, 86, 89];
  let noiseBuf = null;
  function seeded(n) { let a = n | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const RN = seeded(7);
  const SPARK = []; for (let i = 0; i < STEPS; i++) SPARK.push(RN() < 0.07 ? PENTA[(RN() * PENTA.length) | 0] : 0);
  const ARPON = []; for (let i = 0; i < STEPS; i++) ARPON.push(RN() < 0.72);

  function buildBus(ctx, dest) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.3;
    comp.connect(dest);
    const dry = ctx.createGain(); dry.gain.value = 0.7; dry.connect(comp);
    const len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let s = 9001 + ch * 313; for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = ((s / 4294967296) * 2 - 1) * Math.pow(1 - i / len, 2.4); } }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.5; conv.connect(wet); wet.connect(comp);
    const input = ctx.createGain(); input.connect(dry); input.connect(conv);
    return input;
  }
  function env(gn, t, a, peak, dur) { gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(peak, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function osc(ctx, type, f, t, dur) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(t + dur + 0.05); return o; }
  function bell(ctx, bus, t, midi, vel, dur) {
    const f = mtof(midi), gn = ctx.createGain(); env(gn, t, 0.006, vel, dur); gn.connect(bus);
    osc(ctx, 'sine', f, t, dur).connect(gn);
    const g2 = ctx.createGain(); g2.gain.value = 0.3; g2.connect(gn); osc(ctx, 'sine', f * 2.01, t, dur).connect(g2);
    const g3 = ctx.createGain(); g3.gain.value = 0.12; g3.connect(gn); osc(ctx, 'sine', f * 3.97, t, dur * 0.5).connect(g3);
  }
  function pad(ctx, bus, t, notes, dur, vel) {
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vel, t + 1.6);
    gn.gain.setValueAtTime(vel, t + dur - 1.4); gn.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; gn.connect(lp); lp.connect(bus);
    notes.forEach((n, i) => { [-1, 1].forEach((d) => { const o = osc(ctx, i % 2 ? 'triangle' : 'sine', mtof(n - 12), t, dur + 0.3); o.detune.value = d * 6 + i; o.connect(gn); }); });
  }
  function sub(ctx, bus, t, midi, vel, dur) {
    const gn = ctx.createGain(); env(gn, t, 0.04, vel, dur); gn.connect(bus); osc(ctx, 'sine', mtof(midi), t, dur).connect(gn);
  }
  function step(ctx, bus, s, t) {
    const bar = Math.floor(s / 8), pos = s % 8, ch = CH[PROG[bar]];
    if (pos === 0) { pad(ctx, bus, t, ch.tri, STEP * 8, 0.03); sub(ctx, bus, t, ch.root, 0.2, STEP * 7); }
    if (pos === 4 && bar % 2) sub(ctx, bus, t, ch.root + 7, 0.1, STEP * 3);
    if (ARPON[s]) bell(ctx, bus, t, ch.tri[ARP[pos]] + 12, 0.075, 1.4);
    if (pos === 0 && bar % 4 === 0) bell(ctx, bus, t, ch.tri[3] + 12, 0.09, 2.6);
    if (SPARK[s]) bell(ctx, bus, t + 0.02, SPARK[s], 0.05, 2.2);
  }

  const Music = {
    on: false, ctx: null, bus: null, gain: null, timer: 0, next: 0, step: 0,
    start(ctx, dest) {
      if (this.on || !ctx) return;
      this.ctx = ctx; this.gain = ctx.createGain();
      this.gain.gain.setValueAtTime(0.0001, ctx.currentTime); this.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
      this.gain.connect(dest); this.bus = buildBus(ctx, this.gain);
      this.on = true; this.step = 0; this.next = ctx.currentTime + 0.2;
      this.timer = setInterval(() => this.pump(), 80);
    },
    pump() {
      const c = this.ctx; if (!c || c.state !== 'running') return;
      while (this.next < c.currentTime + 0.4) { step(c, this.bus, this.step, this.next); this.next += STEP; this.step = (this.step + 1) % STEPS; }
    },
    stop() {
      if (!this.on) return; this.on = false; clearInterval(this.timer);
      const c = this.ctx, gn = this.gain, bus = this.bus;
      try { gn.gain.cancelScheduledValues(c.currentTime); gn.gain.setValueAtTime(gn.gain.value, c.currentTime); gn.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.5); } catch (e) { /* ignore */ }
      setTimeout(() => { try { gn.disconnect(); bus.disconnect(); } catch (e) { /* ignore */ } }, 800);
    },
    renderLoop(ctx, dest) { const bus = buildBus(ctx, dest); for (let s = 0; s < STEPS; s++) step(ctx, bus, s, 0.1 + s * STEP); return 0.1 + STEPS * STEP; },
    LOOP_SECONDS: STEPS * STEP
  };

  /* ---------------- эффекты ---------------- */
  const Snd = {
    ctx: null, master: null, sfx: null, mus: null, musicOn: true, sfxOn: true, drillG: null, windG: null, last: {},
    init() {
      if (this.ctx) return;
      const AC = g.AudioContext || g.webkitAudioContext; if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = this.sfxOn ? 0.9 : 0; this.sfx.connect(this.master);
      this.mus = ctx.createGain(); this.mus.gain.value = 0.7; this.mus.connect(this.master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0); let b = 0; for (let i = 0; i < nd.length; i++) { b = (b + (Math.random() * 2 - 1) * 0.06) * 0.985; nd[i] = b * 3.2; }
      // бур: шум + низкий тон
      const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
      this.drillG = ctx.createGain(); this.drillG.gain.value = 0.0001;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58; const og = ctx.createGain(); og.gain.value = 0.09;
      this.drillOsc = o; ns.connect(lp); lp.connect(this.drillG); o.connect(og); og.connect(this.drillG); this.drillG.connect(this.sfx); ns.start(); o.start();
      // ветер
      const ws = ctx.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.5; this.windBp = bp;
      this.windG = ctx.createGain(); this.windG.gain.value = 0.0001; ws.connect(bp); bp.connect(this.windG); this.windG.connect(this.sfx); ws.start();
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
    setMusic(on) { this.musicOn = !!on; if (!this.ctx) return; if (on) Music.start(this.ctx, this.mus); else Music.stop(); },
    setSfx(on) { this.sfxOn = !!on; if (this.sfx) this.sfx.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05); },
    drill(on, k) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.drillG.gain.setTargetAtTime(on ? 0.022 + 0.02 * (k || 0) : 0.0001, t, 0.1);
      this.drillOsc.frequency.setTargetAtTime(46 + 16 * (k || 0), t, 0.25);
    },
    wind(level, dark) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.windG.gain.setTargetAtTime(0.0001 + level * 0.022 + dark * 0.003, t, 1.2);
      this.windBp.frequency.setTargetAtTime(420 + level * 500, t, 1.2);
    },
    tone(f, dur, vol, type, t0, slide) {
      const ctx = this.ctx; if (!ctx || !this.sfxOn) return;
      const t = ctx.currentTime + (t0 || 0), gn = ctx.createGain(); env(gn, t, 0.005, vol, dur); gn.connect(this.sfx);
      const o = osc(ctx, type || 'sine', f, t, dur); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur); o.connect(gn);
    },
    noise(dur, vol, f, t0) {
      const ctx = this.ctx; if (!ctx || !this.sfxOn) return;
      const t = ctx.currentTime + (t0 || 0), s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f || 900; const gn = ctx.createGain(); env(gn, t, 0.004, vol, dur);
      s.connect(bp); bp.connect(gn); gn.connect(this.sfx); s.start(t); s.stop(t + dur + 0.05);
    },
    play(name, a) {
      if (!this.ctx || !this.sfxOn) return;
      const now = performance.now();
      const gap = { ice: 55, rock: 70, iron: 65, ti: 65, aur: 90, pick: 40 }[name] || 0;
      if (gap && this.last[name] && now - this.last[name] < gap) return;
      this.last[name] = now;
      const T = this.tone.bind(this);
      switch (name) {
        case 'click': T(880, 0.07, 0.12, 'triangle'); break;
        case 'pick': {
          const f = { ice: 1500, iron: 640, ti: 880, aur: 1320 }[a] || 900;
          T(f, 0.16, 0.12, a === 'iron' ? 'triangle' : 'sine'); T(f * 1.5, 0.12, 0.05, 'sine', 0.03);
          if (a === 'aur') { T(f * 2, 0.3, 0.05, 'sine', 0.06); T(f * 2.5, 0.3, 0.04, 'sine', 0.1); }
          break;
        }
        case 'ice': {                                   // тихий звон разбитого стекла
          const R = Math.random;
          for (let i = 0; i < 3; i++) this.noise(0.035, 0.035 + R() * 0.03, 5200 + R() * 3800, i * 0.018 + R() * 0.02);
          for (let i = 0; i < 3; i++) T(2300 + R() * 2600, 0.09 + R() * 0.06, 0.018 + R() * 0.012, 'sine', 0.01 + i * 0.03 + R() * 0.02);
          break;
        }
        case 'rock': this.noise(0.07, 0.06, 240); T(95, 0.09, 0.06, 'sine', 0, 62); break;
        case 'iron': this.noise(0.025, 0.05, 2400); T(520, 0.14, 0.06, 'triangle'); T(790, 0.12, 0.04, 'triangle', 0.012); T(1180, 0.08, 0.02, 'sine', 0.02); break;
        case 'ti': this.noise(0.02, 0.04, 3600); T(880, 0.26, 0.055, 'sine'); T(1320, 0.22, 0.04, 'sine', 0.01); T(1760, 0.18, 0.025, 'triangle', 0.02); break;
        case 'aur': [1568, 2093, 2637, 3136].forEach((f, i) => T(f, 0.32, 0.03, 'sine', i * 0.04)); break;
        case 'deliver': { const n = 4 + Math.min(5, a | 0); for (let i = 0; i < n; i++) T(880 * Math.pow(1.122, i * 2), 0.18, 0.1, 'triangle', i * 0.06); this.noise(0.15, 0.05, 6000, 0.04); break; }
        case 'build': this.noise(0.1, 0.18, 300); T(130, 0.18, 0.18, 'square', 0, 90); T(98, 0.2, 0.18, 'square', 0.14, 70); [523, 659, 784, 1047].forEach((f, i) => T(f, 0.4, 0.1, 'triangle', 0.3 + i * 0.08)); break;
        case 'node': [523, 659, 784].forEach((f, i) => T(f, 0.25, 0.11, 'triangle', i * 0.06)); break;
        case 'goal': [523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.36, 0.1, 'triangle', i * 0.07)); break;
        case 'relic': for (let i = 0; i < 7; i++) T(1000 + i * 190, 0.5, 0.06, 'sine', i * 0.05); T(1568, 0.9, 0.1, 'sine', 0.2); break;
        case 'crev': this.noise(0.25, 0.2, 180); T(80, 0.3, 0.2, 'sine', 0, 40); break;
        case 'storm': this.noise(0.8, 0.03, 500); break;
        case 'tele': T(300, 0.5, 0.14, 'sine', 0, 1400); T(1400, 0.3, 0.08, 'triangle', 0.35, 500); break;
        case 'err': T(150, 0.18, 0.15, 'square'); T(120, 0.2, 0.15, 'square', 0.1); break;
        case 'ark': [262, 330, 392, 523, 659, 784].forEach((f, i) => T(f, 1.1, 0.09, 'triangle', i * 0.1)); this.noise(0.6, 0.1, 500); break;
        case 'os': T(1175, 0.12, 0.1, 'sine'); T(1568, 0.25, 0.1, 'sine', 0.1); break;
        default: break;
      }
    }
  };

  g.Music = Music; g.Snd = Snd;
})(window);
