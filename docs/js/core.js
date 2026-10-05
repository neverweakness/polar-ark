'use strict';
/* Ядро «Полярного Ковчега»: мир, добыча, экономика, постройки, дерево, ковчег, контракты, престиж.
   Без DOM: работает и в браузере, и в Node (headless-бот, симулятор). */
(function (g) {
  const D = g.DATA, T = D.T;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function rng32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /* ---------------- мир ---------------- */
  function genWorld(seed, rich) {
    const W = D.W, H = D.H, CX = D.CX, CY = D.CY;
    const t = new Uint8Array(W * H);
    const R = rng32(seed);
    const idx = (x, y) => y * W + x;
    const ringOf = (d) => (d < D.RING1 ? 1 : d < D.RING2 ? 2 : d < D.RING3 ? 3 : 4);
    const ringPos = (lo, hi) => {
      const a = R() * Math.PI * 2, d = lo + R() * (hi - lo);
      return [CX + Math.cos(a) * d, CY + Math.sin(a) * d];
    };
    const blob = (cx, cy, r, fn) => {
      for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) continue;
        const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) * (0.78 + 0.5 * vnoise(x * 0.55, y * 0.55, seed));
        if (dd < r) fn(x, y, dd / r);
      }
    };
    const rb = rich ? 1.35 : 1;
    // руда по зоне: возвращает тип тайла внутри каменного массива/кармана
    const orePick = (ring) => {
      const r = R();
      if (ring === 1) return r < 0.62 * rb ? T.IRON : T.ROCK;
      if (ring === 2) return r < 0.25 * rb ? T.IRON : r < 0.7 * rb ? T.TI : T.ROCK;
      if (ring === 3) return r < 0.1 * rb ? T.IRON : r < 0.42 * rb ? T.TI : r < 0.84 * rb ? T.AUR : T.ROCK;
      return r < 0.28 * rb ? T.TI : r < 0.86 * rb ? T.AUR : T.ROCK;
    };
    // 1) макро-рельеф: открытый снег, ледяные поля, каменные массивы (чем дальше, тем больше твёрдого)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - CX, y + 0.5 - CY);
      if (d < D.CLEAR + 1) continue;
      const n = 0.5 * vnoise(x * 0.05, y * 0.05, seed) + 0.32 * vnoise(x * 0.13 + 31, y * 0.13 + 17, seed + 1) + 0.18 * vnoise(x * 0.31 + 7, y * 0.31 + 3, seed + 2);
      const k = Math.min(0.17, d / 800);
      let tile = T.SNOW;
      if (n > 0.64 - k) tile = T.ROCK; else if (n > 0.52 - k) tile = T.ICE;
      t[idx(x, y)] = tile;
    }
    // 1б) островки льда и камня в снежных пустошах: нигде нет больших пустых мест
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
      if (t[idx(x, y)] !== T.SNOW) continue;
      const d = Math.hypot(x + 0.5 - CX, y + 0.5 - CY);
      if (d < D.CLEAR + 4 || R() > 0.0042 + Math.min(0.004, d / 40000)) continue;
      const rock = R() < 0.35, ring = ringOf(d);
      blob(x, y, 1.5 + R() * 2.0, (xx, yy) => { if (t[idx(xx, yy)] === T.SNOW) t[idx(xx, yy)] = rock ? (R() < 0.5 ? orePick(ring) : T.ROCK) : T.ICE; });
    }
    // 2) жилы в каменных массивах (шум жил + зона)
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (t[idx(x, y)] !== T.ROCK) continue;
      const d = Math.hypot(x + 0.5 - CX, y + 0.5 - CY);
      const v = vnoise(x * 0.27 + 5, y * 0.27 + 9, seed + 7);
      if (v > 0.66 - (rb - 1) * 0.1) { const o = orePick(ringOf(d)); t[idx(x, y)] = o; }
    }
    // 3) лёд рядом с лагерем: быстрый старт
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + R() * 0.7;
      blob(CX + Math.cos(a) * 19.5, CY + Math.sin(a) * 19.5, 4.4, (x, y) => { t[idx(x, y)] = T.ICE; });
    }
    // 4) богатые карманы руды (кластеры) по зонам
    const clusters = [[1, 18, D.RING1 - 0.5, 70], [2, D.RING1 + 0.5, D.RING2 - 0.5, 150], [3, D.RING2 + 0.5, D.RING3 - 0.5, 190], [4, D.RING3 + 0.5, 142, 170]];
    clusters.forEach(([ring, lo, hi, n]) => {
      for (let i = 0; i < n; i++) {
        const [cx, cy] = ringPos(lo, hi);
        const r = 2.4 + R() * 2.4;
        blob(cx, cy, r, (x, y, f) => { t[idx(x, y)] = f < 0.8 ? (R() < 0.62 ? orePick(ring) : T.ROCK) : T.ROCK; });
      }
    });
    // 5) кристальные пещеры (пустота внутри, аврора по краю): дальние зоны
    for (let i = 0; i < 46; i++) {
      const [cx, cy] = ringPos(D.RING2 + 4, 140);
      blob(cx, cy, 5.2, (x, y, f) => { t[idx(x, y)] = f < 0.34 ? T.VOID : f < 0.62 ? (R() < 0.55 ? T.AUR : T.ROCK) : T.ROCK; });
    }
    // 6) трещины (опасные), длинные
    for (let i = 0; i < 140; i++) {
      let [x, y] = ringPos(D.RING1, 140);
      let a = R() * Math.PI * 2;
      const len = 8 + Math.floor(R() * 14);
      for (let k = 0; k < len; k++) {
        a += (R() - 0.5) * 0.7; x += Math.cos(a); y += Math.sin(a);
        const xi = Math.floor(x), yi = Math.floor(y);
        if (xi > 3 && yi > 3 && xi < W - 4 && yi < H - 4 && t[idx(xi, yi)] === T.SNOW) {
          t[idx(xi, yi)] = T.CREV;
          if (R() < 0.35 && t[idx(xi + 1, yi)] === T.SNOW) t[idx(xi + 1, yi)] = T.CREV;
        }
      }
    }
    // 7) находки: во льду (редко) и «руины» с россыпью находок в дальних зонах
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (t[idx(x, y)] === T.ICE && R() < 0.0028) t[idx(x, y)] = T.RELIC;
    }
    for (let i = 0; i < 30; i++) {
      const [cx, cy] = ringPos(D.RING1, 138);
      blob(cx, cy, 3.4, (x, y) => { t[idx(x, y)] = R() < 0.4 ? T.RELIC : T.ICE; });
    }
    for (let i = 0; i < 6; i++) {
      const [cx, cy] = ringPos(D.CLEAR + 3, 24);
      blob(cx, cy, 2.2, (x, y) => { if (t[idx(x, y)] === T.SNOW || t[idx(x, y)] === T.ICE) t[idx(x, y)] = T.ICE; });
      t[idx(Math.floor(cx), Math.floor(cy))] = T.RELIC;
    }
    // 8) лагерь и граница
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (Math.hypot(x + 0.5 - CX, y + 0.5 - CY) < D.CLEAR) t[idx(x, y)] = T.SNOW;
    }
    for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) { t[idx(x, k)] = T.EDGE; t[idx(x, H - 1 - k)] = T.EDGE; }
    for (let y = 0; y < H; y++) for (let k = 0; k < 3; k++) { t[idx(k, y)] = T.EDGE; t[idx(W - 1 - k, y)] = T.EDGE; }
    return { t, d: new Float32Array(W * H), seed };
  }

  /* ---------------- создание игры ---------------- */
  function freshState(now) {
    return {
      v: 1, ts: now, seed: (Math.random() * 1e9) | 0, coins: 0, earned: 0, earnedAll: 0, os: 0, osGot: 0, sci: 0,
      b: {}, lv: {}, tier: 0, tmax: 0, gi: 0, contracts: [], relics: {},
      ark: { stage: 0, have: { iron: 0, ti: 0, aur: 0 }, save: 1 },
      leg: { pts: 0, perks: {}, season: 1, mod: 'calm' },
      daily: { last: '', streak: 0 }, ads: { day: '', n: {} }, lastInter: 0,
      set: { music: 1, sound: 1 },
      st: { mined: { ice: 0, iron: 0, ti: 0, aur: 0 }, trips: 0, cdone: 0, relics: 0, dist: 0, play: 0, launches: 0, delivered: 0 },
      heat: 100, cargo: { ice: 0, iron: 0, ti: 0, aur: 0 }, eps: 1.5, tut: 0, noads: 0, tokens: [], zs: 1
    };
  }

  function create(saved, now) {
    now = now || Date.now();
    const G = { D, onEvent: null, now };
    const S = G.S = freshState(now);
    if (saved && saved.v === 1) {
      Object.keys(saved).forEach((k) => {
        if (k === 'st' || k === 'set' || k === 'leg' || k === 'ark' || k === 'daily' || k === 'ads') Object.assign(S[k], saved[k]);
        else S[k] = saved[k];
      });
      ['mined'].forEach((k) => { S.st[k] = Object.assign({ ice: 0, iron: 0, ti: 0, aur: 0 }, saved.st && saved.st[k]); });
      S.ark.have = Object.assign({ iron: 0, ti: 0, aur: 0 }, saved.ark && saved.ark.have);
      S.cargo = Object.assign({ ice: 0, iron: 0, ti: 0, aur: 0 }, saved.cargo);
    }
    const emit = (type, data) => { if (G.onEvent) G.onEvent(type, data || {}); };
    G.emit = emit;

    G.world = genWorld(S.seed, S.leg.mod === 'rich');
    G.V = { x: D.CX + 0.5, y: D.CY + 3.5, a: -Math.PI / 2, drilling: false, full: false, moving: false, crevT: 0, lastTile: -1 };
    G.env = { t: 0, ph: 0.04, storm: 0, stormT: 0, next: 190 + Math.random() * 60, dur: 0, night: 0 };
    G.tmr = { tele: 0, thermo: 0, reson: 0, stacks: 0, tick: 0, goalT: 0, since: 0 };
    G.dirty = true;
    G.stat = {};
    G.hot = new Map(); G.expW = Math.ceil(D.W / 4); G.exp = new Uint8Array(G.expW * G.expW); G.zone = 0; G.zoneAnn = false;

    const has = (id) => !!S.b[id];
    const lv = (id) => S.lv[id] || 0;
    const perk = (id) => S.leg.perks[id] || 0;
    G.has = has; G.lv = lv; G.perk = perk;

    /* ----- производные характеристики ----- */
    G.recalc = function () {
      const tier = D.TIERS[S.tier], mod = S.leg.mod;
      const st = G.stat;
      const lt = S.leg.tot || 0;
      st.power = tier.power * (1 + 0.2 * lv('b_power')) * (1 + 0.08 * perk('p_power')) * (1 + 0.01 * lt) * (mod === 'rich' ? 0.85 : 1);
      st.speed = tier.speed * (1 + 0.06 * lv('b_speed'));
      st.radius = tier.radius + 0.14 * lv('b_width');
      st.hmul = 1 - 0.08 * lv('b_deep');
      st.iceMul = lv('x_ice') ? 0.5 : 1;
      st.cap = Math.round((60 + 30 * lv('c_cap') + tier.cap) * (1 + 0.08 * perk('p_haul')) * (has('storage') ? 1.25 : 1));
      st.iceVol = 1 - 0.1 * lv('c_press');
      st.luck = 0.06 * lv('c_luck');
      st.heatMax = Math.round((100 + 12 * lv('s_heat') + 10 * perk('p_heat') + (has('boiler') ? 25 : 0)) * (mod === 'cold' ? 0.75 : 1));
      st.heatUse = (has('power') ? 0.85 : 1) * (1 - 0.06 * lv('s_eco')) * (lv('x_ice') ? 1.25 : 1) * (mod === 'cold' ? 1.15 : 1);
      st.relicN = Object.keys(S.relics).length;
      st.coinMult = (1 + 0.06 * lv('c_value')) * (1 + 0.04 * perk('p_ore')) * (1 + 0.015 * lt) * (1 + D.RELIC_BONUS * st.relicN) * (lv('x_pantry') ? 1.1 : 1);
      st.stormYield = 0.1 + 0.18 * lv('s_storm') + (mod === 'storms' ? 0.15 : 0);
      st.eye = (1 + 0.12 * lv('s_eye')) * (has('power') ? 1.1 : 1);
      st.slots = 3 + perk('p_contract') + (has('habitat') ? 1 : 0);
      st.offCap = (2 + perk('p_off') + (has('habitat') ? 2 : 0)) * 3600;
      G.dirty = false;
    };
    G.cargoUsed = () => S.cargo.ice * G.stat.iceVol + S.cargo.iron + S.cargo.ti + S.cargo.aur;

    /* ----- мир ----- */
    const W = D.W;
    const tileAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= D.H ? T.EDGE : G.world.t[y * W + x]);
    G.tileAt = tileAt;
    const solid = (x, y) => D.SOLID[tileAt(x, y)] === 1;
    const hitsSolid = (px, py, r) => {
      for (let ty = Math.floor(py - r); ty <= Math.floor(py + r); ty++) for (let tx = Math.floor(px - r); tx <= Math.floor(px + r); tx++) {
        if (!solid(tx, ty)) continue;
        const dx = px - clamp(px, tx, tx + 1), dy = py - clamp(py, ty, ty + 1);
        if (dx * dx + dy * dy < r * r) return true;
      }
      return false;
    };
    G.dist = (x, y) => Math.hypot(x - (D.CX + 0.5), y - (D.CY + 0.5));
    G.padOf = (b) => [D.CX + 0.5 + b.pos[0], D.CY + 0.5 + b.pos[1]];

    /* ----- окружение: сутки и метели ----- */
    G.nightOf = (ph) => {
      const m = S.leg.mod === 'night';
      const a = m ? 0.46 : 0.56, b = m ? 0.58 : 0.68, c = m ? 0.92 : 0.88, d = 1.0;
      if (ph < a) return 0;
      if (ph < b) return smooth(a, b, ph);
      if (ph < c) return 1;
      return 1 - smooth(c, d, ph);
    };
    G.dark = () => Math.max(G.env.night, G.env.storm * 0.8);
    G.vis = () => { const d = G.dark(); return 16 * (1 - d) + 6.4 * G.stat.eye * d; };
    G.stormIn = () => Math.max(0, G.env.next - G.env.t);

    /* ----- запасы руды и «подвижка льдов» ----- */
    G.ore = { ice: 0, iron: 0, ti: 0, aur: 0 };
    G.countOre = () => {
      G.ore = { ice: 0, iron: 0, ti: 0, aur: 0 };
      const t = G.world.t; const m = { 1: 'ice', 3: 'iron', 4: 'ti', 5: 'aur' };
      for (let i = 0; i < t.length; i++) { const k = m[t[i]]; if (k) G.ore[k]++; }
    };
    let ORE_TARGET = { ice: 2200, iron: 420, ti: 360, aur: 240 };
    const ORE_RING = { ice: [14, 135], iron: [16, 75], ti: [32, 125], aur: [62, 140] };
    const ORE_TILE = { ice: T.ICE, iron: T.IRON, ti: T.TI, aur: T.AUR };
    G.spawnCluster = (kind) => {
      const t = G.world.t, V = G.V, cx0 = D.CX + 0.5, cy0 = D.CY + 0.5;
      for (let tries = 0; tries < 24; tries++) {
        const a = Math.random() * Math.PI * 2, d = ORE_RING[kind][0] + Math.random() * (ORE_RING[kind][1] - ORE_RING[kind][0]);
        const cx = cx0 + Math.cos(a) * d, cy = cy0 + Math.sin(a) * d;
        if (cx < 8 || cy < 8 || cx > D.W - 8 || cy > D.H - 8 || Math.hypot(cx - V.x, cy - V.y) < 20) continue;
        const r = kind === 'ice' ? 3 + Math.random() * 4 : 2.4 + Math.random() * 2;
        for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
          if (x < 4 || y < 4 || x >= D.W - 4 || y >= D.H - 4) continue;
          if (Math.hypot(x + 0.5 - cx0, y + 0.5 - cy0) < D.CLEAR + 1) continue;
          const cur = t[y * D.W + x];
          if (cur !== T.SNOW && cur !== T.ICE && cur !== T.ROCK && cur !== T.DUG && cur !== T.CREV) continue;
          const f = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) * (0.78 + 0.5 * vnoise(x * 0.55, y * 0.55, S.seed)) / r;
          if (f >= 1) continue;
          if (kind === 'ice') t[y * D.W + x] = Math.random() < 0.012 ? T.RELIC : T.ICE;
          else t[y * D.W + x] = f < 0.8 && Math.random() < 0.68 ? ORE_TILE[kind] : T.ROCK;
          G.world.d[y * D.W + x] = 0;
        }
        G.countOre();
        return true;
      }
      return false;
    };
    G.respawnTick = () => {
      for (const k of ['aur', 'ti', 'iron', 'ice']) if (G.ore[k] < ORE_TARGET[k] * 0.8) { if (G.spawnCluster(k)) return; }
    };

    /* ----- награды и очки ----- */
    G.gain = (c, silent) => {
      if (c <= 0) return;
      S.coins += c; S.earned += c; S.earnedAll += c;
      let n = 0;
      while (S.earned >= D.osNeed(S.osGot)) { S.osGot++; S.os++; n++; }
      if (n) emit('os', { n });
      if (!silent) emit('coins', { c });
    };
    G.spend = (c) => { if (S.coins < c) return false; S.coins -= c; return true; };
    G.addSci = (n) => { S.sci += n; emit('sci', { n }); };

    /* ----- добыча ----- */
    function pickRelic() {
      const have = S.relics;
      const pool = D.RELICS.map((r) => ({ r, w: (4 - r.rare) * (have[r.id] ? 1 : 3) }));
      let tot = 0; pool.forEach((p) => { tot += p.w; });
      let x = Math.random() * tot;
      for (const p of pool) { x -= p.w; if (x <= 0) return p.r; }
      return pool[0].r;
    }
    function breakTile(tx, ty, type) {
      G.world.t[ty * W + tx] = T.DUG;
      G.world.d[ty * W + tx] = 0; G.hot.delete(ty * W + tx);
      const ok = { 1: 'ice', 3: 'iron', 4: 'ti', 5: 'aur' }[type]; if (ok) G.ore[ok]--;
      const e = G.env, st = G.stat;
      let res = D.YIELD[type];
      if (type === T.RELIC) {
        const r = pickRelic(); const first = !S.relics[r.id];
        S.relics[r.id] = (S.relics[r.id] || 0) + 1;
        S.st.relics++; G.dirty = true;
        if (has('dome')) G.addSci(1); else if (first && S.st.relics % 3 === 0) G.addSci(1);
        emit('relic', { id: r.id, first, x: tx + 0.5, y: ty + 0.5 });
        return;
      }
      if (!res) { emit('break', { x: tx + 0.5, y: ty + 0.5, type }); return; }
      let n = res === 'ice' ? 1 : 1 + Math.min(3, Math.floor(Math.hypot(tx + 0.5 - (D.CX + 0.5), ty + 0.5 - (D.CY + 0.5)) / 55));
      let extra = res === 'ice' ? 0 : st.luck;
      if (e.storm > 0.3 && res !== 'ice') extra += st.stormYield;
      if (res === 'aur') extra += e.night * 0.2;
      if (Math.random() < extra) n++;
      const vol = res === 'ice' ? st.iceVol : 1;
      const room = Math.max(0, st.cap - G.cargoUsed());
      n = Math.min(n, Math.floor(room / vol + 0.0001));
      if (n <= 0) { emit('break', { x: tx + 0.5, y: ty + 0.5, type }); return; }
      S.cargo[res] += n; S.st.mined[res] += n;
      if (res !== 'ice' && lv('b_reson')) { G.tmr.stacks = Math.min(3, G.tmr.stacks + 1); G.tmr.reson = 4; }
      emit('pick', { x: tx + 0.5, y: ty + 0.5, res, n, type });
    }
    G.tileHp = (type, x, y) => D.HP[type] * (type === T.ICE ? G.stat.iceMul : G.stat.hmul) * (1 + Math.hypot(x + 0.5 - (D.CX + 0.5), y + 0.5 - (D.CY + 0.5)) / D.HPDIST);
    function drill(dt, dirx, diry) {
      const V = G.V, st = G.stat;
      const cx = V.x + dirx * 0.55, cy = V.y + diry * 0.55, rad = st.radius;
      const frozen = S.heat <= 0 && G.tmr.thermo <= 0;
      let pw = st.power * (frozen ? 0.5 : 1) * (G.tmr.thermo > 0 ? 1.5 : 1) * (1 + 0.06 * lv('b_reson') * G.tmr.stacks);
      let any = false, full = G.cargoUsed() >= st.cap - 0.001;
      V.full = false;
      for (let ty = Math.floor(cy - rad); ty <= Math.floor(cy + rad); ty++) for (let tx = Math.floor(cx - rad); tx <= Math.floor(cx + rad); tx++) {
        const type = tileAt(tx, ty);
        if (D.SOLID[type] !== 1 || type === T.EDGE) continue;
        const dx = cx - clamp(cx, tx, tx + 1), dy = cy - clamp(cy, ty, ty + 1);
        if (dx * dx + dy * dy >= rad * rad) continue;
        const isYield = D.YIELD[type] !== undefined;
        if (full && isYield) V.full = true;
        let hp = G.tileHp(type, tx, ty);
        const i = ty * W + tx;
        G.world.d[i] += pw * dt; G.hot.set(i, G.env.t);
        any = true;
        if (G.world.d[i] >= hp) breakTile(tx, ty, type);
      }
      return any;
    }

    /* ----- доставка ----- */
    G.deliver = () => {
      const st = G.stat, c = S.cargo;
      const units = c.ice + c.iron + c.ti + c.aur;
      if (units <= 0) return 0;
      const smelt = has('forge');
      let total = 0;
      ['ice', 'iron', 'ti', 'aur'].forEach((r) => {
        let u = c[r]; if (u <= 0) return;
        if (S.ark.save && has('yard') && S.ark.stage < D.ARK.length && r !== 'ice') {
          if (r === 'aur' || smelt) {
            const need = Math.max(0, G.arkReq(S.ark.stage)[r] - S.ark.have[r]);
            const take = Math.min(need, u); S.ark.have[r] += take; u -= take;
          }
        }
        let v = D.RES[r].val;
        if (smelt && (r === 'iron' || r === 'ti')) {
          v *= D.SMELT_MULT;
          const p = 0.06 * lv('c_smelt2');
          if (p > 0) { let ex = u * p; const w = Math.floor(ex); ex = w + (Math.random() < ex - w ? 1 : 0); u += ex; }
        }
        total += u * v;
      });
      total = Math.round(total * st.coinMult);
      S.contracts.forEach((k) => { if (!k.done) { k.got = Math.min(k.n, k.got + c[k.r]); if (k.got >= k.n) k.done = 1; } });
      const secs = clamp(G.tmr.since, 8, 300);
      S.eps = S.eps * 0.75 + (total / secs) * 0.25;
      G.tmr.since = 0;
      S.st.trips++; S.st.delivered += units;
      c.ice = c.iron = c.ti = c.aur = 0;
      S.last = total;
      if (lv('x_pantry')) S.heat = Math.min(st.heatMax, S.heat + 20);
      G.gain(total, true);
      emit('deliver', { coins: total, units });
      return total;
    };

    /* ----- обновление ----- */
    G.update = (dt, inp) => {
      if (G.dirty) G.recalc();
      const st = G.stat, V = G.V, e = G.env, tm = G.tmr;
      S.st.play += dt; tm.since += dt; e.t += dt; G.now += dt * 1000;
      // сутки
      e.ph = (0.04 + e.t / D.DAYLEN) % 1;
      e.night = G.nightOf(e.ph);
      // метели
      if (e.dur > 0) {
        e.stormT += dt;
        const ramp = Math.min(1, e.stormT / 6, (e.dur - e.stormT) / 6);
        e.storm = clamp(ramp, 0, 1);
        if (e.stormT >= e.dur) { e.dur = 0; e.storm = 0; const f = S.leg.mod === 'storms' ? 0.5 : 1; e.next = e.t + (190 + Math.random() * 230) * f; emit('storm', { on: false }); }
      } else if (e.t >= e.next) {
        e.dur = 45 + Math.random() * 30; e.stormT = 0; emit('storm', { on: true });
      }
      if (tm.tele > 0) tm.tele -= dt;
      if (tm.thermo > 0) tm.thermo -= dt;
      if (tm.reson > 0) { tm.reson -= dt; if (tm.reson <= 0) tm.stacks = 0; }
      // движение
      const ix = inp ? inp.x : 0, iy = inp ? inp.y : 0, m = Math.min(1, Math.hypot(ix, iy));
      const frozen = S.heat <= 0 && tm.thermo <= 0;
      V.moving = m > 0.08;
      let drilling = false;
      if (V.moving) {
        const ta = Math.atan2(iy, ix);
        let da = ta - V.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        V.a += clamp(da, -9 * dt, 9 * dt);
        const dx = Math.cos(V.a), dy = Math.sin(V.a);
        drilling = drill(dt, dx, dy);
        let sp = st.speed * (frozen ? 0.45 : 1) * (0.55 + 0.45 * m) * (Math.abs(da) > 1.3 ? 0.55 : 1);
        const r = 0.34;
        const nx = V.x + dx * sp * dt, ny = V.y + dy * sp * dt;
        if (!hitsSolid(nx, V.y, r)) V.x = nx;
        if (!hitsSolid(V.x, ny, r)) V.y = ny;
        const d = G.dist(V.x, V.y); if (d > S.st.dist) S.st.dist = d;
      } else V.full = false;
      V.drilling = drilling;
      { // карта исследованного: ячейки 4×4 тайла
        const cw = G.expW, r = Math.ceil(G.vis() / 4);
        const cx0 = Math.floor(V.x / 4), cy0 = Math.floor(V.y / 4);
        for (let yy = cy0 - r; yy <= cy0 + r; yy++) for (let xx = cx0 - r; xx <= cx0 + r; xx++) {
          if (xx < 0 || yy < 0 || xx >= cw || yy >= cw) continue;
          if ((xx - cx0) * (xx - cx0) + (yy - cy0) * (yy - cy0) <= r * r) G.exp[yy * cw + xx] = 1;
        }
      }
      // трещина
      const ti = Math.floor(V.y) * W + Math.floor(V.x);
      if (ti !== V.lastTile) {
        V.lastTile = ti;
        if (tileAt(Math.floor(V.x), Math.floor(V.y)) === T.CREV && V.crevT <= 0) {
          V.crevT = 1.5;
          const keys = ['ice', 'iron', 'ti', 'aur']; let lost = 0;
          const tot = keys.reduce((a, k) => a + S.cargo[k], 0), want = Math.max(1, Math.floor(tot * 0.08));
          for (let k = 0; k < want && lost < tot; k++) { const pool = keys.filter((q) => S.cargo[q] > 0); if (!pool.length) break; S.cargo[pool[(Math.random() * pool.length) | 0]]--; lost++; }
          S.heat = Math.max(0, S.heat - 6);
          emit('crev', { lost });
        }
      }
      if (V.crevT > 0) V.crevT -= dt;
      // тепло
      const dB = G.dist(V.x, V.y);
      const zn = D.zoneOf(dB);
      if (zn !== G.zone) { G.zone = zn; const bit = 1 << zn; if (!(S.zs & bit)) { S.zs |= bit; emit('zone', { z: zn, up: true }); } }
      const envUse = (1 + 0.3 * e.night + (has('meteo') ? 0.25 : 0.5) * e.storm) * D.ZONE_COLD[zn];
      if (tm.thermo <= 0) {
        const use = (drilling ? 2.1 : V.moving ? 0.55 : 0) * st.heatUse * envUse;
        S.heat = Math.max(0, S.heat - use * dt);
      } else S.heat = st.heatMax;
      if (dB < 10.4) {
        const rate = has('boiler') ? 45 : 7;
        if (S.heat < st.heatMax) S.heat = Math.min(st.heatMax, S.heat + rate * dt);
      }
      if (S.heat > st.heatMax) S.heat = st.heatMax;
      // доставка
      if (dB < 3.4 && G.cargoUsed() > 0) G.deliver();
      // периодические проверки
      tm.tick += dt;
      if (tm.tick >= 0.5) {
        tm.tick = 0; G.check();
        G.hot.forEach((tt, i) => { if (e.t - tt > 1.1) { const d = G.world.d; d[i] *= 0.55; if (d[i] < 0.05) { d[i] = 0; G.hot.delete(i); } } });
      }
    };

    /* ----- цели ----- */
    G.goalProg = (gl) => {
      switch (gl.t) {
        case 'mine': return [S.st.mined[gl.r], gl.n];
        case 'deliver': return [S.st.trips, gl.n];
        case 'build': return [has(gl.id) ? 1 : 0, 1];
        case 'buy': return [lv(gl.id), gl.n];
        case 'earn': return [S.earned, gl.n];
        case 'contract': return [S.st.cdone, gl.n];
        case 'relic': return [G.stat.relicN || 0, gl.n];
        case 'ark': return [S.ark.stage, gl.n];
        case 'tier': return [S.tmax, gl.n];
        default: return [0, 1];
      }
    };
    G.goal = () => {
      const gl = D.GOALS[Math.min(S.gi, D.GOALS.length - 1)];
      const [cur, need] = G.goalProg(gl);
      return { g: gl, i: S.gi, cur: Math.min(cur, need), need, ready: cur >= need && S.gi < D.GOALS.length, all: S.gi >= D.GOALS.length };
    };
    G.claimGoal = () => {
      const o = G.goal(); if (!o.ready) return false;
      const gl = o.g;
      G.gain(gl.rc || 0, true); if (gl.rs) G.addSci(gl.rs);
      S.gi++;
      emit('goal', { rc: gl.rc || 0, rs: gl.rs || 0, i: S.gi });
      return true;
    };
    G.check = () => {
      if (!S.contracts.length && has('radio')) G.refillContracts();
      G.respawnTick();
      const o = G.goal();
      if (o.ready && !G._goalNotified) { G._goalNotified = true; emit('goalReady', {}); }
      if (!o.ready) G._goalNotified = false;
    };

    /* ----- постройки ----- */
    G.canBuild = (id) => { const b = D.BUILD.find((x) => x.id === id); return !!b && !has(id) && S.os >= b.cost; };
    G.build = (id) => {
      const b = D.BUILD.find((x) => x.id === id);
      if (!b || has(id) || S.os < b.cost) return false;
      S.os -= b.cost; S.b[id] = 1; G.dirty = true;
      if (id === 'radio') G.refillContracts();
      emit('build', { id });
      return true;
    };

    /* ----- Созвездие ----- */
    G.nodeState = (n) => {
      const L = lv(n.id);
      if (!has('hangar')) return { st: 'locked', why: 'hangar', lv: L };
      if (n.key && !has('dome')) return { st: 'locked', why: 'dome', lv: L };
      if (n.need && !has(n.need)) return { st: 'locked', why: n.need, lv: L };
      for (const [id, l] of n.req) if (lv(id) < l) return { st: 'locked', why: 'req', lv: L, req: [id, l] };
      if (L >= n.max) return { st: 'max', lv: L };
      const cost = D.nodeCost(n, L);
      return { st: 'open', lv: L, cost, sci: n.sci || 0, can: S.coins >= cost && S.sci >= (n.sci || 0) };
    };
    G.buyNode = (id) => {
      const n = D.NODES.find((x) => x.id === id); if (!n) return false;
      const s = G.nodeState(n);
      if (s.st !== 'open' || !s.can) return false;
      S.coins -= s.cost; S.sci -= s.sci;
      S.lv[id] = s.lv + 1; G.dirty = true; G.recalc();
      if (id === 's_heat' || id === 'p_heat') S.heat = Math.min(G.stat.heatMax, S.heat + 12);
      emit('node', { id, lv: S.lv[id] });
      return true;
    };
    G.buyTier = (i) => {
      const t = D.TIERS[i];
      if (!t) return false;
      if (i <= S.tmax) { S.tier = i; G.dirty = true; G.recalc(); emit('tier', { i }); return true; }
      if (i !== S.tmax + 1) return false;
      if (t.req && !has(t.req)) return false;
      if (!G.spend(t.cost)) return false;
      S.tmax = i; S.tier = i; G.dirty = true; G.recalc();
      emit('tier', { i, bought: true });
      return true;
    };

    /* ----- ковчег ----- */
    G.arkReq = (stage) => {
      const s = D.ARK[Math.min(stage, D.ARK.length - 1)], f = 1 - 0.05 * perk('p_ark');
      return { iron: Math.ceil(s.iron * f), ti: Math.ceil(s.ti * f), aur: Math.ceil(s.aur * f), coins: s.coins };
    };
    G.arkReady = () => {
      if (S.ark.stage >= D.ARK.length) return false;
      const s = G.arkReq(S.ark.stage);
      return S.ark.have.iron >= s.iron && S.ark.have.ti >= s.ti && S.ark.have.aur >= s.aur && S.coins >= s.coins;
    };
    G.arkBuild = () => {
      if (!has('yard') || !G.arkReady()) return false;
      const s = G.arkReq(S.ark.stage);
      S.coins -= s.coins;
      S.ark.have.iron -= s.iron; S.ark.have.ti -= s.ti; S.ark.have.aur -= s.aur;
      S.ark.stage++;
      G.addSci(3);
      emit('ark', { stage: S.ark.stage, done: S.ark.stage >= D.ARK.length });
      return true;
    };
    G.legacyGain = (modId) => {
      const mod = D.MODS.find((m) => m.id === modId) || D.MODS[0];
      return Math.floor((8 + 1.6 * Math.sqrt(S.earned / 600)) * mod.mult * (1 + 0.15 * (S.leg.season - 1)));
    };
    G.launch = (modId) => {
      if (S.ark.stage < D.ARK.length) return false;
      const gain = G.legacyGain(modId);
      const keep = { relics: S.relics, leg: S.leg, daily: S.daily, ads: S.ads, set: S.set, st: S.st, earnedAll: S.earnedAll, sci: S.sci, tut: S.tut, lastInter: S.lastInter, eps: S.eps, noads: S.noads, tokens: S.tokens };
      const fs = freshState(now);
      Object.assign(S, fs, keep);
      S.leg.pts += gain; S.leg.tot = (S.leg.tot || 0) + gain; S.leg.season++; S.leg.mod = modId; S.st.launches++;
      S.seed = (Math.random() * 1e9) | 0;
      S.coins = 150 * perk('p_start');
      const pb = perk('p_build'); ['hangar', 'boiler', 'radio'].slice(0, pb).forEach((id) => { S.b[id] = 1; });
      const pt = perk('p_tier'); if (pt) { S.tmax = pt; S.tier = pt; }
      S.gi = 3; S.heat = 100; S.cargo = { ice: 0, iron: 0, ti: 0, aur: 0 };
      G.dirty = true; G.recalc(); S.heat = G.stat.heatMax;
      G.world = genWorld(S.seed, S.leg.mod === 'rich'); G.hot = new Map(); G.exp = new Uint8Array(G.expW * G.expW); G.zone = 0; G.countOre(); ORE_TARGET = { ice: G.ore.ice * 0.75, iron: G.ore.iron * 0.75, ti: G.ore.ti * 0.75, aur: G.ore.aur * 0.75 };
      G.V.x = D.CX + 0.5; G.V.y = D.CY + 3.5;
      G.env.t = 0; G.env.storm = 0; G.env.dur = 0; G.env.next = 190;
      emit('season', { gain });
      return true;
    };
    G.perkState = (p) => { const L = perk(p.id); return { lv: L, max: L >= p.max, cost: D.perkCost(p, L), can: S.leg.pts >= D.perkCost(p, L) && L < p.max }; };
    G.buyPerk = (id) => {
      const p = D.PERKS.find((x) => x.id === id); if (!p) return false;
      const s = G.perkState(p); if (!s.can) return false;
      S.leg.pts -= s.cost; S.leg.perks[id] = s.lv + 1; G.dirty = true; G.recalc();
      emit('perk', { id });
      return true;
    };

    /* ----- контракты ----- */
    G.genContract = () => {
      const e = S.earned;
      const opts = e < 300 ? ['ice'] : e < 3500 ? ['ice', 'iron'] : e < 25000 ? ['iron', 'ti'] : ['iron', 'ti', 'aur'];
      let r = opts[(Math.random() * opts.length) | 0];
      const target = clamp(120 + e * 0.05, 120, 70000);
      let n = Math.max(6, Math.round(target / D.RES[r].val));
      n = Math.min(n, r === 'ice' ? 220 : 400);
      const rc = Math.round(n * D.RES[r].val * 1.8);
      return { r, n, got: 0, rc, rs: (r === 'ti' || r === 'aur') && Math.random() < 0.6 ? 1 : 0, done: 0, t0: G.env.t };
    };
    G.refillContracts = () => { G.recalc(); while (S.contracts.length < G.stat.slots) S.contracts.push(G.genContract()); };
    G.claimContract = (i) => {
      const k = S.contracts[i]; if (!k || !k.done) return false;
      const fast = G.env.t - k.t0 < 240;
      const rc = Math.round(k.rc * (fast ? 1.3 : 1));
      G.gain(rc, true); if (k.rs) G.addSci(k.rs);
      S.st.cdone++;
      S.contracts[i] = G.genContract();
      emit('contractDone', { rc, rs: k.rs, fast });
      return true;
    };
    G.rerollContract = (i) => { if (S.contracts[i]) { S.contracts[i] = G.genContract(); return true; } return false; };

    /* ----- радио ----- */
    G.teleport = () => {
      if (!has('radio') || G.tmr.tele > 0) return false;
      G.V.x = D.CX + 0.5; G.V.y = D.CY + 3.5; G.tmr.tele = 40;
      emit('teleport', {});
      return true;
    };

    /* ----- реклама / награды ----- */
    const dayStr = (t) => new Date(t).toISOString().slice(0, 10);
    G.today = () => dayStr(G.now);
    G.boostLeft = (k) => {
      if (S.ads.day !== G.today()) { S.ads.day = G.today(); S.ads.n = {}; }
      return D.BOOSTS[k].limit - (S.ads.n[k] || 0);
    };
    G.applyBoost = (k) => {
      if (G.boostLeft(k) <= 0) return false;
      S.ads.n[k] = (S.ads.n[k] || 0) + 1;
      if (k === 'double') { const add = S.last || 0; G.gain(add, true); emit('boost', { k, v: add }); }
      else if (k === 'heat') { G.tmr.thermo = 90; S.heat = G.stat.heatMax; emit('boost', { k, v: 90 }); }
      else if (k === 'coins') { const add = Math.round(Math.max(150, S.eps * 360)); G.gain(add, true); emit('boost', { k, v: add }); }
      else if (k === 'sci') { G.addSci(1); emit('boost', { k, v: 1 }); }
      return true;
    };
    G.canInter = (nowMs) => {
      if (S.st.play < D.AD.firstAfter) return false;
      return nowMs - S.lastInter > D.AD.interGap * 1000;
    };

    /* ----- ежедневная награда ----- */
    G.dailyAvail = () => S.daily.last !== G.today();
    G.dailyNext = () => {
      const yest = dayStr(G.now - 86400000);
      const streak = S.daily.last === yest ? S.daily.streak : (S.daily.last === G.today() ? S.daily.streak : 0);
      return streak % D.DAILY.length;
    };
    G.claimDaily = () => {
      if (!G.dailyAvail()) return null;
      const i = G.dailyNext(), d = D.DAILY[i];
      const coins = Math.round((80 + S.earnedAll * 0.02) * d.c);
      G.gain(coins, true);
      if (d.s) G.addSci(d.s);
      let relic = null;
      if (d.relic) { const r = pickRelic(); S.relics[r.id] = (S.relics[r.id] || 0) + 1; relic = r.id; G.dirty = true; }
      S.daily.streak = i + 1; S.daily.last = G.today();
      return { i, coins, sci: d.s || 0, relic };
    };

    /* ----- офлайн-доход ----- */
    G.offline = (nowMs) => {
      if (!has('radio') || !saved || !saved.ts) return null;
      G.recalc();
      const sec = Math.min((nowMs - saved.ts) / 1000, G.stat.offCap);
      if (sec < 120) return null;
      const coins = Math.round(sec * S.eps * 0.25 * (1 + 0.1 * perk('p_off') + (has('habitat') ? 0.5 : 0)));
      return { sec, coins };
    };

    /* ----- рудный нюх ----- */
    G.nearestOre = () => {
      if (!lv('x_nose')) return null;
      const V = G.V; let best = null, bestScore = -1;
      const rank = { 5: 3, 4: 2, 3: 1 };
      for (let ty = Math.floor(V.y) - 40; ty <= V.y + 40; ty++) for (let tx = Math.floor(V.x) - 40; tx <= V.x + 40; tx++) {
        const t = tileAt(tx, ty); const rk = rank[t]; if (!rk) continue;
        const d = Math.hypot(tx + 0.5 - V.x, ty + 0.5 - V.y); if (d < 5) continue;
        const sc = rk * 100 - d;
        if (sc > bestScore) { bestScore = sc; best = [tx + 0.5, ty + 0.5]; }
      }
      return best;
    };

    /* ----- сохранение ----- */
    G.serialize = () => {
      const o = JSON.parse(JSON.stringify(S));
      o.ts = Date.now(); delete o.last;
      return o;
    };

    G.countOre(); ORE_TARGET = { ice: G.ore.ice * 0.75, iron: G.ore.iron * 0.75, ti: G.ore.ti * 0.75, aur: G.ore.aur * 0.75 };
    G.recalc();
    if (!saved) S.heat = G.stat.heatMax;
    S.heat = Math.min(S.heat, G.stat.heatMax);
    return G;
  }

  g.Core = { create, genWorld, rng32, hash2, vnoise, clamp, smooth };
  if (typeof module !== 'undefined') module.exports = g.Core;
})(typeof window !== 'undefined' ? window : globalThis);
