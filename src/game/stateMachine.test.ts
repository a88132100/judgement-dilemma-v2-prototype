import { describe, expect, it, vi } from 'vitest';
import { canUseCardWithFaction } from './cardRules';
import { PUBLIC_CARD_RESOLVE_ORDER } from './constants';
import { createGame } from './createGame';
import { advancePhase, completeEliminatedHumanTurn, completeHumanPlay, submitHumanCommitment, submitHumanFateDeclaration } from './stateMachine';
import type { CardType, GameState } from './types';

function playReadyGame() {
  const committed = submitHumanCommitment(createGame(() => 0), 'alliance');
  return { ...committed, phase: 'playCards' as const };
}

function withHumanHand(state: GameState, hand: CardType[]): GameState {
  return {
    ...state,
    players: state.players.map((player) => (player.isHuman ? { ...player, hand } : player))
  };
}

describe('真人出局後的 Bot 回合', () => {
  it('補齊三個決策階段且不重抽 Bot 策略、不影響出局玩家或提前結算', () => {
    const initial = createGame(() => 0.37);
    const eliminated: GameState = {
      ...initial,
      players: initial.players.map((player) => player.isHuman
        ? { ...player, isEliminated: true, judgmentPoints: 0 }
        : { ...player, hand: ['fate', 'shield'] })
    };
    const rng = vi.fn(() => 0.37);
    const committed = completeEliminatedHumanTurn(eliminated, rng);
    expect(committed.players.slice(1).every((player) => player.commitment)).toBe(true);
    const commitmentCalls = rng.mock.calls.length;
    expect(completeEliminatedHumanTurn(committed, rng)).toBe(committed);
    expect(rng).toHaveBeenCalledTimes(commitmentCalls);

    const declaration = advancePhase(advancePhase(committed, rng), rng);
    expect(declaration.phase).toBe('fateDeclare');
    const declared = completeEliminatedHumanTurn(declaration, rng);
    expect(declared.players.slice(1).every((player) => player.hasResolvedFateDeclaration)).toBe(true);
    const fateCalls = rng.mock.calls.length;
    expect(completeEliminatedHumanTurn(declared, rng)).toBe(declared);
    expect(rng).toHaveBeenCalledTimes(fateCalls);

    const played = completeEliminatedHumanTurn(advancePhase(declared, rng), rng);
    expect(played.players.slice(1).every((player) => player.chosenFaction && player.judgedFaction)).toBe(true);
    const playCalls = rng.mock.calls.length;
    expect(completeEliminatedHumanTurn(played, rng)).toBe(played);
    expect(rng).toHaveBeenCalledTimes(playCalls);
    expect(played.players[0]).toEqual(eliminated.players[0]);
    expect(played.players.map((player) => player.judgmentPoints)).toEqual([0, 6, 6, 6]);
    expect(played.roundResults).toHaveLength(0);
  });

  it('真人仍存活、非決策階段或已終局時不會代替玩家操作', () => {
    const initial = createGame(() => 0.37);
    const rng = vi.fn(() => 0.37);
    expect(completeEliminatedHumanTurn(initial, rng)).toBe(initial);
    const eliminated: GameState = { ...initial, phase: 'reveal', players: initial.players.map((player) => ({ ...player, isEliminated: player.isHuman })) };
    expect(completeEliminatedHumanTurn(eliminated, rng)).toBe(eliminated);
    const ended: GameState = { ...eliminated, phase: 'commitment', gameOverReason: 'maxRounds' };
    expect(completeEliminatedHumanTurn(ended, rng)).toBe(ended);
    expect(rng).not.toHaveBeenCalled();
  });
});

