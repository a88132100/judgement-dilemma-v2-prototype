import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MAX_ROUNDS, PHASE_LABELS, ROUND_PHASES } from '../game/constants';
import type { GameState, RoundPhase, RoundResult } from '../game/types';
import tribunalScene from '../assets/backgrounds/bg_tribunal_board_v3.png';
import { ActionPanel } from './ActionPanel';
import { EventLog } from './EventLog';
import { GameResultPanel } from './GameResultPanel';
import { PlayerPanel } from './PlayerPanel';
import { RoundSummaryPanel } from './RoundSummaryPanel';
import { TableSeatSlots } from './TableSeatSlots';
import { RoundSettlementDialog } from './RoundSettlementDialog';
import { advancePhase } from '../game/stateMachine';

interface GameBoardProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  onBackToTitle: () => void;
  onRestart: () => void;
  variant?: 'classic' | 'alpha';
}

const phaseStepLabels: Record<RoundPhase, string> = {
  commitment: '承諾',
  discussion: '發言',
  fateDeclare: '宿命',
  playCards: '出牌',
  resolvePublicCards: '公開',
  reveal: '揭示',
  resolveJudgment: '裁決',
  drawCards: '補牌',
  roundEnd: '回合結束',
  gameEnd: '終局'
};

function JudgmentSigil() {
  return (
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M40 10v53M24 67h32M30 62h20M17 24h46M40 16l-5 6 5 6 5-6-5-6Z" />
      <path d="m19 24-10 24h20L19 24Zm42 0L51 48h20L61 24ZM9 48q10 12 20 0M51 48q10 12 20 0" />
    </svg>
  );
}

