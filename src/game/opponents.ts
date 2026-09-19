import avatarAllenOathkeeper from '../assets/bots/avatar/avatar_allen_oathkeeper.png';
import avatarEveWhitesworn from '../assets/bots/avatar/avatar_eve_whitesworn.png';
import avatarKnoxObserver from '../assets/bots/avatar/avatar_knox_observer.png';
import avatarRayneGambler from '../assets/bots/avatar/avatar_rayne_gambler.png';
import avatarShaheMistseer from '../assets/bots/avatar/avatar_shahe_mistseer.png';
import avatarVeraOathbreaker from '../assets/bots/avatar/avatar_vera_oathbreaker.png';
import profileAllenOathkeeper from '../assets/bots/profile/profile_allen_oathkeeper.png';
import profileEveWhitesworn from '../assets/bots/profile/profile_eve_whitesworn.png';
import profileKnoxObserver from '../assets/bots/profile/profile_knox_observer.png';
import profileRayneGambler from '../assets/bots/profile/profile_rayne_gambler.png';
import profileShaheMistseer from '../assets/bots/profile/profile_shahe_mistseer.png';
import profileVeraOathbreaker from '../assets/bots/profile/profile_vera_oathbreaker.png';
import seatAllenOathkeeper from '../assets/bots/seat/seat_allen_oathkeeper.png';
import seatEveWhitesworn from '../assets/bots/seat/seat_eve_whitesworn.png';
import seatKnoxObserver from '../assets/bots/seat/seat_knox_observer.png';
import seatRayneGambler from '../assets/bots/seat/seat_rayne_gambler.png';
import seatShaheMistseer from '../assets/bots/seat/seat_shahe_mistseer.png';
import seatVeraOathbreaker from '../assets/bots/seat/seat_vera_oathbreaker.png';
import type { BotPersonality, BotProfileId } from './types';

export interface OpponentMetadata {
  id: string;
  name: string;
  title: string;
  personality: BotPersonality;
  botProfileId: BotProfileId;
  tendencyLabel: string;
  description: string;
  avatar: string;
  seat: string;
  profile: string;
}

export const DEFAULT_OPPONENTS: OpponentMetadata[] = [
  {
    id: 'aeron-oathkeeper',
    name: '艾倫・誓約者',
    title: '守約派審判者',
    personality: 'honest',
    botProfileId: 'oathkeeper_balanced',
    tendencyLabel: '穩定守信',
    description: '重視承諾，傾向合作與守信，但穩定不代表安全。',
    avatar: avatarAllenOathkeeper,
    seat: seatAllenOathkeeper,
    profile: profileAllenOathkeeper
  },
  {
    id: 'vera-oathbreaker',
    name: '薇拉・裂約者',
    title: '機會主義者',
    personality: 'opportunist',
    botProfileId: 'opportunist_calculated',
    tendencyLabel: '精算背叛',
    description: '擅長在信任縫隙中背叛，會尋找最有利的時機出手。',
    avatar: avatarVeraOathbreaker,
    seat: seatVeraOathbreaker,
    profile: profileVeraOathbreaker
  },
  {
    id: 'knox-observer',
    name: '諾克斯・旁觀者',
    title: '沉默觀測者',
    personality: 'observer',
    botProfileId: 'observer_balanced',
    tendencyLabel: '局勢觀察',
    description: '觀察承諾與局勢後才行動，難以用單一模式預測。',
    avatar: avatarKnoxObserver,
    seat: seatKnoxObserver,
    profile: profileKnoxObserver
  },
  {
    id: 'rayne-gambler',
    name: '雷恩・賭徒',
    title: '高風險機會主義者',
    personality: 'opportunist',
    botProfileId: 'opportunist_risky',
    tendencyLabel: '高風險投機',
    description: '把承諾視為籌碼，落後時更願意用背叛與公開資訊牌翻局。',
    avatar: avatarRayneGambler,
    seat: seatRayneGambler,
    profile: profileRayneGambler
  },
  {
    id: 'shahe-mistseer',
    name: '莎赫・霧眼',
    title: '冷靜的局勢觀測者',
    personality: 'observer',
    botProfileId: 'observer_suspicious',
    tendencyLabel: '懷疑讀局',
    description: '不輕信合作承諾，偏好先讀取資訊，再決定是否跟隨局勢。',
    avatar: avatarShaheMistseer,
    seat: seatShaheMistseer,
    profile: profileShaheMistseer
  },
  {
    id: 'eve-whitevow',
    name: '伊芙・白誓者',
    title: '溫和的守約派',
    personality: 'honest',
    botProfileId: 'oathkeeper_cautious',
    tendencyLabel: '保守防守',
    description: '重視承諾與防守，通常維持合作，落後時才會提高風險。',
    avatar: avatarEveWhitesworn,
    seat: seatEveWhitesworn,
    profile: profileEveWhitesworn
  }
];

export const DEFAULT_SELECTED_OPPONENTS: OpponentMetadata[] = DEFAULT_OPPONENTS.slice(0, 3);
