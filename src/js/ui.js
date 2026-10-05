'use strict';
/* Интерфейс и игровой цикл «Полярного Ковчега»: загрузка, ввод, HUD, окна, реклама, покупки, сохранения. */
(function (g) {
  const D = g.DATA, T = D.T, Core = g.Core, Render = g.Render, Art = g.Art, Snd = g.Snd, Music = g.Music, P = g.Platform;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fmt = I18N.fmt;
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const U = { G: null, modal: null, sel: null, paused: false, adPause: false, hidden: false, ptr: null, keys: {}, last: 0, hudT: 0, saveT: 0, nowT: 0, arrowT: 0, arrows: [], tutStep: 0, boot: true, x2Until: 0, shake: 0 };
  g.UI = U;

  /* ---------------- вспомогательное ---------------- */
  const ic = (n, s, c) => Art.icon(n, s, c);
  const nodeIcon = (n) => 'n_' + (n.br === 'X' ? n.id : n.id.slice(2));
  const thumbs = {};
  const thumb = (id) => thumbs[id] || (thumbs[id] = Art.dataUrl(Art.BUILD_SVG[id]));
  const resIcon = (r, s) => `<img src="${Art.dataUrl(Art.RES_SVG[r])}" width="${s || 22}" height="${s || 22}" style="vertical-align:middle">`;
  const roverThumb = (i) => Art.dataUrl(Art.roverSvg(i));
  const costHtml = (coins, ok) => `<span class="cost ${ok ? '' : 'no'}">${ic('coin', 18)}${fmt(coins)}</span>`;

  U.toast = (txt, cls, ms) => {
    const box = $('toasts'); if (!box) return;
    while (box.children.length > 3) box.firstChild.remove();
    const el = document.createElement('div'); el.className = 'toast ' + (cls || ''); el.innerHTML = txt; box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms || 2300);
  };

  /* ---------------- сохранение ---------------- */
  U.save = (force) => { if (!U.G) return Promise.resolve(); return P.save(U.G.serialize(), force); };

  /* ---------------- реклама / награды ---------------- */
  function adStart() { U.adPause = true; Snd.suspend(); try { P.gameplayStop(); } catch (e) { /* ignore */ } }
  function adEnd() { U.adPause = false; if (!U.hidden) { Snd.resume(); } try { P.gameplayStart(); } catch (e) { /* ignore */ } }
  U.rewarded = (kind, onDone) => {
    P.rewarded(adStart, () => { onDone && onDone(); }, () => { adEnd(); }, () => { adEnd(); U.toast(t('tk_ad_fail'), 'bad'); });
  };
  U.maybeInter = () => {
    const G = U.G, S = G.S;
    if (S.noads || U.modal || U.boot || S.tut < 1) return;
    if (!G.canInter(Date.now())) return;
    S.lastInter = Date.now();
    P.interstitial(adStart, adEnd);
  };
  U.boost = (k) => {
    const G = U.G;
    if (G.boostLeft(k) <= 0) return;
    U.rewarded(k, () => {
      if (G.applyBoost(k)) { Snd.play('goal'); U.save(true); }
      if (U.modal) U.render();
    });
  };

  /* ---------------- события ядра ---------------- */
  function onEvent(type, d) {
    const G = U.G, S = G.S;
    switch (type) {
      case 'pick':
        Render.emit('pop', d.x, d.y - 0.2, { txt: '+' + d.n, res: d.res }); Render.emit('chip', d.x, d.y, { n: 5, col: d.res === 'aur' ? '#5dffd6' : d.res === 'ti' ? '#8a9bff' : d.res === 'iron' ? '#c9d1dc' : '#cfeaf7' });
        Snd.play(d.res); Render.bump(d.res === 'ice' ? 0.03 : 0.1); break;
      case 'break': Render.emit('chip', d.x, d.y, { n: 4, col: '#6f7f99' }); Snd.play('rock'); Render.bump(0.06); break;
      case 'relic': {
        const r = D.RELICS.find((x) => x.id === d.id);
        Render.emit('spark', d.x, d.y, { n: 26, col: '#ffe08a' }); Render.emit('ring', d.x, d.y, { col: '#ffe08a' }); Snd.play('relic'); Render.bump(0.3);
        U.toast(ic('relic', 22) + ' ' + t(d.first ? 'tk_relic_new' : 'tk_relic', { n: tr(r) }), 'gold', 3200); break;
      }
      case 'deliver': {
        const bx = D.CX + 0.5, by = D.CY + 0.5;
        Render.emit('spark', bx, by, { n: 22, col: '#ffd05a' }); Render.emit('ring', bx, by, { col: '#7fd4ff' });
        Render.emit('pop', bx, by - 0.4, { txt: '+' + fmt(d.coins) });
        Snd.play('deliver', Math.min(5, d.units / 25)); U.toast(ic('coin', 20) + ' ' + t('tk_deliver', { c: fmt(d.coins) }), 'gold');
        if (G.boostLeft('double') > 0 && d.coins > 0) U.x2Until = performance.now() + 9000;
        setTimeout(() => U.maybeInter(), 1200); U.save(false); break;
      }
      case 'os': Snd.play('os'); U.toast(ic('hammer', 20) + ' ' + t('tk_os'), 'good'); $('pOs').classList.add('pulse'); break;
      case 'sci': U.toast(ic('atom', 20) + ' ' + t('tk_sci', { n: d.n }), 'good'); break;
      case 'build': {
        const b = D.BUILD.find((x) => x.id === d.id), p = G.padOf(b);
        Render.emit('spark', p[0], p[1], { n: 40, col: '#ffb347' }); Render.emit('ring', p[0], p[1], { col: '#ffb347' }); Render.bump(0.5); Snd.play('build');
        U.toast(ic('hammer', 20) + ' ' + t('tk_build', { n: tr(b) }), 'gold'); U.save(true); break;
      }
      case 'node': U.upFx = (U.upFx || 0) + 1; Snd.play('node'); { const n = D.NODES.find((x) => x.id === d.id); U.toast(ic(nodeIcon(n), 20) + ' ' + t('tk_node', { n: tr(n), l: d.lv }), 'good'); } break;
      case 'tier': if (d.bought) { U.upFx = (U.upFx || 0) + 3; Snd.play('goal'); U.toast(ic('bolt', 20) + ' ' + t('tk_tier', { n: tr(D.TIERS[d.i]) }), 'gold'); } break;
      case 'goal': Snd.play('goal'); U.toast(ic('star', 20) + ' ' + t('tk_goal', { c: fmt(d.rc) }), 'gold'); Render.emit('spark', G.V.x, G.V.y, { n: 30, col: '#ffd05a' }); U.save(true); break;
      case 'goalReady': Snd.play('os'); break;
      case 'zone': { const zn = D.ZONES[d.z]; Snd.play('os'); U.toast(ic('snow', 20) + ' ' + t('tk_zone', { n: tr(zn) }), 'gold', 4200); break; }
      case 'storm': Snd.play('storm'); U.toast(ic('storm', 22) + ' ' + t(d.on ? 'tk_storm_on' : 'tk_storm_off'), d.on ? 'bad' : 'good', 3000); break;
      case 'crev': Snd.play('crev'); Render.bump(0.7); U.toast(ic('snow', 18) + ' ' + t('tk_crev', { n: d.lost }), 'bad'); break;
      case 'teleport': Snd.play('tele'); Render.emit('ring', G.V.x, G.V.y, { col: '#7fd4ff' }); Render.emit('spark', G.V.x, G.V.y, { n: 24, col: '#9fe0ff' }); Render.cam.init = false; U.toast(ic('home', 20) + ' ' + t('tk_tele')); break;
      case 'ark': Snd.play('ark'); Render.bump(0.8); U.toast(ic('ship', 22) + ' ' + t('tk_ark'), 'gold', 3000); U.save(true); break;
      case 'contractDone': Snd.play('goal'); U.toast(ic('contract', 20) + ' ' + t('tk_contract', { c: fmt(d.rc) }), 'gold'); break;
      case 'boost': U.toast(ic('coin', 20) + ' ' + (d.k === 'double' ? t('tk_boost_double', { v: fmt(d.v) }) : d.k === 'heat' ? t('tk_boost_heat') : d.k === 'coins' ? t('tk_boost_coins', { v: fmt(d.v) }) : t('tk_sci', { n: d.v })), 'gold'); break;
      case 'perk': Snd.play('node'); U.toast(ic('star', 20) + ' ' + t('tk_perk'), 'good'); break;
      case 'season': Render.cam.init = false; Snd.play('ark'); break;
      default: break;
    }
  }

  /* ---------------- HUD ---------------- */
  function setIcons() {
    $('icCoin').innerHTML = ic('coin', 26); $('icOs').innerHTML = ic('hammer', 24); $('icSci').innerHTML = ic('atom', 24);
    $('bSet').innerHTML = ic('gear', 22); $('icHome').innerHTML = ic('home', 28); $('icX2').innerHTML = ic('play', 28); $('icGift').innerHTML = ic('gift', 30);
    $('icHeat').innerHTML = ic('flame', 22); $('icCargo').innerHTML = ic('box', 22); $('mClose').innerHTML = ic('close', 18);
    $('bTitle').textContent = t('title'); $('bSub').textContent = t('tagline');
    const dk = { dBuild: ['hammer', 'd_build'], dTree: ['tree', 'd_tree'], dRadio: ['radio', 'd_radio'], dRelics: ['relic', 'd_relics'], dLegacy: ['heart', 'd_legacy'], dShop: ['cart', 'd_shop'] };
    Object.keys(dk).forEach((k) => { const b = $(k); b.children[0].innerHTML = ic(dk[k][0], 30); b.children[1].textContent = t(dk[k][1]); });
    $('lHome').textContent = t('home'); $('lX2').textContent = t('x2'); $('gLbl').textContent = t('goal'); $('bClaim').textContent = t('claim');
    $('pOs').title = t('os_hint'); $('pSci').title = t('sci_hint');
    document.querySelector('.blogo').innerHTML = Art.dataUrl ? `<img src="${roverThumb(0)}" width="84" height="84" alt="">` : '';
  }

  function nearestTile(G, types, maxR) {
    const V = G.V; let best = null, bd = 1e9;
    for (let y = Math.max(3, Math.floor(V.y - maxR)); y < Math.min(D.H - 3, V.y + maxR); y++) for (let x = Math.max(3, Math.floor(V.x - maxR)); x < Math.min(D.W - 3, V.x + maxR); x++) {
      if (types.indexOf(G.world.t[y * D.W + x]) < 0) continue;
      const d = Math.hypot(x + 0.5 - V.x, y + 0.5 - V.y); if (d < bd && d > 3) { bd = d; best = [x + 0.5, y + 0.5]; }
    }
    return best;
  }
  function computeArrows() {
    const G = U.G, S = G.S, V = G.V, st = G.stat, A = [], base = [D.CX + 0.5, D.CY + 0.5];
    const goal = G.goal(), used = G.cargoUsed();
    const dB = G.dist(V.x, V.y);
    const toBase = (used >= st.cap * 0.85) || (goal.g.t === 'deliver' && used > 0) || (S.heat < 14 && dB > 8) || (U.tutStep >= 2 && S.st.trips === 0 && used > 5);
    if (toBase && dB > 11) A.push({ x: base[0], y: base[1], col: '#ffb347', icon: Art.iconImgs.home, pulse: true });
    // стрелка на площадку: только когда текущий квест — «построить именно это здание»
    if (!goal.all && goal.g.t === 'build' && !G.has(goal.g.id)) {
      const b = D.BUILD.find((x) => x.id === goal.g.id), p = b && G.padOf(b);
      if (p) A.push({ x: p[0], y: p[1], col: G.canBuild(b.id) ? '#ffd05a' : '#7fd4ff', icon: Art.iconImgs.hammer, pulse: G.canBuild(b.id) });
    }
    if (!goal.all && goal.g.t === 'mine') {
      const tp = { ice: [T.ICE], iron: [T.IRON], ti: [T.TI], aur: [T.AUR] }[goal.g.r];
      const p = tp && nearestTile(G, tp, 60);
      if (p && used < st.cap * 0.85) A.push({ x: p[0], y: p[1], col: '#7fd4ff', icon: Art.img.res[goal.g.r], pulse: false });
    }
    if (goal.g.t === 'relic' && !goal.ready) { const p = nearestTile(G, [T.RELIC], 60); if (p) A.push({ x: p[0], y: p[1], col: '#ffe08a', icon: Art.img.res.relic, pulse: false }); }
    const nose = G.nearestOre(); if (nose) A.push({ x: nose[0], y: nose[1], col: '#5dffd6', icon: Art.iconImgs.n_x_nose, pulse: false });
    U.arrows = A;
  }

  function drawMini() {
    const G = U.G, m = $('mini'); if (!m) return;
    const cx = m.getContext('2d'), S2 = m.width, W = G.expW, cell = S2 / W;
    cx.clearRect(0, 0, S2, S2);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      if (!G.exp[y * W + x]) continue;
      const d = Math.hypot(x * 4 + 2 - D.CX, y * 4 + 2 - D.CY), col = D.ZONES[D.zoneOf(d)].col;
      cx.fillStyle = col; cx.globalAlpha = 0.5; cx.fillRect(x * cell, y * cell, cell + 0.6, cell + 0.6);
    }
    cx.globalAlpha = 1;
    // границы зон
    cx.strokeStyle = 'rgba(255,255,255,0.18)'; cx.lineWidth = 1;
    [D.RING1, D.RING2, D.RING3].forEach((r) => { cx.beginPath(); cx.arc(D.CX / D.W * S2, D.CY / D.H * S2, r / D.W * S2, 0, 6.283); cx.stroke(); });
    // лагерь и вездеход
    cx.fillStyle = '#ffd05a'; cx.beginPath(); cx.arc(D.CX / D.W * S2, D.CY / D.H * S2, 5, 0, 6.283); cx.fill();
    const V = G.V, vx = V.x / D.W * S2, vy = V.y / D.H * S2;
    cx.save(); cx.translate(vx, vy); cx.rotate(V.a); cx.fillStyle = '#fff'; cx.strokeStyle = '#0a1626'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(9, 0); cx.lineTo(-6, -6); cx.lineTo(-3, 0); cx.lineTo(-6, 6); cx.closePath(); cx.fill(); cx.stroke(); cx.restore();
    const nose = G.nearestOre(); if (nose) { cx.fillStyle = '#5dffd6'; cx.beginPath(); cx.arc(nose[0] / D.W * S2, nose[1] / D.H * S2, 4, 0, 6.283); cx.fill(); }
  }

  function hud() {
    const G = U.G, S = G.S, st = G.stat, e = G.env;
    $('vCoin').textContent = fmt(S.coins);
    $('vOs').textContent = S.os; $('vSci').textContent = S.sci;
    const need = D.osNeed(S.osGot), prev = S.osGot ? D.osNeed(S.osGot - 1) : 0;
    $('osFill').style.width = clamp((S.earned - prev) / (need - prev), 0, 1) * 100 + '%';
    $('pSci').style.display = S.sci > 0 || G.has('dome') || S.leg.tot > 0 ? '' : 'none';
    $('pOs').classList.toggle('pulse', S.os > 0);
    // цель
    const o = G.goal();
    $('goalCard').classList.toggle('ready', o.ready);
    $('gText').textContent = o.all ? t('goal_done') : tr(o.g);
    $('gFill').style.width = (o.all ? 100 : (o.cur / o.need) * 100) + '%';
    $('gNum').textContent = o.all ? '' : fmt(o.cur) + ' / ' + fmt(o.need) + (o.g.rc ? '   +' + fmt(o.g.rc) : '');
    // шкалы
    const hp = S.heat / st.heatMax, used = G.cargoUsed();
    $('heatFill').style.width = clamp(hp, 0, 1) * 100 + '%'; $('heatNum').textContent = Math.round(S.heat) + ' / ' + st.heatMax;
    document.querySelector('.bar.heat').classList.toggle('low', hp < 0.2);
    $('cargoFill').style.width = clamp(used / st.cap, 0, 1) * 100 + '%'; $('cargoNum').textContent = Math.floor(used) + ' / ' + st.cap;
    document.querySelector('.bar.cargo').classList.toggle('full', used >= st.cap - 0.01);
    // сутки/погода
    const ch = $('envChip'); let ico = 'sun', txt = t('day');
    if (e.storm > 0.3) { ico = 'storm'; txt = t('storm'); } else if (e.night > 0.5) { ico = 'moon'; txt = t('night'); }
    else if (G.has('meteo')) { ico = 'storm'; txt = t('storm_in', { s: I18N.time(G.stormIn()) }); }
    else ico = 'sun';
    if (ch._k !== ico + txt) { ch._k = ico + txt; ch.innerHTML = ic(ico, 20) + '<span>' + txt + '</span>'; }
    { const zi = D.zoneOf(G.dist(G.V.x, G.V.y)), zp = $('pZone'); if (zp._z !== zi) { zp._z = zi; $('vZone').textContent = tr(D.ZONES[zi]); zp.style.setProperty('--zc', D.ZONES[zi].col); } }
    // боковые кнопки
    const home = $('bHome'); home.classList.toggle('show', G.has('radio')); home.classList.toggle('cd', G.tmr.tele > 0);
    $('lHome').textContent = G.tmr.tele > 0 ? Math.ceil(G.tmr.tele) + t('sec') : t('home');
    $('bX2').classList.toggle('show', performance.now() < U.x2Until && G.boostLeft('double') > 0);
    $('bDaily').classList.toggle('show', G.dailyAvail() && S.tut >= 1 && !U.modal);
    // док
    const setDock = (id, has, off) => { const b = $(id); b.classList.toggle('has', !!has); b.classList.toggle('off', !!off); };
    const canNode = D.NODES.some((n) => { const s = G.nodeState(n); return s.st === 'open' && s.can; });
    setDock('dBuild', D.BUILD.some((b) => G.canBuild(b.id)));
    setDock('dTree', canNode, !G.has('hangar'));
    setDock('dRadio', S.contracts.some((k) => k.done), !G.has('radio'));
    setDock('dRelics', false, false);
    setDock('dLegacy', S.leg.pts > 0 && D.PERKS.some((p) => G.perkState(p).can));
    $('dLegacy').classList.toggle('hid', !(S.leg.tot > 0));
    setDock('dShop', false);
    // подсказка
    const hint = $('hintTxt'); let h = '';
    if (G.V.full) h = t('full'); else if (S.heat <= 0) h = t('frozen');
    hint.textContent = h; hint.classList.toggle('on', !!h);
  }

  /* ---------------- окна ---------------- */
  U.open = (name, arg) => {
    U.modal = { name, arg }; U.sel = arg || null;
    $('modal').classList.remove('hidden'); U.render(); Snd.play('click'); try { P.gameplayStop(); } catch (e) { /* ignore */ }
  };
  U.close = () => {
    if (!U.modal) return; const nm = U.modal.name; U.modal = null; $('modal').classList.add('hidden'); $('mBody').innerHTML = '';
    U.save(true); try { P.gameplayStart(); } catch (e) { /* ignore */ }
    if (U.upFx) {                                  // вездеход «взрослеет»: вспышка, кольца, искры
      const V = U.G.V, n = U.upFx; U.upFx = 0;
      Render.upFlash = 1; Render.emit('ring', V.x, V.y, { col: '#ffd05a' }); Render.emit('ring', V.x, V.y, { col: '#7fd4ff' });
      Render.emit('spark', V.x, V.y, { n: 16 + n * 8, col: '#ffe08a' }); Render.bump(0.25); Snd.play('goal');
    }
    if (nm === 'offline') { /* ничего */ }
  };
  U.render = () => {
    const m = U.modal; if (!m) return;
    const G = U.G; G.recalc();
    const fn = VIEWS[m.name]; if (!fn) return;
    const v = fn(G, m);
    $('mTitle').textContent = v.title; const body = $('mBody'); const sc = body.scrollTop;
    body.innerHTML = v.html; if (v.keepScroll !== false) body.scrollTop = sc;
    if (v.after) v.after(body);
  };

  const VIEWS = {};

  VIEWS.build = (G) => {
    const S = G.S, need = D.osNeed(S.osGot), prev = S.osGot ? D.osNeed(S.osGot - 1) : 0;
    let h = `<p class="sub">${t('os_have', { n: S.os })} · ${t('earn_more')}</p><div class="progress"><u style="width:${clamp((S.earned - prev) / (need - prev), 0, 1) * 100}%"></u><em>${t('next_os', { a: fmt(S.earned), b: fmt(need) })}</em></div>`;
    D.BUILD.forEach((b) => {
      const has = G.has(b.id), can = G.canBuild(b.id);
      h += `<div class="card ${has ? 'done' : ''}"><img src="${thumb(b.id)}" alt=""><div class="ct"><h3>${tr(b)}</h3><p>${trd(b)}</p></div>` +
        (has ? `<span class="tag ok">${t('built')}</span>` : `<button class="btn ${can ? 'go' : 'dis'}" data-a="build" data-v="${b.id}">${can ? t('btn_build') : ''} <span class="cost">${ic('hammer', 16)}${b.cost}</span></button>`) + `</div>`;
    });
    return { title: t('m_build'), html: h };
  };

  VIEWS.tree = (G, m) => {
    const S = G.S, sel = m.arg && D.NODES.find((n) => n.id === m.arg);
    const body = $('mBody'), W = Math.min(480, (body.clientWidth || 440) - 28);
    const col = { B: 0.17, C: 0.5, S: 0.83 };
    const pos = (n) => {
      if (n.br === 'X') { const q = { x_nose: [0.33, 4.15], x_pantry: [0.67, 4.15], x_ice: [0.5, 5.25] }[n.id]; return [q[0] * W, 56 + q[1] * 92]; }
      return [col[n.br] * W + n.x * W * 0.077, 56 + n.y * 92];
    };
    const NS = clamp(Math.round(W * 0.14), 44, 64), Hh = 56 + 5.25 * 92 + 54;
    let lines = '', nodes = '';
    D.NODES.forEach((n) => {
      const [x, y] = pos(n);
      n.req.forEach(([pid]) => { const pn = D.NODES.find((q) => q.id === pid), [px, py] = pos(pn); const ok = G.lv(pid) >= 1; lines += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" stroke="${ok ? 'rgba(127,212,255,.7)' : 'rgba(150,170,200,.25)'}" stroke-width="${ok ? 3.5 : 2.5}" stroke-linecap="round"/>`; });
    });
    ['B', 'C', 'S'].forEach((b) => { nodes += `<div class="brt" style="left:${col[b] * W}px">${t('br_' + b)}</div>`; });
    nodes += `<div class="brt" style="left:${0.5 * W}px;top:${56 + 3.62 * 92}px;color:var(--gold)">${t('br_X')}</div>`;
    D.NODES.forEach((n) => {
      const s = G.nodeState(n), [x, y] = pos(n);
      const cls = s.st === 'locked' ? 'locked' : s.st === 'max' ? 'max' : s.can ? 'open can' : 'open';
      nodes += `<button class="nd ${cls} ${sel && sel.id === n.id ? 'sel' : ''}" style="left:${x}px;top:${y}px;width:${NS}px;height:${NS}px;margin:${-NS / 2}px 0 0 ${-NS / 2}px" data-a="node" data-v="${n.id}">${ic(nodeIcon(n), Math.round(NS * 0.55))}<span class="lv">${s.lv}/${n.max}</span></button>`;
    });
    let box = `<p class="sub">${t('tree_sub')}</p>`;
    if (sel) {
      const s = G.nodeState(sel); let act = '';
      if (s.st === 'max') act = `<span class="tag ok">${t('max')}</span>`;
      else if (s.st === 'locked') {
        const why = s.why === 'hangar' ? t('lk_hangar') : s.why === 'dome' ? t('lk_dome') : s.why === 'forge' ? t('lk_forge') : (() => { const pn = D.NODES.find((q) => q.id === s.req[0]); return t('lk_req', { n: tr(pn), l: s.req[1] }); })();
        act = `<span class="tag">${ic('lock', 16)} ${why}</span>`;
      } else act = `<button class="btn ${s.can ? 'go' : 'dis'}" data-a="buynode" data-v="${sel.id}">${t('buy')} ${costHtml(s.cost, S.coins >= s.cost)}${s.sci ? ` <span class="cost ${S.sci >= s.sci ? '' : 'no'}">${ic('atom', 16)}${s.sci}</span>` : ''}</button>`;
      box += `<div class="sheetbox"><div class="row"><div style="flex:1"><h3>${tr(sel)}</h3><p>${trd(sel)}</p><span class="pill2">${t('lvl', { a: s.lv, b: sel.max })}</span></div>${act}</div></div>`;
    } else box += `<div class="sheetbox"><p>${tr({ ru: 'Нажмите на звезду, чтобы увидеть описание и улучшить её', en: 'Tap a star to see details and upgrade it' })}</p></div>`;
    const html = box + `<div class="tree" style="height:${Hh}px;margin-top:10px"><svg class="lines" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none">${lines}</svg>${nodes}</div>`;
    return { title: t('m_tree'), html, keepScroll: true };
  };

  VIEWS.hangar = (G) => {
    const S = G.S; let h = '';
    D.TIERS.forEach((tr_, i) => {
      const owned = i <= S.tmax, eq = S.tier === i, reqOk = !tr_.req || G.has(tr_.req), prevOk = i <= S.tmax + 1;
      const rb = tr_.req && D.BUILD.find((b) => b.id === tr_.req);
      const can = !owned && reqOk && prevOk && S.coins >= tr_.cost;
      let act;
      if (eq) act = `<span class="tag ok">${t('equipped')}</span>`;
      else if (owned) act = `<button class="btn green" data-a="equip" data-v="${i}">${t('equip')}</button>`;
      else if (!reqOk) act = `<span class="tag">${ic('lock', 16)} ${t('tier_req', { b: tr(rb) })}</span>`;
      else if (!prevOk) act = `<span class="tag">${t('tier_prev')}</span>`;
      else act = `<button class="btn ${can ? 'go' : 'dis'}" data-a="buytier" data-v="${i}">${costHtml(tr_.cost, S.coins >= tr_.cost)}</button>`;
      h += `<div class="card ${eq ? 'done' : ''} ${!reqOk ? 'locked' : ''}"><img src="${roverThumb(i)}" alt=""><div class="ct"><h3>${tr(tr_)}</h3><p>${t('st_power')} ×${tr_.power} · ${t('st_speed')} ${tr_.speed} · ${t('st_width')} ${tr_.radius.toFixed(2)} · ${t('st_cap')} +${tr_.cap}</p></div>${act}</div>`;
    });
    return { title: t('m_hangar'), html: h };
  };

  VIEWS.radio = (G) => {
    const S = G.S;
    if (!G.has('radio')) return { title: t('m_radio'), html: `<p class="sub">${t('c_none')}</p>` };
    if (!S.contracts.length) G.refillContracts();
    let h = `<p class="sub">${t('radio_sub')}</p>`;
    const tele = G.tmr.tele > 0 ? `<span class="tag">${t('tele_cd', { s: Math.ceil(G.tmr.tele) })}</span>` : `<button class="btn green" data-a="tele">${ic('home', 18)} ${t('tele')}</button>`;
    h += `<div class="card"><div class="thumb" style="display:grid;place-items:center">${ic('home', 36)}</div><div class="ct"><h3>${t('tele')}</h3><p>${t('bi_boiler')}</p></div>${tele}</div>`;
    S.contracts.forEach((k, i) => {
      const fast = G.env.t - k.t0 < 240;
      h += `<div class="card ${k.done ? 'done' : ''}"><div class="thumb" style="display:grid;place-items:center">${resIcon(k.r, 44)}</div><div class="ct"><h3>${t('c_deliver', { n: k.n, r: tr(D.RES[k.r]) })}</h3>
        <div class="progress"><u style="width:${k.got / k.n * 100}%"></u><em>${Math.min(k.got, k.n)} / ${k.n}</em></div>
        <p>${t('c_reward')}: ${ic('coin', 14)} ${fmt(k.rc)}${k.rs ? ' + ' + ic('atom', 14) + k.rs : ''} ${fast && !k.done ? ' · ' + t('c_fast') : ''}</p></div>` +
        (k.done ? `<button class="btn go" data-a="cclaim" data-v="${i}">${t('c_claim')}</button>` : `<button class="btn" data-a="creroll" data-v="${i}">${ic('play', 16)}</button>`) + `</div>`;
    });
    return { title: t('m_radio'), html: h };
  };

  VIEWS.relics = (G) => {
    const S = G.S, n = Object.keys(S.relics).length;
    let h = `<p class="sub">${t('relic_found', { a: n, b: D.RELICS.length })} · ${t('relic_bonus', { p: (D.RELIC_BONUS * n * 100).toFixed(1).replace('.0', '') })}</p><div class="grid">`;
    D.RELICS.forEach((r) => {
      const c = S.relics[r.id] || 0;
      h += `<div class="rel ${c ? 'have' : ''}">${Art.relicIcon(r.id, 42, !c)}<small>${c ? tr(r) : t('relic_unk')}</small>${c > 1 ? `<b>×${c}</b>` : ''}</div>`;
    });
    h += `</div><p class="sub" style="margin-top:12px">${t('relic_hint')}</p>`;
    return { title: t('m_relics'), html: h };
  };

  VIEWS.yard = (G) => {
    const S = G.S, A = S.ark, nS = D.ARK.length;
    let h = `<div class="center">${Art.arkSvg(A.stage).replace('<svg ', '<svg class="ark" ')}</div><p class="sub center">${t('stage_done', { a: A.stage, b: nS })}</p>`;
    if (A.stage >= nS) return { title: t('m_yard'), html: h + `<button class="btn go wide" data-a="sail">${ic('ship', 22)} ${t('btn_sail')}</button>` };
    const st = G.arkReq(A.stage), forge = G.has('forge');
    h += `<div class="sheetbox"><h3>${t('stage', { i: A.stage + 1, n: tr(D.ARK[A.stage]) })}</h3>`;
    [['iron', 'ingot_iron'], ['ti', 'ingot_ti'], ['aur', 'crystals']].forEach(([r, key]) => {
      if (st[r] <= 0) return;
      h += `<div class="req">${resIcon(r, 24)}<span style="width:120px">${t(key)}</span><div class="progress"><u style="width:${clamp(A.have[r] / st[r], 0, 1) * 100}%"></u><em>${A.have[r]} / ${st[r]}</em></div></div>`;
    });
    h += `<div class="req">${ic('coin', 24)}<span style="width:120px">${t('fee')}</span><span class="cost ${S.coins >= st.coins ? '' : 'no'}">${fmt(st.coins)}</span></div>`;
    if (!forge) h += `<p style="color:var(--warn)">${t('need_forge')}</p>`;
    h += `<div class="setrow" style="border:0;padding:8px 0 0"><div class="grow">${t('save_ark')}<small>${t('save_ark_d')}</small></div><button class="toggle ${A.save ? 'on' : ''}" data-a="savearkt"></button></div>`;
    h += `<button class="btn ${G.arkReady() ? 'go' : 'dis'} wide" data-a="arkbuild">${t('btn_stage')}</button></div>`;
    return { title: t('m_yard'), html: h };
  };

  VIEWS.season = (G, m) => {
    const S = G.S; if (!m.arg || typeof m.arg !== 'string') m.arg = 'calm';
    const sel = m.arg, gain = G.legacyGain(sel);
    let h = `<p class="sub">${t('season_sub')}</p><div class="big">${t('season_gain', { n: gain })}</div><p class="sub center">${t('choose_mod')}</p>`;
    D.MODS.forEach((md) => { h += `<button class="modbtn ${sel === md.id ? 'sel' : ''}" data-a="mod" data-v="${md.id}"><b>${tr(md)} · ${t('mod_mult', { m: md.mult })}</b><span>${trd(md)}</span></button>`; });
    h += `<button class="btn go wide" data-a="launch">${t('btn_season')}</button>`;
    return { title: t('m_season'), html: h };
  };

  VIEWS.legacy = (G) => {
    const S = G.S, lt = S.leg.tot || 0;
    let h = `<p class="sub">${t('legacy_d')}</p><div class="big">${ic('heart', 34)} ${t('legacy_pts', { n: S.leg.pts })}</div><p class="sub center">${t('legacy_bonus', { n: lt, c: (lt * 1.5).toFixed(1).replace('.0', ''), p: lt })}</p>`;
    D.PERKS.forEach((p) => {
      const s = G.perkState(p);
      h += `<div class="card"><div class="thumb" style="display:grid;place-items:center">${ic(p.id, 38)}</div><div class="ct"><h3>${tr(p)}</h3><p>${trd(p)}</p><span class="pill2">${t('lvl', { a: s.lv, b: p.max })}</span></div>` +
        (s.max ? `<span class="tag ok">${t('max')}</span>` : `<button class="btn ${s.can ? 'go' : 'dis'}" data-a="perk" data-v="${p.id}"><span class="cost ${s.can ? '' : 'no'}">${ic('heart', 16)}${s.cost}</span></button>`) + `</div>`;
    });
    return { title: t('m_legacy'), html: h };
  };

  VIEWS.shop = (G) => {
    const S = G.S; let h = `<p class="sub">${t('shop_free')}</p>`;
    const eps = Math.max(150, S.eps * 360);
    const rows = [['double', 'play', fmt(S.last || 0)], ['heat', 'flame', ''], ['coins', 'coin', fmt(eps)], ['sci', 'atom', '']];
    rows.forEach(([k, icn, v]) => {
      const left = G.boostLeft(k);
      h += `<div class="card"><div class="thumb" style="display:grid;place-items:center">${ic(icn, 38)}</div><div class="ct"><h3>${t('b_' + k)}</h3><p>${t('b_' + k + '_d', { v })}</p><p style="color:var(--ice)">${t('left_today', { n: left })}</p></div>` +
        (left > 0 ? `<button class="btn go ${k === 'double' && !(S.last > 0) ? 'dis' : ''}" data-a="boost" data-v="${k}">${ic('play', 16)}</button>` : `<span class="tag">${t('shop_none')}</span>`) + `</div>`;
    });
    if (P.paymentsAvailable && U.catalog && U.catalog.length) {
      h += `<p class="sub" style="margin-top:14px">${t('shop_paid')}</p>`;
      U.catalog.forEach((p) => {
        if (p.id === 'no_ads' && S.noads) return;
        const ico = { coins_s: 'coin', coins_m: 'coin', sci_pack: 'atom', thermo: 'flame', no_ads: 'star' }[p.id] || 'star';
        h += `<div class="card"><div class="thumb" style="display:grid;place-items:center">${ic(ico, 38)}</div><div class="ct"><h3>${t('p_' + p.id.replace('sci_pack', 'sci'))}</h3><p>${t('p_' + p.id.replace('sci_pack', 'sci') + '_d')}</p></div><button class="btn go" data-a="buyprod" data-v="${p.id}">${p.price}</button></div>`;
      });
    }
    return { title: t('m_shop'), html: h };
  };

  VIEWS.settings = (G) => {
    const S = G.S; const plat = P.type === 'vk' ? t('p_vk') : P.type === 'yandex' ? t('p_ya') : (P.inVK === false ? t('p_out') : t('p_dev'));
    const row = (k, ico, on) => `<div class="setrow">${ic(ico, 26)}<div class="grow">${t(k)}</div><button class="toggle ${on ? 'on' : ''}" data-a="tgl" data-v="${k}"></button></div>`;
    let h = row('music', 'music', S.set.music) + row('sound', 'sound', S.set.sound);
    h += `<div class="setrow"><div class="grow">🌐 Язык / Language</div><button class="btn ${I18N.lang === 'ru' ? 'go' : ''}" style="${I18N.lang === 'ru' ? '' : 'opacity:.55;'}margin-right:6px" data-a="lang" data-v="ru">Русский</button><button class="btn ${I18N.lang === 'en' ? 'go' : ''}" style="${I18N.lang === 'en' ? '' : 'opacity:.55'}" data-a="lang" data-v="en">English</button></div>`;
    if (P.share) h += `<div class="setrow">${ic('share', 26)}<div class="grow">${t('share')}</div><button class="btn" data-a="share">${t('go')}</button></div>`;
    if (P.addToFavorites) h += `<div class="setrow">${ic('star', 26)}<div class="grow">${t('fav')}</div><button class="btn" data-a="fav">${t('go')}</button></div>`;
    if (P.openSupport && (g.VK_CONFIG ? g.VK_CONFIG.supportUrl : false)) h += `<div class="setrow">${ic('heart', 26)}<div class="grow">${t('support')}</div><button class="btn" data-a="support">${t('go')}</button></div>`;
    h += `<div class="setrow">${ic('relic', 26)}<div class="grow">${t('stats')}<small>${t('st_play', { t: I18N.time(S.st.play) })} · ${t('st_trips', { n: S.st.trips })} · ${t('st_dist', { n: Math.round(S.st.dist) })}</small></div></div>`;
    h += `<div class="setrow"><div class="grow"><button class="btn red" data-a="resetq">${t('reset')}</button></div></div>`;
    h += `<p class="sub center" style="margin-top:12px">${t('ver', { v: D.VERSION, p: plat })}</p>`;
    return { title: t('m_settings'), html: h };
  };
  VIEWS.confirm = () => ({ title: t('reset'), html: `<p class="sub" style="font-size:15px">${t('reset_q')}</p><div class="row" style="margin-top:12px"><button class="btn wide" style="margin:0" data-a="cancel">${t('cancel')}</button><button class="btn red wide" style="margin:0" data-a="resetyes">${t('reset_yes')}</button></div>` });

  VIEWS.daily = (G) => {
    const i = G.dailyNext();
    let h = `<p class="sub">${t('daily_sub')}</p><div class="dayg">`;
    D.DAILY.forEach((d, k) => {
      const coins = Math.round((80 + G.S.earnedAll * 0.02) * d.c);
      h += `<div class="day ${k === i ? 'cur' : k < i ? 'past' : ''}">${t('day_n', { n: k + 1 })}${ic(d.relic ? 'relic' : 'coin', 26)}<span>${fmt(coins)}</span>${d.s ? `<span>${ic('atom', 14)}+${d.s}</span>` : ''}</div>`;
    });
    h += `</div><button class="btn go wide" data-a="dclaim">${t('take')}</button>`;
    return { title: t('m_daily'), html: h };
  };

  VIEWS.offline = (G, m) => {
    const o = m.arg || { sec: 0, coins: 0 };
    return { title: t('m_offline'), html: `<p class="sub" style="font-size:15px">${t('off_text', { t: I18N.time(o.sec) })}</p><div class="big">${ic('coin', 34)} ${fmt(o.coins)}</div><button class="btn go wide" data-a="oclaim">${t('take')}</button><button class="btn wide" data-a="oclaim2">${ic('play', 18)} ${t('off_x2')}</button>` };
  };

  const INFO = (G, id) => {
    const b = D.BUILD.find((x) => x.id === id), S = G.S; let extra = '';
    if (id === 'forge') extra = `<div class="setrow"><div class="grow">${t('save_ark')}<small>${t('save_ark_d')}</small></div><button class="toggle ${S.ark.save ? 'on' : ''}" data-a="savearkt"></button></div>`;
    if (id === 'meteo') extra = `<p class="sub">${t('bi_next_storm', { s: I18N.time(G.stormIn()) })}<br>${t('bi_nightin')}</p>`;
    if (id === 'boiler') extra = `<p class="sub">${t('bi_boiler')}</p>`;
    if (id === 'dome') extra = `<button class="btn go wide" data-a="opentree">${t('bi_dome')}</button>`;
    return { title: tr(b), html: `<div class="card done"><img src="${thumb(id)}" alt=""><div class="ct"><h3>${tr(b)}</h3><p>${trd(b)}</p></div></div>${extra}` };
  };
  VIEWS.storage = (G) => INFO(G, 'storage'); VIEWS.habitat = (G) => INFO(G, 'habitat'); VIEWS.power = (G) => INFO(G, 'power'); VIEWS.forge = (G) => INFO(G, 'forge'); VIEWS.meteo = (G) => INFO(G, 'meteo'); VIEWS.boiler = (G) => INFO(G, 'boiler'); VIEWS.dome = (G) => INFO(G, 'dome');
  VIEWS.depot = () => ({ title: t('camp'), html: `<div class="card done"><img src="${thumb('depot')}" alt=""><div class="ct"><h3>${t('camp')}</h3><p>${t('bi_depot')}</p></div></div>` });

  /* действия окон */
  function modalClick(ev) {
    const el = ev.target.closest('[data-a]'); if (!el || !U.modal) return;
    const G = U.G, S = G.S, a = el.dataset.a, v = el.dataset.v;
    const done = () => { U.render(); };
    switch (a) {
      case 'build': if (!G.build(v)) { Snd.play('err'); } done(); break;
      case 'node': U.modal.arg = v; U.sel = v; Snd.play('click'); done(); break;
      case 'buynode': if (!G.buyNode(v)) { Snd.play('err'); U.toast(t('tk_nomoney'), 'bad'); } done(); break;
      case 'buytier': if (!G.buyTier(+v)) { Snd.play('err'); U.toast(t('tk_nomoney'), 'bad'); } done(); break;
      case 'equip': G.buyTier(+v); Snd.play('click'); done(); break;
      case 'tele': if (G.teleport()) U.close(); break;
      case 'cclaim': if (G.claimContract(+v)) {/* событие покажет награду */ } done(); break;
      case 'creroll': U.rewarded('reroll', () => { G.rerollContract(+v); U.render(); }); break;
      case 'arkbuild': if (!G.arkBuild()) Snd.play('err'); done(); break;
      case 'savearkt': S.ark.save = S.ark.save ? 0 : 1; Snd.play('click'); done(); break;
      case 'sail': U.modal = { name: 'season', arg: 'calm' }; Snd.play('click'); done(); break;
      case 'mod': U.modal.arg = v; Snd.play('click'); done(); break;
      case 'launch': { const gain = G.legacyGain(U.modal.arg); if (G.launch(U.modal.arg)) { U.close(); U.toast(ic('heart', 20) + ' ' + t('season_gain', { n: gain }), 'gold', 3500); U.save(true); } break; }
      case 'perk': G.buyPerk(v); done(); break;
      case 'boost': U.boost(v); break;
      case 'buyprod': U.buy(v); break;
      case 'tgl': if (v === 'music') { S.set.music = S.set.music ? 0 : 1; Snd.setMusic(!!S.set.music); } else { S.set.sound = S.set.sound ? 0 : 1; Snd.setSfx(!!S.set.sound); } Snd.play('click'); done(); break;
      case 'share': P.share && P.share(); break;
      case 'fav': P.addToFavorites && P.addToFavorites(); break;
      case 'support': P.openSupport && P.openSupport(); break;
      case 'resetq': U.modal = { name: 'confirm' }; done(); break;
      case 'cancel': U.modal = { name: 'settings' }; done(); break;
      case 'lang': if (v && v !== I18N.lang) { U.G.S.set.lang = v; U.save(true).then(() => location.reload(), () => location.reload()); setTimeout(() => location.reload(), 1500); } break;
      case 'resetyes': try { localStorage.removeItem(D.SAVE_KEY); } catch (e) { /* ignore */ } U.noSave = true; U.save = () => Promise.resolve(); P.save({ v: 0, ts: 0 }, true); setTimeout(() => location.reload(), 300); break;
      case 'dclaim': { const r = G.claimDaily(); if (r) { Snd.play('goal'); U.toast(ic('gift', 22) + ' +' + fmt(r.coins) + (r.sci ? ' · +' + r.sci + ' ' + t('sci_hint').split(' ')[1] : ''), 'gold', 3000); if (r.relic) U.toast(ic('relic', 22) + ' ' + tr(D.RELICS.find((x) => x.id === r.relic)), 'gold', 3000); } U.close(); break; }
      case 'oclaim': G.gain(U.modal.arg.coins, true); Snd.play('deliver', 3); U.close(); break;
      case 'oclaim2': { const o = U.modal.arg; U.rewarded('off', () => { G.gain(o.coins * 2, true); Snd.play('deliver', 5); U.close(); }); break; }
      case 'opentree': U.open('tree'); break;
      default: break;
    }
  }

  /* ---------------- покупки (Яндекс) ---------------- */
  U.catalog = [];
  function grant(id) {
    const G = U.G, S = G.S;
    if (id === 'coins_s') G.gain(Math.round(Math.max(500, S.eps * 900)), true);
    else if (id === 'coins_m') G.gain(Math.round(Math.max(2500, S.eps * 3600)), true);
    else if (id === 'sci_pack') G.addSci(5);
    else if (id === 'thermo') G.tmr.thermo += 600;
    else if (id === 'no_ads') S.noads = 1;
  }
  async function processPurchase(p) {
    const G = U.G, S = G.S;
    if (!p || !p.purchaseToken) return;
    if (p.productID === 'no_ads') { if (!S.noads) { grant('no_ads'); await U.save(true); } return; }   // нерасходуемый: не гасим
    if (S.tokens.indexOf(p.purchaseToken) < 0) { grant(p.productID); S.tokens.push(p.purchaseToken); S.tokens = S.tokens.slice(-8); await U.save(true); }
    try { await P.consume(p.purchaseToken); } catch (e) { /* ignore */ }
  }
  U.buy = (id) => {
    P.purchase(id).then((p) => processPurchase(p).then(() => { U.toast(ic('gift', 20) + ' ' + t('tk_bought'), 'gold'); Snd.play('goal'); if (U.modal) U.render(); })).catch(() => { /* отмена */ });
  };

  /* ---------------- ввод ---------------- */
  function audioKick() {
    Snd.init(); Snd.resume();
    if (U.G && U.G.S.set.music && !Music.on && Snd.ctx) Snd.setMusic(true);
  }
  function bindInput() {
    ['pointerdown', 'keydown', 'touchstart', 'click'].forEach((ev) => document.addEventListener(ev, audioKick, { capture: true, passive: true }));
    const cv = $('cv'); let down = false, t0 = 0, sx = 0, sy = 0, moved = false;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => {
      if (U.modal || U.boot) return;
      Snd.init(); Snd.resume(); if (U.G.S.set.music && !Music.on) Snd.setMusic(true);
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
      down = true; t0 = performance.now(); moved = false; const p = pt(e); sx = p[0]; sy = p[1]; U.ptr = p; e.preventDefault();
    });
    cv.addEventListener('pointermove', (e) => { if (!down) return; const p = pt(e); U.ptr = p; if (Math.hypot(p[0] - sx, p[1] - sy) > 12) moved = true; });
    const up = (e) => {
      if (!down) return; down = false;
      if (!moved && performance.now() - t0 < 260 && !U.modal) { const id = Render.hitBuild(U.G, sx, sy); if (id) { if (id !== 'depot' && !U.G.has(id)) U.open('build'); else U.open(id); } }
      U.ptr = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', () => { down = false; U.ptr = null; });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    g.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase(); U.keys[k] = true; U.keys[e.code] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
      if (k === 'escape' && U.modal) U.close();
      else if (!U.modal && !U.boot) { if (k === 'b') U.open('build'); else if (k === 't') U.G.teleport(); else if (k === 'p') U.open('settings'); }
      Snd.init(); Snd.resume(); if (U.G.S.set.music && !Music.on && U.G.S.tut >= 1) Snd.setMusic(true);
    });
    g.addEventListener('keyup', (e) => { U.keys[e.key.toLowerCase()] = false; U.keys[e.code] = false; });
    g.addEventListener('blur', () => { U.keys = {}; });
    $('modal').addEventListener('pointerdown', (e) => { if (e.target === $('modal')) U.close(); });
    $('mBody').addEventListener('click', modalClick);
    $('mClose').addEventListener('click', () => U.close());
    const dk = { dBuild: 'build', dTree: 'tree', dRadio: 'radio', dRelics: 'relics', dLegacy: 'legacy', dShop: 'shop' };
    Object.keys(dk).forEach((id) => $(id).addEventListener('click', () => {
      Snd.init(); Snd.resume(); const G = U.G;
      if (id === 'dTree' && !G.has('hangar')) { U.toast(ic('lock', 18) + ' ' + t('lk_hangar'), 'bad'); Snd.play('err'); return; }
      if (id === 'dRadio' && !G.has('radio')) { U.toast(ic('lock', 18) + ' ' + t('c_none'), 'bad'); Snd.play('err'); return; }
      U.open(dk[id]);
    }));
    $('bSet').addEventListener('click', () => { Snd.init(); Snd.resume(); U.open('settings'); });
    $('bPlus').addEventListener('click', () => { Snd.init(); U.open('shop'); });
    $('bHome').addEventListener('click', () => { const G = U.G; if (G.tmr.tele > 0) { U.toast(t('tk_cd', { s: Math.ceil(G.tmr.tele) })); return; } G.teleport(); });
    $('bX2').addEventListener('click', () => { U.x2Until = 0; U.boost('double'); });
    $('bDaily').addEventListener('click', () => U.open('daily'));
    $('bClaim').addEventListener('click', () => { U.G.claimGoal(); });
    $('goalCard').addEventListener('click', (e) => { if (e.target.id !== 'bClaim' && U.G.goal().ready) U.G.claimGoal(); });
    $('pOs').addEventListener('click', () => U.open('build'));
    $('pSci').addEventListener('click', () => { if (U.G.has('hangar')) U.open('tree'); });
    g.addEventListener('resize', () => Render.resize());
    if (g.ResizeObserver) new ResizeObserver(() => Render.resize()).observe($('app'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); else onShow(); });
    g.addEventListener('pagehide', () => { U.save(true); });
    P.onHide && P.onHide(onHide); P.onShow && P.onShow(onShow);
  }
  function onHide() { U.hidden = true; Snd.suspend(); try { P.gameplayStop(); } catch (e) { /* ignore */ } U.save(true); }
  function onShow() { U.hidden = false; U.last = performance.now(); if (!U.adPause) Snd.resume(); try { if (!U.modal) P.gameplayStart(); } catch (e) { /* ignore */ } }

  function inputVec() {
    const k = U.keys; let x = 0, y = 0;
    if (k.a || k.arrowleft || k.KeyA || k.ArrowLeft) x -= 1; if (k.d || k.arrowright || k.KeyD || k.ArrowRight) x += 1; if (k.w || k.arrowup || k.KeyW || k.ArrowUp) y -= 1; if (k.s || k.arrowdown || k.KeyS || k.ArrowDown) y += 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (U.ptr) {
      const vp = Render.w2s(U.G.V.x, U.G.V.y), dx = U.ptr[0] - vp[0], dy = U.ptr[1] - vp[1], l = Math.hypot(dx, dy), ts = Render.ts;
      if (l < ts * 0.35) return { x: 0, y: 0 };
      const m = clamp(l / (ts * 1.4), 0.4, 1);
      return { x: dx / l * m, y: dy / l * m };
    }
    return { x: 0, y: 0 };
  }

  /* ---------------- главный цикл ---------------- */
  function frame(now) {
    requestAnimationFrame(frame);
    const G = U.G; if (!G) return;
    let dt = Math.min(U.maxDt || 0.06, (now - U.last) / 1000); U.last = now; if (dt <= 0) dt = 0.016;
    const run = !U.modal && !U.hidden && !U.adPause && !U.boot && !U.tutOpen;
    if (run) {
      const inp = inputVec();
      let rest = dt; while (rest > 0) { const s = Math.min(rest, 1 / 30); G.update(s, inp); rest -= s; }
      const V = G.V;
      Snd.drill(V.drilling, Math.min(1, G.stat.power / 8));
    } else Snd.drill(false);
    Snd.wind(G.env.storm, G.env.night);
    U.nowT += dt; if (U.nowT > 1) { U.nowT = 0; G.now = Date.now(); }
    U.arrowT += dt; if (U.arrowT > 0.4) { U.arrowT = 0; computeArrows(); }
    Render.draw(G, dt, { arrows: U.arrows, ptr: U.ptr });
    U.miniT = (U.miniT || 0) + dt; if (U.miniT > 0.25) { U.miniT = 0; drawMini(); }
    U.hudT += dt; if (U.hudT > 0.1) { U.hudT = 0; hud(); if (U.modal && (U.modal.name === 'radio' || U.modal.name === 'meteo')) U.render(); }
    U.saveT += dt; if (U.saveT > 6) { U.saveT = 0; if (run) U.save(false); }
    if (!U.bannerOn && run && G.S.st.play > 60 && !G.S.noads && P.banner) { U.bannerOn = true; try { P.banner(true); } catch (e) { /* ignore */ } }
  }

  /* ---------------- туториал ---------------- */
  function tutorial() {
    const steps = ['tut1', 'tut2', 'tut3']; U.tutOpen = true; U.tutStep = 0;
    const show = () => { $('tut').classList.remove('hidden'); $('tTxt').textContent = t(steps[U.tutStep]); $('tBtn').textContent = U.tutStep < 2 ? t('tut_next') : t('tut_go'); };
    $('tBtn').onclick = () => {
      Snd.init(); Snd.resume(); Snd.play('click');
      if (U.tutStep < 2) { U.tutStep++; show(); } else { $('tut').classList.add('hidden'); U.tutOpen = false; U.G.S.tut = 1; U.tutStep = 3; if (U.G.S.set.music) Snd.setMusic(true); U.save(true); try { P.gameplayStart(); } catch (e) { /* ignore */ } }
    };
    show();
  }

  /* ---------------- запуск ---------------- */
  async function boot() {
    try { await P.init(); } catch (e) { /* ignore */ }
    if (LOCAL && /[?&]lang=en/.test(location.search)) P.lang = 'en';
    I18N.lang = P.lang === 'en' ? 'en' : 'ru'; document.documentElement.lang = I18N.lang;
    document.title = t('title');
    Art.iconImgs = {};
    const iconNames = ['home', 'hammer', 'n_x_nose'];
    await Promise.all([Art.init(), ...iconNames.map((n) => Art.load(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64">${Art.ICONS[n]}</svg>`).then((im) => { Art.iconImgs[n] = im; }))]);
    setIcons();
    let saved = null; try { saved = await P.load(); } catch (e) { /* ignore */ }
    if (LOCAL && /[?&]reset/.test(location.search)) saved = null;
    const G = U.G = Core.create(saved && saved.v === 1 ? saved : null, Date.now());
    G.onEvent = onEvent;
    if (G.S.set.lang === 'ru' || G.S.set.lang === 'en') { I18N.lang = G.S.set.lang; document.documentElement.lang = I18N.lang; document.title = t('title'); setIcons(); }
    if (G.S.leg.mod === 'rich') { /* мир уже собран с нужным режимом */ }
    Render.init($('cv')); Render.resize();
    bindInput();
    Snd.musicOn = !!G.S.set.music; Snd.sfxOn = !!G.S.set.sound;
    // докупки/необработанные покупки
    try { P.initPayments && await P.initPayments(); U.catalog = (await P.catalog()) || []; const ps = (await P.getPurchases()) || []; for (const p of ps) await processPurchase(p); } catch (e) { /* ignore */ }
    U.last = performance.now(); requestAnimationFrame(frame);
    hud(); computeArrows();
    P.ready();
    setTimeout(() => { $('boot').classList.add('gone'); U.boot = false; setTimeout(() => { $('boot').style.display = 'none'; }, 600); next(); }, 450);
    function next() {
      if (G.S.tut < 1) { tutorial(); return; }
      try { P.gameplayStart(); } catch (e) { /* ignore */ }
      const off = G.offline(Date.now());
      if (off) { U.open('offline', off); return; }
      if (G.dailyAvail()) setTimeout(() => { if (!U.modal) U.open('daily'); }, 900);
    }
    P.onError = (kind) => { U.toast(t(kind === 'fav' || kind === 'fav-dev' ? 'tk_err' : 'tk_err'), 'bad'); };
    if (LOCAL) {
      g.__game = {
        G, UI: U, Render, step(sec, inp) { let r = sec; while (r > 0) { const s = Math.min(r, 1 / 30); G.update(s, inp || { x: 0, y: 0 }); r -= s; } },
        click(sel) { const e = document.querySelector(sel); if (e) e.click(); return !!e; }
      };
    }
  }
  g.addEventListener('error', (e) => { try { console.error('[game]', e.message, e.filename + ':' + e.lineno); } catch (x) { /* ignore */ } });
  boot();
})(window);
