import { BOT_OPPORTUNIST_ALLIANCE_COMMITMENT_THRESHOLD, BOT_WEIGHTS } from './constants';
import { getBotProfile, type BotProfile } from './botProfiles';
import { canUseCardWithFaction, isPublicFunctionCard } from './cardRules';
import type { CardType, Faction, GameState, PlayedCard, PlayerState } from './types';

function weightedFaction(allianceWeight: number, rng: () => number): Faction {
  return rng() < allianceWeight ? 'alliance' : 'betrayal';
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => !player.isEliminated);
}

function allianceCommitmentRatio(state: GameState): number {
  const players = activePlayers(state);
  if (players.length === 0) {
    return 0;
  }
  return players.filter((player) => player.commitment === 'alliance').length / players.length;
}

function comebackPressure(state: GameState, player: PlayerState, profile?: BotProfile): number {
  if (!profile) {
    return 0;
  }
  const players = activePlayers(state);
  if (players.length <= 1) {
    return 0;
  }
  const averageJudgment = players.reduce((sum, candidate) => sum + candidate.judgmentPoints, 0) / players.length;
  return player.judgmentPoints < averageJudgment ? profile.comebackAggression : 0;
}

function pickTarget(state: GameState, player: PlayerState, rng: () => number, profile?: BotProfile): PlayerState | undefined {
  const targets = state.players.filter((candidate) => candidate.id !== player.id && !candidate.isEliminated);
  if (targets.length === 0) {
    return undefined;
  }
  if (profile && rng() < profile.suspicionLevel) {
    const allianceCommittedTargets = targets.filter((target) => target.commitment === 'alliance');
    if (allianceCommittedTargets.length > 0) {
      return allianceCommittedTargets[Math.floor(rng() * allianceCommittedTargets.length)];
    }
  }
  return targets[Math.floor(rng() * targets.length)];
}

function pickPlayableCard(playableCards: CardType[], rng: () => number, profile?: BotProfile): CardType {
  if (!profile) {
    return playableCards[Math.floor(rng() * playableCards.length)];
  }

  const preferenceByCard: Record<CardType, number> = {
    fate: profile.fatePreference,
    peek: profile.peekPreference,
    chaos: profile.chaosPreference,
    shield: profile.shieldPreference,
    counter: profile.counterPreference,
    mirror: profile.mirrorPreference,
    gamble: profile.gamblePreference,
    smallGain: 0.2 + profile.comebackAggression * 0.15,
    promiseTax: 0.14 + profile.suspicionLevel * 0.24,
    favor: 0.12 + profile.cooperationBias * 0.24,
    consensus: 0.14 + profile.cooperationBias * 0.2,
    slip: 0.08 + profile.riskTolerance * 0.18,
    evenOmen: 0.1 + profile.riskTolerance * 0.12
  };
  const totalWeight = playableCards.reduce((sum, card) => sum + preferenceByCard[card], 0);
  let roll = rng() * totalWeight;
  for (const card of playableCards) {
    roll -= preferenceByCard[card];
    if (roll <= 0) {
      return card;
    }
  }
  return playableCards[playableCards.length - 1];
}

export function decideBotCommitment(player: PlayerState, rng: () => number = Math.random): Faction {
  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  const profile = getBotProfile(player.botProfileId);
  if (!profile) {
    return weightedFaction(weights.commitmentAlliance, rng);
  }
  const allianceWeight = clamp01(
    weights.commitmentAlliance * 0.55 + profile.cooperationBias * 0.35 + (1 - profile.betrayalBias) * 0.1 - profile.suspicionLevel * 0.08
  );
  return weightedFaction(allianceWeight, rng);
}

export function decideBotFinalFaction(state: GameState, player: PlayerState, rng: () => number = Math.random): Faction {
  const commitment = player.commitment ?? 'alliance';
  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  const profile = getBotProfile(player.botProfileId);
  const pressure = comebackPressure(state, player, profile);
  if (player.botPersonality === 'honest') {
    if (profile) {
      const keepChance = clamp01(weights.keepCommitment * 0.5 + profile.promiseKeepBias * 0.5 - pressure * 0.18);
      if (rng() < keepChance) {
        return commitment;
      }
      const betrayalChance = clamp01(0.22 + profile.betrayalBias * 0.35 + pressure * 0.25 - profile.cooperationBias * 0.18);
      return rng() < betrayalChance ? 'betrayal' : 'alliance';
    }
    return rng() < weights.keepCommitment ? commitment : commitment === 'alliance' ? 'betrayal' : 'alliance';
  }
  if (player.botPersonality === 'opportunist') {
    const allianceCommitted = state.players.filter((candidate) => !candidate.isEliminated && candidate.commitment === 'alliance').length;
    if (profile) {
      const keepChance = clamp01(weights.keepCommitment * 0.35 + profile.promiseKeepBias * 0.45 - profile.riskTolerance * 0.12);
      if (rng() < keepChance) {
        return commitment;
      }
      const baseBetrayChance =
        allianceCommitted >= BOT_OPPORTUNIST_ALLIANCE_COMMITMENT_THRESHOLD
          ? weights.opportunistBetrayWhenAllianceCommitted
          : weights.opportunistDefaultBetray;
      const betrayalChance = clamp01(
        baseBetrayChance +
          profile.betrayalBias * 0.2 +
          profile.riskTolerance * 0.15 +
          pressure * 0.22 +
          allianceCommitmentRatio(state) * profile.suspicionLevel * 0.12 -
          profile.cooperationBias * 0.08
      );
      return rng() < betrayalChance ? 'betrayal' : 'alliance';
    }
    return rng() <
      (allianceCommitted >= BOT_OPPORTUNIST_ALLIANCE_COMMITMENT_THRESHOLD
        ? weights.opportunistBetrayWhenAllianceCommitted
        : weights.opportunistDefaultBetray)
      ? 'betrayal'
      : 'alliance';
  }
  const previous = state.previousRoundResult;
  if (profile) {
    let baseAllianceWeight = weights.observerDefaultAlliance;
    if (previous?.situation.resultType === 'allAlliance') {
      baseAllianceWeight = weights.observerAllianceAfterAllAlliance;
    } else if (previous?.situation.resultType === 'minorityBetrayal') {
      baseAllianceWeight = weights.observerAllianceAfterMinorityBetrayal;
    }
    const allianceWeight = clamp01(
      baseAllianceWeight * 0.55 +
        profile.cooperationBias * 0.25 +
        (1 - profile.betrayalBias) * 0.1 -
        profile.suspicionLevel * allianceCommitmentRatio(state) * 0.2 -
        pressure * 0.15
    );
    return weightedFaction(allianceWeight, rng);
  }
  if (previous?.situation.resultType === 'allAlliance') {
    return weightedFaction(weights.observerAllianceAfterAllAlliance, rng);
  }
  if (previous?.situation.resultType === 'minorityBetrayal') {
    return weightedFaction(weights.observerAllianceAfterMinorityBetrayal, rng);
  }
  return weightedFaction(weights.observerDefaultAlliance, rng);
}