export function GameBoard({ gameState, onGameStateChange, onBackToTitle, onRestart, variant = 'classic' }: GameBoardProps) {
  const opponents = gameState.players.filter((player) => !player.isHuman);
  const [terminalReviewed, setTerminalReviewed] = useState(false);
  const [reportRead, setReportRead] = useState<RoundResult>();
  const [openReport, setOpenReport] = useState<'events' | 'summary' | null>(null);
  const reportDialog = useRef<HTMLDialogElement>(null);
  const battleSceneStyle = { '--tribunal-scene-bg': `url(${tribunalScene})` } as CSSProperties;
  const maxRounds = gameState.maxRounds ?? MAX_ROUNDS;
  const hasRoundSummary = Boolean(gameState.previousRoundResult ?? gameState.roundResults.at(-1));
  const activePhaseIndex = ROUND_PHASES.indexOf(gameState.phase);
  const seatPositions = ['top', 'left', 'right'] as const;
  const human = gameState.players.find((player) => player.isHuman);
  const awaitingDecision = Boolean(human && !human.isEliminated && (
    (gameState.phase === 'commitment' && !human.commitment)
    || (gameState.phase === 'playCards' && !human.chosenFaction)
    || (gameState.phase === 'fateDeclare' && human.hand.includes('fate') && !human.hasResolvedFateDeclaration)
    || (gameState.phase === 'resolvePublicCards' && ((human.playedCard?.type === 'peek' && !human.hasResolvedPeek) || (human.playedCard?.type === 'chaos' && !human.hasResolvedChaos)))
  ));
  const terminalSettlement = gameState.phase === 'gameEnd' && !terminalReviewed && gameState.roundResults.some((result) => result.round === gameState.round);
  const currentResult = gameState.roundResults.at(-1)?.round === gameState.round ? gameState.roundResults.at(-1)
    : gameState.previousRoundResult?.round === gameState.round ? gameState.previousRoundResult : undefined;
  const isReadingReport = Boolean(currentResult && currentResult !== reportRead && (gameState.phase === 'resolveJudgment' || terminalSettlement));

  useEffect(() => {
    if (gameState.phase !== 'gameEnd') setTerminalReviewed(false);
  }, [gameState.phase]);

  function restart() {
    setOpenReport(null);
    setTerminalReviewed(false);
    setReportRead(undefined);
    onRestart();
  }

  function continueAfterSettlement() {
    if (gameState.phase === 'gameEnd') setTerminalReviewed(true);
    else if (gameState.phase === 'resolveJudgment') onGameStateChange(advancePhase(gameState));
  }

  // 原生對話框保留焦點管理、鍵盤關閉與關閉後返回入口的行為。
  useEffect(() => {
    const dialog = reportDialog.current;
    if (!dialog) return;
    if (openReport && !dialog.open) dialog.showModal();
    if (!openReport && dialog.open) dialog.close();
  }, [openReport]);

  return (
    <main className="battle-shell tribunal-board" data-entry={variant} data-phase={gameState.phase} data-reading-report={isReadingReport || undefined}>
      <header className="battle-hud tribunal-hud" aria-label="對局資訊">
        <div className="hud-brand">
          <span className="tribunal-brand-sigil"><JudgmentSigil /></span>
          <div><strong>審判困境</strong><small>信任，直到最後一刻</small></div>
        </div>
        <div className="tribunal-round" aria-label={`第 ${gameState.round} 回合，共 ${maxRounds} 回合`}>
          <span>第</span><strong>{String(gameState.round).padStart(2, '0')}</strong><span>回合 <small>/ {maxRounds}</small></span>
        </div>
        <div className="tribunal-phase-status">
          <strong>{gameState.phase === 'gameEnd' ? '終局' : PHASE_LABELS[gameState.phase]}</strong>
          {gameState.phase !== 'gameEnd' ? (
            <span className="tribunal-flow-status">{isReadingReport ? '閱讀本回合戰報' : openReport ? '閱讀紀錄中' : human?.isEliminated ? '觀戰中' : awaitingDecision ? '等待你的決定' : gameState.phase === 'resolveJudgment' ? '查看本回合裁決' : '自動進行'}</span>
          ) : <span className="tribunal-end-label">審判已落定</span>}
        </div>
        <ol className="phase-flow" aria-label="回合九階段流程">
          {ROUND_PHASES.map((phase, index) => (
            <li key={phase} title={PHASE_LABELS[phase]}
              className={`${phase === gameState.phase ? 'is-current' : ''} ${gameState.phase === 'gameEnd' || activePhaseIndex > index ? 'is-past' : ''} ${phase === 'fateDeclare' ? 'is-fate-phase' : ''}`}
              aria-current={phase === gameState.phase ? 'step' : undefined}
            ><span className="phase-step-dot" aria-hidden="true" /><span>{phaseStepLabels[phase]}</span></li>
          ))}
        </ol>
        <div className="hud-actions">
          <button className="hud-icon-button" type="button" onClick={restart} aria-label="重新開始對局" title="重新開始對局">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /></svg>
            <span>重開</span>
          </button>
          <button className="hud-icon-button" type="button" onClick={onBackToTitle} aria-label="回到主畫面" title="回到主畫面">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 5H4v14h5M14 8l4 4-4 4M8 12h11" /></svg>
            <span>離席</span>
          </button>
        </div>
      </header>
      <section className="battle-screen battle-arena tribunal-arena">
        <section className="battlefield tribunal-scene" style={battleSceneStyle} aria-label="審判庭四人牌桌">
          <div className="tribunal-scene-depth" aria-hidden="true">
            <span className="tribunal-room-glow" />
            <span className="tribunal-column tribunal-column-left" />
            <span className="tribunal-column tribunal-column-right" />
          </div>
          <div className="tribunal-table-stage" aria-hidden="true">
            <div className="tribunal-table-shadow" />
            <div className="tribunal-table-rim" />
            <div className="tribunal-table-surface" />
            <div className="tribunal-table-sigil"><JudgmentSigil /></div>
            <span className="tribunal-table-inscription">一諾千金 · 一念叛離</span>
          </div>
          {opponents.slice(0, 3).map((player, index) => (
            <PlayerPanel key={player.id} player={player} dealerPlayerId={gameState.dealerPlayerId} phase={gameState.phase}
              seatPosition={seatPositions[index]} visualStyle="alpha" showTableCards={false} />
          ))}
          <svg className="tribunal-scene-clips" width="0" height="0" aria-hidden="true">
            <defs>
              <clipPath id="tribunal-table-edge" clipPathUnits="objectBoundingBox">
                <path d="M0 .48 C0 .33 .23 .247 .5 .247 C.77 .247 1 .33 1 .48 V1 H0Z" />
              </clipPath>
            </defs>
          </svg>
          <div className="tribunal-table-foreground" aria-hidden="true" />
          <TableSeatSlots players={opponents} phase={gameState.phase} />
          <div className="tribunal-deck-piles" aria-label={`牌庫 ${gameState.deck.length} 張，棄牌 ${gameState.discardPile.length} 張`}>
            <div className="tribunal-draw-pile"><span aria-hidden="true" /><strong>{gameState.deck.length}</strong><small>牌庫</small></div>
            <div className="tribunal-discard-pile"><strong>{gameState.discardPile.length}</strong><small>棄牌</small></div>
          </div>
          <div className="tribunal-table-objects"><ActionPanel gameState={gameState} onGameStateChange={onGameStateChange} flowPaused={Boolean(openReport)} /></div>
          <RoundSettlementDialog gameState={gameState} onContinue={continueAfterSettlement} onReportComplete={() => setReportRead(currentResult)} paused={Boolean(openReport)} terminal={terminalSettlement} />
          {!terminalSettlement ? <GameResultPanel gameState={gameState} onRestart={restart} onBackToTitle={onBackToTitle} /> : null}
          <div className="tribunal-report-launchers" aria-label="對局紀錄">
            {hasRoundSummary ? <button type="button" onClick={() => setOpenReport('summary')} aria-haspopup="dialog" aria-controls="tribunal-report">回合戰報</button> : null}
            <button type="button" onClick={() => setOpenReport('events')} aria-haspopup="dialog" aria-controls="tribunal-report">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" /></svg>
              審判紀錄
            </button>
          </div>
        </section>
      </section>
      <dialog ref={reportDialog} id="tribunal-report" className={`tribunal-report-overlay ${openReport === 'summary' ? 'is-summary' : ''}`}
        aria-labelledby="tribunal-report-heading" onCancel={() => setOpenReport(null)} onClose={() => setOpenReport(null)}
        onClick={(event) => { if (event.target === event.currentTarget) setOpenReport(null); }}>
        <div className="tribunal-report-content">
          <header className="tribunal-report-heading">
            <div><span>第 {gameState.round} 回合</span><h2 id="tribunal-report-heading">{openReport === 'summary' ? '回合戰報' : '審判紀錄'}</h2></div>
            <button type="button" className="tribunal-report-close" onClick={() => setOpenReport(null)} aria-label="關閉紀錄">關閉 <span aria-hidden="true">×</span></button>
          </header>
          {openReport === 'summary' ? <RoundSummaryPanel gameState={gameState} /> : <EventLog events={gameState.eventLog} />}
        </div>
      </dialog>
    </main>
  );
}
