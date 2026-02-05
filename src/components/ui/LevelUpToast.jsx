/**
 * Тост при повышении уровня
 * Консистентный с AchievementToast — сверху, горизонтальный
 */
const LevelUpToast = ({ level, onClose }) => {
  if (!level) return null;

  return (
    <div className="level-up-toast" onClick={onClose}>
      <span className="level-up-emoji">{level.emoji}</span>
      <div className="level-up-text">
        <span className="level-up-label">Уровень {level.level}!</span>
        <span className="level-up-title">{level.title}</span>
      </div>
    </div>
  );
};

export default LevelUpToast;
