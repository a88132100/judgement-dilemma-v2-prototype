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
    }
  | {
      kind: 'blankFunction';
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
  chaos: {
    name: '混沌',
    typeLabel: '功能牌 / 公開',
    timing: '公開型功能牌觸發階段，在真理之眼之後處理。',
    effect: '指定一名玩家，使其本回合最終判定陣營反轉；若該玩家使用暗放型功能牌，該功能牌失效。',
    notes: '若混沌讓玩家因被迫反轉而失信，該玩家本回合不獲得守諾獎勵，也不承擔失信懲罰。'
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
  },
  mirror: {
    name: '鏡像',
    typeLabel: '功能牌 / 隱藏',
    timing: '裁決結算時，少數叛離局勢才會觸發。',
    effect: '若你最終為盟約，隨機鎖定一名叛離者，與其交換本回合基礎結算。',
    notes: '只能搭配盟約使用；若多人鎖定同一叛離者，只有一人交換成功，其餘鏡像使用者免疫負基礎結算。'
  },
  gamble: {
    name: '賭命',
    typeLabel: '功能牌 / 隱藏',
    timing: '裁決結算時判定是否成為唯一叛離者。',
    effect: '若你是唯一最終叛離者，額外 +4；否則額外 -2 並隨機棄 1 張手牌，沒手牌可棄時跳過補牌。',
    notes: '只能搭配叛離使用；每位玩家每場遊戲最多使用 1 次，即使被混沌失效也視為已使用。'
  },
  smallGain: {
    name: '撿角',
    typeLabel: '權宜牌 / 公開',
    timing: '公開型功能牌觸發後，於裁決結算時套用。',
    effect: '使用者本回合裁決點數 +1。',
    notes: '目前作為權宜牌實驗池資料，不會混入預設 26 張主牌庫。'
  },
  promiseTax: {
    name: '信任萬萬稅',
    typeLabel: '權宜牌 / 公開',
    timing: '公開型功能牌觸發後，於裁決結算時尋找失信玩家。',
    effect: '指定或自動選擇 1 名本回合失信玩家，使其額外 -1。若無失信玩家則無效。',
    notes: '因混沌豁免而不算失信的玩家，不會成為可課稅目標。'
  },
  favor: {
    name: '人情籌碼',
    typeLabel: '權宜牌 / 隱藏',
    timing: '裁決結算時，依雙方最終判定陣營檢查。',
    effect: '指定 1 名其他玩家。若該玩家與使用者最終陣營相同，兩人各 +1。',
    notes: '目前 Bot 會自動選目標；真人目標 UI 尚未接入。'
  },
  consensus: {
    name: '共識',
    typeLabel: '權宜牌 / 公開',
    timing: '公開型功能牌觸發後，於裁決結算時套用。',
    effect: '若本回合最終盟約人數至少 3 人，使用者 +1；否則使用者 -1。',
    notes: '以最終判定陣營計算人數。'
  },
  slip: {
    name: '手滑',
    typeLabel: '權宜牌 / 公開',
    timing: '公開型功能牌觸發後，於裁決結算與下次補牌時套用。',
    effect: '使用者本回合 -1，並在下次補牌時額外補 1 張。',
    notes: '額外補牌仍受目前手牌上限 3 張限制。'
  },
  evenOmen: {
    name: '雙數玄學',
    typeLabel: '權宜牌 / 隱藏',
    timing: '裁決結算時，依最終叛離人數檢查。',
    effect: '若最終叛離人數為偶數，下次補牌額外補 1 張；若為奇數，隨機棄 1 張手牌，無手牌才 -1。',
    notes: '額外補牌仍受目前手牌上限 3 張限制。'
  }
};

const blankFunctionDetail: CardDetail = {
  name: '空白密令',
  typeLabel: '空白功能牌',
  timing: '出牌階段暗放，揭示階段公開。',
  effect: '無效果。本回合視為沒有使用功能牌。',
  notes: '揭示前與真正功能牌同樣以卡背顯示，用來避免提前暴露你沒有使用功能牌。'
};

export function getCardDetail(target: CardDetailTarget): CardDetail {
  if (target.kind === 'commitment') {
    return commitmentDetails[target.faction];
  }
  if (target.kind === 'faction') {
    return factionDetails[target.faction];
  }
  if (target.kind === 'blankFunction') {
    return blankFunctionDetail;
  }
  return functionCardDetails[target.cardType];
}
