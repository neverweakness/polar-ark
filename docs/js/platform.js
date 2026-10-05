'use strict';
/* Тонкий слой над SDK площадки. Игра знает только про window.Platform.
   Сейчас: Яндекс Игры. Для порта на VK достаточно реализовать те же методы через VK Bridge. */
(function (global) {
  let ysdk = null, player = null, payments = null, lastCloud = 0;
  const DEV_OWNED = 'polarark_dev_owned';
  const DEV_CATALOG = { coins_s: '49 ₽', coins_m: '149 ₽', sci_pack: '99 ₽', thermo: '79 ₽', no_ads: '199 ₽' };
  const KEY = 'polarark_save_v1';
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const MOCK = LOCAL && /[?&]mock/.test(location.search);   // заглушки только локально и только по ?mock
  const RU = ['ru', 'be', 'kk', 'uk', 'uz', 'hy', 'az', 'ky', 'tg', 'tk'];

  const P = {
    type: 'dev',
    lang: 'ru',
    paymentsAvailable: false,

    async init() {
      try {
        if (global.YaGames) {
          ysdk = await global.YaGames.init();
          P.type = 'yandex';
          try { player = await ysdk.getPlayer({ scopes: false }); } catch (e) { player = null; }
          await P.initPayments();
          const l = ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang;
          if (l) P.lang = RU.indexOf(l) >= 0 ? 'ru' : 'en';
          return;
        }
      } catch (e) { /* SDK не поднялся: играем в локальном режиме */ }
      await P.initPayments();
      const nl = ((navigator.language || 'ru') + '').slice(0, 2).toLowerCase();
      P.lang = RU.indexOf(nl) >= 0 ? 'ru' : 'en';
    },

    /* Берём самое свежее из облака и localStorage */
    async load() {
      let local = null, cloud = null;
      try { local = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* ignore */ }
      try {
        if (player) {
          const d = await player.getData(['s']);
          if (d && d.s) cloud = typeof d.s === 'string' ? JSON.parse(d.s) : d.s;
        }
      } catch (e) { /* ignore */ }
      if (local && cloud) return (cloud.ts || 0) > (local.ts || 0) ? cloud : local;
      return cloud || local || null;
    },

    /* Сохраняет локально и (с ограничением частоты) в облако. С force возвращает промис записи в облако. */
    save(obj, force) {
      try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
      const now = Date.now();
      if (player && (force || now - lastCloud > 8000)) {
        lastCloud = now;
        try { return player.setData({ s: JSON.stringify(obj) }).catch(() => {}); } catch (e) { /* ignore */ }
      }
      return Promise.resolve();
    },

    /* ---------- внутриигровые покупки ---------- */
    async initPayments() {
      if (ysdk) {
        try { payments = await ysdk.getPayments(); P.paymentsAvailable = !!payments; } catch (e) { payments = null; P.paymentsAvailable = false; }
      } else P.paymentsAvailable = MOCK;   // без SDK покупок нет (заглушка только по ?mock на localhost)
    },
    /* Каталог из консоли: [{id, price, img}] */
    async catalog() {
      if (!ysdk) return MOCK ? Object.keys(DEV_CATALOG).map((id) => ({ id, price: DEV_CATALOG[id], img: '' })) : [];
      if (!payments) return [];
      try {
        const list = await payments.getCatalog();
        return list.map((p) => ({ id: p.id, price: p.price, img: p.getPriceCurrencyImage ? p.getPriceCurrencyImage('small') : '' }));
      } catch (e) { return []; }
    },
    /* Покупка: резолвится объектом {productID, purchaseToken}, при отмене/ошибке — reject */
    purchase(id) {
      if (ysdk && payments) return payments.purchase({ id });
      if (!MOCK) return Promise.reject(new Error('payments unavailable'));
      return new Promise((resolve) => {
        mock('Покупка (тест)', 700, null, () => {
          if (id === 'no_ads') { try { localStorage.setItem(DEV_OWNED, JSON.stringify(['no_ads'])); } catch (e) { /* ignore */ } }
          resolve({ productID: id, purchaseToken: 'dev-' + Date.now() + '-' + Math.random().toString(36).slice(2) });
        });
      });
    },
    /* Уже совершённые и ещё не погашенные покупки */
    async getPurchases() {
      if (ysdk && payments) { try { return await payments.getPurchases(); } catch (e) { return []; } }
      if (!MOCK) return [];
      let owned = []; try { owned = JSON.parse(localStorage.getItem(DEV_OWNED) || '[]'); } catch (e) { /* ignore */ }
      return owned.map((id) => ({ productID: id, purchaseToken: 'dev-owned-' + id }));
    },
    consume(token) {
      if (ysdk && payments) return payments.consumePurchase(token);
      return Promise.resolve();
    },

    onHide() {}, onShow() {}, share: null, addToFavorites: null, openSupport() { return false; }, banner() {},

    ready() { try { ysdk && ysdk.features && ysdk.features.LoadingAPI && ysdk.features.LoadingAPI.ready(); } catch (e) { /* ignore */ } },
    gameplayStart() { try { ysdk && ysdk.features && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.start(); } catch (e) { /* ignore */ } },
    gameplayStop() { try { ysdk && ysdk.features && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.stop(); } catch (e) { /* ignore */ } },

    /* Межстраничная реклама. onDone вызывается всегда (показана или нет). */
    interstitial(onOpen, onDone) {
      if (ysdk) {
        ysdk.adv.showFullscreenAdv({
          callbacks: {
            onOpen: () => onOpen && onOpen(),
            onClose: () => onDone && onDone(),
            onError: () => onDone && onDone(),
            onOffline: () => onDone && onDone()
          }
        });
      } else if (MOCK) mock('Реклама (тест)', 1200, () => { onOpen && onOpen(); }, () => onDone && onDone());
      else onDone && onDone();
    },

    /* Реклама за награду. onReward — только если пользователь досмотрел. onFail — реклама недоступна. */
    rewarded(onOpen, onReward, onClose, onFail) {
      if (ysdk) {
        let got = false;
        ysdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: () => onOpen && onOpen(),
            onRewarded: () => { got = true; onReward && onReward(); },
            onClose: () => { onClose && onClose(got); },
            onError: () => { onFail && onFail(); }
          }
        });
      } else if (MOCK) {
        mock('Видео за награду (тест)', 1500, () => { onOpen && onOpen(); }, () => { onReward && onReward(); onClose && onClose(true); });
      } else { onFail && onFail(); }
    }
  };

  /* Имитация рекламы для локального теста */
  function mock(text, ms, onOpen, onEnd) {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000d;color:#fff;display:flex;align-items:center;justify-content:center;font:700 22px system-ui;text-align:center';
    o.textContent = text + ' …';
    document.body.appendChild(o);
    onOpen && onOpen();
    setTimeout(() => { o.remove(); onEnd && onEnd(); }, ms);
  }

  global.Platform = P;
})(window);
