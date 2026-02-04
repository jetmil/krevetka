import { useState, useEffect, useCallback } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { validateStreakData } from '../utils/validation';

/**
 * Хук для управления streak (серией дней)
 */
export const useStreak = () => {
  const [streak, setStreak] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка streak при старте
  useEffect(() => {
    const loadStreak = async () => {
      try {
        const data = await bridge.send('VKWebAppStorageGet', {
          keys: ['streakCount', 'lastVisitDate']
        });

        const stored = data.keys.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});

        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        // Валидация данных из storage
        const validated = validateStreakData({
          streakCount: stored.streakCount,
          lastVisitDate: stored.lastVisitDate
        });
        const lastVisit = validated.lastDate;
        const currentStreak = validated.streak;

        if (lastVisit === today) {
          // Уже заходил сегодня — сохраняем streak
          setStreak(currentStreak);
        } else if (lastVisit === yesterday) {
          // Заходил вчера — продолжаем streak
          const newStreak = currentStreak + 1;
          setStreak(newStreak);
          await saveStreak(newStreak, today);
        } else {
          // Пропустил день или первый визит — начинаем с 1
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

  // Сохранение streak
  const saveStreak = async (count, date) => {
    try {
      await bridge.send('VKWebAppStorageSet', {
        key: 'streakCount',
        value: String(count)
      });
      await bridge.send('VKWebAppStorageSet', {
        key: 'lastVisitDate',
        value: date
      });
    } catch (e) {
      console.warn('[Streak] Save error:', e);
    }
  };

  // Получить бонус за streak
  const getStreakBonus = useCallback(() => {
    if (streak >= 30) return { emoji: '👑', label: 'Легенда', color: '#FFD700' };
    if (streak >= 14) return { emoji: '💎', label: 'Мастер', color: '#00CED1' };
    if (streak >= 7) return { emoji: '🔥', label: 'В огне!', color: '#FF6B6B' };
    if (streak >= 3) return { emoji: '⚡', label: 'Разгон', color: '#FFB347' };
    return { emoji: '🌱', label: 'Старт', color: '#98D8AA' };
  }, [streak]);

  return { streak, isLoaded, getStreakBonus };
};

export default useStreak;
