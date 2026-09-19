import { getBotProfile } from './botProfiles';
import type { BotPersonality, PlayerState } from './types';

export type BotSpeechTag = 'promise' | 'doubt' | 'bait' | 'caution' | 'comeback' | 'information';

export interface BotSpeechLine {
  id: string;
  personality: BotPersonality;
  tone: string;
  text: string;
  tags: BotSpeechTag[];
}

export interface BotSpeechResult {
  speakerPlayerId: string;
  speakerName: string;
  line: BotSpeechLine;
}

export const BOT_SPEECH_LIBRARY: Record<BotPersonality, BotSpeechLine[]> = {
  honest: [
    {
      id: 'honest-steady-promise',
      personality: 'honest',
      tone: '守約壓力',
      text: '承諾不是裝飾。這回合如果大家亂改口，代價會很快回來。',
      tags: ['promise', 'caution']
    },
    {
      id: 'honest-soft-warning',
      personality: 'honest',
      tone: '溫和警告',
      text: '我會先相信清楚表態的人，但急著推別人背鍋的人很可疑。',
      tags: ['promise', 'doubt']
    },
    {
      id: 'honest-defensive-cooperation',
      personality: 'honest',
      tone: '防守合作',
      text: '合作不代表安全，但至少讓結算有機會站穩。',
      tags: ['promise', 'caution']
    }
  ],
  opportunist: [
    {
      id: 'opportunist-counts-pressure',
      personality: 'opportunist',
      tone: '利益試探',
      text: '承諾說得再漂亮，最後還是看人數和分數。',
      tags: ['bait', 'doubt']
    },
    {
      id: 'opportunist-fragile-trust',
      personality: 'opportunist',
      tone: '挑動懷疑',
      text: '如果太多人同時相信合作，局勢反而會變得很脆弱。',
      tags: ['bait', 'doubt']
    },
    {
      id: 'opportunist-comeback-hook',
      personality: 'opportunist',
      tone: '翻盤誘惑',
      text: '落後的人不一定要乖乖等結算，風險有時候才是出口。',
      tags: ['bait', 'comeback']
    }
  ],
  observer: [
    {
      id: 'observer-read-history',
      personality: 'observer',
      tone: '讀局觀察',
      text: '上一回合的結果，比現在的承諾更值得參考。',
      tags: ['information', 'doubt']
    },
    {
      id: 'observer-watch-pressure',
      personality: 'observer',
      tone: '沉默施壓',
      text: '我先看誰最急著要求別人表態。急的人通常有壓力。',
      tags: ['information', 'doubt']
    },
    {
      id: 'observer-information-gap',
      personality: 'observer',
      tone: '資訊保留',
      text: '資訊還不夠時，太早相信和太早背叛都一樣危險。',
      tags: ['information', 'caution']
    }
  ]
};

const hiddenFactionLeakPatterns = [
  /chosenFaction/i,
  /judgedFaction/i,
  /finalFaction/i,
  /我的最終/,
  /我的陣營/,
  /我暗選/,
  /我已選/,
  /我這回合會/,
  /我會選/,
  /我會合作/,
  /我會背叛/
];

function normalizeIndex(length: number, rng: () => number): number {
  return Math.min(length - 1, Math.floor(rng() * length));
}

export function getBotSpeechLines(personality: BotPersonality = 'observer'): BotSpeechLine[] {
  return BOT_SPEECH_LIBRARY[personality];
}

export function getSpeechPersonality(player: PlayerState): BotPersonality {
  return getBotProfile(player.botProfileId)?.basePersonality ?? player.botPersonality ?? 'observer';
}

export function selectBotSpeechLine(player: PlayerState, rng: () => number = Math.random): BotSpeechLine {
  const lines = getBotSpeechLines(getSpeechPersonality(player));
  return lines[normalizeIndex(lines.length, rng)];
}

export function buildBotSpeech(player: PlayerState, rng: () => number = Math.random): BotSpeechResult {
  return {
    speakerPlayerId: player.id,
    speakerName: player.name,
    line: selectBotSpeechLine(player, rng)
  };
}

export function speechLeaksHiddenFaction(text: string): boolean {
  return hiddenFactionLeakPatterns.some((pattern) => pattern.test(text));
}
