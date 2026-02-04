/**
 * Хук для системы уровней и XP
 * XP начисляется за: тыки, редкие карты, стрик, шеринг
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { safeJsonParse, validateLevelData } from '../utils/validation';

const STORAGE_KEY = 'krevetka_level';

// Конфигурация уровней
export const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Новичок', emoji: '🦐' },
  { level: 2, xpRequired: 50, title: 'Любопытный', emoji: '👀' },
  { level: 3, xpRequired: 150, title: 'Искатель правды', emoji: '🔍' },
  { level: 4, xpRequired: 300, title: 'Креветочник', emoji: '🎯' },
  { level: 5, xpRequired: 500, title: 'Мастер тыков', emoji: '👆' },
  { level: 6, xpRequired: 800, title: 'Знаток судеб', emoji: '🔮' },
  { level: 7, xpRequired: 1200, title: 'Креветочный гуру', emoji: '🧘' },
  { level: 8, xpRequired: 1800, title: 'Легенда океана', emoji: '🌊' },
  { level: 9, xpRequired: 2500, title: 'Повелитель креветок', emoji: '👑' },
  { level: 10, xpRequired: 3500, title: 'Бог креветок', emoji: '⚡' },
];

// XP за действия
export const XP_REWARDS = {
  tap: 10,           // За каждый тык
  rare_card: 25,     // За редкую карту
  legendary_card: 50, // За легендарную карту
  streak_bonus: 5,   // За каждый день стрика
  share_story: 15,   // За шеринг в историю
  share_friend: 10,  // За отправку другу
  first_tap: 20,     // Бонус за первый тык
  daily_bonus: 30,   // Ежедневный бонус
};

/**
 * Получить уровень по XP
 */
const getLevelByXP = (xp) => {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
};

/**
 * Получить прогресс до следующего уровня
 */
const getProgress = (xp) => {
  const current = getLevelByXP(xp);
  const currentIndex = LEVELS.findIndex(l => l.level === current.level);
  const next = LEVELS[currentIndex + 1];

  if (!next) {
    return { current, next: null, progress: 100, xpToNext: 0 };
  }

  const xpInLevel = xp - current.xpRequired;
  const xpNeeded = next.xpRequired - current.xpRequired;
  const progress = Math.min(Math.round((xpInLevel / xpNeeded) * 100), 100);

  return {
    current,
    next,
    progress,
    xpToNext: next.xpRequired - xp,
  };
};

const useLevel = () => {
  const [xp, setXP] = useState(0);
  const [levelInfo, setLevelInfo] = useState(getProgress(0));
  const [justLeveledUp, setJustLeveledUp] = useState(null);
  const [lastDailyBonus, setLastDailyBonus] = useState(null);
  const levelUpTimerRef = useRef(null);

  // Загрузка данных с валидацией
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await bridge.send('VKWebAppStorageGet', { keys: [STORAGE_KEY] });
        if (stored.keys[0]?.value) {
          const raw = safeJsonParse(stored.keys[0].value, null);
          const data = validateLevelData(raw);
          setXP(data.xp);
          setLevelInfo(getProgress(data.xp));
          setLastDailyBonus(data.lastDailyBonus);
        }
      } catch { /* ignore */ }
    };
    load();
  }, []);

  // Сохранение данных
  const save = useCallback(async (newXP, newLastDaily = lastDailyBonus) => {
    try {
      await bridge.send('VKWebAppStorageSet', {
        key: STORAGE_KEY,
        value: JSON.stringify({ xp: newXP, lastDailyBonus: newLastDaily })
      });
    } catch { /* ignore */ }
  }, [lastDailyBonus]);

  // Добавить XP (с cleanup для memory leak)
  const addXP = useCallback((amount) => {
    setXP(prev => {
      const oldLevel = getLevelByXP(prev);
      const newXP = Math.min(prev + amount, 100000); // Cap XP
      const newLevel = getLevelByXP(newXP);

      // Level up! (с очисткой предыдущего таймера)
      if (newLevel.level > oldLevel.level) {
        if (levelUpTimerRef.current) {
          clearTimeout(levelUpTimerRef.current);
        }
        setJustLeveledUp(newLevel);
        levelUpTimerRef.current = setTimeout(() => setJustLeveledUp(null), 4000);
      }

      setLevelInfo(getProgress(newXP));
      save(newXP);

      return newXP;
    });
  }, [save]);

  // Проверить и выдать ежедневный бонус
  const checkDailyBonus = useCallback(() => {
    const today = new Date().toDateString();
    if (lastDailyBonus !== today) {
      setLastDailyBonus(today);
      addXP(XP_REWARDS.daily_bonus, 'daily_bonus');
      save(xp + XP_REWARDS.daily_bonus, today);
      return true;
    }
    return false;
  }, [lastDailyBonus, addXP, save, xp]);

  // Закрыть уведомление о левел-апе
  const dismissLevelUp = useCallback(() => {
    if (levelUpTimerRef.current) {
      clearTimeout(levelUpTimerRef.current);
    }
    setJustLeveledUp(null);
  }, []);

  // Cleanup таймера при unmount
  useEffect(() => {
    return () => {
      if (levelUpTimerRef.current) {
        clearTimeout(levelUpTimerRef.current);
      }
    };
  }, []);

  return {
    xp,
    level: levelInfo.current,
    nextLevel: levelInfo.next,
    progress: levelInfo.progress,
    xpToNext: levelInfo.xpToNext,
    addXP,
    checkDailyBonus,
    justLeveledUp,
    dismissLevelUp,
    XP_REWARDS,
  };
};

export default useLevel;
