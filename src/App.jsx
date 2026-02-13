import { useState, useEffect, useCallback, useRef } from 'react';
import platform from './platform';
import cards, { RARITY_CONFIG } from './data/cards';
import { selectCard, selectVideo, resetAllHistory, generateShareImage, generateShareVideo, shareToFriend, trackEvent, trackSessionStart } from './utils';
import { haptic, useStreak, useCollection, useLevel } from './hooks';
import useNotifications from './hooks/useNotifications';
import useAchievements from './hooks/useAchievements';
import { Particles, Bubbles, LimitProgress, ErrorBoundary, StreakBadge, WelcomeBackModal, AchievementToast, LevelBadge, LevelUpToast, DeckSelector } from './components/ui';
import { getCardsForDeck, DECKS } from './data/decks';
import { CollectionScreen } from './components/screens';
import { SCREENS, DAILY_LIMIT, VIDEOS, APP_URL, MAX_BUBBLES, PRODUCTS } from './constants';
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
  const [isLoading, setIsLoading] = useState(false);
  const [lastShownCard, setLastShownCard] = useState(null);
  const [isNewDiagnosis, setIsNewDiagnosis] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState('all');

  // Telegram Stars: бонусные тыки и безлимит
  const [bonusTaps, setBonusTaps] = useState(0);
  const [unlimitedToday, setUnlimitedToday] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [shareToast, setShareToast] = useState(null);

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
  const preloadedVideosRef = useRef(new Set());
  const tapInProgressRef = useRef(false);
  const longPressTimerRef = useRef(null);

  // Проверка доступности VK Bridge
  const [isVKAvailable, setIsVKAvailable] = useState(true);

  // Инициализация
  useEffect(() => {
    const init = async () => {
      let vkAvailable = false;

      const timeout = setTimeout(() => {
        logError('Init', 'Timeout - running in browser mode');
        setIsVKAvailable(false);
        loadFromLocalStorage();
        setIsLoading(false);
      }, 1000);

      try {
        const initResult = await platform.init();
        clearTimeout(timeout);
        if (initResult.ok) {
          vkAvailable = true;
          setIsVKAvailable(true);
        }

        try {
          const admin = await platform.isAdmin();
          if (admin) setIsAdmin(true);
        } catch (e) {
          logError('isAdmin', e);
        }

        try {
          const stored = await platform.storageGet(['tapsToday', 'lastTapDate', 'bonusTaps', 'bonusDate', 'unlimitedDate']);
          const today = new Date().toDateString();

          if (stored.lastTapDate === today) {
            const parsedTaps = parseInt(stored.tapsToday, 10);
            setTapsToday(Number.isFinite(parsedTaps) && parsedTaps >= 0 ? Math.min(parsedTaps, 100) : 0);
          } else {
            setTapsToday(0);
          }

          // Бонусные тыки — сбрасываются на следующий день
          if (stored.bonusDate === today) {
            const parsedBonus = parseInt(stored.bonusTaps, 10);
            setBonusTaps(Number.isFinite(parsedBonus) && parsedBonus >= 0 ? parsedBonus : 0);
          } else {
            setBonusTaps(0);
          }

          // Безлимит — проверяем дату
          if (stored.unlimitedDate === today) {
            setUnlimitedToday(true);
          }
        } catch (e) {
          logError('StorageGet', e);
          setTapsToday(0);
        }
      } catch (e) {
        clearTimeout(timeout);
        logError('Platform init', e);
        setIsVKAvailable(false);
        loadFromLocalStorage();
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
        if (vkAvailable) trackSessionStart();

        // Открыть конкретное предсказание по ссылке #card=ID&mode=angry|soft
        try {
          const hash = window.location.hash;
          if (hash) {
            const params = new URLSearchParams(hash.slice(1));
            const cardId = parseInt(params.get('card'), 10);
            const cardMode = params.get('mode');
            if (cardId && cardMode && (cardMode === 'angry' || cardMode === 'soft')) {
              const card = cards.find(c => c.id === cardId);
              if (card) {
                setMode(cardMode);
                setCurrentCard(card);
                setLastShownCard(card);
                setShowDiagnosis(true);
                setScreen(SCREENS.CARD);
                trackEvent('open_shared_card', { cardId, mode: cardMode });
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
            }
          }
        } catch { /* ignore */ }
      }
    };

    const loadFromLocalStorage = async () => {
      try {
        const stored = await platform.storageGet(['tapsToday', 'lastTapDate', 'bonusTaps', 'bonusDate', 'unlimitedDate']);
        const today = new Date().toDateString();
        if (stored.lastTapDate === today) {
          const taps = parseInt(stored.tapsToday || '0', 10);
          setTapsToday(Math.min(Math.max(0, taps), 100));
        } else {
          setTapsToday(0);
        }
        if (stored.bonusDate === today) {
          const b = parseInt(stored.bonusTaps || '0', 10);
          setBonusTaps(Math.max(0, b));
        }
        if (stored.unlimitedDate === today) {
          setUnlimitedToday(true);
        }
      } catch {
        setTapsToday(0);
      }
      try {
        const admin = await platform.isAdmin();
        if (admin) setIsAdmin(true);
      } catch { /* ignore */ }
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

  const isLimitReached = !isAdmin && !unlimitedToday && tapsToday >= (DAILY_LIMIT + bonusTaps);

  // Preload видео
  const preloadVideos = useCallback((selectedMode) => {
    if (!selectedMode || !VIDEOS[selectedMode]) return;
    VIDEOS[selectedMode].forEach(src => {
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
    platform.storageSet('tapsToday', String(newCount)).catch(e => logError('StorageSet tapsToday', e));
    platform.storageSet('lastTapDate', today).catch(e => logError('StorageSet lastTapDate', e));
  }, []);

  // Покупка за Telegram Stars
  const handlePurchase = async (productId) => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    haptic('VKWebAppTapticSelectionChanged');

    try {
      const result = await platform.purchase(productId);
      if (result.success) {
        const today = new Date().toDateString();
        haptic('VKWebAppTapticNotificationOccurred', { type: 'success' });
        trackEvent('purchase_success', { product: productId });

        if (productId === 'taps_5') {
          const newBonus = bonusTaps + 5;
          setBonusTaps(newBonus);
          platform.storageSet('bonusTaps', String(newBonus)).catch(e => logError('StorageSet bonusTaps', e));
          platform.storageSet('bonusDate', today).catch(e => logError('StorageSet bonusDate', e));
        } else if (productId === 'unlimited_day') {
          setUnlimitedToday(true);
          platform.storageSet('unlimitedDate', today).catch(e => logError('StorageSet unlimitedDate', e));
        }

        // После покупки — сразу обратно на экран тыка
        setScreen(SCREENS.TAP);
      } else {
        trackEvent('purchase_cancel', { product: productId, reason: result.reason || result.status });
      }
    } catch (e) {
      logError('handlePurchase', e);
    } finally {
      setIsPurchasing(false);
    }
  };

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

  // Тык по креветке
  const handleTap = async (e) => {
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
      tapInProgressRef.current = false;
      setScreen(SCREENS.CARD);
      setTimeout(async () => {
        setShowDiagnosis(true);
        haptic('VKWebAppTapticNotificationOccurred', { type: 'success' });

        const isNew = await addToCollection(selectedCard, mode);
        setIsNewDiagnosis(isNew);

        totalTapsRef.current += 1;

        if (mode === 'angry') {
          consecutiveAngryRef.current += 1;
        } else {
          consecutiveAngryRef.current = 0;
        }

        if (selectedCard.rarity === 'rare' || selectedCard.rarity === 'legendary') {
          rareCountRef.current += 1;
        }

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

        if (totalTapsRef.current === 3 && shouldAskPermission) {
          requestPermission();
        }

        if (!tapCountedRef.current) {
          tapCountedRef.current = true;
          const newTapsCount = tapsToday + 1;
          setTapsToday(newTapsCount);
          saveTapCount(newTapsCount);
          trackEvent('tap_complete', { rarity: selectedCard.rarity, mode, deck: selectedDeck });

          addXP(XP_REWARDS.tap);
          if (selectedCard.rarity === 'rare') {
            addXP(XP_REWARDS.rare_card);
          } else if (selectedCard.rarity === 'legendary') {
            addXP(XP_REWARDS.legendary_card);
          }
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
    const shareContext = { cardId: cardToShare?.id, mode: shareMode };

    haptic('VKWebAppTapticSelectionChanged');

    if (useVideo && platform.name === 'vk') {
      try {
        trackEvent('share_video');
        const videoBlob = generateShareVideo(diagnosisText, shareMode);
        const success = await platform.shareStory(videoBlob, shareContext);
        if (success) {
          addXP(XP_REWARDS.share_story);
          return;
        }
      } catch {
        // Fallback на картинку
      }
    }

    trackEvent('share_story');
    try {
      const imageBlob = generateShareImage(diagnosisText, shareMode);
      const success = await platform.shareStory(imageBlob, shareContext);
      if (success) addXP(XP_REWARDS.share_story);
    } catch (e) {
      logError('shareStory', e);
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

  // Секретный сброс лимита
  const handleSecretTap = () => {
    if (!isAdmin) return;

    secretTapCountRef.current += 1;

    if (secretTapTimerRef.current) {
      clearTimeout(secretTapTimerRef.current);
    }

    if (secretTapCountRef.current >= 5) {
      setTapsToday(0);
      platform.storageSet('tapsToday', '0')
        .catch(e => logError('SecretReset', e));
      haptic('VKWebAppTapticNotificationOccurred', { type: 'success' });
      secretTapCountRef.current = 0;
    } else {
      secretTapTimerRef.current = setTimeout(() => {
        secretTapCountRef.current = 0;
      }, 3000);
    }
  };

  // Секретное долгое нажатие
  const handleSecretLongPressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsAdmin(true);
      setTapsToday(0);
      haptic('VKWebAppTapticNotificationOccurred', { type: 'success' });
    }, 3000);
  };

  const handleSecretLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Отправить другу
  const handleShareToFriend = async (diagnosis) => {
    const card = currentCard || lastShownCard;
    haptic('VKWebAppTapticSelectionChanged');
    const success = await shareToFriend(diagnosis, mode, card?.id);
    if (success) {
      addXP(XP_REWARDS.share_friend);
    }
  };

  // Поделиться в историю (VKWebAppShowStoryBox)
  const [isSharing, setIsSharing] = useState(false);

  const handleShareToStory = async () => {
    if (isSharing) return;
    setIsSharing(true);

    const cardToShare = currentCard || lastShownCard;
    const cardData = cardToShare ? cardToShare[mode] : null;
    const diagnosisText = cardData ? cardData.diagnosis : 'Узнай свою судьбу!';
    const shareMode = mode || 'soft';
    const shareContext = { cardId: cardToShare?.id, mode: shareMode };

    haptic('VKWebAppTapticSelectionChanged');
    trackEvent('share_story', { mode: shareMode });

    try {
      const imageDataUri = generateShareImage(diagnosisText, shareMode);
      const success = await platform.shareStory(imageDataUri, shareContext);
      if (success) {
        addXP(XP_REWARDS.share_story);
      }
    } catch (e) {
      logError('handleShareToStory', e);
    } finally {
      setIsSharing(false);
    }
  };

  // Экран загрузки
  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loading-content">
          <span className="loading-shrimp">&#x1F990;</span>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  const renderChoice = () => (
    <div className="screen choice-screen">
      <div className="choice-header">
        {level.level >= 2 && (
          <LevelBadge
            level={level}
            progress={progress}
            onClick={handleOpenCollection}
          />
        )}
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
          <span aria-hidden="true">&#x1F3AF;</span>
          <span className="collection-count">{stats.unique}</span>
        </button>
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
        <p
          className="tagline"
          onTouchStart={handleSecretLongPressStart}
          onTouchEnd={handleSecretLongPressEnd}
          onMouseDown={handleSecretLongPressStart}
          onMouseUp={handleSecretLongPressEnd}
          onMouseLeave={handleSecretLongPressEnd}
        >Скрюченная правда о тебе</p>
      </div>

      {stats.unique >= 10 && (
        <DeckSelector
          selectedDeck={selectedDeck}
          onSelect={setSelectedDeck}
        />
      )}

      <div className="choice-buttons" role="group" aria-label="Выбор режима">
        <button
          className="choice-btn angry-btn"
          onClick={() => handleModeSelect('angry')}
          aria-label="Злая креветка — жёсткие диагнозы"
        >
          <span className="btn-icon" aria-hidden="true">&#x1F990;&#x1F525;</span>
          <span className="btn-title">Злая креветка</span>
          <span className="btn-desc">Готов к правде?</span>
        </button>

        <button
          className="choice-btn soft-btn"
          onClick={() => handleModeSelect('soft')}
          aria-label="Мягкая креветка — нежные диагнозы"
        >
          <span className="btn-icon" aria-hidden="true">&#x1F990;&#x2728;</span>
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
          &#x2190; {mode === 'angry' ? 'Злая' : 'Мягкая'}
        </button>
        <div className="tap-header-right">
          <StreakBadge streak={streak} bonus={streakBonus} onClick={handleOpenCollection} />
          <LimitProgress current={tapsToday} max={DAILY_LIMIT + bonusTaps} isAdmin={isAdmin || unlimitedToday} />
        </div>
      </div>

      <div className="tap-area" onClick={handleTap}>
        <div className={`shrimp ${isAnimating ? 'animating' : ''} ${mode}`}>
          <span className="shrimp-emoji">&#x1F990;</span>
          {mode === 'angry' && <span className="fire-emoji">&#x1F525;</span>}
        </div>
        <p className="tap-hint">{isAnimating ? 'Скручиваюсь...' : 'Ткни меня'}</p>
      </div>

    </div>
  );

  const renderLimit = () => (
    <div className="screen limit-screen">
      <div className="limit-content">
        <video className="limit-video" autoPlay loop muted playsInline>
          <source src="promo/06-sleep.mp4" type="video/mp4" />
        </video>
        <h2 onClick={handleSecretTap}>Креветка устала</h2>
        <p>Ты уже получил {DAILY_LIMIT + bonusTaps} правд на сегодня.</p>
        <p className="limit-subtext">Лимит обновится в полночь — приходи завтра за новой порцией.</p>

        {streak > 0 && (
          <div className="limit-streak">
            <StreakBadge streak={streak} bonus={streakBonus} onClick={handleOpenCollection} />
          </div>
        )}
      </div>

      {platform.name === 'telegram' && (
        <div className="purchase-section">
          <p className="purchase-title">Или разбуди её прямо сейчас</p>
          <div className="purchase-buttons">
            <button
              className="purchase-btn purchase-taps"
              onClick={() => handlePurchase('taps_5')}
              disabled={isPurchasing}
            >
              <span className="purchase-emoji">{PRODUCTS.taps_5.emoji}</span>
              <span className="purchase-info">
                <span className="purchase-name">{PRODUCTS.taps_5.title}</span>
                <span className="purchase-desc">{PRODUCTS.taps_5.description}</span>
              </span>
              <span className="purchase-price">
                <span className="star-icon">&#x2B50;</span>
                <span>{PRODUCTS.taps_5.price}</span>
              </span>
            </button>
            <button
              className="purchase-btn purchase-unlimited"
              onClick={() => handlePurchase('unlimited_day')}
              disabled={isPurchasing}
            >
              <span className="purchase-emoji">{PRODUCTS.unlimited_day.emoji}</span>
              <span className="purchase-info">
                <span className="purchase-name">{PRODUCTS.unlimited_day.title}</span>
                <span className="purchase-desc">{PRODUCTS.unlimited_day.description}</span>
              </span>
              <span className="purchase-price">
                <span className="star-icon">&#x2B50;</span>
                <span>{PRODUCTS.unlimited_day.price}</span>
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="limit-actions">
        <button className="action-btn share-btn" onClick={handleShare}>{'\u{1F4E4}'} В истории</button>
        <button className="action-btn again-btn" onClick={handleOpenCollection}>{'\u{1F3AF}'} Коллекция</button>
      </div>
      <div className="limit-actions" style={{ marginTop: 8 }}>
        <button className="action-btn again-btn" onClick={handleChangeMode}>{'\u2190'} На главную</button>
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
          <button className="action-btn battle-btn" onClick={handleShareToStory} disabled={isSharing}>
            <span aria-hidden="true">&#x1F4E4;</span> {isSharing ? 'Открываем...' : 'Поделиться'}
          </button>
          <button className="action-btn friend-btn" onClick={() => handleShareToFriend(cardData.diagnosis)}>
            <span aria-hidden="true">&#x1F4AC;</span> Другу
          </button>
        </div>
        <div className="card-actions-bottom">
          {isLimitReached ? (
            <>
              <button className="action-btn again-btn" onClick={handleChangeMode}>
                {'\u2190'} На главную
              </button>
            </>
          ) : (
            <button className="action-btn again-btn" onClick={handleAgain}>
              Ещё раз
            </button>
          )}
        </div>
        {isLimitReached && (
          <p className="limit-hint-text">Лимит обновится в полночь</p>
        )}
      </div>
    );
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

        {showWelcomeBack && (
          <WelcomeBackModal
            hoursAway={hoursAway}
            onClose={dismissWelcomeBack}
          />
        )}

        <AchievementToast
          achievement={justUnlocked}
          onClose={dismissNotification}
        />

        <LevelUpToast
          level={justLeveledUp}
          onClose={dismissLevelUp}
        />

        {shareToast && (
          <div className="share-toast">{shareToast}</div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
