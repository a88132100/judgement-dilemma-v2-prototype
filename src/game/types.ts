export type Faction = 'alliance' | 'betrayal';

export type RoundPhase =
  | 'commitment'
  | 'discussion'
  | 'fateDeclare'
  | 'playCards'
  | 'resolvePublicCards'
  | 'reveal'
  | 'resolveJudgment'
  | 'drawCards'
  | 'roundEnd'
  | 'gameEnd';

export type CardType =
  | 'fate'
  | 'peek'
  | 'chaos'
  | 'smallGain'
  | 'promiseTax'
  | 'consensus'
  | 'slip'
  | 'shield'
  | 'counter'
  | 'mirror'
  | 'gamble'
  | 'favor'
  | 'evenOmen';
export type FunctionCardSelection = CardType | 'blank';
export type BotPersonality = 'honest' | 'opportunist' | 'observer';
export type BotProfileId =
  | 'oathkeeper_balanced'
  | 'oathkeeper_cautious'
  | 'opportunist_calculated'
  | 'opportunist_risky'
  | 'observer_balanced'
  | 'observer_suspicious';

export type FatePrediction =
  | {
      kind: 'majority';
      predictedMajority: Faction;
    }
  | {
      kind: 'identity';
      targetPlayerId: string;
      predictedFaction: Faction;
    };

export interface PlayedCard {
  type: CardType;
  userPlayerId: string;
  targetPlayerId?: string;
  fatePrediction?: FatePrediction;
  isPublic: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  displayName?: string;
  isHuman: boolean;
  opponentId?: string;
  opponentTitle?: string;
  avatar?: string;
  seat?: string;
  profile?: string;
  botPersonality?: BotPersonality;
  botProfileId?: BotProfileId;
  judgmentPoints: number;
  isEliminated: boolean;
  commitment?: Faction;
  chosenFaction?: Faction;
  judgedFaction?: Faction;
  hand: CardType[];
  playedCard?: PlayedCard;
  functionCardSelection?: FunctionCardSelection;
  hasPlayedCardThisRound: boolean;
  hasResolvedPublicCard?: boolean;
  hasResolvedFateDeclaration?: boolean;
  hasDeclaredFate?: boolean;
  hasResolvedFate?: boolean;
  hasResolvedPeek?: boolean;
  hasResolvedChaos?: boolean;
  hasChangedFactionByPeek?: boolean;
  chaosTargetedThisRound?: boolean;
  disabledFunctionCardThisRound?: boolean;
  hasUsedGambleThisGame?: boolean;
  skipNextDraw?: boolean;
  bonusDrawsNextDrawPhase?: number;
}

export type RoundResultType =
  | 'loneHero'
  | 'allAlliance'
  | 'allBetrayal'
  | 'equal'
  | 'minorityBetrayal'
  | 'betrayalOverload';

export interface RoundSituation {
  validPlayerIds: string[];
  allianceCount: number;
  betrayalCount: number;
  alliancePlayerIds: string[];
  betrayalPlayerIds: string[];
  judgedFactionByPlayerId: Record<string, Faction>;
  resultType: RoundResultType;
}

export interface RoundCardReportEntry {
  playerId: string;
  cardType: CardType;
  summary: string;
  targetPlayerId?: string;
}

export interface RoundResult {
  round: number;
  situation: RoundSituation;
  baseDeltaByPlayerId: Record<string, number>;
  adjustedBaseDeltaByPlayerId: Record<string, number>;
  shieldDeltaByPlayerId: Record<string, number>;
  counterDeltaByPlayerId: Record<string, number>;
  mirrorDeltaByPlayerId: Record<string, number>;
  fateDeltaByPlayerId: Record<string, number>;
  gambleDeltaByPlayerId: Record<string, number>;
  expediencyDeltaByPlayerId: Record<string, number>;
  commitmentDeltaByPlayerId: Record<string, number>;
  finalDeltaByPlayerId: Record<string, number>;
  revealedFactionsByPlayerId: Record<string, Faction>;
  summary: string;
  cardReport?: RoundCardReportEntry[];
}

export interface GameState {
  players: PlayerState[];
  round: number;
  maxRounds?: number;
  phase: RoundPhase;
  dealerPlayerId: string;
  deck: CardType[];
  discardPile: CardType[];
  eventLog: string[];
  roundResults: RoundResult[];
  winnerPlayerId?: string;
  winnerPlayerIds?: string[];
  isTie?: boolean;
  gameOverReason?: 'judgmentWin' | 'maxRounds' | 'allButOneEliminated' | 'allEliminatedTieBreak';
  previousRoundResult?: RoundResult;
}

export interface HumanPlayInput {
  chosenFaction: Faction;
  card?: {
    type: CardType;
    targetPlayerId?: string;
    fatePrediction?: FatePrediction;
  };
}

export interface HumanFateDeclarationInput {
  useFate: boolean;
  fatePrediction?: FatePrediction;
}
