import { decideBotPeekFactionSwitch } from './botDecision';
import { cardLabel, factionLabel, playerName } from './log';
import { BASELINE_RULES_CONFIG, type RulesConfig } from './rulesConfig';
import type { CardType, Faction, GameState, PlayerState, RoundSituation } from './types';

export interface CounterResolution {
  counterDeltaByPlayerId: Record<string, number>;
  counterTargetByUserId: Record<string, string>;
}

export interface PeekResolution {
  state: GameState;
  peekedFaction?: Faction;
  error?: string;
}

function zeroDeltas(playerIds: string[]): Record<string, number> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));
}

function oppositeFaction(faction: Faction): Faction {
  return faction === 'alliance' ? 'betrayal' : 'alliance';
}

function publicCardOrderIndex(cardType: CardType, rulesConfig: RulesConfig): number {
  const index = rulesConfig.publicCardResolveOrder.indexOf(cardType);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function dealerOrderIndex(state: GameState, playerId: string): number {
  const activePlayers = state.players.filter((player) => !player.isEliminated);
  const playerIndex = activePlayers.findIndex((player) => player.id === playerId);
  const dealerIndex = activePlayers.findIndex((player) => player.id === state.dealerPlayerId);
  if (playerIndex < 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  const startIndex = dealerIndex < 0 ? 0 : dealerIndex;
  return (playerIndex - startIndex + activePlayers.length) % activePlayers.length;
}

export function getPublicCardResolvePlayers(state: GameState, rulesConfig: RulesConfig = BASELINE_RULES_CONFIG): PlayerState[] {
  return state.players
    .filter(
      (player) =>
        !player.isEliminated &&
        player.playedCard?.isPublic &&
        rulesConfig.publicCardResolveOrder.includes(player.playedCard.type)
    )
    .sort((left, right) => {
      const leftCardOrder = publicCardOrderIndex(left.playedCard?.type ?? 'counter', rulesConfig);
      const rightCardOrder = publicCardOrderIndex(right.playedCard?.type ?? 'counter', rulesConfig);
      return leftCardOrder - rightCardOrder || dealerOrderIndex(state, left.id) - dealerOrderIndex(state, right.id);
    });
}

export function getPeekTargetPlayers(state: GameState, userPlayerId: string): PlayerState[] {
  return state.players.filter((player) => player.id !== userPlayerId && !player.isEliminated && Boolean(player.chosenFaction));
}

export function validatePeekTarget(state: GameState, userPlayerId: string, targetPlayerId: string): string | undefined {
  const user = state.players.find((player) => player.id === userPlayerId);
  if (!user || user.isEliminated || user.playedCard?.type !== 'peek') {
    return '操作無效：玩家本回合沒有可處理的真理之眼。';
  }
  if (user.hasResolvedPeek) {
    return '操作無效：本回合真理之眼已完成。';
  }
  const target = state.players.find((player) => player.id === targetPlayerId);
  if (!target || target.isEliminated) {
    return '操作無效：真理之眼目標必須是有效玩家。';
  }
  if (target.id === user.id) {
    return '操作無效：真理之眼不可指定自己。';
  }
  if (!target.chosenFaction) {
    return '操作無效：真理之眼目標尚未暗放陣營牌。';
  }
  return undefined;
}

export function hasPendingHumanPeekResolution(state: GameState): boolean {
  return state.players.some(
    (player) => !player.isEliminated && player.isHuman && player.playedCard?.type === 'peek' && !player.hasResolvedPeek
  );
}

export function resolvePeekChoice(
  state: GameState,
  userPlayerId: string,
  targetPlayerId: string,
  shouldSwitchFaction: boolean
): PeekResolution {
  const validationError = validatePeekTarget(state, userPlayerId, targetPlayerId);
  if (validationError) {
    return { state, error: validationError };
  }
  const user = state.players.find((player) => player.id === userPlayerId);
  const target = state.players.find((player) => player.id === targetPlayerId);
  if (!user?.judgedFaction || !target?.chosenFaction) {
    return { state, error: '操作無效：真理之眼需要已暗放的使用者陣營與目標陣營。' };
  }

  const nextJudgedFaction = shouldSwitchFaction ? oppositeFaction(user.judgedFaction) : user.judgedFaction;
  const players = state.players.map((player) => {
    if (player.id !== user.id) {
      return player;
    }
    return {
      ...player,
      judgedFaction: nextJudgedFaction,
      hasResolvedPublicCard: true,
      hasResolvedPeek: true,
      hasChangedFactionByPeek: shouldSwitchFaction,
      playedCard: player.playedCard
        ? {
            ...player.playedCard,
            targetPlayerId
          }
        : player.playedCard
    };
  });
  const publicLine = shouldSwitchFaction ? `${user.name} 已重新選擇陣營。` : `${user.name} 完成真理之眼。`;

  return {
    state: {
      ...state,
      players,
      eventLog: [...state.eventLog, publicLine]
    },
    peekedFaction: target.chosenFaction
  };
}

function resolveBotPeek(state: GameState, player: PlayerState, rng: () => number): GameState {
  if (player.hasResolvedPeek) {
    return state;
  }
  const targets = getPeekTargetPlayers(state, player.id);
  const currentTarget = targets.find((target) => target.id === player.playedCard?.targetPlayerId) ?? targets[0];
  if (!currentTarget) {
    return {
      ...state,
      players: state.players.map((candidate) =>
        candidate.id === player.id ? { ...candidate, hasResolvedPublicCard: true, hasResolvedPeek: true } : candidate
      ),
      eventLog: [...state.eventLog, `${player.name} 的 ${cardLabel('peek')} 未觸發：沒有可指定的目標。`]
    };
  }
  const shouldSwitchFaction = decideBotPeekFactionSwitch(state, player, currentTarget, rng);
  const resolution = resolvePeekChoice(state, player.id, currentTarget.id, shouldSwitchFaction);
  return resolution.state;
}

export function resolvePublicCards(
  state: GameState,
  rulesConfig: RulesConfig = BASELINE_RULES_CONFIG,
  rng: () => number = Math.random
): GameState {
  const publicCards = getPublicCardResolvePlayers(state, rulesConfig);

  let nextState = state;
  for (const player of publicCards) {
    const currentPlayer = nextState.players.find((candidate) => candidate.id === player.id);
    if (!currentPlayer) {
      continue;
    }
    const playedCard = currentPlayer?.playedCard;
    if (!playedCard || currentPlayer.hasResolvedPublicCard) {
      continue;
    }
    if (playedCard.type === 'peek') {
      if (currentPlayer.isHuman && !currentPlayer.hasResolvedPeek) {
        break;
      }
      if (!currentPlayer.isHuman) {
        nextState = resolveBotPeek(nextState, currentPlayer, rng);
      }
    }
  }

  return nextState;
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
