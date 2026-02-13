/**
 * Server-side analytics tracking for Krevetka
 * Sends events to POST /api/track on the backend
 */

const TRACK_URL = '/krevetka-api/track';

let _platform = 'browser';
let _userId = null;

export function initTracker(platform, userId) {
  _platform = platform || 'browser';
  _userId = userId || null;
}

export function trackEvent(event, data = {}) {
  try {
    const payload = {
      event,
      platform: _platform,
      user_id: _userId,
      data,
    };
    // Fire and forget — don't await
    navigator.sendBeacon?.(TRACK_URL, JSON.stringify(payload))
      || fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
  } catch {}
}

// Convenience wrappers
export const trackVisit = () => trackEvent('visit');
export const trackTap = (data) => trackEvent('tap', data);
export const trackShare = (type) => trackEvent(`share_${type}`);
export const trackPurchase = (productId, amount) => trackEvent('purchase', { product_id: productId, amount });
export const trackReturn = () => trackEvent('return_visit');
