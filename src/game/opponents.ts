import avatarAllenOathkeeper from '../assets/bots/avatar_allen_oathkeeper.png';
import avatarKnoxObserver from '../assets/bots/avatar_knox_observer.png';
import avatarVeraOathbreaker from '../assets/bots/avatar_vera_oathbreaker.png';
import type { BotPersonality } from './types';

export interface OpponentMetadata {
  id: string;
  name: string;
  title: string;
  personality: BotPersonality;
  description: string;
  avatar: string;
}

export const DEFAULT_OPPONENTS: OpponentMetadata[] = [
  {
    id: 'aeron-oathkeeper',
    name: '艾倫・誓約者',
    title: '守約派審判者',
    personality: 'honest',
    description: '重視承諾，傾向合作與守信，但穩定不代表安全。',
    avatar: avatarAllenOathkeeper
  },
  {
    id: 'vera-oathbreaker',
    name: '薇拉・裂約者',
    title: '機會主義者',
    personality: 'opportunist',
    description: '擅長在信任縫隙中背叛，會尋找最有利的時機出手。',
    avatar: avatarVeraOathbreaker
  },
  {
    id: 'knox-observer',
    name: '諾克斯・旁觀者',
    title: '沉默觀測者',
    personality: 'observer',
    description: '觀察承諾與局勢後才行動，難以用單一模式預測。',
    avatar: avatarKnoxObserver
  }
];
