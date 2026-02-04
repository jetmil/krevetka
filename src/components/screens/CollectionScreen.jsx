import bridge from '@vkontakte/vk-bridge';
import { APP_URL } from '../../constants';

/**
 * Экран коллекции диагнозов
 */
const CollectionScreen = ({ stats, recent, streak, streakBonus, onClose, level, levelProgress, xp }) => {
  // Вызвать друга на сравнение
  const handleChallengeFriend = async () => {
    const topDiagnosis = recent[0]?.diagnosis || 'Узнай свою креветочную правду!';
    const shareText = `Моя креветка сказала: "${topDiagnosis}". А что скажет твоя? 🦐`;

    try {
      await bridge.send('VKWebAppShare', {
        link: APP_URL,
        comment: shareText
      });
    } catch {
      // Fallback — просто поделиться ссылкой
      try {
        await bridge.send('VKWebAppShare', { link: APP_URL });
      } catch (err) {
        console.warn('Share failed:', err);
      }
    }
  };

  return (
    <div className="screen collection-screen">
      <div className="collection-header">
        <button className="back-btn" onClick={onClose}>← Назад</button>
        <h2>Мои диагнозы</h2>
      </div>

      <div className="collection-stats">
        {/* Уровень */}
        {level && (
          <div className="stat-card level-card">
            <span className="stat-emoji">{level.emoji}</span>
            <span className="stat-value">Ур. {level.level}</span>
            <span className="stat-label">{level.title}</span>
            <div className="level-progress-bar">
              <div
                className="level-progress-fill"
                style={{ width: `${levelProgress || 0}%` }}
              />
            </div>
            <span className="stat-sublabel">{xp || 0} XP</span>
          </div>
        )}

        {/* Streak */}
        {streak > 0 && (
          <div className="stat-card streak-card" style={{ '--accent': streakBonus?.color }}>
            <span className="stat-emoji">{streakBonus?.emoji}</span>
            <span className="stat-value">{streak}</span>
            <span className="stat-label">{streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд</span>
          </div>
        )}

        {/* Собрано */}
        <div className="stat-card">
          <span className="stat-emoji">🎯</span>
          <span className="stat-value">{stats.unique}</span>
          <span className="stat-label">собрано</span>
        </div>

        {/* Прогресс */}
        <div className="stat-card">
          <span className="stat-emoji">📊</span>
          <span className="stat-value">{stats.percent}%</span>
          <span className="stat-label">карт открыто</span>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div className="collection-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <span className="progress-text">
          {stats.unique} из 70 карт
        </span>
      </div>

      {/* Баланс режимов */}
      <div className="mode-balance">
        <div className="mode-stat angry">
          <span>🔥 Злая</span>
          <span>{stats.angry}</span>
        </div>
        <div className="mode-stat soft">
          <span>✨ Мягкая</span>
          <span>{stats.soft}</span>
        </div>
      </div>

      {/* Последние диагнозы */}
      {recent.length > 0 && (
        <div className="recent-diagnoses">
          <h3>Последние диагнозы</h3>
          <div className="diagnosis-list">
            {recent.map((item, idx) => (
              <div
                key={`${item.id}-${item.mode}-${idx}`}
                className={`diagnosis-item ${item.mode}`}
              >
                <span className="diagnosis-mode">
                  {item.mode === 'angry' ? '🔥' : '✨'}
                </span>
                <span className="diagnosis-text">{item.diagnosis}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && (
        <div className="empty-collection">
          <span className="empty-emoji">🦐</span>
          <p>Пока пусто!</p>
          <p className="empty-hint">Тыкай креветку, собирай диагнозы</p>
        </div>
      )}

      {/* Вызови друга */}
      <div className="challenge-section">
        <div className="challenge-card">
          <span className="challenge-emoji">🆚</span>
          <h3>Вызови друга!</h3>
          <p className="challenge-text">
            Кто получит более жёсткий диагноз?
          </p>
          <button className="challenge-btn" onClick={handleChallengeFriend}>
            <span>📤</span> Бросить вызов
          </button>
        </div>

        {stats.unique >= 10 && (
          <div className="achievement-hint">
            <span>🏆</span> Ты собрал {stats.unique} диагнозов — круче 90% игроков!
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionScreen;
