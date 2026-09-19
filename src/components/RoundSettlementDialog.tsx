import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FACTION_LABELS } from '../game/constants';
import { buildScoreBreakdown, roundSituationLabels, signed } from '../game/scoreBreakdown';
import type { GameState, RoundResult } from '../game/types';
import { ScoreBreakdownPanel } from './ScoreBreakdownPanel';
import { RoundCardReport } from './RoundCardReport';
import { TribunalPlaque } from './TribunalPlaque';
import '../styles/round-settlement.css';

interface RoundSettlementDialogProps {
  gameState: GameState;
  onContinue: () => void;
  paused?: boolean;
  terminal?: boolean;
  onReportComplete?: () => void;
}

interface SettlementContentProps extends RoundSettlementDialogProps {
  result: RoundResult;
}

const readingTimeMs = 8000;

function SettlementContent({ gameState, result, onContinue, paused = false, terminal = false, onReportComplete }: SettlementContentProps) {
  const headingId = useId();
  const summaryId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const callbackRef = useRef(onContinue);
  const reportCallbackRef = useRef(onReportComplete);
  const completedRef = useRef(false);
  const reportReadingTimeMs = result.cardReport?.length ? Math.max(4000, Math.min(8000, result.cardReport.length * 2000)) : 1500;
  const [view, setView] = useState<'report' | 'settlement'>('report');
  const viewRef = useRef<'report' | 'settlement'>('report');
  const isReport = view === 'report';
  const durationMs = isReport ? reportReadingTimeMs : readingTimeMs;
  const remainingRef = useRef(reportReadingTimeMs);
  const intervalRef = useRef<number | undefined>(undefined);
  const [remainingMs, setRemainingMs] = useState(reportReadingTimeMs);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [expandedPlayers, setExpandedPlayers] = useState<string[]>([]);
  const [pageHidden, setPageHidden] = useState(() => document.hidden);
  const hasExpandedDetails = expandedPlayers.length > 0;
  const terminalSettlement = terminal && !isReport;
  const isPaused = terminalSettlement || paused || manuallyPaused || hasExpandedDetails || pageHidden;
  const pauseRef = useRef(isPaused);
  callbackRef.current = onContinue;
  reportCallbackRef.current = onReportComplete;
  pauseRef.current = isPaused;
  const players = [...gameState.players].sort((left, right) => Number(right.isHuman) - Number(left.isHuman));
  const secondsLeft = Math.ceil(remainingMs / 1000);

  // 戰報只切換閱讀畫面，不再次解析卡牌，也不推進回合。
  const showSettlement = useCallback(() => {
    if (completedRef.current || viewRef.current !== 'report') return;
    viewRef.current = 'settlement';
    window.clearInterval(intervalRef.current);
    remainingRef.current = readingTimeMs;
    setRemainingMs(readingTimeMs);
    setManuallyPaused(false);
    setView('settlement');
    reportCallbackRef.current?.();
  }, []);

  // 點數結果的倒數與立即繼續共用單次出口；父元件負責正式流程的推進。
  const continueOnce = useCallback(() => {
    if (completedRef.current || viewRef.current !== 'settlement') return;
    completedRef.current = true;
    window.clearInterval(intervalRef.current);
    dialogRef.current?.close();
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (view === 'settlement') dialogRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [view]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // 補上首尾焦點循環，避免原生對話框將 Tab 移到瀏覽器工具列。
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog.open) return;
      const activeElement = document.activeElement;
      const activeDialog = activeElement instanceof Element ? activeElement.closest('dialog') : null;
      if (activeDialog && activeDialog !== dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), summary, a[href], [tabindex]:not([tabindex="-1"])'))
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
      if (!controls.some((control) => control === activeElement) || (event.shiftKey && activeElement === first) || (!event.shiftKey && activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      dialog.close();
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 只累積畫面可見、沒有暫停且沒有展開明細時的閱讀時間。
  useEffect(() => {
    if (isPaused || completedRef.current) return;
    let active = true;
    let previousTick = performance.now();
    intervalRef.current = window.setInterval(() => {
      if (!active || completedRef.current || viewRef.current !== view) return;
      const now = performance.now();
      if (pauseRef.current || document.hidden || dialogRef.current?.querySelector('details[open]')) {
        previousTick = now;
        return;
      }
      remainingRef.current = Math.max(0, remainingRef.current - (now - previousTick));
      previousTick = now;
      setRemainingMs(remainingRef.current);
      if (remainingRef.current === 0) {
        if (view === 'report') showSettlement();
        else continueOnce();
      }
    }, 80);
    return () => {
      active = false;
      window.clearInterval(intervalRef.current);
    };
  }, [isPaused, view, showSettlement, continueOnce]);

  function pauseReading() {
    pauseRef.current = true;
    setManuallyPaused(true);
  }

  const pauseReason = hasExpandedDetails ? '明細已展開，倒數已暫停；收合後可繼續倒數。'
    : pageHidden ? '頁面暫時離開，倒數已暫停。'
    : paused ? '目前正在查看其他內容，倒數已暫停。'
    : manuallyPaused ? '倒數已暫停，請慢慢查看。'
    : `${secondsLeft} 秒後${isReport ? '查看裁決結果' : '進入下一回合'}。`;

  return createPortal(
    <dialog ref={dialogRef} className="round-settlement-dialog" aria-label={isReport ? '本回合戰報' : '本回合裁決'} aria-describedby={`${headingId} ${summaryId}`}
      data-view={view} data-round={result.round} data-countdown={secondsLeft} data-paused={isPaused}
      onCancel={(event) => { event.preventDefault(); pauseReading(); }}>
      <header className="round-settlement-header">
        <TribunalPlaque>
          <span className="tribunal-plaque-kicker">第 {result.round} 回合 · {isReport ? '功能牌處理' : '裁決落定'}</span>
          <h2 className="tribunal-plaque-title" id={headingId} tabIndex={-1}>{isReport ? '本回合戰報' : roundSituationLabels[result.situation.resultType]}</h2>
        </TribunalPlaque>
        <p id={summaryId}>{isReport ? '牌已揭示，看看誰改變了這一局。' : result.summary}</p>
      </header>

      {isReport ? <RoundCardReport gameState={gameState} result={result} /> : <div className="round-settlement-results" aria-label="本回合玩家結算">
        {players.map((player) => {
          const participated = result.situation.validPlayerIds.includes(player.id);
          const breakdown = participated ? buildScoreBreakdown(player, result) : undefined;
          const originalFaction = participated ? player.chosenFaction : undefined;
          const finalFaction = participated ? result.situation.judgedFactionByPlayerId[player.id] : undefined;
          const commitment = participated ? player.commitment : undefined;
          const scoreDelta = breakdown?.finalDelta ?? 0;
          return (
            <article className={`round-settlement-player ${player.isHuman ? 'is-human' : ''} ${player.isEliminated ? 'is-eliminated' : ''}`} key={player.id}>
              <div className="round-settlement-player-main">
                <div className="round-settlement-player-name">
                  {player.isHuman ? <span className="round-settlement-you">你的結果</span> : null}
                  <h3>{player.name}</h3>
                  {player.isEliminated ? <small>{participated ? '本回合出局' : '先前已出局'}</small> : null}
                </div>
                <dl className="round-settlement-factions">
                  <div><dt>公開承諾</dt><dd className={commitment ? `is-${commitment}` : ''}>{commitment ? FACTION_LABELS[commitment] : '—'}</dd></div>
                  <div><dt>原始陣營</dt><dd className={originalFaction ? `is-${originalFaction}` : ''}>{originalFaction ? FACTION_LABELS[originalFaction] : '—'}</dd></div>
                  <div><dt>最終陣營</dt><dd className={finalFaction ? `is-${finalFaction}` : ''}>{finalFaction ? FACTION_LABELS[finalFaction] : '—'}</dd></div>
                </dl>
                <div className="round-settlement-score" aria-label={`裁決點由 ${breakdown?.startingScore ?? player.judgmentPoints} 變為 ${player.judgmentPoints}`}>
                  <span>裁決點</span>
                  <div><span>{breakdown?.startingScore ?? player.judgmentPoints}</span><span aria-hidden="true">→</span><strong>{player.judgmentPoints}</strong></div>
                </div>
                <strong className={`round-settlement-delta ${scoreDelta > 0 ? 'is-gain' : scoreDelta < 0 ? 'is-loss' : 'is-neutral'}`} aria-label={participated ? `本回合變化 ${signed(scoreDelta)} 點` : '本回合未參與'}>
                  {participated ? signed(scoreDelta) : '—'}
                </strong>
              </div>
              {breakdown ? (
                <details className="round-settlement-details" onToggle={(event) => {
                  const open = event.currentTarget.open;
                  if (open) pauseReading();
                  setExpandedPlayers((current) => open ? [...new Set([...current, player.id])] : current.filter((id) => id !== player.id));
                }}>
                  <summary>查看 {player.isHuman ? '你的' : player.name + '的'}加扣分理由</summary>
                  <ScoreBreakdownPanel breakdown={breakdown} />
                </details>
              ) : null}
            </article>
          );
        })}
      </div>}

      <footer className="round-settlement-footer">
        <div className="round-settlement-reading">
          <span role={terminalSettlement ? undefined : 'timer'} aria-live="off">{terminalSettlement ? '本場審判已結束，確認本回合裁決後查看終局。' : pauseReason}</span>
          {!terminalSettlement ? <div className="round-settlement-progress" aria-hidden="true"><span style={{ width: `${remainingMs / durationMs * 100}%` }} /></div> : null}
        </div>
        <div className="round-settlement-actions">
          {!terminalSettlement ? <button className="round-settlement-pause" type="button" autoFocus disabled={hasExpandedDetails || pageHidden || paused}
            onClick={() => { if (manuallyPaused) setManuallyPaused(false); else pauseReading(); }}>
            {isReport ? isPaused ? '繼續閱讀' : '暫停閱讀' : isPaused ? '繼續倒數' : '暫停查看'}
          </button> : null}
          <button key={view} className="round-settlement-continue" type="button" onClick={isReport ? showSettlement : continueOnce}>{isReport ? '查看結算' : terminal ? '查看終局' : '下一回合'}</button>
        </div>
      </footer>
    </dialog>, document.body
  );
}

export function RoundSettlementDialog(props: RoundSettlementDialogProps) {
  const latestResult = props.gameState.roundResults.at(-1);
  const result = latestResult?.round === props.gameState.round ? latestResult
    : props.gameState.previousRoundResult?.round === props.gameState.round ? props.gameState.previousRoundResult : undefined;
  const eligiblePhase = props.terminal ? props.gameState.phase === 'gameEnd' : props.gameState.phase === 'resolveJudgment' && !props.gameState.gameOverReason;
  if (typeof document === 'undefined' || !eligiblePhase || !result) return null;
  return <SettlementContent key={result.round} {...props} result={result} />;
}
