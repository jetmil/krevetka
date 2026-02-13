/**
 * VK Platform adapter
 */
import bridge from '@vkontakte/vk-bridge';

const logError = (ctx, e) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[VK] ${ctx}:`, e?.message || e);
  }
};

const ADMIN_IDS = ['123456789', '2635817'];

const APP_URL = 'https://vk.com/app54437141';

const buildUrl = (context) => {
  let url = APP_URL;
  if (context?.cardId) {
    url += `#card=${context.cardId}&mode=${context.mode || ''}`;
  }
  return url;
};

export const vkPlatform = {
  name: 'vk',

  async init() {
    try {
      await bridge.send('VKWebAppInit');
      return { ok: true };
    } catch (e) {
      logError('init', e);
      return { ok: false, error: e };
    }
  },

  async isAdmin() {
    try {
      const params = await bridge.send('VKWebAppGetLaunchParams');
      const role = params?.vk_viewer_group_role;
      if (role === 'admin' || role === 'editor') return true;
      const userId = params?.vk_user_id;
      if (userId && ADMIN_IDS.includes(String(userId))) return true;
    } catch { /* ignore */ }
    const urlParams = new URLSearchParams(window.location.search);
    const urlRole = urlParams.get('vk_viewer_group_role');
    if (urlRole === 'admin' || urlRole === 'editor') return true;
    const userId = urlParams.get('vk_user_id');
    if (userId && ADMIN_IDS.includes(String(userId))) return true;
    return false;
  },

  async getUserId() {
    try {
      const params = await bridge.send('VKWebAppGetLaunchParams');
      return params?.vk_user_id || null;
    } catch {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('vk_user_id') || null;
    }
  },

  // --- Storage ---
  async storageGet(keys) {
    const data = await bridge.send('VKWebAppStorageGet', { keys });
    return data.keys.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  },

  async storageSet(key, value) {
    await bridge.send('VKWebAppStorageSet', { key, value: String(value) });
  },

  // --- Haptics ---
  hapticImpact(style = 'medium') {
    bridge.send('VKWebAppTapticImpactOccurred', { style }).catch(() => {});
  },

  hapticNotification(type = 'success') {
    bridge.send('VKWebAppTapticNotificationOccurred', { type }).catch(() => {});
  },

  hapticSelection() {
    bridge.send('VKWebAppTapticSelectionChanged').catch(() => {});
  },

  // --- Sharing ---

  /**
   * Поделиться ссылкой через VKWebAppShare (диалог отправки в личку)
   * Используется для кнопки "Другу"
   */
  async shareLink(message, context) {
    const url = buildUrl(context);
    try {
      await bridge.send('VKWebAppShare', { link: url });
      return true;
    } catch (e) {
      logError('VKWebAppShare', e);
      return false;
    }
  },

  /**
   * Поделиться в историю через VKWebAppShowStoryBox
   * Используется для кнопки "Поделиться"
   */
  async shareStory(imageDataUri, context) {
    const url = buildUrl(context);

    // 1. Попытка с картинкой
    if (imageDataUri) {
      try {
        const blob = imageDataUri.startsWith('data:')
          ? imageDataUri
          : 'data:image/png;base64,' + imageDataUri;

        await bridge.send('VKWebAppShowStoryBox', {
          background_type: 'image',
          blob: blob,
          locked: true,
          attachment: {
            text: 'open',
            type: 'url',
            url: url
          }
        });
        return true;
      } catch (e) {
        logError('VKWebAppShowStoryBox with image', e);
      }
    }

    // 2. Фолбек — история без фона (только ссылка)
    try {
      await bridge.send('VKWebAppShowStoryBox', {
        background_type: 'none',
        attachment: {
          text: 'open',
          type: 'url',
          url: url
        }
      });
      return true;
    } catch (e) {
      logError('VKWebAppShowStoryBox without image', e);
      return false;
    }
  },

  // --- Notifications ---
  async requestNotifications() {
    try {
      const result = await bridge.send('VKWebAppAllowNotifications');
      return result.result === true;
    } catch {
      return false;
    }
  },

  // --- Payments (not supported in VK for Telegram Stars) ---
  async purchase() {
    return { success: false, reason: 'not_supported' };
  },

  get appUrl() {
    return APP_URL;
  },

  close() {
    bridge.send('VKWebAppClose', { status: 'success' }).catch(() => {});
  }
};

export default vkPlatform;
