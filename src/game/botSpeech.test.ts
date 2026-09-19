import { describe, expect, it } from 'vitest';
import { BOT_SPEECH_LIBRARY, buildBotSpeech, getBotSpeechLines, getSpeechPersonality, speechLeaksHiddenFaction } from './botSpeech';
import { DEFAULT_OPPONENTS } from './opponents';
import type { BotPersonality, PlayerState } from './types';

function botPlayer(args: Partial<PlayerState> = {}): PlayerState {
  return {
    id: args.id ?? 'bot',
    name: args.name ?? '測試 Bot',
    isHuman: false,
    botPersonality: args.botPersonality ?? 'observer',
    botProfileId: args.botProfileId,
    judgmentPoints: args.judgmentPoints ?? 6,
    isEliminated: false,
    hand: args.hand ?? [],
    hasPlayedCardThisRound: false
  };
}

describe('botSpeech', () => {
  it('每種 Bot 人格都有可用發言', () => {
    const personalities: BotPersonality[] = ['honest', 'opportunist', 'observer'];

    for (const personality of personalities) {
      expect(getBotSpeechLines(personality).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('發言資料不直接洩漏 hidden faction 或內部欄位', () => {
    const allLines = Object.values(BOT_SPEECH_LIBRARY).flat();

    for (const line of allLines) {
      expect(speechLeaksHiddenFaction(line.text)).toBe(false);
      expect(line.text).not.toMatch(/alliance|betrayal|chosenFaction|judgedFaction|player-\d/i);
    }
  });

  it('角色 profile 會決定發言人格基底', () => {
    for (const opponent of DEFAULT_OPPONENTS) {
      const player = botPlayer({
        name: opponent.name,
        botPersonality: opponent.personality,
        botProfileId: opponent.botProfileId
      });

      expect(getSpeechPersonality(player)).toBe(opponent.personality);
    }
  });

  it('可用固定 rng 穩定選出同一條發言', () => {
    const player = botPlayer({ botPersonality: 'opportunist' });
    const firstSpeech = buildBotSpeech(player, () => 0);
    const lastSpeech = buildBotSpeech(player, () => 0.99);

    expect(firstSpeech.speakerPlayerId).toBe(player.id);
    expect(firstSpeech.line.id).toBe('opportunist-counts-pressure');
    expect(lastSpeech.line.id).toBe('opportunist-comeback-hook');
  });

  it('缺少人格資料時會 fallback 到觀望型', () => {
    const player = botPlayer({ botPersonality: undefined, botProfileId: undefined });
    const speech = buildBotSpeech(player, () => 0);

    expect(getSpeechPersonality(player)).toBe('observer');
    expect(speech.line.personality).toBe('observer');
  });
});
