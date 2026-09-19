import seatedAllen from '../assets/bots/seated/seated_allen_oathkeeper.png';
import seatedVera from '../assets/bots/seated/seated_vera_oathbreaker.png';
import seatedKnox from '../assets/bots/seated/seated_knox_observer.png';
import seatedRayne from '../assets/bots/seated/seated_rayne_gambler.png';
import seatedShahe from '../assets/bots/seated/seated_shahe_mistseer.png';
import seatedEve from '../assets/bots/seated/seated_eve_whitesworn.png';
import { DEFAULT_OPPONENTS } from '../game/opponents';
import type { PlayerState } from '../game/types';

// 角色識別碼沿用現有對手資料；美術替換不改動玩家與 Bot 的核心設定。
export const seatedCharacterImageByOpponentId: Readonly<Record<string, string>> = {
  'aeron-oathkeeper': seatedAllen,
  'vera-oathbreaker': seatedVera,
  'knox-observer': seatedKnox,
  'rayne-gambler': seatedRayne,
  'shahe-mistseer': seatedShahe,
  'eve-whitevow': seatedEve
};

export function seatedCharacterForPlayer(player: PlayerState): string | undefined {
  if (player.isHuman) return undefined;
  if (player.opponentId && seatedCharacterImageByOpponentId[player.opponentId]) {
    return seatedCharacterImageByOpponentId[player.opponentId];
  }

  // 舊資料以已知人格設定或既有角色素材辨認，不從顯示名稱猜測資產檔名。
  const opponent = DEFAULT_OPPONENTS.find((candidate) => player.botProfileId && candidate.botProfileId === player.botProfileId)
    ?? DEFAULT_OPPONENTS.find((candidate) => (
      (player.seat && candidate.seat === player.seat)
      || (player.profile && candidate.profile === player.profile)
      || (player.avatar && candidate.avatar === player.avatar)
    ))
    ?? DEFAULT_OPPONENTS.find((candidate) => player.botPersonality && candidate.personality === player.botPersonality);
  return opponent ? seatedCharacterImageByOpponentId[opponent.id] : undefined;
}
