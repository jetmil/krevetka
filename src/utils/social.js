/**
 * Социальные функции: шеринг другу, аналитика
 */
import bridge from '@vkontakte/vk-bridge';
import { APP_URL } from '../constants';
import { safeJsonParse, validateAnalytics } from './validation';

/**
 * Отправить диагноз другу в ЛС
 */
export const shareToFriend = async (diagnosis, mode) => {
  const modeText = mode === 'angry' ? '🦐🔥 Злая' : '🦐✨ Мягкая';
  const message = `${modeText} креветка сказала мне:\n\n"${diagnosis}"\n\nУзнай свою правду: ${APP_URL}`;

  try {
    await bridge.send('VKWebAppShare', {
      link: APP_URL,
      comment: message
    });
    trackEvent('share_friend');
    return true;
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
  const text = `${modeText} креветка судьбы сказала: "${diagnosis}" 🦐\n${APP_URL}`;

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
 * Простая аналитика через VK Storage
 * Хранит счётчики событий
 */
const ANALYTICS_KEY = 'krevetka_analytics';

export const trackEvent = async (eventName, data = {}) => {
  try {
    // Получаем текущую аналитику с валидацией
    const stored = await bridge.send('VKWebAppStorageGet', { keys: [ANALYTICS_KEY] });
    let analytics = { events: {}, sessions: 0 };

    if (stored.keys[0]?.value) {
      const raw = safeJsonParse(stored.keys[0].value, {});
      analytics = validateAnalytics(raw);
    }

    // Обновляем счётчик
    if (!analytics.events) analytics.events = {};
    if (!analytics.events[eventName]) analytics.events[eventName] = 0;
    analytics.events[eventName]++;

    // Трекинг редкости карт
    if (data.rarity) {
      if (!analytics.rarities) analytics.rarities = { common: 0, rare: 0, legendary: 0 };
      if (analytics.rarities[data.rarity] !== undefined) {
        analytics.rarities[data.rarity]++;
      }
    }

    // Трекинг режимов
    if (data.mode) {
      if (!analytics.modes) analytics.modes = { angry: 0, soft: 0 };
      if (analytics.modes[data.mode] !== undefined) {
        analytics.modes[data.mode]++;
      }
    }

    // Трекинг колод
    if (data.deck) {
      if (!analytics.decks) analytics.decks = {};
      if (!analytics.decks[data.deck]) analytics.decks[data.deck] = 0;
      analytics.decks[data.deck]++;
    }

    // Сохраняем дату первого и последнего визита
    const now = new Date().toISOString();
    if (!analytics.firstVisit) analytics.firstVisit = now;
    analytics.lastVisit = now;

    // Счётчик сессий
    if (!analytics.sessions) analytics.sessions = 0;

    // Сохраняем
    await bridge.send('VKWebAppStorageSet', {
      key: ANALYTICS_KEY,
      value: JSON.stringify(analytics)
    });

  } catch {
    // Тихо игнорируем ошибки аналитики
  }
};

/**
 * Трекинг начала сессии
 */
export const trackSessionStart = async () => {
  try {
    const stored = await bridge.send('VKWebAppStorageGet', { keys: [ANALYTICS_KEY] });
    let analytics = { events: {}, sessions: 0 };

    if (stored.keys[0]?.value) {
      const raw = safeJsonParse(stored.keys[0].value, {});
      analytics = validateAnalytics(raw);
    }

    if (!analytics.sessions) analytics.sessions = 0;
    analytics.sessions++;
    analytics.lastSessionStart = new Date().toISOString();

    await bridge.send('VKWebAppStorageSet', {
      key: ANALYTICS_KEY,
      value: JSON.stringify(analytics)
    });

  } catch { /* ignore */ }
};

/**
 * Получить аналитику (для дебага)
 */
export const getAnalytics = async () => {
  try {
    const stored = await bridge.send('VKWebAppStorageGet', { keys: [ANALYTICS_KEY] });
    if (stored.keys[0]?.value) {
      const raw = safeJsonParse(stored.keys[0].value, {});
      return validateAnalytics(raw);
    }
  } catch { /* ignore */ }
  return { events: {}, sessions: 0 }; // Валидный дефолт
};

export default { shareToFriend, copyDiagnosis, trackEvent, trackSessionStart, getAnalytics };
