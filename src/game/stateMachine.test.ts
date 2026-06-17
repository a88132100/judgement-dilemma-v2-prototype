import { describe, expect, it } from 'vitest';
import { canUseCardWithFaction } from './cardRules';
import { createGame } from './createGame';
import { completeHumanPlay, submitHumanCommitment } from './stateMachine';
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
    const state = playReadyGame();
    const human = state.players[0];
    const missingCard = human.hand.includes('counter') ? 'fate' : 'counter';
    const nextState = completeHumanPlay(state, {
      chosenFaction: 'alliance',
      card: { type: missingCard }
    });

    expect(nextState.players[0].chosenFaction).toBeUndefined();
    expect(nextState.eventLog.at(-1)).toContain('手牌中沒有');
  });

  it('每回合不能使用超過 1 張功能牌', () => {
    const state = playReadyGame();
    const humanCard = state.players[0].hand[0];
    const alreadyPlayed = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hasPlayedCardThisRound: true,
              playedCard: { type: humanCard, userPlayerId: player.id, isPublic: humanCard === 'fate' || humanCard === 'peek' }
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

  it('窺探可搭配任一陣營使用', () => {
    expect(canUseCardWithFaction('peek', 'alliance')).toBe(true);
    expect(canUseCardWithFaction('peek', 'betrayal')).toBe(true);
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
