import { describe, expect, it, vi } from 'vitest';
import { resolveChaosChoice, resolvePeekChoice } from './cardResolver';
import { isPublicFunctionCard } from './cardRules';
import { createRulesConfig } from './rulesConfig';
import { executeRoundJudgment } from './stateMachine';
import type { CardType, Faction, GameState, PlayerState } from './types';

function player(id: string, faction: Faction, cardType?: CardType, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id, name: id, isHuman: id === 'p1', judgmentPoints: 6, isEliminated: false,
    commitment: faction, chosenFaction: faction, judgedFaction: faction, hand: [],
    hasPlayedCardThisRound: Boolean(cardType),
    playedCard: cardType ? { type: cardType, userPlayerId: id, isPublic: isPublicFunctionCard(cardType) } : undefined,
    ...overrides
  };
}

function state(players: PlayerState[]): GameState {
  return { players, round: 1, phase: 'resolvePublicCards', dealerPlayerId: players[0].id, deck: [], discardPile: [], eventLog: [], roundResults: [] };
}

function report(resolved: GameState) {
  return resolved.roundResults.at(-1)!.cardReport!;
}

describe('功能牌戰報', () => {
  it('空白密令與先前出局者不會出現在戰報，也不會增加亂數呼叫', () => {
    const input = state([
      player('p1', 'alliance', undefined, { functionCardSelection: 'blank' }),
      player('p2', 'alliance'), player('p3', 'betrayal'),
      player('p4', 'alliance', 'counter', { isEliminated: true })
    ]);
    const rng = vi.fn(() => 0.3);
    const original = structuredClone(input);
    const resolved = executeRoundJudgment(input, rng);
    expect(report(resolved)).toEqual([]);
    expect(rng).not.toHaveBeenCalled();
    expect(input).toEqual(original);
    expect(input.roundResults).toEqual([]);
  });

  it.each([false, true])('真理之眼公開戰報只說明完成或改選，不公開私查目標與陣營：%s', (switchFaction) => {
    const input = state([player('p1', 'alliance', 'peek'), player('秘密目標', 'betrayal'), player('p3', 'alliance'), player('p4', 'alliance')]);
    const peeked = resolvePeekChoice(input, 'p1', '秘密目標', switchFaction);
    expect(peeked.peekedFaction).toBe('betrayal');
    const entry = report(executeRoundJudgment(peeked.state))[0];
    expect(entry.cardType).toBe('peek');
    expect(entry.targetPlayerId).toBeUndefined();
    expect(entry.summary).toContain(switchFaction ? '重新選擇陣營' : '完成');
    expect(JSON.stringify(entry)).not.toMatch(/秘密目標|叛離|盟約|betrayal/);
  });

  it('反擊記錄實際隨機選中的對象，不沿用出牌時的無效指定或重抽目標', () => {
    const user = player('p1', 'alliance', 'counter');
    user.playedCard!.targetPlayerId = 'p2';
    const rng = vi.fn(() => 0.99);
    const resolved = executeRoundJudgment(state([user, player('p2', 'betrayal'), player('p3', 'betrayal'), player('p4', 'alliance')]), rng);
    expect(report(resolved)[0].targetPlayerId).toBe('p3');
    expect(report(resolved)[0].summary).toContain('p3');
    expect(resolved.roundResults[0].counterDeltaByPlayerId.p3).toBe(-1);
    expect(resolved.roundResults[0].counterDeltaByPlayerId.p2).toBe(0);
    expect(rng).toHaveBeenCalledTimes(1);
  });

  it('多張鏡像共用目標時，戰報沿用實際交換權與隨機結果', () => {
    const rng = vi.fn(() => 0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    const resolved = executeRoundJudgment(state([
      player('p1', 'alliance', 'mirror'), player('p2', 'alliance', 'mirror'), player('p3', 'betrayal'), player('p4', 'alliance')
    ]), rng);
    expect(report(resolved).map((entry) => entry.targetPlayerId)).toEqual(['p3', 'p3']);
    expect(report(resolved)[0].summary).toContain('未取得交換權');
    expect(report(resolved)[1].summary).toContain('交換基礎結算');
    expect(rng).toHaveBeenCalledTimes(3);
  });

  it.each([
    { faction: 'alliance' as const, others: 'alliance' as const, reason: '本回合沒有叛離者' },
    { faction: 'betrayal' as const, others: 'alliance' as const, reason: '最終陣營不是盟約' },
    { faction: 'alliance' as const, others: 'betrayal' as const, reason: '沒有可減免的負基礎結算' }
  ])('庇護未觸發會交代原因：$reason', ({ faction, others, reason }) => {
    const resolved = executeRoundJudgment(state([player('p1', faction, 'shield'), player('p2', others), player('p3', others), player('p4', others)]));
    expect(report(resolved)[0].summary).toContain(reason);
  });

  it('反擊與鏡像沒有合法效果時，交代各自未觸發的原因', () => {
    const resolved = executeRoundJudgment(state([
      player('p1', 'alliance', 'counter'), player('p2', 'alliance', 'mirror'), player('p3', 'alliance'), player('p4', 'alliance')
    ]));
    expect(report(resolved).find((entry) => entry.cardType === 'counter')?.summary).toContain('本回合沒有叛離目標');
    expect(report(resolved).find((entry) => entry.cardType === 'mirror')?.summary).toContain('本回合不是少數叛離局勢');
  });

  it('混沌先交代實際目標，失效的暗牌不會被描述為一般未觸發', () => {
    const input = state([player('p1', 'alliance', 'chaos'), player('p2', 'alliance', 'counter'), player('p3', 'alliance'), player('p4', 'betrayal')]);
    const changed = resolveChaosChoice(input, 'p1', 'p2');
    const rng = vi.fn(() => 0.3);
    const entries = report(executeRoundJudgment(changed.state, rng));
    expect(entries.map((entry) => entry.cardType)).toEqual(['chaos', 'counter']);
    expect(entries[0].targetPlayerId).toBe('p2');
    expect(entries[0].summary).toContain('暗放功能牌已失效');
    expect(entries[1].summary).toContain('因 混沌 失效');
    expect(entries[1].targetPlayerId).toBeUndefined();
    expect(rng).not.toHaveBeenCalled();
  });

  it('宿命命中狀態使用解析結果，不從加扣分正負推算', () => {
    const hit = player('p1', 'alliance', 'fate');
    hit.playedCard!.fatePrediction = { kind: 'identity', targetPlayerId: 'p3', predictedFaction: 'betrayal' };
    const miss = player('p2', 'alliance', 'fate');
    miss.playedCard!.fatePrediction = { kind: 'majority', predictedMajority: 'betrayal' };
    const resolved = executeRoundJudgment(state([hit, miss, player('p3', 'betrayal'), player('p4', 'alliance')]), () => 0.3,
      createRulesConfig({ fateDeltas: { hit: -2, miss: 2 } }));
    expect(report(resolved)[0].summary).toContain('預言命中');
    expect(report(resolved)[0].summary).toContain('-2');
    expect(report(resolved)[0].targetPlayerId).toBe('p3');
    expect(report(resolved)[1].summary).toContain('預言落空');
    expect(report(resolved)[1].summary).toContain('+2');
  });

  it('賭命失敗展示實際棄牌；無手牌時明確說明跳過補牌', () => {
    const rng = vi.fn(() => 0.99);
    const resolved = executeRoundJudgment(state([
      player('p1', 'betrayal', 'gamble', { hand: ['shield', 'peek'] }), player('p2', 'betrayal', 'gamble'),
      player('p3', 'alliance'), player('p4', 'alliance')
    ]), rng);
    expect(report(resolved)[0].summary).toContain('棄掉 真理之眼');
    expect(report(resolved)[0].summary).toContain('未成為唯一叛離者');
    expect(report(resolved)[1].summary).toContain('本次跳過補牌');
    expect(resolved.players[0].hand).toEqual(['shield']);
    expect(resolved.discardPile).toContain('peek');
    expect(rng).toHaveBeenCalledTimes(1);
  });

  it('賭命成功由實際唯一叛離條件決定，不從分數正負推算', () => {
    const resolved = executeRoundJudgment(state([
      player('p1', 'betrayal', 'gamble'), player('p2', 'alliance'), player('p3', 'alliance'), player('p4', 'alliance')
    ]), () => 0.3, createRulesConfig({ gambleDeltas: { hit: -2, miss: 2 } }));
    expect(report(resolved)[0].summary).toContain('唯一叛離成立');
    expect(report(resolved)[0].summary).toContain('-2');
    expect(resolved.players[0].skipNextDraw).not.toBe(true);
  });

  it('戰報依公開效果再暗牌裁決排序，而不是依玩家座位排序', () => {
    const prophet = player('p1', 'alliance', 'fate');
    prophet.playedCard!.fatePrediction = { kind: 'majority', predictedMajority: 'alliance' };
    let input = state([prophet, player('p2', 'alliance', 'shield'), player('p3', 'alliance', 'chaos'), player('p4', 'alliance', 'peek')]);
    input = resolvePeekChoice(input, 'p4', 'p1', false).state;
    input = resolveChaosChoice(input, 'p3', 'p1').state;
    expect(report(executeRoundJudgment(input)).map((entry) => entry.cardType)).toEqual(['peek', 'chaos', 'shield', 'fate']);
  });
});
