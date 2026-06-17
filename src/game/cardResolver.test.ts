import { describe, expect, it } from 'vitest';
import { applyCounterCards, applyShieldCards, resolveFateCards, resolvePublicCards } from './cardResolver';
import { getRoundSituation, resolveBaseJudgment } from './judgmentResolver';
import type { Faction, PlayerState } from './types';

function makePlayer(args: {
  id: string;
  chosenFaction: Faction;
  judgedFaction?: Faction;
  playedCard?: PlayerState['playedCard'];
}): PlayerState {
  return {
    id: args.id,
    name: args.id,
    isHuman: args.id === 'p1',
    judgmentPoints: 6,
    isEliminated: false,
    commitment: args.judgedFaction ?? args.chosenFaction,
    chosenFaction: args.chosenFaction,
    judgedFaction: args.judgedFaction ?? args.chosenFaction,
    hand: [],
    playedCard: args.playedCard,
    hasPlayedCardThisRound: Boolean(args.playedCard)
  };
}

describe('cardResolver', () => {
  it('窺探看到 chosenFaction，而不是 judgedFaction', () => {
    const state = {
      eventLog: [],
      players: [
        makePlayer({
          id: 'p1',
          chosenFaction: 'alliance',
          playedCard: { type: 'peek', userPlayerId: 'p1', targetPlayerId: 'p2', isPublic: true }
        }),
        makePlayer({ id: 'p2', chosenFaction: 'betrayal', judgedFaction: 'alliance' })
      ]
    };
    const nextState = resolvePublicCards(state as never);

    expect(nextState.eventLog.at(-1)).toContain('背叛');
    expect(nextState.eventLog.at(-1)).toContain('測試版直接寫入紀錄');
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
