import type { Faction, PlayerState, RoundResult, RoundResultType } from './types';

export interface ScoreBreakdown {
  playerId: string;
  playerName: string;
  startingScore: number;
  judgedFaction: Faction;
  baseScoreDelta: number;
  baseScoreReason: string;
  functionCardDelta: number;
  functionCardReason: string;
  promiseDelta: number;
  promiseReason: string;
  finalDelta: number;
  finalScore: number;
}

export const roundSituationLabels: Record<RoundResultType, string> = {
  allAlliance: '全員合作',
  minorityBetrayal: '少數背叛',
  equal: '勢均力敵',
  betrayalOverload: '背叛過剩',
  allBetrayal: '全員背叛',
  loneHero: '孤勇者'
};

const factionLabels: Record<Faction, string> = {
  alliance: '盟約',
  betrayal: '叛離'
};

export function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function valueOf(record: Record<string, number>, playerId: string): number {
  return record[playerId] ?? 0;
}

function describeBaseReason(resultType: RoundResultType, faction: Faction, delta: number): string {
  const factionLabel = factionLabels[faction];
  if (resultType === 'allAlliance') {
    return `全員合作時，每位玩家獲得 ${signed(delta)}。`;
  }
  if (resultType === 'allBetrayal') {
    return `全員背叛時，每位玩家受到 ${signed(delta)}。`;
  }
  if (resultType === 'equal') {
    return `勢均力敵時，每位玩家受到 ${signed(delta)}。`;
  }
  if (resultType === 'minorityBetrayal') {
    return faction === 'betrayal'
      ? `少數背叛時，背叛者獲得 ${signed(delta)}。`
      : `少數背叛時，合作者受到 ${signed(delta)}。`;
  }
  if (resultType === 'betrayalOverload') {
    return faction === 'betrayal'
      ? `背叛過剩時，背叛者受到 ${signed(delta)}。`
      : `背叛過剩時，合作者受到 ${signed(delta)}。`;
  }
  return faction === 'alliance'
    ? `孤勇者局勢中，唯一的${factionLabel}玩家獲得 ${signed(delta)}。`
    : `孤勇者局勢中，叛離者受到 ${signed(delta)}。`;
}

function describeFunctionReason(player: PlayerState, result: RoundResult): string {
  const fateDelta = valueOf(result.fateDeltaByPlayerId, player.id);
  const shieldDelta = valueOf(result.shieldDeltaByPlayerId, player.id);
  const counterDelta = valueOf(result.counterDeltaByPlayerId, player.id);
  const lines: string[] = [];

  if (player.functionCardSelection === 'blank') {
    lines.push('空白密令無效果。');
  }
  if (player.playedCard?.type === 'peek') {
    lines.push('真理之眼提供翻牌前資訊，不直接改變裁決點數。');
  }
  if (fateDelta !== 0) {
    lines.push(`宿命修正 ${signed(fateDelta)}。`);
  }
  if (shieldDelta !== 0) {
    lines.push(`庇護修正 ${signed(shieldDelta)}。`);
  }
  if (counterDelta !== 0) {
    lines.push(`反擊修正 ${signed(counterDelta)}。`);
  }

  return lines.length > 0 ? lines.join(' ') : '本回合沒有功能牌分數修正。';
}

function describePromiseReason(player: PlayerState, judgedFaction: Faction, promiseDelta: number): string {
  if (!player.commitment) {
    return '未記錄承諾，因此無法顯示守諾或失信原因。';
  }
  const resultText = promiseDelta >= 0 ? '守諾' : '失信';
  return `承諾${factionLabels[player.commitment]}，實際${factionLabels[judgedFaction]}，${resultText} ${signed(promiseDelta)}。`;
}

export function buildScoreBreakdown(player: PlayerState, result: RoundResult): ScoreBreakdown {
  const judgedFaction = result.situation.judgedFactionByPlayerId[player.id];
  const baseScoreDelta = valueOf(result.baseDeltaByPlayerId, player.id);
  const functionCardDelta =
    valueOf(result.fateDeltaByPlayerId, player.id) +
    valueOf(result.shieldDeltaByPlayerId, player.id) +
    valueOf(result.counterDeltaByPlayerId, player.id);
  const promiseDelta = valueOf(result.commitmentDeltaByPlayerId, player.id);
  const finalDelta = valueOf(result.finalDeltaByPlayerId, player.id);
  const finalScore = player.judgmentPoints;

  return {
    playerId: player.id,
    playerName: player.name,
    startingScore: finalScore - finalDelta,
    judgedFaction,
    baseScoreDelta,
    baseScoreReason: describeBaseReason(result.situation.resultType, judgedFaction, baseScoreDelta),
    functionCardDelta,
    functionCardReason: describeFunctionReason(player, result),
    promiseDelta,
    promiseReason: describePromiseReason(player, judgedFaction, promiseDelta),
    finalDelta,
    finalScore
  };
}