export function decideBotCardPlay(
  state: GameState,
  player: PlayerState,
  rng: () => number = Math.random,
  chosenFaction?: Faction
): PlayedCard | undefined {
  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  const profile = getBotProfile(player.botProfileId);
  const cardUseChance = profile ? profile.cardUseRate : weights.playCard;
  if (player.hand.length === 0 || player.hasPlayedCardThisRound || rng() > cardUseChance) {
    return undefined;
  }
  const playableCards = player.hand.filter(
    (card) =>
      card !== 'fate' &&
      (!chosenFaction || canUseCardWithFaction(card, chosenFaction)) &&
      (card !== 'gamble' || !player.hasUsedGambleThisGame)
  );
  if (playableCards.length === 0) {
    return undefined;
  }
  const type = pickPlayableCard(playableCards, rng, profile);
  const target = pickTarget(state, player, rng, profile);
  if (type === 'peek') {
    if (!target) {
      return undefined;
    }
    return {
      type,
      userPlayerId: player.id,
      targetPlayerId: target.id,
      isPublic: isPublicFunctionCard(type)
    };
  }
  if (type === 'favor') {
    if (!target) {
      return undefined;
    }
    return {
      type,
      userPlayerId: player.id,
      targetPlayerId: target.id,
      isPublic: isPublicFunctionCard(type)
    };
  }
  return {
    type,
    userPlayerId: player.id,
    isPublic: isPublicFunctionCard(type)
  };
}

export function decideBotFateDeclaration(state: GameState, player: PlayerState, rng: () => number = Math.random): PlayedCard | undefined {
  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  const profile = getBotProfile(player.botProfileId);
  const fateUseChance = profile ? clamp01(profile.cardUseRate * 0.65 + profile.fatePreference * 0.35) : weights.playCard;
  if (!player.hand.includes('fate') || player.hasPlayedCardThisRound || rng() > fateUseChance) {
    return undefined;
  }

  const target = pickTarget(state, player, rng, profile);
  return {
    type: 'fate',
    userPlayerId: player.id,
    isPublic: true,
    fatePrediction:
      rng() < 0.5 || !target
        ? { kind: 'majority', predictedMajority: rng() < 0.5 ? 'alliance' : 'betrayal' }
        : { kind: 'identity', targetPlayerId: target.id, predictedFaction: rng() < 0.5 ? 'alliance' : 'betrayal' }
  };
}

export function decideBotPeekFactionSwitch(
  state: GameState,
  player: PlayerState,
  target: PlayerState,
  rng: () => number = Math.random
): boolean {
  if (!player.judgedFaction || !target.chosenFaction) {
    return false;
  }

  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  const profile = getBotProfile(player.botProfileId);
  const commitment = player.commitment ?? player.judgedFaction;

  // 守信型優先修正成承諾陣營，但不為了資訊任意翻面。
  if (player.botPersonality === 'honest') {
    const keepCorrectionChance = profile
      ? clamp01(weights.keepCommitment * 0.5 + profile.promiseKeepBias * 0.5 - profile.riskTolerance * 0.1)
      : weights.keepCommitment;
    return player.judgedFaction !== commitment && rng() < keepCorrectionChance;
  }

  // 投機型看到多人承諾合作時，較常把自己切到背叛。
  if (player.botPersonality === 'opportunist') {
    const allianceCommitted = state.players.filter((candidate) => !candidate.isEliminated && candidate.commitment === 'alliance').length;
    const desiredFaction =
      allianceCommitted >= BOT_OPPORTUNIST_ALLIANCE_COMMITMENT_THRESHOLD || target.chosenFaction === 'alliance' ? 'betrayal' : 'alliance';
    const switchChance = profile ? clamp01(0.45 + profile.riskTolerance * 0.2 + profile.suspicionLevel * 0.15) : 0.65;
    return player.judgedFaction !== desiredFaction && rng() < switchChance;
  }

  // 觀望型用目標資訊做反向壓力測試，避免策略過度固定。
  const desiredFaction = target.chosenFaction === 'alliance' ? 'betrayal' : 'alliance';
  const switchChance = profile ? clamp01(0.35 + profile.suspicionLevel * 0.25 + profile.riskTolerance * 0.1) : 0.5;
  return player.judgedFaction !== desiredFaction && rng() < switchChance;
}
