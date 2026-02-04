/**
 * Валидация данных из VK Storage
 * Защита от повреждённых или подделанных данных
 */

/**
 * Безопасный JSON.parse с валидацией
 */
export const safeJsonParse = (str, fallback = null) => {
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * Валидация коллекции диагнозов
 */
export const validateCollection = (data) => {
  if (!Array.isArray(data)) return [];
  return data.filter(item =>
    item &&
    typeof item.id === 'number' &&
    typeof item.mode === 'string' &&
    ['angry', 'soft'].includes(item.mode) &&
    typeof item.diagnosis === 'string' &&
    item.diagnosis.length < 500
  ).slice(-100); // Макс 100 записей
};

/**
 * Валидация данных уровня
 */
export const validateLevelData = (data) => {
  if (!data || typeof data !== 'object') {
    return { xp: 0, lastDailyBonus: null };
  }
  return {
    xp: typeof data.xp === 'number' ? Math.min(Math.max(0, data.xp), 100000) : 0,
    lastDailyBonus: typeof data.lastDailyBonus === 'string' ? data.lastDailyBonus : null
  };
};

/**
 * Валидация streak данных
 */
export const validateStreakData = (data) => {
  const streak = parseInt(data?.streakCount) || 0;
  const lastDate = data?.lastVisitDate || null;
  return {
    streak: Math.min(Math.max(0, streak), 365), // Макс 365 дней
    lastDate
  };
};

/**
 * Валидация аналитики
 */
export const validateAnalytics = (data) => {
  if (!data || typeof data !== 'object') {
    return { events: {}, sessions: 0 };
  }
  return {
    events: typeof data.events === 'object' ? data.events : {},
    sessions: typeof data.sessions === 'number' ? Math.min(data.sessions, 10000) : 0,
    firstVisit: data.firstVisit || null,
    lastVisit: data.lastVisit || null,
    rarities: data.rarities || { common: 0, rare: 0, legendary: 0 },
    modes: data.modes || { angry: 0, soft: 0 },
    decks: data.decks || {}
  };
};

/**
 * Валидация ачивок
 */
export const validateAchievements = (data) => {
  if (!Array.isArray(data)) return [];
  return data.filter(id => typeof id === 'string' && id.length < 50);
};

export default {
  safeJsonParse,
  validateCollection,
  validateLevelData,
  validateStreakData,
  validateAnalytics,
  validateAchievements
};
