import { cardLabel, factionLabel, playerName } from './log';
import { BASELINE_RULES_CONFIG, type RulesConfig } from './rulesConfig';
import type { GameState, PlayerState, RoundSituation } from './types';

export interface CounterResolution {
  counterDeltaByPlayerId: Record<string, number>;
  counterTargetByUserId: Record<string, string>;
}

function zeroDeltas(playerIds: string[]): Record<string, number> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));
}

export function resolvePublicCards(state: GameState, rulesConfig: RulesConfig = BASELINE_RULES_CONFIG): GameState {
  const publicCards = state.players
    .filter((player) => !player.isEliminated && player.playedCard?.isPublic)
    .sort((left, right) => {
      const leftIndex = rulesConfig.publicCardResolveOrder.indexOf(left.playedCard?.type ?? 'counter');
      const rightIndex = rulesConfig.publicCardResolveOrder.indexOf(right.playedCard?.type ?? 'counter');
      return leftIndex - rightIndex;
    });

  const eventLog = [...state.eventLog];
  for (const player of publicCards) {
    const playedCard = player.playedCard;
    if (!playedCard) {
      continue;
    }
    if (playedCard.type === 'fate') {
      eventLog.push(`${player.name} 發動 ${cardLabel('fate')}，預言將在最終判定後結算。`);
    }
    if (playedCard.type === 'peek' && playedCard.targetPlayerId) {
      const target = state.players.find((candidate) => candidate.id === playedCard.targetPlayerId);
      if (target?.chosenFaction) {
        eventLog.push(
          `${player.name} 發動 ${cardLabel('peek')}，查看 ${target.name} 的原始陣營選擇卡：${factionLabel(target.chosenFaction)}。測試版直接寫入紀錄，正式版未必公開。`
        );
      }
    }
  }

  return { ...state, eventLog };
}

export function applyShieldCards(args: {
  players: PlayerState[];
  situation: RoundSituation;
  baseDeltaByPlayerId: Record<string, number>;
  rulesConfig?: RulesConfig;
}): {
  adjustedBaseDeltaByPlayerId: Record<string, number>;
  shieldDeltaByPlayerId: Record<string, number>;
} {
  const adjustedBaseDeltaByPlayerId = { ...args.baseDeltaByPlayerId };
  const shieldDeltaByPlayerId = zeroDeltas(args.situation.validPlayerIds);
  const rulesConfig = args.rulesConfig ?? BASELINE_RULES_CONFIG;

  for (const player of args.players) {
    const playedCard = player.playedCard;
    const isValid = args.situation.validPlayerIds.includes(player.id);
    const isAlliance = args.situation.judgedFactionByPlayerId[player.id] === 'alliance';
    const hasBetrayer = args.situation.betrayalCount > 0;
    const baseDelta = adjustedBaseDeltaByPlayerId[player.id] ?? 0;
    if (isValid && playedCard?.type === 'shield' && isAlliance && hasBetrayer && baseDelta < 0) {
      const nextBaseDelta = Math.min(0, baseDelta + rulesConfig.shieldLossReduction);
      shieldDeltaByPlayerId[player.id] = nextBaseDelta - baseDelta;
      adjustedBaseDeltaByPlayerId[player.id] = nextBaseDelta;
    }
  }

  return { adjustedBaseDeltaByPlayerId, shieldDeltaByPlayerId };
}

export function applyCounterCards(args: {
  players: PlayerState[];
  situation: RoundSituation;
  rng?: () => number;
  rulesConfig?: RulesConfig;
}): CounterResolution {
  const rng = args.rng ?? Math.random;
  const rulesConfig = args.rulesConfig ?? BASELINE_RULES_CONFIG;
  const counterDeltaByPlayerId = zeroDeltas(args.situation.validPlayerIds);
  const counterTargetByUserId: Record<string, string> = {};
  const betrayerIds = args.situation.betrayalPlayerIds;
  for (const player of args.players) {
    const playedCard = player.playedCard;
    const isValid = args.situation.validPlayerIds.includes(player.id);
    const isAlliance = args.situation.judgedFactionByPlayerId[player.id] === 'alliance';
    if (isValid && playedCard?.type === 'counter' && isAlliance && betrayerIds.length > 0) {
      const targetId = betrayerIds[Math.floor(rng() * betrayerIds.length)];
      counterDeltaByPlayerId[targetId] = (counterDeltaByPlayerId[targetId] ?? 0) + rulesConfig.counterTargetDelta;
      counterTargetByUserId[player.id] = targetId;
    }
  }
  return { counterDeltaByPlayerId, counterTargetByUserId };
}

