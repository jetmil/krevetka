import { useState, useEffect, useCallback } from 'react';
import platform from '../platform';
import { safeJsonParse, validateCollection } from '../utils/validation';

/**
 * Хук для управления коллекцией диагнозов
 */
export const useCollection = (totalCards = 70) => {
  const [collected, setCollected] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadCollection = async () => {
      try {
        const stored = await platform.storageGet(['diagnosisCollection']);
        if (stored.diagnosisCollection) {
          const raw = safeJsonParse(stored.diagnosisCollection, []);
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

  const addToCollection = useCallback(async (card, mode) => {
    const diagnosis = card[mode]?.diagnosis;
    if (!diagnosis) return false;

    const exists = collected.some(
      c => c.id === card.id && c.mode === mode
    );

    if (exists) return false;

    const newItem = {
      id: card.id,
      mode,
      diagnosis,
      date: new Date().toISOString()
    };

    const newCollection = [...collected, newItem];
    setCollected(newCollection);

    try {
      const toSave = newCollection.slice(-100);
      await platform.storageSet('diagnosisCollection', JSON.stringify(toSave));
    } catch (e) {
      console.warn('[Collection] Save error:', e);
    }

    return true;
  }, [collected]);

  const stats = {
    total: collected.length,
    unique: new Set(collected.map(c => `${c.id}-${c.mode}`)).size,
    angry: collected.filter(c => c.mode === 'angry').length,
    soft: collected.filter(c => c.mode === 'soft').length,
    percent: Math.round((new Set(collected.map(c => c.id)).size / totalCards) * 100),
    maxPossible: totalCards * 2
  };

  const recent = collected.slice(-10).reverse();

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
