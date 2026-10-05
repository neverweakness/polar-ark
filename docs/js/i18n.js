'use strict';
/* Строки интерфейса: русский основной, английский по языку площадки. */
(function (g) {
  const S = {
    loading: ['Загрузка…', 'Loading…'],
    heat: ['Тепло', 'Heat'], cargo: ['Кузов', 'Cargo'], goal: ['Цель', 'Goal'], claim: ['Забрать', 'Claim'],
    goal_done: ['Все цели сезона выполнены!', 'All season goals complete!'],
    os_hint: ['Очки строительства', 'Build points'], sci_hint: ['Очки науки', 'Science points'],
    d_build: ['Стройка', 'Build'], d_tree: ['Созвездие', 'Upgrades'], d_radio: ['Рация', 'Radio'], d_relics: ['Находки', 'Relics'],
    d_shop: ['Магазин', 'Shop'], d_legacy: ['Наследие', 'Legacy'], d_hangar: ['Ангар', 'Hangar'],
    home: ['Домой', 'Home'], x2: ['×2 за видео', '×2 for video'], pause: ['Пауза', 'Pause'],
    full: ['Кузов полон — вези в лагерь!', 'Cargo full — head to camp!'],
    frozen: ['Мотор остыл — вернись в лагерь', 'Engine frozen — return to camp'],
    camp: ['Лагерь', 'Camp'], day: ['День', 'Day'], night: ['Ночь', 'Night'], storm: ['Метель', 'Blizzard'],
    storm_in: ['Метель через {s}', 'Blizzard in {s}'], clear: ['Ясно', 'Clear'],
    // подсказки
    tk_deliver: ['Доставка: +{c}', 'Delivery: +{c}'], tk_build: ['Построено: {n}!', 'Built: {n}!'],
    tk_node: ['{n} → ур. {l}', '{n} → lvl {l}'], tk_relic: ['Находка: {n}!', 'Relic found: {n}!'],
    tk_relic_new: ['Новая находка: {n}!', 'New relic: {n}!'], tk_goal: ['Цель выполнена: +{c}', 'Goal complete: +{c}'],
    tk_os: ['Новое очко строительства!', 'New build point!'], tk_storm_on: ['Метель! Обзор хуже, добыча богаче', 'Blizzard! Poor vision, richer yield'],
    tk_storm_off: ['Метель утихла', 'The blizzard has passed'], tk_zone: ['Новая зона: {n}. Здесь холоднее и твёрже, но жилы богаче', 'New zone: {n}. Colder and harder here, but veins are richer'], tk_crev: ['Трещина! Потеряно: {n}', 'Crevasse! Lost: {n}'],
    tk_tele: ['Вы в лагере', 'Back at camp'], tk_tier: ['Новый вездеход: {n}', 'New rover: {n}'],
    tk_ark: ['Этап ковчега завершён!', 'Ark stage complete!'], tk_sci: ['+{n} очк. науки', '+{n} science'],
    tk_contract: ['Контракт: +{c}', 'Contract: +{c}'], tk_boost_double: ['Награда удвоена: +{v}', 'Reward doubled: +{v}'],
    tk_boost_heat: ['Термобатарея: бур в огне!', 'Thermo battery: drill on fire!'], tk_boost_coins: ['Бонус: +{v}', 'Bonus: +{v}'],
    tk_ad_fail: ['Видео сейчас недоступно', 'Video unavailable right now'], tk_cd: ['Телепорт будет готов через {s} с', 'Teleport ready in {s}s'],
    tk_saved: ['Сохранено', 'Saved'], tk_nomoney: ['Не хватает монет', 'Not enough coins'], tk_perk: ['Улучшение наследия куплено', 'Legacy perk bought'],
    tk_err: ['Не получилось. Попробуйте ещё раз', 'Something went wrong. Try again'], tk_shared: ['Спасибо, что делитесь!', 'Thanks for sharing!'],
    tk_fav: ['Добавлено в избранное', 'Added to favorites'], tk_bought: ['Покупка получена!', 'Purchase received!'],
    // окна
    close: ['Закрыть', 'Close'], go: ['Открыть', 'Open'], ok: ['Отлично', 'Great'], cancel: ['Отмена', 'Cancel'], buy: ['Купить', 'Buy'], max: ['Макс.', 'Max'],
    lvl: ['Ур. {a}/{b}', 'Lv {a}/{b}'], free: ['Бесплатно', 'Free'], on: ['Вкл', 'On'], off: ['Выкл', 'Off'],
    m_build: ['Постройки лагеря', 'Camp buildings'], next_os: ['Следующее очко: {a} / {b}', 'Next point: {a} / {b}'],
    os_have: ['Очков строительства: {n}', 'Build points: {n}'], btn_build: ['Построить', 'Build'], built: ['Построено', 'Built'],
    need_os: ['Нужно очков: {n}', 'Points needed: {n}'], earn_more: ['Зарабатывайте монеты, чтобы получать очки', 'Earn coins to get build points'],
    m_tree: ['Созвездие улучшений', 'Constellation of upgrades'], tree_sub: ['Бур · Груз · Выживание', 'Drill · Cargo · Survival'],
    br_B: ['Бур', 'Drill'], br_C: ['Груз', 'Cargo'], br_S: ['Выживание', 'Survival'], br_X: ['Особые узлы', 'Special nodes'],
    lk_hangar: ['Постройте Ангар', 'Build the Hangar'], lk_dome: ['Нужен Купол науки', 'Needs the Science dome'], lk_forge: ['Нужна Кузня', 'Needs the Forge'],
    lk_req: ['Нужно: {n} ур. {l}', 'Needs: {n} lvl {l}'], need_sci: ['Нужно очков науки: {n}', 'Science needed: {n}'],
    m_hangar: ['Ангар', 'Hangar'], equip: ['Выбрать', 'Equip'], equipped: ['Выбрано', 'Equipped'], tier_req: ['Нужна постройка: {b}', 'Needs building: {b}'],
    tier_prev: ['Сначала предыдущая модель', 'Buy previous model first'],
    st_power: ['Мощность', 'Power'], st_speed: ['Скорость', 'Speed'], st_width: ['Ширина', 'Width'], st_cap: ['Кузов', 'Cargo'],
    m_radio: ['Рация', 'Radio'], radio_sub: ['Контракты и связь с лагерем', 'Contracts and camp link'],
    c_deliver: ['Доставь {n} × {r}', 'Deliver {n} × {r}'], c_reward: ['Награда', 'Reward'], c_claim: ['Забрать награду', 'Claim reward'],
    c_fast: ['Быстро: бонус ×1,3', 'Fast: ×1.3 bonus'], c_reroll: ['Сменить (видео)', 'Swap (video)'], c_none: ['Постройте Радиомачту', 'Build the Radio mast'],
    tele: ['Телепорт домой', 'Teleport home'], tele_cd: ['Готов через {s} с', 'Ready in {s}s'],
    m_relics: ['Коллекция находок', 'Relic collection'], relic_bonus: ['Бонус коллекции: +{p}% к цене груза', 'Collection bonus: +{p}% to sale prices'],
    relic_found: ['Найдено: {a} из {b}', 'Found: {a} of {b}'], relic_unk: ['Не найдено', 'Not found'], relic_hint: ['Ищите замороженные находки в ледяных полях', 'Look for frozen relics inside ice fields'],
    m_yard: ['Верфь ковчега', 'Ark shipyard'], stage: ['Этап {i}: {n}', 'Stage {i}: {n}'], stage_done: ['Этапов завершено: {a} из {b}', 'Stages complete: {a} of {b}'],
    save_ark: ['Копить для ковчега', 'Save for the ark'], save_ark_d: ['Подходящие слитки и кристаллы не продаются, а идут на ковчег', 'Matching ingots and crystals go to the ark instead of being sold'],
    btn_stage: ['Построить этап', 'Build stage'], btn_sail: ['Отплыть!', 'Set sail!'], need_forge: ['Железо и титан идут на ковчег только как слитки: постройте Кузню', 'Iron and titanium go into the ark as ingots only: build the Forge'],
    ingot_iron: ['Железные слитки', 'Iron ingots'], ingot_ti: ['Титановые слитки', 'Titanium ingots'], crystals: ['Кристаллы авроры', 'Aurora crystals'], fee: ['Взнос', 'Fee'],
    m_season: ['Ковчег отплыл!', 'The ark has sailed!'], season_sub: ['Начинается новый сезон. Наследие остаётся с вами.', 'A new season begins. Your legacy stays with you.'],
    season_gain: ['Наследие за сезон: +{n}', 'Legacy this season: +{n}'], choose_mod: ['Выберите условия нового сезона', 'Choose the new season conditions'],
    mod_mult: ['Наследие ×{m}', 'Legacy ×{m}'], btn_season: ['Начать сезон', 'Start season'], legacy_pts: ['Очков наследия: {n}', 'Legacy points: {n}'],
    m_legacy: ['Наследие', 'Legacy'], legacy_d: ['Постоянные улучшения: остаются после каждого отплытия', 'Permanent upgrades that stay after every voyage'],
    legacy_bonus: ['Всего наследия: +{n} → +{c}% к монетам, +{p}% к мощности бура', 'Total legacy: +{n} → +{c}% coins, +{p}% drill power'],
    m_shop: ['Магазин', 'Shop'], shop_free: ['Бесплатно за видео', 'Free for video'], shop_paid: ['Покупки', 'Purchases'], watch: ['Смотреть видео', 'Watch video'],
    left_today: ['Сегодня осталось: {n}', 'Left today: {n}'], shop_none: ['На сегодня всё', 'All done for today'],
    b_double: ['Удвоить доставку', 'Double the delivery'], b_double_d: ['Повтор последней выручки: +{v}', 'Repeat the last haul: +{v}'],
    b_heat: ['Термобатарея', 'Thermo battery'], b_heat_d: ['Тепло на максимум и бур в огне на 90 секунд (+50% мощности)', 'Heat to max and a burning drill for 90s (+50% power)'],
    b_coins: ['Мешок монет', 'Bag of coins'], b_coins_d: ['Примерно 6 минут вашего дохода: +{v}', 'About 6 minutes of your income: +{v}'],
    b_sci: ['Очко науки', 'Science point'], b_sci_d: ['+1 очко науки для особых узлов', '+1 science point for special nodes'],
    p_coins_s: ['Мешок монет', 'Bag of coins'], p_coins_s_d: ['Примерно 15 минут дохода', 'About 15 minutes of income'],
    p_coins_m: ['Сундук монет', 'Chest of coins'], p_coins_m_d: ['Примерно час дохода', 'About an hour of income'],
    p_sci: ['Пакет науки', 'Science pack'], p_sci_d: ['+5 очков науки', '+5 science points'],
    p_thermo: ['Термобатарея ×3', 'Thermo battery ×3'], p_thermo_d: ['10 минут бура в огне', '10 minutes of a burning drill'],
    p_no_ads: ['Без рекламы', 'No ads'], p_no_ads_d: ['Убирает рекламу между экранами. Видео за награду остаётся по вашему желанию', 'Removes interstitial ads. Rewarded video stays optional'],
    lang: ['Язык', 'Language'], m_settings: ['Настройки', 'Settings'], music: ['Музыка', 'Music'], sound: ['Звуки', 'Sound'], support: ['Связь с разработчиком', 'Contact developer'],
    share: ['Рассказать друзьям', 'Share with friends'], fav: ['В избранное', 'Add to favorites'], reset: ['Начать с нуля', 'Reset progress'],
    reset_q: ['Стереть весь прогресс? Это нельзя отменить.', 'Erase all progress? This cannot be undone.'], reset_yes: ['Да, стереть', 'Yes, erase'],
    ver: ['Версия {v} · {p}', 'Version {v} · {p}'], p_vk: ['VK', 'VK'], p_out: ['вне ВКонтакте', 'outside VK'], p_ya: ['Яндекс Игры', 'Yandex Games'], p_dev: ['локальный запуск', 'local run'],
    stats: ['Статистика', 'Stats'], st_play: ['Время игры: {t}', 'Play time: {t}'], st_dist: ['Самый дальний выезд: {n} тайлов', 'Farthest trip: {n} tiles'], st_trips: ['Доставок: {n}', 'Deliveries: {n}'],
    m_daily: ['Награда за возвращение', 'Daily reward'], daily_sub: ['Заходите каждый день: награды растут', 'Come back every day: rewards grow'], day_n: ['День {n}', 'Day {n}'], take: ['Забрать', 'Claim'],
    m_offline: ['С возвращением!', 'Welcome back!'], off_text: ['Пока вас не было ({t}), дозорные дроны собрали:', 'While you were away ({t}), scout drones collected:'], off_x2: ['Забрать ×2 (видео)', 'Claim ×2 (video)'],
    tut1: ['Зажмите экран и ведите палец или мышь: вездеход поедет за ним', 'Hold the screen and drag: the rover follows your finger or mouse'],
    tut2: ['Бур плавит лёд и камень сам. Упритесь в лёд — кузов начнёт наполняться', 'The drill melts ice and rock by itself. Push into ice to fill your cargo'],
    tut3: ['Полный кузов — в лагерь! Стрелка показывает путь. Там груз превратится в монеты', 'Cargo full? Go to camp! The arrow shows the way. Cargo turns into coins there'],
    tut_next: ['Дальше', 'Next'], tut_go: ['Поехали!', "Let's go!"],
    // постройки
    bi_forge_save: ['Слитки идут на ковчег: {s}', 'Ingots go to the ark: {s}'], bi_meteo: ['Прогноз погоды', 'Weather forecast'], bi_now: ['Сейчас: {w}', 'Now: {w}'],
    bi_next_storm: ['Следующая метель через {s}', 'Next blizzard in {s}'], bi_nightin: ['Ночь наступит позже: смена суток около 8 минут', 'A full day-night cycle takes about 8 minutes'],
    bi_boiler: ['Встаньте рядом с лагерем: тепло восстановится', 'Park near camp: heat refills'], bi_dome: ['Открыть «Созвездие»', 'Open the Constellation'],
    bi_depot: ['Центр лагеря: здесь груз превращается в монеты', 'Camp centre: cargo turns into coins here'],
    // название игры
    title: ['ПОЛЯРНЫЙ КОВЧЕГ', 'POLAR ARK'],
    tagline: ['Плавь лёд, строй лагерь, спаси экспедицию', 'Melt the ice, build the camp, save the expedition'],
    min: ['мин', 'min'], hr: ['ч', 'h'], sec: ['с', 's']
  };
  const I = { lang: 'ru', S };
  I.t = (k, p) => {
    const e = S[k];
    let s = e ? (I.lang === 'en' ? e[1] : e[0]) : k;
    if (p) s = s.replace(/\{(\w+)\}/g, (m, n) => (p[n] !== undefined ? p[n] : m));
    return s;
  };
  I.tr = (o) => (o ? (I.lang === 'en' ? o.en : o.ru) : '');
  I.trd = (o) => (o ? (I.lang === 'en' ? o.den : o.dru) : '');
  I.fmt = (n) => {
    n = Math.round(n);
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace('.0', '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.0', '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.0', '') + 'K';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };
  I.time = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h > 0) return h + ' ' + I.t('hr') + ' ' + m + ' ' + I.t('min');
    if (m > 0) return m + ' ' + I.t('min');
    return sec + ' ' + I.t('sec');
  };
  g.I18N = I; g.t = I.t; g.tr = I.tr; g.trd = I.trd;
})(window);
