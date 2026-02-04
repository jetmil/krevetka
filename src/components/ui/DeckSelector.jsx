/**
 * Селектор тематической колоды
 */
import { DECK_LIST } from '../../data/decks';

const DeckSelector = ({ selectedDeck, onSelect }) => {
  return (
    <div className="deck-selector">
      <span className="deck-label">Колода:</span>
      <div className="deck-options">
        {DECK_LIST.map(deck => (
          <button
            key={deck.id}
            className={`deck-option ${selectedDeck === deck.id ? 'active' : ''}`}
            onClick={() => onSelect(deck.id)}
            style={{ '--deck-color': deck.color }}
            title={deck.description}
          >
            <span className="deck-emoji">{deck.emoji}</span>
            <span className="deck-name">{deck.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DeckSelector;
