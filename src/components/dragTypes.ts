import type { CardType, Faction } from '../game/types';

export type DragPayload =
  | {
      kind: 'commitment';
      faction: Faction;
    }
  | {
      kind: 'faction';
      faction: Faction;
    }
  | {
      kind: 'card';
      cardType: CardType;
    };

export const DRAG_DATA_TYPE = 'application/judgement-dilemma';
