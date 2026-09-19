import { describe, expect, it } from 'vitest';
import {
  applyChaosEffects,
  applyCounterCards,
  applyMirrorCards,
  applyShieldCards,
  resolveChaosChoice,
  resolveExpediencyCards,
  resolveFateCards,
  resolveGambleCards,
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
  hand?: PlayerState['hand'];
  judgmentPoints?: number;
  chaosTargetedThisRound?: boolean;
  disabledFunctionCardThisRound?: boolean;
}): PlayerState {
  return {
    id: args.id,
    name: args.id,
    isHuman: args.isHuman ?? args.id === 'p1',
    judgmentPoints: args.judgmentPoints ?? 6,
    isEliminated: false,
    commitment: args.commitment ?? args.chosenFaction,
    chosenFaction: args.chosenFaction,
    judgedFaction: args.judgedFaction ?? args.chosenFaction,
    hand: args.hand ?? [],
    playedCard: args.playedCard,
    hasPlayedCardThisRound: Boolean(args.playedCard),
    chaosTargetedThisRound: args.chaosTargetedThisRound,
    disabledFunctionCardThisRound: args.disabledFunctionCardThisRound
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

  it('混沌會反轉目標最終陣營，並讓目標暗放型功能牌失效', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'chaos', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({
        id: 'p2',
        chosenFaction: 'alliance',
        playedCard: { type: 'shield', userPlayerId: 'p2', isPublic: false }
      })
    ]);
    const result = resolveChaosChoice(state, 'p1', 'p2');
    const target = result.state.players.find((player) => player.id === 'p2');

    expect(result.error).toBeUndefined();
    expect(target?.judgedFaction).toBe('betrayal');
    expect(target?.chaosTargetedThisRound).toBe(true);
    expect(target?.disabledFunctionCardThisRound).toBe(true);
    expect(result.state.players[0].hasResolvedChaos).toBe(true);
  });

  it('混沌承諾豁免：被迫從守諾變失信時不加也不扣', () => {
    const state = makeState([
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        playedCard: { type: 'chaos', userPlayerId: 'p1', isPublic: true }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance', commitment: 'alliance' })
    ]);
    const afterChaos = resolveChaosChoice(state, 'p1', 'p2').state;
    const situation = getRoundSituation(afterChaos.players);
    const commitmentDelta = resolveCommitmentDelta(afterChaos.players, situation);

    expect(afterChaos.players[1].judgedFaction).toBe('betrayal');
    expect(commitmentDelta.p2).toBe(0);
  });

  it('混沌可在裁決前重新套用，確保宿命等效果讀到反轉後陣營', () => {
    const state = makeState([
      makePlayer({ id: 'p1', chosenFaction: 'alliance', chaosTargetedThisRound: true }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' })
    ]);
    const afterChaos = applyChaosEffects(state);

    expect(afterChaos.players[0].judgedFaction).toBe('betrayal');
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

  it('鏡像成功時會與目標背叛者交換基礎結算', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'mirror', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);
    const mirror = applyMirrorCards({ players: testPlayers, situation, adjustedBaseDeltaByPlayerId: base, rng: () => 0 });

    expect(situation.resultType).toBe('minorityBetrayal');
    expect(mirror.adjustedBaseDeltaByPlayerId.p1).toBe(2);
    expect(mirror.adjustedBaseDeltaByPlayerId.p4).toBe(-1);
    expect(mirror.mirrorDeltaByPlayerId.p1).toBe(3);
    expect(mirror.mirrorSuccessByUserId.p1).toBe(true);
  });

  it('多個鏡像鎖定不同背叛者時可以同時成功', () => {
    const rolls = [0, 0.9, 0, 0];
    const rng = () => rolls.shift() ?? 0;
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'mirror', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance', playedCard: { type: 'mirror', userPlayerId: 'p2', isPublic: false } }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p5', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);
    const mirror = applyMirrorCards({ players: testPlayers, situation, adjustedBaseDeltaByPlayerId: base, rng });

    expect(situation.resultType).toBe('minorityBetrayal');
    expect(mirror.mirrorTargetByUserId.p1).toBe('p4');
    expect(mirror.mirrorTargetByUserId.p2).toBe('p5');
    expect(mirror.mirrorSuccessByUserId.p1).toBe(true);
    expect(mirror.mirrorSuccessByUserId.p2).toBe(true);
    expect(mirror.adjustedBaseDeltaByPlayerId.p1).toBe(2);
    expect(mirror.adjustedBaseDeltaByPlayerId.p2).toBe(2);
  });

  it('多個鏡像鎖定同一背叛者時只有一人成功，其餘免疫負基礎結算', () => {
    const rolls = [0, 0, 0];
    const rng = () => rolls.shift() ?? 0;
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'mirror', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance', playedCard: { type: 'mirror', userPlayerId: 'p2', isPublic: false } }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const base = resolveBaseJudgment(testPlayers, situation);
    const mirror = applyMirrorCards({ players: testPlayers, situation, adjustedBaseDeltaByPlayerId: base, rng });

    expect(mirror.mirrorSuccessByUserId.p1).toBe(true);
    expect(mirror.mirrorSuccessByUserId.p2).toBe(false);
    expect(mirror.adjustedBaseDeltaByPlayerId.p1).toBe(2);
    expect(mirror.adjustedBaseDeltaByPlayerId.p2).toBe(0);
    expect(mirror.adjustedBaseDeltaByPlayerId.p4).toBe(-1);
  });

  it('賭命唯一背叛時成功 +4', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'betrayal', playedCard: { type: 'gamble', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'alliance' })
    ];
    const situation = getRoundSituation(testPlayers);
    const gamble = resolveGambleCards({ players: testPlayers, situation });

    expect(gamble.gambleDeltaByPlayerId.p1).toBe(4);
    expect(gamble.gambleSuccessByPlayerId.p1).toBe(true);
  });

  it('賭命失敗時 -2 並隨機棄 1 張手牌', () => {
    const testPlayers = [
      makePlayer({
        id: 'p1',
        chosenFaction: 'betrayal',
        hand: ['peek', 'shield'],
        playedCard: { type: 'gamble', userPlayerId: 'p1', isPublic: false }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'alliance' })
    ];
    const situation = getRoundSituation(testPlayers);
    const gamble = resolveGambleCards({ players: testPlayers, situation, rng: () => 0.6 });

    expect(gamble.gambleDeltaByPlayerId.p1).toBe(-2);
    expect(gamble.gambleDiscardByPlayerId.p1).toBe('shield');
    expect(gamble.players[0].hand).toEqual(['peek']);
  });

  it('賭命失敗且無手牌可棄時，標記本次跳過補牌', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'betrayal', playedCard: { type: 'gamble', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'alliance' })
    ];
    const situation = getRoundSituation(testPlayers);
    const gamble = resolveGambleCards({ players: testPlayers, situation });

    expect(gamble.gambleDeltaByPlayerId.p1).toBe(-2);
    expect(gamble.players[0].skipNextDraw).toBe(true);
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

  it('撿角會在裁決時讓使用者 +1', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'smallGain', userPlayerId: 'p1', isPublic: true } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const expediency = resolveExpediencyCards({ players: testPlayers, situation });

    expect(expediency.expediencyDeltaByPlayerId.p1).toBe(1);
  });

  it('信任萬萬稅會指定失信玩家，且混沌豁免者不算失信', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'promiseTax', userPlayerId: 'p1', isPublic: true } }),
      makePlayer({ id: 'p2', chosenFaction: 'betrayal', commitment: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance', judgedFaction: 'betrayal', commitment: 'alliance', chaosTargetedThisRound: true }),
      makePlayer({ id: 'p4', chosenFaction: 'alliance' })
    ];
    const situation = getRoundSituation(testPlayers);
    const expediency = resolveExpediencyCards({ players: testPlayers, situation, rng: () => 0 });

    expect(expediency.promiseTaxTargetByUserId.p1).toBe('p2');
    expect(expediency.expediencyDeltaByPlayerId.p2).toBe(-1);
    expect(expediency.expediencyDeltaByPlayerId.p3).toBe(0);
  });

  it('信任萬萬稅在沒有失信玩家時不生效', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'promiseTax', userPlayerId: 'p1', isPublic: true } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const expediency = resolveExpediencyCards({ players: testPlayers, situation });

    expect(expediency.promiseTaxTargetByUserId.p1).toBeUndefined();
    expect(expediency.expediencyDeltaByPlayerId.p1).toBe(0);
  });

  it('人情籌碼在目標與使用者最終同陣營時兩人各 +1', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'favor', userPlayerId: 'p1', targetPlayerId: 'p2', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const expediency = resolveExpediencyCards({ players: testPlayers, situation });

    expect(expediency.favorTargetByUserId.p1).toBe('p2');
    expect(expediency.expediencyDeltaByPlayerId.p1).toBe(1);
    expect(expediency.expediencyDeltaByPlayerId.p2).toBe(1);
  });

  it('共識依最終盟約人數給予 +1 或 -1', () => {
    const hitPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'consensus', userPlayerId: 'p1', isPublic: true } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const missPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'consensus', userPlayerId: 'p1', isPublic: true } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];

    expect(resolveExpediencyCards({ players: hitPlayers, situation: getRoundSituation(hitPlayers) }).expediencyDeltaByPlayerId.p1).toBe(1);
    expect(resolveExpediencyCards({ players: missPlayers, situation: getRoundSituation(missPlayers) }).expediencyDeltaByPlayerId.p1).toBe(-1);
  });

  it('手滑會 -1 並標記下次補牌額外 +1', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'slip', userPlayerId: 'p1', isPublic: true } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const expediency = resolveExpediencyCards({ players: testPlayers, situation });

    expect(expediency.expediencyDeltaByPlayerId.p1).toBe(-1);
    expect(expediency.expediencyDrawBonusByPlayerId.p1).toBe(1);
    expect(expediency.players[0].bonusDrawsNextDrawPhase).toBe(1);
  });

  it('雙數玄學在叛離人數為偶數時給予額外補牌', () => {
    const testPlayers = [
      makePlayer({ id: 'p1', chosenFaction: 'alliance', playedCard: { type: 'evenOmen', userPlayerId: 'p1', isPublic: false } }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'betrayal' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const situation = getRoundSituation(testPlayers);
    const expediency = resolveExpediencyCards({ players: testPlayers, situation });

    expect(expediency.expediencyDrawBonusByPlayerId.p1).toBe(1);
    expect(expediency.players[0].bonusDrawsNextDrawPhase).toBe(1);
  });

  it('雙數玄學在叛離人數為奇數時優先棄手牌，無手牌才 -1', () => {
    const discardPlayers = [
      makePlayer({
        id: 'p1',
        chosenFaction: 'alliance',
        hand: ['peek', 'shield'],
        playedCard: { type: 'evenOmen', userPlayerId: 'p1', isPublic: false }
      }),
      makePlayer({ id: 'p2', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p3', chosenFaction: 'alliance' }),
      makePlayer({ id: 'p4', chosenFaction: 'betrayal' })
    ];
    const noHandPlayers = discardPlayers.map((player) => (player.id === 'p1' ? { ...player, hand: [] } : player));

    const discarded = resolveExpediencyCards({ players: discardPlayers, situation: getRoundSituation(discardPlayers), rng: () => 0.6 });
    const noHand = resolveExpediencyCards({ players: noHandPlayers, situation: getRoundSituation(noHandPlayers) });

    expect(discarded.expediencyDiscardByPlayerId.p1).toBe('shield');
    expect(discarded.players[0].hand).toEqual(['peek']);
    expect(discarded.expediencyDeltaByPlayerId.p1).toBe(0);
    expect(noHand.expediencyDeltaByPlayerId.p1).toBe(-1);
  });
});
