/**
 * Бейдж с уровнем и прогрессом XP
 */
const LevelBadge = ({ level, progress, onClick }) => {
  return (
    <button
      className="level-badge"
      onClick={onClick}
      aria-label={`Уровень ${level.level}: ${level.title}`}
    >
      <span className="level-emoji" aria-hidden="true">{level.emoji}</span>
      <div className="level-info">
        <span className="level-number">Ур. {level.level}</span>
        <div className="level-progress-mini">
          <div
            className="level-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </button>
  );
};

export default LevelBadge;
