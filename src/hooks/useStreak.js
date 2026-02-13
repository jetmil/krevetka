import { useState, useEffect, useCallback } from 'react';
import platform from '../platform';
import { validateStreakData } from '../utils/validation';

/**
 * Хук для управления streak (серией дней)
 */
export const useStreak = () => {
  const [streak, setStreak] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStreak = async () => {
      try {
        const stored = await platform.storageGet(['streakCount', 'lastVisitDate']);
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        const validated = validateStreakData({
          streakCount: stored.streakCount,
          lastVisitDate: stored.lastVisitDate
        });
        const lastVisit = validated.lastDate;
        const currentStreak = validated.streak;

        if (lastVisit === today) {
          setStreak(currentStreak);
        } else if (lastVisit === yesterday) {
          const newStreak = currentStreak + 1;
          setStreak(newStreak);
          await saveStreak(newStreak, today);
        } else {
          setStreak(1);
          await saveStreak(1, today);
        }
      } catch (e) {
        console.warn('[Streak] Load error:', e);
        setStreak(1);
      } finally {
        setIsLoaded(true);
      }
    };

    loadStreak();
  }, []);

  const saveStreak = async (count, date) => {
    try {
      await platform.storageSet('streakCount', String(count));
      await platform.storageSet('lastVisitDate', date);
    } catch (e) {
      console.warn('[Streak] Save error:', e);
    }
  };

  const getStreakBonus = useCallback(() => {
    if (streak >= 30) return { emoji: '👑', label: 'Легенда', color: '#FFD700' };
    if (streak >= 14) return { emoji: '💎', label: 'Мастер', color: '#00CED1' };
    if (streak >= 7) return { emoji: '🔥', label: 'В огне!', color: '#FF6B6B' };
    if (streak >= 3) return { emoji: '\u26A1', label: 'Разгон', color: '#FFB347' };
    return { emoji: '🌱', label: 'Старт', color: '#98D8AA' };
  }, [streak]);

  return { streak, isLoaded, getStreakBonus };
};

export default useStreak;
