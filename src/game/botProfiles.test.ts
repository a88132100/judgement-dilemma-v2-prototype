import { describe, expect, it } from 'vitest';
import { decideBotCommitment } from './botDecision';
import { BOT_PROFILES } from './botProfiles';
import { createGame } from './createGame';
import { DEFAULT_OPPONENTS } from './opponents';
import type { PlayerState } from './types';

function botPlayer(args: Partial<PlayerState> = {}): PlayerState {
  return {
    id: args.id ?? 'bot',
    name: args.name ?? '測試 Bot',
    isHuman: false,
    botPersonality: args.botPersonality ?? 'honest',
    botProfileId: args.botProfileId,
    judgmentPoints: args.judgmentPoints ?? 6,
    isEliminated: false,
    hand: args.hand ?? [],
    hasPlayedCardThisRound: false
  };
}

describe('botProfiles and opponents', () => {
  it('六名角色都有 botProfileId', () => {
    expect(DEFAULT_OPPONENTS).toHaveLength(6);
    expect(DEFAULT_OPPONENTS.map((opponent) => opponent.botProfileId)).toEqual([
      'oathkeeper_balanced',
      'opportunist_calculated',
      'observer_balanced',
      'opportunist_risky',
      'observer_suspicious',
      'oathkeeper_cautious'
    ]);
  });

  it('角色 botProfileId 都能對應到有效 profile，且基底 personality 一致', () => {
    for (const opponent of DEFAULT_OPPONENTS) {
      const profile = BOT_PROFILES[opponent.botProfileId];
      expect(profile).toBeDefined();
      expect(profile.profileId).toBe(opponent.botProfileId);
      expect(profile.basePersonality).toBe(opponent.personality);
    }
  });

  it('建立遊戲時會把選到的角色 metadata 帶入 Bot PlayerState', () => {
    const selectedOpponents = [DEFAULT_OPPONENTS[3], DEFAULT_OPPONENTS[4], DEFAULT_OPPONENTS[5]];
    const state = createGame(() => 0, { opponents: selectedOpponents });
    const bots = state.players.filter((player) => !player.isHuman);

    expect(bots.map((bot) => bot.name)).toEqual(['雷恩・賭徒', '莎赫・霧眼', '伊芙・白誓者']);
    expect(bots.map((bot) => bot.opponentId)).toEqual(['rayne-gambler', 'shahe-mistseer', 'eve-whitevow']);
    expect(bots.map((bot) => bot.opponentTitle)).toEqual(['高風險機會主義者', '冷靜的局勢觀測者', '溫和的守約派']);
    expect(bots.map((bot) => bot.botProfileId)).toEqual(['opportunist_risky', 'observer_suspicious', 'oathkeeper_cautious']);
    expect(bots.every((bot) => Boolean(bot.avatar))).toBe(true);
    expect(bots.every((bot) => Boolean(bot.seat))).toBe(true);
    expect(bots.every((bot) => Boolean(bot.profile))).toBe(true);
  });

  it('沒有 botProfileId 時，botDecision 仍 fallback 到原 personality 權重', () => {
    const honest = botPlayer({ botPersonality: 'honest', botProfileId: undefined });

    expect(decideBotCommitment(honest, () => 0.74)).toBe('alliance');
    expect(decideBotCommitment(honest, () => 0.76)).toBe('betrayal');
  });
});
