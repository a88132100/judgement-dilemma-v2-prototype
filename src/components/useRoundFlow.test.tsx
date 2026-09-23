import { act, StrictMode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame } from '../game/createGame';
import { advancePhase, completeHumanPlay, submitHumanCommitment } from '../game/stateMachine';
import type { CardType, GameState, RoundPhase } from '../game/types';
import { useRoundFlow } from './useRoundFlow';

const mountedRoots: Root[] = [];

function fixture(phase: RoundPhase, hand: CardType[] = []): GameState {
  const state = createGame(() => 0.37);
  return { ...state, phase, players: state.players.map((player) => ({ ...player, hand: player.isHuman ? hand : [] })) };
}

function mountFlow(initial: GameState) {
  const transitions: GameState[] = [];
  let snapshot = initial;
  let controller!: ReturnType<typeof useRoundFlow>;
  let replaceState!: (state: GameState) => void;
  let setPaused!: (value: boolean) => void;
  function Harness() {
    const [state, setState] = useState(initial);
    const [paused, pause] = useState(false);
    snapshot = state;
    replaceState = setState;
    setPaused = pause;
    controller = useRoundFlow({ gameState: state, paused, onGameStateChange: (next) => { transitions.push(next); setState(next); } });
    return null;
  }
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  mountedRoots.push(root);
  act(() => root.render(<StrictMode><Harness /></StrictMode>));
  return {
    transitions,
    state: () => snapshot,
    controller: () => controller,
    replace: (state: GameState) => act(() => replaceState(state)),
    pause: (value: boolean) => act(() => setPaused(value)),
    unmount: () => { act(() => root.unmount()); mountedRoots.splice(mountedRoots.indexOf(root), 1); }
  };
}

function tick(milliseconds: number) { act(() => vi.advanceTimersByTime(milliseconds)); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.37);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  for (const root of mountedRoots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
});

