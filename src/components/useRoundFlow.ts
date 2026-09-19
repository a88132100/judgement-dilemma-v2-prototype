import { useEffect, useRef, useState } from 'react';
import { hasPendingHumanChaosResolution, hasPendingHumanPeekResolution } from '../game/cardResolver';
import { advancePhase, completeEliminatedHumanTurn, submitHumanFateDeclaration } from '../game/stateMachine';
import type { GameState } from '../game/types';

type FlowAction = 'advance' | 'skipFate' | 'completeBots' | 'nextSpeech';

interface FlowStep {
  action: FlowAction;
  delay: number;
  key: string;
}

interface FlowTicket {
  state: GameState;
  key: string;
  remaining: number;
  done: boolean;
}

interface RoundFlowOptions {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  paused?: boolean;
}

function nextFlowStep(state: GameState, speechIndex: number): FlowStep | undefined {
  if (state.phase === 'gameEnd' || state.gameOverReason) return undefined;
  const activePlayers = state.players.filter((player) => !player.isEliminated);
  const human = activePlayers.find((player) => player.isHuman);
  const step = (action: FlowAction, delay: number, key: string = action): FlowStep => ({ action, delay, key });

  if (state.phase === 'commitment') {
    if (activePlayers.every((player) => player.commitment)) return step('advance', 600);
    if (!human) return step('completeBots', 400);
  } else if (state.phase === 'discussion') {
    const speechCount = activePlayers.filter((player) => !player.isHuman).length;
    return speechIndex + 1 < speechCount ? step('nextSpeech', 3500, `speech-${speechIndex}`) : step('advance', speechCount ? 3500 : 300);
  } else if (state.phase === 'fateDeclare') {
    if (activePlayers.every((player) => player.hasResolvedFateDeclaration)) return step('advance', 700);
    if (!human) return step('completeBots', 400);
    if (!human.hasResolvedFateDeclaration && !human.hand.includes('fate')) return step('skipFate', 400);
  } else if (state.phase === 'playCards') {
    if (activePlayers.every((player) => player.judgedFaction)) return step('advance', 600);
    if (!human) return step('completeBots', 400);
  } else if (state.phase === 'resolvePublicCards') {
    if (!hasPendingHumanPeekResolution(state) && !hasPendingHumanChaosResolution(state)) return step('advance', 1200);
  } else if (state.phase === 'reveal') {
    return step('advance', 2000);
  } else if (state.phase === 'drawCards') {
    return step('advance', 1200);
  } else if (state.phase === 'roundEnd') {
    return step('advance', 500);
  }
  // 結算由結果視窗掌握閱讀時間，不在此自動離開。
  return undefined;
}

export function useRoundFlow({ gameState, onGameStateChange, paused = false }: RoundFlowOptions) {
  const [speechIndex, setSpeechIndex] = useState(0);
  const [discussionPaused, setDiscussionPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(() => document.hidden);
  const [announcementVisible, setAnnouncementVisible] = useState(gameState.phase !== 'gameEnd');
  const stopped = paused || documentHidden || (gameState.phase === 'discussion' && discussionPaused);
  const latestRef = useRef({ gameState, onGameStateChange, paused, documentHidden, stopped });
  latestRef.current = { gameState, onGameStateChange, paused, documentHidden, stopped };
  const ticketRef = useRef<FlowTicket | undefined>(undefined);

  useEffect(() => {
    const handleVisibility = () => setDocumentHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    setSpeechIndex(0);
    setDiscussionPaused(false);
    setAnnouncementVisible(gameState.phase !== 'gameEnd');
    const timeout = window.setTimeout(() => setAnnouncementVisible(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [gameState.round, gameState.phase]);

  const step = nextFlowStep(gameState, speechIndex);
  const isPaused = paused || documentHidden || (gameState.phase === 'discussion' && discussionPaused);

  useEffect(() => {
    if (!step) {
      ticketRef.current = undefined;
      return;
    }
    let ticket = ticketRef.current;
    if (!ticket || ticket.state !== gameState || ticket.key !== step.key) {
      ticket = { state: gameState, key: step.key, remaining: step.delay, done: false };
      ticketRef.current = ticket;
    }
    if (isPaused || ticket.done) return;
    const activeTicket = ticket;
    const startedAt = performance.now();
    const timeout = window.setTimeout(() => {
      const latest = latestRef.current;
      // 排程只可作用於原來那份對局；重開、重渲染與略過發言都不能讓舊回呼重入。
      if (activeTicket.done || latest.gameState !== gameState || latest.stopped || document.hidden) return;
      activeTicket.done = true;
      if (step.action === 'nextSpeech') {
        setSpeechIndex((current) => current + 1);
        return;
      }
      const nextState = step.action === 'skipFate'
        ? submitHumanFateDeclaration(gameState, { useFate: false })
        : step.action === 'completeBots'
          ? completeEliminatedHumanTurn(gameState)
          : advancePhase(gameState);
      if (nextState !== gameState) latest.onGameStateChange(nextState);
    }, activeTicket.remaining);
    return () => {
      window.clearTimeout(timeout);
      if (!activeTicket.done) activeTicket.remaining = Math.max(0, activeTicket.remaining - (performance.now() - startedAt));
    };
  }, [gameState, step?.key, step?.action, step?.delay, isPaused]);

  function skipDiscussion() {
    const latest = latestRef.current;
    if (latest.gameState.phase !== 'discussion' || latest.paused || latest.documentHidden) return;
    const ticket = ticketRef.current;
    if (ticket?.state === latest.gameState && ticket.done) return;
    if (ticket) ticket.done = true;
    latest.onGameStateChange(advancePhase(latest.gameState));
  }

  return {
    speechIndex,
    discussionPaused,
    announcementVisible,
    skipDiscussion,
    toggleDiscussionPause: () => setDiscussionPaused((current) => !current)
  };
}
