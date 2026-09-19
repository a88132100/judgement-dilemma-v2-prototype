import { decideBotPeekFactionSwitch } from './botDecision';
import { EXPEDIENCY_DELTAS } from './constants';
import { isHiddenFunctionCard } from './cardRules';
import { cardLabel, factionLabel, playerName } from './log';
import { BASELINE_RULES_CONFIG, type RulesConfig } from './rulesConfig';
import type { CardType, Faction, GameState, PlayerState, RoundSituation } from './types';

export interface CounterResolution {
  counterDeltaByPlayerId: Record<string, number>;
  counterTargetByUserId: Record<string, string>;
}

export interface MirrorResolution {
  adjustedBaseDeltaByPlayerId: Record<string, number>;
  mirrorDeltaByPlayerId: Record<string, number>;
  mirrorTargetByUserId: Record<string, string>;
  mirrorSuccessByUserId: Record<string, boolean>;
}

export interface GambleResolution {
  players: PlayerState[];
  gambleDeltaByPlayerId: Record<string, number>;
  gambleDiscardByPlayerId: Record<string, CardType | undefined>;
  gambleSuccessByPlayerId: Record<string, boolean>;
}

export interface ExpediencyResolution {
  players: PlayerState[];
  expediencyDeltaByPlayerId: Record<string, number>;
  expediencyDrawBonusByPlayerId: Record<string, number>;
  expediencyDiscardByPlayerId: Record<string, CardType | undefined>;
  promiseTaxTargetByUserId: Record<string, string>;
  favorTargetByUserId: Record<string, string>;
}

export interface PeekResolution {
  state: GameState;
  peekedFaction?: Faction;
  error?: string;
}

export interface ChaosResolution {
  state: GameState;
  error?: string;
}

function zeroDeltas(playerIds: string[]): Record<string, number> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));
}

function addDelta(deltaByPlayerId: Record<string, number>, playerId: string, delta: number): void {
  deltaByPlayerId[playerId] = (deltaByPlayerId[playerId] ?? 0) + delta;
}

function addDrawBonus(drawBonusByPlayerId: Record<string, number>, playerId: string, count: number): void {
  drawBonusByPlayerId[playerId] = (drawBonusByPlayerId[playerId] ?? 0) + count;
}

function oppositeFaction(faction: Faction): Faction {
  return faction === 'alliance' ? 'betrayal' : 'alliance';
}

