import { useState, useEffect, useCallback } from 'react';
import bridge from '@vkontakte/vk-bridge';
import cards from './data/cards';
import './App.css';

// Состояния приложения
const SCREENS = {
  CHOICE: 'choice',
  TAP: 'tap',
  CARD: 'card',
  LIMIT: 'limit'
};

// Лимит тыков в день (кроме админов)
const DAILY_LIMIT = 3;
const ADMIN_IDS = [198367679]; // jetmil

// Компонент частиц фона
const Particles = () => (
  <div className="particles">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="particle" />
    ))}
  </div>
);

// Компонент пузырей
const Bubbles = ({ bubbles }) => (
  <div className="bubbles-container">
    {bubbles.map((bubble) => (
      <div
        key={bubble.id}
        className="bubble"
        style={{
          left: `${bubble.x}%`,
          width: `${bubble.size}px`,
          height: `${bubble.size}px`,
          animationDuration: `${bubble.duration}s`,
        }}
      />
    ))}
  </div>
);

function App() {
  const [screen, setScreen] = useState(SCREENS.CHOICE);
  const [mode, setMode] = useState(null);
  const [currentCard, setCurrentCard] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tapsToday, setTapsToday] = useState(0);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tapsLeft, setTapsLeft] = useState(DAILY_LIMIT);

  // Инициализация VK Bridge
  useEffect(() => {
    bridge.send('VKWebAppInit');

    // Получаем ID пользователя для проверки админа
    bridge.send('VKWebAppGetUserInfo')
      .then((user) => {
        if (ADMIN_IDS.includes(user.id)) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});

    bridge.send('VKWebAppStorageGet', { keys: ['tapsToday', 'lastTapDate'] })
      .then((data) => {
        const today = new Date().toDateString();
        const stored = data.keys.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});

        if (stored.lastTapDate === today) {
          const taps = parseInt(stored.tapsToday) || 0;
          setTapsToday(taps);
          setTapsLeft(Math.max(0, DAILY_LIMIT - taps));
        } else {
          setTapsLeft(DAILY_LIMIT);
        }
      })
      .catch(() => {});
  }, []);

  // Создание пузырей
  const createBubbles = useCallback((centerX) => {
    const newBubbles = [];
    const count = 6 + Math.floor(Math.random() * 4); // 6-9 пузырей

    for (let i = 0; i < count; i++) {
      newBubbles.push({
        id: Date.now() + i,
        x: centerX + (Math.random() - 0.5) * 30, // разброс по X
        size: 8 + Math.random() * 20, // размер 8-28px
        duration: 1 + Math.random() * 0.8, // 1-1.8 секунды
      });
    }

    setBubbles(prev => [...prev, ...newBubbles]);

    // Удаляем пузыри через 2 секунды
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => !newBubbles.find(nb => nb.id === b.id)));
    }, 2000);
  }, []);

  // Выбор режима
  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setScreen(SCREENS.TAP);
    // Тактильная отдача
    try {
      bridge.send('VKWebAppTapticSelectionChanged');
    } catch (e) {}
  };

  // Тык по креветке
  const handleTap = (e) => {
    if (isAnimating) return;

    // Проверка лимита (админы без ограничений)
    if (!isAdmin && tapsToday >= DAILY_LIMIT) {
      setScreen(SCREENS.LIMIT);
      try {
        bridge.send('VKWebAppTapticNotificationOccurred', { type: 'error' });
      } catch (e) {}
      return;
    }

    // Создаём пузыри в точке клика
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = ((e.clientX - rect.left) / rect.width) * 100;
    createBubbles(centerX);

    // Тактильная отдача
    try {
      bridge.send('VKWebAppTapticImpactOccurred', { style: 'medium' });
    } catch (e) {}

    setIsAnimating(true);

    // Выбираем случайную карточку
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    setCurrentCard(randomCard);
    setShowDiagnosis(false);

    // Сохраняем количество тыков
    const newTapsCount = tapsToday + 1;
    setTapsToday(newTapsCount);
    setTapsLeft(Math.max(0, DAILY_LIMIT - newTapsCount));
    const today = new Date().toDateString();

    bridge.send('VKWebAppStorageSet', { key: 'tapsToday', value: String(newTapsCount) });
    bridge.send('VKWebAppStorageSet', { key: 'lastTapDate', value: today });

    // Анимация и переход
    setTimeout(() => {
      setIsAnimating(false);
      setScreen(SCREENS.CARD);
      // Показываем диагноз с задержкой
      setTimeout(() => {
        setShowDiagnosis(true);
        try {
          bridge.send('VKWebAppTapticNotificationOccurred', { type: 'success' });
        } catch (e) {}
      }, 800);
    }, 700);
  };

  // Шеринг
  const handleShare = async () => {
    if (!currentCard) return;

    try {
      bridge.send('VKWebAppTapticSelectionChanged');
      await bridge.send('VKWebAppShare', { link: 'https://vk.com/app54437141' });
    } catch (e) {}
  };

  // Ещё раз
  const handleAgain = () => {
    setCurrentCard(null);
    setShowDiagnosis(false);
    setScreen(SCREENS.TAP);
    try {
      bridge.send('VKWebAppTapticSelectionChanged');
    } catch (e) {}
  };

  // Сменить режим
  const handleChangeMode = () => {
    setCurrentCard(null);
    setShowDiagnosis(false);
    setMode(null);
    setScreen(SCREENS.CHOICE);
  };

  // Рендер экрана выбора
  const renderChoice = () => (
    <div className="screen choice-screen">
      <div className="logo">
        <span className="shrimp-icon">🦐</span>
        <h1>Креветка судьбы</h1>
        <p className="tagline">Скрюченная правда о тебе</p>
      </div>

      <div className="choice-buttons">
        <button
          className="choice-btn angry-btn"
          onClick={() => handleModeSelect('angry')}
        >
          <span className="btn-icon">🦐🔥</span>
          <span className="btn-title">Злая креветка</span>
          <span className="btn-desc">Готов к правде?</span>
        </button>

        <button
          className="choice-btn soft-btn"
          onClick={() => handleModeSelect('soft')}
        >
          <span className="btn-icon">🦐</span>
          <span className="btn-title">Мягкая</span>
          <span className="btn-desc">Для нежных</span>
        </button>
      </div>
    </div>
  );

  // Рендер экрана тыка
  const renderTap = () => (
    <div className="screen tap-screen">
      <div className="tap-header">
        <button className="back-btn" onClick={handleChangeMode}>
          ← {mode === 'angry' ? 'Злая' : 'Мягкая'}
        </button>
        <span className="taps-counter">{isAdmin ? `∞` : `${tapsLeft}/${DAILY_LIMIT}`}</span>
      </div>

      <div className="tap-area" onClick={handleTap}>
        <div className={`shrimp ${isAnimating ? 'animating' : ''} ${mode}`}>
          <span className="shrimp-emoji">🦐</span>
          {mode === 'angry' && <span className="fire-emoji">🔥</span>}
        </div>
        <p className="tap-hint">{isAnimating ? 'Скручиваюсь...' : 'Ткни меня'}</p>
      </div>
    </div>
  );

  // Рендер экрана лимита
  const renderLimit = () => (
    <div className="screen limit-screen">
      <div className="limit-content">
        <span className="limit-icon">🦐💤</span>
        <h2>Креветка устала</h2>
        <p>Ты уже получил {DAILY_LIMIT} правды на сегодня.</p>
        <p className="limit-subtext">Приходи завтра за новой порцией откровений.</p>
      </div>
      <div className="limit-actions">
        <button className="action-btn share-btn" onClick={handleShare}>
          Поделиться
        </button>
        <button className="action-btn again-btn" onClick={handleChangeMode}>
          На главную
        </button>
      </div>
    </div>
  );

  // Рендер карточки
  const renderCard = () => {
    if (!currentCard) return null;

    const cardData = currentCard[mode];

    return (
      <div className="screen card-screen">
        <div className="card">
          <div className="card-hit">
            <p>{cardData.hit}</p>
          </div>

          <div className="card-divider"></div>

          <div className="card-support">
            <p>{cardData.support}</p>
          </div>

          <div className={`card-diagnosis ${showDiagnosis ? 'visible' : ''}`}>
            <span className="diagnosis-label">Диагноз:</span>
            <span className="diagnosis-text">{cardData.diagnosis}</span>
          </div>
        </div>

        <div className="card-actions">
          <button className="action-btn share-btn" onClick={handleShare}>
            Поделиться
          </button>
          <button className="action-btn again-btn" onClick={handleAgain}>
            Ещё раз
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`app ${mode || ''}`}>
      <Particles />
      <Bubbles bubbles={bubbles} />
      {screen === SCREENS.CHOICE && renderChoice()}
      {screen === SCREENS.TAP && renderTap()}
      {screen === SCREENS.CARD && renderCard()}
      {screen === SCREENS.LIMIT && renderLimit()}
    </div>
  );
}

export default App;
