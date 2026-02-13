/**
 * Browser fallback adapter
 * Для открытия вне VK/Telegram (десктоп, прямая ссылка)
 */

const logError = (ctx, e) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Browser] ${ctx}:`, e?.message || e);
  }
};

export const browserPlatform = {
  name: 'browser',

  async init() {
    return { ok: true };
  },

  async isAdmin() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('admin') === 'true';
  },

  async getUserId() {
    return null;
  },

  // --- Storage (localStorage) ---
  async storageGet(keys) {
    const result = {};
    keys.forEach(k => {
      result[k] = localStorage.getItem('krevetka_' + k) || '';
    });
    return result;
  },

  async storageSet(key, value) {
    localStorage.setItem('krevetka_' + key, String(value));
  },

  // --- Haptics (no-op) ---
  hapticImpact() {},
  hapticNotification() {},
  hapticSelection() {},

  // --- Sharing ---
  async shareLink(message) {
    try {
      await navigator.clipboard.writeText(message);
      return true;
    } catch {
      return false;
    }
  },

  async shareStory(_imageBase64, _context) {
    return false;
  },

  async requestNotifications() {
    return false;
  },

  // --- Payments (not supported) ---
  async purchase() {
    return { success: false, reason: 'not_supported' };
  },

  get appUrl() {
    return window.location.origin + window.location.pathname;
  },

  close() {
    window.close();
  }
};

export default browserPlatform;
