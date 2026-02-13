import platform from '../platform';

/**
 * Тактильная обратная связь (VK / Telegram / Browser)
 */
export const haptic = (type, params = {}) => {
  // Маппинг старых VK-названий на унифицированные
  if (type === 'VKWebAppTapticImpactOccurred') {
    platform.hapticImpact(params.style || 'medium');
  } else if (type === 'VKWebAppTapticNotificationOccurred') {
    platform.hapticNotification(params.type || 'success');
  } else if (type === 'VKWebAppTapticSelectionChanged') {
    platform.hapticSelection();
  }
};

export const useHaptic = () => {
  const selection = () => platform.hapticSelection();
  const impact = (style = 'medium') => platform.hapticImpact(style);
  const notification = (type = 'success') => platform.hapticNotification(type);

  return { selection, impact, notification, haptic };
};

export default useHaptic;
