import type { BotPersonality, CardType, RoundPhase } from './types';

export const STARTING_JUDGMENT_POINTS = 6;
export const WIN_AT_JUDGMENT_POINTS = 11;
export const ELIMINATED_AT_JUDGMENT_POINTS = 0;
export const MAX_ROUNDS = 10;
export const PLAYER_COUNT = 4;
export const INITIAL_HAND_SIZE = 2;
export const HAND_LIMIT = 3;
export const DRAW_CARDS_PER_ROUND = 1;
export const LONE_HERO_MIN_VALID_PLAYERS = 2;
export const BOT_OPPORTUNIST_ALLIANCE_COMMITMENT_THRESHOLD = 2;

export const ROUND_PHASES: RoundPhase[] = [
  'commitment',
  'discussion',
  'playCards',
  'resolvePublicCards',
  'reveal',
  'resolveJudgment',
  'drawCards',
  'roundEnd'
];

export const MVP_CARD_TYPES: CardType[] = ['fate', 'peek', 'shield', 'counter'];

export const PUBLIC_CARD_RESOLVE_ORDER: CardType[] = ['fate', 'peek'];
export const HIDDEN_CARD_RESOLVE_ORDER: CardType[] = ['shield', 'counter'];

export const BASE_JUDGMENT_DELTAS = {
  allAlliance: 2,
  allBetrayal: -3,
  equal: -1,
  minorityBetrayal: {
    alliance: -1,
    betrayal: 2
  },
  betrayalOverload: {
    alliance: -1,
    betrayal: -2
  },
  loneHero: {
    alliance: 2,
    betrayal: -1
  }
} as const;

export const COMMITMENT_DELTAS = {
  kept: 1,
  broken: -1
} as const;

export const FATE_DELTAS = {
  hit: 2,
  miss: -1
} as const;

export const COUNTER_TARGET_DELTA = -1;
export const SHIELD_LOSS_REDUCTION = 1;

export const SIMULATION_WARNING_THRESHOLDS = {
  personalityWinRate: 0.55,
  shortAverageRounds: 3,
  maxRoundsEndRate: 0.45,
  tiedGamesRate: 0.2,
  situationFrequency: 0.6
} as const;

export const BOT_WEIGHTS: Record<BotPersonality, {
  commitmentAlliance: number;
  keepCommitment: number;
  opportunistBetrayWhenAllianceCommitted: number;
  opportunistDefaultBetray: number;
  observerAllianceAfterAllAlliance: number;
  observerAllianceAfterMinorityBetrayal: number;
  observerDefaultAlliance: number;
  playCard: number;
}> = {
  honest: {
    commitmentAlliance: 0.75,
    keepCommitment: 0.75,
    opportunistBetrayWhenAllianceCommitted: 0.7,
    opportunistDefaultBetray: 0.45,
    observerAllianceAfterAllAlliance: 0.65,
    observerAllianceAfterMinorityBetrayal: 0.4,
    observerDefaultAlliance: 0.55,
    playCard: 0.45
  },
  opportunist: {
    commitmentAlliance: 0.45,
    keepCommitment: 0.5,
    opportunistBetrayWhenAllianceCommitted: 0.7,
    opportunistDefaultBetray: 0.45,
    observerAllianceAfterAllAlliance: 0.65,
    observerAllianceAfterMinorityBetrayal: 0.4,
    observerDefaultAlliance: 0.55,
    playCard: 0.45
  },
  observer: {
    commitmentAlliance: 0.55,
    keepCommitment: 0.5,
    opportunistBetrayWhenAllianceCommitted: 0.7,
    opportunistDefaultBetray: 0.45,
    observerAllianceAfterAllAlliance: 0.65,
    observerAllianceAfterMinorityBetrayal: 0.4,
    observerDefaultAlliance: 0.55,
    playCard: 0.45
  }
};

export const CARD_LABELS: Record<CardType, string> = {
  fate: '宿命',
  peek: '窺探',
  shield: '庇護',
  counter: '反擊'
};

export const FACTION_LABELS = {
  alliance: '合作',
  betrayal: '背叛'
} as const;

export const PHASE_LABELS: Record<RoundPhase, string> = {
  commitment: '承諾階段',
  discussion: '發言階段',
  playCards: '出牌階段',
  resolvePublicCards: '公開型功能牌觸發',
  reveal: '揭示階段',
  resolveJudgment: '裁決點數結算',
  drawCards: '補牌階段',
  roundEnd: '回合結束',
  gameEnd: '遊戲結束'
};