export function resolveFateCards(args: {
  players: PlayerState[];
  situation: RoundSituation;
  rulesConfig?: RulesConfig;
}): Record<string, number> {
  const fateDeltaByPlayerId = zeroDeltas(args.situation.validPlayerIds);
  const rulesConfig = args.rulesConfig ?? BASELINE_RULES_CONFIG;
  for (const player of args.players) {
    const prediction = player.playedCard?.fatePrediction;
    const isValid = args.situation.validPlayerIds.includes(player.id);
    if (!isValid || player.playedCard?.type !== 'fate' || !prediction) {
      continue;
    }

    if (prediction.kind === 'majority') {
      const predictedCount = prediction.predictedMajority === 'alliance' ? args.situation.allianceCount : args.situation.betrayalCount;
      const oppositeCount = prediction.predictedMajority === 'alliance' ? args.situation.betrayalCount : args.situation.allianceCount;
      fateDeltaByPlayerId[player.id] = predictedCount > oppositeCount ? rulesConfig.fateDeltas.hit : rulesConfig.fateDeltas.miss;
    } else {
      fateDeltaByPlayerId[player.id] =
        args.situation.judgedFactionByPlayerId[prediction.targetPlayerId] === prediction.predictedFaction ? rulesConfig.fateDeltas.hit : rulesConfig.fateDeltas.miss;
    }
  }
  return fateDeltaByPlayerId;
}

export function describeCardResolution(args: {
  state: GameState;
  situation: RoundSituation;
  baseDeltaByPlayerId: Record<string, number>;
  adjustedBaseDeltaByPlayerId: Record<string, number>;
  shieldDeltaByPlayerId: Record<string, number>;
  counterTargetByUserId: Record<string, string>;
  fateDeltaByPlayerId: Record<string, number>;
  rulesConfig?: RulesConfig;
}): string[] {
  const lines: string[] = [];
  const rulesConfig = args.rulesConfig ?? BASELINE_RULES_CONFIG;
  for (const player of args.state.players) {
    if (!args.situation.validPlayerIds.includes(player.id) || !player.playedCard) {
      continue;
    }
    if (player.playedCard.type === 'shield') {
      const originalBase = args.baseDeltaByPlayerId[player.id] ?? 0;
      const adjustedBase = args.adjustedBaseDeltaByPlayerId[player.id] ?? originalBase;
      const reduction = args.shieldDeltaByPlayerId[player.id] ?? 0;
      const triggered = reduction > 0 ? '觸發' : '未觸發';
      lines.push(`${player.name} 的 ${cardLabel('shield')} ${triggered}：原本基礎結算 ${originalBase}，庇護後 ${adjustedBase}，實際減免 ${reduction}。`);
    }
    if (player.playedCard.type === 'counter') {
      const targetId = args.counterTargetByUserId[player.id];
      if (targetId) {
        lines.push(`${player.name} 的 ${cardLabel('counter')} 觸發：${playerName(args.state.players, targetId)} 是被反擊的背叛者，目標額外 ${rulesConfig.counterTargetDelta}。`);
      } else {
        lines.push(`${player.name} 的 ${cardLabel('counter')} 未觸發：本回合未符合合作且存在背叛者的條件。`);
      }
    }
    if (player.playedCard.type === 'fate' && player.playedCard.fatePrediction) {
      const prediction = player.playedCard.fatePrediction;
      const delta = args.fateDeltaByPlayerId[player.id] ?? 0;
      const outcome = delta > 0 ? '命中' : '落空';
      if (prediction.kind === 'majority') {
        lines.push(`${player.name} 的 ${cardLabel('fate')} 陣營多數預言：${factionLabel(prediction.predictedMajority)}多數，結果${outcome}，修正 ${delta}。`);
      } else {
        lines.push(
          `${player.name} 的 ${cardLabel('fate')} 身分預言：${playerName(args.state.players, prediction.targetPlayerId)} 最終判定為${factionLabel(prediction.predictedFaction)}，結果${outcome}，修正 ${delta}。`
        );
      }
    }
  }
  return lines;
}
