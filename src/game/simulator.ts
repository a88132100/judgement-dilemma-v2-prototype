import { MAX_ROUNDS, MVP_CARD_TYPES, SIMULATION_WARNING_THRESHOLDS } from './constants';
import * as createGameModule from './createGame';
import { decideBotCardPlay, decideBotCommitment, decideBotFinalFaction } from './botDecision';
import { BALANCE_PROFILES, BASELINE_RULES_CONFIG, type BalanceProfile, type RulesConfig } from './rulesConfig';
import * as stateMachine from './stateMachine';
import type { BotPersonality, CardType, GameState, HumanPlayInput, PlayerState, RoundResultType } from './types';

export type SimulationPersonality = BotPersonality | 'humanLike';
export type GameEndReason = NonNullable<GameState['gameOverReason']>;

export interface SimulationOptions {
  gameCount: number;
  maxRounds?: number;
  botComposition?: SimulationPersonality[];
  rulesConfig?: RulesConfig;
  rng?: () => number;
}

export interface BalanceLabProfileResult {
  profileName: string;
  totalGames: number;
  averageRounds: number;
  maxRoundsRate: number;
  judgmentWinRate: number;
  allButOneEliminatedRate: number;
  allEliminatedTieBreakRate: number;
  tiedGamesRate: number;
  gamesWithoutWinner: number;
  winnerCountByPersonalityDecidedGamesRatio: Record<SimulationPersonality, number>;
  averageFinalJudgmentByPersonality: Record<SimulationPersonality, number>;
  balanceWarnings: string[];
}

export interface SimulationResult {
  totalGames: number;
  completedGames: number;
  averageRounds: number;
  gameEndReasonCount: Record<GameEndReason, number>;
  gamesWithSingleWinner: number;
  tiedGames: number;
  gamesWithoutWinner: number;
  winnerCountByPersonality: Record<SimulationPersonality, number>;
  winnerCountByPersonalityAllGamesRatio: Record<SimulationPersonality, number>;
  winnerCountByPersonalityDecidedGamesRatio: Record<SimulationPersonality, number>;
  tiedWinnerCountByPersonality: Record<SimulationPersonality, number>;
  averageFinalJudgmentByPersonality: Record<SimulationPersonality, number>;
  averageDeltaByPersonality: Record<SimulationPersonality, number>;
  averageRoundsByEndReason: Record<GameEndReason, number>;
  roundSituationFrequency: Record<RoundResultType, number>;
  commitmentStats: {
    keptCommitmentCount: number;
    brokenCommitmentCount: number;
    keepRate: number;
  };
  cardUsageStats: Record<CardType, number>;
  balanceWarnings: string[];
}

export interface SimulationWinnerOutcome {
  winners: PlayerState[];
  isTie: boolean;
}

interface SimulationAccumulator {
  totalRounds: number;
  completedGames: number;
  gameEndReasonCount: Record<GameEndReason, number>;
  roundSumByEndReason: Record<GameEndReason, number>;
  gamesWithSingleWinner: number;
  tiedGames: number;
  gamesWithoutWinner: number;
  winnerCountByPersonality: Record<SimulationPersonality, number>;
  tiedWinnerCountByPersonality: Record<SimulationPersonality, number>;
  finalJudgmentSumByPersonality: Record<SimulationPersonality, number>;
  deltaSumByPersonality: Record<SimulationPersonality, number>;
  playerCountByPersonality: Record<SimulationPersonality, number>;
  roundSituationCount: Record<RoundResultType, number>;
  totalRoundSituations: number;
  keptCommitmentCount: number;
  brokenCommitmentCount: number;
  cardUsageStats: Record<CardType, number>;
}

function emptyPersonalityCounts(): Record<SimulationPersonality, number> {
  return {
    humanLike: 0,
    honest: 0,
    opportunist: 0,
    observer: 0
  };
}

function emptySituationCounts(): Record<RoundResultType, number> {
  return {
    loneHero: 0,
    allAlliance: 0,
    allBetrayal: 0,
    equal: 0,
    minorityBetrayal: 0,
    betrayalOverload: 0
  };
}

function emptyEndReasonCounts(): Record<GameEndReason, number> {
  return {
    judgmentWin: 0,
    maxRounds: 0,
    allButOneEliminated: 0,
    allEliminatedTieBreak: 0
  };
}

