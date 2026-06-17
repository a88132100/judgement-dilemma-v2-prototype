import { useState } from 'react';
import { CARD_LABELS } from '../game/constants';
import {
  runBalanceLab,
  runSimulation,
  type BalanceLabProfileResult,
  type SimulationPersonality,
  type SimulationResult
} from '../game/simulator';
import type { CardType, RoundResultType } from '../game/types';

const personalityLabels: Record<SimulationPersonality, string> = {
  humanLike: '玩家',
  honest: '守信型',
  opportunist: '投機型',
  observer: '觀望型'
};

const situationLabels: Record<RoundResultType, string> = {
  loneHero: '孤勇者',
  allAlliance: '全員合作',
  allBetrayal: '全員叛離',
  equal: '勢均力敵',
  minorityBetrayal: '少數叛離',
  betrayalOverload: '叛離過載'
};

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function countPercent(count: number, total: number): string {
  return `${count}（${percent(count / Math.max(1, total))}）`;
}

export function SimulatorPanel() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [balanceLabResults, setBalanceLabResults] = useState<BalanceLabProfileResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  function handleRun(gameCount: number) {
    setIsRunning(true);
    window.setTimeout(() => {
      setResult(runSimulation({ gameCount }));
      setIsRunning(false);
    }, 0);
  }

  function handleRunBalanceLab() {
    setIsRunning(true);
    window.setTimeout(() => {
      setBalanceLabResults(runBalanceLab({ gameCount: 1000 }));
      setIsRunning(false);
    }, 0);
  }

  return (
    <details className="panel simulator-panel dev-tools-panel">
      <summary>開發工具</summary>
      <div className="panel-heading">
        <div>
          <h2>Simulator / Balance Lab</h2>
          <p>試玩時可保持收合；開發驗證時再展開批量跑局。</p>
        </div>
        <div className="button-row">
          {[100, 500, 1000].map((gameCount) => (
            <button type="button" key={gameCount} onClick={() => handleRun(gameCount)} disabled={isRunning}>
              模擬 {gameCount} 局
            </button>
          ))}
          <button type="button" onClick={handleRunBalanceLab} disabled={isRunning}>
            執行 Balance Lab：每組 1000 局
          </button>
        </div>
      </div>

      {isRunning ? <p className="muted">模擬執行中...</p> : null}
      {result ? (
        <div className="sim-grid">
          <div>
            <h3>總覽</h3>
            <p>總局數：{result.totalGames}</p>
            <p>完成局數：{result.completedGames}</p>
            <p>平均回合數：{result.averageRounds.toFixed(2)}</p>
            <p>唯一勝者：{countPercent(result.gamesWithSingleWinner, result.totalGames)}</p>
            <p>平手局：{countPercent(result.tiedGames, result.totalGames)}</p>
            <p>無勝者：{countPercent(result.gamesWithoutWinner, result.totalGames)}</p>
            <p>守諾率：{percent(result.commitmentStats.keepRate)}</p>
          </div>

          <div>
            <h3>人格勝率</h3>
            {Object.entries(result.winnerCountByPersonality).map(([personality, count]) => (
              <p key={personality}>
                {personalityLabels[personality as SimulationPersonality]}：{count} / 全部 {percent(result.winnerCountByPersonalityAllGamesRatio[personality as SimulationPersonality])} / 明確勝者{' '}
                {percent(result.winnerCountByPersonalityDecidedGamesRatio[personality as SimulationPersonality])}
              </p>
            ))}
          </div>

          <div>
            <h3>結束原因</h3>
            <p>裁決點獲勝：{countPercent(result.gameEndReasonCount.judgmentWin, result.totalGames)}</p>
            <p>回合上限：{countPercent(result.gameEndReasonCount.maxRounds, result.totalGames)}</p>
            <p>只剩一人：{countPercent(result.gameEndReasonCount.allButOneEliminated, result.totalGames)}</p>
            <p>全員出局比高分：{countPercent(result.gameEndReasonCount.allEliminatedTieBreak, result.totalGames)}</p>
          </div>

          <div>
            <h3>平均最終裁決點</h3>
            {Object.entries(result.averageFinalJudgmentByPersonality).map(([personality, value]) => (
              <p key={personality}>
                {personalityLabels[personality as SimulationPersonality]}：{value.toFixed(2)}
              </p>
            ))}
          </div>

          <div>
            <h3>回合局勢頻率</h3>
            {Object.entries(result.roundSituationFrequency).map(([situation, value]) => (
              <p key={situation}>
                {situationLabels[situation as RoundResultType]}：{percent(value)}
              </p>
            ))}
          </div>

          <div>
            <h3>功能牌使用</h3>
            {Object.entries(result.cardUsageStats).map(([card, count]) => (
              <p key={card}>
                {CARD_LABELS[card as CardType]}：{count}
              </p>
            ))}
          </div>

          <div>
            <h3>Balance Warnings</h3>
            {result.balanceWarnings.length === 0 ? <p>未出現警告。</p> : null}
            {result.balanceWarnings.map((warning) => (
              <p className="warning-text" key={warning}>
                {warning}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {balanceLabResults ? (
        <div className="balance-table-wrap">
          <h3>Balance Lab 比較表</h3>
          <table className="balance-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>平均回合</th>
                <th>maxRounds</th>
                <th>judgmentWin</th>
                <th>平手</th>
                <th>守信型勝率</th>
                <th>投機型勝率</th>
                <th>觀望型勝率</th>
                <th>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {balanceLabResults.map((profile) => (
                <tr key={profile.profileName}>
                  <td>{profile.profileName}</td>
                  <td>{profile.averageRounds.toFixed(2)}</td>
                  <td>{percent(profile.maxRoundsRate)}</td>
                  <td>{percent(profile.judgmentWinRate)}</td>
                  <td>{percent(profile.tiedGamesRate)}</td>
                  <td>{percent(profile.winnerCountByPersonalityDecidedGamesRatio.honest)}</td>
                  <td>{percent(profile.winnerCountByPersonalityDecidedGamesRatio.opportunist)}</td>
                  <td>{percent(profile.winnerCountByPersonalityDecidedGamesRatio.observer)}</td>
                  <td>{profile.balanceWarnings.length > 0 ? profile.balanceWarnings.join(' / ') : '無'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </details>
  );
}
