/**
 * Модалка "Креветка соскучилась" для вернувшихся пользователей
 */
const WelcomeBackModal = ({ hoursAway, onClose }) => {
  const days = Math.floor(hoursAway / 24);

  const getMessage = () => {
    if (days >= 7) return 'Целую неделю без тебя! Креветка чуть не засохла...';
    if (days >= 3) return 'Три дня молчания! Креветка думала ты её бросил...';
    if (days >= 1) return 'Креветка соскучилась! Где ты пропадал?';
    return 'С возвращением!';
  };

  const getEmoji = () => {
    if (days >= 7) return '😭';
    if (days >= 3) return '🥺';
    return '🦐💕';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="welcome-back-modal" onClick={e => e.stopPropagation()}>
        <div className="welcome-back-emoji">{getEmoji()}</div>
        <h2>С возвращением!</h2>
        <p className="welcome-back-message">{getMessage()}</p>
        <p className="welcome-back-time">
          Тебя не было {days > 0 ? `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}` : `${hoursAway} часов`}
        </p>
        <button className="welcome-back-btn" onClick={onClose}>
          Тыкнуть креветку! 🦐
        </button>
      </div>
    </div>
  );
};

export default WelcomeBackModal;