function isFunctionCardEnabled(player: PlayerState): boolean {
  return !player.disabledFunctionCardThisRound;
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

function hasBrokenPromiseForTax(player: PlayerState, situation: RoundSituation): boolean {
  const judgedFaction = situation.judgedFactionByPlayerId[player.id];
  if (!player.commitment || !judgedFaction) {
    return false;
  }
  if (player.chaosTargetedThisRound && player.chosenFaction === player.commitment && judgedFaction !== player.commitment) {
    return false;
  }
  return player.commitment !== judgedFaction;
}

function pickTargetByIds(players: PlayerState[], targetIds: string[], preferredTargetId: string | undefined, rng: () => number): PlayerState | undefined {
  const preferredTarget = preferredTargetId ? players.find((player) => player.id === preferredTargetId && targetIds.includes(player.id)) : undefined;
  if (preferredTarget) {
    return preferredTarget;
  }
  if (targetIds.length === 0) {
    return undefined;
  }
  return players.find((player) => player.id === targetIds[Math.floor(rng() * targetIds.length)]);
}

export function getPublicCardResolvePlayers(state: GameState, rulesConfig: RulesConfig = BASELINE_RULES_CONFIG): PlayerState[] {
  return state.players
    .filter((player) => !player.isEliminated && player.playedCard?.isPublic && rulesConfig.publicCardResolveOrder.includes(player.playedCard.type))
    .sort((left, right) => {
      const leftCardOrder = publicCardOrderIndex(left.playedCard?.type ?? 'counter', rulesConfig);
      const rightCardOrder = publicCardOrderIndex(right.playedCard?.type ?? 'counter', rulesConfig);
      return leftCardOrder - rightCardOrder || dealerOrderIndex(state, left.id) - dealerOrderIndex(state, right.id);
    });
}

export function getPeekTargetPlayers(state: GameState, userPlayerId: string): PlayerState[] {
  return state.players.filter((player) => player.id !== userPlayerId && !player.isEliminated && Boolean(player.chosenFaction));
}

export function getChaosTargetPlayers(state: GameState, _userPlayerId: string): PlayerState[] {
  return state.players.filter((player) => !player.isEliminated && Boolean(player.chosenFaction));
}

export function validatePeekTarget(state: GameState, userPlayerId: string, targetPlayerId: string): string | undefined {
  const user = state.players.find((player) => player.id === userPlayerId);
  if (!user || user.isEliminated || user.playedCard?.type !== 'peek') {
    return '無法使用真理之眼：本回合沒有可解析的真理之眼。';
  }
  if (user.hasResolvedPeek) {
    return '無法使用真理之眼：本回合已完成解析。';
  }
  const target = state.players.find((player) => player.id === targetPlayerId);
  if (!target || target.isEliminated) {
    return '無法使用真理之眼：目標不是有效玩家。';
  }
  if (target.id === user.id) {
    return '無法使用真理之眼：不可指定自己。';
  }
  if (!target.chosenFaction) {
    return '無法使用真理之眼：目標尚未出牌。';
  }
  return undefined;
}

export function hasPendingHumanPeekResolution(state: GameState): boolean {
  return state.players.some((player) => !player.isEliminated && player.isHuman && player.playedCard?.type === 'peek' && !player.hasResolvedPeek);
}

export function validateChaosTarget(state: GameState, userPlayerId: string, targetPlayerId: string): string | undefined {
  const user = state.players.find((player) => player.id === userPlayerId);
  if (!user || user.isEliminated || user.playedCard?.type !== 'chaos') {
    return '無法使用混沌：本回合沒有可解析的混沌。';
  }
  if (user.hasResolvedChaos) {
    return '無法使用混沌：本回合已解析過。';
  }
  const target = state.players.find((player) => player.id === targetPlayerId);
  if (!target || target.isEliminated) {
    return '無法使用混沌：目標不是有效玩家。';
  }
  if (!target.chosenFaction) {
    return '無法使用混沌：目標尚未出牌。';
  }
  return undefined;
}

export function hasPendingHumanChaosResolution(state: GameState): boolean {
  return state.players.some((player) => !player.isEliminated && player.isHuman && player.playedCard?.type === 'chaos' && !player.hasResolvedChaos);
}

function withChaosAppliedToTarget(player: PlayerState): PlayerState {
  if (!player.chosenFaction) {
    return player;
  }
  const disabledFunctionCardThisRound = Boolean(player.playedCard && isHiddenFunctionCard(player.playedCard.type));
  return {
    ...player,
    judgedFaction: oppositeFaction(player.chosenFaction),
    chaosTargetedThisRound: true,
    disabledFunctionCardThisRound
  };
}

export function applyChaosEffects(state: GameState): GameState {
  let hasChange = false;
  const players = state.players.map((player) => {
    if (!player.chaosTargetedThisRound || player.isEliminated || !player.chosenFaction) {
      return player;
    }
    const nextPlayer = withChaosAppliedToTarget(player);
    hasChange =
      hasChange ||
      nextPlayer.judgedFaction !== player.judgedFaction ||
      nextPlayer.disabledFunctionCardThisRound !== player.disabledFunctionCardThisRound;
    return nextPlayer;
  });
  return hasChange ? { ...state, players } : state;
}

export function resolveChaosChoice(state: GameState, userPlayerId: string, targetPlayerId: string): ChaosResolution {
  const validationError = validateChaosTarget(state, userPlayerId, targetPlayerId);
  if (validationError) {
    return { state, error: validationError };
  }
  const user = state.players.find((player) => player.id === userPlayerId);
  const target = state.players.find((player) => player.id === targetPlayerId);
  if (!user || !target?.chosenFaction) {
    return { state, error: '無法使用混沌：目標狀態不完整。' };
  }

  const players = state.players.map((player) => {
    if (player.id === user.id && player.id === target.id) {
      const targetPlayer = withChaosAppliedToTarget(player);
      return {
        ...targetPlayer,
        hasResolvedPublicCard: true,
        hasResolvedChaos: true,
        playedCard: targetPlayer.playedCard ? { ...targetPlayer.playedCard, targetPlayerId } : targetPlayer.playedCard
      };
    }
    if (player.id === user.id) {
      return {
        ...player,
        hasResolvedPublicCard: true,
        hasResolvedChaos: true,
        playedCard: player.playedCard ? { ...player.playedCard, targetPlayerId } : player.playedCard
      };
    }
    if (player.id === target.id) {
      return withChaosAppliedToTarget(player);
    }
    return player;
  });
  const targetAfterChaos = players.find((player) => player.id === target.id);
  const disabledLine = targetAfterChaos?.disabledFunctionCardThisRound ? `，${target.name} 的暗放功能牌失效` : '';

  return {
    state: {
      ...state,
      players,
      eventLog: [...state.eventLog, `${user.name} 使用 ${cardLabel('chaos')} 指定 ${target.name}，最終陣營反轉${disabledLine}。`]
    }
  };
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
    return { state, error: '無法使用真理之眼：使用者或目標狀態不完整。' };
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
      playedCard: player.playedCard ? { ...player.playedCard, targetPlayerId } : player.playedCard
    };
  });
  const publicLine = shouldSwitchFaction ? `${user.name} 已重新選擇陣營。` : `${user.name} 完成 ${cardLabel('peek')}。`;

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
      eventLog: [...state.eventLog, `${player.name} 的 ${cardLabel('peek')} 沒有有效目標。`]
    };
  }
  const shouldSwitchFaction = decideBotPeekFactionSwitch(state, player, currentTarget, rng);
  const resolution = resolvePeekChoice(state, player.id, currentTarget.id, shouldSwitchFaction);
  return resolution.state;
}

