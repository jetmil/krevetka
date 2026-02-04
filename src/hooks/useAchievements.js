/**
 * Хук для системы ачивок
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { safeJsonParse, validateAchievements } from '../utils/validation';

// Определения ачивок
export const ACHIEVEMENTS = {
  FIRST_TAP: {
    id: 'first_tap',
    emoji: '🦐',
    title: 'Первый тык',
    description: 'Тыкнул креветку впервые',
    secret: false
  },
  ANGRY_STREAK_5: {
    id: 'angry_streak_5',
    emoji: '🔥',
    title: 'Пять злых',
    description: '5 злых диагнозов подряд',
    secret: false
  },
  WEEK_STREAK: {
    id: 'week_streak',
    emoji: '📅',
    title: 'Неделя без пропусков',
    description: '7 дней подряд с креветкой',
    secret: false
  },
  NIGHT_OWL: {
    id: 'night_owl',
    emoji: '🦉',
    title: 'Ночной тыкальщик',
    description: 'Тык после полуночи',
    secret: false
  },
  COLLECTOR_ANGRY: {
    id: 'collector_angry',
    emoji: '😈',
    title: 'Коллекционер злости',
    description: 'Все 70 карт в злом режиме',
    secret: false
  },
  COLLECTOR_SOFT: {
    id: 'collector_soft',
    emoji: '💖',
    title: 'Коллекционер нежности',
    description: 'Все 70 карт в мягком режиме',
    secret: false
  },
  LEGENDARY_FIND: {
    id: 'legendary_find',
    emoji: '🌟',
    title: 'Счастливчик',
    description: 'Нашёл легендарную карту',
    secret: true
  },
  RARE_HUNTER: {
    id: 'rare_hunter',
    emoji: '💎',
    title: 'Охотник за редкостями',
    description: 'Нашёл 5 редких карт',
    secret: true
  }
};

const STORAGE_KEY = 'achievements';

export const useAchievements = () => {
  const [unlocked, setUnlocked] = useState([]);
  const [justUnlocked, setJustUnlocked] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const notificationTimerRef = useRef(null);

  // Загрузка при старте с валидацией
  useEffect(() => {
    const load = async () => {
      try {
        const data = await bridge.send('VKWebAppStorageGet', { keys: [STORAGE_KEY] });
        const stored = data.keys[0]?.value;
        if (stored) {
          const raw = safeJsonParse(stored, []);
          setUnlocked(validateAchievements(raw));
        }
      } catch (e) {
        console.warn('Failed to load achievements:', e);
      }
      setIsLoaded(true);
    };
    load();
  }, []);

  // Сохранение
  const saveAchievements = useCallback(async (achievements) => {
    try {
      await bridge.send('VKWebAppStorageSet', {
        key: STORAGE_KEY,
        value: JSON.stringify(achievements)
      });
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }, []);

  // Разблокировать ачивку (с cleanup для memory leak)
  const unlock = useCallback((achievementId) => {
    if (unlocked.includes(achievementId)) return false;

    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
    if (!achievement) return false;

    const newUnlocked = [...unlocked, achievementId];
    setUnlocked(newUnlocked);
    setJustUnlocked(achievement);
    saveAchievements(newUnlocked);

    // Очистить предыдущий таймер и установить новый
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = setTimeout(() => setJustUnlocked(null), 3000);

    return true;
  }, [unlocked, saveAchievements]);

  // Проверить условия и разблокировать
  const checkAndUnlock = useCallback((context) => {
    const {
      totalTaps = 0,
      consecutiveAngry = 0,
      streak = 0,
      collectedAngry = 0,
      collectedSoft = 0,
      cardRarity,
      rareCount = 0
    } = context;

    const newlyUnlocked = [];

    // Первый тык
    if (totalTaps === 1 && !unlocked.includes('first_tap')) {
      if (unlock('first_tap')) newlyUnlocked.push('first_tap');
    }

    // 5 злых подряд
    if (consecutiveAngry >= 5 && !unlocked.includes('angry_streak_5')) {
      if (unlock('angry_streak_5')) newlyUnlocked.push('angry_streak_5');
    }

    // Неделя стрика
    if (streak >= 7 && !unlocked.includes('week_streak')) {
      if (unlock('week_streak')) newlyUnlocked.push('week_streak');
    }

    // Ночной тык (между 0:00 и 5:00)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5 && !unlocked.includes('night_owl')) {
      if (unlock('night_owl')) newlyUnlocked.push('night_owl');
    }

    // Полная коллекция злых (70 карт)
    if (collectedAngry >= 70 && !unlocked.includes('collector_angry')) {
      if (unlock('collector_angry')) newlyUnlocked.push('collector_angry');
    }

    // Полная коллекция мягких (70 карт)
    if (collectedSoft >= 70 && !unlocked.includes('collector_soft')) {
      if (unlock('collector_soft')) newlyUnlocked.push('collector_soft');
    }

    // Легендарная карта
    if (cardRarity === 'legendary' && !unlocked.includes('legendary_find')) {
      if (unlock('legendary_find')) newlyUnlocked.push('legendary_find');
    }

    // 5 редких карт
    if (rareCount >= 5 && !unlocked.includes('rare_hunter')) {
      if (unlock('rare_hunter')) newlyUnlocked.push('rare_hunter');
    }

    return newlyUnlocked;
  }, [unlocked, unlock]);

  // Проверить есть ли ачивка
  const hasAchievement = useCallback((achievementId) => {
    return unlocked.includes(achievementId);
  }, [unlocked]);

  // Скрыть уведомление
  const dismissNotification = useCallback(() => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setJustUnlocked(null);
  }, []);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  return {
    unlocked,
    justUnlocked,
    isLoaded,
    checkAndUnlock,
    hasAchievement,
    dismissNotification,
    allAchievements: ACHIEVEMENTS,
    totalUnlocked: unlocked.length,
    totalAchievements: Object.keys(ACHIEVEMENTS).length
  };
};

export default useAchievements;
