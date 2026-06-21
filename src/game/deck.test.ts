import { describe, expect, it } from 'vitest';
import { createDeck } from './deck';
import type { CardType } from './types';

function countCards(deck: CardType[], cardType: CardType): number {
  return deck.filter((card) => card === cardType).length;
}

describe('deck', () => {
  it('牌庫中的真理之眼數量為 5 張', () => {
    const deck = createDeck();

    expect(countCards(deck, 'peek')).toBe(5);
  });
});