describe('stateMachine core validation', () => {
  it('非法出牌不應破壞 GameState', () => {
    const state = playReadyGame();
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'alliance',
      card: { type: 'fate' }
    });

    expect(nextState.players[0].chosenFaction).toBeUndefined();
    expect(nextState.players[0].playedCard).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('操作無效');
  });

  it('不在手牌中的牌不能被使用', () => {
    const state = withHumanHand(playReadyGame(), ['shield']);
    const missingCard = 'counter';
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'alliance',
      card: { type: missingCard }
    });

    expect(nextState.players[0].chosenFaction).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('手牌中沒有');
  });

  it('每回合不能使用超過 1 張功能牌', () => {
    const humanCard: CardType = 'shield';
    const state = withHumanHand(playReadyGame(), [humanCard]);
    const alreadyPlayed = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hasPlayedCardThisRound: true,
              playedCard: { type: humanCard, userPlayerId: player.id, isPublic: false }
            }
          : player
      )
    };
    const nextState = completeHumanPlay(alreadyPlayed, {
      chosenFaction: 'alliance',
      card: { type: humanCard }
    });

    expect(nextState.players[0].chosenFaction).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('最多只能使用 1 張');
  });

  it('合法出牌會同時設定 chosenFaction 與 judgedFaction', () => {
    const state = playReadyGame();
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'betrayal'
    });

    expect(nextState.players[0].chosenFaction).toBe('betrayal');
    expect(nextState.players[0].judgedFaction).toBe('betrayal');
  });
  it('叛離陣營不能使用庇護', () => {
    const state = withHumanHand(playReadyGame(), ['shield']);
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'betrayal',
      card: { type: 'shield' }
    });

    expect(nextState.players[0].chosenFaction).toBeUndefined();
    expect(nextState.players[0].playedCard).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('操作無效');
  });

  it('叛離陣營不能使用反擊', () => {
    const state = withHumanHand(playReadyGame(), ['counter']);
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'betrayal',
      card: { type: 'counter' }
    });

    expect(nextState.players[0].chosenFaction).toBeUndefined();
    expect(nextState.players[0].playedCard).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('操作無效');
  });

  it('合作陣營可以使用庇護', () => {
    const state = withHumanHand(playReadyGame(), ['shield']);
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'alliance',
      card: { type: 'shield' }
    });

    expect(nextState.players[0].chosenFaction).toBe('alliance');
    expect(nextState.players[0].playedCard?.type).toBe('shield');
  });

  it('合作陣營可以使用反擊', () => {
    const state = withHumanHand(playReadyGame(), ['counter']);
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'alliance',
      card: { type: 'counter' }
    });

    expect(nextState.players[0].chosenFaction).toBe('alliance');
    expect(nextState.players[0].playedCard?.type).toBe('counter');
  });

  it('宿命可搭配任一陣營使用', () => {
    expect(canUseCardWithFaction('fate', 'alliance')).toBe(true);
    expect(canUseCardWithFaction('fate', 'betrayal')).toBe(true);
  });

  it('宿命會在發言後、出牌前進入宣告階段', () => {
    const committed = submitHumanCommitment(createGame(() => 0), 'alliance');
    const discussion = advancePhase(committed);
    const fateDeclare = advancePhase(discussion);

    expect(discussion.phase).toBe('discussion');
    expect(fateDeclare.phase).toBe('fateDeclare');
  });

  it('宿命不在公開型功能牌觸發順序中', () => {
    expect(PUBLIC_CARD_RESOLVE_ORDER).toEqual(['peek', 'chaos', 'smallGain', 'promiseTax', 'consensus', 'slip']);
  });

  it('使用宿命後，該玩家本回合不能再使用其他功能牌', () => {
    const state = withHumanHand({ ...playReadyGame(), phase: 'fateDeclare' }, ['fate', 'shield']);
    const declared = submitHumanFateDeclaration(state, {
      useFate: true,
      fatePrediction: { kind: 'majority', predictedMajority: 'alliance' }
    });
    const playState = advancePhase(declared);
    const nextState = completeHumanPlay(playState, {
      chosenFaction: 'alliance',
      card: { type: 'shield' }
    });

    expect(declared.players[0].playedCard?.type).toBe('fate');
    expect(declared.players[0].hasPlayedCardThisRound).toBe(true);
    expect(nextState.players[0].chosenFaction).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('最多只能使用 1 張');
  });

  it('出牌階段不能才使用宿命', () => {
    const state = withHumanHand(playReadyGame(), ['fate']);
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'alliance',
      card: { type: 'fate' }
    });

    expect(nextState.players[0].chosenFaction).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('宿命只能在宿命宣告階段使用');
  });

  it('真理之眼可搭配任一陣營使用', () => {
    expect(canUseCardWithFaction('peek', 'alliance')).toBe(true);
    expect(canUseCardWithFaction('peek', 'betrayal')).toBe(true);
  });

  it('混沌可搭配任一陣營使用', () => {
    expect(canUseCardWithFaction('chaos', 'alliance')).toBe(true);
    expect(canUseCardWithFaction('chaos', 'betrayal')).toBe(true);
  });

  it('公開型權宜牌在出牌時會被標記為公開牌', () => {
    const state = withHumanHand(playReadyGame(), ['smallGain']);
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'alliance',
      card: { type: 'smallGain' }
    });

    expect(nextState.players[0].playedCard?.type).toBe('smallGain');
    expect(nextState.players[0].playedCard?.isPublic).toBe(true);
  });

  it('鏡像只能搭配合作陣營使用', () => {
    expect(canUseCardWithFaction('mirror', 'alliance')).toBe(true);
    expect(canUseCardWithFaction('mirror', 'betrayal')).toBe(false);
  });

  it('賭命只能搭配背叛陣營使用', () => {
    expect(canUseCardWithFaction('gamble', 'alliance')).toBe(false);
    expect(canUseCardWithFaction('gamble', 'betrayal')).toBe(true);
  });

  it('真理之眼在出牌階段不需要先指定目標', () => {
    const state = withHumanHand(playReadyGame(), ['peek']);
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'betrayal',
      card: { type: 'peek' }
    });

    expect(nextState.players[0].chosenFaction).toBe('betrayal');
    expect(nextState.players[0].playedCard?.type).toBe('peek');
    expect(nextState.players[0].playedCard?.targetPlayerId).toBeUndefined();
  });

  it('不使用功能牌時 playedCard 會是 undefined', () => {
    const state = withHumanHand(playReadyGame(), ['fate']);
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'betrayal'
    });

    expect(nextState.players[0].chosenFaction).toBe('betrayal');
    expect(nextState.players[0].playedCard).toBeUndefined();
    expect(nextState.players[0].functionCardSelection).toBe('blank');
    expect(nextState.eventLog.at(-1)).toContain('暗放 1 張密令');
  });

  it('每位玩家每場遊戲最多只能使用 1 次賭命', () => {
    const state = withHumanHand(playReadyGame(), ['gamble']);
    const usedGamble = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hasUsedGambleThisGame: true
            }
          : player
      )
    };
    const nextState = completeHumanPlay(usedGamble, {
      chosenFaction: 'betrayal',
      card: { type: 'gamble' }
    });

    expect(nextState.players[0].playedCard).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('最多只能使用 1 次賭命');
  });
});

