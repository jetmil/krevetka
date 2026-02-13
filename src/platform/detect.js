/**
 * Определение платформы: Telegram или VK
 */

export const PLATFORMS = {
  TELEGRAM: 'telegram',
  VK: 'vk',
  BROWSER: 'browser'
};

/**
 * Определить текущую платформу
 * Telegram инжектирует window.Telegram.WebApp до загрузки нашего кода
 * VK определяется по URL параметрам или referrer
 */
export const detectPlatform = () => {
  // Telegram Mini App — SDK инжектирован
  if (window.Telegram?.WebApp?.initData) {
    return PLATFORMS.TELEGRAM;
  }

  // VK Mini App — параметры в URL или referrer
  const search = window.location.search;
  const referrer = document.referrer || '';
  if (
    search.includes('vk_') ||
    referrer.includes('vk.com') ||
    referrer.includes('vk.ru')
  ) {
    return PLATFORMS.VK;
  }

  // Fallback: проверяем наличие VK Bridge (может загрузиться позже)
  // и Telegram WebApp (без initData — возможно прямой заход)
  if (window.Telegram?.WebApp) {
    return PLATFORMS.TELEGRAM;
  }

  return PLATFORMS.BROWSER;
};

export default detectPlatform;