function emptyCardCounts(): Record<CardType, number> {
  return {
    fate: 0,
    peek: 0,
    shield: 0,
    counter: 0
  };
}

function getPersonality(player: PlayerState): SimulationPersonality {
  return player.isHuman ? 'humanLike' : (player.botPersonality ?? 'observer');
}

function applyBotComposition(state: GameState, botComposition: SimulationPersonality[] | undefined): GameState {
  if (!botComposition) {
    return state;
  }
  return {
    ...state,
    players: state.players.map((player, index) => {
      const personality = botComposition[index];
      if (!personality || player.isHuman || personality === 'humanLike') {
        return player;
      }
      return {
        ...player,
        botPersonality: personality
      };
    })
  };
}

function toHumanInput(playedCard: ReturnType<typeof decideBotCardPlay> | undefined, chosenFaction: HumanPlayInput['chosenFaction']): HumanPlayInput {
  if (!playedCard) {
    return { chosenFaction };
  }
  return {
    chosenFaction,
    card: {
      type: playedCard.type,
      targetPlayerId: playedCard.targetPlayerId,
      fatePrediction: playedCard.fatePrediction
    }
  };
}

function automateCurrentPhase(state: GameState, rng: () => number, rulesConfig: RulesConfig): GameState {
  if (state.phase === 'commitment') {
    const human = state.players.find((player) => player.isHuman);
    if (!human || human.isEliminated) {
      return stateMachine.advancePhase(state, rng, rulesConfig);
    }
    const commitment = decideBotCommitment(human, rng);
    return stateMachine.advancePhase(stateMachine.submitHumanCommitment(state, commitment, rng), rng, rulesConfig);
  }

  if (state.phase === 'playCards') {
    const human = state.players.find((player) => player.isHuman);
    if (!human || human.isEliminated) {
      return stateMachine.advancePhase(state, rng, rulesConfig);
    }
    const chosenFaction = decideBotFinalFaction(state, human, rng);
    const playedCard = decideBotCardPlay(state, human, rng);
    let nextState = stateMachine.completeHumanPlay(state, toHumanInput(playedCard, chosenFaction), rng);
    if (!nextState.players.find((player) => player.isHuman)?.judgedFaction) {
      nextState = stateMachine.completeHumanPlay(state, { chosenFaction }, rng);
    }
    return stateMachine.advancePhase(nextState, rng, rulesConfig);
  }

  return stateMachine.advancePhase(state, rng, rulesConfig);
}

export function runSingleSimulationGame(options: Omit<SimulationOptions, 'gameCount'> = {}): GameState {
  const rng = options.rng ?? Math.random;
  const rulesConfig = options.rulesConfig ?? BASELINE_RULES_CONFIG;
  const maxRounds = options.maxRounds ?? rulesConfig.maxRounds;
  let state = applyBotComposition(createGameModule.createGame(rng, { maxRounds, rulesConfig }), options.botComposition);
  const safetyLimit = (maxRounds + 1) * 12;
  let safetyCounter = 0;

  while (state.phase !== 'gameEnd' && safetyCounter < safetyLimit) {
    state = automateCurrentPhase(state, rng, rulesConfig);
    safetyCounter += 1;
  }

  return state.phase === 'gameEnd' ? state : { ...state, phase: 'gameEnd', gameOverReason: state.gameOverReason ?? 'maxRounds' };
}

export function determineSimulationWinners(state: GameState): SimulationWinnerOutcome {
  if (state.winnerPlayerIds && state.winnerPlayerIds.length > 0) {
    const winners = state.winnerPlayerIds
      .map((winnerPlayerId) => state.players.find((player) => player.id === winnerPlayerId))
      .filter((player): player is PlayerState => Boolean(player));
    return {
      winners,
      isTie: winners.length > 1
    };
  }

  const activePlayers = state.players.filter((player) => !player.isEliminated);

  if (state.gameOverReason === 'maxRounds') {
    const latestRoundPlayerIds = state.previousRoundResult?.situation.validPlayerIds ?? state.roundResults.at(-1)?.situation.validPlayerIds ?? [];
    const latestRoundPlayers = state.players.filter((player) => latestRoundPlayerIds.includes(player.id));
    const winnerPool = activePlayers.length > 0 ? activePlayers : latestRoundPlayers;
    if (winnerPool.length === 0) {
      return { winners: [], isTie: false };
    }
    const highestJudgment = Math.max(...winnerPool.map((player) => player.judgmentPoints));
    const winners = winnerPool.filter((player) => player.judgmentPoints === highestJudgment);
    return {
      winners,
      isTie: winners.length > 1
    };
  }

  if (state.winnerPlayerId) {
    const winner = state.players.find((player) => player.id === state.winnerPlayerId);
    return {
      winners: winner ? [winner] : [],
      isTie: false
    };
  }

  if (activePlayers.length === 0) {
    return { winners: [], isTie: false };
  }

  if (activePlayers.length === 1) {
    return {
      winners: [activePlayers[0]],
      isTie: false
    };
  }

  return { winners: [], isTie: false };
}

