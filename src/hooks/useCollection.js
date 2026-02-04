import { useState, useEffect, useCallback } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { safeJsonParse, validateCollection } from '../utils/validation';

/**
 * Хук для управления коллекцией диагнозов
 */
export const useCollection = (totalCards = 70) => {
  const [collected, setCollected] = useState([]); // массив {id, mode, diagnosis, date}
  const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка коллекции
  useEffect(() => {
    const loadCollection = async () => {
      try {
        const data = await bridge.send('VKWebAppStorageGet', {
          keys: ['diagnosisCollection']
        });

        const stored = data.keys.find(k => k.key === 'diagnosisCollection');
        if (stored?.value) {
          const raw = safeJsonParse(stored.value, []);
          setCollected(validateCollection(raw));
        }
      } catch (e) {
        console.warn('[Collection] Load error:', e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadCollection();
  }, []);

  // Добавить диагноз в коллекцию
  const addToCollection = useCallback(async (card, mode) => {
    const diagnosis = card[mode]?.diagnosis;
    if (!diagnosis) return false;

    // Проверяем, есть ли уже такой диагноз
    const exists = collected.some(
      c => c.id === card.id && c.mode === mode
    );

    if (exists) return false; // Уже есть

    const newItem = {
      id: card.id,
      mode,
      diagnosis,
      date: new Date().toISOString()
    };

    const newCollection = [...collected, newItem];
    setCollected(newCollection);

    // Сохраняем (ограничиваем размер для VK Storage)
    try {
      const toSave = newCollection.slice(-100); // Последние 100
      await bridge.send('VKWebAppStorageSet', {
        key: 'diagnosisCollection',
        value: JSON.stringify(toSave)
      });
    } catch (e) {
      console.warn('[Collection] Save error:', e);
    }

    return true; // Новый диагноз!
  }, [collected]);

  // Статистика
  const stats = {
    total: collected.length,
    unique: new Set(collected.map(c => `${c.id}-${c.mode}`)).size,
    angry: collected.filter(c => c.mode === 'angry').length,
    soft: collected.filter(c => c.mode === 'soft').length,
    percent: Math.round((new Set(collected.map(c => c.id)).size / totalCards) * 100),
    maxPossible: totalCards * 2 // angry + soft для каждой карты
  };

  // Последние диагнозы
  const recent = collected.slice(-10).reverse();

  // Проверка, собран ли диагноз
  const hasCollected = useCallback((cardId, mode) => {
    return collected.some(c => c.id === cardId && c.mode === mode);
  }, [collected]);

  return {
    collected,
    stats,
    recent,
    isLoaded,
    addToCollection,
    hasCollected
  };
};

export default useCollection;
