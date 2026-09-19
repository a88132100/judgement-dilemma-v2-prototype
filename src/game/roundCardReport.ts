import { describeCardResolution, getPublicCardResolvePlayers } from './cardResolver';
import { isHiddenFunctionCard } from './cardRules';
import { EXPEDIENCY_DELTAS } from './constants';
import { cardLabel, playerName } from './log';
import type { PlayerState, RoundCardReportEntry } from './types';

type ResolutionNotes = Parameters<typeof describeCardResolution>[0];

interface CardReportArgs extends ResolutionNotes {
  fateHitByPlayerId: Record<string, boolean>;
  gambleSuccessByPlayerId: Record<string, boolean>;
}

// 戰報只讀取本次解析產物，不呼叫結算或亂數；公開牌之後沿用實際裁決執行順序。
export function buildRoundCardReport(args: CardReportArgs): RoundCardReportEntry[] {
  const players = args.state.players.filter((player) => args.situation.validPlayerIds.includes(player.id) && player.playedCard);
  const publicPlayers = getPublicCardResolvePlayers(args.state, args.rulesConfig);
  const publicIds = new Set(publicPlayers.map((player) => player.id));
  const judgmentOrder = ['shield', 'mirror', 'counter', 'fate', 'gamble'];
  const laterPlayers = players.filter((player) => !publicIds.has(player.id)).sort((left, right) => {
    const rank = (player: PlayerState) => {
      const index = judgmentOrder.indexOf(player.playedCard!.type);
      return index < 0 ? judgmentOrder.length : index;
    };
    return rank(left) - rank(right);
  });

  return [...publicPlayers, ...laterPlayers].filter((player) => args.situation.validPlayerIds.includes(player.id)).map((player) => {
    const card = player.playedCard!;
    const entry: RoundCardReportEntry = { playerId: player.id, cardType: card.type, summary: '' };
    // 保留完整玩家清單供目標名稱查詢，只將既有描述函式的輸出限制為本張牌。
    const existingSummary = describeCardResolution({ ...args, situation: { ...args.situation, validPlayerIds: [player.id] } })[0];
    const label = `${player.name} 的 ${cardLabel(card.type)}`;
    entry.summary = existingSummary ?? `${label} 未觸發。`;
    if (player.disabledFunctionCardThisRound && isHiddenFunctionCard(card.type)) return entry;

    if (card.type === 'peek') {
      // 公共戰報不帶查驗目標、查到的陣營或任何私訊文字。
      entry.summary = player.hasChangedFactionByPeek ? `${player.name} 使用 ${cardLabel('peek')} 後重新選擇陣營。` : `${player.name} 完成 ${cardLabel('peek')} 查驗。`;
    } else if (card.type === 'chaos') {
      const target = args.state.players.find((candidate) => candidate.id === card.targetPlayerId);
      if (player.hasResolvedChaos && target) {
        entry.targetPlayerId = target.id;
        const disabled = target.disabledFunctionCardThisRound && target.playedCard && isHiddenFunctionCard(target.playedCard.type);
        // 只陳述已套用的效果；多張混沌時不能從最終值逆推各次陣營變化。
        entry.summary = `${label} 指定 ${target.name}，已施加陣營反轉${disabled ? '，目標的暗放功能牌已失效' : ''}。`;
      } else entry.summary = `${label} 未觸發：沒有有效目標。`;
    } else if (card.type === 'shield') {
      if (!(args.shieldDeltaByPlayerId[player.id] > 0)) {
        const reason = args.situation.judgedFactionByPlayerId[player.id] !== 'alliance' ? '最終陣營不是盟約'
          : args.situation.betrayalCount === 0 ? '本回合沒有叛離者' : '沒有可減免的負基礎結算';
        entry.summary = `${label} 未觸發：${reason}。`;
      }
    } else if (card.type === 'counter') {
      entry.targetPlayerId = args.counterTargetByUserId[player.id];
      if (!entry.targetPlayerId) entry.summary = `${label} 未觸發：${args.situation.judgedFactionByPlayerId[player.id] !== 'alliance' ? '最終陣營不是盟約' : '本回合沒有叛離目標'}。`;
    } else if (card.type === 'mirror') {
      entry.targetPlayerId = args.mirrorTargetByUserId[player.id];
      if (!entry.targetPlayerId) {
        const reason = args.situation.judgedFactionByPlayerId[player.id] !== 'alliance' ? '最終陣營不是盟約' : '本回合不是少數叛離局勢';
        entry.summary = `${label} 未觸發：${reason}。`;
      }
    } else if (card.type === 'fate') {
      const hit = args.fateHitByPlayerId[player.id];
      entry.summary = hit === undefined ? `${label} 未觸發：沒有有效預言。` : `${existingSummary}（預言${hit ? '命中' : '落空'}）`;
      if (card.fatePrediction?.kind === 'identity') entry.targetPlayerId = card.fatePrediction.targetPlayerId;
    } else if (card.type === 'gamble') {
      const hit = args.gambleSuccessByPlayerId[player.id];
      entry.summary = `${existingSummary} ${hit ? '唯一叛離成立。' : `未成為唯一叛離者${player.skipNextDraw ? '，本次跳過補牌' : ''}。`}`;
    } else if (card.type === 'smallGain') {
      entry.summary = `${label} 生效，裁決點數 +${EXPEDIENCY_DELTAS.smallGain}。`;
    } else if (card.type === 'promiseTax') {
      entry.targetPlayerId = args.promiseTaxTargetByUserId[player.id];
      if (entry.targetPlayerId) entry.summary = `${label} 指定 ${playerName(args.state.players, entry.targetPlayerId)}，因失信受到 ${EXPEDIENCY_DELTAS.promiseTax} 點。`;
    } else if (card.type === 'favor') {
      entry.targetPlayerId = args.favorTargetByUserId[player.id];
      if (!entry.targetPlayerId) entry.summary = `${label} 未觸發：沒有有效對象。`;
      else if (args.situation.judgedFactionByPlayerId[player.id] !== args.situation.judgedFactionByPlayerId[entry.targetPlayerId]) {
        entry.summary = `${label} 未觸發：與 ${playerName(args.state.players, entry.targetPlayerId)} 的最終陣營不同。`;
      }
    } else if (card.type === 'consensus') {
      const delta = args.situation.allianceCount >= 3 ? EXPEDIENCY_DELTAS.consensusHit : EXPEDIENCY_DELTAS.consensusMiss;
      entry.summary = `${label} 生效，盟約人數 ${args.situation.allianceCount}，裁決點數 ${delta >= 0 ? '+' : ''}${delta}。`;
    } else if (card.type === 'slip') {
      entry.summary = `${label} 生效，裁決點數 ${EXPEDIENCY_DELTAS.slip}，下次抽牌額外 +${args.expediencyDrawBonusByPlayerId[player.id] ?? 0}。`;
    } else if (card.type === 'evenOmen' && !args.expediencyDrawBonusByPlayerId[player.id] && !args.expediencyDiscardByPlayerId[player.id]) {
      entry.summary = `${label}：叛離人數為奇數且無手牌可棄，裁決點數 ${EXPEDIENCY_DELTAS.evenOmenMiss}。`;
    }
    return entry;
  });
}
