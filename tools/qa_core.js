'use strict';
/* QA ядра: случайные действия игрока (улучшения, постройки, модели, контракты, ковчег, престиж, погода)
   с проверкой инвариантов. node tools/qa_core.js [прогонов=12] */
const path = require('path');
global.window = global;
const D = require(path.join(__dirname, '../src/js/data.js'));
const Core = require(path.join(__dirname, '../src/js/core.js'));
const RUNS = parseInt(process.argv[2] || '12', 10);
let fails = 0, checks = 0;
const bad = (m) => { fails++; if (fails < 25) console.log('НАРУШЕНИЕ:', m); };
const chk = (c, m) => { checks++; if (!c) bad(m); };

for (let run = 0; run < RUNS; run++) {
  const G = Core.create(null, 1.7e12 + run), S = G.S;
  G.onEvent = () => {};
  let seed = run * 7919 + 1; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let step = 0; step < 4000; step++) {
    const r = rnd();
    // движение в случайную сторону
    const a = rnd() * 6.283, inp = rnd() < 0.1 ? { x: 0, y: 0 } : { x: Math.cos(a), y: Math.sin(a) };
    for (let k = 0; k < 6; k++) G.update(0.05, inp);
    // случайные действия
    if (r < 0.25) S.coins += Math.floor(rnd() * 5000 * (1 + step / 400));
    if (r < 0.06) S.earned += 4000;
    if (r > 0.9) { const n = D.NODES[(rnd() * D.NODES.length) | 0]; S.sci += 1; G.buyNode(n.id); }
    if (r > 0.93) G.build(D.BUILD[(rnd() * D.BUILD.length) | 0].id);
    if (r > 0.95) G.buyTier((rnd() * 5) | 0);
    if (r > 0.96 && S.contracts.length) { const k = S.contracts[0]; k.got = k.n; k.done = 1; G.claimContract(0); }
    if (r > 0.97) { const g = G.goal(); if (g.ready) G.claimGoal(); }
    if (r > 0.98) G.teleport();
    if (r > 0.985) { S.cargo.iron += 20; S.cargo.ice += 20; G.deliver(); }
    if (r < 0.01) { S.ark.have = { iron: 9999, ti: 9999, aur: 9999 }; S.coins += 1e6; G.arkBuild(); }
    if (r > 0.995 && S.ark.stage >= D.ARK.length) G.launch(D.MODS[(rnd() * 5) | 0].id);
    if (r > 0.99) G.applyBoost(['double', 'heat', 'coins', 'sci'][(rnd() * 4) | 0]);
    G.recalc();
    // инварианты
    const st = G.stat, V = G.V, used = G.cargoUsed();
    chk(S.coins >= 0 && isFinite(S.coins), 'монеты ' + S.coins);
    chk(S.heat >= 0 && S.heat <= st.heatMax + 1e-6, 'тепло ' + S.heat + '/' + st.heatMax);
    chk(used <= st.cap + 1e-6, 'кузов ' + used + '/' + st.cap);
    chk(isFinite(V.x) && isFinite(V.y) && V.x > 2 && V.y > 2 && V.x < D.W - 2 && V.y < D.H - 2, 'позиция ' + V.x + ',' + V.y);
    chk(S.os >= 0 && S.sci >= 0, 'очки отрицательные');
    chk(!Object.keys(S.cargo).some((k) => S.cargo[k] < 0 || !isFinite(S.cargo[k])), 'груз отрицательный');
    chk(S.tier <= S.tmax, 'модель выше купленной');
    chk(D.NODES.every((n) => (S.lv[n.id] || 0) <= n.max), 'уровень узла выше максимума');
    chk(S.ark.stage <= D.ARK.length && Object.values(S.ark.have).every((v) => v >= 0), 'ковчег');
    chk(Object.keys(S.b).every((id) => D.BUILD.some((b) => b.id === id)), 'неизвестная постройка');
    chk(isFinite(st.power) && st.power > 0 && isFinite(st.speed) && st.cap > 0, 'характеристики');
    // ключевые узлы нельзя иметь без требований
    D.NODES.forEach((n) => { if (n.key && (S.lv[n.id] || 0) > 0) chk(!!S.b.dome || S.leg.season > 1, 'особый узел без Купола'); });
    // сохранение/загрузка не теряет данные
    if (step % 800 === 0) {
      const ser = JSON.parse(JSON.stringify(G.serialize())); const G2 = Core.create(ser, Date.now()); G2.recalc();
      chk(Math.abs(G2.S.coins - S.coins) < 1 && G2.S.tier === S.tier && JSON.stringify(G2.S.lv) === JSON.stringify(S.lv) && JSON.stringify(G2.S.b) === JSON.stringify(S.b), 'загрузка отличается от сохранения');
      chk(JSON.stringify(ser).length < 3500, 'сохранение слишком большое ' + JSON.stringify(ser).length);
    }
  }
}
console.log('проверок:', checks, 'нарушений:', fails, fails ? 'ЕСТЬ ПРОБЛЕМЫ' : 'ВСЁ В НОРМЕ');
process.exit(fails ? 1 : 0);
