import { PHASE_LABELS } from '../game/constants';
import { playerName } from '../game/log';
import type { GameState, RoundPhase } from '../game/types';
import { commitmentTokenImageByFaction } from './assetMap';

interface PhasePanelProps {
  gameState: GameState;
}

const phaseHints: Record<RoundPhase, string[]> = {
  commitment: ['請選擇本回合你要公開承諾的陣營。', '承諾與最終出牌一致會 +1，不一致會 -1。'],
  discussion: ['此階段用於觀察其他玩家承諾與推測意圖。', '可直接推進至下一階段。'],
  fateDeclare: ['宿命可在此階段宣告預言。', '未使用宿命時可直接推進。'],
  playCards: ['請將合作或背叛放到陣營暗放槽。', '你可以選擇 1 張功能牌，或不使用功能牌。'],
  resolvePublicCards: ['公開型功能牌將依序處理。'],
  reveal: ['本回合將揭示陣營並準備計算裁決點數。'],
  resolveJudgment: ['本回合將計算裁決點數。'],
  drawCards: ['每位玩家若手牌未滿 3 張，補 1 張。'],
  roundEnd: ['本回合已結束，可查看結算摘要後進入下一回合。'],
  gameEnd: ['遊戲已結束，請查看結果面板。']
};

export function PhasePanel({ gameState }: PhasePanelProps) {
  const winner = gameState.winnerPlayerId ? playerName(gameState.players, gameState.winnerPlayerId) : undefined;

  return (
    <section className="phase-panel">
      <div>
        <span className="eyebrow">第 {gameState.round} 回合</span>
        <h2>{PHASE_LABELS[gameState.phase]}</h2>
      </div>
      <div className="phase-action-hint" aria-live="polite">
        <strong>目前行動提示</strong>
        <ul>
          {phaseHints[gameState.phase].map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      </div>
      <div className="phase-meta">
        <span>莊家：{playerName(gameState.players, gameState.dealerPlayerId)}</span>
        <span>勝利：11 點</span>
        <span>出局：0 點</span>
        {gameState.phase === 'commitment' ? (
          <span className="phase-token-strip">
            <img className="asset-thumb token-thumb" src={commitmentTokenImageByFaction.alliance} alt="" onError={(event) => event.currentTarget.remove()} />
            <img className="asset-thumb token-thumb" src={commitmentTokenImageByFaction.betrayal} alt="" onError={(event) => event.currentTarget.remove()} />
          </span>
        ) : null}
        {winner ? <strong>勝者：{winner}</strong> : null}
      </div>
    </section>
  );
}
