'use strict';
/* Данные игры «Полярный Ковчег»: константы, постройки, дерево «Созвездие», ковчег, цели, находки.
   Файл без DOM — его же используют ядро и headless-бот (Node). */
(function (g) {
  const L = (ru, en) => ({ ru, en });
  const D = {};
  D.VERSION = '1.0.0';
  D.SAVE_KEY = 'polarark_save_v1';

  // ---------- мир ----------
  D.W = 300; D.H = 300; D.CX = 150; D.CY = 150; D.CLEAR = 15.5;
  D.T = { SNOW: 0, ICE: 1, ROCK: 2, IRON: 3, TI: 4, AUR: 5, RELIC: 6, VOID: 7, CREV: 8, EDGE: 9, DUG: 10 };
  D.HP = { 1: 1.0, 2: 3.2, 3: 2.4, 4: 5.2, 5: 7.5, 6: 3.0, 9: 1e9 };
  D.SOLID = [0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0];                       // индексы по типу тайла
  D.YIELD = { 1: 'ice', 3: 'iron', 4: 'ti', 5: 'aur' };              // что даёт тайл
  D.RES = {
    ice: { val: 1, ru: 'Лёд', en: 'Ice' },
    iron: { val: 4, ru: 'Железо', en: 'Iron' },
    ti: { val: 14, ru: 'Титан', en: 'Titanium' },
    aur: { val: 46, ru: 'Аврора', en: 'Aurora' }
  };
  D.SMELT_MULT = 2.2;                                                  // ценность слитка относительно руды
  D.RING1 = 30; D.RING2 = 60; D.RING3 = 100;                           // границы зон (в тайлах от лагеря)
  D.HPDIST = 48;                                                       // твёрдость породы растёт с расстоянием: ×(1 + dist/HPDIST)
  D.ZONE_COLD = [1, 1.2, 1.55, 2.0];                                   // расход тепла по зонам
  D.ZONES = [
    { ru: 'Равнина', en: 'Plains', col: '#7fd4ff' },
    { ru: 'Каменные гряды', en: 'Rocky ridges', col: '#9a8bff' },
    { ru: 'Ледяные каньоны', en: 'Ice canyons', col: '#5dffd6' },
    { ru: 'Сердце льдов', en: 'Heart of the ice', col: '#ffd05a' }
  ];
  D.zoneOf = (dist) => (dist < D.RING1 ? 0 : dist < D.RING2 ? 1 : dist < D.RING3 ? 2 : 3);
  D.DAYLEN = 480;                                                      // секунд в сутках

  // ---------- техника ----------
  D.TIERS = [
    { ru: 'Термобур Mk I', en: 'Thermal Drill Mk I', power: 1.0, speed: 4.5, radius: 0.62, cap: 0, cost: 0, req: null },
    { ru: 'Термобур Mk II', en: 'Thermal Drill Mk II', power: 1.7, speed: 4.9, radius: 0.72, cap: 40, cost: 1400, req: 'hangar' },
    { ru: 'Термобур Mk III', en: 'Thermal Drill Mk III', power: 2.8, speed: 5.3, radius: 0.84, cap: 90, cost: 14000, req: 'forge' },
    { ru: 'Термобур Mk IV', en: 'Thermal Drill Mk IV', power: 4.6, speed: 5.7, radius: 0.96, cap: 160, cost: 110000, req: 'dome' },
    { ru: 'Термобур Mk V', en: 'Thermal Drill Mk V', power: 7.6, speed: 6.2, radius: 1.08, cap: 260, cost: 620000, req: 'yard' }
  ];
  D.TIER_PAL = [
    ['#ffc16e', '#f08a2c', '#c8561a'],
    ['#9fe3ff', '#3fa7e0', '#1d6aa8'],
    ['#c9a9ff', '#8a5ee6', '#53309f'],
    ['#9bffd9', '#2fcf9a', '#12795a'],
    ['#ffe58a', '#f2b134', '#a86a0c']
  ];

  // ---------- постройки лагеря ----------
  // pos — смещение центра от лагеря в тайлах, cost — очки строительства
  D.BUILD = [
    { id: 'hangar', cost: 1, pos: [-8, -3.5], ru: 'Ангар', en: 'Hangar', dru: 'Открывает «Созвездие»: ветки «Бур» и «Груз». Здесь же новые модели вездехода.', den: 'Unlocks the Constellation tree (Drill and Cargo) and new rover models.' },
    { id: 'boiler', cost: 1, pos: [8, -3.5], ru: 'Котельная', en: 'Boiler house', dru: 'Быстро согревает вездеход на территории базы (в 6 раз быстрее) и добавляет +25 к запасу тепла.', den: 'Refills heat 6x faster inside the base and adds +25 max heat.' },
    { id: 'radio', cost: 1, pos: [-8, 3.5], ru: 'Радиомачта', en: 'Radio mast', dru: 'Контракты по рации, телепорт «Домой» и дозорные дроны, которые копят добычу, пока вас нет.', den: 'Contracts, Home teleport and scout drones that earn while you are away.' },
    { id: 'forge', cost: 2, pos: [8, 3.5], ru: 'Кузня', en: 'Forge', dru: 'Плавит железо и титан в слитки: цена ×2,2, и только слитки идут на ковчег.', den: 'Smelts iron and titanium into ingots: x2.2 value, and only ingots go into the ark.' },
    { id: 'meteo', cost: 2, pos: [-4.5, -8], ru: 'Метеостанция', en: 'Weather station', dru: 'Прогноз метелей и ночи. Метели обходятся в 2 раза дешевле по теплу.', den: 'Storm and night forecasts. Storms cost half the heat.' },
    { id: 'dome', cost: 2, pos: [0, -8.6], ru: 'Купол науки', en: 'Science dome', dru: 'Открывает три особых узла «Созвездия» и даёт +1 очко науки за находку.', den: 'Unlocks three special Constellation nodes and +1 science point per relic.' },
    { id: 'storage', cost: 1, pos: [-4.5, 8], ru: 'Склад', en: 'Warehouse', dru: 'Вместимость кузова +25% (контейнеры с запасом на базе).', den: 'Cargo capacity +25% (spare containers at the base).' },
    { id: 'habitat', cost: 1, pos: [4.5, -8], ru: 'Жилой модуль', en: 'Habitat', dru: '+1 слот контрактов и +50% к доходу дозорных дронов, пока вас нет (максимум копится на 2 часа дольше).', den: '+1 contract slot and +50% scout-drone income while you are away (stores 2 hours longer).' },
    { id: 'power', cost: 1, pos: [4.5, 8], ru: 'Генераторная', en: 'Power plant', dru: '−15% расхода тепла и +10% к обзору ночью. Ночью база освещена.', den: '−15% heat use and +10% night vision. The base is lit at night.' },
    { id: 'yard', cost: 3, pos: [0, 9.4], ru: 'Верфь ковчега', en: 'Ark shipyard', dru: 'Здесь строится ковчег по этапам. Достроишь — отплывёшь в новый сезон.', den: 'Build the ark stage by stage. Finish it to sail into a new season.' }
  ];
  D.BASE = { hw: 10.9, hh: 10.6 };                                     // ограда базы: полуширина и полувысота в тайлах
  D.osNeed = (n) => Math.round(60 * Math.pow(1.95, n));               // всего заработано до (n+1)-го очка строительства

  // ---------- «Созвездие» ----------
  // br: B бур, C груз, S выживание, X особые. req: [[узел, уровень], ...]. key — нужен Купол науки.
  D.NODES = [
    { id: 'b_power', br: 'B', max: 14, base: 40, gr: 1.5, x: 0, y: 0, req: [], ru: 'Мощность бура', en: 'Drill power', dru: '+20% к мощности термобура за уровень', den: '+20% drill power per level' },
    { id: 'b_speed', br: 'B', max: 10, base: 70, gr: 1.55, x: -1, y: 1, req: [['b_power', 1]], ru: 'Ход вездехода', en: 'Rover speed', dru: '+6% к скорости за уровень', den: '+6% move speed per level' },
    { id: 'b_width', br: 'B', max: 6, base: 130, gr: 1.65, x: 1, y: 1, req: [['b_power', 2]], ru: 'Широкий нагрев', en: 'Wide heat', dru: 'Бур плавит заметно более широкую полосу (+0,14 тайла за уровень)', den: 'The drill melts a much wider swath (+0.14 tile per level)' },
    { id: 'b_deep', br: 'B', max: 6, base: 210, gr: 1.7, x: 1, y: 2, req: [['b_width', 1]], ru: 'Глубокий жар', en: 'Deep heat', dru: '−8% твёрдости камня и руды за уровень', den: '−8% rock and ore hardness per level' },
    { id: 'b_reson', br: 'B', max: 4, base: 380, gr: 1.8, x: 0, y: 3, req: [['b_deep', 1]], ru: 'Резонанс', en: 'Resonance', dru: 'Каждая руда ускоряет бур: до 3 зарядов, +6% за уровень', den: 'Each ore speeds the drill: up to 3 stacks, +6% per level' },
    { id: 'c_cap', br: 'C', max: 14, base: 35, gr: 1.5, x: 0, y: 0, req: [], ru: 'Кузов', en: 'Cargo bed', dru: '+30 к вместимости кузова за уровень', den: '+30 cargo capacity per level' },
    { id: 'c_value', br: 'C', max: 12, base: 85, gr: 1.6, x: -1, y: 1, req: [['c_cap', 1]], ru: 'Выгодный сбыт', en: 'Better prices', dru: '+6% к цене всего груза за уровень', den: '+6% to all sale prices per level' },
    { id: 'c_press', br: 'C', max: 5, base: 95, gr: 1.6, x: 1, y: 1, req: [['c_cap', 2]], ru: 'Сжатие', en: 'Compression', dru: 'Лёд занимает на 10% меньше места за уровень', den: 'Ice takes 10% less space per level' },
    { id: 'c_luck', br: 'C', max: 6, base: 160, gr: 1.65, x: 1, y: 2, req: [['c_press', 1]], ru: 'Находчивость', en: 'Resourcefulness', dru: '+6% шанс дополнительной добычи с руды', den: '+6% chance of a bonus drop from ore' },
    { id: 'c_smelt2', br: 'C', max: 5, base: 340, gr: 1.75, x: 0, y: 3, req: [['c_value', 2]], need: 'forge', ru: 'Двойная плавка', en: 'Double smelt', dru: '+6% шанс удвоить слиток (нужна Кузня)', den: '+6% chance to double an ingot (needs Forge)' },
    { id: 's_heat', br: 'S', max: 14, base: 30, gr: 1.5, x: 0, y: 0, req: [], ru: 'Запас тепла', en: 'Heat reserve', dru: '+12 к запасу тепла за уровень', den: '+12 max heat per level' },
    { id: 's_eco', br: 'S', max: 8, base: 75, gr: 1.55, x: -1, y: 1, req: [['s_heat', 1]], ru: 'Экономия', en: 'Efficiency', dru: '−6% расхода тепла за уровень', den: '−6% heat use per level' },
    { id: 's_eye', br: 'S', max: 5, base: 120, gr: 1.6, x: 1, y: 1, req: [['s_eco', 1]], ru: 'Ночной глаз', en: 'Night eye', dru: '+12% к обзору ночью и в метель за уровень', den: '+12% night and storm vision per level' },
    { id: 's_storm', br: 'S', max: 3, base: 260, gr: 1.9, x: 0, y: 2, req: [['s_eco', 2]], ru: 'Метелелюб', en: 'Storm lover', dru: '+18% к добыче в метель за уровень', den: '+18% yield during storms per level' },
    { id: 'x_ice', br: 'X', max: 1, base: 2500, gr: 1, sci: 2, key: true, x: -1, y: 0, req: [['b_power', 3], ['s_heat', 3]], ru: 'Огненный ледокол', en: 'Fire icebreaker', dru: 'Лёд плавится в 2 раза быстрее, но +25% расхода тепла', den: 'Ice melts twice as fast, but +25% heat use' },
    { id: 'x_pantry', br: 'X', max: 1, base: 4200, gr: 1, sci: 2, key: true, x: 0, y: 0, req: [['c_value', 3], ['s_eco', 3]], ru: 'Умная кладовая', en: 'Smart pantry', dru: 'Каждая доставка: +10% монет и +20 тепла', den: 'Each delivery: +10% coins and +20 heat' },
    { id: 'x_nose', br: 'X', max: 1, base: 6500, gr: 1, sci: 3, key: true, x: 1, y: 0, req: [['b_width', 2], ['c_cap', 3]], ru: 'Рудный нюх', en: 'Ore nose', dru: 'Стрелка указывает на ближайшую богатую жилу', den: 'An arrow points to the nearest rich vein' }
  ];
  D.NODES.forEach((n) => { if (n.max > 1) n.gr += 0.08; });
  D.nodeCost = (n, lv) => Math.round(n.base * Math.pow(n.gr, lv));

  // ---------- ковчег ----------
  D.ARK = [
    { iron: 90, ti: 0, aur: 0, coins: 1800, ru: 'Киль', en: 'Keel' },
    { iron: 240, ti: 70, aur: 0, coins: 13000, ru: 'Корпус', en: 'Hull' },
    { iron: 400, ti: 210, aur: 30, coins: 55000, ru: 'Двигатели', en: 'Engines' },
    { iron: 560, ti: 400, aur: 95, coins: 190000, ru: 'Реактор', en: 'Reactor' },
    { iron: 720, ti: 650, aur: 230, coins: 560000, ru: 'Купол жизни', en: 'Life dome' },
    { iron: 900, ti: 950, aur: 450, coins: 1500000, ru: 'Навигация', en: 'Navigation' }
  ];

  // ---------- находки ----------
  D.RELICS = [
    { id: 'tusk', rare: 1, ru: 'Бивень мамонта', en: 'Mammoth tusk' },
    { id: 'compass', rare: 1, ru: 'Компас экспедиции', en: 'Expedition compass' },
    { id: 'amber', rare: 1, ru: 'Янтарная бабочка', en: 'Amber butterfly' },
    { id: 'heart', rare: 2, ru: 'Сердце льда', en: 'Heart of ice' },
    { id: 'globe', rare: 2, ru: 'Стеклянный глобус', en: 'Glass globe' },
    { id: 'coin', rare: 1, ru: 'Древняя монета', en: 'Ancient coin' },
    { id: 'lamp', rare: 1, ru: 'Сигнальный фонарь', en: 'Signal lantern' },
    { id: 'diary', rare: 2, ru: 'Замёрзший дневник', en: 'Frozen diary' },
    { id: 'mask', rare: 3, ru: 'Каменная маска', en: 'Stone mask' },
    { id: 'harpoon', rare: 2, ru: 'Костяной гарпун', en: 'Bone harpoon' },
    { id: 'key', rare: 3, ru: 'Ржавый ключ', en: 'Rusty key' },
    { id: 'shard', rare: 3, ru: 'Осколок метеорита', en: 'Meteorite shard' }
  ];
  D.RELIC_BONUS = 0.015;                                              // +1,5% к монетам за каждую уникальную находку

  // ---------- модификаторы сезона ----------
  D.MODS = [
    { id: 'calm', mult: 1.0, ru: 'Обычный сезон', en: 'Standard season', dru: 'Без изменений. Спокойный старт.', den: 'No changes. A calm start.' },
    { id: 'night', mult: 1.3, ru: 'Ранняя ночь', en: 'Early night', dru: 'Ночь в 1,5 раза длиннее: хуже обзор, но больше авроры.', den: 'Night is 1.5x longer: poor vision but more aurora.' },
    { id: 'storms', mult: 1.3, ru: 'Штормовой сезон', en: 'Storm season', dru: 'Метели в 2 раза чаще; добыча в метель +25%.', den: 'Twice as many storms; storm yield +25%.' },
    { id: 'cold', mult: 1.35, ru: 'Лютый мороз', en: 'Deep freeze', dru: 'Запас тепла −25%, расход +15%.', den: 'Max heat −25%, heat use +15%.' },
    { id: 'rich', mult: 1.2, ru: 'Богатые жилы', en: 'Rich veins', dru: 'Руды на 35% больше, но бур слабее на 15%.', den: '35% more ore, but drill 15% weaker.' }
  ];

  // ---------- наследие (постоянные улучшения) ----------
  D.PERKS = [
    { id: 'p_start', max: 5, base: 2, gr: 1.6, ru: 'Тёплый старт', en: 'Warm start', dru: '+150 монет в начале сезона за уровень', den: '+150 starting coins per level' },
    { id: 'p_ore', max: 10, base: 2, gr: 1.5, ru: 'Рудная жила', en: 'Ore sense', dru: '+4% к цене груза за уровень', den: '+4% sale prices per level' },
    { id: 'p_power', max: 10, base: 3, gr: 1.5, ru: 'Наследие бура', en: 'Drill legacy', dru: '+8% к мощности бура за уровень', den: '+8% drill power per level' },
    { id: 'p_haul', max: 10, base: 3, gr: 1.5, ru: 'Вместительный кузов', en: 'Roomy bed', dru: '+8% к вместимости кузова за уровень', den: '+8% cargo capacity per level' },
    { id: 'p_ark', max: 8, base: 4, gr: 1.55, ru: 'Чертежи ковчега', en: 'Ark blueprints', dru: '−5% материалов на этапы ковчега за уровень', den: '−5% ark stage materials per level' },
    { id: 'p_tier', max: 2, base: 8, gr: 2.4, ru: 'Ускоренный старт', en: 'Fast start', dru: 'Сезон начинается с Термобура Mk II, затем Mk III', den: 'Start the season with Drill Mk II, then Mk III' },
    { id: 'p_heat', max: 5, base: 3, gr: 1.6, ru: 'Тепло предков', en: 'Ancestral warmth', dru: '+10 к запасу тепла за уровень', den: '+10 max heat per level' },
    { id: 'p_contract', max: 1, base: 6, gr: 1, ru: 'Мастер контрактов', en: 'Contract master', dru: '+1 слот контрактов', den: '+1 contract slot' },
    { id: 'p_build', max: 3, base: 5, gr: 2.0, ru: 'Готовые чертежи', en: 'Ready blueprints', dru: 'Сезон начинается с уже построенными: Ангар, затем Котельная, затем Радиомачта', den: 'Start with Hangar, then Boiler, then Radio already built' },
    { id: 'p_off', max: 3, base: 4, gr: 1.8, ru: 'Дозорные дроны', en: 'Scout drones', dru: '+1 час к максимуму доходов вне игры и +10% к ним', den: '+1h offline cap and +10% offline income' }
  ];
  D.perkCost = (p, lv) => Math.max(1, Math.round(p.base * Math.pow(p.gr, lv) * 0.7));

  // ---------- цепочка целей ----------
  // t: mine(res,n) | deliver(n) | build(id) | buy(node,lv) | earn(n) | contract(n) | relic(n) | ark(stage) | tier(n)
  D.GOALS = [
    { t: 'mine', r: 'ice', n: 20, rc: 20, ru: 'Расплавь 20 льда термобуром', en: 'Melt 20 ice with the drill' },
    { t: 'deliver', n: 1, rc: 30, ru: 'Привези груз в лагерь (стрелка укажет путь)', en: 'Bring cargo to camp (follow the arrow)' },
    { t: 'build', id: 'hangar', rc: 60, rs: 0, ru: 'Построй Ангар', en: 'Build the Hangar' },
    { t: 'buy', id: 'b_power', n: 1, rc: 50, ru: 'Улучши мощность бура в «Созвездии»', en: 'Upgrade drill power in the Constellation' },
    { t: 'mine', r: 'iron', n: 25, rc: 90, ru: 'Добудь 25 железа из каменных жил', en: 'Mine 25 iron from rock veins' },
    { t: 'build', id: 'boiler', rc: 120, ru: 'Построй Котельную', en: 'Build the Boiler house' },
    { t: 'buy', id: 'c_cap', n: 3, rc: 120, ru: 'Расширь кузов до 3 уровня', en: 'Expand the cargo bed to level 3' },
    { t: 'earn', n: 1500, rc: 200, rs: 1, ru: 'Заработай 1500 монет за сезон', en: 'Earn 1,500 coins this season' },
    { t: 'build', id: 'radio', rc: 250, ru: 'Построй Радиомачту', en: 'Build the Radio mast' },
    { t: 'contract', n: 1, rc: 300, rs: 1, ru: 'Выполни первый контракт', en: 'Complete your first contract' },
    { t: 'relic', n: 1, rc: 350, ru: 'Найди замороженную находку во льду', en: 'Find a frozen relic in the ice' },
    { t: 'build', id: 'forge', rc: 500, ru: 'Построй Кузню', en: 'Build the Forge' },
    { t: 'mine', r: 'ti', n: 30, rc: 700, ru: 'Добудь 30 титана — он глубже в камне', en: 'Mine 30 titanium — deeper in the rock' },
    { t: 'buy', id: 's_heat', n: 3, rc: 600, ru: 'Подними запас тепла до 3 уровня', en: 'Raise heat reserve to level 3' },
    { t: 'tier', n: 1, rc: 900, rs: 1, ru: 'Купи Термобур Mk II в Ангаре', en: 'Buy Thermal Drill Mk II at the Hangar' },
    { t: 'build', id: 'meteo', rc: 1200, ru: 'Построй Метеостанцию', en: 'Build the Weather station' },
    { t: 'mine', r: 'aur', n: 12, rc: 2000, rs: 1, ru: 'Добудь 12 кристаллов авроры — далеко от лагеря', en: 'Mine 12 aurora crystals far from camp' },
    { t: 'build', id: 'dome', rc: 2500, ru: 'Построй Купол науки', en: 'Build the Science dome' },
    { t: 'contract', n: 5, rc: 3000, rs: 1, ru: 'Выполни 5 контрактов', en: 'Complete 5 contracts' },
    { t: 'build', id: 'yard', rc: 4000, ru: 'Построй Верфь ковчега', en: 'Build the Ark shipyard' },
    { t: 'ark', n: 1, rc: 5000, rs: 2, ru: 'Заверши первый этап ковчега', en: 'Finish the first ark stage' },
    { t: 'relic', n: 6, rc: 8000, rs: 2, ru: 'Собери 6 разных находок', en: 'Collect 6 different relics' },
    { t: 'ark', n: 3, rc: 15000, rs: 3, ru: 'Заверши 3 этапа ковчега', en: 'Finish 3 ark stages' },
    { t: 'ark', n: 6, rc: 50000, rs: 5, ru: 'Дострой ковчег и отплыви', en: 'Complete the ark and set sail' }
  ];

  // ---------- ежедневная награда ----------
  D.DAILY = [
    { c: 1.0 }, { c: 1.5 }, { c: 2.0, s: 1 }, { c: 2.5 }, { c: 3.0, s: 1 }, { c: 4.0 }, { c: 6.0, s: 2, relic: true }
  ];

  // ---------- реклама и сутки ----------
  D.AD = { interGap: 90, firstAfter: 150 };
  D.BOOSTS = {
    double: { limit: 12 }, heat: { limit: 6 }, coins: { limit: 8 }, sci: { limit: 3 }
  };

  g.DATA = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
