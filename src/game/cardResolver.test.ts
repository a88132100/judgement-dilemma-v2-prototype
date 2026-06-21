import { describe, expect, it } from 'vitest';
import {
  applyCounterCards,
  applyShieldCards,
  resolveFateCards,
  resolvePeekChoice,
  resolvePublicCards,
  validatePeekTarget
} from './cardResolver';
import { getRoundSituation, resolveBaseJudgment, resolveCommitmentDelta } from './judgmentResolver';
import type { Faction, GameState, PlayerState } from './types';

function makePlayer(args: {
  id: string;
  chosenFaction: Faction;
  judgedFaction?: Faction;
  commitment?: Faction;
  playedCard?: PlayerState['playedCard'];
  isHuman?: boolean;
}): PlayerState {
  return {
    id: args.id,
    name: args.id,
    isHuman: args.isHuman ?? args.id === 'p1',
    judgmentPoints: 6,
    isEliminated: false,
    commitment: args.commitment ?? args.chosenFaction,
    chosenFaction: args.chosenFaction,
    judgedFaction: args.judgedFaction ?? args.chosenFaction,
    hand: [],
    playedCard: args.playedCard,
    hasPlayedCardThisRound: Boolean(args.playedCard)
  };
}

function makeState(players: PlayerState[]): GameState {
  return {
    players,
    round: 1,
    phase: 'resolvePublicCards',
    dealerPlayerId: players[0]?.id ?? 'p1',
    deck: [],
    discardPile: [],
    eventLog: [],
    roundResults: []
  };
}

