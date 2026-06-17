export type Faction = 'alliance' | 'betrayal';

export type RoundPhase =
  | 'commitment'
  | 'discussion'
  | 'playCards'
  | 'resolvePublicCards'
  | 'reveal'
  | 'resolveJudgment'
  | 'drawCards'
  | 'roundEnd'
  | 'gameEnd';

export type CardType = 'fate' | 'peek' | 'shield' | 'counter';
export type BotPersonality = 'honest' | 'opportunist' | 'observer';

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
  isHuman: boolean;
  botPersonality?: BotPersonality;
  judgmentPoints: number;
  isEliminated: boolean;
  commitment?: Faction;
  chosenFaction?: Faction;
  judgedFaction?: Faction;
  hand: CardType[];
  playedCard?: PlayedCard;
  hasPlayedCardThisRound: boolean;
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

export interface RoundResult {
  round: number;
  situation: RoundSituation;
  baseDeltaByPlayerId: Record<string, number>;
  adjustedBaseDeltaByPlayerId: Record<string, number>;
  shieldDeltaByPlayerId: Record<string, number>;
  counterDeltaByPlayerId: Record<string, number>;
  fateDeltaByPlayerId: Record<string, number>;
  commitmentDeltaByPlayerId: Record<string, number>;
  finalDeltaByPlayerId: Record<string, number>;
  revealedFactionsByPlayerId: Record<string, Faction>;
  summary: string;
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
