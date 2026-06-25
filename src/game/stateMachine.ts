import { DRAW_CARDS_PER_ROUND, FACTION_LABELS, MVP_CARD_TYPES } from './constants';
import {
  applyCounterCards,
  applyShieldCards,
  describeCardResolution,
  hasPendingHumanPeekResolution,
  resolveFateCards,
  resolvePublicCards
} from './cardResolver';
import { canUseCardWithFaction } from './cardRules';
import { decideBotCardPlay, decideBotCommitment, decideBotFateDeclaration, decideBotFinalFaction } from './botDecision';
import { drawCards, ensureDeck } from './deck';
import { cardLabel, factionLabel } from './log';
import { BASELINE_RULES_CONFIG, type RulesConfig } from './rulesConfig';
import {
  applyRoundResult,
  buildFinalRoundResult,
  getRoundSituation,
  resolveBaseJudgment,
  resolveCommitmentDelta
} from './judgmentResolver';
import type { CardType, FatePrediction, GameState, HumanFateDeclarationInput, HumanPlayInput, PlayedCard, PlayerState } from './types';

function isValidFaction(value: unknown): value is PlayerState['chosenFaction'] {
  return value === 'alliance' || value === 'betrayal';
}

function removeOneCard(hand: CardType[], card: CardType): CardType[] {
  const index = hand.indexOf(card);
  if (index < 0) {
    return hand;
  }
  return [...hand.slice(0, index), ...hand.slice(index + 1)];
}

function withPlayedCard(player: PlayerState, playedCard?: PlayedCard): PlayerState {
  if (!playedCard) {
    return {
      ...player,
      functionCardSelection: player.functionCardSelection ?? player.playedCard?.type ?? 'blank'
    };
  }
  return {
    ...player,
    hand: removeOneCard(player.hand, playedCard.type),
    playedCard,
    functionCardSelection: playedCard.type,
    hasPlayedCardThisRound: true
  };
}

function describeFatePrediction(prediction: FatePrediction, players: PlayerState[]): string {
  if (prediction.kind === 'majority') {
    return `本回合將由【${factionLabel(prediction.predictedMajority)}陣營】多數`;
  }
  const targetName = players.find((player) => player.id === prediction.targetPlayerId)?.name ?? prediction.targetPlayerId;
  return `${targetName} 本回合最終判定為【${factionLabel(prediction.predictedFaction)}】`;
}

function validateFatePrediction(state: GameState, userPlayerId: string, prediction?: FatePrediction): string | undefined {
  if (!prediction) {
    return '操作無效：宿命必須設定預言內容。';
  }
  if (prediction.kind === 'majority') {
    return isValidFaction(prediction.predictedMajority) ? undefined : '操作無效：宿命多數預言的陣營不合法。';
  }
  const target = state.players.find((player) => player.id === prediction.targetPlayerId);
  if (!target || target.isEliminated) {
    return '操作無效：宿命身分預言目標必須是有效玩家。';
  }
  if (target.id === userPlayerId) {
    return '操作無效：宿命身分預言不可指定自己。';
  }
  if (!isValidFaction(prediction.predictedFaction)) {
    return '操作無效：宿命身分預言的陣營不合法。';
  }
  return undefined;
}

function resetRoundPlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    commitment: undefined,
    chosenFaction: undefined,
    judgedFaction: undefined,
    playedCard: undefined,
    functionCardSelection: undefined,
    hasPlayedCardThisRound: false,
    hasResolvedPublicCard: undefined,
    hasResolvedFateDeclaration: undefined,
    hasDeclaredFate: undefined,
    hasResolvedFate: undefined,
    hasResolvedPeek: undefined,
    hasChangedFactionByPeek: undefined
  };
}

