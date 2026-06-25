import { LONE_HERO_MIN_VALID_PLAYERS } from './constants';
import { describeRoundResult, describeSituation } from './log';
import { BASELINE_RULES_CONFIG, type RulesConfig } from './rulesConfig';
import type { GameState, PlayerState, RoundResult, RoundSituation } from './types';

export function getValidPlayers(players: PlayerState[]): PlayerState[] {
  return players.filter((player) => !player.isEliminated);
}

export function getRoundSituation(players: PlayerState[]): RoundSituation {
  const validPlayers = getValidPlayers(players);
  const alliancePlayerIds = validPlayers.filter((player) => player.judgedFaction === 'alliance').map((player) => player.id);
  const betrayalPlayerIds = validPlayers.filter((player) => player.judgedFaction === 'betrayal').map((player) => player.id);
  const judgedFactionByPlayerId = Object.fromEntries(
    validPlayers.map((player) => {
      if (!player.judgedFaction) {
        throw new Error(`玩家 ${player.id} 尚未選擇最終陣營。`);
      }
      return [player.id, player.judgedFaction];
    })
  );
  const allianceCount = alliancePlayerIds.length;
  const betrayalCount = betrayalPlayerIds.length;

  // 孤勇者需要優先於其他局勢判定，避免被背叛多數規則吃掉。
  if (
    validPlayers.length >= LONE_HERO_MIN_VALID_PLAYERS &&
    allianceCount === 1 &&
    betrayalCount >= 1 &&
    betrayalCount === validPlayers.length - 1
  ) {
    return {
      validPlayerIds: validPlayers.map((player) => player.id),
      allianceCount,
      betrayalCount,
      alliancePlayerIds,
      betrayalPlayerIds,
      judgedFactionByPlayerId,
      resultType: 'loneHero'
    };
  }

  if (allianceCount === validPlayers.length) {
    return {
      validPlayerIds: validPlayers.map((player) => player.id),
      allianceCount,
      betrayalCount,
      alliancePlayerIds,
      betrayalPlayerIds,
      judgedFactionByPlayerId,
      resultType: 'allAlliance'
    };
  }

  if (betrayalCount === validPlayers.length) {
    return {
      validPlayerIds: validPlayers.map((player) => player.id),
      allianceCount,
      betrayalCount,
      alliancePlayerIds,
      betrayalPlayerIds,
      judgedFactionByPlayerId,
      resultType: 'allBetrayal'
    };
  }

  if (allianceCount === betrayalCount) {
    return {
      validPlayerIds: validPlayers.map((player) => player.id),
      allianceCount,
      betrayalCount,
      alliancePlayerIds,
      betrayalPlayerIds,
      judgedFactionByPlayerId,
      resultType: 'equal'
    };
  }

  return {
    validPlayerIds: validPlayers.map((player) => player.id),
    allianceCount,
    betrayalCount,
    alliancePlayerIds,
    betrayalPlayerIds,
    judgedFactionByPlayerId,
    resultType: betrayalCount < allianceCount ? 'minorityBetrayal' : 'betrayalOverload'
  };
}

export function resolveBaseJudgment(
  players: PlayerState[],
  situation: RoundSituation,
  rulesConfig: RulesConfig = BASELINE_RULES_CONFIG
): Record<string, number> {
  const deltaByPlayerId: Record<string, number> = {};
  for (const player of getValidPlayers(players)) {
    const faction = situation.judgedFactionByPlayerId[player.id];
    if (situation.resultType === 'loneHero') {
      deltaByPlayerId[player.id] = rulesConfig.baseJudgmentDeltas.loneHero[faction];
    } else if (situation.resultType === 'allAlliance') {
      deltaByPlayerId[player.id] = rulesConfig.baseJudgmentDeltas.allAlliance;
    } else if (situation.resultType === 'allBetrayal') {
      deltaByPlayerId[player.id] = rulesConfig.baseJudgmentDeltas.allBetrayal;
    } else if (situation.resultType === 'equal') {
      deltaByPlayerId[player.id] = rulesConfig.baseJudgmentDeltas.equal;
    } else if (situation.resultType === 'minorityBetrayal') {
      deltaByPlayerId[player.id] = rulesConfig.baseJudgmentDeltas.minorityBetrayal[faction];
    } else {
      deltaByPlayerId[player.id] = rulesConfig.baseJudgmentDeltas.betrayalOverload[faction];
    }
  }
  return deltaByPlayerId;
}

export function resolveCommitmentDelta(
  players: PlayerState[],
  situation: RoundSituation,
  rulesConfig: RulesConfig = BASELINE_RULES_CONFIG
): Record<string, number> {
  const deltaByPlayerId: Record<string, number> = {};
  for (const player of getValidPlayers(players)) {
    const judgedFaction = situation.judgedFactionByPlayerId[player.id];
    deltaByPlayerId[player.id] = player.commitment === judgedFaction ? rulesConfig.commitmentDeltas.kept : rulesConfig.commitmentDeltas.broken;
  }
  return deltaByPlayerId;
}

