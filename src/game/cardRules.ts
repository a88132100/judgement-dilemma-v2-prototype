import type { CardType, Faction } from './types';

export function isPublicFunctionCard(cardType: CardType): boolean {
  return (
    cardType === 'fate' ||
    cardType === 'peek' ||
    cardType === 'chaos' ||
    cardType === 'smallGain' ||
    cardType === 'promiseTax' ||
    cardType === 'consensus' ||
    cardType === 'slip'
  );
}

export function isHiddenFunctionCard(cardType: CardType): boolean {
  return (
    cardType === 'shield' ||
    cardType === 'counter' ||
    cardType === 'mirror' ||
    cardType === 'gamble' ||
    cardType === 'favor' ||
    cardType === 'evenOmen'
  );
}

// 功能牌的陣營限制集中在這裡，避免 UI 與結算邏輯各自判斷。
export function canUseCardWithFaction(cardType: CardType, chosenFaction: Faction): boolean {
  if (cardType === 'shield' || cardType === 'counter' || cardType === 'mirror') {
    return chosenFaction === 'alliance';
  }
  if (cardType === 'gamble') {
    return chosenFaction === 'betrayal';
  }
  return true;
}

export function cardRequirementText(cardType: CardType): string | undefined {
  if (cardType === 'shield' || cardType === 'counter' || cardType === 'mirror') {
    return '只能搭配盟約';
  }
  if (cardType === 'gamble') {
    return '只能搭配叛離';
  }
  if (cardType === 'fate') {
    return '只能在宿命宣告階段使用';
  }
  return undefined;
}
