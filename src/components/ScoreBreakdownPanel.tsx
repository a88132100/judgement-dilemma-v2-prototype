import { signed, type ScoreBreakdown } from '../game/scoreBreakdown';

interface ScoreBreakdownPanelProps {
  breakdown: ScoreBreakdown;
  compact?: boolean;
}

export function ScoreBreakdownPanel({ breakdown, compact = false }: ScoreBreakdownPanelProps) {
  return (
    <section className={compact ? 'score-breakdown-panel is-compact' : 'score-breakdown-panel'}>
      <div className="score-breakdown-heading">
        <strong>{breakdown.playerName}</strong>
        <span className={breakdown.finalDelta >= 0 ? 'positive-delta' : 'negative-delta'}>{signed(breakdown.finalDelta)}</span>
      </div>
      <dl>
        <div>
          <dt>起始裁決點數</dt>
          <dd>{breakdown.startingScore}</dd>
        </div>
        <div>
          <dt>基礎結算</dt>
          <dd>{signed(breakdown.baseScoreDelta)}</dd>
        </div>
        <div className="score-breakdown-reason">
          <dt>原因</dt>
          <dd>{breakdown.baseScoreReason}</dd>
        </div>
        <div>
          <dt>功能牌修正</dt>
          <dd>{signed(breakdown.functionCardDelta)}</dd>
        </div>
        <div className="score-breakdown-reason">
          <dt>原因</dt>
          <dd>{breakdown.functionCardReason}</dd>
        </div>
        <div>
          <dt>承諾修正</dt>
          <dd>{signed(breakdown.promiseDelta)}</dd>
        </div>
        <div className="score-breakdown-reason">
          <dt>原因</dt>
          <dd>{breakdown.promiseReason}</dd>
        </div>
        <div>
          <dt>本回合總變化</dt>
          <dd className={breakdown.finalDelta >= 0 ? 'positive-delta' : 'negative-delta'}>{signed(breakdown.finalDelta)}</dd>
        </div>
        <div>
          <dt>目前裁決點數</dt>
          <dd>{breakdown.finalScore}</dd>
        </div>
      </dl>
    </section>
  );
}