export function validateHumanPlay(state: GameState, input: HumanPlayInput): string | undefined {
  const human = state.players.find((player) => player.isHuman);
  if (state.phase !== 'playCards') {
    return '操作無效：目前不是出牌階段。';
  }
  if (!human || human.isEliminated) {
    return '操作無效：真人玩家已出局或不存在。';
  }
  if (human.chosenFaction) {
    return '操作無效：你本回合已經選過最終陣營。';
  }
  if (!isValidFaction(input.chosenFaction)) {
    return '操作無效：最終陣營不合法。';
  }
  if (!input.card) {
    return undefined;
  }
  if (input.card.type === 'fate') {
    return '操作無效：宿命只能在宿命宣告階段使用。';
  }
  if (!MVP_CARD_TYPES.includes(input.card.type)) {
    return '操作無效：功能牌不屬於第一版 MVP 牌組。';
  }
  if (!human.hand.includes(input.card.type)) {
    return `操作無效：你的手牌中沒有 ${cardLabel(input.card.type)}。`;
  }
  if (human.hasPlayedCardThisRound || human.playedCard) {
    return '操作無效：每回合最多只能使用 1 張功能牌。';
  }
  if (!canUseCardWithFaction(input.card.type, input.chosenFaction)) {
    return `操作無效：${cardLabel(input.card.type)} 只能搭配合作陣營使用。`;
  }
  const target = input.card.targetPlayerId ? state.players.find((player) => player.id === input.card?.targetPlayerId) : undefined;
  if (input.card.type === 'peek' && input.card.targetPlayerId) {
    if (!target || target.isEliminated) {
      return '操作無效：真理之眼目標必須是有效玩家。';
    }
    if (target.id === human.id) {
      return '操作無效：真理之眼不可指定自己。';
    }
  }
  return undefined;
}

export function validateHumanFateDeclaration(state: GameState, input: HumanFateDeclarationInput): string | undefined {
  const human = state.players.find((player) => player.isHuman);
  if (state.phase !== 'fateDeclare') {
    return '操作無效：目前不是宿命宣告階段。';
  }
  if (!human || human.isEliminated) {
    return '操作無效：真人玩家已出局或不存在。';
  }
  if (human.hasResolvedFateDeclaration) {
    return '操作無效：本回合宿命宣告已處理。';
  }
  if (!input.useFate) {
    return undefined;
  }
  if (!human.hand.includes('fate')) {
    return `操作無效：你的手牌中沒有 ${cardLabel('fate')}。`;
  }
  if (human.hasPlayedCardThisRound || human.playedCard) {
    return '操作無效：每回合最多只能使用 1 張功能牌。';
  }
  return validateFatePrediction(state, human.id, input.fatePrediction);
}

export function submitHumanCommitment(state: GameState, commitment: PlayerState['commitment'], rng: () => number = Math.random): GameState {
  if (state.phase !== 'commitment' || !commitment) {
    return state;
  }
  const players = state.players.map((player) => {
    if (player.isEliminated) {
      return player;
    }
    if (player.isHuman) {
      return { ...player, commitment };
    }
    return { ...player, commitment: decideBotCommitment(player, rng) };
  });
  return {
    ...state,
    players,
    eventLog: [
      ...state.eventLog,
      `你承諾本回合選擇${factionLabel(commitment)}。`,
      ...players.filter((player) => !player.isHuman && !player.isEliminated).map((player) => `${player.name} 承諾選擇${factionLabel(player.commitment ?? 'alliance')}。`)
    ]
  };
}

export function submitHumanFateDeclaration(
  state: GameState,
  input: HumanFateDeclarationInput,
  rng: () => number = Math.random
): GameState {
  const validationError = validateHumanFateDeclaration(state, input);
  if (validationError) {
    return {
      ...state,
      eventLog: [...state.eventLog, validationError]
    };
  }

  const eventLog = [...state.eventLog];
  const players = state.players.map((player) => {
    if (player.isEliminated) {
      return player;
    }

    if (player.isHuman) {
      if (!input.useFate || !input.fatePrediction) {
        eventLog.push(`${player.name} 不使用 ${cardLabel('fate')}。`);
        return { ...player, hasResolvedFateDeclaration: true };
      }
      eventLog.push(`${player.name} 使用 ${cardLabel('fate')}，預言：${describeFatePrediction(input.fatePrediction, state.players)}。`);
      return {
        ...player,
        hand: removeOneCard(player.hand, 'fate'),
        playedCard: {
          type: 'fate' as const,
          userPlayerId: player.id,
          fatePrediction: input.fatePrediction,
          isPublic: true
        },
        functionCardSelection: 'fate' as const,
        hasPlayedCardThisRound: true,
        hasResolvedFateDeclaration: true,
        hasDeclaredFate: true
      };
    }

    const playedCard = decideBotFateDeclaration(state, player, rng);
    if (!playedCard?.fatePrediction) {
      return { ...player, hasResolvedFateDeclaration: true };
    }
    eventLog.push(`${player.name} 使用 ${cardLabel('fate')}，預言：${describeFatePrediction(playedCard.fatePrediction, state.players)}。`);
    return {
      ...player,
      hand: removeOneCard(player.hand, 'fate'),
      playedCard,
      functionCardSelection: 'fate' as const,
      hasPlayedCardThisRound: true,
      hasResolvedFateDeclaration: true,
      hasDeclaredFate: true
    };
  });

  return {
    ...state,
    players,
    eventLog
  };
}

