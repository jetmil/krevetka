/**
 * Platform — единая точка входа
 * Автоматически определяет VK / Telegram / Browser
 */
import { detectPlatform, PLATFORMS } from './detect';
import { vkPlatform } from './vk';
import { telegramPlatform } from './telegram';
import { browserPlatform } from './browser';

const platformMap = {
  [PLATFORMS.VK]: vkPlatform,
  [PLATFORMS.TELEGRAM]: telegramPlatform,
  [PLATFORMS.BROWSER]: browserPlatform,
};

const detected = detectPlatform();
const platform = platformMap[detected] || browserPlatform;

if (process.env.NODE_ENV === 'development') {
  console.log(`[Platform] Detected: ${detected}, using: ${platform.name}`);
}

export { PLATFORMS };
export default platform;
