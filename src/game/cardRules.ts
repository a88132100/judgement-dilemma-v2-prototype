import type { CardType, Faction } from './types';

// 功能牌與本回合原始陣營的搭配限制，UI 與核心驗證共用同一份規則。
export function canUseCardWithFaction(cardType: CardType, chosenFaction: Faction): boolean {
  if (cardType === 'shield' || cardType === 'counter') {
    return chosenFaction === 'alliance';
  }
  return true;
}
