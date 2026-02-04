/**
 * Константы приложения «Креветка судьбы»
 */

// Состояния экранов
export const SCREENS = {
  CHOICE: 'choice',
  TAP: 'tap',
  CARD: 'card',
  LIMIT: 'limit',
  COLLECTION: 'collection'
};

// Лимит тыков в день
export const DAILY_LIMIT = 3;

// URL приложения для шеринга
export const APP_URL = 'https://vk.com/app54437141';

// Видео для каждого режима
export const VIDEOS = {
  angry: [
    'promo/angry-red-eyes.mp4',
    'promo/angry-judge.mp4',
    'promo/angry-meditation.mp4',
    'promo/angry-sarcastic.mp4',
    'promo/angry-glowing.mp4',
    'promo/angry-throne.mp4',
    'promo/angry-smirk.mp4',
    'promo/angry-detective.mp4',
    'promo/angry-pointing.mp4',
    'promo/angry-lightning.mp4',
  ],
  soft: [
    'promo/soft-sunset-jump.mp4',
    'promo/soft-cute-smile.mp4',
    'promo/soft-anime-dreamy.mp4',
    'promo/soft-heart.mp4',
    'promo/soft-pearl.mp4',
    'promo/soft-wink.mp4',
    'promo/soft-sunset-gaze.mp4',
    'promo/soft-hello.mp4',
    'promo/soft-pink-bubbles.mp4',
    'promo/soft-galaxy-eyes.mp4',
    'promo/soft-orange-smile.mp4',
    'promo/soft-pastel.mp4',
  ]
};

// Максимум пузырей на экране
export const MAX_BUBBLES = 30;
