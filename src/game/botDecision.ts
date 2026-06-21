import { BOT_OPPORTUNIST_ALLIANCE_COMMITMENT_THRESHOLD, BOT_WEIGHTS } from './constants';
import type { Faction, GameState, PlayedCard, PlayerState } from './types';

function weightedFaction(allianceWeight: number, rng: () => number): Faction {
  return rng() < allianceWeight ? 'alliance' : 'betrayal';
}

export function decideBotCommitment(player: PlayerState, rng: () => number = Math.random): Faction {
  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  return weightedFaction(weights.commitmentAlliance, rng);
}

export function decideBotFinalFaction(state: GameState, player: PlayerState, rng: () => number = Math.random): Faction {
  const commitment = player.commitment ?? 'alliance';
  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  if (player.botPersonality === 'honest') {
    return rng() < weights.keepCommitment ? commitment : commitment === 'alliance' ? 'betrayal' : 'alliance';
  }
  if (player.botPersonality === 'opportunist') {
    const allianceCommitted = state.players.filter((candidate) => !candidate.isEliminated && candidate.commitment === 'alliance').length;
    return rng() <
      (allianceCommitted >= BOT_OPPORTUNIST_ALLIANCE_COMMITMENT_THRESHOLD
        ? weights.opportunistBetrayWhenAllianceCommitted
        : weights.opportunistDefaultBetray)
      ? 'betrayal'
      : 'alliance';
  }
  const previous = state.previousRoundResult;
  if (previous?.situation.resultType === 'allAlliance') {
    return weightedFaction(weights.observerAllianceAfterAllAlliance, rng);
  }
  if (previous?.situation.resultType === 'minorityBetrayal') {
    return weightedFaction(weights.observerAllianceAfterMinorityBetrayal, rng);
  }
  return weightedFaction(weights.observerDefaultAlliance, rng);
}

export function decideBotCardPlay(state: GameState, player: PlayerState, rng: () => number = Math.random): PlayedCard | undefined {
  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  if (player.hand.length === 0 || player.hasPlayedCardThisRound || rng() > weights.playCard) {
    return undefined;
  }
  const playableCards = player.hand.filter((card) => card !== 'fate');
  if (playableCards.length === 0) {
    return undefined;
  }
  const type = playableCards[Math.floor(rng() * playableCards.length)];
  const targets = state.players.filter((candidate) => candidate.id !== player.id && !candidate.isEliminated);
  const target = targets[Math.floor(rng() * targets.length)];
  if (type === 'peek') {
    return {
      type,
      userPlayerId: player.id,
      targetPlayerId: target.id,
      isPublic: true
    };
  }
  return {
    type,
    userPlayerId: player.id,
    isPublic: false
  };
}

export function decideBotFateDeclaration(state: GameState, player: PlayerState, rng: () => number = Math.random): PlayedCard | undefined {
  const weights = BOT_WEIGHTS[player.botPersonality ?? 'observer'];
  if (!player.hand.includes('fate') || player.hasPlayedCardThisRound || rng() > weights.playCard) {
    return undefined;
  }

  const targets = state.players.filter((candidate) => candidate.id !== player.id && !candidate.isEliminated);
  const target = targets[Math.floor(rng() * targets.length)];
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
  const commitment = player.commitment ?? player.judgedFaction;

  // 守信型優先修正成承諾陣營，但不為了資訊任意翻面。
  if (player.botPersonality === 'honest') {
    return player.judgedFaction !== commitment && rng() < weights.keepCommitment;
  }

  // 投機型看到多人承諾合作時，較常把自己切到背叛。
  if (player.botPersonality === 'opportunist') {
    const allianceCommitted = state.players.filter((candidate) => !candidate.isEliminated && candidate.commitment === 'alliance').length;
    const desiredFaction =
      allianceCommitted >= BOT_OPPORTUNIST_ALLIANCE_COMMITMENT_THRESHOLD || target.chosenFaction === 'alliance' ? 'betrayal' : 'alliance';
    return player.judgedFaction !== desiredFaction && rng() < 0.65;
  }

  // 觀望型用目標資訊做反向壓力測試，避免策略過度固定。
  const desiredFaction = target.chosenFaction === 'alliance' ? 'betrayal' : 'alliance';
  return player.judgedFaction !== desiredFaction && rng() < 0.5;
}
