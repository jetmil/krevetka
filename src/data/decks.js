/**
 * Тематические колоды карт
 * Группируют карты по темам для более целенаправленных диагнозов
 */

export const DECKS = {
  all: {
    id: 'all',
    name: 'Все карты',
    emoji: '🎴',
    description: 'Полная колода — 70 диагнозов',
    themes: null, // null = все темы
    color: '#4ecdc4',
  },
  work: {
    id: 'work',
    name: 'Работа и деньги',
    emoji: '💼',
    description: '14 карт про карьеру и финансы',
    themes: ['work', 'things'],
    color: '#f39c12',
  },
  relations: {
    id: 'relations',
    name: 'Отношения',
    emoji: '💕',
    description: '21 карта про любовь и социум',
    themes: ['relations', 'lies', 'crowd'],
    color: '#e74c3c',
  },
  meaning: {
    id: 'meaning',
    name: 'Смысл жизни',
    emoji: '🌟',
    description: '21 карта про мечты и страхи',
    themes: ['meaning', 'dreams', 'fear'],
    color: '#9b59b6',
  },
  lifestyle: {
    id: 'lifestyle',
    name: 'Быт и время',
    emoji: '⏰',
    description: '14 карт про привычки',
    themes: ['time', 'comfort'],
    color: '#3498db',
  },
};

export const DECK_LIST = Object.values(DECKS);

/**
 * Получить карты для колоды
 */
export const getCardsForDeck = (cards, deckId) => {
  const deck = DECKS[deckId];
  if (!deck || !deck.themes) {
    return cards; // Все карты
  }
  return cards.filter(card => deck.themes.includes(card.theme));
};

export default DECKS;
