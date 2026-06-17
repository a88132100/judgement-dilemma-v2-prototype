import {
  BASE_JUDGMENT_DELTAS,
  COMMITMENT_DELTAS,
  COUNTER_TARGET_DELTA,
  ELIMINATED_AT_JUDGMENT_POINTS,
  FATE_DELTAS,
  HAND_LIMIT,
  INITIAL_HAND_SIZE,
  MAX_ROUNDS,
  PUBLIC_CARD_RESOLVE_ORDER,
  SHIELD_LOSS_REDUCTION,
  STARTING_JUDGMENT_POINTS,
  WIN_AT_JUDGMENT_POINTS
} from './constants';
import type { CardType, Faction } from './types';

export interface RulesConfig {
  startingJudgmentPoints: number;
  winAtJudgmentPoints: number;
  eliminatedAtJudgmentPoints: number;
  maxRounds: number;
  initialHandSize: number;
  handLimit: number;
  baseJudgmentDeltas: {
    allAlliance: number;
    allBetrayal: number;
    equal: number;
    minorityBetrayal: Record<Faction, number>;
    betrayalOverload: Record<Faction, number>;
    loneHero: Record<Faction, number>;
  };
  commitmentDeltas: {
    kept: number;
    broken: number;
  };
  fateDeltas: {
    hit: number;
    miss: number;
  };
  counterTargetDelta: number;
  shieldLossReduction: number;
  publicCardResolveOrder: CardType[];
}

export type RulesConfigOverride = Partial<{
  [Key in keyof RulesConfig]: RulesConfig[Key] extends object ? Partial<RulesConfig[Key]> : RulesConfig[Key];
}>;

export interface BalanceProfile {
  profileName: string;
  rulesConfig: RulesConfig;
}

export const BASELINE_RULES_CONFIG: RulesConfig = {
  startingJudgmentPoints: STARTING_JUDGMENT_POINTS,
  winAtJudgmentPoints: WIN_AT_JUDGMENT_POINTS,
  eliminatedAtJudgmentPoints: ELIMINATED_AT_JUDGMENT_POINTS,
  maxRounds: MAX_ROUNDS,
  initialHandSize: INITIAL_HAND_SIZE,
  handLimit: HAND_LIMIT,
  baseJudgmentDeltas: {
    allAlliance: BASE_JUDGMENT_DELTAS.allAlliance,
    allBetrayal: BASE_JUDGMENT_DELTAS.allBetrayal,
    equal: BASE_JUDGMENT_DELTAS.equal,
    minorityBetrayal: { ...BASE_JUDGMENT_DELTAS.minorityBetrayal },
    betrayalOverload: { ...BASE_JUDGMENT_DELTAS.betrayalOverload },
    loneHero: { ...BASE_JUDGMENT_DELTAS.loneHero }
  },
  commitmentDeltas: { ...COMMITMENT_DELTAS },
  fateDeltas: { ...FATE_DELTAS },
  counterTargetDelta: COUNTER_TARGET_DELTA,
  shieldLossReduction: SHIELD_LOSS_REDUCTION,
  publicCardResolveOrder: [...PUBLIC_CARD_RESOLVE_ORDER]
};

export function createRulesConfig(override: RulesConfigOverride = {}): RulesConfig {
  return {
    ...BASELINE_RULES_CONFIG,
    ...override,
    baseJudgmentDeltas: {
      ...BASELINE_RULES_CONFIG.baseJudgmentDeltas,
      ...(override.baseJudgmentDeltas ?? {}),
      minorityBetrayal: {
        ...BASELINE_RULES_CONFIG.baseJudgmentDeltas.minorityBetrayal,
        ...(override.baseJudgmentDeltas?.minorityBetrayal ?? {})
      },
      betrayalOverload: {
        ...BASELINE_RULES_CONFIG.baseJudgmentDeltas.betrayalOverload,
        ...(override.baseJudgmentDeltas?.betrayalOverload ?? {})
      },
      loneHero: {
        ...BASELINE_RULES_CONFIG.baseJudgmentDeltas.loneHero,
        ...(override.baseJudgmentDeltas?.loneHero ?? {})
      }
    },
    commitmentDeltas: {
      ...BASELINE_RULES_CONFIG.commitmentDeltas,
      ...(override.commitmentDeltas ?? {})
    },
    fateDeltas: {
      ...BASELINE_RULES_CONFIG.fateDeltas,
      ...(override.fateDeltas ?? {})
    },
    publicCardResolveOrder: [...((override.publicCardResolveOrder as CardType[] | undefined) ?? BASELINE_RULES_CONFIG.publicCardResolveOrder)]
  };
}

export const BALANCE_PROFILES: BalanceProfile[] = [
  {
    profileName: 'baseline',
    rulesConfig: createRulesConfig()
  },
  {
    profileName: 'legacyTarget12',
    rulesConfig: createRulesConfig({ winAtJudgmentPoints: 12 })
  },
  {
    profileName: 'maxRounds8',
    rulesConfig: createRulesConfig({ maxRounds: 8 })
  },
  {
    profileName: 'higherVolatility',
    rulesConfig: createRulesConfig({
      baseJudgmentDeltas: {
        allAlliance: 3,
        allBetrayal: -4,
        minorityBetrayal: { alliance: -1, betrayal: 3 },
        betrayalOverload: { alliance: -1, betrayal: -3 },
        loneHero: { alliance: 3, betrayal: -1 }
      }
    })
  },
  {
    profileName: 'harsherBrokenPromise',
    rulesConfig: createRulesConfig({ commitmentDeltas: { broken: -2 } })
  },
  {
    profileName: 'legacyTarget12_harsherBrokenPromise',
    rulesConfig: createRulesConfig({
      winAtJudgmentPoints: 12,
      commitmentDeltas: { broken: -2 }
    })
  }
];