export function completeHumanPlay(state: GameState, input: HumanPlayInput, rng: () => number = Math.random): GameState {
  const validationError = validateHumanPlay(state, input);
  if (validationError) {
    return {
      ...state,
      eventLog: [...state.eventLog, validationError]
    };
  }
  const players = state.players.map((player) => {
    if (player.isEliminated) {
      return player;
    }
    if (player.isHuman) {
      const playedCard = input.card
        ? {
            type: input.card.type,
            userPlayerId: player.id,
            targetPlayerId: input.card.targetPlayerId,
            fatePrediction: input.card.fatePrediction,
            isPublic: input.card.type === 'peek'
          }
        : undefined;
      return withPlayedCard({ ...player, chosenFaction: input.chosenFaction, judgedFaction: input.chosenFaction }, playedCard);
    }
    const botFaction = decideBotFinalFaction(state, player, rng);
    const playedCard = decideBotCardPlay(state, player, rng);
    const legalPlayedCard = playedCard && canUseCardWithFaction(playedCard.type, botFaction) ? playedCard : undefined;
    return withPlayedCard({ ...player, chosenFaction: botFaction, judgedFaction: botFaction }, legalPlayedCard);
  });
  return {
    ...state,
    players,
    eventLog: [
      ...state.eventLog,
      `你暗中選擇原始陣營卡：${factionLabel(input.chosenFaction)}。最終判定可能受到公開功能牌影響。`,
      '你已在功能牌區暗放 1 張密令。'
    ]
  };
}

export function executeRoundJudgment(
  state: GameState,
  rng: () => number = Math.random,
  rulesConfig: RulesConfig = BASELINE_RULES_CONFIG
): GameState {
  const situation = getRoundSituation(state.players);
  const baseDeltaByPlayerId = resolveBaseJudgment(state.players, situation, rulesConfig);
  const { adjustedBaseDeltaByPlayerId, shieldDeltaByPlayerId } = applyShieldCards({
    players: state.players,
    situation,
    baseDeltaByPlayerId,
    rulesConfig
  });
  const { counterDeltaByPlayerId, counterTargetByUserId } = applyCounterCards({ players: state.players, situation, rng, rulesConfig });
  const fateDeltaByPlayerId = resolveFateCards({ players: state.players, situation, rulesConfig });
  const commitmentDeltaByPlayerId = resolveCommitmentDelta(state.players, situation, rulesConfig);
  const result = buildFinalRoundResult({
    state,
    situation,
    baseDeltaByPlayerId,
    adjustedBaseDeltaByPlayerId,
    shieldDeltaByPlayerId,
    counterDeltaByPlayerId,
    fateDeltaByPlayerId,
    commitmentDeltaByPlayerId
  });
  const stateWithCardNotes = {
    ...state,
    eventLog: [
      ...state.eventLog,
      ...describeCardResolution({
        state,
        situation,
        baseDeltaByPlayerId,
        adjustedBaseDeltaByPlayerId,
        shieldDeltaByPlayerId,
        counterTargetByUserId,
        fateDeltaByPlayerId,
        rulesConfig
      })
    ]
  };
  const resolved = applyRoundResult(stateWithCardNotes, result, rulesConfig);
  return {
    ...resolved,
    players: resolved.players.map((player) => (player.playedCard?.type === 'fate' ? { ...player, hasResolvedFate: true } : player))
  };
}

function drawForPlayers(state: GameState, rng: () => number = Math.random, rulesConfig: RulesConfig = BASELINE_RULES_CONFIG): GameState {
  let deck = state.deck;
  let discardPile = state.discardPile;
  const eventLog = [...state.eventLog];
  const players = state.players.map((player) => {
    if (player.isEliminated || player.hand.length >= rulesConfig.handLimit) {
      return player;
    }
    const ensured = ensureDeck(deck, discardPile, rng);
    deck = ensured.deck;
    discardPile = ensured.discardPile;
    const drawResult = drawCards(deck, DRAW_CARDS_PER_ROUND);
    deck = drawResult.deck;
    eventLog.push(`${player.name} 補 ${DRAW_CARDS_PER_ROUND} 張功能牌。`);
    return { ...player, hand: [...player.hand, ...drawResult.drawn] };
  });
  return { ...state, players, deck, discardPile, eventLog };
}