function pickBotChaosTarget(state: GameState, player: PlayerState, rng: () => number): PlayerState | undefined {
  const targets = getChaosTargetPlayers(state, player.id);
  const preferredTargets = targets.filter((target) => target.id !== player.id);
  const targetPool = preferredTargets.length > 0 ? preferredTargets : targets;
  if (targetPool.length === 0) {
    return undefined;
  }
  const highestJudgment = Math.max(...targetPool.map((target) => target.judgmentPoints));
  const highestTargets = targetPool.filter((target) => target.judgmentPoints === highestJudgment);
  return highestTargets[Math.floor(rng() * highestTargets.length)];
}

function resolveBotChaos(state: GameState, player: PlayerState, rng: () => number): GameState {
  if (player.hasResolvedChaos) {
    return state;
  }
  const targets = getChaosTargetPlayers(state, player.id);
  const currentTarget = targets.find((target) => target.id === player.playedCard?.targetPlayerId) ?? pickBotChaosTarget(state, player, rng);
  if (!currentTarget) {
    return {
      ...state,
      players: state.players.map((candidate) =>
        candidate.id === player.id ? { ...candidate, hasResolvedPublicCard: true, hasResolvedChaos: true } : candidate
      ),
      eventLog: [...state.eventLog, `${player.name} 的 ${cardLabel('chaos')} 沒有有效目標。`]
    };
  }
  return resolveChaosChoice(state, player.id, currentTarget.id).state;
}

function resolveAutomaticPublicCard(state: GameState, player: PlayerState): GameState {
  if (!player.playedCard || player.hasResolvedPublicCard) {
    return state;
  }
  return {
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === player.id ? { ...candidate, hasResolvedPublicCard: true } : candidate
    ),
    eventLog: [...state.eventLog, `${player.name} 公開 ${cardLabel(player.playedCard.type)}，效果將在裁決時結算。`]
  };
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
    const playedCard = currentPlayer.playedCard;
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
    } else if (playedCard.type === 'chaos') {
      if (currentPlayer.isHuman && !currentPlayer.hasResolvedChaos) {
        break;
      }
      if (!currentPlayer.isHuman) {
        nextState = resolveBotChaos(nextState, currentPlayer, rng);
      }
    } else {
      nextState = resolveAutomaticPublicCard(nextState, currentPlayer);
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
    if (isValid && isFunctionCardEnabled(player) && playedCard?.type === 'shield' && isAlliance && hasBetrayer && baseDelta < 0) {
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
    if (isValid && isFunctionCardEnabled(player) && playedCard?.type === 'counter' && isAlliance && betrayerIds.length > 0) {
      const targetId = betrayerIds[Math.floor(rng() * betrayerIds.length)];
      addDelta(counterDeltaByPlayerId, targetId, rulesConfig.counterTargetDelta);
      counterTargetByUserId[player.id] = targetId;
    }
  }
  return { counterDeltaByPlayerId, counterTargetByUserId };
}

