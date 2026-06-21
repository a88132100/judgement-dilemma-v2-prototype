import { describe, expect, it } from 'vitest';
import { canUseCardWithFaction } from './cardRules';
import { PUBLIC_CARD_RESOLVE_ORDER } from './constants';
import { createGame } from './createGame';
import { advancePhase, completeHumanPlay, submitHumanCommitment, submitHumanFateDeclaration } from './stateMachine';
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
    expect(PUBLIC_CARD_RESOLVE_ORDER).toEqual(['peek']);
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
  });
});
