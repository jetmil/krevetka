/**
 * Качественный рандом с защитой от повторов и поддержкой редкости
 * Использует crypto.getRandomValues() вместо Math.random()
 */

const MAX_CARD_HISTORY = 10;
const MAX_VIDEO_HISTORY = 3;

const recentCardIds = [];
const recentVideoIndices = [];

// Шансы редкости (в сумме 1.0)
const RARITY_CHANCES = {
  common: 0.80,
  rare: 0.15,
  legendary: 0.05
};

/**
 * Криптографически стойкий рандом [0, max)
 */
const secureRandom = (max) => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
};

/**
 * Криптографически стойкий float [0, 1)
 */
const secureRandomFloat = () => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
};

/**
 * Перемешать массив (Fisher-Yates с crypto)
 */
const shuffle = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Выбрать редкость по шансам
 */
const rollRarity = () => {
  const roll = secureRandomFloat();
  if (roll < RARITY_CHANCES.legendary) return 'legendary';
  if (roll < RARITY_CHANCES.legendary + RARITY_CHANCES.rare) return 'rare';
  return 'common';
};

/**
 * Выбрать случайную карту с учётом редкости
 */
export const selectCard = (cards) => {
  if (!cards || cards.length === 0) return null;

  // Фильтруем недавние
  let available = cards.filter(card => !recentCardIds.includes(card.id));

  // Если все в истории — берём из полного пула
  if (available.length === 0) {
    available = cards;
  }

  // Ролл редкости
  const targetRarity = rollRarity();

  // Пытаемся найти карту нужной редкости
  let pool = available.filter(card => card.rarity === targetRarity);

  // Если нет карт нужной редкости — берём любые доступные
  if (pool.length === 0) {
    pool = available;
  }

  // Перемешиваем и берём первую
  pool = shuffle(pool);
  const card = pool[0];

  // Добавляем в историю
  recentCardIds.push(card.id);
  if (recentCardIds.length > MAX_CARD_HISTORY) {
    recentCardIds.shift();
  }

  return card;
};

/**
 * Выбрать случайное видео, избегая последних показанных
 */
export const selectVideo = (videos) => {
  if (!videos || videos.length === 0) return null;
  if (videos.length === 1) return videos[0];

  // Доступные индексы (не в истории)
  let availableIndices = videos
    .map((_, i) => i)
    .filter(i => !recentVideoIndices.includes(i));

  // Если все в истории — сбрасываем
  if (availableIndices.length === 0) {
    recentVideoIndices.length = 0;
    availableIndices = videos.map((_, i) => i);
  }

  const idx = availableIndices[secureRandom(availableIndices.length)];

  recentVideoIndices.push(idx);
  if (recentVideoIndices.length > MAX_VIDEO_HISTORY) {
    recentVideoIndices.shift();
  }

  return videos[idx];
};

/**
 * Сбросить историю карт
 */
export const resetCardHistory = () => {
  recentCardIds.length = 0;
};

/**
 * Сбросить историю видео
 */
export const resetVideoHistory = () => {
  recentVideoIndices.length = 0;
};

/**
 * Сбросить всё
 */
export const resetAllHistory = () => {
  resetCardHistory();
  resetVideoHistory();
};

// Для отладки
export const getCardHistory = () => [...recentCardIds];
export const getVideoHistory = () => [...recentVideoIndices];
