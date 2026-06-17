import { useEffect, useState, type CSSProperties } from 'react';
import { MAX_ROUNDS, PHASE_LABELS } from '../game/constants';
import type { GameState } from '../game/types';
import { ActionPanel } from './ActionPanel';
import { backgroundImages } from './assetMap';
import { EventLog } from './EventLog';
import { GameResultPanel } from './GameResultPanel';
import { PhasePanel } from './PhasePanel';
import { PlayerPanel } from './PlayerPanel';
import { RoundSummaryPanel } from './RoundSummaryPanel';
import { RuleHelpPanel } from './RuleHelpPanel';
import { SimulatorPanel } from './SimulatorPanel';

interface GameBoardProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  onRestart: () => void;
}

const phaseTimerSeconds = {
  commitment: 30,
  discussion: 45,
  playCards: 60,
  resolvePublicCards: 20,
  reveal: 20,
  resolveJudgment: 25,
  drawCards: 15,
  roundEnd: 15,
  gameEnd: 0
} as const;

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const restSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${restSeconds}`;
}

export function GameBoard({ gameState, onGameStateChange, onRestart }: GameBoardProps) {
  const opponents = gameState.players.filter((player) => !player.isHuman);
  const [secondsLeft, setSecondsLeft] = useState<number>(phaseTimerSeconds[gameState.phase]);
  const battleShellStyle = { '--trial-room-bg': `url(${backgroundImages.trialRoom})` } as CSSProperties;
  const judgementTableStyle = { '--judgement-table-bg': `url(${backgroundImages.judgementTable})` } as CSSProperties;
  const maxRounds = gameState.maxRounds ?? MAX_ROUNDS;
  const hasRoundSummary = Boolean(gameState.previousRoundResult ?? gameState.roundResults.at(-1));

  useEffect(() => {
    setSecondsLeft(phaseTimerSeconds[gameState.phase]);
    if (gameState.phase === 'gameEnd') {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameState.phase, gameState.round]);

  return (
    <main className="battle-shell" style={battleShellStyle}>
      <header className="battle-hud" aria-label="對局 HUD">
        <div className="hud-brand">
          <span className="eyebrow">Prototype v0.8</span>
          <strong>審判困境 v2</strong>
        </div>
        <div className="hud-stat">
          <span>Round</span>
          <strong>
            {gameState.round} / {maxRounds}
          </strong>
        </div>
        <div className="hud-stat">
          <span>階段</span>
          <strong>{PHASE_LABELS[gameState.phase]}</strong>
        </div>
        <div className="hud-stat">
          <span>倒數</span>
          <strong>{formatTimer(secondsLeft)}</strong>
        </div>
        <div className="hud-stat">
          <span>牌庫</span>
          <strong>{gameState.deck.length}</strong>
        </div>
        <div className="hud-actions">
          <button className="hud-icon-button" type="button" title="設定尚未啟用" disabled>
            設定
          </button>
          <button className="hud-icon-button" type="button" onClick={onRestart}>
            重新開始
          </button>
        </div>
      </header>

      <section className="battle-screen">
        <section className="battlefield" aria-label="地下審判桌對局區">
          {opponents[0] ? (
            <PlayerPanel player={opponents[0]} dealerPlayerId={gameState.dealerPlayerId} phase={gameState.phase} seatPosition="top" />
          ) : null}
          {opponents[1] ? (
            <PlayerPanel player={opponents[1]} dealerPlayerId={gameState.dealerPlayerId} phase={gameState.phase} seatPosition="left" />
          ) : null}
          {opponents[2] ? (
            <PlayerPanel player={opponents[2]} dealerPlayerId={gameState.dealerPlayerId} phase={gameState.phase} seatPosition="right" />
          ) : null}
          <div className="battlefield-phase-panel">
            <PhasePanel gameState={gameState} />
          </div>
          <section className="judgement-table" style={judgementTableStyle} aria-hidden="true" />
          <ActionPanel gameState={gameState} onGameStateChange={onGameStateChange} />
          <GameResultPanel gameState={gameState} onRestart={onRestart} />
        </section>

        <aside className="right-rail" aria-label="審判紀錄">
          <EventLog events={gameState.eventLog} />
          <RuleHelpPanel />
          {hasRoundSummary ? (
            <details className="side-drawer round-summary-drawer">
              <summary>回合結算摘要</summary>
              <RoundSummaryPanel gameState={gameState} />
            </details>
          ) : null}
        </aside>
      </section>

      <SimulatorPanel />
    </main>
  );
}