describe('cardResolver', () => {
  it('真理之眼可以指定其他玩家', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' })
    ]);

    expect(validatePeekTarget(state, 'p1', 'p2')).toBeUndefined();
  });

  it('真理之眼不能指定自己', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' })
    ]);

    expect(validatePeekTarget(state, 'p1', 'p1')).toContain('不可指定自己');
  });

  it('真理之眼讀取目標 chosenFaction，而不是 judgedFaction', () => {
    const state = makeState([
        makePlayer({
          id: 'p1',
          chosenFaction: 'alliance',
          playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
        }),
        makePlayer({ id: 'p2', chosenFaction: 'betrayal', judgedFaction: 'alliance' })
      ]);
    const result = resolvePeekChoice(state, 'p1', 'p2', false);

    expect(result.peekedFaction).toBe('betrayal');
  });

  it('真理之眼後選擇不更換時，使用者陣營不變', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' })
    ]);
    const result = resolvePeekChoice(state, 'p1', 'p2', false);

    expect(result.state.players[0].chosenFaction).toBe('alliance');
    expect(result.state.players[0].judgedFaction).toBe('alliance');
    expect(result.state.players[0].hasChangedFactionByPeek).toBe(false);
  });

  it('真理之眼後選擇更換時，只切換使用者自己的 judgedFaction', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' })
    ]);
    const result = resolvePeekChoice(state, 'p1', 'p2', true);

    expect(result.state.players[0].chosenFaction).toBe('alliance');
    expect(result.state.players[0].judgedFaction).toBe('betrayal');
    expect(result.state.players[1].judgedFaction).toBe('betrayal');
    expect(result.state.players[0].hasChangedFactionByPeek).toBe(true);
  });

  it('更換陣營後公開紀錄不揭露新陣營內容', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' })
    ]);
    const result = resolvePeekChoice(state, 'p1', 'p2', true);
    const publicLine = result.state.eventLog.at(-1) ?? '';

    expect(publicLine).toBe('p1 已重新選擇陣營。');
    expect(publicLine).not.toContain('合作');
    expect(publicLine).not.toContain('背叛');
  });

  it('承諾守諾或失信以真理之眼更換後的 judgedFaction 判定', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        commitment: 'alliance',
        playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' })
    ]);
    const result = resolvePeekChoice(state, 'p1', 'p2', true).state;
    const situation = getRoundSituation(result.players);
    const commitmentDelta = resolveCommitmentDelta(result.players, situation);

    expect(result.players[0].judgedFaction).toBe('betrayal');
    expect(commitmentDelta.p1).toBe(-1);
  });

  it('真理之眼後仍可被後續強制效果覆寫最終判定陣營', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        commitment: 'alliance',
        playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' })
    ]);
    const afterPeek = resolvePeekChoice(state, 'p1', 'p2', true).state;
    const afterForcedReverse = {
      ...afterPeek,
      players: afterPeek.players.map((player) => (player.id === 'p1' ? { ...player, judgedFaction: 'alliance' as const } : player))
    };
    const situation = getRoundSituation(afterForcedReverse.players);
    const commitmentDelta = resolveCommitmentDelta(afterForcedReverse.players, situation);

    expect(situation.judgedFactionByPlayerId.p1).toBe('alliance');
    expect(commitmentDelta.p1).toBe(1);
  });

  it('公開型解析不會把真理之眼揭示的陣營寫入公開紀錄', () => {
    const state = makeState([
      makePlayer({ id: 'p1', chosenFaction: 'alliance', isHuman: true }),
      makePlayer({
        id: 'p2',
        chosenFaction: 'betrayal',
        isHuman: false,
        playedCard: { type: 'peek', userPlayerId: 'p2', targetPlayerId: 'p1', isPublic: true }
      })
    ]);
    const nextState = resolvePublicCards(state, undefined, () => 0);
    const publicLine = nextState.eventLog.at(-1) ?? '';

    expect(publicLine).not.toContain('合作');
    expect(publicLine).not.toContain('背叛');
  });

  it('真理之眼確認後不可再次改查第二名玩家', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'peek', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' })
    ]);
    const firstResolution = resolvePeekChoice(state, 'p1', 'p2', false).state;
    const secondResolution = resolvePeekChoice(firstResolution, 'p1', 'p3', true);

    expect(secondResolution.error).toContain('已完成');
    expect(secondResolution.state.players[0].playedCard?.targetPlayerId).toBe('p2');
    expect(secondResolution.state.players[0].judgedFaction).toBe('alliance');
    expect(secondResolution.state.eventLog).toHaveLength(firstResolution.eventLog.length);
  });

  it('庇護依 judgedFaction 判定合作玩家，且只減少基礎損失', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'betrayal', judgedFaction: 'alliance', playedCard: { type: 'shield', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance', judgedFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance', judgedFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal', judgedFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);
    const result = applyShieldCards({ players: testPlayers, situation, baseDeltaByPlayerId: base });

    expect(base.p1).toBe(-1);
    expect(result.adjustedBaseDeltaByPlayerId.p1).toBe(0);
    expect(result.shieldDeltaByPlayerId.p1).toBe(1);
  });

  it('庇護不會在基礎非負時生效', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'shield', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);
    const result = applyShieldCards({ players: testPlayers, situation, baseDeltaByPlayerId: base });

    expect(base.p1).toBe(2);
    expect(result.adjustedBaseDeltaByPlayerId.p1).toBe(2);
    expect(result.shieldDeltaByPlayerId.p1).toBe(0);
  });

  it('反擊依 RoundSituation 的背叛者名單選目標', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'counter', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance', judgedFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal', judgedFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'alliance' })
    ];
    const situation = getRoundSituation(testPlayers);
    const counter = applyCounterCards({ players: testPlayers, situation, rng: () => 0 });

    expect(counter.counterDeltaByPlayerId).toEqual({ p1: 0, p2: -1, p3: 0, p4: 0 });
    expect(counter.counterTargetByUserId.p1).toBe('p2');
  });

  it('反擊使用者若 judgedFaction 不是合作則無效', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', judgedFaction: 'betrayal', playedCard: { type: 'counter', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'alliance' })
    ];
    const situation = getRoundSituation(testPlayers);
    const counter = applyCounterCards({ players: testPlayers, situation, rng: () => 0 });

    expect(counter.counterDeltaByPlayerId).toEqual({ p1: 0, p2: 0, p3: 0, p4: 0 });
  });

  it('宿命多數預言依最終判定陣營人數判定，平手落空', () => {
    const testPlayers = [
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'fate', userPlayerId: 'p1', isPublic: true, fatePrediction: { kind: 'majority', predictedMajority: 'alliance' } }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const fate = resolveFateCards({ players: testPlayers, situation });

    expect(fate.p1).toBe(-1);
  });

  it('宿命在孤勇者時背叛多數預言命中', () => {
    const testPlayers = [
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'fate', userPlayerId: 'p1', isPublic: true, fatePrediction: { kind: 'majority', predictedMajority: 'betrayal' } }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const fate = resolveFateCards({ players: testPlayers, situation });

    expect(situation.resultType).toBe('loneHero');
    expect(fate.p1).toBe(2);
  });

  it('宿命身分預言依 judgedFaction 判定', () => {
    const testPlayers = [
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: {
          type: 'fate',
          userPlayerId: 'p1',
          isPublic: true,
          fatePrediction: { kind: 'identity', targetPlayerId: 'p2', predictedFaction: 'betrayal' }
        }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance', judgedFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'alliance' })
    ];
    const situation = getRoundSituation(testPlayers);
    const fate = resolveFateCards({ players: testPlayers, situation });

    expect(fate.p1).toBe(2);
  });
});
