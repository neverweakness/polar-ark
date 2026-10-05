'use strict';
/* Вся графика — код: SVG-спрайты (вездеход, здания, ресурсы, находки, иконки) и процедурные текстуры тайлов.
   Рисуется в большом размере и сглаживается: никаких пикселей. */
(function (g) {
  const A = {};
  const D = g.DATA;
  const NS = 'xmlns="http://www.w3.org/2000/svg"';
  const SH = '<filter id="soft" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="7"/></filter><filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0b1626" flood-opacity=".5"/></filter>';
  const PAD = '<linearGradient id="pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6b84"/><stop offset="1" stop-color="#34425a"/></linearGradient>';
  const FIRE = '<radialGradient id="fire" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset=".4" stop-color="#ffae3a"/><stop offset="1" stop-color="#ff4d12"/></radialGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".75"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>';
  const svg = (w, h, inner) => `<svg ${NS} viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;

  /* ---------------- вездеход (смотрит вправо), собирается из уровней улучшений ----------------
     o: pw 0..5 (мощность), wd 0..6 (ширина), seg 0..3 (удлинённый кузов), crates 0..3, tank 0..3 (баки тепла), sp 0..2 (скорость), eye, ice (огненный ледокол) */
  const ROVER = (pal, line, o) => {
    o = o || {};
    const pw = o.pw || 0, wd = o.wd || 0, seg = o.seg || 0, crates = o.crates || 0, tank = o.tank || 0, sp = o.sp || 0;
    const ds = 1 + 0.06 * wd + 0.045 * pw, dr = 34 * ds;          // размер головки бура
    const blades = pw >= 2 ? 10 : 8;
    let bl = '';
    for (let i = 0; i < blades; i++) bl += '<use href="#b" transform="rotate(' + ((360 / blades) * i) + ')"/>';
    const inner = pw >= 3 ? '<g stroke="#8a5a06" stroke-width="2" fill="url(#gold)">' + [0, 60, 120, 180, 240, 300].map((a) => '<path d="M0 -7L-6 -19Q0 -24 6 -19Z" transform="rotate(' + a + ')"/>').join('') + '</g>' : '';
    const ring = pw >= 4 ? '<circle r="' + (dr + 5) + '" fill="none" stroke="url(#gold)" stroke-width="4"/><circle r="' + (dr + 9) + '" fill="none" stroke="#ffd36a" stroke-opacity=".45" stroke-width="3"/>' : '';
    const flame = o.ice ? '<g fill="#ff7a2a" opacity=".85"><path d="M0 -44L8 -34 0 -38 -8 -34Z" transform="rotate(20)"/><path d="M0 -44L8 -34 0 -38 -8 -34Z" transform="rotate(140)"/><path d="M0 -44L8 -34 0 -38 -8 -34Z" transform="rotate(260)"/></g>' : '';
    // удлинённый кузов (до 3 секций позади)
    let ext = '';
    for (let i = 0; i < seg; i++) {
      const x = 16 - i * 16;
      ext += '<g filter="url(#drop)"><rect x="' + x + '" y="92" width="26" height="72" rx="10" fill="url(#hopper)" stroke="#121b29" stroke-width="3"/><rect x="' + (x + 5) + '" y="99" width="16" height="58" rx="5" fill="#19243a"/><path d="M' + (x + 5) + ' 116H' + (x + 21) + 'M' + (x + 5) + ' 132H' + (x + 21) + 'M' + (x + 5) + ' 148H' + (x + 21) + '" stroke="#f0a52b" stroke-width="3" opacity=".8"/></g>';
    }
    // ящики на крыше
    let cr = '';
    [[58, 74], [58, 150], [100, 168]].slice(0, crates).forEach((p) => { cr += '<g filter="url(#drop)"><rect x="' + p[0] + '" y="' + p[1] + '" width="18" height="16" rx="3" fill="#c98a4a" stroke="#6a3d14" stroke-width="2.4"/><path d="M' + p[0] + ' ' + (p[1] + 8) + 'H' + (p[0] + 18) + 'M' + (p[0] + 9) + ' ' + p[1] + 'V' + (p[1] + 16) + '" stroke="#6a3d14" stroke-width="2"/></g>'; });
    // баки тепла по бокам гусениц
    let tk = '';
    for (let i = 0; i < tank; i++) {
      const x = 60 + i * 34;
      [20, 220].forEach((y) => { tk += '<g filter="url(#drop)"><rect x="' + x + '" y="' + y + '" width="26" height="16" rx="8" fill="url(#body)" stroke="' + line + '" stroke-width="2.4"/><rect x="' + (x + 4) + '" y="' + (y + 3) + '" width="18" height="4" rx="2" fill="#fff" opacity=".45"/><circle cx="' + (x + 13) + '" cy="' + (y + 8) + '" r="3" fill="#ffd36a"/></g>'; });
    }
    // выхлоп и крылья скорости
    let sx = '';
    if (sp >= 1) sx += '<g><path d="M30 70L8 64 22 80Z" fill="#ffb347" opacity=".9"/><path d="M30 186L8 192 22 176Z" fill="#ffb347" opacity=".9"/><path d="M30 70L2 66 20 76Z" fill="#fff3c4" opacity=".75"/><path d="M30 186L2 190 20 180Z" fill="#fff3c4" opacity=".75"/></g>';
    if (sp >= 2) sx += '<g filter="url(#drop)"><path d="M70 66L40 36 58 36 92 66Z" fill="url(#body)" stroke="' + line + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M70 190L40 220 58 220 92 190Z" fill="url(#body)" stroke="' + line + '" stroke-width="2.4" stroke-linejoin="round"/></g>';
    const lights = o.eye ? '<g><rect x="104" y="86" width="40" height="6" rx="3" fill="#fff6c8" stroke="#7a6a10" stroke-width="1.6"/><path d="M144 88L256 40V70Z" fill="url(#beam)" opacity=".8"/><path d="M144 90L256 118V138Z" fill="url(#beam)" opacity=".5"/></g>' : '';
    const full = svg(352, 256, '<defs>' +
'<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + pal[0] + '"/><stop offset=".55" stop-color="' + pal[1] + '"/><stop offset="1" stop-color="' + pal[2] + '"/></linearGradient>' +
'<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a6"/><stop offset=".5" stop-color="#f2b134"/><stop offset="1" stop-color="#a86a0c"/></linearGradient>' +
'<linearGradient id="track" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46556c"/><stop offset="1" stop-color="#1b2535"/></linearGradient>' +
'<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff1ff"/><stop offset=".6" stop-color="#4aa6cf"/><stop offset="1" stop-color="#1d5f86"/></linearGradient>' +
'<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f6fb"/><stop offset=".5" stop-color="#9fb0c4"/><stop offset="1" stop-color="#4f6078"/></linearGradient>' +
'<linearGradient id="hopper" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a384e"/><stop offset="1" stop-color="#46587a"/></linearGradient>' +
'<radialGradient id="core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset=".35" stop-color="#ffb23c"/><stop offset="1" stop-color="#ff5a1a"/></radialGradient>' +
'<radialGradient id="heat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".75"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>' +
'<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>' +
'<pattern id="tread" width="10" height="10" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="5" height="10" fill="#fff" opacity=".10"/></pattern>' +
'<filter id="soft" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="6"/></filter>' +
'<filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#0b1626" flood-opacity=".5"/></filter></defs>' +
'<g transform="translate(32,0)">' +
'<ellipse cx="124" cy="140" rx="112" ry="82" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/>' +
'<circle cx="214" cy="128" r="' + (46 * ds) + '" fill="url(#heat)"/>' +
'<path d="M196 98L256 62V112Z" fill="url(#beam)"/><path d="M196 158L256 144V194Z" fill="url(#beam)"/>' + sx + tk +
'<g stroke="#121b29" stroke-width="3"><rect x="34" y="36" width="150" height="44" rx="20" fill="url(#track)"/><rect x="34" y="36" width="150" height="44" rx="20" fill="url(#tread)" stroke="none"/><rect x="34" y="176" width="150" height="44" rx="20" fill="url(#track)"/><rect x="34" y="176" width="150" height="44" rx="20" fill="url(#tread)" stroke="none"/></g>' +
'<g fill="#8fa2ba" stroke="#121b29" stroke-width="2"><circle cx="56" cy="58" r="9"/><circle cx="162" cy="58" r="9"/><circle cx="56" cy="198" r="9"/><circle cx="162" cy="198" r="9"/></g>' +
'<g fill="#e8f1fa"><circle cx="56" cy="58" r="3"/><circle cx="162" cy="58" r="3"/><circle cx="56" cy="198" r="3"/><circle cx="162" cy="198" r="3"/></g>' + ext +
'<g filter="url(#drop)"><rect x="30" y="86" width="52" height="84" rx="14" fill="url(#hopper)" stroke="#121b29" stroke-width="3"/><rect x="38" y="94" width="36" height="68" rx="8" fill="#19243a"/><path d="M38 112H74M38 128H74M38 144H74" stroke="#f0a52b" stroke-width="3" opacity=".8"/><path d="M44 120l8-6 8 6-8 8zM58 142l8-6 6 5-8 7z" fill="#bfeeff" opacity=".85"/></g>' +
'<g filter="url(#drop)"><path d="M72 68H160Q186 68 194 92L200 112V144L194 164Q186 188 160 188H72Q54 188 54 170V86Q54 68 72 68Z" fill="url(#body)" stroke="' + line + '" stroke-width="3.5" stroke-linejoin="round"/>' +
'<path d="M78 76H158Q178 76 184 94" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/><path d="M66 128H190M120 76V180" stroke="' + line + '" stroke-opacity=".35" stroke-width="2"/>' +
'<g fill="' + line + '" opacity=".6"><circle cx="70" cy="82" r="2.5"/><circle cx="70" cy="174" r="2.5"/><circle cx="176" cy="84" r="2.5"/><circle cx="176" cy="172" r="2.5"/></g>' +
'<rect x="84" y="94" width="58" height="68" rx="14" fill="url(#glass)" stroke="#123a55" stroke-width="3"/><path d="M92 102L130 102 92 146Z" fill="#fff" opacity=".35"/><rect x="98" y="108" width="30" height="42" rx="8" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>' +
'<circle cx="150" cy="104" r="6" fill="#fff0b0" stroke="' + line + '" stroke-width="2"/><circle cx="150" cy="152" r="6" fill="#fff0b0" stroke="' + line + '" stroke-width="2"/></g>' + cr + lights +
'<g filter="url(#drop)"><rect x="190" y="116" width="26" height="24" rx="6" fill="url(#steel)" stroke="#2a3a52" stroke-width="3"/><path d="M192 122H214M192 134H214" stroke="#4f6078" stroke-width="2"/></g>' +
'<!--HEAD--><g transform="translate(' + (222 + (ds - 1) * 18) + ',128)" filter="url(#drop)">' + ring + '<circle r="' + dr + '" fill="#1f2c40" stroke="#121b29" stroke-width="3"/>' +
'<g stroke="#2a3a52" stroke-width="2.5" fill="url(#steel)" transform="scale(' + ds + ')"><path id="b" d="M0 -9L-11 -32Q0 -42 11 -32Z"/>' + bl + '</g>' +
'<g transform="scale(' + ds + ')">' + inner + '<circle r="17" fill="#26364f" stroke="#121b29" stroke-width="3"/><circle r="' + (11 + pw * 0.8) + '" fill="url(#core)" stroke="#9c3a10" stroke-width="2"/><circle r="4.5" fill="#fffbe6"/></g>' + flame + '</g><!--/HEAD-->' +
'</g>');
    return o.nohead ? full.replace(/<!--HEAD-->[\s\S]*<!--\/HEAD-->/, '') : full;
  };
  /* ---------------- голова бура: вращается отдельно, внешний вид растёт с уровнем ---------------- */
  const HEAD = (pal, line, o, layer) => {
    o = o || {};
    const pw = o.pw || 0, wd = o.wd || 0, ds = 1 + 0.06 * wd + 0.045 * pw, blades = pw >= 2 ? 10 : 8;
    let bl = '', bl2 = '', teeth = '', gems = '', fl = '', bolts = '';
    for (let i = 0; i < blades; i++) { const r = (360 / blades) * i; bl += '<use href="#b" transform="rotate(' + r + ')"/>'; }
    if (pw >= 4) for (let i = 0; i < 16; i++) teeth += '<rect x="-2.6" y="-47" width="5.2" height="7.5" rx="1.6" fill="url(#gold)" stroke="#8a5a06" stroke-width="1" transform="rotate(' + (22.5 * i) + ')"/>';
    if (pw >= 5) for (let i = 0; i < 10; i++) gems += '<path d="M0 -43L3.4 -38.5 0 -34 -3.4 -38.5Z" fill="#7fffe0" stroke="#0b6a5a" stroke-width=".8" transform="rotate(' + (36 * i + 18) + ')"/>';
    if (o.ice) fl = '<g fill="#ff7a2a" opacity=".9">' + [20, 80, 140, 200, 260, 320].map((a) => '<path d="M0 -50L7 -39 0 -43 -7 -39Z" transform="rotate(' + a + ')"/>').join('') + '</g>';
    if (pw >= 3) bl2 = '<g stroke="#8a5a06" stroke-width="2" fill="url(#gold)">' + [0, 60, 120, 180, 240, 300].map((a) => '<path d="M0 -7L-7 -23Q0 -28 7 -23Z" transform="rotate(' + a + ')"/>').join('') + '</g>';
    if (pw >= 2) bolts = '<g fill="#9fb0c4" stroke="#2a3a52" stroke-width="1">' + [0, 60, 120, 180, 240, 300].map((a) => '<circle cx="0" cy="-12.5" r="2" transform="rotate(' + a + ')"/>').join('') + '</g>';
    const defs = '<defs><linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f6fb"/><stop offset=".5" stop-color="#9fb0c4"/><stop offset="1" stop-color="#4f6078"/></linearGradient>' +
      '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a6"/><stop offset=".5" stop-color="#f2b134"/><stop offset="1" stop-color="#a86a0c"/></linearGradient>' +
      '<radialGradient id="core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset=".35" stop-color="#ffb23c"/><stop offset="1" stop-color="#ff5a1a"/></radialGradient>' +
      '<filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0b1626" flood-opacity=".5"/></filter></defs>';
    const open = '<g transform="translate(100,100) scale(' + ds + ')">';
    if (layer === 'outer') {
      return svg(200, 200, defs + open + '<g filter="url(#drop)">' + teeth + (pw >= 4 ? '<circle r="40" fill="none" stroke="url(#gold)" stroke-width="3.6"/>' : '') +
        '<circle r="34" fill="#1f2c40" stroke="#121b29" stroke-width="3"/>' +
        '<g stroke="#2a3a52" stroke-width="2.5" fill="url(#steel)"><path id="b" d="M0 -9L-11 -32Q0 -42 11 -32Z"/>' + bl + '</g>' +
        (pw >= 1 ? '<g fill="none" stroke="' + pal[1] + '" stroke-width="2.2" opacity=".9">' + bl + '</g>' : '') + gems + fl + '</g></g>');
    }
    return svg(200, 200, defs + open + '<g filter="url(#drop)">' + bl2 + '<circle r="17" fill="#26364f" stroke="#121b29" stroke-width="3"/>' + bolts +
      '<circle r="' + (11 + pw * 0.8) + '" fill="url(#core)" stroke="#9c3a10" stroke-width="2"/>' + (pw >= 5 ? '<path d="M0 -9L2.6 -2.6 9 0 2.6 2.6 0 9 -2.6 2.6 -9 0 -2.6 -2.6Z" fill="#fffbe6" opacity=".9"/>' : '<circle r="4.5" fill="#fffbe6"/>') + '</g></g>');
  };
  const LINES = ['#7a3410', '#10405e', '#341a6b', '#0b4a36', '#6a4306'];

  /* ---------------- ресурсы (128×128) ---------------- */
  const SH128 = '<filter id="s" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="4"/></filter>';
  A.RES_SVG = {
    ice: svg(128, 128, `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fdff"/><stop offset=".5" stop-color="#a9e2f5"/><stop offset="1" stop-color="#4aa5cf"/></linearGradient><linearGradient id="b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9f6ff"/><stop offset="1" stop-color="#2f86b8"/></linearGradient><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9f0fb"/><stop offset="1" stop-color="#5eb4dc"/></linearGradient>${SH128}</defs>
<ellipse cx="64" cy="108" rx="44" ry="10" fill="#0b2a44" opacity=".35" filter="url(#s)"/><g stroke="#1d5f86" stroke-width="3" stroke-linejoin="round"><path d="M22 100L30 56 46 46 54 100Z" fill="url(#c)"/><path d="M78 100L84 60 98 52 108 100Z" fill="url(#c)"/><path d="M40 102L46 34 64 14 80 34 86 102Z" fill="url(#a)"/></g>
<g fill="#fff" opacity=".6"><path d="M52 40L64 22 66 54Z"/><path d="M30 60L40 54 44 90Z"/><path d="M86 62L96 56 98 88Z"/></g><g fill="url(#b)" opacity=".7"><path d="M64 14L80 34 64 60Z"/><path d="M84 60L98 52 94 96Z"/></g><path d="M60 30L64 22" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
    iron: svg(128, 128, `<defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9c2cf"/><stop offset=".55" stop-color="#7f8a9b"/><stop offset="1" stop-color="#4a5464"/></linearGradient><linearGradient id="r2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa5b5"/><stop offset="1" stop-color="#3b4452"/></linearGradient><linearGradient id="rust" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb066"/><stop offset="1" stop-color="#b8541a"/></linearGradient>${SH128}</defs>
<ellipse cx="64" cy="106" rx="46" ry="11" fill="#0b1a2b" opacity=".35" filter="url(#s)"/><path d="M18 92L22 56 44 34 76 28 104 46 112 80 92 104 44 106Z" fill="url(#r)" stroke="#2b3340" stroke-width="3.5" stroke-linejoin="round"/><path d="M44 34L76 28 70 62 36 66 22 56Z" fill="#c9d1dc" opacity=".55"/><path d="M76 28L104 46 112 80 90 74 70 62Z" fill="url(#r2)" opacity=".7"/><path d="M36 66L70 62 90 74 92 104 44 106 18 92Z" fill="#2f3744" opacity=".45"/>
<g fill="url(#rust)" stroke="#7a3410" stroke-width="2"><path d="M30 78L44 72 50 84 36 90Z"/><path d="M70 82L88 80 94 92 76 98Z"/><path d="M56 46L70 44 72 54 58 56Z"/></g><g fill="#fff" opacity=".85"><circle cx="48" cy="48" r="2.4"/><circle cx="92" cy="58" r="2"/><circle cx="64" cy="90" r="1.8"/></g><path d="M30 52L46 38" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`),
    ti: svg(128, 128, `<defs><linearGradient id="t1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9d4ff"/><stop offset=".5" stop-color="#7584dc"/><stop offset="1" stop-color="#2e3a96"/></linearGradient><linearGradient id="t2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ecff"/><stop offset="1" stop-color="#5563c4"/></linearGradient><linearGradient id="t3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa8f0"/><stop offset="1" stop-color="#232d78"/></linearGradient>${SH128}</defs>
<ellipse cx="64" cy="106" rx="44" ry="10" fill="#0b1a2b" opacity=".35" filter="url(#s)"/><g stroke="#1b2468" stroke-width="3.5" stroke-linejoin="round"><path d="M20 90L26 54 48 30 82 26 106 48 110 84 88 104 40 104Z" fill="url(#t1)"/><path d="M48 30L82 26 74 58 44 62 26 54Z" fill="url(#t2)" opacity=".85"/><path d="M82 26L106 48 110 84 90 76 74 58Z" fill="url(#t3)" opacity=".8"/></g><path d="M44 62L74 58 90 76 88 104 40 104 20 90Z" fill="#1b2468" opacity=".3"/><path d="M32 56L52 36M60 34L78 32" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/><g fill="#fff"><circle cx="58" cy="70" r="2.4"/><circle cx="92" cy="60" r="2"/><circle cx="40" cy="82" r="1.8"/></g><path d="M62 84L68 70 74 84 68 98Z" fill="#dfe6ff" opacity=".55"/>`),
    aur: svg(128, 128, `<defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d2fff3"/><stop offset=".5" stop-color="#40e0b8"/><stop offset="1" stop-color="#0f8f78"/></linearGradient><linearGradient id="g2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8fff9"/><stop offset="1" stop-color="#1fbf9c"/></linearGradient><linearGradient id="g3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a6bff"/><stop offset="1" stop-color="#2fe6c0"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#5dffd6" stop-opacity=".7"/><stop offset="1" stop-color="#5dffd6" stop-opacity="0"/></radialGradient>${SH128}</defs>
<ellipse cx="64" cy="108" rx="40" ry="9" fill="#06283a" opacity=".4" filter="url(#s)"/><circle cx="64" cy="62" r="52" fill="url(#glow)"/><g stroke="#0b6a5a" stroke-width="3" stroke-linejoin="round"><path d="M26 98L32 60 48 54 54 98Z" fill="url(#g1)"/><path d="M76 98L82 66 98 58 106 98Z" fill="url(#g1)"/><path d="M44 102L50 38 64 12 80 38 86 102Z" fill="url(#g2)"/></g><path d="M64 12L80 38 64 70Z" fill="url(#g3)" opacity=".65"/><path d="M48 40L64 18 66 56Z" fill="#fff" opacity=".55"/><path d="M36 66L44 60 46 92Z" fill="#fff" opacity=".4"/><path d="M60 26L64 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/><g fill="#fff"><circle cx="30" cy="40" r="2"/><circle cx="100" cy="42" r="2.4"/><circle cx="92" cy="24" r="1.6"/></g>`),
    relic: svg(128, 128, `<defs><linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fdff" stop-opacity=".95"/><stop offset=".5" stop-color="#b7e6f7" stop-opacity=".8"/><stop offset="1" stop-color="#5eb4dc" stop-opacity=".85"/></linearGradient><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a6"/><stop offset=".5" stop-color="#f2b134"/><stop offset="1" stop-color="#a86a0c"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd36a" stop-opacity=".6"/><stop offset="1" stop-color="#ffd36a" stop-opacity="0"/></radialGradient>${SH128}</defs>
<ellipse cx="64" cy="108" rx="42" ry="9" fill="#0b2a44" opacity=".35" filter="url(#s)"/><circle cx="64" cy="60" r="34" fill="url(#glow)"/><g transform="translate(64,60)"><circle r="22" fill="url(#gold)" stroke="#7a4a06" stroke-width="3"/><g fill="url(#gold)" stroke="#7a4a06" stroke-width="2.5"><rect x="-5" y="-30" width="10" height="10" rx="2"/><rect x="-5" y="20" width="10" height="10" rx="2"/><rect x="-30" y="-5" width="10" height="10" rx="2"/><rect x="20" y="-5" width="10" height="10" rx="2"/></g><circle r="10" fill="#2a1c06" stroke="#7a4a06" stroke-width="2.5"/><circle r="4" fill="#ffe08a"/></g>
<path d="M20 98L18 44 36 20 92 16 112 40 110 96 90 108 38 108Z" fill="url(#ice)" stroke="#1d5f86" stroke-width="3.5" stroke-linejoin="round"/><path d="M36 20L92 16 80 40 30 44Z" fill="#fff" opacity=".5"/><path d="M28 58L36 30M96 38L100 28" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`)
  };

  /* ---------------- здания (256×256, вид сверху) ---------------- */
  A.BUILD_SVG = {
    hangar: svg(256, 256, `<defs>${PAD}<linearGradient id="roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6edf6"/><stop offset=".5" stop-color="#b3c1d3"/><stop offset="1" stop-color="#7b8ca6"/></linearGradient><linearGradient id="rib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a97aa"/><stop offset=".5" stop-color="#f2f6fb"/><stop offset="1" stop-color="#8a97aa"/></linearGradient><linearGradient id="door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2234"/><stop offset="1" stop-color="#0b1220"/></linearGradient><linearGradient id="orange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc16e"/><stop offset="1" stop-color="#c8561a"/></linearGradient><pattern id="haz" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="11" height="22" fill="#ffc43a"/><rect x="11" width="11" height="22" fill="#232b3b"/></pattern><radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>${SH}</defs>
<ellipse cx="130" cy="150" rx="118" ry="88" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><rect x="10" y="34" width="236" height="188" rx="20" fill="url(#pad)" stroke="#1a2436" stroke-width="4"/><rect x="180" y="40" width="58" height="176" rx="10" fill="url(#haz)" opacity=".85" stroke="#1a2436" stroke-width="3"/>
<g filter="url(#drop)"><rect x="24" y="48" width="170" height="160" rx="18" fill="url(#roof)" stroke="#2a3a52" stroke-width="4"/><g fill="url(#rib)" stroke="#2a3a52" stroke-width="2.5"><rect x="44" y="52" width="14" height="152" rx="5"/><rect x="82" y="52" width="14" height="152" rx="5"/><rect x="120" y="52" width="14" height="152" rx="5"/><rect x="158" y="52" width="14" height="152" rx="5"/></g><path d="M28 56H190" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/><rect x="62" y="96" width="42" height="60" rx="8" fill="#26364f" stroke="#121b29" stroke-width="3"/><circle cx="83" cy="126" r="14" fill="url(#orange)" stroke="#7a3410" stroke-width="2.5"/><path d="M76 126h14M83 119v14" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>
<g filter="url(#drop)"><rect x="176" y="84" width="22" height="88" rx="6" fill="url(#door)" stroke="#121b29" stroke-width="3"/></g><circle cx="190" cy="70" r="14" fill="url(#lamp)"/><circle cx="190" cy="186" r="14" fill="url(#lamp)"/><circle cx="190" cy="70" r="4.5" fill="#fff6c8" stroke="#7a3410" stroke-width="2"/><circle cx="190" cy="186" r="4.5" fill="#fff6c8" stroke="#7a3410" stroke-width="2"/>`),
    boiler: svg(256, 256, `<defs>${PAD}${FIRE}<radialGradient id="tank" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#f4f8fc"/><stop offset=".45" stop-color="#b3c1d3"/><stop offset="1" stop-color="#5b6c85"/></radialGradient><linearGradient id="brick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9784a"/><stop offset="1" stop-color="#a24a26"/></linearGradient><linearGradient id="pipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3a15a"/><stop offset="1" stop-color="#8b4f1e"/></linearGradient>${SH}</defs>
<ellipse cx="130" cy="150" rx="116" ry="92" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><path d="M60 16H196L240 60V196L196 240H60L16 196V60Z" fill="url(#pad)" stroke="#1a2436" stroke-width="4" stroke-linejoin="round"/><path d="M60 24H196L232 60" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3"/><g stroke="#1a2436" stroke-opacity=".5" stroke-width="2"><path d="M40 70H216M40 128H216M40 186H216"/></g>
<g filter="url(#drop)"><rect x="132" y="150" width="88" height="70" rx="12" fill="url(#brick)" stroke="#5a2410" stroke-width="3.5"/><g stroke="#5a2410" stroke-opacity=".5" stroke-width="2"><path d="M132 172H220M132 196H220M158 150V172M190 172V196M158 196V220"/></g><rect x="148" y="170" width="56" height="34" rx="10" fill="#1b0f0a" stroke="#5a2410" stroke-width="3"/><circle cx="176" cy="188" r="30" fill="url(#glow)"/><path d="M176 202C162 196 164 184 170 178 172 184 180 180 178 170 190 178 196 192 186 202Z" fill="url(#fire)"/></g>
<g filter="url(#drop)"><circle cx="100" cy="100" r="62" fill="url(#tank)" stroke="#2a3a52" stroke-width="4"/><circle cx="100" cy="100" r="46" fill="none" stroke="#2a3a52" stroke-opacity=".5" stroke-width="3"/><g fill="#7e8fa8" stroke="#2a3a52" stroke-width="1.5"><circle cx="100" cy="46" r="4"/><circle cx="100" cy="154" r="4"/><circle cx="46" cy="100" r="4"/><circle cx="154" cy="100" r="4"/><circle cx="62" cy="62" r="4"/><circle cx="138" cy="62" r="4"/><circle cx="62" cy="138" r="4"/><circle cx="138" cy="138" r="4"/></g><circle cx="100" cy="100" r="22" fill="#26364f" stroke="#121b29" stroke-width="3.5"/><circle cx="100" cy="100" r="14" fill="url(#fire)" stroke="#9c3a10" stroke-width="2"/><path d="M62 70A52 52 0 0 1 106 52" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".75"/></g>
<path d="M150 120Q174 116 176 150" fill="none" stroke="url(#pipe)" stroke-width="12" stroke-linecap="round"/><g filter="url(#drop)"><circle cx="206" cy="72" r="18" fill="#8a97aa" stroke="#2a3a52" stroke-width="3.5"/><circle cx="206" cy="72" r="10" fill="#1b2434"/><path d="M196 64A14 14 0 0 1 210 60" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></g><g fill="#fff" opacity=".45"><circle cx="210" cy="50" r="10"/><circle cx="224" cy="34" r="13"/><circle cx="238" cy="16" r="9"/></g>`),
    radio: svg(256, 256, `<defs>${PAD}<radialGradient id="dish" cx=".38" cy=".35" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cdd9e8"/><stop offset="1" stop-color="#7b8ca6"/></radialGradient><radialGradient id="core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e8fff9"/><stop offset=".5" stop-color="#40e0b8"/><stop offset="1" stop-color="#0f8f78"/></radialGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#5dffd6" stop-opacity=".55"/><stop offset="1" stop-color="#5dffd6" stop-opacity="0"/></radialGradient>${SH}</defs>
<ellipse cx="130" cy="150" rx="112" ry="90" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><circle cx="128" cy="128" r="112" fill="url(#pad)" stroke="#1a2436" stroke-width="4"/><circle cx="128" cy="128" r="96" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="3" stroke-dasharray="6 8"/><circle cx="128" cy="128" r="100" fill="url(#glow)"/>
<g stroke="#2a3a52" stroke-width="7" stroke-linecap="round"><path d="M128 128L40 54M128 128L216 54M128 128L40 202M128 128L216 202"/></g><g stroke="#9fb0c4" stroke-width="3" stroke-linecap="round"><path d="M128 128L40 54M128 128L216 54M128 128L40 202M128 128L216 202"/></g><g fill="#e3a15a" stroke="#5a2e0e" stroke-width="2.5"><circle cx="40" cy="54" r="9"/><circle cx="216" cy="54" r="9"/><circle cx="40" cy="202" r="9"/><circle cx="216" cy="202" r="9"/></g>
<g filter="url(#drop)"><circle cx="128" cy="128" r="66" fill="url(#dish)" stroke="#2a3a52" stroke-width="4"/><circle cx="128" cy="128" r="50" fill="none" stroke="#7b8ca6" stroke-width="2.5"/><circle cx="128" cy="128" r="34" fill="none" stroke="#7b8ca6" stroke-width="2.5"/><path d="M82 92A56 56 0 0 1 132 70" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/><circle cx="128" cy="128" r="14" fill="url(#core)" stroke="#0b6a5a" stroke-width="3"/><circle cx="128" cy="128" r="5" fill="#fff"/></g>
<g fill="none" stroke="#5dffd6" stroke-width="5" stroke-linecap="round" opacity=".9"><path d="M200 86A84 84 0 0 1 200 170"/><path d="M222 70A110 110 0 0 1 222 186" opacity=".6"/></g>`),
    forge: svg(256, 256, `<defs>${PAD}${FIRE}<linearGradient id="roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a8aa4"/><stop offset="1" stop-color="#4a5a74"/></linearGradient><linearGradient id="roof2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aabc4"/><stop offset="1" stop-color="#6b7c96"/></linearGradient><linearGradient id="ingot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5ecf5"/><stop offset="1" stop-color="#8d9db3"/></linearGradient><linearGradient id="belt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a3448"/><stop offset="1" stop-color="#3f4c66"/></linearGradient>${SH}</defs>
<ellipse cx="130" cy="150" rx="116" ry="92" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><rect x="14" y="30" width="228" height="196" rx="22" fill="url(#pad)" stroke="#1a2436" stroke-width="4"/>
<g filter="url(#drop)"><rect x="30" y="46" width="140" height="120" rx="14" fill="url(#roof)" stroke="#1a2436" stroke-width="3.5"/><g stroke="#1a2436" stroke-opacity=".6" stroke-width="2.5"><path d="M30 86H170M30 126H170M76 46V166M124 46V166"/></g><path d="M36 52H164" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/><rect x="50" y="58" width="28" height="20" rx="4" fill="url(#roof2)" stroke="#1a2436" stroke-width="2"/><circle cx="146" cy="68" r="10" fill="#26364f" stroke="#121b29" stroke-width="3"/><circle cx="146" cy="68" r="5" fill="url(#fire)"/></g>
<circle cx="196" cy="108" r="44" fill="url(#glow)"/><g filter="url(#drop)"><rect x="166" y="84" width="60" height="48" rx="12" fill="#3a4660" stroke="#121b29" stroke-width="3.5"/><rect x="176" y="94" width="40" height="28" rx="8" fill="#1b0f0a" stroke="#121b29" stroke-width="2.5"/><path d="M196 118C184 112 186 102 192 98 194 104 202 100 200 92 210 100 214 112 206 118Z" fill="url(#fire)"/></g>
<g filter="url(#drop)"><rect x="30" y="180" width="196" height="30" rx="10" fill="url(#belt)" stroke="#121b29" stroke-width="3"/><g stroke="#fff" stroke-opacity=".15" stroke-width="2"><path d="M52 182V208M76 182V208M100 182V208M124 182V208M148 182V208M172 182V208M196 182V208"/></g><g stroke="#4f5f78" stroke-width="2"><rect x="48" y="187" width="30" height="16" rx="4" fill="url(#ingot)"/><rect x="92" y="187" width="30" height="16" rx="4" fill="url(#ingot)"/><rect x="176" y="187" width="30" height="16" rx="4" fill="url(#ingot)"/></g></g>
<g filter="url(#drop)"><circle cx="198" cy="156" r="14" fill="#8a97aa" stroke="#2a3a52" stroke-width="3"/><path d="M198 156L226 140" stroke="#e3a15a" stroke-width="7" stroke-linecap="round"/><circle cx="228" cy="139" r="5" fill="#2a3a52"/></g>`),
    meteo: svg(256, 256, `<defs>${PAD}<radialGradient id="dome" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#bcd6ea"/><stop offset="1" stop-color="#6d8cab"/></radialGradient><linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a6a"/><stop offset="1" stop-color="#c8402a"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8fe3ff" stop-opacity=".6"/><stop offset="1" stop-color="#8fe3ff" stop-opacity="0"/></radialGradient>${SH}</defs>
<ellipse cx="130" cy="150" rx="112" ry="90" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><rect x="18" y="26" width="220" height="204" rx="30" fill="url(#pad)" stroke="#1a2436" stroke-width="4"/><circle cx="128" cy="128" r="90" fill="url(#glow)"/>
<g filter="url(#drop)"><circle cx="112" cy="140" r="58" fill="url(#dome)" stroke="#2a3a52" stroke-width="4"/><path d="M60 128H164M64 106H160M72 86H152" stroke="#6d8cab" stroke-opacity=".55" stroke-width="2.5"/><path d="M112 82V198M80 96V184M144 96V184" stroke="#6d8cab" stroke-opacity=".55" stroke-width="2.5"/><path d="M70 110A50 50 0 0 1 120 88" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".85"/></g>
<g filter="url(#drop)"><circle cx="190" cy="68" r="12" fill="#8a97aa" stroke="#2a3a52" stroke-width="3"/><g transform="translate(190,68)"><g stroke="#2a3a52" stroke-width="2.5"><path d="M0 0L-26 -18M0 0L26 -18M0 0L0 30" stroke="#c9d6e4" stroke-width="5" stroke-linecap="round"/></g><circle cx="-28" cy="-19" r="9" fill="url(#red)" stroke="#7a2412" stroke-width="2.5"/><circle cx="28" cy="-19" r="9" fill="url(#red)" stroke="#7a2412" stroke-width="2.5"/><circle cx="0" cy="32" r="9" fill="url(#red)" stroke="#7a2412" stroke-width="2.5"/></g></g>
<g filter="url(#drop)"><rect x="170" y="150" width="54" height="64" rx="12" fill="#3a4660" stroke="#121b29" stroke-width="3.5"/><rect x="180" y="160" width="34" height="22" rx="6" fill="#26364f"/><path d="M186 174L194 166 200 172 208 164" fill="none" stroke="#5dffd6" stroke-width="3" stroke-linecap="round"/><circle cx="197" cy="198" r="6" fill="#ffd05a" stroke="#7a4a06" stroke-width="2"/></g>`),
    dome: svg(256, 256, `<defs>${PAD}<radialGradient id="glass" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#e8fbff" stop-opacity=".95"/><stop offset=".5" stop-color="#7fd0f0" stop-opacity=".7"/><stop offset="1" stop-color="#2f78b0" stop-opacity=".85"/></radialGradient><radialGradient id="core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e8fff9"/><stop offset=".5" stop-color="#7a6bff"/><stop offset="1" stop-color="#2f2a96"/></radialGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9a8bff" stop-opacity=".6"/><stop offset="1" stop-color="#9a8bff" stop-opacity="0"/></radialGradient>${SH}</defs>
<ellipse cx="130" cy="150" rx="116" ry="92" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><path d="M60 14H196L242 60V196L196 242H60L14 196V60Z" fill="url(#pad)" stroke="#1a2436" stroke-width="4" stroke-linejoin="round"/><circle cx="128" cy="128" r="96" fill="url(#glow)"/>
<g filter="url(#drop)"><circle cx="128" cy="128" r="80" fill="#26364f" stroke="#121b29" stroke-width="4"/><circle cx="128" cy="128" r="72" fill="url(#glass)" stroke="#2f78b0" stroke-width="3"/><g stroke="#e8fbff" stroke-opacity=".6" stroke-width="2.5" fill="none"><circle cx="128" cy="128" r="50"/><circle cx="128" cy="128" r="26"/><path d="M128 56V200M56 128H200M77 77L179 179M179 77L77 179"/></g><circle cx="128" cy="128" r="16" fill="url(#core)" stroke="#2f2a96" stroke-width="3"/><circle cx="128" cy="128" r="6" fill="#fff"/><path d="M72 96A62 62 0 0 1 134 66" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"/></g>
<g fill="#ffd05a" stroke="#7a4a06" stroke-width="2"><circle cx="40" cy="40" r="7"/><circle cx="216" cy="40" r="7"/><circle cx="40" cy="216" r="7"/><circle cx="216" cy="216" r="7"/></g>`),
    yard: svg(256, 256, `<defs>${PAD}<linearGradient id="hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc16e"/><stop offset="1" stop-color="#c8561a"/></linearGradient><linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9e3ee"/><stop offset="1" stop-color="#7a8ca6"/></linearGradient><radialGradient id="glass" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#e8fbff"/><stop offset="1" stop-color="#3f90c0"/></radialGradient>${SH}</defs>
<ellipse cx="130" cy="150" rx="116" ry="92" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><rect x="12" y="22" width="232" height="212" rx="22" fill="url(#pad)" stroke="#1a2436" stroke-width="4"/><g stroke="#4f6078" stroke-width="3" stroke-opacity=".6"><path d="M30 60H226M30 196H226"/></g>
<g filter="url(#drop)"><path d="M30 128Q36 84 112 82H206Q238 128 206 174H112Q36 172 30 128Z" fill="url(#hull)" stroke="#7a3410" stroke-width="4" stroke-linejoin="round"/><path d="M52 112Q90 96 196 100" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/><path d="M70 128H208" stroke="#7a3410" stroke-opacity=".4" stroke-width="3"/><rect x="104" y="106" width="48" height="44" rx="14" fill="url(#glass)" stroke="#123a55" stroke-width="3"/><circle cx="196" cy="128" r="12" fill="#2a3a52" stroke="#121b29" stroke-width="3"/><circle cx="196" cy="128" r="6" fill="#ffae3a"/></g>
<g stroke="#2a3a52" stroke-width="5" stroke-linecap="round"><path d="M40 52V204M216 52V204M40 52H216M40 204H216" fill="none"/></g><g stroke="url(#metal)" stroke-width="2.5" stroke-linecap="round"><path d="M40 52V204M216 52V204" fill="none"/></g>`),
    depot: svg(256, 256, `<defs>${PAD}<linearGradient id="belt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a3448"/><stop offset="1" stop-color="#3f4c66"/></linearGradient><radialGradient id="ring" cx=".5" cy=".5" r=".5"><stop offset=".72" stop-color="#7fd4ff" stop-opacity="0"/><stop offset=".9" stop-color="#7fd4ff" stop-opacity=".55"/><stop offset="1" stop-color="#7fd4ff" stop-opacity="0"/></radialGradient><linearGradient id="orange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc16e"/><stop offset="1" stop-color="#c8561a"/></linearGradient>${SH}</defs>
<ellipse cx="130" cy="150" rx="116" ry="92" fill="#0b1a2b" opacity=".3" filter="url(#soft)"/><circle cx="128" cy="128" r="120" fill="url(#ring)"/><circle cx="128" cy="128" r="94" fill="url(#pad)" stroke="#1a2436" stroke-width="4"/><circle cx="128" cy="128" r="78" fill="none" stroke="#7fd4ff" stroke-opacity=".5" stroke-width="3" stroke-dasharray="10 9"/>
<g filter="url(#drop)"><rect x="76" y="108" width="104" height="40" rx="14" fill="url(#belt)" stroke="#121b29" stroke-width="3"/><g stroke="#fff" stroke-opacity=".16" stroke-width="2"><path d="M96 110V146M116 110V146M136 110V146M156 110V146"/></g><circle cx="128" cy="128" r="22" fill="url(#orange)" stroke="#7a3410" stroke-width="3"/><path d="M118 134L128 118 138 134Z" fill="#fff"/></g>
<g fill="#ffd05a" stroke="#7a4a06" stroke-width="2"><circle cx="46" cy="128" r="6"/><circle cx="210" cy="128" r="6"/><circle cx="128" cy="46" r="6"/><circle cx="128" cy="210" r="6"/></g>`)
  };

  // три новые постройки базы
  const CONT = (x, y, w, h, col, dk) => '<g filter="url(#drop)"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + col + '" stroke="' + dk + '" stroke-width="3"/>' + [0.2, 0.34, 0.48, 0.62, 0.76].map((k) => '<path d="M' + (x + w * k) + ' ' + (y + 3) + 'V' + (y + h - 3) + '" stroke="' + dk + '" stroke-opacity=".45" stroke-width="2.4"/>').join('') + '<path d="M' + (x + 6) + ' ' + (y + 4) + 'H' + (x + w - 6) + '" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/></g>';
  A.BUILD_SVG.storage = svg(256, 256, '<defs>' + PAD + SH + '<pattern id="haz" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="11" height="22" fill="#ffc43a"/><rect x="11" width="11" height="22" fill="#232b3b"/></pattern></defs>' +
    '<ellipse cx="130" cy="150" rx="116" ry="92" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><rect x="14" y="26" width="228" height="204" rx="22" fill="url(#pad)" stroke="#1a2436" stroke-width="4"/>' +
    '<rect x="26" y="206" width="204" height="14" rx="5" fill="url(#haz)" opacity=".8"/>' +
    CONT(30, 40, 92, 50, '#e0793a', '#7a3410') + CONT(134, 40, 92, 50, '#3a8fd6', '#173f70') + CONT(30, 104, 92, 50, '#3fb88a', '#12594a') + CONT(134, 104, 92, 50, '#d6b23a', '#6a5208') +
    CONT(82, 166, 92, 34, '#c9d6e4', '#4a5a74') + '<circle cx="46" cy="190" r="9" fill="#ffd05a" stroke="#7a4a06" stroke-width="2.4"/>');
  A.BUILD_SVG.habitat = svg(256, 256, '<defs>' + PAD + SH + '<linearGradient id="mod" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f8fc"/><stop offset="1" stop-color="#9fb0c4"/></linearGradient><linearGradient id="sol" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a7fd6"/><stop offset="1" stop-color="#173f90"/></linearGradient><radialGradient id="win" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff0b0"/><stop offset="1" stop-color="#ffb347"/></radialGradient></defs>' +
    '<ellipse cx="130" cy="150" rx="116" ry="92" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><rect x="12" y="22" width="232" height="212" rx="24" fill="url(#pad)" stroke="#1a2436" stroke-width="4"/>' +
    '<g stroke="#2a3a52" stroke-width="12" stroke-linecap="round"><path d="M128 70V190M84 128H172"/></g><g stroke="#9fb0c4" stroke-width="5" stroke-linecap="round"><path d="M128 70V190M84 128H172"/></g>' +
    [[128, 62, 96, 44], [128, 194, 96, 44], [66, 128, 44, 92], [190, 128, 44, 92]].map((m) => '<g filter="url(#drop)"><rect x="' + (m[0] - m[2] / 2) + '" y="' + (m[1] - m[3] / 2) + '" width="' + m[2] + '" height="' + m[3] + '" rx="' + Math.min(m[2], m[3]) / 2 + '" fill="url(#mod)" stroke="#4a5a74" stroke-width="3.4"/><circle cx="' + (m[0] - (m[2] > m[3] ? 24 : 0)) + '" cy="' + (m[1] - (m[2] > m[3] ? 0 : 24)) + '" r="6" fill="url(#win)"/><circle cx="' + m[0] + '" cy="' + m[1] + '" r="6" fill="url(#win)"/><circle cx="' + (m[0] + (m[2] > m[3] ? 24 : 0)) + '" cy="' + (m[1] + (m[2] > m[3] ? 0 : 24)) + '" r="6" fill="url(#win)"/></g>').join('') +
    '<g filter="url(#drop)"><circle cx="128" cy="128" r="26" fill="url(#mod)" stroke="#4a5a74" stroke-width="3.4"/><circle cx="128" cy="128" r="12" fill="#ff9a3c" stroke="#a8541a" stroke-width="2.4"/></g>' +
    '<g filter="url(#drop)"><rect x="26" y="36" width="40" height="26" rx="4" fill="url(#sol)" stroke="#0e2a6a" stroke-width="2.4"/><path d="M39 36V62M52 36V62M26 49H66" stroke="#9fc4ff" stroke-width="1.6" opacity=".7"/></g>');
  A.BUILD_SVG.power = svg(256, 256, '<defs>' + PAD + SH + FIRE + '<radialGradient id="hous" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#f4f8fc"/><stop offset=".5" stop-color="#b3c1d3"/><stop offset="1" stop-color="#5b6c85"/></radialGradient><linearGradient id="pipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3a15a"/><stop offset="1" stop-color="#8b4f1e"/></linearGradient><linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f6fb"/><stop offset=".5" stop-color="#9fb0c4"/><stop offset="1" stop-color="#4f6078"/></linearGradient></defs>' +
    '<ellipse cx="130" cy="150" rx="116" ry="92" fill="#0b1a2b" opacity=".35" filter="url(#soft)"/><path d="M60 16H196L240 60V196L196 240H60L16 196V60Z" fill="url(#pad)" stroke="#1a2436" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="118" cy="132" r="64" fill="url(#glow)"/><g filter="url(#drop)"><circle cx="118" cy="132" r="56" fill="url(#hous)" stroke="#2a3a52" stroke-width="4"/><circle cx="118" cy="132" r="44" fill="#1f2c40" stroke="#121b29" stroke-width="3"/>' +
    '<g stroke="#2a3a52" stroke-width="2.4" fill="url(#steel)" transform="translate(118,132)">' + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => '<path d="M0 -8L-11 -40Q0 -46 11 -40Z" transform="rotate(' + a + ')"/>').join('') + '</g>' +
    '<circle cx="118" cy="132" r="14" fill="#26364f" stroke="#121b29" stroke-width="3"/><circle cx="118" cy="132" r="8" fill="url(#fire)"/></g>' +
    '<g filter="url(#drop)"><rect x="176" y="46" width="30" height="62" rx="12" fill="url(#hous)" stroke="#2a3a52" stroke-width="3.4"/><circle cx="191" cy="62" r="9" fill="#1b2434"/><circle cx="191" cy="92" r="9" fill="#1b2434"/></g>' +
    '<g fill="#fff" opacity=".45"><circle cx="196" cy="34" r="9"/><circle cx="210" cy="20" r="11"/></g><path d="M170 140Q196 136 196 112" fill="none" stroke="url(#pipe)" stroke-width="11" stroke-linecap="round"/>' +
    '<g filter="url(#drop)"><rect x="170" y="164" width="52" height="56" rx="10" fill="#3a4660" stroke="#121b29" stroke-width="3.4"/><path d="M186 172L178 192H190L182 212" fill="none" stroke="#ffd05a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="206" cy="194" r="6" fill="#5dffd6"/></g>');

  /* ---------------- иконки интерфейса (32×32) ---------------- */
  const I = {
    coin: '<circle cx="16" cy="16" r="12" fill="#ffd05a" stroke="#a86a0c" stroke-width="2.5"/><circle cx="16" cy="16" r="7.5" fill="none" stroke="#c98a14" stroke-width="2"/><path d="M16 9v14M10 12.5l12 7M22 12.5l-12 7" stroke="#a86a0c" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
    hammer: '<path d="M6 26l11-11" stroke="#8a97aa" stroke-width="5" stroke-linecap="round"/><path d="M6 26l11-11" stroke="#d9e3ee" stroke-width="2" stroke-linecap="round"/><rect x="14" y="5" width="14" height="9" rx="2.5" transform="rotate(45 21 9.5)" fill="#ff9a3c" stroke="#a8541a" stroke-width="2"/>',
    atom: '<g fill="none" stroke="#9a8bff" stroke-width="2.4"><ellipse cx="16" cy="16" rx="12" ry="5"/><ellipse cx="16" cy="16" rx="12" ry="5" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="12" ry="5" transform="rotate(120 16 16)"/></g><circle cx="16" cy="16" r="3.4" fill="#e8fbff" stroke="#6a5be6" stroke-width="1.6"/>',
    flame: '<path d="M16 3C20 9 25 12 25 19A9 9 0 0 1 7 19C7 14 10 12 11 8 13 11 15 9 16 3Z" fill="#ff9a3c" stroke="#a8421a" stroke-width="2" stroke-linejoin="round"/><path d="M16 14C19 17 21 19 21 22A5 5 0 0 1 11 22C11 20 13 19 14 17 15 18 16 17 16 14Z" fill="#ffe08a"/>',
    box: '<path d="M4 10l12-6 12 6v13l-12 6-12-6Z" fill="#c98a4a" stroke="#6a3d14" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 10l12 6 12-6M16 16v13" stroke="#6a3d14" stroke-width="2" fill="none"/><path d="M10 7l12 6" stroke="#ffd9a0" stroke-width="2"/>',
    home: '<path d="M4 15L16 4l12 11" fill="none" stroke="#e8f1fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 14v13h7v-8h4v8h7V14L16 6Z" fill="#7fd4ff" stroke="#2a6a96" stroke-width="2" stroke-linejoin="round"/>',
    radio: '<path d="M16 15V28M10 28h12" stroke="#c9d6e4" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="13" r="3.4" fill="#5dffd6" stroke="#0b6a5a" stroke-width="1.8"/><g fill="none" stroke="#5dffd6" stroke-width="2.4" stroke-linecap="round"><path d="M9.5 8.5a9 9 0 0 0 0 9"/><path d="M22.5 8.5a9 9 0 0 1 0 9"/><path d="M5.5 5.5a14 14 0 0 0 0 15" opacity=".6"/><path d="M26.5 5.5a14 14 0 0 1 0 15" opacity=".6"/></g>',
    gear: '<path d="M16 3l2.4 3 3.8-.9 1.3 3.7 3.7 1.3-.9 3.8 3 2.4-3 2.4.9 3.8-3.7 1.3-1.3 3.7-3.8-.9L16 29l-2.4-3-3.8.9-1.3-3.7-3.7-1.3.9-3.8-3-2.4 3-2.4-.9-3.8 3.7-1.3 1.3-3.7 3.8.9Z" fill="#9fb0c4" stroke="#4a5a74" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="5" fill="#2a3a52"/>',
    music: '<path d="M12 24V8l14-3v16" fill="none" stroke="#e8f1fa" stroke-width="3" stroke-linejoin="round"/><circle cx="9" cy="24" r="4.4" fill="#7fd4ff" stroke="#2a6a96" stroke-width="2"/><circle cx="23" cy="21" r="4.4" fill="#7fd4ff" stroke="#2a6a96" stroke-width="2"/>',
    sound: '<path d="M5 12h5l7-6v20l-7-6H5Z" fill="#e8f1fa" stroke="#7a8ca6" stroke-width="2" stroke-linejoin="round"/><path d="M21 11a7 7 0 0 1 0 10M24 7.5a12 12 0 0 1 0 17" fill="none" stroke="#7fd4ff" stroke-width="2.6" stroke-linecap="round"/>',
    cart: '<path d="M3 6h4l3 14h14l3-10H9" fill="#ffd05a" stroke="#a86a0c" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="12" cy="25.5" r="2.6" fill="#e8f1fa" stroke="#4a5a74" stroke-width="1.8"/><circle cx="22" cy="25.5" r="2.6" fill="#e8f1fa" stroke="#4a5a74" stroke-width="1.8"/>',
    relic: '<circle cx="16" cy="16" r="12" fill="#ffd05a" stroke="#a86a0c" stroke-width="2.4"/><circle cx="16" cy="16" r="6.2" fill="#2a1c06" stroke="#a86a0c" stroke-width="2"/><circle cx="16" cy="16" r="2.4" fill="#ffe08a"/><path d="M16 1.5v4M16 26.5v4M1.5 16h4M26.5 16h4" stroke="#a86a0c" stroke-width="2.6" stroke-linecap="round"/>',
    tree: '<path d="M6 24L14 15 19 19 26 8" fill="none" stroke="#9fd6f2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><g fill="#ffd05a" stroke="#a86a0c" stroke-width="1.8"><circle cx="6" cy="24" r="3.4"/><circle cx="14" cy="15" r="3.4"/><circle cx="19" cy="19" r="3.4"/><circle cx="26" cy="8" r="3.8"/></g>',
    contract: '<rect x="6" y="5" width="20" height="23" rx="3.4" fill="#e8f1fa" stroke="#4a5a74" stroke-width="2.2"/><rect x="11" y="2.5" width="10" height="6" rx="2.2" fill="#ff9a3c" stroke="#a8541a" stroke-width="1.8"/><path d="M10.5 15h11M10.5 20h11M10.5 25h6" stroke="#7a8ca6" stroke-width="2.2" stroke-linecap="round"/><path d="M10 15l1.6 1.6 3-3" stroke="#2fcf9a" stroke-width="2" fill="none" stroke-linecap="round"/>',
    ship: '<path d="M3 20h26l-4 7H8Z" fill="#ff9a3c" stroke="#a8541a" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 4v14M16 4l9 12H16Z" fill="#e8f1fa" stroke="#7a8ca6" stroke-width="2" stroke-linejoin="round"/>',
    play: '<circle cx="16" cy="16" r="13" fill="#ff5f5f" stroke="#a82a2a" stroke-width="2.4"/><path d="M13 9.5l10 6.5-10 6.5Z" fill="#fff"/>',
    plus: '<path d="M16 7v18M7 16h18" stroke="#e8f1fa" stroke-width="4.5" stroke-linecap="round"/>',
    check: '<path d="M6 17l7 7 13-14" fill="none" stroke="#2fcf9a" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>',
    lock: '<rect x="7" y="14" width="18" height="14" rx="3.4" fill="#9fb0c4" stroke="#4a5a74" stroke-width="2.2"/><path d="M11 14V10a5 5 0 0 1 10 0v4" fill="none" stroke="#4a5a74" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="21" r="2.2" fill="#2a3a52"/>',
    snow: '<g stroke="#e8fbff" stroke-width="2.6" stroke-linecap="round"><path d="M16 3v26M5 9.5l22 13M27 9.5L5 22.5"/><path d="M12 5l4 3 4-3M12 27l4-3 4 3" fill="none"/></g>',
    close: '<path d="M8 8l16 16M24 8L8 24" stroke="#e8f1fa" stroke-width="4.2" stroke-linecap="round"/>',
    share: '<circle cx="8" cy="16" r="4" fill="#7fd4ff" stroke="#2a6a96" stroke-width="2"/><circle cx="24" cy="7" r="4" fill="#7fd4ff" stroke="#2a6a96" stroke-width="2"/><circle cx="24" cy="25" r="4" fill="#7fd4ff" stroke="#2a6a96" stroke-width="2"/><path d="M11.5 14.5L20.5 9M11.5 17.5l9 5.5" stroke="#e8f1fa" stroke-width="2.4"/>',
    star: '<path d="M16 3l3.9 8 8.8 1.2-6.4 6.1 1.6 8.7L16 22.8 8.1 27l1.6-8.7-6.4-6.1 8.8-1.2Z" fill="#ffd05a" stroke="#a86a0c" stroke-width="2" stroke-linejoin="round"/>',
    storm: '<path d="M9 21a6 6 0 0 1 1-11.9A8 8 0 0 1 25 12a5 5 0 0 1-1 10Z" fill="#9fb0c4" stroke="#4a5a74" stroke-width="2.2" stroke-linejoin="round"/><path d="M17 17l-4 6h4l-2 5 6-8h-4l2-3Z" fill="#ffd05a" stroke="#a86a0c" stroke-width="1.4" stroke-linejoin="round"/>',
    moon: '<path d="M22 5a11 11 0 1 0 5 20A10 10 0 0 1 22 5Z" fill="#ffe9a0" stroke="#a88a2a" stroke-width="2.2" stroke-linejoin="round"/>',
    sun: '<circle cx="16" cy="16" r="6.5" fill="#ffd05a" stroke="#a86a0c" stroke-width="2.2"/><g stroke="#ffd05a" stroke-width="3" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3"/></g>',
    arrow: '<path d="M6 16h18M17 8l8 8-8 8" fill="none" stroke="#e8f1fa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    heart: '<path d="M16 28S4 20 4 12a6.5 6.5 0 0 1 12-3 6.5 6.5 0 0 1 12 3c0 8-12 16-12 16Z" fill="#ff7a8a" stroke="#a82a3a" stroke-width="2.2" stroke-linejoin="round"/>',
    bolt: '<path d="M18 3L6 18h8l-2 11 12-16h-8Z" fill="#ffd05a" stroke="#a86a0c" stroke-width="2.2" stroke-linejoin="round"/>',
    gift: '<rect x="4" y="12" width="24" height="16" rx="3" fill="#ff7a8a" stroke="#a82a3a" stroke-width="2.2"/><rect x="3" y="8" width="26" height="6" rx="2" fill="#ffb3bd" stroke="#a82a3a" stroke-width="2"/><path d="M16 8v20" stroke="#ffe08a" stroke-width="3.5"/><path d="M16 8C13 3 8 4 10 7s6 1 6 1ZM16 8c3-5 8-4 6-1s-6 1-6 1Z" fill="#ffe08a" stroke="#a86a0c" stroke-width="1.6"/>',
    // узлы Созвездия
    n_power: '<path d="M18 3L6 18h8l-2 11 12-16h-8Z" fill="#ff9a3c" stroke="#a8421a" stroke-width="2.2" stroke-linejoin="round"/>',
    n_speed: '<g fill="none" stroke="#7fd4ff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8l9 8-9 8"/><path d="M15 8l9 8-9 8"/></g>',
    n_width: '<g fill="none" stroke="#ff9a3c" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h26M9 10l-6 6 6 6M23 10l6 6-6 6"/></g>',
    n_deep: '<path d="M16 4v18M8 15l8 10 8-10" fill="none" stroke="#c9d6e4" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 28h20" stroke="#ff9a3c" stroke-width="3.4" stroke-linecap="round"/>',
    n_reson: '<g fill="none" stroke="#9a8bff" stroke-width="3" stroke-linecap="round"><path d="M3 16h4l3-8 4 16 4-12 3 4h8"/></g>',
    n_cap: '<path d="M4 10l12-6 12 6v13l-12 6-12-6Z" fill="#7fd4ff" stroke="#2a6a96" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 10l12 6 12-6M16 16v13" stroke="#2a6a96" stroke-width="2" fill="none"/>',
    n_value: '<circle cx="16" cy="16" r="12" fill="#ffd05a" stroke="#a86a0c" stroke-width="2.2"/><path d="M11 21l10-10" stroke="#a86a0c" stroke-width="2.8" stroke-linecap="round"/><circle cx="11.5" cy="11.5" r="2.2" fill="#a86a0c"/><circle cx="20.5" cy="20.5" r="2.2" fill="#a86a0c"/>',
    n_press: '<g fill="none" stroke="#7fd4ff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4v8M11 8l5 5 5-5M16 28v-8M11 24l5-5 5 5"/></g><rect x="6" y="14.5" width="20" height="3" rx="1.5" fill="#e8f1fa"/>',
    n_luck: '<g fill="#2fcf9a" stroke="#0f7a58" stroke-width="2"><circle cx="11" cy="11" r="5"/><circle cx="21" cy="11" r="5"/><circle cx="11" cy="21" r="5"/><circle cx="21" cy="21" r="5"/></g><path d="M16 16l2 13" stroke="#0f7a58" stroke-width="3" stroke-linecap="round"/>',
    n_smelt2: '<rect x="4" y="19" width="24" height="8" rx="2.4" fill="#e5ecf5" stroke="#7a8ca6" stroke-width="2"/><path d="M8 17l6-8 6 8M20 12h6M20 8h6" fill="none" stroke="#ff9a3c" stroke-width="3" stroke-linecap="round"/>',
    n_heat: '<path d="M16 3C20 9 25 12 25 19A9 9 0 0 1 7 19C7 14 10 12 11 8 13 11 15 9 16 3Z" fill="#ff9a3c" stroke="#a8421a" stroke-width="2" stroke-linejoin="round"/>',
    n_eco: '<path d="M6 26C6 14 14 6 27 5c0 12-7 21-18 21" fill="#2fcf9a" stroke="#0f7a58" stroke-width="2.2" stroke-linejoin="round"/><path d="M6 26L18 14" stroke="#0f7a58" stroke-width="2.4" stroke-linecap="round"/>',
    n_eye: '<path d="M2 16S8 7 16 7s14 9 14 9-6 9-14 9S2 16 2 16Z" fill="#e8f1fa" stroke="#4a5a74" stroke-width="2.2"/><circle cx="16" cy="16" r="5.5" fill="#5dffd6" stroke="#0b6a5a" stroke-width="2"/><circle cx="16" cy="16" r="2.2" fill="#0b2a2a"/>',
    n_storm: '<path d="M9 21a6 6 0 0 1 1-11.9A8 8 0 0 1 25 12a5 5 0 0 1-1 10Z" fill="#c9d6e4" stroke="#4a5a74" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 24l-2 5M18 24l-2 5M24 24l-2 5" stroke="#7fd4ff" stroke-width="2.6" stroke-linecap="round"/>',
    n_x_ice: '<g stroke="#e8fbff" stroke-width="2.6" stroke-linecap="round"><path d="M16 3v26M5 9.5l22 13M27 9.5L5 22.5"/></g><path d="M16 11C18.5 14 21 15 21 19a5 5 0 0 1-10 0c0-2.5 2-3.5 2.5-6 .8 1.2 1.8 1 2.5-2Z" fill="#ff9a3c" stroke="#a8421a" stroke-width="1.6"/>',
    n_x_pantry: '<path d="M9 8h14l2 6v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 7 27V14Z" fill="#ffd05a" stroke="#a86a0c" stroke-width="2.2" stroke-linejoin="round"/><rect x="11" y="3" width="10" height="5" rx="2" fill="#c98a4a" stroke="#6a3d14" stroke-width="1.8"/><path d="M12 19h8M12 24h8" stroke="#a86a0c" stroke-width="2.2" stroke-linecap="round"/>',
    n_x_nose: '<circle cx="16" cy="16" r="12" fill="none" stroke="#5dffd6" stroke-width="2.4"/><circle cx="16" cy="16" r="6.5" fill="none" stroke="#5dffd6" stroke-width="2" opacity=".7"/><path d="M16 16L25 7" stroke="#ffd05a" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="2.6" fill="#ffd05a"/>',
    // перки
    p_start: '<circle cx="16" cy="16" r="12" fill="#ffd05a" stroke="#a86a0c" stroke-width="2.2"/><path d="M16 9v14M9 16h14" stroke="#a86a0c" stroke-width="3.2" stroke-linecap="round"/>',
    p_ore: '<path d="M4 24l8-14 8 8 4-6 4 12Z" fill="#7fd4ff" stroke="#2a6a96" stroke-width="2.2" stroke-linejoin="round"/>',
    p_haul: '<path d="M4 10l12-6 12 6v13l-12 6-12-6Z" fill="#c98a4a" stroke="#6a3d14" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 10l12 6 12-6M16 16v13" stroke="#6a3d14" stroke-width="2" fill="none"/>',
    p_ark: '<path d="M3 20h26l-4 7H8Z" fill="#ff9a3c" stroke="#a8541a" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 4v14M16 4l9 12H16Z" fill="#e8f1fa" stroke="#7a8ca6" stroke-width="2" stroke-linejoin="round"/>',
    p_tier: '<path d="M7 24l9-17 9 17" fill="none" stroke="#ff9a3c" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 28h10" stroke="#e8f1fa" stroke-width="3.4" stroke-linecap="round"/>',
    p_contract: '<rect x="6" y="5" width="20" height="23" rx="3.4" fill="#e8f1fa" stroke="#4a5a74" stroke-width="2.2"/><path d="M10.5 15h11M10.5 20h11M10.5 25h6" stroke="#7a8ca6" stroke-width="2.2" stroke-linecap="round"/>',
    p_build: '<path d="M4 15L16 4l12 11" fill="none" stroke="#e8f1fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 14v13h18V14L16 6Z" fill="#9fb0c4" stroke="#4a5a74" stroke-width="2" stroke-linejoin="round"/>',
    p_off: '<circle cx="16" cy="16" r="12" fill="#e8f1fa" stroke="#4a5a74" stroke-width="2.2"/><path d="M16 9v7l5 3" stroke="#4a5a74" stroke-width="2.8" fill="none" stroke-linecap="round"/>',
    p_power: '<path d="M18 3L6 18h8l-2 11 12-16h-8Z" fill="#ff9a3c" stroke="#a8421a" stroke-width="2.2" stroke-linejoin="round"/>',
    p_heat: '<path d="M16 3C20 9 25 12 25 19A9 9 0 0 1 7 19C7 14 10 12 11 8 13 11 15 9 16 3Z" fill="#ff9a3c" stroke="#a8421a" stroke-width="2" stroke-linejoin="round"/>'
  };
  A.icon = (name, size, cls) => `<svg ${NS} class="ic ${cls || ''}" viewBox="0 0 32 32" width="${size || 24}" height="${size || 24}" aria-hidden="true">${I[name] || ''}</svg>`;
  A.iconUrl = (name) => A.dataUrl(`<svg ${NS} viewBox="0 0 32 32" width="64" height="64">${I[name] || ''}</svg>`);
  A.ICONS = I;

  /* ---------------- находки: значки 12 штук ---------------- */
  const RG = {
    tusk: '<path d="M10 24C9 12 15 6 24 6c-6 3-8 8-8 18Z" fill="#fff6d8" stroke="#8a6a3a" stroke-width="2" stroke-linejoin="round"/><path d="M12 22c0-7 3-11 8-13" fill="none" stroke="#e0c890" stroke-width="2"/>',
    compass: '<circle cx="16" cy="16" r="11" fill="#e8f1fa" stroke="#6a4a1a" stroke-width="2.4"/><path d="M16 7l3 9-3 9-3-9Z" fill="#ff5f5f" stroke="#7a2a2a" stroke-width="1.4" stroke-linejoin="round"/><path d="M16 7l3 9h-6Z" fill="#fff"/>',
    amber: '<path d="M16 5c8 0 12 6 12 11s-5 11-12 11S4 21 4 16 8 5 16 5Z" fill="#ffb02e" stroke="#9a5a06" stroke-width="2.2"/><path d="M16 11c-4-4-8-1-6 3s6 2 6 2 6 2 6-2-2-7-6-3Z" fill="#7a3a06" opacity=".75"/><path d="M9 11c1-3 4-4 6-4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>',
    heart: '<path d="M16 28S4 20 4 12a6.5 6.5 0 0 1 12-3 6.5 6.5 0 0 1 12 3c0 8-12 16-12 16Z" fill="#a9e2f5" stroke="#2a6a96" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 11c1-2 3-3 5-2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
    globe: '<circle cx="16" cy="16" r="11" fill="#9fd6f2" stroke="#2a6a96" stroke-width="2.4"/><path d="M5 16h22M16 5c-5 6-5 16 0 22M16 5c5 6 5 16 0 22" fill="none" stroke="#e8fbff" stroke-width="1.8"/><rect x="11" y="26" width="10" height="3.4" rx="1.6" fill="#8a6a3a"/>',
    coin: '<circle cx="16" cy="16" r="12" fill="#d9b25a" stroke="#6a4a0a" stroke-width="2.4"/><circle cx="16" cy="16" r="7" fill="none" stroke="#8a6a1a" stroke-width="2"/><path d="M13 13h6M13 19h6" stroke="#6a4a0a" stroke-width="2" stroke-linecap="round"/>',
    lamp: '<rect x="10" y="9" width="12" height="16" rx="3" fill="#ffd05a" stroke="#7a4a06" stroke-width="2.2"/><path d="M12 9a4 4 0 0 1 8 0" fill="none" stroke="#4a5a74" stroke-width="2.6"/><rect x="9" y="24" width="14" height="4" rx="1.6" fill="#4a5a74"/><path d="M16 12v9" stroke="#fff6c8" stroke-width="3" stroke-linecap="round"/>',
    diary: '<rect x="7" y="4" width="18" height="24" rx="2.6" fill="#8a5a2a" stroke="#3a220a" stroke-width="2.2"/><path d="M11 4v24" stroke="#3a220a" stroke-width="1.8"/><rect x="14" y="9" width="8" height="6" rx="1.4" fill="#e8d8b0"/><path d="M14 19h8M14 23h6" stroke="#e8d8b0" stroke-width="1.8" stroke-linecap="round"/>',
    mask: '<path d="M6 8c3-3 17-3 20 0 1 8-2 18-10 20C8 26 5 16 6 8Z" fill="#9aa5b5" stroke="#3a4452" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 14l4 1M22 14l-4 1" stroke="#1a2230" stroke-width="3" stroke-linecap="round"/><path d="M14 22h4" stroke="#1a2230" stroke-width="2.6" stroke-linecap="round"/>',
    harpoon: '<path d="M6 26L24 8" stroke="#c9b48a" stroke-width="3.4" stroke-linecap="round"/><path d="M22 4l6 6-3 1-4-4Z" fill="#e8f1fa" stroke="#6a7a8a" stroke-width="2" stroke-linejoin="round"/><path d="M9 20l3 3" stroke="#8a6a3a" stroke-width="2.4"/>',
    key: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="#b86a3a" stroke-width="3.4"/><path d="M15.5 15.5L27 27M23 23l3-3M20 20l3-3" stroke="#b86a3a" stroke-width="3.4" stroke-linecap="round"/>',
    shard: '<path d="M16 3l9 9-3 14-9 3-7-10Z" fill="#6f7fd6" stroke="#2a3490" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 3l-5 9 11 0Z" fill="#c9d4ff" opacity=".8"/><path d="M16 3l9 9-3 14" fill="none" stroke="#fff" stroke-width="1.4" opacity=".5"/>'
  };
  A.relicIcon = (id, size, locked) => `<svg ${NS} class="ic" viewBox="0 0 32 32" width="${size || 40}" height="${size || 40}" ${locked ? 'style="filter:brightness(0) opacity(.35)"' : ''}>${RG[id] || ''}</svg>`;

  /* ---------------- ковчег (прогресс по этапам) ---------------- */
  A.arkSvg = (stage) => {
    const on = (i) => (stage > i ? 1 : 0.18);
    const hull = stage > 1 ? '#ff9a3c' : '#5a6b84';
    return `<svg ${NS} viewBox="0 0 320 170" width="320" height="170"><defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc16e"/><stop offset="1" stop-color="#c8561a"/></linearGradient><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9e3ee"/><stop offset="1" stop-color="#7a8ca6"/></linearGradient><radialGradient id="g" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#e8fbff"/><stop offset="1" stop-color="#3f90c0"/></radialGradient><radialGradient id="f" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffae3a"/><stop offset="1" stop-color="#ff4d12" stop-opacity="0"/></radialGradient></defs>
<path d="M10 130h300" stroke="#7fd4ff" stroke-width="3" stroke-opacity=".5" stroke-dasharray="6 7"/>
<g opacity="${on(0)}"><path d="M30 128Q60 150 160 150H280Q304 138 304 128Z" fill="${stage > 0 ? 'url(#m)' : '#5a6b84'}" stroke="#2a3a52" stroke-width="3" stroke-linejoin="round"/></g>
<g opacity="${on(1)}"><path d="M44 124Q56 74 130 66H250Q296 76 298 124Z" fill="${stage > 1 ? 'url(#h)' : '#5a6b84'}" stroke="#7a3410" stroke-width="3.4" stroke-linejoin="round"/><path d="M62 100Q100 82 240 84" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.4" stroke-linecap="round"/></g>
<g opacity="${on(2)}"><rect x="2" y="92" width="30" height="34" rx="8" fill="#4a5a74" stroke="#121b29" stroke-width="3"/><circle cx="10" cy="109" r="14" fill="url(#f)"/><rect x="2" y="104" width="16" height="10" rx="4" fill="#ffae3a"/></g>
<g opacity="${on(3)}"><circle cx="196" cy="98" r="22" fill="#26364f" stroke="#121b29" stroke-width="3.4"/><circle cx="196" cy="98" r="12" fill="#7a6bff"/><circle cx="196" cy="98" r="5" fill="#e8fbff"/></g>
<g opacity="${on(4)}"><path d="M110 70Q150 22 206 70Z" fill="url(#g)" stroke="#2f78b0" stroke-width="3.4" stroke-linejoin="round"/><path d="M130 66Q148 40 176 52" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".8"/></g>
<g opacity="${on(5)}"><path d="M250 66V26" stroke="#c9d6e4" stroke-width="5" stroke-linecap="round"/><path d="M250 28l30 14-30 8Z" fill="#ff5f5f" stroke="#a82a2a" stroke-width="2.4" stroke-linejoin="round"/><circle cx="250" cy="24" r="6" fill="#5dffd6" stroke="#0b6a5a" stroke-width="2.4"/></g>
</svg>`;
  };

  /* ---------------- загрузка спрайтов ---------------- */
  A.dataUrl = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  A.load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(im); im.src = A.dataUrl(s); });
  A.img = { rover: [], build: {}, res: {} };
  A.roverOpts = (S) => {
    const lv = (id) => (S.lv && S.lv[id]) || 0;
    return { pw: Math.min(5, Math.floor(lv('b_power') / 2)), wd: lv('b_width'), seg: Math.min(3, Math.floor(lv('c_cap') / 3)), crates: Math.min(3, Math.floor(lv('c_cap') / 2)), tank: Math.min(3, Math.floor(lv('s_heat') / 3)), sp: Math.min(2, Math.floor(lv('b_speed') / 3)), eye: lv('s_eye') > 0 ? 1 : 0, ice: lv('x_ice') ? 1 : 0 };
  };
  A.roverKey = (tier, o) => [tier, o.pw, o.wd, o.seg, o.crates, o.tank, o.sp, o.eye, o.ice].join('.');
  A.roverSvg = (tier, o) => ROVER(D.TIER_PAL[tier], LINES[tier], o);
  A.roverCache = {}; A.roverLoading = {}; A.headCache = {}; A.headLoading = {};
  A.headKey = (S) => { const o = A.roverOpts(S); return [S.tier, o.pw, o.wd, o.ice].join('.'); };
  /* слои вращающейся головы под текущие улучшения: {o: внешний, i: внутренний} */
  A.headFor = (S) => {
    const o = A.roverOpts(S), key = A.headKey(S);
    if (A.headCache[key]) { A.headLast = A.headCache[key]; return A.headLast; }
    if (!A.headLoading[key]) {
      A.headLoading[key] = 1;
      Promise.all([A.load(HEAD(D.TIER_PAL[S.tier], LINES[S.tier], o, 'outer')), A.load(HEAD(D.TIER_PAL[S.tier], LINES[S.tier], o, 'inner'))]).then((r) => { A.headCache[key] = { o: r[0], i: r[1] }; });
    }
    return A.headLast || null;
  };
  /* картинка вездехода под текущие улучшения: пока собирается новая, показываем предыдущую */
  A.roverFor = (S) => {
    const o = A.roverOpts(S), key = A.roverKey(S.tier, o);
    if (A.roverCache[key]) { A.roverLast = A.roverCache[key]; return A.roverLast; }
    if (!A.roverLoading[key]) { A.roverLoading[key] = 1; A.load(A.roverSvg(S.tier, Object.assign({ nohead: 1 }, o))).then((im) => { A.roverCache[key] = im; }); }
    return A.roverLast || A.img.rover[S.tier];
  };

  A.init = async function () {
    const jobs = [];
    D.TIERS.forEach((_, i) => jobs.push(A.load(A.roverSvg(i)).then((im) => { A.img.rover[i] = im; })));
    Object.keys(A.BUILD_SVG).forEach((k) => jobs.push(A.load(A.BUILD_SVG[k]).then((im) => { A.img.build[k] = im; })));
    Object.keys(A.RES_SVG).forEach((k) => jobs.push(A.load(A.RES_SVG[k]).then((im) => { A.img.res[k] = im; })));
    await Promise.all(jobs);
    A.makeTiles();
  };

  /* ---------------- текстуры тайлов: бесшовные атласы 8×8 тайлов (периодические) ---------------- */
  const TS = 96, NT = 8, AT = TS * NT;
  function rnd(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return [c, c.getContext('2d')]; }
  // периодическое рисование: повторяем фигуру со сдвигами ±AT
  function wrap(fn) { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) fn(dx * AT, dy * AT); }
  function blot(x, R, n, col, rmin, rmax, a) {
    for (let i = 0; i < n; i++) {
      const px = R() * AT, py = R() * AT, r = rmin + R() * (rmax - rmin), al = a * (0.45 + R() * 0.55);
      wrap((ox, oy) => {
        const X = px + ox, Y = py + oy; if (X + r < 0 || Y + r < 0 || X - r > AT || Y - r > AT) return;
        const gr = x.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, col.replace('A', al)); gr.addColorStop(1, col.replace('A', 0));
        x.fillStyle = gr; x.fillRect(X - r, Y - r, r * 2, r * 2);
      });
    }
  }
  function dots(x, R, n, col, rmin, rmax) {
    for (let i = 0; i < n; i++) { const px = R() * AT, py = R() * AT, r = rmin + R() * (rmax - rmin); x.fillStyle = col.replace('A', 0.4 + R() * 0.5); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
  }
  function cracks(x, R, n, col, lw, len, step) {
    x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const px = R() * AT, py = R() * AT; const pts = [[0, 0]]; let cx = 0, cy = 0;
      for (let k = 0; k < len; k++) { cx += (R() - 0.5) * step; cy += (R() - 0.5) * step; pts.push([cx, cy]); }
      wrap((ox, oy) => { x.beginPath(); pts.forEach((p, q) => { if (q) x.lineTo(px + ox + p[0], py + oy + p[1]); else x.moveTo(px + ox, py + oy); }); x.stroke(); });
    }
  }
  function atlas(kind) {
    const [c, x] = cv(AT), R = rnd(kind.length * 977 + 13);
    if (kind === 'snow') {
      x.fillStyle = '#e4f2fb'; x.fillRect(0, 0, AT, AT);
      blot(x, R, 70, 'rgba(255,255,255,A)', 60, 150, 0.9);
      blot(x, R, 60, 'rgba(160,200,232,A)', 50, 140, 0.35);
      blot(x, R, 30, 'rgba(120,170,215,A)', 40, 90, 0.18);
      dots(x, R, 260, 'rgba(255,255,255,A)', 0.8, 2.1);
    } else if (kind === 'ice') {
      x.fillStyle = '#74c3e8'; x.fillRect(0, 0, AT, AT);
      blot(x, R, 70, 'rgba(190,236,252,A)', 60, 150, 0.6);
      blot(x, R, 60, 'rgba(40,120,190,A)', 50, 140, 0.34);
      cracks(x, R, 26, 'rgba(255,255,255,0.5)', 1.8, 5, 46);
      cracks(x, R, 16, 'rgba(30,100,160,0.35)', 1.4, 4, 40);
      dots(x, R, 90, 'rgba(255,255,255,A)', 0.8, 2);
    } else if (kind === 'rock') {
      x.fillStyle = '#56647c'; x.fillRect(0, 0, AT, AT);
      blot(x, R, 80, 'rgba(140,160,190,A)', 50, 130, 0.5);
      blot(x, R, 70, 'rgba(22,32,54,A)', 50, 130, 0.34);
      cracks(x, R, 34, 'rgba(14,22,40,0.5)', 2, 4, 36);
      dots(x, R, 160, 'rgba(255,255,255,A)', 0.8, 2.2);
    } else if (kind === 'dug') {
      x.fillStyle = '#7bb4d0'; x.fillRect(0, 0, AT, AT);
      blot(x, R, 60, 'rgba(255,255,255,A)', 60, 140, 0.3);
      blot(x, R, 60, 'rgba(30,76,118,A)', 50, 130, 0.34);
      cracks(x, R, 14, 'rgba(255,255,255,0.25)', 1.4, 4, 40);
    } else if (kind === 'void') {
      x.fillStyle = '#121b30'; x.fillRect(0, 0, AT, AT);
      blot(x, R, 50, 'rgba(80,120,200,A)', 60, 140, 0.2);
      dots(x, R, 200, 'rgba(160,210,255,A)', 0.7, 1.7);
    } else {
      x.fillStyle = '#141c2e'; x.fillRect(0, 0, AT, AT);
      blot(x, R, 50, 'rgba(90,110,150,A)', 50, 120, 0.28);
    }
    return c;
  }
  function ovTile(draw, seed) { const [c, x] = cv(TS); draw(x, rnd(seed)); return c; }
  function ore(res, sc) {
    return (x) => { const im = A.img.res[res]; if (im && im.width) { const s = TS * (sc || 1.02); x.drawImage(im, (TS - s) / 2, (TS - s) / 2 - 2, s, s); } };
  }
  A.tiles = {}; A.atlas = {};
  A.makeTiles = function () {
    const T = D.T;
    A.atlas = { snow: atlas('snow'), ice: atlas('ice'), rock: atlas('rock'), dug: atlas('dug'), void: atlas('void'), edge: atlas('edge') };
    A.baseOf = {}; A.baseOf[T.SNOW] = 'snow'; A.baseOf[T.CREV] = 'snow'; A.baseOf[T.ICE] = 'ice'; A.baseOf[T.RELIC] = 'ice'; A.baseOf[T.ROCK] = 'rock'; A.baseOf[T.IRON] = 'rock'; A.baseOf[T.TI] = 'rock'; A.baseOf[T.AUR] = 'rock'; A.baseOf[T.DUG] = 'dug'; A.baseOf[T.VOID] = 'void'; A.baseOf[T.EDGE] = 'edge';
    const over = {};
    over[T.IRON] = [0, 1, 2, 3].map((i) => ovTile(ore('iron'), 5 + i));
    over[T.TI] = [0, 1, 2, 3].map((i) => ovTile(ore('ti'), 15 + i));
    over[T.AUR] = [0, 1, 2, 3].map((i) => ovTile(ore('aur'), 25 + i));
    over[T.RELIC] = [0, 1].map((i) => ovTile(ore('relic', 1.0), 35 + i));
    over[T.CREV] = [0, 1, 2, 3].map((i) => ovTile((x, R) => {
      x.lineCap = 'round'; x.lineJoin = 'round';
      [[16, 'rgba(70,170,255,0.30)'], [9, 'rgba(18,56,120,0.92)'], [5, 'rgba(5,16,48,1)']].forEach(([lw, col]) => {
        x.strokeStyle = col; x.lineWidth = lw; let px = 4, py = 20 + R() * 56; x.beginPath(); x.moveTo(px, py);
        for (let k = 0; k < 4; k++) { px += 22 + R() * 6; py = clamp(py + (R() - 0.5) * 40, 6, TS - 6); x.lineTo(px, py); } x.lineTo(TS + 2, clamp(py + (R() - 0.5) * 20, 6, TS - 6)); x.stroke();
      });
    }, 45 + i));
    A.over = over; A.TS = TS; A.NT = NT;
  };

  g.Art = A;
})(window);