export function applyMirrorCards(args: {
  players: PlayerState[];
  situation: RoundSituation;
  adjustedBaseDeltaByPlayerId: Record<string, number>;
  rng?: () => number;
}): MirrorResolution {
  const rng = args.rng ?? Math.random;
  const adjustedBaseDeltaByPlayerId = { ...args.adjustedBaseDeltaByPlayerId };
  const mirrorDeltaByPlayerId = zeroDeltas(args.situation.validPlayerIds);
  const mirrorTargetByUserId: Record<string, string> = {};
  const mirrorSuccessByUserId: Record<string, boolean> = {};
  const targetGroups: Record<string, PlayerState[]> = {};

  if (args.situation.resultType !== 'minorityBetrayal' || args.situation.betrayalPlayerIds.length === 0) {
    return { adjustedBaseDeltaByPlayerId, mirrorDeltaByPlayerId, mirrorTargetByUserId, mirrorSuccessByUserId };
  }

  for (const player of args.players) {
    const isValid = args.situation.validPlayerIds.includes(player.id);
    const isAlliance = args.situation.judgedFactionByPlayerId[player.id] === 'alliance';
    if (!isValid || !isFunctionCardEnabled(player) || player.playedCard?.type !== 'mirror' || !isAlliance) {
      continue;
    }
    const targetId = args.situation.betrayalPlayerIds[Math.floor(rng() * args.situation.betrayalPlayerIds.length)];
    mirrorTargetByUserId[player.id] = targetId;
    targetGroups[targetId] = [...(targetGroups[targetId] ?? []), player];
  }

  for (const [targetId, mirrorUsers] of Object.entries(targetGroups)) {
    const winnerIndex = Math.floor(rng() * mirrorUsers.length);
    mirrorUsers.forEach((player, index) => {
      if (index === winnerIndex) {
        const userDelta = adjustedBaseDeltaByPlayerId[player.id] ?? 0;
        const targetDelta = adjustedBaseDeltaByPlayerId[targetId] ?? 0;
        adjustedBaseDeltaByPlayerId[player.id] = targetDelta;
        adjustedBaseDeltaByPlayerId[targetId] = userDelta;
        addDelta(mirrorDeltaByPlayerId, player.id, targetDelta - userDelta);
        addDelta(mirrorDeltaByPlayerId, targetId, userDelta - targetDelta);
        mirrorSuccessByUserId[player.id] = true;
        return;
      }

      const currentDelta = adjustedBaseDeltaByPlayerId[player.id] ?? 0;
      if (currentDelta < 0) {
        adjustedBaseDeltaByPlayerId[player.id] = 0;
        addDelta(mirrorDeltaByPlayerId, player.id, -currentDelta);
      }
      mirrorSuccessByUserId[player.id] = false;
    });
  }

  return { adjustedBaseDeltaByPlayerId, mirrorDeltaByPlayerId, mirrorTargetByUserId, mirrorSuccessByUserId };
}

export function resolveGambleCards(args: {
  players: PlayerState[];
  situation: RoundSituation;
  rng?: () => number;
  rulesConfig?: RulesConfig;
}): GambleResolution {
  const rng = args.rng ?? Math.random;
  const rulesConfig = args.rulesConfig ?? BASELINE_RULES_CONFIG;
  const gambleDeltaByPlayerId = zeroDeltas(args.situation.validPlayerIds);
  const gambleDiscardByPlayerId: Record<string, CardType | undefined> = {};
  const gambleSuccessByPlayerId: Record<string, boolean> = {};
  const players = args.players.map((player) => {
    const isValid = args.situation.validPlayerIds.includes(player.id);
    if (!isValid || !isFunctionCardEnabled(player) || player.playedCard?.type !== 'gamble') {
      return player;
    }

    const isOnlyBetrayer =
      args.situation.judgedFactionByPlayerId[player.id] === 'betrayal' &&
      args.situation.betrayalPlayerIds.length === 1 &&
      args.situation.betrayalPlayerIds[0] === player.id;
    gambleSuccessByPlayerId[player.id] = isOnlyBetrayer;
    if (isOnlyBetrayer) {
      gambleDeltaByPlayerId[player.id] = rulesConfig.gambleDeltas.hit;
      return player;
    }

    gambleDeltaByPlayerId[player.id] = rulesConfig.gambleDeltas.miss;
    if (player.hand.length === 0) {
      return { ...player, skipNextDraw: true };
    }
    const discardIndex = Math.floor(rng() * player.hand.length);
    const discardedCard = player.hand[discardIndex];
    gambleDiscardByPlayerId[player.id] = discardedCard;
    return {
      ...player,
      hand: [...player.hand.slice(0, discardIndex), ...player.hand.slice(discardIndex + 1)]
    };
  });

  return { players, gambleDeltaByPlayerId, gambleDiscardByPlayerId, gambleSuccessByPlayerId };
}

