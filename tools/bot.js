'use strict';
/* Headless-бот: «идеальный игрок» проходит игру в ускоренном времени на настоящем ядре (src/js/core.js).
   node tools/bot.js [часов=10] [--seasons=N]  — печатает время (игровые минуты) до ключевых событий. */
const path = require('path');
global.window = global;
const D = require(path.join(__dirname, '../src/js/data.js'));
const Core = require(path.join(__dirname, '../src/js/core.js'));

const HOURS = parseFloat(process.argv[2] || '10');
const SEASONS = parseInt((process.argv.find((a) => a.startsWith('--seasons=')) || '--seasons=1').split('=')[1], 10);
const DT = 1 / 20;

function run(G, label) {
  const S = G.S, T = D.T, W = D.W;
  const log = [];
  const mark = (name) => log.push([+(S.st.play / 60).toFixed(1), name]);
  G.onEvent = (type, d) => {
    if (type === 'deliver' && S.st.trips === 1) mark('первая доставка +' + d.coins);
    if (type === 'build') mark('постройка: ' + d.id);
    if (type === 'tier' && d.bought) mark('вездеход Mk' + (d.i + 1));
    if (type === 'ark') mark('ковчег: этап ' + d.stage);
    if (type === 'relic' && S.st.relics === 1) mark('первая находка');
    if (type === 'goal' && S.gi % 6 === 0) mark('цель #' + S.gi);
  };
  let target = null, mode = 'mine', stuck = 0, lastPos = [G.V.x, G.V.y], retarget = 0, buyT = 0;
  const base = [D.CX + 0.5, D.CY + 0.5];
  const prefRes = () => {
    const e = S.earned;
    if (e < 400) return [T.ICE];
    if (e < 9000) return [T.IRON, T.ICE];
    if (e < 60000) return [T.TI, T.IRON];
    return [T.AUR, T.TI];
  };
  const findTarget = () => {
    const prefs = prefRes(); const V = G.V; let best = null, bd = 1e9;
    for (const pt of prefs) {
      for (let y = Math.max(3, Math.floor(V.y) - 70); y < Math.min(D.H - 3, V.y + 70); y++) for (let x = Math.max(3, Math.floor(V.x) - 70); x < Math.min(W - 3, V.x + 70); x++) {
        if (G.world.t[y * W + x] !== pt) continue;
        const d = Math.hypot(x + 0.5 - V.x, y + 0.5 - V.y) + 0.3 * Math.hypot(x + 0.5 - base[0], y + 0.5 - base[1]);
        if (d < bd) { bd = d; best = [x + 0.5, y + 0.5]; }
      }
      if (best) return best;
    }
    return null;
  };
  const NODE_PRI = ['b_power', 'c_cap', 's_heat', 'c_value', 'b_speed', 's_eco', 'c_press', 'b_width', 'b_deep', 'c_luck', 'b_reson', 's_eye', 's_storm', 'c_smelt2', 'x_pantry', 'x_ice', 'x_nose'];
  const BUILD_ORDER = ['hangar', 'boiler', 'radio', 'forge', 'storage', 'meteo', 'power', 'dome', 'habitat', 'yard'];
  const spend = () => {
    for (const id of BUILD_ORDER) { if (G.has(id)) continue; if (G.canBuild(id)) G.build(id); else break; }
    if (G.goal().ready) G.claimGoal();
    S.contracts.forEach((k, i) => { if (k.done) G.claimContract(i); });
    // модели вездехода
    const nt = S.tmax + 1;
    if (D.TIERS[nt] && (!D.TIERS[nt].req || G.has(D.TIERS[nt].req)) && S.coins >= D.TIERS[nt].cost * 1.15) G.buyTier(nt);
    // ковчег
    if (G.has('yard') && G.arkReady()) G.arkBuild();
    // узлы: самый приоритетный из доступных по деньгам, но не дороже 60% кошелька
    let bought = true, guard = 0;
    while (bought && guard++ < 6) {
      bought = false;
      for (const id of NODE_PRI) {
        const n = D.NODES.find((x) => x.id === id); const s = G.nodeState(n);
        if (s.st === 'open' && s.can && s.cost <= S.coins * 0.6) { G.buyNode(id); bought = true; break; }
      }
    }
  };
  const maxT = HOURS * 3600;
  let steps = 0;
  while (S.st.play < maxT) {
    steps++;
    const V = G.V, st = G.stat;
    const used = G.cargoUsed();
    const dB = Math.hypot(V.x - base[0], V.y - base[1]);
    if (mode === 'mine' && (used >= st.cap - 0.5 || S.heat < 10)) mode = 'home';
    if (mode === 'home' && dB < 4 && used === 0 && S.heat > st.heatMax * 0.95) { mode = 'mine'; target = null; }
    retarget -= DT;
    let tx, ty;
    if (mode === 'home') { tx = base[0]; ty = base[1]; if (G.has('radio') && dB > 25 && G.tmr.tele <= 0) G.teleport(); }
    else {
      if (!target || retarget <= 0) { target = findTarget(); retarget = 1; }
      if (!target) { mode = 'home'; tx = base[0]; ty = base[1]; } else { tx = target[0]; ty = target[1]; }
    }
    let ix = tx - V.x, iy = ty - V.y; const m = Math.hypot(ix, iy);
    if (m > 0.2) { ix /= m; iy /= m; } else { ix = iy = 0; }
    if (mode === 'home' && dB < 3.4 && used > 0) { ix = iy = 0; }
    G.update(DT, { x: ix, y: iy });
    // залипание
    if (steps % 120 === 0) {
      if (Math.hypot(V.x - lastPos[0], V.y - lastPos[1]) < 0.8 && mode === 'mine' && !V.drilling) { target = null; stuck++; }
      lastPos = [V.x, V.y];
    }
    buyT += DT; if (buyT > 1.5) { buyT = 0; spend(); }
    if (process.env.DBG && steps % (20 * 120) === 0) console.log('t=' + (S.st.play / 60).toFixed(1) + ' mode=' + mode + ' pos=' + V.x.toFixed(1) + ',' + V.y.toFixed(1) + ' cargo=' + used.toFixed(0) + '/' + st.cap + ' heat=' + S.heat.toFixed(0) + ' coins=' + Math.round(S.coins));
    if (S.ark.stage >= D.ARK.length) { mark('КОВЧЕГ ЗАВЕРШЁН'); break; }
  }
  return { log, S, G, stuck, steps };
}

function main() {
  const T0 = Date.now();
  const G = Core.create(null, 1700000000000);
  G.S.set.music = 0;
  for (let season = 1; season <= SEASONS; season++) {
    const r = run(G, season);
    console.log('--- Сезон ' + season + ' (' + (G.S.leg.mod) + ') ---');
    r.log.forEach((l) => console.log(String(l[0]).padStart(7) + ' мин  ' + l[1]));
    const st = G.S;
    console.log('Итог: заработано ' + Math.round(st.earned) + ', ОС ' + st.osGot + ', находок ' + Object.keys(st.relics).length + ', контрактов ' + st.st.cdone + ', доставок ' + st.st.trips + ', залипаний ' + r.stuck);
    if (st.ark.stage >= D.ARK.length && season < SEASONS) {
      const mod = D.MODS[season % D.MODS.length].id;
      G.launch(mod);
      for (let k = 0; k < 6; k++) D.PERKS.forEach((p) => G.buyPerk(p.id));
      console.log('Запуск → сезон ' + G.S.leg.season + ', наследие потрачено, осталось ' + G.S.leg.pts);
    } else break;
  }
  console.log('Время расчёта: ' + (Date.now() - T0) + ' мс');
}
main();
