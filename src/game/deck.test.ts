import { describe, expect, it } from 'vitest';
import { EXPEDIENCY_CARD_COUNTS, EXPEDIENCY_CARD_TYPES } from './constants';
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

  it('主牌庫暫定為 26 張，且包含完整主功能牌', () => {
    const deck = createDeck();

    expect(deck).toHaveLength(26);
    expect(countCards(deck, 'fate')).toBe(6);
    expect(countCards(deck, 'chaos')).toBe(1);
    expect(countCards(deck, 'gamble')).toBe(2);
    expect(countCards(deck, 'counter')).toBe(5);
    expect(countCards(deck, 'shield')).toBe(5);
    expect(countCards(deck, 'mirror')).toBe(2);
  });

  it('權宜牌先保留為獨立實驗池，不混入預設主牌庫', () => {
    const deck = createDeck();

    for (const cardType of EXPEDIENCY_CARD_TYPES) {
      expect(countCards(deck, cardType)).toBe(0);
    }
    expect(EXPEDIENCY_CARD_COUNTS.smallGain).toBe(12);
    expect(EXPEDIENCY_CARD_COUNTS.promiseTax).toBe(12);
    expect(EXPEDIENCY_CARD_COUNTS.favor).toBe(12);
    expect(EXPEDIENCY_CARD_COUNTS.consensus).toBe(12);
    expect(EXPEDIENCY_CARD_COUNTS.slip).toBe(6);
    expect(EXPEDIENCY_CARD_COUNTS.evenOmen).toBe(6);
  });
});
