import cardAlliance from '../assets/cards/card_alliance.png';
import cardBack from '../assets/cards/card_back.png';
import cardBetrayal from '../assets/cards/card_betrayal.png';
import cardCounter from '../assets/cards/card_counter.png';
import cardFate from '../assets/cards/card_fate.png';
import cardPeek from '../assets/cards/card_peek.png';
import cardShield from '../assets/cards/card_shield.png';
import bgJudgementTable from '../assets/backgrounds/bg_judgement_table.png';
import bgTrialRoom from '../assets/backgrounds/bg_trial_room.png';
import tokenCommitAlliance from '../assets/tokens/token_commit_alliance.png';
import tokenCommitBetrayal from '../assets/tokens/token_commit_betrayal.png';
import type { CardType, Faction } from '../game/types';

export const cardImageByType: Record<CardType, string> = {
  fate: cardFate,
  peek: cardPeek,
  shield: cardShield,
  counter: cardCounter
};

export const cardBackImage = cardBack;

export const factionCardImageByFaction: Record<Faction, string> = {
  alliance: cardAlliance,
  betrayal: cardBetrayal
};

export const commitmentTokenImageByFaction: Record<Faction, string> = {
  alliance: tokenCommitAlliance,
  betrayal: tokenCommitBetrayal
};

export const backgroundImages = {
  judgementTable: bgJudgementTable,
  trialRoom: bgTrialRoom
} as const;
