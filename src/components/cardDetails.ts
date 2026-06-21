import type { CardType, Faction } from '../game/types';

export type CardDetailTarget =
  | {
      kind: 'commitment';
      faction: Faction;
    }
  | {
      kind: 'faction';
      faction: Faction;
    }
  | {
      kind: 'function';
      cardType: CardType;
    };

export interface CardDetail {
  effect: string;
  name: string;
  notes: string;
  timing: string;
  typeLabel: string;
}

const factionDetails: Record<Faction, CardDetail> = {
  alliance: {
    name: '盟約牌',
    typeLabel: '盟約',
    timing: '出牌階段暗放，揭示階段公開。',
    effect: '本回合作為你的最終陣營選擇之一，會參與中央裁決。若與承諾一致，裁決結算時獲得守諾加成。',
    notes: '每回合必須在盟約與叛離之間選擇一張；確認出牌後本回合不可更改。'
  },
  betrayal: {
    name: '叛離牌',
    typeLabel: '叛離',
    timing: '出牌階段暗放，揭示階段公開。',
    effect: '本回合作為你的最終陣營選擇之一，會參與中央裁決。少數叛離可能得利，但過量叛離會承受懲罰。',
    notes: '每回合必須在盟約與叛離之間選擇一張；確認出牌後本回合不可更改。'
  }
};

const commitmentDetails: Record<Faction, CardDetail> = {
  alliance: {
    name: '盟約承諾',
    typeLabel: '承諾 token',
    timing: '承諾階段公開放置。',
    effect: '宣告你本回合傾向盟約。最終陣營若與承諾一致，裁決結算時 +1；若不一致，裁決結算時 -1。',
    notes: '承諾只影響守諾或失信修正，不會強制你的實際出牌。'
  },
  betrayal: {
    name: '叛離承諾',
    typeLabel: '承諾 token',
    timing: '承諾階段公開放置。',
    effect: '宣告你本回合傾向叛離。最終陣營若與承諾一致，裁決結算時 +1；若不一致，裁決結算時 -1。',
    notes: '承諾只影響守諾或失信修正，不會強制你的實際出牌。'
  }
};

const functionCardDetails: Record<CardType, CardDetail> = {
  fate: {
    name: '宿命',
    typeLabel: '功能牌 / 公開',
    timing: '發言結束後、出牌階段開始前宣告預言，最終判定後結算。',
    effect: '選擇預言多數陣營，或預言指定玩家的最終陣營。預言命中時 +2，落空時 -1。',
    notes: '宣告後本回合已使用功能牌；出牌階段不能再使用其他功能牌。'
  },
  peek: {
    name: '真理之眼',
    typeLabel: '功能牌 / 公開',
    timing: '所有玩家暗放陣營與功能牌後，揭示前的公開型功能牌觸發階段。',
    effect: '指定一名其他玩家，私下查看該玩家本回合暗放的陣營牌；看完後可選擇是否更換自己的陣營。',
    notes: '不能指定自己；若更換陣營，只公開顯示你已重新選擇陣營，不公開新陣營。'
  },
  shield: {
    name: '庇護',
    typeLabel: '功能牌 / 隱藏',
    timing: '裁決結算時，符合條件才會觸發。',
    effect: '若你最終為盟約，且本回合存在叛離者，當基礎結算為負時，減少 1 點基礎損失。',
    notes: '只能搭配盟約使用；每回合最多使用 1 張功能牌。'
  },
  counter: {
    name: '反擊',
    typeLabel: '功能牌 / 隱藏',
    timing: '裁決結算時，符合條件才會觸發。',
    effect: '若你最終為盟約，且本回合存在叛離者，對一名叛離者造成額外 -1 修正。',
    notes: '只能搭配盟約使用；測試版由系統從叛離者中選擇反擊目標。'
  }
};

export function getCardDetail(target: CardDetailTarget): CardDetail {
  if (target.kind === 'commitment') {
    return commitmentDetails[target.faction];
  }
  if (target.kind === 'faction') {
    return factionDetails[target.faction];
  }
  return functionCardDetails[target.cardType];
}