describe('自動回合流程', () => {
  it('StrictMode 完整一回合只結算及補牌一次，結算閱讀由外部控制', () => {
    const flow = mountFlow(fixture('commitment'));
    tick(20000);
    expect(flow.transitions).toHaveLength(0);
    flow.replace(submitHumanCommitment(flow.state(), 'alliance', () => 0.37));
    tick(600);
    expect(flow.state().phase).toBe('discussion');
    act(() => flow.controller().skipDiscussion());
    expect(flow.state().phase).toBe('fateDeclare');
    tick(400);
    expect(flow.state().players.every((player) => player.hasResolvedFateDeclaration)).toBe(true);
    tick(700);
    expect(flow.state().phase).toBe('playCards');
    tick(20000);
    expect(flow.state().phase).toBe('playCards');

    flow.replace(completeHumanPlay(flow.state(), { chosenFaction: 'alliance' }, () => 0.37));
    tick(600);
    expect(flow.state().phase).toBe('resolvePublicCards');
    tick(1200);
    expect(flow.state().phase).toBe('reveal');
    tick(2000);
    expect(flow.state().phase).toBe('resolveJudgment');
    expect(flow.state().roundResults).toHaveLength(1);
    const points = flow.state().players.map((player) => player.judgmentPoints);
    tick(30000);
    expect(flow.state().phase).toBe('resolveJudgment');
    expect(flow.state().players.map((player) => player.judgmentPoints)).toEqual(points);

    flow.replace(advancePhase(flow.state(), () => 0.37));
    expect(flow.state().phase).toBe('drawCards');
    tick(1200);
    expect(flow.state().phase).toBe('roundEnd');
    expect(flow.state().players.map((player) => player.hand.length)).toEqual([1, 1, 1, 1]);
    tick(500);
    expect(flow.state().phase).toBe('commitment');
    expect(flow.state().round).toBe(2);
    tick(20000);
    expect(flow.state().roundResults).toHaveLength(1);
    expect(flow.state().players.map((player) => player.hand.length)).toEqual([1, 1, 1, 1]);
    expect(flow.transitions.filter((state) => state.phase === 'resolveJudgment')).toHaveLength(1);
    expect(flow.transitions.filter((state) => state.phase === 'roundEnd')).toHaveLength(1);
  });

  it.each(['fate', 'peek', 'chaos'] as const)('%s 待玩家決定時不自動略過', (card) => {
    const phase = card === 'fate' ? 'fateDeclare' : 'resolvePublicCards';
    const state = fixture(phase, [card]);
    if (card !== 'fate') {
      state.players[0] = { ...state.players[0], chosenFaction: 'alliance', judgedFaction: 'alliance', playedCard: { type: card, userPlayerId: state.players[0].id, isPublic: true } };
    }
    const flow = mountFlow(state);
    tick(60000);
    expect(flow.transitions).toHaveLength(0);
    expect(flow.state()).toBe(state);
  });

  it('Bot 逐句發言，暫停保留剩餘時間，連續略過不會跳過兩個階段', () => {
    const flow = mountFlow(fixture('discussion', ['fate']));
    tick(1500);
    tick(3500);
    expect(flow.controller().speechIndex).toBe(1);
    tick(1000);
    act(() => flow.controller().toggleDiscussionPause());
    tick(20000);
    expect(flow.controller().speechIndex).toBe(1);
    act(() => flow.controller().toggleDiscussionPause());
    tick(2499);
    expect(flow.controller().speechIndex).toBe(1);
    tick(1);
    expect(flow.controller().speechIndex).toBe(2);
    act(() => { flow.controller().skipDiscussion(); flow.controller().skipDiscussion(); });
    expect(flow.transitions).toHaveLength(1);
    expect(flow.state().phase).toBe('fateDeclare');
    tick(20000);
    expect(flow.state().phase).toBe('fateDeclare');
  });

  it('先完整顯示階段銘牌，之後三位 Bot 各有完整 3500ms 發言時間', () => {
    const flow = mountFlow(fixture('discussion', ['fate']));
    expect(flow.controller().announcementVisible).toBe(true);
    tick(1499);
    expect(flow.controller().announcementVisible).toBe(true);
    expect(flow.controller().speechIndex).toBe(0);
    expect(flow.transitions).toHaveLength(0);
    tick(1);
    expect(flow.controller().announcementVisible).toBe(false);
    for (let index = 0; index < 3; index += 1) {
      tick(3499);
      expect(flow.controller().speechIndex).toBe(index);
      expect(flow.state().phase).toBe('discussion');
      tick(1);
    }
    expect(flow.transitions).toHaveLength(1);
    expect(flow.state().phase).toBe('fateDeclare');
  });

  it('承諾銘牌已退場後進入發言，仍重新顯示銘牌再開始第一句', () => {
    const flow = mountFlow(fixture('commitment', ['fate']));
    tick(2000);
    expect(flow.controller().announcementVisible).toBe(false);
    flow.replace(submitHumanCommitment(flow.state(), 'alliance', () => 0.37));
    tick(600);
    expect(flow.state().phase).toBe('discussion');
    expect(flow.controller().announcementVisible).toBe(true);
    tick(1500);
    expect(flow.controller().announcementVisible).toBe(false);
    tick(3499);
    expect(flow.controller().speechIndex).toBe(0);
    tick(1);
    expect(flow.controller().speechIndex).toBe(1);
  });

  it('銘牌等待期間開啟視窗或隱藏分頁會暫停，恢復後第一句仍有完整閱讀時間', () => {
    const flow = mountFlow(fixture('discussion', ['fate']));
    tick(600);
    flow.pause(true);
    expect(flow.controller().announcementPaused).toBe(true);
    tick(20000);
    expect(flow.controller().announcementVisible).toBe(true);
    flow.pause(false);
    tick(400);
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    tick(20000);
    expect(flow.controller().announcementVisible).toBe(true);
    expect(flow.controller().speechIndex).toBe(0);
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    tick(499);
    expect(flow.controller().announcementVisible).toBe(true);
    tick(1);
    expect(flow.controller().announcementVisible).toBe(false);
    expect(flow.controller().announcementPaused).toBe(false);
    tick(3499);
    expect(flow.controller().speechIndex).toBe(0);
    tick(1);
    expect(flow.controller().speechIndex).toBe(1);
  });

  it('銘牌等待期間略過、重開或卸載都不留下舊發言排程', () => {
    const flow = mountFlow(fixture('discussion', ['fate']));
    tick(500);
    act(() => { flow.controller().skipDiscussion(); flow.controller().skipDiscussion(); });
    expect(flow.transitions).toHaveLength(1);
    tick(20000);
    expect(flow.state().phase).toBe('fateDeclare');
    expect(flow.transitions).toHaveLength(1);

    flow.replace({ ...fixture('discussion', ['fate']), round: 2 });
    tick(600);
    const restarted = fixture('commitment', ['fate']);
    flow.replace(restarted);
    tick(20000);
    expect(flow.state()).toBe(restarted);
    expect(flow.transitions).toHaveLength(1);
    flow.replace(fixture('discussion', ['fate']));
    tick(600);
    flow.unmount();
    tick(20000);
    expect(flow.transitions).toHaveLength(1);
  });

  it('外部視窗和隱藏分頁都凍結計時，恢復後只用剩餘時間', () => {
    const flow = mountFlow(fixture('drawCards'));
    tick(400);
    flow.pause(true);
    tick(20000);
    expect(flow.transitions).toHaveLength(0);
    flow.pause(false);
    tick(300);
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    tick(20000);
    expect(flow.transitions).toHaveLength(0);
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    tick(499);
    expect(flow.transitions).toHaveLength(0);
    tick(1);
    expect(flow.state().phase).toBe('roundEnd');
    expect(flow.transitions).toHaveLength(1);
  });

  it('重開、終局與卸載清除舊排程，不把上一局補牌寫回新局', () => {
    const flow = mountFlow(fixture('drawCards'));
    tick(600);
    const restarted = fixture('commitment');
    flow.replace(restarted);
    tick(20000);
    expect(flow.state()).toBe(restarted);
    expect(flow.transitions).toHaveLength(0);
    flow.replace({ ...fixture('roundEnd'), phase: 'gameEnd', gameOverReason: 'judgmentWin' });
    tick(20000);
    expect(flow.state().phase).toBe('gameEnd');
    expect(flow.transitions).toHaveLength(0);
    flow.replace(fixture('drawCards'));
    flow.unmount();
    tick(20000);
    expect(flow.transitions).toHaveLength(0);
  });

  it('真人已淘汰仍完成 Bot 的承諾、宿命與出牌，然後交給既有公開解析', () => {
    const initial = fixture('commitment');
    initial.players[0] = { ...initial.players[0], isEliminated: true, judgmentPoints: 0 };
    const flow = mountFlow(initial);
    tick(400);
    expect(flow.state().players.slice(1).every((player) => player.commitment)).toBe(true);
    tick(600);
    expect(flow.state().phase).toBe('discussion');
    act(() => flow.controller().skipDiscussion());
    tick(400);
    expect(flow.state().players.slice(1).every((player) => player.hasResolvedFateDeclaration)).toBe(true);
    tick(700);
    expect(flow.state().phase).toBe('playCards');
    tick(400);
    expect(flow.state().players.slice(1).every((player) => player.judgedFaction)).toBe(true);
    tick(600);
    expect(flow.state().phase).toBe('resolvePublicCards');
    expect(flow.state().players[0]).toEqual(initial.players[0]);
    expect(flow.state().roundResults).toHaveLength(0);
  });
});
