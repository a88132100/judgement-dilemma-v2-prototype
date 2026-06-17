import { FACTION_LABELS } from '../game/constants';
import type { Faction, GameState, PlayerState, RoundResult, RoundResultType } from '../game/types';

interface RoundSummaryPanelProps {
  gameState: GameState;
}

const situationLabels: Record<RoundResultType, string> = {
  allAlliance: '全員合作',
  minorityBetrayal: '少數背叛',
  equal: '勢均力敵',
  betrayalOverload: '背叛過剩',
  allBetrayal: '全員背叛',
  loneHero: '孤勇者'
};

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function valueOf(record: Record<string, number>, playerId: string): number {
  return record[playerId] ?? 0;
}

function roundEvents(events: string[], result: RoundResult): string[] {
  const resultIndex = events.findIndex((event) => event.startsWith(`第 ${result.round} 回合局勢：`));
  const startMarker = `進入第 ${result.round} 回合。`;
  let markerIndex = -1;
  const markerSearchEnd = resultIndex >= 0 ? resultIndex : events.length;
  for (let index = markerSearchEnd - 1; index >= 0; index -= 1) {
    if (events[index] === startMarker) {
      markerIndex = index;
      break;
    }
  }
  const startIndex = result.round === 1 ? 0 : Math.max(0, markerIndex);
  const endIndex = resultIndex >= 0 ? resultIndex : events.length;
  return events.slice(startIndex, endIndex + 1);
}

function parseCommitmentFromEvents(player: PlayerState, events: string[]): Faction | undefined {
  const line = events.find((event) => event.includes(`${player.name}承諾本回合選擇`) || event.includes(`${player.name} 承諾選擇`));
  if (!line) {
    return undefined;
  }
  if (line.includes(FACTION_LABELS.alliance)) {
    return 'alliance';
  }
  if (line.includes(FACTION_LABELS.betrayal)) {
    return 'betrayal';
  }
  return undefined;
}

function commitmentForPlayer(gameState: GameState, result: RoundResult, player: PlayerState): Faction | undefined {
  if (gameState.round === result.round && player.commitment) {
    return player.commitment;
  }
  return parseCommitmentFromEvents(player, roundEvents(gameState.eventLog, result));
}

export function RoundSummaryPanel({ gameState }: RoundSummaryPanelProps) {
  const result = gameState.previousRoundResult ?? gameState.roundResults.at(-1);
  if (!result) {
    return null;
  }

  const validPlayers = gameState.players.filter((player) => result.situation.validPlayerIds.includes(player.id));

  return (
    <section className="panel round-summary-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Round Summary</span>
          <h2>第 {result.round} 回合結算摘要</h2>
        </div>
        <div className="summary-situation">
          <strong>{situationLabels[result.situation.resultType]}</strong>
          <span>
            合作 {result.situation.allianceCount} 人 / 背叛 {result.situation.betrayalCount} 人
          </span>
        </div>
      </div>

      <div className="round-summary-table-wrap">
        <table className="round-summary-table">
          <thead>
            <tr>
              <th>玩家</th>
              <th>承諾</th>
              <th>最終判定</th>
              <th>基礎</th>
              <th>功能牌</th>
              <th>宿命</th>
              <th>庇護</th>
              <th>反擊</th>
              <th>守諾 / 失信</th>
              <th>本回合</th>
              <th>結算後</th>
            </tr>
          </thead>
          <tbody>
            {validPlayers.map((player) => {
              const commitment = commitmentForPlayer(gameState, result, player);
              const fateDelta = valueOf(result.fateDeltaByPlayerId, player.id);
              const shieldDelta = valueOf(result.shieldDeltaByPlayerId, player.id);
              const counterDelta = valueOf(result.counterDeltaByPlayerId, player.id);
              const cardDelta = fateDelta + shieldDelta + counterDelta;
              const commitmentDelta = valueOf(result.commitmentDeltaByPlayerId, player.id);
              const finalDelta = valueOf(result.finalDeltaByPlayerId, player.id);

              return (
                <tr key={player.id}>
                  <td>{player.name}</td>
                  <td>{commitment ? FACTION_LABELS[commitment] : '未記錄'}</td>
                  <td>{FACTION_LABELS[result.situation.judgedFactionByPlayerId[player.id]]}</td>
                  <td>{signed(valueOf(result.baseDeltaByPlayerId, player.id))}</td>
                  <td>{signed(cardDelta)}</td>
                  <td>{signed(fateDelta)}</td>
                  <td>{signed(shieldDelta)}</td>
                  <td>{signed(counterDelta)}</td>
                  <td>{commitmentDelta >= 0 ? `守諾 ${signed(commitmentDelta)}` : `失信 ${signed(commitmentDelta)}`}</td>
                  <td className={finalDelta >= 0 ? 'positive-delta' : 'negative-delta'}>{signed(finalDelta)}</td>
                  <td>{player.judgmentPoints} 點</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
