import { MVP_CARD_COUNTS, MVP_CARD_TYPES } from './constants';
import type { CardType } from './types';

export function createDeck(): CardType[] {
  return MVP_CARD_TYPES.flatMap((cardType) => Array.from<CardType>({ length: MVP_CARD_COUNTS[cardType] }).fill(cardType));
}

export function shuffleDeck(deck: CardType[], rng: () => number = Math.random): CardType[] {
  const nextDeck = [...deck];
  for (let index = nextDeck.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(rng() * (index + 1));
    [nextDeck[index], nextDeck[targetIndex]] = [nextDeck[targetIndex], nextDeck[index]];
  }
  return nextDeck;
}

export function drawCards(deck: CardType[], count: number): { drawn: CardType[]; deck: CardType[] } {
  return {
    drawn: deck.slice(0, count),
    deck: deck.slice(count)
  };
}

export function ensureDeck(deck: CardType[], discardPile: CardType[], rng: () => number = Math.random): {
  deck: CardType[];
  discardPile: CardType[];
} {
  if (deck.length > 0) {
    return { deck, discardPile };
  }
  return {
    deck: shuffleDeck(discardPile.length > 0 ? discardPile : createDeck(), rng),
    discardPile: []
  };
}
