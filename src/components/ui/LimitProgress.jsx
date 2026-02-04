/**
 * Индикатор оставшихся тыков
 */
const LimitProgress = ({ current, max, isAdmin }) => {
  if (isAdmin) return <span className="taps-counter admin">&infin;</span>;

  const left = Math.max(0, max - current);

  return (
    <div className="limit-progress">
      <div className="limit-dots">
        {[...Array(max)].map((_, i) => (
          <span key={i} className={`limit-dot ${i < current ? 'used' : ''}`} />
        ))}
      </div>
      <span className="limit-text">{left > 0 ? `Осталось ${left}` : 'Лимит'}</span>
    </div>
  );
};

export default LimitProgress;