function rotateDealer(players: PlayerState[], currentDealerPlayerId: string): string {
  const activePlayers = players.filter((player) => !player.isEliminated);
  if (activePlayers.length === 0) {
    return currentDealerPlayerId;
  }
  const currentIndex = activePlayers.findIndex((player) => player.id === currentDealerPlayerId);
  return activePlayers[(currentIndex + 1 + activePlayers.length) % activePlayers.length].id;
}

export function startNextRound(state: GameState): GameState {
  if (state.gameOverReason) {
    return { ...state, phase: 'gameEnd' };
  }
  const usedCards = state.players.flatMap((player) => (player.playedCard ? [player.playedCard.type] : []));
  const players = state.players.map(resetRoundPlayer);
  return {
    ...state,
    players,
    round: state.round + 1,
    phase: 'commitment',
    dealerPlayerId: rotateDealer(players, state.dealerPlayerId),
    discardPile: [...state.discardPile, ...usedCards],
    eventLog: [...state.eventLog, `進入第 ${state.round + 1} 回合。`]
  };
}

export function advancePhase(
  state: GameState,
  rng: () => number = Math.random,
  rulesConfig: RulesConfig = BASELINE_RULES_CONFIG
): GameState {
  if (state.phase === 'gameEnd') {
    return state;
  }
  if (state.gameOverReason) {
    return { ...state, phase: 'gameEnd' };
  }
  if (state.phase === 'commitment') {
    return state.players.some((player) => !player.isEliminated && !player.commitment)
      ? state
      : { ...state, phase: 'discussion', eventLog: [...state.eventLog, '所有有效玩家已完成公開承諾。'] };
  }
  if (state.phase === 'discussion') {
    return { ...state, phase: 'fateDeclare', eventLog: [...state.eventLog, '發言階段結束，進入宿命宣告階段。'] };
  }
  if (state.phase === 'fateDeclare') {
    return state.players.some((player) => !player.isEliminated && !player.hasResolvedFateDeclaration)
      ? state
      : { ...state, phase: 'playCards', eventLog: [...state.eventLog, '宿命宣告階段結束，進入出牌階段。'] };
  }
  if (state.phase === 'playCards') {
    return state.players.some((player) => !player.isEliminated && !player.judgedFaction)
      ? state
      : { ...resolvePublicCards(state, rulesConfig, rng), phase: 'resolvePublicCards' };
  }
  if (state.phase === 'resolvePublicCards') {
    if (hasPendingHumanPeekResolution(state)) {
      return { ...state, eventLog: [...state.eventLog, '請先完成真理之眼指定與是否更換陣營的選擇。'] };
    }
    return { ...resolvePublicCards(state, rulesConfig, rng), phase: 'reveal' };
  }
  if (state.phase === 'reveal') {
    const revealLines = state.players
      .filter((player) => !player.isEliminated && player.chosenFaction && player.judgedFaction)
      .flatMap((player) => {
        const functionSelection = player.functionCardSelection ?? player.playedCard?.type ?? 'blank';
        const functionLine =
          functionSelection === 'blank'
            ? `${player.name} 本回合未使用功能牌。`
            : `${player.name} 揭示功能牌：${cardLabel(functionSelection)}。`;
        return [
          `${player.name} 揭示原始選擇：${FACTION_LABELS[player.chosenFaction ?? 'alliance']}；最終判定：${FACTION_LABELS[player.judgedFaction ?? 'alliance']}。`,
          functionLine
        ];
      });
    const stateWithRevealNotes = { ...state, phase: 'resolveJudgment' as const, eventLog: [...state.eventLog, ...revealLines] };
    const resolved = executeRoundJudgment(stateWithRevealNotes, rng, rulesConfig);
    return { ...resolved, phase: resolved.gameOverReason ? 'gameEnd' : 'resolveJudgment' };
  }
  if (state.phase === 'resolveJudgment') {
    if (state.roundResults.some((result) => result.round === state.round)) {
      return { ...state, phase: state.gameOverReason ? 'gameEnd' : 'drawCards' };
    }
    const resolved = executeRoundJudgment(state, rng, rulesConfig);
    return { ...resolved, phase: resolved.gameOverReason ? 'gameEnd' : 'drawCards' };
  }
  if (state.phase === 'drawCards') {
    return { ...drawForPlayers(state, rng, rulesConfig), phase: 'roundEnd' };
  }
  return startNextRound(state);
}
