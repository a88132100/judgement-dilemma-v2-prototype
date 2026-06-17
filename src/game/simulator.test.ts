import { describe, expect, it, vi } from 'vitest';
import { buildWarnings, determineSimulationWinners, runBalanceLab, runSimulation, summarizeSimulationGames } from './simulator';
import { BALANCE_PROFILES, BASELINE_RULES_CONFIG, createRulesConfig } from './rulesConfig';
import * as stateMachine from './stateMachine';
import type { GameState, PlayerState, RoundResult } from './types';

function cycleRng(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

function player(args: {
  id: string;
  points: number;
  isHuman?: boolean;
  botPersonality?: PlayerState['botPersonality'];
  isEliminated?: boolean;
}): PlayerState {
  return {
    id: args.id,
    name: args.id,
    isHuman: Boolean(args.isHuman),
    botPersonality: args.botPersonality,
    judgmentPoints: args.points,
    isEliminated: Boolean(args.isEliminated),
    hand: [],
    hasPlayedCardThisRound: false
  };
}

function gameState(args: {
  players: PlayerState[];
  reason?: GameState['gameOverReason'];
  winnerPlayerId?: string;
  winnerPlayerIds?: string[];
  isTie?: boolean;
  round?: number;
  roundResults?: RoundResult[];
}): GameState {
  return {
    players: args.players,
    round: args.round ?? 10,
    phase: 'gameEnd',
    dealerPlayerId: args.players[0]?.id ?? 'p1',
    deck: [],
    discardPile: [],
    eventLog: [],
    roundResults: args.roundResults ?? [],
    gameOverReason: args.reason,
    winnerPlayerId: args.winnerPlayerId,
    winnerPlayerIds: args.winnerPlayerIds,
    isTie: args.isTie,
    previousRoundResult: args.roundResults?.at(-1)
  };
}

function roundResult(validPlayerIds: string[]): RoundResult {
  return {
    round: 10,
    situation: {
      validPlayerIds,
      allianceCount: 0,
      betrayalCount: validPlayerIds.length,
      alliancePlayerIds: [],
      betrayalPlayerIds: validPlayerIds,
      judgedFactionByPlayerId: Object.fromEntries(validPlayerIds.map((id) => [id, 'betrayal'])),
      resultType: 'allBetrayal'
    },
    baseDeltaByPlayerId: {},
    adjustedBaseDeltaByPlayerId: {},
    shieldDeltaByPlayerId: {},
    counterDeltaByPlayerId: {},
    fateDeltaByPlayerId: {},
    commitmentDeltaByPlayerId: {},
    finalDeltaByPlayerId: {},
    revealedFactionsByPlayerId: {},
    summary: ''
  };
}

describe('simulator', () => {
  it('可以模擬 100 局不報錯，且 totalGames 正確', () => {
    const result = runSimulation({ gameCount: 100, rng: cycleRng([0.1, 0.4, 0.8, 0.2, 0.6]) });

    expect(result.totalGames).toBe(100);
    expect(result.completedGames).toBe(100);
    expect(result.averageRounds).toBeGreaterThan(0);
  });

  it('gamesWithSingleWinner + tiedGames + gamesWithoutWinner 等於 totalGames', () => {
    const result = runSimulation({ gameCount: 100, rng: cycleRng([0.2, 0.7, 0.3, 0.9]) });

    expect(result.gamesWithSingleWinner + result.tiedGames + result.gamesWithoutWinner).toBe(result.totalGames);
  });

  it('gameEndReasonCount 加總等於 totalGames', () => {
    const result = runSimulation({ gameCount: 100, rng: cycleRng([0.2, 0.7, 0.3, 0.9]) });
    const total = Object.values(result.gameEndReasonCount).reduce((sum, count) => sum + count, 0);

    expect(total).toBe(result.totalGames);
  });

  it('maxRounds 結束時會判定最高裁決點數勝者', () => {
    const state = gameState({
      reason: 'maxRounds',
      players: [
        player({ id: 'human', points: 8, isHuman: true }),
        player({ id: 'honest', points: 11, botPersonality: 'honest' }),
        player({ id: 'opportunist', points: 6, botPersonality: 'opportunist' })
      ]
    });

    const outcome = determineSimulationWinners(state);
    const result = summarizeSimulationGames([state]);

    expect(outcome.winners.map((winner) => winner.id)).toEqual(['honest']);
    expect(result.gamesWithSingleWinner).toBe(1);
    expect(result.winnerCountByPersonality.honest).toBe(1);
  });

  it('maxRounds 同分最高時會記為 tiedGames', () => {
    const state = gameState({
      reason: 'maxRounds',
      players: [
        player({ id: 'human', points: 10, isHuman: true }),
        player({ id: 'honest', points: 10, botPersonality: 'honest' }),
        player({ id: 'observer', points: 8, botPersonality: 'observer' })
      ]
    });
    const result = summarizeSimulationGames([state]);

    expect(result.tiedGames).toBe(1);
    expect(result.gamesWithSingleWinner).toBe(0);
    expect(result.tiedWinnerCountByPersonality.humanLike).toBe(1);
    expect(result.tiedWinnerCountByPersonality.honest).toBe(1);
  });

  it('gamesWithoutWinner 正常情況下為 0', () => {
    const result = runSimulation({ gameCount: 100, rng: cycleRng([0.15, 0.35, 0.55, 0.75]) });

    expect(result.gamesWithoutWinner).toBe(0);
  });

  it('winnerCountByPersonalityAllGamesRatio 正確', () => {
    const result = summarizeSimulationGames([
      gameState({
        reason: 'judgmentWin',
        winnerPlayerId: 'human',
        players: [player({ id: 'human', points: 12, isHuman: true }), player({ id: 'honest', points: 8, botPersonality: 'honest' })]
      }),
      gameState({
        reason: 'maxRounds',
        players: [player({ id: 'human', points: 8, isHuman: true }), player({ id: 'honest', points: 10, botPersonality: 'honest' })]
      })
    ]);

    expect(result.winnerCountByPersonalityAllGamesRatio.humanLike).toBe(0.5);
    expect(result.winnerCountByPersonalityAllGamesRatio.honest).toBe(0.5);
  });

  it('winnerCountByPersonalityDecidedGamesRatio 正確', () => {
    const result = summarizeSimulationGames([
      gameState({
        reason: 'judgmentWin',
        winnerPlayerId: 'human',
        players: [player({ id: 'human', points: 12, isHuman: true }), player({ id: 'honest', points: 8, botPersonality: 'honest' })]
      }),
      gameState({
        reason: 'maxRounds',
        players: [player({ id: 'human', points: 10, isHuman: true }), player({ id: 'honest', points: 10, botPersonality: 'honest' })]
      })
    ]);

    expect(result.gamesWithSingleWinner).toBe(1);
    expect(result.tiedGames).toBe(1);
    expect(result.winnerCountByPersonalityDecidedGamesRatio.humanLike).toBe(1);
  });

  it('maxRounds 超過 45% 時會產生 warning', () => {
    const result = runSimulation({ gameCount: 20, maxRounds: 1, rng: cycleRng([0.5, 0.6, 0.7, 0.8]) });

    expect(result.balanceWarnings.some((warning) => warning.includes('過多遊戲拖到回合上限'))).toBe(true);
  });

  it('decided games 中某人格勝率超過 55% 時會產生 warning', () => {
    const warnings = buildWarnings({
      totalGames: 10,
      completedGames: 10,
      averageRounds: 5,
      gameEndReasonCount: { judgmentWin: 10, maxRounds: 0, allButOneEliminated: 0, allEliminatedTieBreak: 0 },
      gamesWithSingleWinner: 10,
      tiedGames: 0,
      gamesWithoutWinner: 0,
      winnerCountByPersonality: { humanLike: 0, honest: 6, opportunist: 2, observer: 2 },
      winnerCountByPersonalityAllGamesRatio: { humanLike: 0, honest: 0.6, opportunist: 0.2, observer: 0.2 },
      winnerCountByPersonalityDecidedGamesRatio: { humanLike: 0, honest: 0.6, opportunist: 0.2, observer: 0.2 },
      tiedWinnerCountByPersonality: { humanLike: 0, honest: 0, opportunist: 0, observer: 0 },
      averageFinalJudgmentByPersonality: { humanLike: 6, honest: 8, opportunist: 5, observer: 5 },
      averageDeltaByPersonality: { humanLike: 0, honest: 2, opportunist: -1, observer: -1 },
      averageRoundsByEndReason: { judgmentWin: 5, maxRounds: 0, allButOneEliminated: 0, allEliminatedTieBreak: 0 },
      roundSituationFrequency: { loneHero: 0.1, allAlliance: 0.1, allBetrayal: 0.1, equal: 0.2, minorityBetrayal: 0.5, betrayalOverload: 0 },
      commitmentStats: { keptCommitmentCount: 1, brokenCommitmentCount: 1, keepRate: 0.5 },
      cardUsageStats: { fate: 0, peek: 0, shield: 0, counter: 0 }
    });

    expect(warnings.some((warning) => warning.includes('有明確勝者的局中勝率偏高'))).toBe(true);
  });

  it('simulator 會呼叫既有 state machine 流程', () => {
    const spy = vi.spyOn(stateMachine, 'advancePhase');
    runSimulation({ gameCount: 1, rng: cycleRng([0.1, 0.3, 0.5, 0.7]) });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('全員同時出局不會產生 gamesWithoutWinner，且最高分者成為唯一勝者', () => {
    const state = gameState({
      reason: 'allEliminatedTieBreak',
      winnerPlayerIds: ['honest'],
      players: [
        player({ id: 'human', points: -2, isHuman: true, isEliminated: true }),
        player({ id: 'honest', points: -1, botPersonality: 'honest', isEliminated: true }),
        player({ id: 'observer', points: -3, botPersonality: 'observer', isEliminated: true })
      ],
      roundResults: [roundResult(['human', 'honest', 'observer'])]
    });
    const result = summarizeSimulationGames([state]);

    expect(result.gamesWithoutWinner).toBe(0);
    expect(result.gamesWithSingleWinner).toBe(1);
    expect(result.winnerCountByPersonality.honest).toBe(1);
    expect(result.gameEndReasonCount.allEliminatedTieBreak).toBe(1);
  });

  it('全員同時出局且最高分同分時，記為 tiedGames', () => {
    const state = gameState({
      reason: 'allEliminatedTieBreak',
      winnerPlayerIds: ['human', 'honest'],
      isTie: true,
      players: [
        player({ id: 'human', points: -1, isHuman: true, isEliminated: true }),
        player({ id: 'honest', points: -1, botPersonality: 'honest', isEliminated: true }),
        player({ id: 'observer', points: -3, botPersonality: 'observer', isEliminated: true })
      ],
      roundResults: [roundResult(['human', 'honest', 'observer'])]
    });
    const result = summarizeSimulationGames([state]);

    expect(result.tiedGames).toBe(1);
    expect(result.tiedWinnerCountByPersonality.humanLike).toBe(1);
    expect(result.tiedWinnerCountByPersonality.honest).toBe(1);
    expect(result.gamesWithoutWinner).toBe(0);
  });

  it('maxRounds 沒有未出局玩家時，仍從本輪參與玩家找最高分', () => {
    const state = gameState({
      reason: 'maxRounds',
      players: [
        player({ id: 'human', points: -2, isHuman: true, isEliminated: true }),
        player({ id: 'honest', points: -1, botPersonality: 'honest', isEliminated: true }),
        player({ id: 'observer', points: -4, botPersonality: 'observer', isEliminated: true })
      ],
      roundResults: [roundResult(['human', 'honest', 'observer'])]
    });
    const outcome = determineSimulationWinners(state);

    expect(outcome.winners.map((winner) => winner.id)).toEqual(['honest']);
  });

  it('baseline profile 可以正常執行', () => {
    const baseline = BALANCE_PROFILES.find((profile) => profile.profileName === 'baseline');
    const result = runSimulation({ gameCount: 10, rulesConfig: baseline?.rulesConfig, rng: cycleRng([0.1, 0.3, 0.5, 0.7]) });

    expect(baseline).toBeDefined();
    expect(result.totalGames).toBe(10);
  });

  it('baseline 會使用 11 點勝利門檻', () => {
    const profile = BALANCE_PROFILES.find((candidate) => candidate.profileName === 'baseline');

    expect(profile?.rulesConfig.winAtJudgmentPoints).toBe(11);
    expect(BASELINE_RULES_CONFIG.winAtJudgmentPoints).toBe(11);
  });

  it('legacyTarget12 會保留 12 點勝利門檻', () => {
    const profile = BALANCE_PROFILES.find((candidate) => candidate.profileName === 'legacyTarget12');

    expect(profile?.rulesConfig.winAtJudgmentPoints).toBe(12);
    expect(BASELINE_RULES_CONFIG.winAtJudgmentPoints).toBe(11);
  });

  it('maxRounds8 會正確覆蓋回合上限', () => {
    const profile = BALANCE_PROFILES.find((candidate) => candidate.profileName === 'maxRounds8');

    expect(profile?.rulesConfig.maxRounds).toBe(8);
    expect(BASELINE_RULES_CONFIG.maxRounds).toBe(10);
  });

  it('simulator 沒有 rulesConfig 時使用 baseline', () => {
    const result = runSimulation({ gameCount: 5, rng: cycleRng([0.2, 0.4, 0.6, 0.8]) });

    expect(result.totalGames).toBe(5);
    expect(BASELINE_RULES_CONFIG.winAtJudgmentPoints).toBe(11);
  });

  it('Balance Lab 可以同時跑多組 profile，且每組都產生結果', () => {
    const profiles = [
      { profileName: 'baseline', rulesConfig: createRulesConfig() },
      { profileName: 'legacyTarget12', rulesConfig: createRulesConfig({ winAtJudgmentPoints: 12 }) }
    ];
    const results = runBalanceLab({ gameCount: 5, profiles, rng: cycleRng([0.1, 0.3, 0.5, 0.7]) });

    expect(results).toHaveLength(2);
    expect(results[0].profileName).toBe('baseline');
    expect(results[0].totalGames).toBe(5);
    expect(results[1].profileName).toBe('legacyTarget12');
    expect(results[1].totalGames).toBe(5);
  });
});
