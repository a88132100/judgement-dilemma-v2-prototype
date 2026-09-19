import type { BotPersonality, BotProfileId } from './types';

export interface BotProfile {
  profileId: BotProfileId;
  basePersonality: BotPersonality;
  cooperationBias: number;
  betrayalBias: number;
  promiseKeepBias: number;
  riskTolerance: number;
  comebackAggression: number;
  cardUseRate: number;
  peekPreference: number;
  fatePreference: number;
  chaosPreference: number;
  shieldPreference: number;
  counterPreference: number;
  mirrorPreference: number;
  gamblePreference: number;
  suspicionLevel: number;
}

export const BOT_PROFILES: Record<BotProfileId, BotProfile> = {
  oathkeeper_balanced: {
    profileId: 'oathkeeper_balanced',
    basePersonality: 'honest',
    cooperationBias: 0.74,
    betrayalBias: 0.18,
    promiseKeepBias: 0.78,
    riskTolerance: 0.28,
    comebackAggression: 0.22,
    cardUseRate: 0.42,
    peekPreference: 0.26,
    fatePreference: 0.2,
    chaosPreference: 0.12,
    shieldPreference: 0.34,
    counterPreference: 0.28,
    mirrorPreference: 0.28,
    gamblePreference: 0.08,
    suspicionLevel: 0.22
  },
  oathkeeper_cautious: {
    profileId: 'oathkeeper_cautious',
    basePersonality: 'honest',
    cooperationBias: 0.86,
    betrayalBias: 0.1,
    promiseKeepBias: 0.9,
    riskTolerance: 0.18,
    comebackAggression: 0.3,
    cardUseRate: 0.5,
    peekPreference: 0.24,
    fatePreference: 0.16,
    chaosPreference: 0.1,
    shieldPreference: 0.48,
    counterPreference: 0.38,
    mirrorPreference: 0.34,
    gamblePreference: 0.06,
    suspicionLevel: 0.28
  },
  opportunist_calculated: {
    profileId: 'opportunist_calculated',
    basePersonality: 'opportunist',
    cooperationBias: 0.38,
    betrayalBias: 0.64,
    promiseKeepBias: 0.46,
    riskTolerance: 0.62,
    comebackAggression: 0.46,
    cardUseRate: 0.48,
    peekPreference: 0.36,
    fatePreference: 0.26,
    chaosPreference: 0.36,
    shieldPreference: 0.18,
    counterPreference: 0.2,
    mirrorPreference: 0.18,
    gamblePreference: 0.44,
    suspicionLevel: 0.48
  },
  opportunist_risky: {
    profileId: 'opportunist_risky',
    basePersonality: 'opportunist',
    cooperationBias: 0.24,
    betrayalBias: 0.82,
    promiseKeepBias: 0.28,
    riskTolerance: 0.86,
    comebackAggression: 0.82,
    cardUseRate: 0.64,
    peekPreference: 0.5,
    fatePreference: 0.52,
    chaosPreference: 0.5,
    shieldPreference: 0.12,
    counterPreference: 0.22,
    mirrorPreference: 0.16,
    gamblePreference: 0.72,
    suspicionLevel: 0.6
  },
  observer_balanced: {
    profileId: 'observer_balanced',
    basePersonality: 'observer',
    cooperationBias: 0.52,
    betrayalBias: 0.42,
    promiseKeepBias: 0.52,
    riskTolerance: 0.48,
    comebackAggression: 0.42,
    cardUseRate: 0.44,
    peekPreference: 0.42,
    fatePreference: 0.24,
    chaosPreference: 0.28,
    shieldPreference: 0.26,
    counterPreference: 0.24,
    mirrorPreference: 0.24,
    gamblePreference: 0.22,
    suspicionLevel: 0.46
  },
  observer_suspicious: {
    profileId: 'observer_suspicious',
    basePersonality: 'observer',
    cooperationBias: 0.42,
    betrayalBias: 0.52,
    promiseKeepBias: 0.44,
    riskTolerance: 0.56,
    comebackAggression: 0.5,
    cardUseRate: 0.56,
    peekPreference: 0.62,
    fatePreference: 0.28,
    chaosPreference: 0.42,
    shieldPreference: 0.3,
    counterPreference: 0.3,
    mirrorPreference: 0.32,
    gamblePreference: 0.3,
    suspicionLevel: 0.78
  }
};

export function getBotProfile(profileId?: BotProfileId): BotProfile | undefined {
  return profileId ? BOT_PROFILES[profileId] : undefined;
}
