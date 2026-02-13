/**
 * Telegram Platform adapter
 * Работает через window.Telegram.WebApp (инжектируется Telegram)
 */

const tg = () => window.Telegram?.WebApp;

const logError = (ctx, e) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[TG] ${ctx}:`, e?.message || e);
  }
};

// Telegram Mini App ID бота
const BOT_USERNAME = 'krevetka_dest_bot';
const APP_LINK = `https://t.me/${BOT_USERNAME}`;

// ID админов (Telegram user IDs)
const ADMIN_IDS = ['2635817'];

export const telegramPlatform = {
  name: 'telegram',

  async init() {
    try {
      const wa = tg();
      if (!wa) return { ok: false, error: 'No Telegram WebApp' };
      wa.ready();
      wa.expand(); // Развернуть на весь экран
      // Тёмная тема — подхватываем цвета Telegram
      if (wa.colorScheme === 'dark') {
        document.documentElement.classList.add('tg-dark');
      }
      // Включаем кнопку закрытия
      wa.enableClosingConfirmation();
      return { ok: true };
    } catch (e) {
      logError('init', e);
      return { ok: false, error: e };
    }
  },

  async isAdmin() {
    try {
      const wa = tg();
      const userId = wa?.initDataUnsafe?.user?.id;
      if (userId && ADMIN_IDS.includes(String(userId))) return true;
    } catch { /* ignore */ }
    return false;
  },

  async getUserId() {
    try {
      return tg()?.initDataUnsafe?.user?.id || null;
    } catch {
      return null;
    }
  },

  // --- Storage (Telegram CloudStorage) ---
  async storageGet(keys) {
    return new Promise((resolve) => {
      const wa = tg();
      if (!wa?.CloudStorage) {
        // Fallback на localStorage
        const result = {};
        keys.forEach(k => { result[k] = localStorage.getItem('krevetka_' + k) || ''; });
        resolve(result);
        return;
      }
      wa.CloudStorage.getItems(keys, (err, values) => {
        if (err) {
          logError('CloudStorage.getItems', err);
          // Fallback
          const result = {};
          keys.forEach(k => { result[k] = localStorage.getItem('krevetka_' + k) || ''; });
          resolve(result);
          return;
        }
        resolve(values || {});
      });
    });
  },

  async storageSet(key, value) {
    return new Promise((resolve) => {
      const wa = tg();
      if (!wa?.CloudStorage) {
        localStorage.setItem('krevetka_' + key, String(value));
        resolve();
        return;
      }
      wa.CloudStorage.setItem(key, String(value), (err) => {
        if (err) {
          logError('CloudStorage.setItem', err);
          localStorage.setItem('krevetka_' + key, String(value));
        }
        resolve();
      });
    });
  },

  // --- Haptics ---
  hapticImpact(style = 'medium') {
    try { tg()?.HapticFeedback?.impactOccurred(style); } catch { /* */ }
  },

  hapticNotification(type = 'success') {
    try { tg()?.HapticFeedback?.notificationOccurred(type); } catch { /* */ }
  },

  hapticSelection() {
    try { tg()?.HapticFeedback?.selectionChanged(); } catch { /* */ }
  },

  // --- Sharing ---
  async shareLink(message) {
    try {
      const url = `https://t.me/share/url?url=${encodeURIComponent(APP_LINK)}&text=${encodeURIComponent(message)}`;
      tg()?.openTelegramLink(url);
      return true;
    } catch {
      return false;
    }
  },

  async shareStory(imageBase64, context) {
    // Telegram не поддерживает программный постинг в сторис
    // Используем shareLink как fallback
    return this.shareLink('Узнай свою правду!');
  },

  // --- Notifications ---
  async requestNotifications() {
    // В Telegram уведомления идут через бота, не через WebApp API
    // Возвращаем true — бот может слать сообщения если юзер его запустил
    return true;
  },

  // --- Payments (Telegram Stars) ---
  async purchase(productId) {
    try {
      const userId = await this.getUserId();
      const resp = await fetch('/krevetka-api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, user_id: String(userId || 'anon') }),
      });
      const data = await resp.json();
      if (!data.ok || !data.url) {
        return { success: false, reason: data.error || 'invoice_failed' };
      }

      return new Promise((resolve) => {
        const wa = tg();
        if (!wa?.openInvoice) {
          resolve({ success: false, reason: 'no_invoice_api' });
          return;
        }
        wa.openInvoice(data.url, (status) => {
          resolve({
            success: status === 'paid',
            status,
          });
        });
      });
    } catch (e) {
      logError('purchase', e);
      return { success: false, reason: 'error' };
    }
  },

  get appUrl() {
    return APP_LINK;
  },

  close() {
    try { tg()?.close(); } catch { /* */ }
  }
};

export default telegramPlatform;