describe('stateMachine elimination flow', () => {
  it('reveal 結算後若只剩 1 名未出局玩家，會直接進入 gameEnd', () => {
    const state = {
      players: [
        {
          id: 'p1',
          name: '玩家 1',
          isHuman: true,
          judgmentPoints: 1,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'betrayal',
          judgedFaction: 'betrayal',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p2',
          name: '玩家 2',
          isHuman: false,
          botPersonality: 'honest',
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        }
      ],
      round: 1,
      maxRounds: 10,
      phase: 'reveal',
      dealerPlayerId: 'p1',
      deck: [],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;

    const nextState = advancePhase(state);

    expect(nextState.phase).toBe('gameEnd');
    expect(nextState.gameOverReason).toBe('allButOneEliminated');
    expect(nextState.players[0].isEliminated).toBe(true);
    expect(nextState.winnerPlayerIds).toEqual(['p2']);
  });
});

describe('stateMachine Alpha 2A card flow', () => {
  it('混沌在完整裁決流程中會反轉目標、讓暗放牌失效，並套用承諾豁免', () => {
    const state = {
      players: [
        {
          id: 'p1',
          name: '玩家 1',
          isHuman: true,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          playedCard: { type: 'chaos', userPlayerId: 'p1', targetPlayerId: 'p2', isPublic: true },
          functionCardSelection: 'chaos',
          hasPlayedCardThisRound: true,
          hasResolvedChaos: true
        },
        {
          id: 'p2',
          name: '玩家 2',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          playedCard: { type: 'shield', userPlayerId: 'p2', isPublic: false },
          functionCardSelection: 'shield',
          hasPlayedCardThisRound: true,
          chaosTargetedThisRound: true
        },
        {
          id: 'p3',
          name: '玩家 3',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p4',
          name: '玩家 4',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'betrayal',
          chosenFaction: 'betrayal',
          judgedFaction: 'betrayal',
          hand: [],
          hasPlayedCardThisRound: false
        }
      ],
      round: 1,
      maxRounds: 10,
      phase: 'reveal',
      dealerPlayerId: 'p1',
      deck: [],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;

    const nextState = advancePhase(state);
    const result = nextState.roundResults.at(-1);
    const target = nextState.players.find((player) => player.id === 'p2');

    expect(target?.judgedFaction).toBe('betrayal');
    expect(target?.disabledFunctionCardThisRound).toBe(true);
    expect(result?.shieldDeltaByPlayerId.p2).toBe(0);
    expect(result?.commitmentDeltaByPlayerId.p2).toBe(0);
  });

  it('鏡像在完整裁決流程中會交換基礎結算並反映到最終總分', () => {
    const state = {
      players: [
        {
          id: 'p1',
          name: '玩家 1',
          isHuman: true,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          playedCard: { type: 'mirror', userPlayerId: 'p1', isPublic: false },
          functionCardSelection: 'mirror',
          hasPlayedCardThisRound: true
        },
        {
          id: 'p2',
          name: '玩家 2',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p3',
          name: '玩家 3',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p4',
          name: '玩家 4',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'betrayal',
          chosenFaction: 'betrayal',
          judgedFaction: 'betrayal',
          hand: [],
          hasPlayedCardThisRound: false
        }
      ],
      round: 1,
      maxRounds: 10,
      phase: 'reveal',
      dealerPlayerId: 'p1',
      deck: [],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;

    const nextState = advancePhase(state, () => 0);
    const result = nextState.roundResults.at(-1);

    expect(result?.baseDeltaByPlayerId.p1).toBe(-1);
    expect(result?.adjustedBaseDeltaByPlayerId.p1).toBe(2);
    expect(result?.adjustedBaseDeltaByPlayerId.p4).toBe(-1);
    expect(result?.mirrorDeltaByPlayerId.p1).toBe(3);
    expect(result?.finalDeltaByPlayerId.p1).toBe(3);
    expect(nextState.players.find((player) => player.id === 'p1')?.judgmentPoints).toBe(9);
  });

  it('賭命失敗且無手牌可棄時，完整流程會跳過本次補牌', () => {
    const state = {
      players: [
        {
          id: 'p1',
          name: '玩家 1',
          isHuman: true,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'betrayal',
          chosenFaction: 'betrayal',
          judgedFaction: 'betrayal',
          hand: [],
          playedCard: { type: 'gamble', userPlayerId: 'p1', isPublic: false },
          functionCardSelection: 'gamble',
          hasPlayedCardThisRound: true,
          hasUsedGambleThisGame: true
        },
        {
          id: 'p2',
          name: '玩家 2',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'betrayal',
          chosenFaction: 'betrayal',
          judgedFaction: 'betrayal',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p3',
          name: '玩家 3',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p4',
          name: '玩家 4',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        }
      ],
      round: 1,
      maxRounds: 10,
      phase: 'reveal',
      dealerPlayerId: 'p1',
      deck: ['peek', 'shield', 'counter', 'mirror'],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;

    const resolved = advancePhase(state);
    const result = resolved.roundResults.at(-1);
    const drawPhase = advancePhase(resolved);
    const roundEnd = advancePhase(drawPhase);
    const human = roundEnd.players.find((player) => player.id === 'p1');

    expect(result?.gambleDeltaByPlayerId.p1).toBe(-2);
    expect(resolved.players.find((player) => player.id === 'p1')?.skipNextDraw).toBe(true);
    expect(human?.skipNextDraw).toBe(false);
    expect(human?.hand).toEqual([]);
    expect(roundEnd.eventLog).toContain('玩家 1 因賭命失敗，本次跳過補牌。');
  });
});

describe('stateMachine Alpha 2B expediency flow', () => {
  it('撿角在完整裁決流程中會進入權宜牌修正與最終總分', () => {
    const state = {
      players: [
        {
          id: 'p1',
          name: '玩家 1',
          isHuman: true,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          playedCard: { type: 'smallGain', userPlayerId: 'p1', isPublic: true },
          functionCardSelection: 'smallGain',
          hasPlayedCardThisRound: true
        },
        {
          id: 'p2',
          name: '玩家 2',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p3',
          name: '玩家 3',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'betrayal',
          chosenFaction: 'betrayal',
          judgedFaction: 'betrayal',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p4',
          name: '玩家 4',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'betrayal',
          chosenFaction: 'betrayal',
          judgedFaction: 'betrayal',
          hand: [],
          hasPlayedCardThisRound: false
        }
      ],
      round: 1,
      maxRounds: 10,
      phase: 'reveal',
      dealerPlayerId: 'p1',
      deck: [],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;

    const nextState = advancePhase(state);
    const result = nextState.roundResults.at(-1);

    expect(result?.expediencyDeltaByPlayerId.p1).toBe(1);
    expect(result?.finalDeltaByPlayerId.p1).toBe(1);
    expect(nextState.players.find((player) => player.id === 'p1')?.judgmentPoints).toBe(7);
  });

  it('手滑在完整流程中會扣分，並於抽牌階段額外補牌但不突破手牌上限', () => {
    const state = {
      players: [
        {
          id: 'p1',
          name: '玩家 1',
          isHuman: true,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          playedCard: { type: 'slip', userPlayerId: 'p1', isPublic: true },
          functionCardSelection: 'slip',
          hasPlayedCardThisRound: true
        },
        {
          id: 'p2',
          name: '玩家 2',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p3',
          name: '玩家 3',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        },
        {
          id: 'p4',
          name: '玩家 4',
          isHuman: false,
          judgmentPoints: 6,
          isEliminated: false,
          commitment: 'alliance',
          chosenFaction: 'alliance',
          judgedFaction: 'alliance',
          hand: [],
          hasPlayedCardThisRound: false
        }
      ],
      round: 1,
      maxRounds: 10,
      phase: 'reveal',
      dealerPlayerId: 'p1',
      deck: ['peek', 'shield', 'counter', 'mirror', 'chaos'],
      discardPile: [],
      eventLog: [],
      roundResults: []
    } as GameState;

    const resolved = advancePhase(state);
    const result = resolved.roundResults.at(-1);
    const drawPhase = advancePhase(resolved);
    const roundEnd = advancePhase(drawPhase);
    const human = roundEnd.players.find((player) => player.id === 'p1');

    expect(result?.expediencyDeltaByPlayerId.p1).toBe(-1);
    expect(resolved.players.find((player) => player.id === 'p1')?.bonusDrawsNextDrawPhase).toBe(1);
    expect(human?.hand).toHaveLength(2);
    expect(human?.bonusDrawsNextDrawPhase).toBeUndefined();
    expect(roundEnd.eventLog).toContain('玩家 1 補 2 張功能牌（含權宜牌額外補牌）。');
  });
});
