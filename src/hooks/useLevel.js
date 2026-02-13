/**
 * Хук для системы уровней и XP
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import platform from '../platform';
import { safeJsonParse, validateLevelData } from '../utils/validation';

const STORAGE_KEY = 'krevetka_level';

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
  { level: 10, xpRequired: 3500, title: 'Бог креветок', emoji: '\u26A1' },
];

export const XP_REWARDS = {
  tap: 10,
  rare_card: 25,
  legendary_card: 50,
  streak_bonus: 5,
  share_story: 15,
  share_friend: 10,
  first_tap: 20,
  daily_bonus: 30,
};

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

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await platform.storageGet([STORAGE_KEY]);
        if (stored[STORAGE_KEY]) {
          const raw = safeJsonParse(stored[STORAGE_KEY], null);
          const data = validateLevelData(raw);
          setXP(data.xp);
          setLevelInfo(getProgress(data.xp));
          setLastDailyBonus(data.lastDailyBonus);
        }
      } catch { /* ignore */ }
    };
    load();
  }, []);

  const save = useCallback(async (newXP, newLastDaily = lastDailyBonus) => {
    try {
      await platform.storageSet(STORAGE_KEY, JSON.stringify({ xp: newXP, lastDailyBonus: newLastDaily }));
    } catch { /* ignore */ }
  }, [lastDailyBonus]);

  const addXP = useCallback((amount) => {
    setXP(prev => {
      const oldLevel = getLevelByXP(prev);
      const newXP = Math.min(prev + amount, 100000);
      const newLevel = getLevelByXP(newXP);

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

  const dismissLevelUp = useCallback(() => {
    if (levelUpTimerRef.current) {
      clearTimeout(levelUpTimerRef.current);
    }
    setJustLeveledUp(null);
  }, []);

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
