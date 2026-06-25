import { describe, expect, it } from 'vitest';
import { COMMITMENT_DELTAS } from './constants';
import { applyRoundResult, buildFinalRoundResult, getRoundSituation, resolveBaseJudgment, resolveCommitmentDelta } from './judgmentResolver';
import type { Faction, GameState, PlayerState } from './types';

function players(judgedFactions: Faction[], commitments = judgedFactions): PlayerState[] {
  return judgedFactions.map((faction, index) => ({
    id: `p${index + 1}`,
    name: `玩家 ${index + 1}`,
    isHuman: index === 0,
    judgmentPoints: 6,
    isEliminated: false,
    commitment: commitments[index],
    chosenFaction: faction,
    judgedFaction: faction,
    hand: [],
    hasPlayedCardThisRound: false
  }));
}

describe('judgmentResolver', () => {
  it('RoundSituation 使用 judgedFaction，而不是 chosenFaction', () => {
    const testPlayers = players(['alliance', 'betrayal', 'betrayal', 'betrayal']);
    testPlayers[0] = { ...testPlayers[0], chosenFaction: 'betrayal', judgedFaction: 'alliance' };
    const situation = getRoundSituation(testPlayers);

    expect(situation.judgedFactionByPlayerId.p1).toBe('alliance');
    expect(situation.resultType).toBe('loneHero');
  });

  it('孤勇者優先於背叛過剩', () => {
    const testPlayers = players(['alliance', 'betrayal', 'betrayal', 'betrayal']);
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);

    expect(situation.resultType).toBe('loneHero');
    expect(base).toEqual({ p1: 2, p2: -1, p3: -1, p4: -1 });
  });

  it('只剩 1 名有效合作玩家時不觸發孤勇者', () => {
    const testPlayers = players(['alliance']);
    const situation = getRoundSituation(testPlayers);

    expect(situation.resultType).toBe('allAlliance');
  });

  it('全員合作時所有有效玩家 +2', () => {
    const testPlayers = players(['alliance', 'alliance', 'alliance', 'alliance']);
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);

    expect(situation.resultType).toBe('allAlliance');
    expect(base).toEqual({ p1: 2, p2: 2, p3: 2, p4: 2 });
  });

  it('全員背叛時所有有效玩家 -3', () => {
    const testPlayers = players(['betrayal', 'betrayal', 'betrayal', 'betrayal']);
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);

    expect(situation.resultType).toBe('allBetrayal');
    expect(base).toEqual({ p1: -3, p2: -3, p3: -3, p4: -3 });
  });

  it('合作與背叛人數相等時所有有效玩家 -1', () => {
    const testPlayers = players(['alliance', 'alliance', 'betrayal', 'betrayal']);
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);

    expect(situation.resultType).toBe('equal');
    expect(base).toEqual({ p1: -1, p2: -1, p3: -1, p4: -1 });
  });

  it('少數背叛時背叛者 +2，合作者 -1', () => {
    const testPlayers = players(['alliance', 'alliance', 'alliance', 'betrayal']);
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);

    expect(situation.resultType).toBe('minorityBetrayal');
    expect(base).toEqual({ p1: -1, p2: -1, p3: -1, p4: 2 });
  });

  it('已出局玩家不參與結算', () => {
    const testPlayers = players(['alliance', 'betrayal', 'betrayal', 'betrayal']);
    testPlayers[3] = { ...testPlayers[3], isEliminated: true };
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);

    expect(situation.validPlayerIds).toEqual(['p1', 'p2', 'p3']);
    expect(base).toEqual({ p1: 2, p2: -1, p3: -1 });
  });

  it('承諾加扣分依 judgedFaction 計算', () => {
    const testPlayers = players(['alliance', 'betrayal', 'alliance', 'betrayal'], ['alliance', 'alliance', 'betrayal', 'betrayal']);
    const situation = getRoundSituation(testPlayers);
    const commitment = resolveCommitmentDelta(testPlayers, situation);

    expect(commitment).toEqual({ p1: COMMITMENT_DELTAS.kept, p2: COMMITMENT_DELTAS.broken, p3: COMMITMENT_DELTAS.broken, p4: COMMITMENT_DELTAS.kept });
  });

  it('RoundResult 會合併基礎、宿命、反擊與承諾加扣分', () => {
    const testPlayers = players(['alliance', 'betrayal']);
    const situation = getRoundSituation(testPlayers);
    const state = { players: testPlayers, round: 1 } as GameState;
    const result = buildFinalRoundResult({
      state,
      situation,
      baseDeltaByPlayerId: { p1: -1, p2: -1 },
      adjustedBaseDeltaByPlayerId: { p1: 0, p2: -1 },
      shieldDeltaByPlayerId: { p1: 1, p2: 0 },
      counterDeltaByPlayerId: { p1: 0, p2: -1 },
      fateDeltaByPlayerId: { p1: 2, p2: 0 },
      commitmentDeltaByPlayerId: { p1: 1, p2: 1 }
    });

    expect(result.finalDeltaByPlayerId).toEqual({ p1: 3, p2: -1 });
  });

  it('全員同輪出局時會觸發 allEliminatedTieBreak 並選最高分者', () => {
    const testPlayers = players(['betrayal', 'betrayal']);
    testPlayers[0] = { ...testPlayers[0], judgmentPoints: 1 };
    testPlayers[1] = { ...testPlayers[1], judgmentPoints: 2 };
    const situation = getRoundSituation(testPlayers);
    const state = {
      players: testPlayers,
      round: 1,
      phase: 'resolveJudgment',
      dealerPlayerId: 'p1',
      deck: [],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;
    const result = buildFinalRoundResult({
      state,
      situation,
      baseDeltaByPlayerId: { p1: -3, p2: -3 },
      adjustedBaseDeltaByPlayerId: { p1: -3, p2: -3 },
      shieldDeltaByPlayerId: { p1: 0, p2: 0 },
      counterDeltaByPlayerId: { p1: 0, p2: 0 },
      fateDeltaByPlayerId: { p1: 0, p2: 0 },
      commitmentDeltaByPlayerId: { p1: 0, p2: 0 }
    });
    const nextState = applyRoundResult(state, result);

    expect(nextState.gameOverReason).toBe('allEliminatedTieBreak');
    expect(nextState.winnerPlayerIds).toEqual(['p2']);
    expect(nextState.winnerPlayerId).toBe('p2');
    expect(nextState.isTie).toBe(false);
  });

  it('全員同輪出局且最高分同分時會保存並列勝者', () => {
    const testPlayers = players(['betrayal', 'betrayal']);
    testPlayers[0] = { ...testPlayers[0], judgmentPoints: 2 };
    testPlayers[1] = { ...testPlayers[1], judgmentPoints: 2 };
    const situation = getRoundSituation(testPlayers);
    const state = {
      players: testPlayers,
      round: 1,
      phase: 'resolveJudgment',
      dealerPlayerId: 'p1',
      deck: [],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;
    const result = buildFinalRoundResult({
      state,
      situation,
      baseDeltaByPlayerId: { p1: -3, p2: -3 },
      adjustedBaseDeltaByPlayerId: { p1: -3, p2: -3 },
      shieldDeltaByPlayerId: { p1: 0, p2: 0 },
      counterDeltaByPlayerId: { p1: 0, p2: 0 },
      fateDeltaByPlayerId: { p1: 0, p2: 0 },
      commitmentDeltaByPlayerId: { p1: 0, p2: 0 }
    });
    const nextState = applyRoundResult(state, result);

    expect(nextState.gameOverReason).toBe('allEliminatedTieBreak');
    expect(nextState.winnerPlayerIds).toEqual(['p1', 'p2']);
    expect(nextState.winnerPlayerId).toBeUndefined();
    expect(nextState.isTie).toBe(true);
  });

  it('玩家達到 11 點時會獲得裁決點勝利', () => {
    const testPlayers = players(['alliance', 'alliance']);
    testPlayers[0] = { ...testPlayers[0], judgmentPoints: 9 };
    testPlayers[1] = { ...testPlayers[1], judgmentPoints: 6 };
    const situation = getRoundSituation(testPlayers);
    const state = {
      players: testPlayers,
      round: 1,
      phase: 'resolveJudgment',
      dealerPlayerId: 'p1',
      deck: [],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;
    const result = buildFinalRoundResult({
      state,
      situation,
      baseDeltaByPlayerId: { p1: 2, p2: 2 },
      adjustedBaseDeltaByPlayerId: { p1: 2, p2: 2 },
      shieldDeltaByPlayerId: { p1: 0, p2: 0 },
      counterDeltaByPlayerId: { p1: 0, p2: 0 },
      fateDeltaByPlayerId: { p1: 0, p2: 0 },
      commitmentDeltaByPlayerId: { p1: 0, p2: 0 }
    });
    const nextState = applyRoundResult(state, result);

    expect(nextState.gameOverReason).toBe('judgmentWin');
    expect(nextState.winnerPlayerIds).toEqual(['p1']);
    expect(nextState.winnerPlayerId).toBe('p1');
  });
});

describe('elimination and game end checks', () => {
  it('裁決點數 <= 0 時會立刻標記出局，並在只剩一人時結束遊戲', () => {
    const testPlayers = players(['betrayal', 'alliance'], ['alliance', 'alliance']);
    testPlayers[0] = { ...testPlayers[0], judgmentPoints: 1 };
    testPlayers[1] = { ...testPlayers[1], judgmentPoints: 6 };
    const situation = getRoundSituation(testPlayers);
    const state = {
      players: testPlayers,
      round: 1,
      phase: 'resolveJudgment',
      dealerPlayerId: 'p1',
      deck: [],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;
    const result = buildFinalRoundResult({
      state,
      situation,
      baseDeltaByPlayerId: { p1: -1, p2: -1 },
      adjustedBaseDeltaByPlayerId: { p1: -1, p2: -1 },
      shieldDeltaByPlayerId: { p1: 0, p2: 0 },
      counterDeltaByPlayerId: { p1: 0, p2: 0 },
      fateDeltaByPlayerId: { p1: 0, p2: 0 },
      commitmentDeltaByPlayerId: { p1: -1, p2: 1 }
    });
    const nextState = applyRoundResult(state, result);

    expect(nextState.players[0].judgmentPoints).toBe(-1);
    expect(nextState.players[0].isEliminated).toBe(true);
    expect(nextState.players[1].isEliminated).toBe(false);
    expect(nextState.gameOverReason).toBe('allButOneEliminated');
    expect(nextState.winnerPlayerIds).toEqual(['p2']);
    expect(nextState.eventLog).toContain(`${testPlayers[0].name} 裁決點數歸零，已出局。`);
  });
});