function createAccumulator(): SimulationAccumulator {
  return {
    totalRounds: 0,
    completedGames: 0,
    gameEndReasonCount: emptyEndReasonCounts(),
    roundSumByEndReason: emptyEndReasonCounts(),
    gamesWithSingleWinner: 0,
    tiedGames: 0,
    gamesWithoutWinner: 0,
    winnerCountByPersonality: emptyPersonalityCounts(),
    tiedWinnerCountByPersonality: emptyPersonalityCounts(),
    finalJudgmentSumByPersonality: emptyPersonalityCounts(),
    deltaSumByPersonality: emptyPersonalityCounts(),
    playerCountByPersonality: emptyPersonalityCounts(),
    roundSituationCount: emptySituationCounts(),
    totalRoundSituations: 0,
    keptCommitmentCount: 0,
    brokenCommitmentCount: 0,
    cardUsageStats: emptyCardCounts()
  };
}

function recordWinnerOutcome(accumulator: SimulationAccumulator, state: GameState): void {
  const outcome = determineSimulationWinners(state);
  if (outcome.winners.length === 0) {
    accumulator.gamesWithoutWinner += 1;
    return;
  }

  if (outcome.isTie) {
    accumulator.tiedGames += 1;
    for (const winner of outcome.winners) {
      accumulator.tiedWinnerCountByPersonality[getPersonality(winner)] += 1;
    }
    return;
  }

  accumulator.gamesWithSingleWinner += 1;
  accumulator.winnerCountByPersonality[getPersonality(outcome.winners[0])] += 1;
}

function recordGame(accumulator: SimulationAccumulator, state: GameState): void {
  accumulator.completedGames += state.gameOverReason ? 1 : 0;
  accumulator.totalRounds += state.round;
  if (state.gameOverReason) {
    accumulator.gameEndReasonCount[state.gameOverReason] += 1;
    accumulator.roundSumByEndReason[state.gameOverReason] += state.round;
  }

  recordWinnerOutcome(accumulator, state);

  for (const player of state.players) {
    const personality = getPersonality(player);
    accumulator.finalJudgmentSumByPersonality[personality] += player.judgmentPoints;
    accumulator.playerCountByPersonality[personality] += 1;
  }

  for (const roundResult of state.roundResults) {
    accumulator.roundSituationCount[roundResult.situation.resultType] += 1;
    accumulator.totalRoundSituations += 1;

    for (const playerId of roundResult.situation.validPlayerIds) {
      const player = state.players.find((candidate) => candidate.id === playerId);
      if (!player) {
        continue;
      }
      accumulator.deltaSumByPersonality[getPersonality(player)] += roundResult.finalDeltaByPlayerId[playerId] ?? 0;
      const commitmentDelta = roundResult.commitmentDeltaByPlayerId[playerId] ?? 0;
      if (commitmentDelta > 0) {
        accumulator.keptCommitmentCount += 1;
      } else if (commitmentDelta < 0) {
        accumulator.brokenCommitmentCount += 1;
      }
    }
  }

  for (const card of [...state.discardPile, ...state.players.flatMap((player) => (player.playedCard ? [player.playedCard.type] : []))]) {
    accumulator.cardUsageStats[card] += 1;
  }
}

function dividePersonalitySums(
  sums: Record<SimulationPersonality, number>,
  denominators: Record<SimulationPersonality, number>
): Record<SimulationPersonality, number> {
  return {
    humanLike: denominators.humanLike > 0 ? sums.humanLike / denominators.humanLike : 0,
    honest: denominators.honest > 0 ? sums.honest / denominators.honest : 0,
    opportunist: denominators.opportunist > 0 ? sums.opportunist / denominators.opportunist : 0,
    observer: denominators.observer > 0 ? sums.observer / denominators.observer : 0
  };
}