export function resolveFateCards(args: {
  players: PlayerState[];
  situation: RoundSituation;
  rulesConfig?: RulesConfig;
  hitByPlayerId?: Record<string, boolean>;
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
      const hit = predictedCount > oppositeCount;
      if (args.hitByPlayerId) args.hitByPlayerId[player.id] = hit;
      fateDeltaByPlayerId[player.id] = hit ? rulesConfig.fateDeltas.hit : rulesConfig.fateDeltas.miss;
    } else {
      const hit = args.situation.judgedFactionByPlayerId[prediction.targetPlayerId] === prediction.predictedFaction;
      if (args.hitByPlayerId) args.hitByPlayerId[player.id] = hit;
      fateDeltaByPlayerId[player.id] = hit ? rulesConfig.fateDeltas.hit : rulesConfig.fateDeltas.miss;
    }
  }
  return fateDeltaByPlayerId;
}

export function resolveExpediencyCards(args: {
  players: PlayerState[];
  situation: RoundSituation;
  rng?: () => number;
}): ExpediencyResolution {
  const rng = args.rng ?? Math.random;
  const expediencyDeltaByPlayerId = zeroDeltas(args.situation.validPlayerIds);
  const expediencyDrawBonusByPlayerId = zeroDeltas(args.situation.validPlayerIds);
  const expediencyDiscardByPlayerId: Record<string, CardType | undefined> = {};
  const expediencyDiscardIndexByPlayerId: Record<string, number> = {};
  const promiseTaxTargetByUserId: Record<string, string> = {};
  const favorTargetByUserId: Record<string, string> = {};

  for (const player of args.players) {
    const playedCard = player.playedCard;
    const isValid = args.situation.validPlayerIds.includes(player.id);
    if (!isValid || !playedCard) {
      continue;
    }

    if (playedCard.type === 'smallGain') {
      addDelta(expediencyDeltaByPlayerId, player.id, EXPEDIENCY_DELTAS.smallGain);
    }

    if (playedCard.type === 'promiseTax') {
      const brokenPromiseIds = args.players
        .filter((candidate) => args.situation.validPlayerIds.includes(candidate.id) && hasBrokenPromiseForTax(candidate, args.situation))
        .map((candidate) => candidate.id);
      const target = pickTargetByIds(args.players, brokenPromiseIds, playedCard.targetPlayerId, rng);
      if (target) {
        promiseTaxTargetByUserId[player.id] = target.id;
        addDelta(expediencyDeltaByPlayerId, target.id, EXPEDIENCY_DELTAS.promiseTax);
      }
    }

    if (playedCard.type === 'consensus') {
      addDelta(
        expediencyDeltaByPlayerId,
        player.id,
        args.situation.allianceCount >= 3 ? EXPEDIENCY_DELTAS.consensusHit : EXPEDIENCY_DELTAS.consensusMiss
      );
    }

    if (playedCard.type === 'slip') {
      addDelta(expediencyDeltaByPlayerId, player.id, EXPEDIENCY_DELTAS.slip);
      addDrawBonus(expediencyDrawBonusByPlayerId, player.id, 1);
    }

    if (!isFunctionCardEnabled(player)) {
      continue;
    }

    if (playedCard.type === 'favor') {
      const targetIds = args.situation.validPlayerIds.filter((playerId) => playerId !== player.id);
      const target = pickTargetByIds(args.players, targetIds, playedCard.targetPlayerId, rng);
      if (!target) {
        continue;
      }
      favorTargetByUserId[player.id] = target.id;
      if (args.situation.judgedFactionByPlayerId[player.id] === args.situation.judgedFactionByPlayerId[target.id]) {
        addDelta(expediencyDeltaByPlayerId, player.id, EXPEDIENCY_DELTAS.favor);
        addDelta(expediencyDeltaByPlayerId, target.id, EXPEDIENCY_DELTAS.favor);
      }
    }

    if (playedCard.type === 'evenOmen') {
      if (args.situation.betrayalCount % 2 === 0) {
        addDrawBonus(expediencyDrawBonusByPlayerId, player.id, 1);
      } else if (player.hand.length > 0) {
        const discardIndex = Math.floor(rng() * player.hand.length);
        expediencyDiscardByPlayerId[player.id] = player.hand[discardIndex];
        expediencyDiscardIndexByPlayerId[player.id] = discardIndex;
      } else {
        addDelta(expediencyDeltaByPlayerId, player.id, EXPEDIENCY_DELTAS.evenOmenMiss);
      }
    }
  }

  const players = args.players.map((player) => {
    const bonusDraws = expediencyDrawBonusByPlayerId[player.id] ?? 0;
    const discardIndex = expediencyDiscardIndexByPlayerId[player.id];
    const hasDiscard = Object.prototype.hasOwnProperty.call(expediencyDiscardIndexByPlayerId, player.id);
    if (bonusDraws <= 0 && !hasDiscard) {
      return player;
    }
    const hand = hasDiscard ? [...player.hand.slice(0, discardIndex), ...player.hand.slice(discardIndex + 1)] : player.hand;
    return {
      ...player,
      hand,
      bonusDrawsNextDrawPhase: bonusDraws > 0 ? (player.bonusDrawsNextDrawPhase ?? 0) + bonusDraws : player.bonusDrawsNextDrawPhase
    };
  });

  return {
    players,
    expediencyDeltaByPlayerId,
    expediencyDrawBonusByPlayerId,
    expediencyDiscardByPlayerId,
    promiseTaxTargetByUserId,
    favorTargetByUserId
  };
}

