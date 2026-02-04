import bridge from '@vkontakte/vk-bridge';

/**
 * Логирование ошибок
 */
const logError = (context, error) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Krevetka] ${context}:`, error?.message || error);
  }
};

/**
 * Тактильная обратная связь
 */
export const haptic = async (type, params = {}) => {
  try {
    await bridge.send(type, params);
  } catch (e) {
    logError(`Haptic ${type}`, e);
  }
};

/**
 * Хук для удобного использования тактильной обратной связи
 */
export const useHaptic = () => {
  const selection = () => haptic('VKWebAppTapticSelectionChanged');
  const impact = (style = 'medium') => haptic('VKWebAppTapticImpactOccurred', { style });
  const notification = (type = 'success') => haptic('VKWebAppTapticNotificationOccurred', { type });

  return { selection, impact, notification, haptic };
};

export default useHaptic;
