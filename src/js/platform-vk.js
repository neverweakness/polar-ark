'use strict';
/* Платформенный слой для VK Games (ВКонтакте). Тот же интерфейс, что и у версии для Яндекс Игр,
   поэтому game.js почти не знает, где он запущен. Использует VK Bridge (window.vkBridge).
   Вне ВКонтакте (локальный тест) работают заглушки: localStorage и имитация рекламы. */
(function (global) {
  const KEY = 'polarark_save_v1';
  const CHUNK = 3000;                 // значение VKWebAppStorageSet — не более 4096 байт, берём с запасом
  const RU = ['ru', 'be', 'kk', 'uk', 'uz', 'hy', 'az', 'ky', 'tg', 'tk'];
  const CFG = global.VK_CONFIG || {};
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const MOCK = LOCAL && /[?&]mock/.test(location.search);   // заглушки только локально и только по ?mock
  const qs = new URLSearchParams(location.search);
  const inVK = !!(qs.get('vk_app_id') || qs.get('vk_user_id') || qs.get('api_id') || qs.get('viewer_id'));
  const bridge = global.vkBridge;
  let lastCloud = 0, cloudBusy = false, queued = null, hideCbs = [], showCbs = [];

  const send = (method, params) => (bridge ? bridge.send(method, params || {}) : Promise.reject(new Error('no bridge')));
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  const P = {
    type: inVK ? 'vk' : 'dev',
    lang: 'ru',
    paymentsAvailable: false,          // платежи ВКонтакте требуют серверной части — в этой сборке их нет
    appId: qs.get('vk_app_id') || '',
    inVK,

    async init() {
      // VKWebAppInit — первым делом, до загрузки остального (требование платформы)
      if (inVK && bridge) {
        try { bridge.send('VKWebAppInit', {}); } catch (e) { /* ignore */ }
        try {
          bridge.subscribe((e) => {
            const tp = e && e.detail && e.detail.type;
            if (tp === 'VKWebAppViewHide') hideCbs.forEach((f) => f());
            else if (tp === 'VKWebAppViewRestore') showCbs.forEach((f) => f());
          });
        } catch (e) { /* ignore */ }
      }
      const l = (qs.get('vk_language') || (navigator.language || 'ru')).slice(0, 2).toLowerCase();
      P.lang = RU.indexOf(l) >= 0 ? 'ru' : 'en';
    },

    onHide(f) { hideCbs.push(f); },
    onShow(f) { showCbs.push(f); },

    /* ---------- сохранения: VK Storage (по пользователю) + localStorage ---------- */
    async load() {
      let local = null, cloud = null;
      try { local = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* ignore */ }
      if (inVK && bridge) {
        try {
          const meta = await withTimeout(send('VKWebAppStorageGet', { keys: ['zm'] }), 4000);
          const m = meta.keys && meta.keys[0] && meta.keys[0].value;
          const n = m ? parseInt(m, 10) : 0;
          if (n > 0 && n < 20) {
            const keys = []; for (let i = 0; i < n; i++) keys.push('z' + i);
            const r = await withTimeout(send('VKWebAppStorageGet', { keys }), 4000);
            const map = {}; (r.keys || []).forEach((k) => { map[k.key] = k.value; });
            let s = ''; for (let i = 0; i < n; i++) s += map['z' + i] || '';
            if (s) cloud = JSON.parse(s);
          }
        } catch (e) { /* облако недоступно — играем с локальным сохранением */ }
      }
      if (local && cloud) return (cloud.ts || 0) > (local.ts || 0) ? cloud : local;
      return cloud || local || null;
    },

    /* Лимит VK — 1000 вызовов в час на пользователя, поэтому в облако пишем не чаще раза в 15 с (или принудительно) */
    save(obj, force) {
      try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
      if (!inVK || !bridge) return Promise.resolve();
      const now = Date.now();
      if (!force && now - lastCloud < 15000) return Promise.resolve();
      lastCloud = now;
      queued = JSON.stringify(obj);
      if (cloudBusy) return Promise.resolve();
      cloudBusy = true;
      return (async () => {
        try {
          while (queued != null) {
            const s = queued; queued = null;
            const parts = []; for (let i = 0; i < s.length; i += CHUNK) parts.push(s.slice(i, i + CHUNK));
            for (let i = 0; i < parts.length; i++) await send('VKWebAppStorageSet', { key: 'z' + i, value: parts[i] });
            await send('VKWebAppStorageSet', { key: 'zm', value: String(parts.length) });
          }
        } catch (e) { /* ignore */ }
        cloudBusy = false;
      })();
    },

    ready() { /* у VK нет отдельного сигнала готовности: VKWebAppInit отправлен в init() */ },
    gameplayStart() {},
    gameplayStop() {},

    /* ---------- реклама (только рекламная сеть VK) ---------- */
    /* Между экранами */
    interstitial(onOpen, onDone) {
      if (!inVK || !bridge) { if (MOCK) mock('Реклама (тест)', 1200, () => { onOpen && onOpen(); }, () => onDone && onDone()); else onDone && onDone(); return; }
      onOpen && onOpen();
      send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
        .then(() => { onDone && onDone(); })
        .catch(() => { onDone && onDone(); });
    },

    /* За вознаграждение: награда только если ролик показан. Игрок сам нажимает кнопку (требование VK). */
    rewarded(onOpen, onReward, onClose, onFail) {
      if (!inVK || !bridge) {
        if (MOCK) mock('Видео за награду (тест)', 1500, () => { onOpen && onOpen(); }, () => { onReward && onReward(); onClose && onClose(true); });
        else onFail && onFail();
        return;
      }
      withTimeout(send('VKWebAppCheckNativeAds', { ad_format: 'reward' }), 8000)
        .then((chk) => {
          if (chk && chk.result === false) { onFail && onFail(); return null; }
          onOpen && onOpen();
          return send('VKWebAppShowNativeAds', { ad_format: 'reward' }).then((r) => {
            const ok = !!(r && r.result);
            if (ok) onReward && onReward();
            onClose && onClose(ok);
            if (!ok) onFail && onFail();
          });
        })
        .catch(() => { onClose && onClose(false); onFail && onFail(); });
    },

    /* Баннер внизу экрана (игра сжимается на высоту баннера) */
    banner(show) {
      if (!inVK || !bridge || CFG.banner === false) return;
      if (show) send('VKWebAppShowBannerAd', { banner_location: 'bottom' }).catch(() => {});
      else send('VKWebAppHideBannerAd').catch(() => {});
    },

    /* ---------- социальные механики ---------- */
    onError: null,                       // game.js подставляет сюда показ сообщения игроку
    _err(kind, e) { try { console.warn('[VK]', kind, e); } catch (x) { /* ignore */ } if (P.onError) P.onError(kind, e); },
    share() {
      if (!inVK || !bridge) { P._err('share-dev'); return; }
      const link = CFG.appUrl || (P.appId ? 'https://vk.com/app' + P.appId : '');
      // 1) окно «Поделиться»; 2) если платформа отказала — запись на стену
      send('VKWebAppShare', link ? { link } : {})
        .catch((e1) => send('VKWebAppShowWallPostBox', { message: 'ПОЛЯРНЫЙ КОВЧЕГ — плавь лёд, строй лагерь и спаси экспедицию!', attachments: link })
          .catch((e2) => P._err('share', e2 || e1)));
    },
    addToFavorites() {
      if (!inVK || !bridge) { P._err('fav-dev'); return; }
      send('VKWebAppAddToFavorites').then((r) => { if (r && r.result === false) P._err('fav'); }).catch((e) => P._err('fav', e));
    },
    openSupport() {
      const url = CFG.supportUrl;
      if (!url) return false;
      if (inVK && bridge && /^https?:\/\/(m\.)?vk\.(com|ru)\//.test(url)) send('VKWebAppOpenLink', { url }).catch(() => { window.open(url, '_blank'); });
      else window.open(url, '_blank');
      return true;
    },

    /* ---------- покупки: в VK-сборке не используются (нужен сервер) ---------- */
    async initPayments() {},
    async catalog() { return []; },
    purchase() { return Promise.reject(new Error('payments are not available')); },
    async getPurchases() { return []; },
    consume() { return Promise.resolve(); }
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
