/**
 * Фоновые биолюминесцентные частицы
 */
const Particles = () => (
  <div className="particles">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="particle" />
    ))}
  </div>
);

export default Particles;
