/**
 * Хук для push-уведомлений и возврата пользователей
 */
import { useState, useEffect, useCallback } from 'react';
import bridge from '@vkontakte/vk-bridge';

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

  // Загрузка состояния при старте
  useEffect(() => {
    const loadState = async () => {
      try {
        const data = await bridge.send('VKWebAppStorageGet', {
          keys: [STORAGE_KEYS.NOTIFICATIONS_ALLOWED, STORAGE_KEYS.LAST_VISIT, STORAGE_KEYS.NOTIFICATION_ASKED]
        });

        const stored = data.keys.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});

        setIsAllowed(stored[STORAGE_KEYS.NOTIFICATIONS_ALLOWED] === 'true');
        setWasAsked(stored[STORAGE_KEYS.NOTIFICATION_ASKED] === 'true');

        // Проверяем сколько времени прошло с последнего визита
        const lastVisit = parseInt(stored[STORAGE_KEYS.LAST_VISIT]) || 0;
        if (lastVisit > 0) {
          const hoursSince = Math.floor((Date.now() - lastVisit) / (1000 * 60 * 60));
          if (hoursSince >= 24) {
            setHoursAway(hoursSince);
            setShowWelcomeBack(true);
          }
        }

        // Обновляем время визита
        await bridge.send('VKWebAppStorageSet', {
          key: STORAGE_KEYS.LAST_VISIT,
          value: String(Date.now())
        });
      } catch (e) {
        console.warn('Notifications state load failed:', e);
      }
    };

    loadState();
  }, []);

  // Запросить разрешение на уведомления
  const requestPermission = useCallback(async () => {
    if (wasAsked) return isAllowed;

    try {
      const result = await bridge.send('VKWebAppAllowNotifications');
      const allowed = result.result === true;

      setIsAllowed(allowed);
      setWasAsked(true);

      await bridge.send('VKWebAppStorageSet', {
        key: STORAGE_KEYS.NOTIFICATIONS_ALLOWED,
        value: String(allowed)
      });
      await bridge.send('VKWebAppStorageSet', {
        key: STORAGE_KEYS.NOTIFICATION_ASKED,
        value: 'true'
      });

      return allowed;
    } catch (e) {
      console.warn('Notification permission request failed:', e);
      setWasAsked(true);
      await bridge.send('VKWebAppStorageSet', {
        key: STORAGE_KEYS.NOTIFICATION_ASKED,
        value: 'true'
      }).catch(() => {});
      return false;
    }
  }, [wasAsked, isAllowed]);

  // Закрыть welcome back модалку
  const dismissWelcomeBack = useCallback(() => {
    setShowWelcomeBack(false);
  }, []);

  // Должны ли спрашивать разрешение (после 3го успешного тыка)
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