function dividePersonalityByTotalGames(counts: Record<SimulationPersonality, number>, totalGames: number): Record<SimulationPersonality, number> {
  return {
    humanLike: counts.humanLike / Math.max(1, totalGames),
    honest: counts.honest / Math.max(1, totalGames),
    opportunist: counts.opportunist / Math.max(1, totalGames),
    observer: counts.observer / Math.max(1, totalGames)
  };
}

function buildAverageRoundsByEndReason(accumulator: SimulationAccumulator): Record<GameEndReason, number> {
  return {
    judgmentWin: accumulator.roundSumByEndReason.judgmentWin / Math.max(1, accumulator.gameEndReasonCount.judgmentWin),
    maxRounds: accumulator.roundSumByEndReason.maxRounds / Math.max(1, accumulator.gameEndReasonCount.maxRounds),
    allButOneEliminated:
      accumulator.roundSumByEndReason.allButOneEliminated / Math.max(1, accumulator.gameEndReasonCount.allButOneEliminated),
    allEliminatedTieBreak:
      accumulator.roundSumByEndReason.allEliminatedTieBreak / Math.max(1, accumulator.gameEndReasonCount.allEliminatedTieBreak)
  };
}

export function buildWarnings(result: Omit<SimulationResult, 'balanceWarnings'>): string[] {
  const warnings: string[] = [];
  for (const [personality, winRate] of Object.entries(result.winnerCountByPersonalityDecidedGamesRatio) as Array<
    [SimulationPersonality, number]
  >) {
    if (winRate > SIMULATION_WARNING_THRESHOLDS.personalityWinRate) {
      warnings.push(
        `${personality} 在有明確勝者的局中勝率偏高：${(winRate * 100).toFixed(1)}%，超過 ${(SIMULATION_WARNING_THRESHOLDS.personalityWinRate * 100).toFixed(0)}%。`
      );
    }
  }

  const maxRoundRate = result.gameEndReasonCount.maxRounds / Math.max(1, result.totalGames);
  if (maxRoundRate > SIMULATION_WARNING_THRESHOLDS.maxRoundsEndRate) {
    warnings.push(`過多遊戲拖到回合上限，可能節奏偏拖：${(maxRoundRate * 100).toFixed(1)}%。`);
  }

  const tiedRate = result.tiedGames / Math.max(1, result.totalGames);
  if (tiedRate > SIMULATION_WARNING_THRESHOLDS.tiedGamesRate) {
    warnings.push(`回合上限時並列比例偏高，勝負辨識度不足：${(tiedRate * 100).toFixed(1)}%。`);
  }

  if (result.gamesWithoutWinner > 0) {
    warnings.push(`存在無法判定勝者的遊戲，請檢查狀態機：${result.gamesWithoutWinner} 局。`);
  }

  for (const [situation, frequency] of Object.entries(result.roundSituationFrequency) as Array<[RoundResultType, number]>) {
    if (frequency > SIMULATION_WARNING_THRESHOLDS.situationFrequency) {
      warnings.push(`${situation} 局勢過度集中，可能導致玩法單調：${(frequency * 100).toFixed(1)}%。`);
    }
  }
  return warnings;
}

