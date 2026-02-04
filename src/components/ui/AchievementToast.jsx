/**
 * Тост-уведомление о разблокированной ачивке
 */
const AchievementToast = ({ achievement, onClose }) => {
  if (!achievement) return null;

  return (
    <div className="achievement-toast" onClick={onClose}>
      <div className="achievement-toast-content">
        <span className="achievement-toast-emoji">{achievement.emoji}</span>
        <div className="achievement-toast-text">
          <span className="achievement-toast-label">Достижение!</span>
          <span className="achievement-toast-title">{achievement.title}</span>
          <span className="achievement-toast-desc">{achievement.description}</span>
        </div>
      </div>
    </div>
  );
};

export default AchievementToast;
