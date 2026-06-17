import { createDeck, drawCards, shuffleDeck } from './deck';
import { BASELINE_RULES_CONFIG, type RulesConfig } from './rulesConfig';
import type { BotPersonality, GameState, PlayerState } from './types';

const botPersonalities: BotPersonality[] = ['honest', 'opportunist', 'observer'];

export function createInitialPlayers(
  deck: ReturnType<typeof createDeck>,
  rulesConfig: RulesConfig = BASELINE_RULES_CONFIG
): { players: PlayerState[]; deck: ReturnType<typeof createDeck> } {
  let nextDeck = deck;
  const names = ['你', '守信型 Bot', '投機型 Bot', '觀望型 Bot'];
  const players = names.map((name, index): PlayerState => {
    const drawResult = drawCards(nextDeck, rulesConfig.initialHandSize);
    nextDeck = drawResult.deck;
    return {
      id: `player-${index + 1}`,
      name,
      isHuman: index === 0,
      botPersonality: index === 0 ? undefined : botPersonalities[index - 1],
      judgmentPoints: rulesConfig.startingJudgmentPoints,
      isEliminated: false,
      hand: drawResult.drawn,
      hasPlayedCardThisRound: false
    };
  });
  return { players, deck: nextDeck };
}

export function createGame(rng: () => number = Math.random, options: { maxRounds?: number; rulesConfig?: RulesConfig } = {}): GameState {
  const rulesConfig = options.rulesConfig ?? BASELINE_RULES_CONFIG;
  const shuffledDeck = shuffleDeck(createDeck(), rng);
  const { players, deck } = createInitialPlayers(shuffledDeck, rulesConfig);
  return {
    players,
    round: 1,
    maxRounds: options.maxRounds ?? rulesConfig.maxRounds,
    phase: 'commitment',
    dealerPlayerId: players[0].id,
    deck,
    discardPile: [],
    eventLog: [
      `遊戲開始。每位玩家起始裁決點數為 ${rulesConfig.startingJudgmentPoints}，達到 ${rulesConfig.winAtJudgmentPoints} 點獲勝，降至 ${rulesConfig.eliminatedAtJudgmentPoints} 點出局。`
    ],
    roundResults: []
  };
}
