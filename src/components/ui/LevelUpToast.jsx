/**
 * Тост при повышении уровня
 */
const LevelUpToast = ({ level, onClose }) => {
  if (!level) return null;

  return (
    <div className="level-up-toast" onClick={onClose}>
      <div className="level-up-content">
        <span className="level-up-emoji">{level.emoji}</span>
        <div className="level-up-text">
          <span className="level-up-label">Новый уровень!</span>
          <span className="level-up-title">{level.title}</span>
        </div>
      </div>
      <div className="level-up-shine" />
    </div>
  );
};

export default LevelUpToast;
