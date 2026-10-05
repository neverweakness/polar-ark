'use strict';
/* Отрисовка мира: тайлы, здания, вездеход, частицы, ночь/метель/сияние, указатели. Только canvas, сглаживание включено. */
(function (g) {
  const D = g.DATA, T = D.T;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  // совместимость: roundRect есть не во всех браузерах (Safari <16, старые Chromium)
  if (g.CanvasRenderingContext2D && !g.CanvasRenderingContext2D.prototype.roundRect) {
    g.CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(Array.isArray(r) ? r[0] : r, w / 2, h / 2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  const R = { cv: null, cx: null, dpr: 1, W: 300, H: 500, ts: 44, cam: { x: D.CX + 0.5, y: D.CY + 3, init: false }, parts: [], flakes: [], shake: 0, time: 0, ptr: null };
  const hash = (x, y) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };

  R.init = (cv) => {
    R.cv = cv; R.cx = cv.getContext('2d', { alpha: false });
    for (let i = R.flakes.length; i < 260; i++) R.flakes.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random(), r: 0.8 + Math.random() * 1.8 });
    R.resize();
  };
  R.resize = () => {
    const r = R.cv.getBoundingClientRect();
    R.W = Math.max(200, r.width); R.H = Math.max(300, r.height);
    R.dpr = R.forceDpr || Math.min(2, g.devicePixelRatio || 1);
    R.cv.width = Math.round(R.W * R.dpr); R.cv.height = Math.round(R.H * R.dpr);
    R.ts = R.tsOverride || clamp(Math.min(R.W, R.H * 0.62) / 11.5, 32, 54);
  };
  R.w2s = (x, y) => [(x - R.cam.x) * R.ts + R.W / 2, (y - R.cam.y) * R.ts + R.H / 2];
  R.s2w = (sx, sy) => [(sx - R.W / 2) / R.ts + R.cam.x, (sy - R.H / 2) / R.ts + R.cam.y];

  /* ---------- частицы ---------- */
  R.emit = (type, x, y, o) => {
    o = o || {};
    const P = R.parts;
    if (P.length > 420) return;
    if (type === 'chip') {
      const n = o.n || 6;
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 1.4 + Math.random() * 2.6; P.push({ k: 'c', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 0.5 + Math.random() * 0.4, max: 0.9, col: o.col || '#cfe9f7', sz: 2 + Math.random() * 3 }); }
    } else if (type === 'pop') {
      P.push({ k: 'p', x, y, vx: 0, vy: -1.4, life: 1.0, max: 1.0, txt: o.txt || '+1', res: o.res });
    } else if (type === 'spark') {
      const n = o.n || 14;
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 1 + Math.random() * 4; P.push({ k: 's', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7 + Math.random() * 0.6, max: 1.3, col: o.col || '#ffd05a', sz: 2 + Math.random() * 3 }); }
    } else if (type === 'ring') {
      P.push({ k: 'r', x, y, vx: 0, vy: 0, life: 0.8, max: 0.8, col: o.col || '#ffd05a' });
    } else if (type === 'steam') {
      P.push({ k: 'm', x, y, vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.4, life: 1.4, max: 1.4, sz: 6 + Math.random() * 6 });
    }
  };
  R.bump = (v) => { R.shake = Math.min(1, R.shake + v); };

  function updateParts(dt) {
    const P = R.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt; if (p.life <= 0) { P.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'c' || p.k === 's') { p.vy += 5 * dt; p.vx *= 0.97; }
    }
  }

  /* ---------- основной рисунок ---------- */
  R.draw = (G, dt, view) => {
    const cx = R.cx, W = R.W, H = R.H, ts = R.ts, dpr = R.dpr, S = G.S, V = G.V, st = G.stat;
    R.time += dt;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    // камера
    if (R.camFixed) { R.cam.x = R.camFixed.x; R.cam.y = R.camFixed.y; R.cam.init = true; }
    if (!R.cam.init) { R.cam.x = V.x; R.cam.y = V.y; R.cam.init = true; }
    const k = 1 - Math.exp(-6 * dt);
    R.cam.x += (V.x - R.cam.x) * k; R.cam.y += (V.y - R.cam.y) * k;
    const halfW = W / 2 / ts, halfH = H / 2 / ts;
    R.cam.x = clamp(R.cam.x, halfW + 1, D.W - halfW - 1); R.cam.y = clamp(R.cam.y, halfH + 1, D.H - halfH - 1);
    let ox = 0, oy = 0;
    if (R.shake > 0.01) { ox = (Math.random() - 0.5) * 7 * R.shake; oy = (Math.random() - 0.5) * 7 * R.shake; R.shake *= Math.pow(0.02, dt); }
    cx.save(); cx.translate(ox, oy);
    cx.fillStyle = '#16233a'; cx.fillRect(-10, -10, W + 20, H + 20);

    // тайлы
    const x0 = Math.floor(R.cam.x - halfW) - 1, x1 = Math.ceil(R.cam.x + halfW) + 1, y0 = Math.floor(R.cam.y - halfH) - 1, y1 = Math.ceil(R.cam.y + halfH) + 1;
    const dd = G.world.d, SW = D.W, ATL = Art.atlas, OVR = Art.over, BASE = Art.baseOf, TSZ = Art.TS, NT = Art.NT;
    const open = (x, y) => D.SOLID[G.tileAt(x, y)] !== 1;
    const tw = Math.ceil(ts) + 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const type = G.tileAt(x, y);
      const base = BASE[type]; if (!base) continue;
      const sx = Math.floor((x - R.cam.x) * ts + W / 2), sy = Math.floor((y - R.cam.y) * ts + H / 2);
      cx.drawImage(ATL[base], (x & (NT - 1)) * TSZ, (y & (NT - 1)) * TSZ, TSZ, TSZ, sx, sy, tw, tw);
      const ov = OVR[type]; if (ov) cx.drawImage(ov[hash(x, y) % ov.length], sx, sy, tw, tw);
      const solid = D.SOLID[type] === 1;
      if (solid) {
        const dmg = dd[y * SW + x];
        if (dmg > 0) {
          const hp = G.tileHp(type, x, y), f = clamp(dmg / hp, 0, 1);
          const gr = cx.createRadialGradient(sx + ts / 2, sy + ts / 2, 0, sx + ts / 2, sy + ts / 2, ts * 0.75);
          gr.addColorStop(0, `rgba(255,170,60,${0.75 * f})`); gr.addColorStop(1, `rgba(255,90,20,${0.2 * f})`);
          cx.fillStyle = gr; cx.fillRect(sx, sy, tw, tw);
        }
        // блик на кромке, обращённой к открытому тайлу
        cx.fillStyle = 'rgba(255,255,255,0.32)';
        if (open(x, y - 1)) cx.fillRect(sx, sy, tw, 3);
        if (open(x - 1, y)) cx.fillRect(sx, sy, 2, tw);
        cx.fillStyle = 'rgba(0,0,0,0.28)';
        if (open(x, y + 1)) cx.fillRect(sx, sy + ts - 3, tw, 3);
        if (open(x + 1, y)) cx.fillRect(sx + ts - 2, sy, 2, tw);
        // мерцание руды
        if (type >= T.IRON && type <= T.RELIC) {
          const ph = (hash(x, y) % 1000) / 1000 * 6.283, a = Math.sin(R.time * 2.2 + ph);
          if (a > 0.82) { const sz = ts * 0.2 * (a - 0.7) * 3; cx.fillStyle = 'rgba(255,255,255,0.85)'; const mx = sx + ts * (0.25 + (hash(y, x) % 50) / 100), my = sy + ts * (0.2 + (hash(x + 3, y) % 50) / 100); cx.fillRect(mx - sz / 2, my - 1, sz, 2); cx.fillRect(mx - 1, my - sz / 2, 2, sz); }
        }
      } else {
        // мягкая тень у стен
        const s1 = !open(x, y - 1), s2 = !open(x - 1, y), s3 = !open(x, y + 1), s4 = !open(x + 1, y);
        if (s1 || s2 || s3 || s4) {
          const sh = ts * 0.32;
          if (s1) { const gr = cx.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, 'rgba(8,16,36,0.55)'); gr.addColorStop(1, 'rgba(8,16,36,0)'); cx.fillStyle = gr; cx.fillRect(sx, sy, tw, sh); }
          if (s2) { const gr = cx.createLinearGradient(sx, 0, sx + sh, 0); gr.addColorStop(0, 'rgba(8,16,36,0.45)'); gr.addColorStop(1, 'rgba(8,16,36,0)'); cx.fillStyle = gr; cx.fillRect(sx, sy, sh, tw); }
          if (s4) { const gr = cx.createLinearGradient(sx + ts, 0, sx + ts - sh, 0); gr.addColorStop(0, 'rgba(8,16,36,0.35)'); gr.addColorStop(1, 'rgba(8,16,36,0)'); cx.fillStyle = gr; cx.fillRect(sx + ts - sh, sy, sh, tw); }
        }
      }
    }

    // лагерь: огороженная территория базы — бетонная площадка, дороги, ограда с воротами, прожекторы
    const base = R.w2s(D.CX + 0.5, D.CY + 0.5);
    {
      const hw = D.BASE.hw * ts, hh = D.BASE.hh * ts, bx = base[0], by = base[1];
      if (bx + hw > -20 && bx - hw < W + 20 && by + hh > -20 && by - hh < H + 20) {
        // площадка
        const pg = cx.createLinearGradient(bx, by - hh, bx, by + hh); pg.addColorStop(0, 'rgba(64,80,106,0.96)'); pg.addColorStop(1, 'rgba(44,56,78,0.96)');
        cx.fillStyle = pg; cx.beginPath(); cx.roundRect(bx - hw, by - hh, hw * 2, hh * 2, ts * 1.1); cx.fill();
        cx.strokeStyle = 'rgba(255,255,255,0.05)'; cx.lineWidth = 1;
        cx.beginPath();
        for (let k = -D.BASE.hw + 2; k < D.BASE.hw; k += 2) { cx.moveTo(bx + k * ts, by - hh + 4); cx.lineTo(bx + k * ts, by + hh - 4); }
        for (let k = -D.BASE.hh + 2; k < D.BASE.hh; k += 2) { cx.moveTo(bx - hw + 4, by + k * ts); cx.lineTo(bx + hw - 4, by + k * ts); }
        cx.stroke();
        // дороги от центра к зданиям (Г-образные), жёлтая разметка
        cx.lineCap = 'round'; cx.lineJoin = 'round';
        const road = (w, col, dash) => {
          cx.strokeStyle = col; cx.lineWidth = w; cx.setLineDash(dash || []);
          cx.beginPath();
          D.BUILD.forEach((b) => { const px = bx + b.pos[0] * ts, py = by + b.pos[1] * ts; cx.moveTo(bx, by); if (Math.abs(b.pos[0]) > 6) { cx.lineTo(px, by); cx.lineTo(px, py - Math.sign(b.pos[1]) * 1.6 * ts); } else { cx.lineTo(bx, py); cx.lineTo(px, py + 0 * ts); } });
          cx.moveTo(bx - hw, by); cx.lineTo(bx + hw, by); cx.moveTo(bx, by - hh); cx.lineTo(bx, by + hh);
          cx.stroke(); cx.setLineDash([]);
        };
        road(ts * 1.5, 'rgba(26,36,54,0.8)'); road(2.5, 'rgba(255,208,90,0.55)', [ts * 0.45, ts * 0.4]);
        // ограда: столбики и перила, ворота по сторонам
        const gate = 2.2, post = (x, y, big) => { cx.fillStyle = big ? '#ffd05a' : '#9fb0c4'; cx.strokeStyle = '#2a3a52'; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, ts * (big ? 0.2 : 0.13), 0, 6.283); cx.fill(); cx.stroke(); };
        cx.strokeStyle = 'rgba(150,170,196,0.85)'; cx.lineWidth = 3;
        const side = (x0, y0, x1, y1, horiz) => {
          const len = Math.hypot(x1 - x0, y1 - y0), n = Math.round(len / (ts * 2));
          let prev = null;
          for (let i = 0; i <= n; i++) {
            const px = x0 + (x1 - x0) * i / n, py = y0 + (y1 - y0) * i / n;
            const mid = horiz ? Math.abs(px - bx) < gate * ts : Math.abs(py - by) < gate * ts;
            if (mid) { prev = null; if (Math.abs((horiz ? px - bx : py - by)) > (gate - 1.4) * ts) post(px, py, true); continue; }
            if (prev) { cx.beginPath(); cx.moveTo(prev[0], prev[1]); cx.lineTo(px, py); cx.stroke(); }
            post(px, py, false); prev = [px, py];
          }
        };
        side(bx - hw, by - hh, bx + hw, by - hh, true); side(bx - hw, by + hh, bx + hw, by + hh, true);
        side(bx - hw, by - hh, bx - hw, by + hh, false); side(bx + hw, by - hh, bx + hw, by + hh, false);
        // прожекторные вышки по углам
        const night = G.env.night;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          const lx = bx + sx * (hw - ts * 0.2), ly = by + sy * (hh - ts * 0.2);
          if (night > 0.05) { cx.globalCompositeOperation = 'lighter'; const lg = cx.createRadialGradient(lx, ly, 0, lx, ly, ts * 5); lg.addColorStop(0, 'rgba(255,230,160,' + (0.42 * night) + ')'); lg.addColorStop(1, 'rgba(255,230,160,0)'); cx.fillStyle = lg; cx.fillRect(lx - ts * 5, ly - ts * 5, ts * 10, ts * 10); cx.globalCompositeOperation = 'source-over'; }
          cx.fillStyle = '#4a5a74'; cx.strokeStyle = '#1a2436'; cx.lineWidth = 2; cx.beginPath(); cx.arc(lx, ly, ts * 0.3, 0, 6.283); cx.fill(); cx.stroke();
          cx.fillStyle = night > 0.05 ? '#fff6c8' : '#cfd9e6'; cx.beginPath(); cx.arc(lx, ly, ts * 0.16, 0, 6.283); cx.fill();
        });
        cx.lineWidth = 3; cx.strokeStyle = 'rgba(160,200,235,0.45)'; cx.beginPath(); cx.roundRect(bx - hw, by - hh, hw * 2, hh * 2, ts * 1.1); cx.stroke();
      }
    }
    const dsz = ts * 5.4;
    if (Art.img.build.depot) cx.drawImage(Art.img.build.depot, base[0] - dsz / 2, base[1] - dsz / 2, dsz, dsz);
    const bsz = ts * 3.7;
    D.BUILD.forEach((b) => {
      const p = G.padOf(b), s = R.w2s(p[0], p[1]);
      if (s[0] < -bsz || s[0] > W + bsz || s[1] < -bsz || s[1] > H + bsz) return;
      if (G.has(b.id)) {
        const im = Art.img.build[b.id]; if (im) cx.drawImage(im, s[0] - bsz / 2, s[1] - bsz / 2, bsz, bsz);
        if (b.id === 'boiler' && Math.random() < dt * 2.2) R.emit('steam', p[0] + 1.9, p[1] - 1.6);
        if (b.id === 'radio') { const a = R.time * 2.4 % 2, r = bsz * 0.14 * (1 + a); cx.strokeStyle = `rgba(93,255,214,${0.45 * (1 - a / 2)})`; cx.lineWidth = 2; cx.beginPath(); cx.arc(s[0], s[1], r + bsz * 0.1, 0, 6.283); cx.stroke(); }
      } else {
        const can = G.canBuild(b.id), pu = can ? 0.5 + 0.5 * Math.sin(R.time * 4) : 0;
        const r = bsz * 0.42;
        cx.save(); cx.translate(s[0], s[1]);
        cx.fillStyle = can ? `rgba(255,180,70,${0.14 + 0.1 * pu})` : 'rgba(110,190,255,0.12)';
        cx.strokeStyle = can ? `rgba(255,190,90,${0.7 + 0.3 * pu})` : 'rgba(130,200,255,0.55)';
        cx.lineWidth = 2.5; cx.setLineDash([9, 7]); cx.lineDashOffset = -R.time * 14;
        cx.beginPath(); cx.roundRect(-r, -r, r * 2, r * 2, 18); cx.fill(); cx.stroke(); cx.setLineDash([]);
        const ic = Art.img.build[b.id];
        if (ic) { cx.globalAlpha = 0.28; cx.drawImage(ic, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6); cx.globalAlpha = 1; }
        cx.fillStyle = can ? '#ffd05a' : '#cfe7f7'; cx.font = `800 ${Math.round(ts * 0.34)}px "Nunito","Trebuchet MS",system-ui,sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.lineWidth = 4; cx.strokeStyle = 'rgba(8,16,36,0.85)'; const lbl = tr(b); cx.strokeText(lbl, 0, r * 0.62); cx.fillText(lbl, 0, r * 0.62);
        const cs = b.cost + ' ' + t('os_hint').split(' ')[0].slice(0, 3).toLowerCase();
        cx.font = `800 ${Math.round(ts * 0.3)}px "Nunito","Trebuchet MS",system-ui,sans-serif`; cx.strokeText('⚒ ' + b.cost, 0, -r * 0.1); cx.fillText('⚒ ' + b.cost, 0, -r * 0.1);
        cx.restore();
        void cs;
      }
    });

    // следы тепла и вездеход
    const vp = R.w2s(V.x, V.y), rs = ts * 2.35 * (1 + 0.05 * S.tier);
    cx.save(); cx.translate(vp[0], vp[1]); cx.rotate(V.a);
    // положение головы бура в координатах вездехода (1 единица спрайта = rs/256)
    const lvP = Math.min(5, Math.floor((S.lv.b_power || 0) / 2)), lvW = S.lv.b_width || 0, ds = 1 + 0.06 * lvW + 0.045 * lvP, ku = rs / 256;
    const hx = -rs * 0.595 + (254 + (ds - 1) * 18) * ku, hr = 34 * ds * ku;
    if (V.drilling) {
      const pu = 0.65 + 0.35 * Math.sin(R.time * 30), tipx = hx + hr * 0.7, rad = ts * (st.radius * 1.5 + 0.3);
      const gr = cx.createRadialGradient(tipx, 0, 0, tipx, 0, rad); gr.addColorStop(0, `rgba(255,170,70,${0.65 * pu})`); gr.addColorStop(1, 'rgba(255,120,30,0)');
      cx.fillStyle = gr; cx.beginPath(); cx.arc(tipx, 0, rad, 0, 6.283); cx.fill();
    }
    const img = Art.roverFor(S);
    if (img && img.width) cx.drawImage(img, -rs * 0.595, -rs / 2, rs * 352 / 256, rs);
    // вращающаяся голова: внешний слой вперёд, внутренний навстречу; чем выше уровень, тем быстрее и богаче эффекты
    const spd = V.drilling ? 15 + 2.5 * lvP : V.moving ? 7 : 2.2;
    R.spinA = ((R.spinA || 0) + dt * spd) % 6.2832; R.spinB = ((R.spinB || 0) - dt * spd * 1.35) % 6.2832;
    const hd = Art.headFor(S);
    if (hd) {
      const hs = rs * 200 / 256;
      cx.save(); cx.translate(hx, 0);
      if (lvP >= 4 && (V.drilling || V.moving)) {                       // пульсирующее кольцо энергии
        const pr = hr * 1.25 + Math.sin(R.time * 9) * hr * 0.06; cx.strokeStyle = 'rgba(255,215,120,' + (0.35 + 0.25 * Math.sin(R.time * 9)) + ')'; cx.lineWidth = Math.max(2, rs * 0.018); cx.beginPath(); cx.arc(0, 0, pr, 0, 6.283); cx.stroke();
      }
      const blur = V.drilling && lvP >= 1;
      if (blur) { cx.save(); cx.rotate(R.spinA - 0.2); cx.globalAlpha = 0.28; cx.drawImage(hd.o, -hs / 2, -hs / 2, hs, hs); cx.restore(); cx.save(); cx.rotate(R.spinA - 0.42); cx.globalAlpha = 0.14; cx.drawImage(hd.o, -hs / 2, -hs / 2, hs, hs); cx.restore(); }
      cx.save(); cx.rotate(R.spinA); cx.drawImage(hd.o, -hs / 2, -hs / 2, hs, hs); cx.restore();
      cx.save(); cx.rotate(R.spinB); cx.drawImage(hd.i, -hs / 2, -hs / 2, hs, hs); cx.restore();
      if (lvP >= 5 && V.drilling) {                                      // разряды вокруг головы
        cx.strokeStyle = 'rgba(160,255,235,0.85)'; cx.lineWidth = Math.max(1.5, rs * 0.012); cx.lineJoin = 'round';
        for (let k = 0; k < 3; k++) {
          const a0 = Math.random() * 6.283; cx.beginPath(); let rr = hr * 1.05, aa = a0; cx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
          for (let j = 0; j < 4; j++) { rr += hr * 0.14; aa += (Math.random() - 0.4) * 0.35; cx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } cx.stroke();
        }
      }
      cx.restore();
    }
    if (R.upFlash > 0) {
      const a = R.upFlash; cx.globalCompositeOperation = 'lighter';
      const gr2 = cx.createRadialGradient(0, 0, 0, 0, 0, rs * 0.9); gr2.addColorStop(0, 'rgba(255,230,150,' + (0.55 * a) + ')'); gr2.addColorStop(1, 'rgba(255,200,90,0)');
      cx.fillStyle = gr2; cx.fillRect(-rs, -rs, rs * 2, rs * 2); cx.globalCompositeOperation = 'source-over';
      R.upFlash = Math.max(0, R.upFlash - dt * 1.6);
    }
    cx.restore();
    if (G.tmr.thermo > 0) { const gr = cx.createRadialGradient(vp[0], vp[1], 0, vp[0], vp[1], ts * 2.6); gr.addColorStop(0, 'rgba(255,150,40,0.35)'); gr.addColorStop(1, 'rgba(255,150,40,0)'); cx.fillStyle = gr; cx.fillRect(vp[0] - ts * 3, vp[1] - ts * 3, ts * 6, ts * 6); }
    if (V.drilling && Math.random() < dt * (22 + 7 * lvP)) {
      const a = V.a + (Math.random() - 0.5) * 0.9, tip = (hx + hr) / ts + 0.15;
      const col = lvP >= 3 && Math.random() < 0.45 ? (lvP >= 5 && Math.random() < 0.5 ? '#7fffe0' : '#ffd36a') : (Math.random() < 0.5 ? '#bfe6f7' : '#ffb35a');
      R.emit('chip', V.x + Math.cos(a) * tip, V.y + Math.sin(a) * tip, { n: 1, col });
    }

    // частицы
    updateParts(dt);
    R.parts.forEach((p) => {
      const s = R.w2s(p.x, p.y), a = clamp(p.life / p.max, 0, 1);
      if (p.k === 'c' || p.k === 's') { cx.globalAlpha = a; cx.fillStyle = p.col; cx.beginPath(); cx.arc(s[0], s[1], p.sz * (p.k === 's' ? a : 1), 0, 6.283); cx.fill(); cx.globalAlpha = 1; }
      else if (p.k === 'm') { cx.globalAlpha = 0.35 * a; cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(s[0], s[1], p.sz * (2 - a), 0, 6.283); cx.fill(); cx.globalAlpha = 1; }
      else if (p.k === 'r') { cx.globalAlpha = a; cx.strokeStyle = p.col; cx.lineWidth = 4 * a + 1; cx.beginPath(); cx.arc(s[0], s[1], ts * (1.8 - a * 1.6) + 8, 0, 6.283); cx.stroke(); cx.globalAlpha = 1; }
      else if (p.k === 'p') {
        cx.globalAlpha = Math.min(1, a * 2.2);
        cx.font = `900 ${Math.round(ts * 0.42)}px "Nunito","Trebuchet MS",system-ui,sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.lineWidth = 4; cx.strokeStyle = 'rgba(8,16,36,0.9)'; cx.strokeText(p.txt, s[0] + ts * 0.22, s[1]);
        cx.fillStyle = '#fff'; cx.fillText(p.txt, s[0] + ts * 0.22, s[1]);
        const im = p.res && Art.img.res[p.res]; if (im) cx.drawImage(im, s[0] - ts * 0.55, s[1] - ts * 0.24, ts * 0.46, ts * 0.46);
        cx.globalAlpha = 1;
      }
    });

    // ночь, метель
    const dark = G.dark(), vis = G.vis();
    if (dark > 0.01) {
      const rad = vis * ts, A = 0.88 * dark;
      const gr = cx.createRadialGradient(vp[0], vp[1], rad * 0.25, vp[0], vp[1], rad);
      gr.addColorStop(0, 'rgba(8,14,36,0)'); gr.addColorStop(0.55, `rgba(8,14,36,${A * 0.55})`); gr.addColorStop(1, `rgba(8,14,36,${A})`);
      cx.fillStyle = gr; cx.fillRect(-10, -10, W + 20, H + 20);
      // тёплый свет
      cx.globalCompositeOperation = 'lighter';
      const wg = cx.createRadialGradient(vp[0], vp[1], 0, vp[0], vp[1], rad * 0.6); wg.addColorStop(0, `rgba(255,170,90,${0.22 * dark})`); wg.addColorStop(1, 'rgba(255,170,90,0)');
      cx.fillStyle = wg; cx.fillRect(vp[0] - rad, vp[1] - rad, rad * 2, rad * 2);
      cx.globalCompositeOperation = 'source-over';
    }
    // светящиеся здания ночью
    if (G.env.night > 0.2) {
      cx.globalCompositeOperation = 'lighter';
      D.BUILD.forEach((b) => { if (!G.has(b.id)) return; const p = G.padOf(b), s = R.w2s(p[0], p[1]), gr = cx.createRadialGradient(s[0], s[1], 0, s[0], s[1], ts * 3); gr.addColorStop(0, `rgba(255,190,110,${0.2 * G.env.night})`); gr.addColorStop(1, 'rgba(255,190,110,0)'); cx.fillStyle = gr; cx.fillRect(s[0] - ts * 3, s[1] - ts * 3, ts * 6, ts * 6); });
      cx.globalCompositeOperation = 'source-over';
    }
    if (G.env.storm > 0.02) { cx.fillStyle = `rgba(220,238,255,${0.3 * G.env.storm})`; cx.fillRect(-10, -10, W + 20, H + 20); }

    // снег
    const wind = G.env.storm, n = Math.round(60 + 200 * wind);
    cx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < n && i < R.flakes.length; i++) {
      const f = R.flakes[i];
      f.y += dt * (0.05 + 0.06 * f.s + 0.5 * wind * f.s); f.x += dt * (0.01 + 0.5 * wind * f.s) * f.s;
      if (f.y > 1) { f.y -= 1; f.x = Math.random(); } if (f.x > 1) f.x -= 1;
      const fx = f.x * W, fy = f.y * H;
      if (wind > 0.15) { cx.strokeStyle = `rgba(255,255,255,${0.35 + 0.4 * f.s * wind})`; cx.lineWidth = f.r * 0.8; cx.beginPath(); cx.moveTo(fx, fy); cx.lineTo(fx - 16 * wind * f.s, fy - 6 * wind); cx.stroke(); }
      else { cx.globalAlpha = 0.45 + 0.3 * f.s; cx.beginPath(); cx.arc(fx, fy, f.r, 0, 6.283); cx.fill(); cx.globalAlpha = 1; }
    }
    // северное сияние
    if (G.env.night > 0.05) {
      cx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) {
        const cy = H * (0.05 + b * 0.05), amp = 22 + b * 8, ph = R.time * (0.25 + b * 0.1) + b * 2;
        const gr = cx.createLinearGradient(0, cy - 30, 0, cy + 70);
        const col = b === 1 ? '120,110,255' : '60,255,200';
        gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},${0.2 * G.env.night})`); gr.addColorStop(1, `rgba(${col},0)`);
        cx.fillStyle = gr; cx.beginPath(); cx.moveTo(0, cy - 30);
        for (let x = 0; x <= W; x += 20) cx.lineTo(x, cy + Math.sin(x * 0.012 + ph) * amp - 30);
        for (let x = W; x >= 0; x -= 20) cx.lineTo(x, cy + 70 + Math.sin(x * 0.01 + ph * 1.3) * amp);
        cx.closePath(); cx.fill();
      }
      cx.globalCompositeOperation = 'source-over';
    }
    cx.restore();

    // указатели у края экрана
    if (view) {
      const arrows = view.arrows || [];
      arrows.forEach((a) => R.arrow(a.x, a.y, a.col, a.icon, a.pulse));
      if (view.ptr) {
        cx.strokeStyle = 'rgba(255,255,255,0.45)'; cx.lineWidth = 3; cx.setLineDash([2, 8]); cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(vp[0], vp[1]); cx.lineTo(view.ptr[0], view.ptr[1]); cx.stroke(); cx.setLineDash([]);
        cx.fillStyle = 'rgba(255,255,255,0.22)'; cx.strokeStyle = 'rgba(255,255,255,0.7)'; cx.lineWidth = 2.5;
        cx.beginPath(); cx.arc(view.ptr[0], view.ptr[1], ts * 0.55, 0, 6.283); cx.fill(); cx.stroke();
      }
    }
  };

  R.arrow = (wx, wy, col, icon, pulse) => {
    const cx = R.cx, W = R.W, H = R.H, ts = R.ts;
    const s = R.w2s(wx, wy), m = 34, top = 120, bot = 150;
    const inside = s[0] > m && s[0] < W - m && s[1] > top && s[1] < H - bot;
    if (inside) return;
    const ccx = W / 2, ccy = (top + H - bot) / 2, dx = s[0] - ccx, dy = s[1] - ccy;
    const kx = (W / 2 - m) / Math.abs(dx || 1e-6), ky = ((H - bot - top) / 2 - 10) / Math.abs(dy || 1e-6), kk = Math.min(kx, ky);
    const px = ccx + dx * kk, py = ccy + dy * kk, ang = Math.atan2(dy, dx);
    const pu = pulse ? 1 + 0.12 * Math.sin(R.time * 6) : 1;
    cx.save(); cx.translate(px, py); cx.scale(pu, pu);
    cx.fillStyle = 'rgba(12,26,44,0.82)'; cx.strokeStyle = col || '#7fd4ff'; cx.lineWidth = 3;
    cx.beginPath(); cx.arc(0, 0, 21, 0, 6.283); cx.fill(); cx.stroke();
    cx.rotate(ang); cx.fillStyle = col || '#7fd4ff';
    cx.beginPath(); cx.moveTo(33, 0); cx.lineTo(20, -9); cx.lineTo(20, 9); cx.closePath(); cx.fill();
    cx.rotate(-ang);
    const im = (icon instanceof Image) ? icon : (Art.iconImgs && Art.iconImgs[icon]);
    if (im && im.width) cx.drawImage(im, -13, -13, 26, 26);
    cx.restore();
    void ts;
  };

  /* нажатие по зданию: возвращает постройку под (sx,sy) */
  R.hitBuild = (G, sx, sy) => {
    const [wx, wy] = R.s2w(sx, sy);
    for (const b of D.BUILD) { const p = G.padOf(b); if (Math.hypot(wx - p[0], wy - p[1]) < 1.9) return b.id; }
    if (Math.hypot(wx - (D.CX + 0.5), wy - (D.CY + 0.5)) < 2.2) return 'depot';
    return null;
  };

  g.Render = R;
})(window);
