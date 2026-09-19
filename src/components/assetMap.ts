import cardAlliance from '../assets/cards/card_alliance.png';
import cardBack from '../assets/cards/card_back.png';
import cardBetrayal from '../assets/cards/card_betrayal.png';
import cardChaos from '../assets/cards/card_chaos.png';
import cardCounter from '../assets/cards/card_counter.png';
import cardFate from '../assets/cards/card_fate.png';
import cardGamble from '../assets/cards/card_gamble.png';
import cardMirror from '../assets/cards/card_mirror.png';
import cardPeek from '../assets/cards/card_peek.png';
import cardShield from '../assets/cards/card_shield.png';
import bgJudgementTable from '../assets/backgrounds/bg_judgement_table.png';
import bgJudgementTablePlayfield from '../assets/backgrounds/bg_judgement_table_playfield.png';
import bgTrialRoom from '../assets/backgrounds/bg_trial_room.png';
import tokenCommitAlliance from '../assets/tokens/token_commit_alliance.png';
import tokenCommitBetrayal from '../assets/tokens/token_commit_betrayal.png';
import type { CardType, Faction } from '../game/types';

export const cardImageByType: Record<CardType, string> = {
  fate: cardFate,
  peek: cardPeek,
  chaos: cardChaos,
  shield: cardShield,
  counter: cardCounter,
  mirror: cardMirror,
  gamble: cardGamble,
  smallGain: cardBack,
  promiseTax: cardBack,
  favor: cardBack,
  consensus: cardBack,
  slip: cardBack,
  evenOmen: cardBack
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
  judgementTablePlayfield: bgJudgementTablePlayfield,
  trialRoom: bgTrialRoom
} as const;
