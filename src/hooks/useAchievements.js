import { useState, useEffect, useCallback, useRef } from 'react';
import platform from '../platform';
import { safeJsonParse, validateAchievements } from '../utils/validation';

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

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await platform.storageGet([STORAGE_KEY]);
        if (stored[STORAGE_KEY]) {
          const raw = safeJsonParse(stored[STORAGE_KEY], []);
          setUnlocked(validateAchievements(raw));
        }
      } catch (e) {
        console.warn('Failed to load achievements:', e);
      }
      setIsLoaded(true);
    };
    load();
  }, []);

  const saveAchievements = useCallback(async (achievements) => {
    try {
      await platform.storageSet(STORAGE_KEY, JSON.stringify(achievements));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }, []);

  const unlock = useCallback((achievementId) => {
    if (unlocked.includes(achievementId)) return false;

    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
    if (!achievement) return false;

    const newUnlocked = [...unlocked, achievementId];
    setUnlocked(newUnlocked);
    setJustUnlocked(achievement);
    saveAchievements(newUnlocked);

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = setTimeout(() => setJustUnlocked(null), 3000);

    return true;
  }, [unlocked, saveAchievements]);

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

    if (totalTaps === 1 && !unlocked.includes('first_tap')) {
      if (unlock('first_tap')) newlyUnlocked.push('first_tap');
    }
    if (consecutiveAngry >= 5 && !unlocked.includes('angry_streak_5')) {
      if (unlock('angry_streak_5')) newlyUnlocked.push('angry_streak_5');
    }
    if (streak >= 7 && !unlocked.includes('week_streak')) {
      if (unlock('week_streak')) newlyUnlocked.push('week_streak');
    }
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5 && !unlocked.includes('night_owl')) {
      if (unlock('night_owl')) newlyUnlocked.push('night_owl');
    }
    if (collectedAngry >= 70 && !unlocked.includes('collector_angry')) {
      if (unlock('collector_angry')) newlyUnlocked.push('collector_angry');
    }
    if (collectedSoft >= 70 && !unlocked.includes('collector_soft')) {
      if (unlock('collector_soft')) newlyUnlocked.push('collector_soft');
    }
    if (cardRarity === 'legendary' && !unlocked.includes('legendary_find')) {
      if (unlock('legendary_find')) newlyUnlocked.push('legendary_find');
    }
    if (rareCount >= 5 && !unlocked.includes('rare_hunter')) {
      if (unlock('rare_hunter')) newlyUnlocked.push('rare_hunter');
    }

    return newlyUnlocked;
  }, [unlocked, unlock]);

  const hasAchievement = useCallback((achievementId) => {
    return unlocked.includes(achievementId);
  }, [unlocked]);

  const dismissNotification = useCallback(() => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setJustUnlocked(null);
  }, []);

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
