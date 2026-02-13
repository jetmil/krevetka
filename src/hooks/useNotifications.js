import { useState, useEffect, useCallback } from 'react';
import platform from '../platform';

const STORAGE_KEYS = {
  NOTIFICATIONS_ALLOWED: 'notifications_allowed',
  LAST_VISIT: 'last_visit_timestamp',
  NOTIFICATION_ASKED: 'notification_asked'
};

export const useNotifications = () => {
  const [isAllowed, setIsAllowed] = useState(false);
  const [wasAsked, setWasAsked] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [hoursAway, setHoursAway] = useState(0);

  useEffect(() => {
    const loadState = async () => {
      try {
        const stored = await platform.storageGet([
          STORAGE_KEYS.NOTIFICATIONS_ALLOWED,
          STORAGE_KEYS.LAST_VISIT,
          STORAGE_KEYS.NOTIFICATION_ASKED
        ]);

        setIsAllowed(stored[STORAGE_KEYS.NOTIFICATIONS_ALLOWED] === 'true');
        setWasAsked(stored[STORAGE_KEYS.NOTIFICATION_ASKED] === 'true');

        const lastVisit = parseInt(stored[STORAGE_KEYS.LAST_VISIT]) || 0;
        if (lastVisit > 0) {
          const hoursSince = Math.floor((Date.now() - lastVisit) / (1000 * 60 * 60));
          if (hoursSince >= 24) {
            setHoursAway(hoursSince);
            setShowWelcomeBack(true);
          }
        }

        await platform.storageSet(STORAGE_KEYS.LAST_VISIT, String(Date.now()));
      } catch (e) {
        console.warn('Notifications state load failed:', e);
      }
    };

    loadState();
  }, []);

  const requestPermission = useCallback(async () => {
    if (wasAsked) return isAllowed;

    try {
      const allowed = await platform.requestNotifications();

      setIsAllowed(allowed);
      setWasAsked(true);

      await platform.storageSet(STORAGE_KEYS.NOTIFICATIONS_ALLOWED, String(allowed));
      await platform.storageSet(STORAGE_KEYS.NOTIFICATION_ASKED, 'true');

      return allowed;
    } catch (e) {
      console.warn('Notification permission request failed:', e);
      setWasAsked(true);
      await platform.storageSet(STORAGE_KEYS.NOTIFICATION_ASKED, 'true').catch(() => {});
      return false;
    }
  }, [wasAsked, isAllowed]);

  const dismissWelcomeBack = useCallback(() => {
    setShowWelcomeBack(false);
  }, []);

  const shouldAskPermission = !wasAsked && !isAllowed;

  return {
    isAllowed,
    wasAsked,
    shouldAskPermission,
    requestPermission,
    showWelcomeBack,
    hoursAway,
    dismissWelcomeBack
  };
};

export default useNotifications;
