import platform from '../../platform';

/**
 * Экран коллекции диагнозов — облегчённый
 */
const CollectionScreen = ({ stats, recent, streak, streakBonus, onClose, level, levelProgress, xp }) => {
  const handleChallengeFriend = async () => {
    const topDiagnosis = recent[0]?.diagnosis || 'Узнай свою креветочную правду!';
    const shareText = `Моя креветка сказала: "${topDiagnosis}". А что скажет твоя? \u{1F990}`;

    try {
      await platform.shareLink(shareText);
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  const daysWord = streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней';

  return (
    <div className="screen collection-screen">
      <div className="collection-header">
        <button className="back-btn" onClick={onClose}>&#x2190; Назад</button>
        <h2>Мои диагнозы</h2>
      </div>

      {/* Компактная шапка: уровень + стрик в одну строку */}
      <div className="collection-summary">
        {level && (
          <div className="summary-item level-summary">
            <span className="summary-emoji">{level.emoji}</span>
            <span className="summary-label">Ур. {level.level}</span>
            <div className="summary-progress">
              <div className="summary-progress-fill" style={{ width: `${levelProgress || 0}%` }} />
            </div>
          </div>
        )}
        {streak > 0 && (
          <div className="summary-item streak-summary" style={{ '--accent': streakBonus?.color }}>
            <span className="summary-emoji">{streakBonus?.emoji}</span>
            <span className="summary-label">{streak} {daysWord}</span>
          </div>
        )}
      </div>

      {/* Прогресс коллекции — один блок вместо трёх */}
      <div className="collection-progress-block">
        <div className="progress-header">
          <span className="progress-collected">{stats.unique} <small>из 70</small></span>
          <span className="progress-percent">{stats.percent}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${stats.percent}%` }} />
        </div>
        <div className="mode-balance">
          <span className="mode-tag angry">&#x1F525; {stats.angry}</span>
          <span className="mode-tag soft">&#x2728; {stats.soft}</span>
        </div>
      </div>

      {/* Последние диагнозы */}
      {recent.length > 0 ? (
        <div className="recent-diagnoses">
          <h3>Последние</h3>
          <div className="diagnosis-list">
            {recent.map((item, idx) => (
              <div
                key={`${item.id}-${item.mode}-${idx}`}
                className={`diagnosis-item ${item.mode}`}
              >
                <span className="diagnosis-mode">
                  {item.mode === 'angry' ? '\u{1F525}' : '\u{2728}'}
                </span>
                <span className="diagnosis-text">{item.diagnosis}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-collection">
          <span className="empty-emoji">&#x1F990;</span>
          <p>Пока пусто!</p>
          <p className="empty-hint">Тыкай креветку, собирай диагнозы</p>
        </div>
      )}

      {/* Компактная кнопка шеринга внизу */}
      <div className="collection-footer">
        <button className="share-compact-btn" onClick={handleChallengeFriend}>
          &#x1F4AC; Отправить другу
        </button>
        <a
          href="privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="privacy-footer-link"
        >
          Политика конфиденциальности
        </a>
      </div>
    </div>
  );
};

export default CollectionScreen;
