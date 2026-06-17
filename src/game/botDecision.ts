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
  const type = player.hand[Math.floor(rng() * player.hand.length)];
  const targets = state.players.filter((candidate) => candidate.id !== player.id && !candidate.isEliminated);
  const target = targets[Math.floor(rng() * targets.length)];
  if (type === 'fate') {
    return {
      type,
      userPlayerId: player.id,
      isPublic: true,
      fatePrediction:
        rng() < 0.5
          ? { kind: 'majority', predictedMajority: rng() < 0.5 ? 'alliance' : 'betrayal' }
          : { kind: 'identity', targetPlayerId: target.id, predictedFaction: rng() < 0.5 ? 'alliance' : 'betrayal' }
    };
  }
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
