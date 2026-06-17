import { CARD_LABELS, FACTION_LABELS } from './constants';
import type { CardType, Faction, PlayerState, RoundResult, RoundSituation } from './types';

export function playerName(players: PlayerState[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.name ?? playerId;
}

export function factionLabel(faction: Faction): string {
  return FACTION_LABELS[faction];
}

export function cardLabel(card: CardType): string {
  return CARD_LABELS[card];
}

export function describeSituation(situation: RoundSituation): string {
  const labels: Record<RoundSituation['resultType'], string> = {
    loneHero: '孤勇者',
    allAlliance: '全員合作',
    allBetrayal: '全員背叛',
    equal: '合作與背叛人數相等',
    minorityBetrayal: '少數背叛',
    betrayalOverload: '背叛過載'
  };
  return `${labels[situation.resultType]}：合作 ${situation.allianceCount} 人，背叛 ${situation.betrayalCount} 人`;
}

export function describeRoundResult(result: RoundResult, players: PlayerState[]): string[] {
  const lines = [`第 ${result.round} 回合局勢：${describeSituation(result.situation)}`];
  for (const playerId of result.situation.validPlayerIds) {
    const player = players.find((candidate) => candidate.id === playerId);
    const commitmentDelta = result.commitmentDeltaByPlayerId[playerId] ?? 0;
    const commitmentText = commitmentDelta >= 0 ? `守諾 ${commitmentDelta}` : `失信 ${commitmentDelta}`;
    const parts = [
      `基礎結算 ${result.baseDeltaByPlayerId[playerId] ?? 0}`,
      `庇護修正 ${result.shieldDeltaByPlayerId[playerId] ?? 0}`,
      `庇護後基礎 ${result.adjustedBaseDeltaByPlayerId[playerId] ?? 0}`,
      `反擊修正 ${result.counterDeltaByPlayerId[playerId] ?? 0}`,
      `宿命修正 ${result.fateDeltaByPlayerId[playerId] ?? 0}`,
      `承諾修正：${commitmentText}`
    ];
    const chosenText = player?.chosenFaction ? `原始選擇 ${factionLabel(player.chosenFaction)}` : '原始選擇未記錄';
    const judgedText = result.situation.judgedFactionByPlayerId[playerId]
      ? `最終判定 ${factionLabel(result.situation.judgedFactionByPlayerId[playerId])}`
      : '最終判定未記錄';
    lines.push(`${playerName(players, playerId)}：${chosenText}，${judgedText}，${parts.join('，')}，最終總變化 ${result.finalDeltaByPlayerId[playerId] ?? 0}`);
  }
  return lines;
}