export function buildFinalRoundResult(args: {
  state: GameState;
  situation: RoundSituation;
  baseDeltaByPlayerId: Record<string, number>;
  adjustedBaseDeltaByPlayerId: Record<string, number>;
  shieldDeltaByPlayerId: Record<string, number>;
  counterDeltaByPlayerId: Record<string, number>;
  fateDeltaByPlayerId: Record<string, number>;
  commitmentDeltaByPlayerId: Record<string, number>;
}): RoundResult {
  const finalDeltaByPlayerId: Record<string, number> = {};
  for (const playerId of args.situation.validPlayerIds) {
    finalDeltaByPlayerId[playerId] =
      (args.adjustedBaseDeltaByPlayerId[playerId] ?? 0) +
      (args.counterDeltaByPlayerId[playerId] ?? 0) +
      (args.fateDeltaByPlayerId[playerId] ?? 0) +
      (args.commitmentDeltaByPlayerId[playerId] ?? 0);
  }

  return {
    round: args.state.round,
    situation: args.situation,
    baseDeltaByPlayerId: args.baseDeltaByPlayerId,
    adjustedBaseDeltaByPlayerId: args.adjustedBaseDeltaByPlayerId,
    shieldDeltaByPlayerId: args.shieldDeltaByPlayerId,
    counterDeltaByPlayerId: args.counterDeltaByPlayerId,
    fateDeltaByPlayerId: args.fateDeltaByPlayerId,
    commitmentDeltaByPlayerId: args.commitmentDeltaByPlayerId,
    finalDeltaByPlayerId,
    revealedFactionsByPlayerId: args.situation.judgedFactionByPlayerId,
    summary: describeSituation(args.situation)
  };
}

function pickHighestPlayers(players: PlayerState[]): PlayerState[] {
  if (players.length === 0) {
    return [];
  }
  const highestJudgment = Math.max(...players.map((player) => player.judgmentPoints));
  return players.filter((player) => player.judgmentPoints === highestJudgment);
}

function describeNewEliminations(previousPlayers: PlayerState[], players: PlayerState[], result: RoundResult): string[] {
  const previousById = new Map(previousPlayers.map((player) => [player.id, player]));
  return players
    .filter((player) => result.situation.validPlayerIds.includes(player.id))
    .filter((player) => player.isEliminated && !previousById.get(player.id)?.isEliminated)
    .map((player) => `${player.name} 裁決點數歸零，已出局。`);
}

export function applyRoundResult(state: GameState, result: RoundResult, rulesConfig: RulesConfig = BASELINE_RULES_CONFIG): GameState {
  const players = state.players.map((player) => {
    if (!result.situation.validPlayerIds.includes(player.id)) {
      return player;
    }
    const judgmentPoints = player.judgmentPoints + (result.finalDeltaByPlayerId[player.id] ?? 0);
    return {
      ...player,
      judgmentPoints,
      isEliminated: judgmentPoints <= rulesConfig.eliminatedAtJudgmentPoints
    };
  });
  const roundParticipants = players.filter((player) => result.situation.validPlayerIds.includes(player.id));
  const thresholdPlayers = roundParticipants.filter((player) => player.judgmentPoints >= rulesConfig.winAtJudgmentPoints);
  const activePlayers = players.filter((player) => !player.isEliminated);
  const allRoundParticipantsEliminated =
    roundParticipants.length > 0 && roundParticipants.every((player) => player.judgmentPoints <= rulesConfig.eliminatedAtJudgmentPoints);

  let gameOverReason: GameState['gameOverReason'];
  let winnerPlayerIds: string[] | undefined;

  if (thresholdPlayers.length > 0) {
    gameOverReason = 'judgmentWin';
    winnerPlayerIds = pickHighestPlayers(thresholdPlayers).map((player) => player.id);
  } else if (allRoundParticipantsEliminated) {
    gameOverReason = 'allEliminatedTieBreak';
    winnerPlayerIds = pickHighestPlayers(roundParticipants).map((player) => player.id);
  } else if (activePlayers.length === 1) {
    gameOverReason = 'allButOneEliminated';
    winnerPlayerIds = [activePlayers[0].id];
  } else if (state.round >= (state.maxRounds ?? rulesConfig.maxRounds)) {
    gameOverReason = 'maxRounds';
    const maxRoundPool = activePlayers.length > 0 ? activePlayers : roundParticipants;
    winnerPlayerIds = pickHighestPlayers(maxRoundPool).map((player) => player.id);
  }

  const isTie = Boolean(winnerPlayerIds && winnerPlayerIds.length > 1);
  const winnerPlayerId = winnerPlayerIds?.length === 1 ? winnerPlayerIds[0] : undefined;
  const eliminationLines = describeNewEliminations(state.players, players, result);

  return {
    ...state,
    players,
    roundResults: [...state.roundResults, result],
    previousRoundResult: result,
    winnerPlayerId,
    winnerPlayerIds,
    isTie,
    gameOverReason,
    eventLog: [...state.eventLog, ...describeRoundResult(result, players), ...eliminationLines]
  };
}