export function summarizeSimulationGames(states: GameState[]): SimulationResult {
  const accumulator = createAccumulator();
  for (const state of states) {
    recordGame(accumulator, state);
  }

  const totalGames = states.length;
  const commitmentTotal = accumulator.keptCommitmentCount + accumulator.brokenCommitmentCount;
  const winnerCountByPersonalityAllGamesRatio = dividePersonalityByTotalGames(accumulator.winnerCountByPersonality, totalGames);
  const winnerCountByPersonalityDecidedGamesRatio = dividePersonalityByTotalGames(
    accumulator.winnerCountByPersonality,
    accumulator.gamesWithSingleWinner
  );

  const resultWithoutWarnings: Omit<SimulationResult, 'balanceWarnings'> = {
    totalGames,
    completedGames: accumulator.completedGames,
    averageRounds: accumulator.totalRounds / Math.max(1, totalGames),
    gameEndReasonCount: accumulator.gameEndReasonCount,
    gamesWithSingleWinner: accumulator.gamesWithSingleWinner,
    tiedGames: accumulator.tiedGames,
    gamesWithoutWinner: accumulator.gamesWithoutWinner,
    winnerCountByPersonality: accumulator.winnerCountByPersonality,
    winnerCountByPersonalityAllGamesRatio,
    winnerCountByPersonalityDecidedGamesRatio,
    tiedWinnerCountByPersonality: accumulator.tiedWinnerCountByPersonality,
    averageFinalJudgmentByPersonality: dividePersonalitySums(accumulator.finalJudgmentSumByPersonality, accumulator.playerCountByPersonality),
    averageDeltaByPersonality: dividePersonalitySums(accumulator.deltaSumByPersonality, accumulator.playerCountByPersonality),
    averageRoundsByEndReason: buildAverageRoundsByEndReason(accumulator),
    roundSituationFrequency: {
      loneHero: accumulator.roundSituationCount.loneHero / Math.max(1, accumulator.totalRoundSituations),
      allAlliance: accumulator.roundSituationCount.allAlliance / Math.max(1, accumulator.totalRoundSituations),
      allBetrayal: accumulator.roundSituationCount.allBetrayal / Math.max(1, accumulator.totalRoundSituations),
      equal: accumulator.roundSituationCount.equal / Math.max(1, accumulator.totalRoundSituations),
      minorityBetrayal: accumulator.roundSituationCount.minorityBetrayal / Math.max(1, accumulator.totalRoundSituations),
      betrayalOverload: accumulator.roundSituationCount.betrayalOverload / Math.max(1, accumulator.totalRoundSituations)
    },
    commitmentStats: {
      keptCommitmentCount: accumulator.keptCommitmentCount,
      brokenCommitmentCount: accumulator.brokenCommitmentCount,
      keepRate: accumulator.keptCommitmentCount / Math.max(1, commitmentTotal)
    },
    cardUsageStats: MVP_CARD_TYPES.reduce<Record<CardType, number>>((stats, card) => {
      stats[card] = accumulator.cardUsageStats[card];
      return stats;
    }, emptyCardCounts())
  };

  return {
    ...resultWithoutWarnings,
    balanceWarnings: buildWarnings(resultWithoutWarnings)
  };
}

export function runSimulation(options: SimulationOptions): SimulationResult {
  const rng = options.rng ?? Math.random;
  const states: GameState[] = [];

  for (let index = 0; index < options.gameCount; index += 1) {
    states.push(
      runSingleSimulationGame({
        maxRounds: options.maxRounds ?? options.rulesConfig?.maxRounds ?? MAX_ROUNDS,
        botComposition: options.botComposition,
        rulesConfig: options.rulesConfig,
        rng
      })
    );
  }

  return summarizeSimulationGames(states);
}

export function toBalanceLabProfileResult(profileName: string, result: SimulationResult): BalanceLabProfileResult {
  return {
    profileName,
    totalGames: result.totalGames,
    averageRounds: result.averageRounds,
    maxRoundsRate: result.gameEndReasonCount.maxRounds / Math.max(1, result.totalGames),
    judgmentWinRate: result.gameEndReasonCount.judgmentWin / Math.max(1, result.totalGames),
    allButOneEliminatedRate: result.gameEndReasonCount.allButOneEliminated / Math.max(1, result.totalGames),
    allEliminatedTieBreakRate: result.gameEndReasonCount.allEliminatedTieBreak / Math.max(1, result.totalGames),
    tiedGamesRate: result.tiedGames / Math.max(1, result.totalGames),
    gamesWithoutWinner: result.gamesWithoutWinner,
    winnerCountByPersonalityDecidedGamesRatio: result.winnerCountByPersonalityDecidedGamesRatio,
    averageFinalJudgmentByPersonality: result.averageFinalJudgmentByPersonality,
    balanceWarnings: result.balanceWarnings
  };
}

export function runBalanceLab(options: {
  gameCount: number;
  profiles?: BalanceProfile[];
  rng?: () => number;
}): BalanceLabProfileResult[] {
  const rng = options.rng ?? Math.random;
  const profiles = options.profiles ?? BALANCE_PROFILES;
  return profiles.map((profile) =>
    toBalanceLabProfileResult(
      profile.profileName,
      runSimulation({
        gameCount: options.gameCount,
        rulesConfig: profile.rulesConfig,
        rng
      })
    )
  );
}
