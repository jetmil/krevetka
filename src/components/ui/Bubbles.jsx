/**
 * Пузыри при тыке
 */
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

export default Bubbles;
