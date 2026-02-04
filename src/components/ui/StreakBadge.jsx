/**
 * Бейдж серии дней (streak)
 */
const StreakBadge = ({ streak, bonus, onClick }) => {
  if (!streak || streak < 1) return null;

  return (
    <div
      className="streak-badge"
      onClick={onClick}
      style={{ '--streak-color': bonus?.color || '#FFB347' }}
    >
      <span className="streak-emoji">{bonus?.emoji || '🔥'}</span>
      <span className="streak-count">{streak}</span>
      {streak >= 3 && <span className="streak-label">{bonus?.label}</span>}
    </div>
  );
};

export default StreakBadge;
