/**
 * Социальные функции: шеринг, аналитика
 */
import platform from '../platform';
import { safeJsonParse, validateAnalytics } from './validation';

/**
 * Отправить диагноз другу
 */
export const shareToFriend = async (diagnosis, mode, cardId) => {
  const modeText = mode === 'angry' ? '🦐🔥 Злая' : '🦐\u2728 Мягкая';
  const url = cardId ? `${platform.appUrl}#card=${cardId}&mode=${mode}` : platform.appUrl;
  const message = `${modeText} креветка сказала мне:\n\n"${diagnosis}"\n\nУзнай свою правду: ${url}`;

  try {
    const success = await platform.shareLink(message, { cardId, mode });
    if (success) trackEvent('share_friend');
    return success;
  } catch (e) {
    console.warn('Share to friend failed:', e);
    return false;
  }
};

/**
 * Скопировать диагноз в буфер
 */
export const copyDiagnosis = async (diagnosis, mode) => {
  const modeText = mode === 'angry' ? 'Злая' : 'Мягкая';
  const text = `${modeText} креветка судьбы сказала: "${diagnosis}" 🦐\n${platform.appUrl}`;

  try {
    await navigator.clipboard.writeText(text);
    trackEvent('copy_diagnosis');
    return true;
  } catch (e) {
    console.warn('Copy failed:', e);
    return false;
  }
};

/**
 * Аналитика через platform storage + серверный трекинг
 */
const ANALYTICS_KEY = 'krevetka_analytics';
const TRACK_URL = '/krevetka-api/track';

// Кеш userId для синхронной отправки
let _cachedUserId = null;
(async () => {
  try { _cachedUserId = await platform.getUserId(); } catch {}
})();

// Серверный трекинг — fire and forget
const sendToServer = (eventName, data = {}) => {
  try {
    const payload = JSON.stringify({
      event: eventName,
      platform: platform.name || 'browser',
      user_id: _cachedUserId ? String(_cachedUserId) : null,
      data,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_URL, payload);
    } else {
      fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
};

export const trackEvent = async (eventName, data = {}) => {
  // 1. Отправляем на сервер (PostgreSQL)
  sendToServer(eventName, data);

  // 2. Сохраняем локально (platform storage)
  try {
    const stored = await platform.storageGet([ANALYTICS_KEY]);
    let analytics = { events: {}, sessions: 0 };

    if (stored[ANALYTICS_KEY]) {
      const raw = safeJsonParse(stored[ANALYTICS_KEY], {});
      analytics = validateAnalytics(raw);
    }

    if (!analytics.events) analytics.events = {};
    if (!analytics.events[eventName]) analytics.events[eventName] = 0;
    analytics.events[eventName]++;

    if (data.rarity) {
      if (!analytics.rarities) analytics.rarities = { common: 0, rare: 0, legendary: 0 };
      if (analytics.rarities[data.rarity] !== undefined) {
        analytics.rarities[data.rarity]++;
      }
    }

    if (data.mode) {
      if (!analytics.modes) analytics.modes = { angry: 0, soft: 0 };
      if (analytics.modes[data.mode] !== undefined) {
        analytics.modes[data.mode]++;
      }
    }

    if (data.deck) {
      if (!analytics.decks) analytics.decks = {};
      if (!analytics.decks[data.deck]) analytics.decks[data.deck] = 0;
      analytics.decks[data.deck]++;
    }

    const now = new Date().toISOString();
    if (!analytics.firstVisit) analytics.firstVisit = now;
    analytics.lastVisit = now;

    if (!analytics.sessions) analytics.sessions = 0;

    await platform.storageSet(ANALYTICS_KEY, JSON.stringify(analytics));
  } catch {
    // Тихо игнорируем ошибки аналитики
  }
};

export const trackSessionStart = async () => {
  // Серверный трекинг
  sendToServer('visit');

  try {
    const stored = await platform.storageGet([ANALYTICS_KEY]);
    let analytics = { events: {}, sessions: 0 };

    if (stored[ANALYTICS_KEY]) {
      const raw = safeJsonParse(stored[ANALYTICS_KEY], {});
      analytics = validateAnalytics(raw);
    }

    if (!analytics.sessions) analytics.sessions = 0;
    analytics.sessions++;
    analytics.lastSessionStart = new Date().toISOString();
    analytics.platform = platform.name;

    await platform.storageSet(ANALYTICS_KEY, JSON.stringify(analytics));
  } catch { /* ignore */ }
};

export const getAnalytics = async () => {
  try {
    const stored = await platform.storageGet([ANALYTICS_KEY]);
    if (stored[ANALYTICS_KEY]) {
      const raw = safeJsonParse(stored[ANALYTICS_KEY], {});
      return validateAnalytics(raw);
    }
  } catch { /* ignore */ }
  return { events: {}, sessions: 0 };
};

export default { shareToFriend, copyDiagnosis, trackEvent, trackSessionStart, getAnalytics };
