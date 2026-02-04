import { useState, useEffect, useCallback, useRef } from 'react';
import bridge from '@vkontakte/vk-bridge';
import cards, { RARITY_CONFIG } from './data/cards';
import { selectCard, selectVideo, resetAllHistory, generateShareImage, generateShareVideo, shareToFriend, shareBattleStory, trackEvent, trackSessionStart } from './utils';
import { haptic, useStreak, useCollection, useLevel } from './hooks';
import useNotifications from './hooks/useNotifications';
import useAchievements from './hooks/useAchievements';
import { Particles, Bubbles, LimitProgress, ErrorBoundary, StreakBadge, WelcomeBackModal, AchievementToast, LevelBadge, LevelUpToast, DeckSelector } from './components/ui';
import { getCardsForDeck, DECKS } from './data/decks';
import { CollectionScreen } from './components/screens';
import { SCREENS, DAILY_LIMIT, VIDEOS, APP_URL, MAX_BUBBLES } from './constants';
import './App.css';

// Логирование ошибок
const logError = (context, error) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Krevetka] ${context}:`, error?.message || error);
  }
};

function App() {
  // Состояние приложения
  const [screen, setScreen] = useState(SCREENS.CHOICE);
  const [mode, setMode] = useState(null);
  const [currentCard, setCurrentCard] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tapsToday, setTapsToday] = useState(0);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastShownCard, setLastShownCard] = useState(null);
  const [isNewDiagnosis, setIsNewDiagnosis] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState('all');

  // Хуки для streak и коллекции
  const { streak, getStreakBonus } = useStreak();
  const { stats, recent, addToCollection } = useCollection(cards.length);
  const streakBonus = getStreakBonus();

  // Хуки для уведомлений и ачивок
  const { showWelcomeBack, hoursAway, dismissWelcomeBack, shouldAskPermission, requestPermission } = useNotifications();
  const { justUnlocked, checkAndUnlock, dismissNotification, totalUnlocked, totalAchievements } = useAchievements();

  // Хук для уровней и XP
  const { xp, level, progress, addXP, justLeveledUp, dismissLevelUp, XP_REWARDS } = useLevel();

  // Refs для cleanup
  const bubbleTimersRef = useRef([]);
  const tapCountedRef = useRef(false);
  const secretTapCountRef = useRef(0);
  const secretTapTimerRef = useRef(null);
  const consecutiveAngryRef = useRef(0);
  const rareCountRef = useRef(0);
  const totalTapsRef = useRef(0);
  const preloadedVideosRef = useRef(new Set()); // Отслеживаем уже загруженные видео
  const tapInProgressRef = useRef(false); // Защита от race condition

  // Инициализация VK Bridge
  useEffect(() => {
    const init = async () => {
      const timeout = setTimeout(() => {
        logError('Init', 'Timeout - not in VK iframe?');
        setIsLoading(false);
      }, 3000);

      try {
        await bridge.send('VKWebAppInit');
        clearTimeout(timeout);

        // Проверяем админа
        try {
          const params = await bridge.send('VKWebAppGetLaunchParams');
          const role = params?.vk_viewer_group_role;
          if (role === 'admin' || role === 'editor') {
            setIsAdmin(true);
          }

          const urlParams = new URLSearchParams(window.location.search);
          const urlRole = urlParams.get('vk_viewer_group_role');
          if (urlRole === 'admin' || urlRole === 'editor') {
            setIsAdmin(true);
          }

          const userId = params?.vk_user_id || urlParams.get('vk_user_id');
          const ADMIN_IDS = ['123456789'];
          if (userId && ADMIN_IDS.includes(String(userId))) {
            setIsAdmin(true);
          }
        } catch (e) {
          logError('GetLaunchParams', e);
          const urlParams = new URLSearchParams(window.location.search);
          const urlRole = urlParams.get('vk_viewer_group_role');
          if (urlRole === 'admin' || urlRole === 'editor') {
            setIsAdmin(true);
          }
        }

        // Получаем сохраненные данные о тыках
        try {
          const data = await bridge.send('VKWebAppStorageGet', { keys: ['tapsToday', 'lastTapDate'] });
          const today = new Date().toDateString();
          const stored = data.keys.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
          }, {});

          if (stored.lastTapDate === today) {
            const parsedTaps = parseInt(stored.tapsToday, 10);
            // Валидация: число от 0 до 100
            setTapsToday(Number.isFinite(parsedTaps) && parsedTaps >= 0 ? Math.min(parsedTaps, 100) : 0);
          } else {
            setTapsToday(0);
          }
        } catch (e) {
          logError('StorageGet', e);
          setTapsToday(0);
        }
      } catch (e) {
        clearTimeout(timeout);
        logError('VK Bridge init', e);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
        trackSessionStart(); // Аналитика
      }
    };

    init();
  }, []);

  // Cleanup таймеров пузырей
  useEffect(() => {
    return () => {
      bubbleTimersRef.current.forEach(clearTimeout);
      bubbleTimersRef.current = [];
    };
  }, []);

  // Создание пузырей
  const createBubbles = useCallback((centerX) => {
    setBubbles(prev => {
      if (prev.length >= MAX_BUBBLES) return prev;

      const newBubbles = [];
      const count = Math.min(6 + Math.floor(Math.random() * 4), MAX_BUBBLES - prev.length);

      for (let i = 0; i < count; i++) {
        newBubbles.push({
          id: Date.now() + i,
          x: centerX + (Math.random() - 0.5) * 30,
          size: 8 + Math.random() * 20,
          duration: 1 + Math.random() * 0.8,
        });
      }

      const timerId = setTimeout(() => {
        setBubbles(current => current.filter(b => !newBubbles.find(nb => nb.id === b.id)));
      }, 2000);
      bubbleTimersRef.current.push(timerId);

      return [...prev, ...newBubbles];
    });
  }, []);

  const isLimitReached = !isAdmin && tapsToday >= DAILY_LIMIT;

  // Preload видео (с защитой от дублирования)
  const preloadVideos = useCallback((selectedMode) => {
    if (!selectedMode || !VIDEOS[selectedMode]) return;
    VIDEOS[selectedMode].forEach(src => {
      // Не создавать дубликаты
      if (preloadedVideosRef.current.has(src)) return;
      preloadedVideosRef.current.add(src);

      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = src;
      video.load();
    });
  }, []);

  // Сохранение лимита
  const saveTapCount = useCallback((newCount) => {
    const today = new Date().toDateString();
    bridge.send('VKWebAppStorageSet', { key: 'tapsToday', value: String(newCount) })
      .catch(e => logError('StorageSet tapsToday', e));
    bridge.send('VKWebAppStorageSet', { key: 'lastTapDate', value: today })
      .catch(e => logError('StorageSet lastTapDate', e));
  }, []);

  // Выбор режима
  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    preloadVideos(selectedMode);
    resetAllHistory();

    if (isLimitReached) {
      setScreen(SCREENS.LIMIT);
      haptic('VKWebAppTapticNotificationOccurred', { type: 'error' });
    } else {
      setScreen(SCREENS.TAP);
    }
    haptic('VKWebAppTapticSelectionChanged');
  };

  // Тык по креветке (с защитой от race condition)
  const handleTap = async (e) => {
    // Двойная проверка: state + ref для защиты от race condition
    if (isAnimating || tapInProgressRef.current) return;
    tapInProgressRef.current = true;

    if (isLimitReached) {
      tapInProgressRef.current = false;
      setScreen(SCREENS.LIMIT);
      haptic('VKWebAppTapticNotificationOccurred', { type: 'error' });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = ((e.clientX - rect.left) / rect.width) * 100;
    createBubbles(centerX);

    haptic('VKWebAppTapticImpactOccurred', { style: 'medium' });

    setIsAnimating(true);
    tapCountedRef.current = false;
    setIsNewDiagnosis(false);

    const deckCards = getCardsForDeck(cards, selectedDeck);
    const selectedCard = selectCard(deckCards);
    setCurrentCard(selectedCard);
    setLastShownCard(selectedCard);

    const videos = VIDEOS[mode];
    setCurrentVideo(selectVideo(videos));
    setShowDiagnosis(false);

    setTimeout(() => {
      setIsAnimating(false);
      tapInProgressRef.current = false; // Сбрасываем флаг
      setScreen(SCREENS.CARD);
      setTimeout(async () => {
        setShowDiagnosis(true);
        haptic('VKWebAppTapticNotificationOccurred', { type: 'success' });

        // Добавляем в коллекцию
        const isNew = await addToCollection(selectedCard, mode);
        setIsNewDiagnosis(isNew);

        // Трекинг для ачивок
        totalTapsRef.current += 1;

        if (mode === 'angry') {
          consecutiveAngryRef.current += 1;
        } else {
          consecutiveAngryRef.current = 0;
        }

        if (selectedCard.rarity === 'rare' || selectedCard.rarity === 'legendary') {
          rareCountRef.current += 1;
        }

        // Проверяем ачивки
        checkAndUnlock({
          totalTaps: totalTapsRef.current,
          mode,
          consecutiveAngry: consecutiveAngryRef.current,
          streak,
          collectedAngry: stats.angry,
          collectedSoft: stats.soft,
          cardRarity: selectedCard.rarity,
          rareCount: rareCountRef.current
        });

        // Запрашиваем уведомления после 3го тыка
        if (totalTapsRef.current === 3 && shouldAskPermission) {
          requestPermission();
        }

        if (!tapCountedRef.current) {
          tapCountedRef.current = true;
          const newTapsCount = tapsToday + 1;
          setTapsToday(newTapsCount);
          saveTapCount(newTapsCount);
          // Трекинг с данными о редкости, режиме и колоде
          trackEvent('tap_complete', { rarity: selectedCard.rarity, mode, deck: selectedDeck });

          // Начисление XP
          addXP(XP_REWARDS.tap);
          if (selectedCard.rarity === 'rare') {
            addXP(XP_REWARDS.rare_card);
          } else if (selectedCard.rarity === 'legendary') {
            addXP(XP_REWARDS.legendary_card);
          }
          // Бонус за стрик
          if (streak > 0) {
            addXP(streak * XP_REWARDS.streak_bonus);
          }
        }
      }, 800);
    }, 700);
  };

  // Шеринг
  const handleShare = async (useVideo = false) => {
    const cardToShare = currentCard || lastShownCard;
    const cardData = cardToShare ? cardToShare[mode] : null;
    const diagnosisText = cardData ? cardData.diagnosis : 'Узнай свою судьбу!';
    const shareMode = mode || 'soft';

    haptic('VKWebAppTapticSelectionChanged');

    // Пробуем видео-сторис
    if (useVideo) {
      try {
        trackEvent('share_video');
        const videoBlob = await generateShareVideo(diagnosisText, shareMode);
        await bridge.send('VKWebAppShowStoryBox', {
          background_type: 'video',
          blob: videoBlob,
          attachment: { text: 'Узнай свою правду', type: 'url', url: APP_URL }
        });
        addXP(XP_REWARDS.share_story);
        return;
      } catch {
        // Fallback на картинку
      }
    }

    // Статичная картинка
    trackEvent('share_story');
    try {
      const imageBlob = await generateShareImage(diagnosisText, shareMode);
      await bridge.send('VKWebAppShowStoryBox', {
        background_type: 'image',
        blob: imageBlob,
        attachment: { text: 'Узнай свою правду', type: 'url', url: APP_URL }
      });
      addXP(XP_REWARDS.share_story);
    } catch (e) {
      logError('ShowStoryBox', e);
      try {
        await bridge.send('VKWebAppShare', { link: APP_URL });
        addXP(XP_REWARDS.share_story);
      } catch (e2) {
        logError('VKWebAppShare', e2);
      }
    }
  };

  // Ещё раз
  const handleAgain = () => {
    if (isLimitReached) {
      setScreen(SCREENS.LIMIT);
      haptic('VKWebAppTapticNotificationOccurred', { type: 'error' });
      return;
    }
    setCurrentCard(null);
    setShowDiagnosis(false);
    setIsNewDiagnosis(false);
    setScreen(SCREENS.TAP);
    haptic('VKWebAppTapticSelectionChanged');
  };

  // Сменить режим
  const handleChangeMode = () => {
    setCurrentCard(null);
    setShowDiagnosis(false);
    setIsNewDiagnosis(false);
    setMode(null);
    setScreen(SCREENS.CHOICE);
  };

  // Открыть коллекцию
  const handleOpenCollection = () => {
    setScreen(SCREENS.COLLECTION);
    haptic('VKWebAppTapticSelectionChanged');
  };

  // Секретный сброс лимита (только для уже авторизованных админов)
  const handleSecretTap = () => {
    if (!isAdmin) return; // Только для админов!

    secretTapCountRef.current += 1;

    if (secretTapTimerRef.current) {
      clearTimeout(secretTapTimerRef.current);
    }

    if (secretTapCountRef.current >= 5) {
      setTapsToday(0);
      bridge.send('VKWebAppStorageSet', { key: 'tapsToday', value: '0' })
        .catch(e => logError('SecretReset', e));
      haptic('VKWebAppTapticNotificationOccurred', { type: 'success' });
      secretTapCountRef.current = 0;
    } else {
      secretTapTimerRef.current = setTimeout(() => {
        secretTapCountRef.current = 0;
      }, 3000);
    }
  };

  // Экран загрузки
  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loading-content">
          <span className="loading-shrimp">🦐</span>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  const renderChoice = () => (
    <div className="screen choice-screen">
      {/* Уровень, стрик и коллекция в шапке */}
      <div className="choice-header">
        <LevelBadge
          level={level}
          progress={progress}
          onClick={handleOpenCollection}
        />
        <StreakBadge
          streak={streak}
          bonus={streakBonus}
          onClick={handleOpenCollection}
        />
        <button
          className="collection-btn"
          onClick={handleOpenCollection}
          aria-label={`Моя коллекция: ${stats.unique} карт`}
        >
          <span aria-hidden="true">🎯</span>
          <span className="collection-count">{stats.unique}</span>
        </button>
        <a
          href="privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="privacy-link"
          aria-label="Политика конфиденциальности"
        >
          <span aria-hidden="true">ℹ️</span>
        </a>
      </div>

      <div className="logo">
        <video
          className="shrimp-video"
          autoPlay
          loop
          muted
          playsInline
          poster="icons/icon-576.png"
          aria-label="Анимация креветки"
        >
          <source src="promo/03-come-here.mp4" type="video/mp4" />
        </video>
        <h1 onClick={handleSecretTap}>Креветка судьбы</h1>
        <p className="tagline">Скрюченная правда о тебе</p>
      </div>

      {/* Выбор колоды */}
      <DeckSelector
        selectedDeck={selectedDeck}
        onSelect={setSelectedDeck}
      />

      <div className="choice-buttons" role="group" aria-label="Выбор режима">
        <button
          className="choice-btn angry-btn"
          onClick={() => handleModeSelect('angry')}
          aria-label="Злая креветка — жёсткие диагнозы"
        >
          <span className="btn-icon" aria-hidden="true">🦐🔥</span>
          <span className="btn-title">Злая креветка</span>
          <span className="btn-desc">Готов к правде?</span>
        </button>

        <button
          className="choice-btn soft-btn"
          onClick={() => handleModeSelect('soft')}
          aria-label="Мягкая креветка — нежные диагнозы"
        >
          <span className="btn-icon" aria-hidden="true">🦐✨</span>
          <span className="btn-title">Мягкая</span>
          <span className="btn-desc">Для нежных</span>
        </button>
      </div>
    </div>
  );

  const renderTap = () => (
    <div className="screen tap-screen">
      <div className="tap-header">
        <button className="back-btn" onClick={handleChangeMode}>
          ← {mode === 'angry' ? 'Злая' : 'Мягкая'}
        </button>
        <div className="tap-header-right">
          <StreakBadge streak={streak} bonus={streakBonus} onClick={handleOpenCollection} />
          <LimitProgress current={tapsToday} max={DAILY_LIMIT} isAdmin={isAdmin} />
        </div>
      </div>

      <div className="tap-area" onClick={handleTap}>
        <div className={`shrimp ${isAnimating ? 'animating' : ''} ${mode}`}>
          <span className="shrimp-emoji">🦐</span>
          {mode === 'angry' && <span className="fire-emoji">🔥</span>}
        </div>
        <p className="tap-hint">{isAnimating ? 'Скручиваюсь...' : 'Ткни меня'}</p>
      </div>

      {/* Индикатор колоды */}
      {selectedDeck !== 'all' && DECKS[selectedDeck] && (
        <div className="deck-indicator" style={{ '--deck-color': DECKS[selectedDeck].color }}>
          <span>{DECKS[selectedDeck].emoji}</span>
          <span>{DECKS[selectedDeck].name}</span>
        </div>
      )}
    </div>
  );

  const renderLimit = () => (
    <div className="screen limit-screen">
      <div className="limit-content">
        <video className="limit-video" autoPlay loop muted playsInline>
          <source src="promo/06-sleep.mp4" type="video/mp4" />
        </video>
        <h2 onClick={handleSecretTap}>Креветка устала</h2>
        <p>Ты уже получил {DAILY_LIMIT} правды на сегодня.</p>
        <p className="limit-subtext">Приходи завтра за новой порцией откровений.</p>

        {/* Показываем streak на экране лимита */}
        {streak > 0 && (
          <div className="limit-streak">
            <StreakBadge streak={streak} bonus={streakBonus} onClick={handleOpenCollection} />
          </div>
        )}
      </div>
      <div className="limit-actions">
        <button className="action-btn share-btn" onClick={handleShare}>Поделиться в истории</button>
        <button className="action-btn again-btn" onClick={handleOpenCollection}>Моя коллекция</button>
      </div>
    </div>
  );

  const renderCard = () => {
    if (!currentCard) return null;

    const cardData = currentCard[mode];
    const rarityConfig = RARITY_CONFIG[currentCard.rarity];
    const showRarity = currentCard.rarity !== 'common';

    return (
      <div className="screen card-screen">
        <video className="card-video" autoPlay loop muted playsInline key={currentVideo}>
          <source src={currentVideo} type="video/mp4" />
        </video>
        <div className="card">
          {showRarity && (
            <div className={`rarity-badge ${currentCard.rarity}`}>
              {rarityConfig.emoji} {rarityConfig.label}
            </div>
          )}
          <div className="card-hit"><p>{cardData.hit}</p></div>
          <div className="card-divider"></div>
          <div className="card-support"><p>{cardData.support}</p></div>
          <div className={`card-diagnosis ${showDiagnosis ? 'visible' : ''}`}>
            <span className="diagnosis-label">Диагноз:</span>
            <span className="diagnosis-text">{cardData.diagnosis}</span>
            {isNewDiagnosis && <span className="new-diagnosis-badge">Новый!</span>}
          </div>
        </div>

        <div className="card-actions">
          <button className="action-btn share-btn" onClick={() => handleShare(false)}>
            <span aria-hidden="true">📷</span> История
          </button>
          <button className="action-btn battle-btn" onClick={() => handleBattle(cardData.diagnosis)}>
            <span aria-hidden="true">🆚</span> Батл
          </button>
          <button className="action-btn friend-btn" onClick={() => handleShareToFriend(cardData.diagnosis)}>
            <span aria-hidden="true">💬</span> Другу
          </button>
        </div>
        <div className="card-actions-bottom">
          <button
            className="action-btn again-btn"
            onClick={handleAgain}
            disabled={isLimitReached}
          >
            {isLimitReached ? 'Лимит исчерпан' : 'Ещё раз'}
          </button>
        </div>
      </div>
    );
  };

  // Отправить другу
  const handleShareToFriend = async (diagnosis) => {
    haptic('VKWebAppTapticSelectionChanged');
    const success = await shareToFriend(diagnosis, mode);
    if (success) {
      addXP(XP_REWARDS.share_friend);
    }
  };

  // Батл с другом
  const handleBattle = async (diagnosis) => {
    haptic('VKWebAppTapticImpactOccurred', { style: 'heavy' });
    trackEvent('share_battle', { mode });
    const success = await shareBattleStory(diagnosis, mode);
    if (success) {
      addXP(XP_REWARDS.share_story + 5); // Бонус за батл
    }
  };

  return (
    <ErrorBoundary>
      <div className={`app ${mode || ''}`}>
        <Particles />
        <Bubbles bubbles={bubbles} />
        {screen === SCREENS.CHOICE && renderChoice()}
        {screen === SCREENS.TAP && renderTap()}
        {screen === SCREENS.CARD && renderCard()}
        {screen === SCREENS.LIMIT && renderLimit()}
        {screen === SCREENS.COLLECTION && (
          <CollectionScreen
            stats={stats}
            recent={recent}
            streak={streak}
            streakBonus={streakBonus}
            onClose={handleChangeMode}
            totalAchievements={totalAchievements}
            unlockedAchievements={totalUnlocked}
            level={level}
            levelProgress={progress}
            xp={xp}
          />
        )}

        {/* Модалка "С возвращением" */}
        {showWelcomeBack && (
          <WelcomeBackModal
            hoursAway={hoursAway}
            onClose={dismissWelcomeBack}
          />
        )}

        {/* Тост ачивки */}
        <AchievementToast
          achievement={justUnlocked}
          onClose={dismissNotification}
        />

        {/* Тост повышения уровня */}
        <LevelUpToast
          level={justLeveledUp}
          onClose={dismissLevelUp}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
