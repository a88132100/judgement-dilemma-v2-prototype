import { DRAW_CARDS_PER_ROUND, FACTION_LABELS, MVP_CARD_TYPES } from './constants';
import { applyCounterCards, applyShieldCards, describeCardResolution, resolveFateCards, resolvePublicCards } from './cardResolver';
import { canUseCardWithFaction } from './cardRules';
import { decideBotCardPlay, decideBotCommitment, decideBotFinalFaction } from './botDecision';
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
import type { CardType, GameState, HumanPlayInput, PlayedCard, PlayerState } from './types';

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
    return player;
  }
  return {
    ...player,
    hand: removeOneCard(player.hand, playedCard.type),
    playedCard,
    hasPlayedCardThisRound: true
  };
}

function resetRoundPlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    commitment: undefined,
    chosenFaction: undefined,
    judgedFaction: undefined,
    playedCard: undefined,
    hasPlayedCardThisRound: false
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
  if (input.card.type === 'peek') {
    if (!target || target.isEliminated) {
      return '操作無效：窺探目標必須是有效玩家。';
    }
    if (target.id === human.id) {
      return '操作無效：窺探不可指定自己。';
    }
  }
  if (input.card.type === 'fate') {
    const prediction = input.card.fatePrediction;
    if (!prediction) {
      return '操作無效：宿命必須設定預言內容。';
    }
    if (prediction.kind === 'majority' && !isValidFaction(prediction.predictedMajority)) {
      return '操作無效：宿命多數預言的陣營不合法。';
    }
    if (prediction.kind === 'identity') {
      const identityTarget = state.players.find((player) => player.id === prediction.targetPlayerId);
      if (!identityTarget || identityTarget.isEliminated) {
        return '操作無效：宿命身分預言目標必須是有效玩家。';
      }
      if (identityTarget.id === human.id) {
        return '操作無效：宿命身分預言不可指定自己。';
      }
      if (!isValidFaction(prediction.predictedFaction)) {
        return '操作無效：宿命身分預言的陣營不合法。';
      }
    }
  }
  return undefined;
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
            isPublic: input.card.type === 'fate' || input.card.type === 'peek'
          }
        : undefined;
      return withPlayedCard({ ...player, chosenFaction: input.chosenFaction, judgedFaction: input.chosenFaction }, playedCard);
    }
    const botFaction = decideBotFinalFaction(state, player, rng);
    const playedCard = decideBotCardPlay(state, player, rng);
    const legalPlayedCard = playedCard && canUseCardWithFaction(playedCard.type, botFaction) ? playedCard : undefined;
    return withPlayedCard({ ...player, chosenFaction: botFaction, judgedFaction: botFaction }, legalPlayedCard);
  });
  const cardLine = input.card ? `你使用 ${cardLabel(input.card.type)}。` : '你沒有使用功能牌。';
  return {
    ...state,
    players,
    eventLog: [...state.eventLog, `你暗中選擇原始陣營卡：${factionLabel(input.chosenFaction)}。目前 MVP 最終判定相同。`, cardLine]
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
  return applyRoundResult(stateWithCardNotes, result, rulesConfig);
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
    return { ...state, phase: 'playCards', eventLog: [...state.eventLog, '發言階段結束，進入出牌階段。'] };
  }
  if (state.phase === 'playCards') {
    return state.players.some((player) => !player.isEliminated && !player.judgedFaction)
      ? state
      : { ...state, phase: 'resolvePublicCards' };
  }
  if (state.phase === 'resolvePublicCards') {
    return { ...resolvePublicCards(state, rulesConfig), phase: 'reveal' };
  }
  if (state.phase === 'reveal') {
    const revealLines = state.players
      .filter((player) => !player.isEliminated && player.chosenFaction && player.judgedFaction)
      .map(
        (player) =>
          `${player.name} 揭示原始選擇：${FACTION_LABELS[player.chosenFaction ?? 'alliance']}；最終判定：${FACTION_LABELS[player.judgedFaction ?? 'alliance']}。`
      );
    return { ...state, phase: 'resolveJudgment', eventLog: [...state.eventLog, ...revealLines] };
  }
  if (state.phase === 'resolveJudgment') {
    const resolved = executeRoundJudgment(state, rng, rulesConfig);
    return { ...resolved, phase: resolved.gameOverReason ? 'gameEnd' : 'drawCards' };
  }
  if (state.phase === 'drawCards') {
    return { ...drawForPlayers(state, rng, rulesConfig), phase: 'roundEnd' };
  }
  return startNextRound(state);
}