export function describeCardResolution(args: {
  state: GameState;
  situation: RoundSituation;
  baseDeltaByPlayerId: Record<string, number>;
  adjustedBaseDeltaByPlayerId: Record<string, number>;
  shieldDeltaByPlayerId: Record<string, number>;
  counterTargetByUserId: Record<string, string>;
  mirrorTargetByUserId: Record<string, string>;
  mirrorSuccessByUserId: Record<string, boolean>;
  fateDeltaByPlayerId: Record<string, number>;
  gambleDeltaByPlayerId: Record<string, number>;
  gambleDiscardByPlayerId: Record<string, CardType | undefined>;
  expediencyDeltaByPlayerId: Record<string, number>;
  expediencyDrawBonusByPlayerId: Record<string, number>;
  expediencyDiscardByPlayerId: Record<string, CardType | undefined>;
  promiseTaxTargetByUserId: Record<string, string>;
  favorTargetByUserId: Record<string, string>;
  rulesConfig?: RulesConfig;
}): string[] {
  const lines: string[] = [];
  const rulesConfig = args.rulesConfig ?? BASELINE_RULES_CONFIG;
  for (const player of args.state.players) {
    if (!args.situation.validPlayerIds.includes(player.id) || !player.playedCard) {
      continue;
    }
    if (player.disabledFunctionCardThisRound && isHiddenFunctionCard(player.playedCard.type)) {
      lines.push(`${player.name} 的 ${cardLabel(player.playedCard.type)} 因 ${cardLabel('chaos')} 失效。`);
      continue;
    }
    if (player.playedCard.type === 'shield') {
      const originalBase = args.baseDeltaByPlayerId[player.id] ?? 0;
      const adjustedBase = args.adjustedBaseDeltaByPlayerId[player.id] ?? originalBase;
      const reduction = args.shieldDeltaByPlayerId[player.id] ?? 0;
      lines.push(`${player.name} 的 ${cardLabel('shield')} ${reduction > 0 ? '觸發' : '未觸發'}，基礎結算 ${originalBase} 調整為 ${adjustedBase}。`);
    }
    if (player.playedCard.type === 'counter') {
      const targetId = args.counterTargetByUserId[player.id];
      lines.push(
        targetId
          ? `${player.name} 的 ${cardLabel('counter')} 指定 ${playerName(args.state.players, targetId)}，目標 ${rulesConfig.counterTargetDelta}。`
          : `${player.name} 的 ${cardLabel('counter')} 未找到可反擊目標。`
      );
    }
    if (player.playedCard.type === 'mirror') {
      const targetId = args.mirrorTargetByUserId[player.id];
      if (!targetId) {
        lines.push(`${player.name} 的 ${cardLabel('mirror')} 未找到可交換目標。`);
      } else if (args.mirrorSuccessByUserId[player.id]) {
        lines.push(`${player.name} 的 ${cardLabel('mirror')} 與 ${playerName(args.state.players, targetId)} 交換基礎結算。`);
      } else {
        lines.push(`${player.name} 的 ${cardLabel('mirror')} 未取得交換權，負分基礎結算歸零。`);
      }
    }
    if (player.playedCard.type === 'fate' && player.playedCard.fatePrediction) {
      const prediction = player.playedCard.fatePrediction;
      const delta = args.fateDeltaByPlayerId[player.id] ?? 0;
      if (prediction.kind === 'majority') {
        lines.push(`${player.name} 的 ${cardLabel('fate')} 預言 ${factionLabel(prediction.predictedMajority)} 多數，結果 ${delta >= 0 ? '+' : ''}${delta}。`);
      } else {
        lines.push(
          `${player.name} 的 ${cardLabel('fate')} 預言 ${playerName(args.state.players, prediction.targetPlayerId)} 為 ${factionLabel(prediction.predictedFaction)}，結果 ${delta >= 0 ? '+' : ''}${delta}。`
        );
      }
    }
    if (player.playedCard.type === 'gamble') {
      const delta = args.gambleDeltaByPlayerId[player.id] ?? 0;
      const discardedCard = args.gambleDiscardByPlayerId[player.id];
      const discardText = discardedCard ? `，棄掉 ${cardLabel(discardedCard)}` : '';
      lines.push(`${player.name} 的 ${cardLabel('gamble')} 結果 ${delta >= 0 ? '+' : ''}${delta}${discardText}。`);
    }
    if (player.playedCard.type === 'smallGain') {
      lines.push(`${player.name} 使用 ${cardLabel('smallGain')}，裁決點數 +${args.expediencyDeltaByPlayerId[player.id] ?? 0}。`);
    }
    if (player.playedCard.type === 'promiseTax') {
      const targetId = args.promiseTaxTargetByUserId[player.id];
      lines.push(
        targetId
          ? `${player.name} 使用 ${cardLabel('promiseTax')}，${playerName(args.state.players, targetId)} 因失信受到 ${args.expediencyDeltaByPlayerId[targetId] ?? 0}。`
          : `${player.name} 使用 ${cardLabel('promiseTax')}，本回合沒有可課稅的失信者，效果未觸發。`
      );
    }
    if (player.playedCard.type === 'favor') {
      const targetId = args.favorTargetByUserId[player.id];
      const isSameFaction =
        Boolean(targetId) &&
        args.situation.judgedFactionByPlayerId[player.id] === args.situation.judgedFactionByPlayerId[targetId as string];
      lines.push(
        targetId && isSameFaction
          ? `${player.name} 使用 ${cardLabel('favor')}，${playerName(args.state.players, targetId)} 與其最終陣營相同，兩人裁決點數各 +1。`
          : `${player.name} 使用 ${cardLabel('favor')}，效果未觸發。`
      );
    }
    if (player.playedCard.type === 'consensus') {
      const delta = args.expediencyDeltaByPlayerId[player.id] ?? 0;
      lines.push(`${player.name} 使用 ${cardLabel('consensus')}，盟約人數 ${args.situation.allianceCount}，裁決點數 ${delta >= 0 ? '+' : ''}${delta}。`);
    }
    if (player.playedCard.type === 'slip') {
      lines.push(`${player.name} 使用 ${cardLabel('slip')}，裁決點數 ${args.expediencyDeltaByPlayerId[player.id] ?? 0}，下次抽牌額外 +${args.expediencyDrawBonusByPlayerId[player.id] ?? 0}。`);
    }
    if (player.playedCard.type === 'evenOmen') {
      const drawBonus = args.expediencyDrawBonusByPlayerId[player.id] ?? 0;
      const delta = args.expediencyDeltaByPlayerId[player.id] ?? 0;
      const discardedCard = args.expediencyDiscardByPlayerId[player.id];
      lines.push(
        drawBonus > 0
          ? `${player.name} 使用 ${cardLabel('evenOmen')}，叛離人數為偶數，下次抽牌額外 +${drawBonus}。`
          : discardedCard
            ? `${player.name} 使用 ${cardLabel('evenOmen')}，叛離人數為奇數，棄掉 ${cardLabel(discardedCard)}。`
            : `${player.name} 使用 ${cardLabel('evenOmen')}，叛離人數為奇數且無手牌可棄，裁決點數 ${delta}。`
      );
    }
  }
  return lines;
}
