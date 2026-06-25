import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { canUseCardWithFaction } from '../game/cardRules';
import { getPeekTargetPlayers, getPublicCardResolvePlayers, resolvePeekChoice } from '../game/cardResolver';
import { CARD_LABELS, FACTION_LABELS, PHASE_LABELS } from '../game/constants';
import { buildScoreBreakdown } from '../game/scoreBreakdown';
import {
  advancePhase,
  completeHumanPlay,
  submitHumanCommitment,
  submitHumanFateDeclaration,
  validateHumanFateDeclaration,
  validateHumanPlay
} from '../game/stateMachine';
import type { CardType, Faction, FunctionCardSelection, GameState, HumanFateDeclarationInput, HumanPlayInput, PlayerState, RoundPhase } from '../game/types';
import { cardBackImage, cardImageByType, commitmentTokenImageByFaction, factionCardImageByFaction } from './assetMap';
import { CardEffectOverlay } from './CardEffectOverlay';
import { CardDetailPanel } from './CardDetailPanel';
import type { CardDetailTarget } from './cardDetails';
import { DraggableCard } from './DraggableCard';
import { DropZone } from './DropZone';
import { ScoreBreakdownPanel } from './ScoreBreakdownPanel';
import type { DragPayload } from './dragTypes';

interface TablePlayAreaProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
}

type FateKind = 'majority' | 'identity';

const revealPhases = new Set<RoundPhase>(['reveal', 'resolveJudgment', 'drawCards', 'roundEnd', 'gameEnd']);

const factionLabels: Record<Faction, string> = {
  alliance: '盟約',
  betrayal: '叛離'
};

const situationLabels = {
  loneHero: '孤勇者',
  allAlliance: '全員盟約',
  allBetrayal: '全員叛離',
  equal: '勢均力敵',
  minorityBetrayal: '少數叛離',
  betrayalOverload: '叛離過載'
} as const;

const phaseQuickHints: Record<RoundPhase, string> = {
  commitment: '選擇你公開承諾的方向。守諾 +1，失信 -1。',
  discussion: '你可以說服、威脅或誤導其他玩家。',
  fateDeclare: '本回合最多使用 1 張功能牌，宿命會在此公開宣告。',
  playCards: '選擇你真正要執行的陣營。這可以和承諾不同。',
  resolvePublicCards: '本回合最多使用 1 張功能牌，公開型效果會在翻牌前處理。',
  reveal: '翻開本回合陣營，並確認最終判定。',
  resolveJudgment: '點擊玩家結果可查看加扣分明細。',
  drawCards: '手牌未滿 3 張的玩家會補 1 張功能牌。',
  roundEnd: '回合已完成，可查看摘要後推進下一回合。',
  gameEnd: '遊戲已結束，請查看最終結果。'
};

function handLimitText(player: PlayerState): string {
  return `手牌 ${player.hand.length} / 3`;
}

export function TablePlayArea({ gameState, onGameStateChange }: TablePlayAreaProps) {
  const human = gameState.players.find((player) => player.isHuman);
  const otherPlayers = useMemo(() => gameState.players.filter((player) => !player.isHuman && !player.isEliminated), [gameState.players]);
  const [commitment, setCommitment] = useState<Faction | ''>('');
  const [chosenFaction, setChosenFaction] = useState<Faction | ''>('');
  const [selectedCard, setSelectedCard] = useState<CardType | ''>('');
  const [targetPlayerId, setTargetPlayerId] = useState(otherPlayers[0]?.id ?? '');
  const [fateKind, setFateKind] = useState<FateKind>('majority');
  const [fateFaction, setFateFaction] = useState<Faction>('alliance');
  const [inspectedCard, setInspectedCard] = useState<CardDetailTarget | undefined>();
  const [localError, setLocalError] = useState('');
  const [peekNotice, setPeekNotice] = useState('');
  const [hasPeekConfirmed, setHasPeekConfirmed] = useState(false);
  const [confirmedPeekTargetId, setConfirmedPeekTargetId] = useState('');
  const [peekResultShown, setPeekResultShown] = useState(false);
  const handKey = human?.hand.join('|') ?? '';
  const showReveal = revealPhases.has(gameState.phase);
  const latestRoundResult = gameState.roundResults.at(-1);

  function resetCardState() {
    setChosenFaction('');
    setSelectedCard('');
    setTargetPlayerId(otherPlayers[0]?.id ?? '');
    setFateKind('majority');
    setFateFaction('alliance');
    setInspectedCard(undefined);
    setLocalError('');
    setPeekNotice('');
    setHasPeekConfirmed(false);
    setConfirmedPeekTargetId('');
    setPeekResultShown(false);
  }

  useEffect(() => {
    setCommitment('');
    resetCardState();
  }, [gameState.round, gameState.phase, handKey, human?.chosenFaction, human?.commitment]);

  useEffect(() => {
    if (hasPeekConfirmed) {
      return;
    }
    const targetPool =
      gameState.phase === 'resolvePublicCards' && human?.playedCard?.type === 'peek' && !human.hasResolvedPeek && human.id
        ? getPeekTargetPlayers(gameState, human.id)
        : otherPlayers;
    if (!targetPlayerId || !targetPool.some((player) => player.id === targetPlayerId)) {
      setTargetPlayerId(targetPool[0]?.id ?? '');
    }
  }, [gameState, hasPeekConfirmed, human?.id, human?.hasResolvedPeek, human?.playedCard?.type, otherPlayers, targetPlayerId]);

  useEffect(() => {
    if (selectedCard && chosenFaction && !canUseCardWithFaction(selectedCard, chosenFaction)) {
      setSelectedCard('');
      setLocalError(`${CARD_LABELS[selectedCard]} 需要搭配盟約陣營使用。`);
    }
  }, [chosenFaction, selectedCard]);

  if (!human) {
    return null;
  }

  const humanPlayer = human;
  const pendingHumanPeek =
    gameState.phase === 'resolvePublicCards' && humanPlayer.playedCard?.type === 'peek' && !humanPlayer.hasResolvedPeek;
  const peekTargetPlayers = pendingHumanPeek ? getPeekTargetPlayers(gameState, humanPlayer.id) : [];
  const pendingPeekTarget = peekTargetPlayers.find((player) => player.id === targetPlayerId) ?? peekTargetPlayers[0];
  const confirmedPeekTarget = peekTargetPlayers.find((player) => player.id === confirmedPeekTargetId);
  const lockedPeekTarget = hasPeekConfirmed ? confirmedPeekTarget : undefined;
  const committedFaction = humanPlayer.commitment ?? commitment;
  const lockedFaction = humanPlayer.chosenFaction ?? chosenFaction;
  const lockedCard = humanPlayer.playedCard?.type ?? selectedCard;
  const lockedFunctionSelection: FunctionCardSelection | '' =
    humanPlayer.functionCardSelection ?? (humanPlayer.chosenFaction ? humanPlayer.playedCard?.type ?? 'blank' : lockedCard);
  const canAdvance =
    gameState.phase !== 'gameEnd' &&
    !(gameState.phase === 'commitment' && !humanPlayer.commitment) &&
    !(gameState.phase === 'fateDeclare' && !humanPlayer.hasResolvedFateDeclaration) &&
    !(gameState.phase === 'playCards' && !humanPlayer.chosenFaction) &&
    !pendingHumanPeek;
  const canChooseCommitment = gameState.phase === 'commitment' && !humanPlayer.commitment;
  const canDeclareFate = gameState.phase === 'fateDeclare' && !humanPlayer.hasResolvedFateDeclaration;
  const canChoosePlay = gameState.phase === 'playCards' && !humanPlayer.chosenFaction;
  const showBlankOrderPreview = canChoosePlay && Boolean(chosenFaction) && !selectedCard;
  const commitmentZoneClass = canChooseCommitment ? (committedFaction ? 'is-active-zone is-targeted-zone' : 'is-active-zone') : 'is-quiet-zone';
  const factionZoneClass = canChoosePlay ? (lockedFaction ? 'is-active-zone is-targeted-zone' : 'is-active-zone') : 'is-quiet-zone';
  const functionZoneClass =
    canChoosePlay && lockedFaction ? (lockedFunctionSelection ? 'is-active-zone is-targeted-zone' : 'is-active-zone') : 'is-quiet-zone';
  const currentSpeaker = gameState.players.find((player) => player.id === gameState.dealerPlayerId) ?? gameState.players[0];
  const publicCardPlayers = getPublicCardResolvePlayers(gameState);
  const revealedPlayers = gameState.players.filter((player) => !player.isEliminated);
  const currentResult = latestRoundResult?.round === gameState.round ? latestRoundResult : undefined;

  function inspectCard(target: CardDetailTarget) {
    setInspectedCard(target);
  }

  function handleCommitmentCardClick(faction: Faction) {
    inspectCard({ kind: 'commitment', faction });
    if (!canChooseCommitment) {
      return;
    }
    setCommitment(faction);
    setLocalError('');
  }

  function handleFactionCardClick(faction: Faction) {
    inspectCard({ kind: 'faction', faction });
    if (!canChoosePlay) {
      return;
    }
    setChosenFaction(faction);
    setLocalError('');
  }

  function handleFunctionCardClick(card: CardType) {
    inspectCard({ kind: 'function', cardType: card });
    if (!canChoosePlay) {
      return;
    }
    if (card === 'fate') {
      setLocalError('宿命只能在宿命宣告階段使用。');
      return;
    }
    if (!chosenFaction) {
      setLocalError('請先暗放盟約或叛離陣營牌。');
      return;
    }
    if (!canUseCardWithFaction(card, chosenFaction)) {
      setLocalError(`${CARD_LABELS[card]} 需要搭配盟約陣營使用。`);
      return;
    }
    setSelectedCard(card);
    setLocalError('');
  }

  function handleCommitmentDrop(payload: DragPayload): boolean {
    if (humanPlayer.commitment) {
      setLocalError('本回合已完成承諾。');
      return false;
    }
    if (payload.kind !== 'commitment') {
      setLocalError('請把承諾 token 放到承諾區。');
      return false;
    }
    setCommitment(payload.faction);
    setLocalError('');
    return true;
  }

  function handleFactionDrop(payload: DragPayload): boolean {
    if (humanPlayer.chosenFaction) {
      setLocalError('本回合已完成出牌。');
      return false;
    }
    if (payload.kind !== 'faction') {
      setLocalError('請把盟約或叛離牌放到陣營區。');
      return false;
    }
    setChosenFaction(payload.faction);
    setLocalError('');
    return true;
  }

  function handleCardDrop(payload: DragPayload): boolean {
    if (humanPlayer.chosenFaction) {
      setLocalError('本回合已完成出牌。');
      return false;
    }
    if (payload.kind !== 'card') {
      setLocalError('請把功能牌放到功能牌觸發區。');
      return false;
    }
    if (payload.cardType === 'fate') {
      setLocalError('宿命只能在宿命宣告階段使用。');
      return false;
    }
    if (!chosenFaction) {
      setLocalError('請先暗放盟約或叛離陣營牌。');
      return false;
    }
    if (!canUseCardWithFaction(payload.cardType, chosenFaction)) {
      setLocalError(`${CARD_LABELS[payload.cardType]} 需要搭配盟約陣營使用。`);
      return false;
    }
    setSelectedCard(payload.cardType);
    setLocalError('');
    return true;
  }

  function handleCommitment() {
    if (!commitment) {
      setLocalError('請先選擇一枚承諾 token。');
      return;
    }
    setLocalError('');
    onGameStateChange(submitHumanCommitment(gameState, commitment));
  }

  function buildHumanPlayInput(): HumanPlayInput | undefined {
    if (!chosenFaction) {
      setLocalError('請先暗放一張陣營牌。');
      return undefined;
    }
    if (selectedCard && !canUseCardWithFaction(selectedCard, chosenFaction)) {
      setLocalError(`${CARD_LABELS[selectedCard]} 需要搭配盟約陣營使用。`);
      return undefined;
    }
    return {
      chosenFaction,
      card: selectedCard
        ? {
            type: selectedCard,
            targetPlayerId: undefined
          }
        : undefined
    };
  }

  function buildFateDeclarationInput(useFate: boolean): HumanFateDeclarationInput | undefined {
    if (!useFate) {
      return { useFate: false };
    }
    if (fateKind === 'identity' && !targetPlayerId) {
      setLocalError('宿命的身分預言需要指定目標玩家。');
      return undefined;
    }
    return {
      useFate: true,
      fatePrediction:
        fateKind === 'majority'
          ? { kind: 'majority', predictedMajority: fateFaction }
          : { kind: 'identity', targetPlayerId, predictedFaction: fateFaction }
    };
  }

  function handleCompletePlay() {
    const input = buildHumanPlayInput();
    if (!input) {
      return;
    }
    const validationError = validateHumanPlay(gameState, input);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    const nextState = completeHumanPlay(gameState, input);
    onGameStateChange(nextState);
    if (nextState.players.find((player) => player.isHuman)?.chosenFaction) {
      resetCardState();
    }
  }

  function handleFateDeclaration(useFate: boolean) {
    const input = buildFateDeclarationInput(useFate);
    if (!input) {
      return;
    }
    const validationError = validateHumanFateDeclaration(gameState, input);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError('');
    onGameStateChange(submitHumanFateDeclaration(gameState, input));
  }

  function handleAdvance() {
    if (gameState.phase === 'gameEnd') {
      return;
    }
    if (gameState.phase === 'commitment' && !humanPlayer.commitment) {
      setLocalError('請先確認本回合承諾。');
      return;
    }
    if (gameState.phase === 'fateDeclare' && !humanPlayer.hasResolvedFateDeclaration) {
      setLocalError('請先處理宿命宣告。');
      return;
    }
    if (gameState.phase === 'playCards' && !humanPlayer.chosenFaction) {
      setLocalError('請先確認本回合出牌。');
      return;
    }
    if (pendingHumanPeek) {
      setLocalError('請先完成真理之眼指定與是否更換陣營的選擇。');
      return;
    }
    setLocalError('');
    onGameStateChange(advancePhase(gameState));
  }

  function handlePeekTargetChange(playerId: string) {
    if (hasPeekConfirmed) {
      return;
    }
    setTargetPlayerId(playerId);
    setPeekNotice('');
    setLocalError('');
  }

  function handleCancelPeekTarget() {
    if (hasPeekConfirmed) {
      return;
    }
    setTargetPlayerId(peekTargetPlayers[0]?.id ?? '');
    setPeekNotice('');
    setLocalError('');
  }

  function handleConfirmPeekTarget() {
    if (hasPeekConfirmed || peekResultShown) {
      return;
    }
    if (!pendingPeekTarget) {
      setLocalError('請先選擇 1 名真理之眼目標。');
      return;
    }
    setHasPeekConfirmed(true);
    setConfirmedPeekTargetId(pendingPeekTarget.id);
    setPeekResultShown(true);
    setPeekNotice(`真理之眼揭示：${pendingPeekTarget.name} 本回合選擇了【${FACTION_LABELS[pendingPeekTarget.chosenFaction ?? 'alliance']}】`);
    setLocalError('');
  }

  function handleResolvePeek(shouldSwitchFaction: boolean) {
    if (!hasPeekConfirmed || !confirmedPeekTargetId) {
      setLocalError('請先確認真理之眼目標。');
      return;
    }
    if (!lockedPeekTarget) {
      setLocalError('已確認的真理之眼目標無效。');
      return;
    }
    const result = resolvePeekChoice(gameState, humanPlayer.id, lockedPeekTarget.id, shouldSwitchFaction);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    setLocalError('');
    setPeekNotice('');
    setHasPeekConfirmed(false);
    setConfirmedPeekTargetId('');
    setPeekResultShown(false);
    onGameStateChange(result.state);
  }

  function renderCommitmentSlot(faction: Faction | '') {
    if (!faction) {
      return undefined;
    }
    return (
      <button className="placed-card placed-card-button token-placed" type="button" onClick={() => inspectCard({ kind: 'commitment', faction })}>
        <img src={commitmentTokenImageByFaction[faction]} alt="" onError={(event) => event.currentTarget.remove()} />
        <span>承諾：{factionLabels[faction]}</span>
      </button>
    );
  }

  function renderHiddenCardSlot(label: string, faceImage?: string, faceLabel?: string, detailTarget?: CardDetailTarget) {
    const shownImage = showReveal && faceImage ? faceImage : cardBackImage;
    const shownLabel = showReveal && faceLabel ? faceLabel : label;
    const cardContent = (
      <>
        <img src={shownImage} alt="" onError={(event) => event.currentTarget.remove()} />
        <span>{shownLabel}</span>
      </>
    );

    if (detailTarget) {
      return (
        <button className="placed-card placed-card-button" type="button" onClick={() => inspectCard(detailTarget)}>
          {cardContent}
        </button>
      );
    }

    return (
      <span className="placed-card">
        {cardContent}
      </span>
    );
  }

  function renderStaticSlot(title: string, hint: string, children?: ReactNode, className = '') {
    return (
      <section className={`drop-zone table-card-slot is-static ${className}`}>
        <span className="drop-zone-title">{title}</span>
        <div className="drop-zone-body">{children ?? <span className="drop-zone-hint">{hint}</span>}</div>
      </section>
    );
  }

  function renderCommitmentMarker(player: PlayerState) {
    return (
      <span className="table-token-marker" key={player.id}>
        <span>{player.name}</span>
        {player.commitment ? (
          <img src={commitmentTokenImageByFaction[player.commitment]} alt="" onError={(event) => event.currentTarget.remove()} />
        ) : (
          <span className="empty-token">?</span>
        )}
      </span>
    );
  }

  function renderCommitmentZone() {
    const content = renderCommitmentSlot(committedFaction);

    if (gameState.phase === 'commitment' && !humanPlayer.commitment) {
      return (
        <DropZone className={`table-token-slot ${commitmentZoneClass}`} title="你的承諾 token" hint="拖曳一枚承諾 token" onDropPayload={handleCommitmentDrop}>
          {content}
        </DropZone>
      );
    }

    return renderStaticSlot('你的承諾 token', '等待承諾', content, commitmentZoneClass);
  }

  function renderFactionZone() {
    const content = lockedFaction
      ? renderHiddenCardSlot('已暗放', factionCardImageByFaction[lockedFaction], factionLabels[lockedFaction], { kind: 'faction', faction: lockedFaction })
      : undefined;

    if (gameState.phase === 'playCards' && !humanPlayer.chosenFaction) {
      return (
        <DropZone className={`table-card-slot ${factionZoneClass}`} title="陣營牌放置區" hint="拖曳盟約或叛離牌" onDropPayload={handleFactionDrop}>
          {content}
        </DropZone>
      );
    }

    return renderStaticSlot('陣營牌放置區', '等待暗放陣營', content, factionZoneClass);
  }

  function renderFunctionZone() {
    const content = lockedFunctionSelection
      ? lockedFunctionSelection === 'blank'
        ? renderHiddenCardSlot('已暗放', cardBackImage, '空白密令', { kind: 'blankFunction' })
        : renderHiddenCardSlot('已暗放', cardImageByType[lockedFunctionSelection], CARD_LABELS[lockedFunctionSelection], {
            kind: 'function',
            cardType: lockedFunctionSelection
          })
      : undefined;

    if (gameState.phase === 'playCards' && !humanPlayer.chosenFaction) {
      return (
        <DropZone className={`table-card-slot ${functionZoneClass}`} title="功能牌觸發區" hint="可選擇 1 張功能牌" onDropPayload={handleCardDrop}>
          {content}
        </DropZone>
      );
    }

    return renderStaticSlot('功能牌觸發區', '等待暗放密令', content, functionZoneClass);
  }

  function playerNameById(playerId?: string) {
    if (!playerId) {
      return '未指定';
    }
    return gameState.players.find((player) => player.id === playerId)?.name ?? playerId;
  }

  function renderStageTitle(eyebrow: string, title: string, hint?: string) {
    return (
      <div className="stage-title">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    );
  }

  function renderCommitmentStage() {
    return (
      <section className="phase-playfield commitment-playfield" aria-label="承諾階段牌桌">
        {renderStageTitle('公開承諾', '選擇本回合承諾', '中央只接收承諾 token')}
        <div className="stage-token-focus">
          {renderCommitmentZone()}
        </div>
        <div className="stage-token-rim" aria-label="所有玩家承諾狀態">
          {gameState.players.map(renderCommitmentMarker)}
        </div>
      </section>
    );
  }

  function renderDiscussionStage() {
    return (
      <section className="phase-playfield discussion-playfield" aria-label="發言階段牌桌">
        {renderStageTitle('發言階段', currentSpeaker ? `${currentSpeaker.name} 帶頭發言` : '自由討論', '手牌可查看，不可出牌')}
        <div className="speaker-spotlight">
          <span className="speaker-avatar">{currentSpeaker?.name.slice(0, 1) ?? '?'}</span>
          <div>
            <strong>{currentSpeaker?.name ?? '未知玩家'}</strong>
            <span>公開承諾狀態已上桌</span>
          </div>
        </div>
        <div className="stage-token-rim is-compact" aria-label="公開承諾狀態">
          {gameState.players.map(renderCommitmentMarker)}
        </div>
      </section>
    );
  }

  function renderFateDeclareStage() {
    const hasFate = humanPlayer.hand.includes('fate');
    return (
      <section className="phase-playfield fate-declare-playfield" aria-label="宿命宣告階段牌桌">
        {renderStageTitle('宿命宣告', '是否使用《宿命》宣告預言？', '宣告會公開，點數修正會在最終陣營確定後結算')}
        <div className="fate-declare-panel">
          {humanPlayer.hasResolvedFateDeclaration ? (
            <span className="stage-empty">你已完成宿命宣告</span>
          ) : hasFate ? (
            <>
              <div className="operation-options fate-declare-options">
                <label>
                  預言類型
                  <select value={fateKind} onChange={(event) => setFateKind(event.target.value as FateKind)}>
                    <option value="majority">勝負預言</option>
                    <option value="identity">身分預言</option>
                  </select>
                </label>
                <label>
                  預言陣營
                  <select value={fateFaction} onChange={(event) => setFateFaction(event.target.value as Faction)}>
                    <option value="alliance">合作</option>
                    <option value="betrayal">背叛</option>
                  </select>
                </label>
                {fateKind === 'identity' ? (
                  <label>
                    指定玩家
                    <select value={targetPlayerId} onChange={(event) => setTargetPlayerId(event.target.value)}>
                      {otherPlayers.map((player) => (
                        <option value={player.id} key={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              <div className="peek-resolution-actions">
                <button className="secondary-button quiet-button" type="button" onClick={() => handleFateDeclaration(false)}>
                  不使用
                </button>
                <button className="confirm-button" type="button" onClick={() => handleFateDeclaration(true)}>
                  使用宿命
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="stage-empty">你沒有《宿命》可宣告</span>
              <button className="confirm-button" type="button" onClick={() => handleFateDeclaration(false)}>
                略過宿命宣告
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  function renderPlayCardsStage() {
    return (
      <section className="phase-playfield playcards-playfield" aria-label="出牌階段牌桌">
        {renderStageTitle('暗放出牌', '選擇陣營與功能牌', '只顯示本階段需要的卡槽')}
        <div className="stage-card-slots">
          {renderFactionZone()}
          {renderFunctionZone()}
        </div>
      </section>
    );
  }

  function renderPublicCardsStage() {
    return (
      <section className="phase-playfield public-playfield" aria-label="公開功能牌觸發階段牌桌">
        {renderStageTitle('公開處理列', '公開功能牌依序觸發', publicCardPlayers.length > 0 ? '真理之眼會在此指定與處理' : '本回合沒有公開功能牌')}
        <div className="public-card-track">
          {publicCardPlayers.length === 0 ? <span className="stage-empty">沒有公開功能牌需要處理</span> : null}
          {publicCardPlayers.map((player) => {
            const playedCard = player.playedCard;
            if (!playedCard) {
              return null;
            }
            return (
              <article className="public-card-entry" key={player.id}>
                <button className="stage-card-thumb" type="button" onClick={() => inspectCard({ kind: 'function', cardType: playedCard.type })}>
                  <img src={cardImageByType[playedCard.type]} alt="" onError={(event) => event.currentTarget.remove()} />
                  <span>{CARD_LABELS[playedCard.type]}</span>
                </button>
                <div>
                  <strong>{player.name}</strong>
                  <span>
                    {playedCard.type === 'peek'
                      ? playedCard.targetPlayerId
                        ? `目標：${playerNameById(playedCard.targetPlayerId)}`
                        : '等待指定目標'
                      : '等待最終判定'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderRevealStage() {
    return (
      <section className="phase-playfield reveal-playfield" aria-label="揭示階段牌桌">
        {renderStageTitle('揭示舞台', '翻開本回合暗放卡牌', '原選擇與最終判定在此確認')}
        <div className="reveal-card-grid">
          {revealedPlayers.map((player) => {
            const chosenFactionLabel = player.chosenFaction ? factionLabels[player.chosenFaction] : '未出牌';
            const judgedFactionLabel = player.judgedFaction ? factionLabels[player.judgedFaction] : chosenFactionLabel;
            const functionSelection = player.functionCardSelection ?? player.playedCard?.type ?? (player.chosenFaction ? 'blank' : undefined);
            const isBlankFunction = functionSelection === 'blank';
            const functionImage = functionSelection && !isBlankFunction ? cardImageByType[functionSelection] : cardBackImage;
            const functionLabel = isBlankFunction ? '空白密令' : functionSelection ? CARD_LABELS[functionSelection] : '未暗放';
            return (
              <article className="reveal-card-entry" key={player.id}>
                <strong>{player.name}</strong>
                <div className="reveal-card-pair">
                  <span className="reveal-mini-card">
                    <img src={player.chosenFaction ? factionCardImageByFaction[player.chosenFaction] : cardBackImage} alt="" onError={(event) => event.currentTarget.remove()} />
                    <small>{chosenFactionLabel}</small>
                  </span>
                  <span className="reveal-mini-card">
                    <img src={functionImage} alt="" onError={(event) => event.currentTarget.remove()} />
                    <small>{functionLabel}</small>
                    {isBlankFunction ? <em>空白功能牌 / 無效果</em> : null}
                  </span>
                </div>
                <span className="judged-line">
                  {chosenFactionLabel} → {judgedFactionLabel}
                </span>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderJudgmentStage() {
    const result = currentResult;
    return (
      <section className="phase-playfield judgment-playfield" aria-label="裁決結算牌桌">
        {renderStageTitle('裁決結果', result ? situationLabels[result.situation.resultType] : '等待落槌', result ? result.summary : '推進階段後會執行本回合裁決')}
        {result ? (
          <div className="score-change-list">
            {result.situation.validPlayerIds.map((playerId) => {
              const player = gameState.players.find((candidate) => candidate.id === playerId);
              const finalDelta = result.finalDeltaByPlayerId[playerId] ?? 0;
              const currentPoints = player?.judgmentPoints ?? 0;
              const previousPoints = currentPoints - finalDelta;
              return (
                <details className={player?.isHuman ? 'score-change-row is-human-score' : 'score-change-row'} key={playerId}>
                  <summary>
                    <span>{playerNameById(playerId)}</span>
                    <strong>
                      {previousPoints} → {currentPoints}
                    </strong>
                    <em className={finalDelta >= 0 ? 'positive-delta' : 'negative-delta'}>{finalDelta >= 0 ? `+${finalDelta}` : finalDelta}</em>
                  </summary>
                  {player ? <ScoreBreakdownPanel breakdown={buildScoreBreakdown(player, result)} compact /> : null}
                </details>
              );
            })}
          </div>
        ) : (
          <span className="stage-empty">裁決尚未執行</span>
        )}
      </section>
    );
  }

  function renderDrawStage() {
    const willDraw = !humanPlayer.isEliminated && humanPlayer.hand.length < 3;
    return (
      <section className="phase-playfield draw-playfield" aria-label="補牌階段牌桌">
        {renderStageTitle('補牌階段', willDraw ? '功能牌補入手牌' : '手牌已滿', willDraw ? '未滿 3 張會補 1 張' : '本次跳過補牌')}
        <div className="draw-stage-card">
          <img src={cardBackImage} alt="" onError={(event) => event.currentTarget.remove()} />
          <strong>{willDraw ? '準備補牌' : '跳過補牌'}</strong>
          <span>{handLimitText(humanPlayer)}</span>
        </div>
      </section>
    );
  }

  function renderRoundEndStage() {
    return (
      <section className="phase-playfield round-end-playfield" aria-label="回合結束牌桌">
        {renderStageTitle('回合結束', currentResult ? situationLabels[currentResult.situation.resultType] : '準備下一回合', '查看戰報後可推進下一回合')}
        <div className="round-end-token">
          <strong>第 {gameState.round} 回合完成</strong>
          <span>{currentResult?.summary ?? '本回合已收束'}</span>
        </div>
      </section>
    );
  }

  function renderStageCenter() {
    if (gameState.phase === 'commitment') {
      return renderCommitmentStage();
    }
    if (gameState.phase === 'discussion') {
      return renderDiscussionStage();
    }
    if (gameState.phase === 'fateDeclare') {
      return renderFateDeclareStage();
    }
    if (gameState.phase === 'playCards') {
      return renderPlayCardsStage();
    }
    if (gameState.phase === 'resolvePublicCards') {
      return renderPublicCardsStage();
    }
    if (gameState.phase === 'reveal') {
      return renderRevealStage();
    }
    if (gameState.phase === 'resolveJudgment' || gameState.phase === 'gameEnd') {
      return renderJudgmentStage();
    }
    if (gameState.phase === 'drawCards') {
      return renderDrawStage();
    }
    return renderRoundEndStage();
  }

  function renderPrimaryAction() {
    if (gameState.phase === 'commitment') {
      return (
        <button className="confirm-button" type="button" onClick={handleCommitment} disabled={Boolean(humanPlayer.commitment) || !commitment}>
          確認承諾
        </button>
      );
    }
    if (gameState.phase === 'playCards') {
      return (
        <button className="confirm-button" type="button" onClick={handleCompletePlay} disabled={Boolean(humanPlayer.chosenFaction) || !chosenFaction}>
          確認出牌
        </button>
      );
    }
    return null;
  }

  return (
    <section className="table-play-area" aria-label="中央審判區與你的操作區">
      <div className="central-judgement-ui">
        <div className="round-focus-strip">
          <span>第 {gameState.round} 回合</span>
          <strong>{PHASE_LABELS[gameState.phase]}</strong>
        </div>
        <p className="phase-quick-hint">{phaseQuickHints[gameState.phase]}</p>
        {renderStageCenter()}
      </div>

      <section className="player-foreground" aria-label="自己的操作區">
        <div className="operation-player self-seat-hud">
          <span>你的席位</span>
          <strong>{humanPlayer.judgmentPoints} 裁決點</strong>
          <small>{handLimitText(humanPlayer)}</small>
        </div>

        <div className="hand-stage" aria-label="自己的手牌">
          <div className="operation-group token-tools hand-cluster">
            <span className="operation-label">承諾 token</span>
            <div className="operation-card-row token-row">
              {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
                <DraggableCard
                  className={`operation-card operation-token ${canChooseCommitment ? 'is-playable-card' : ''}`}
                  disabled={!canChooseCommitment}
                  imageSrc={commitmentTokenImageByFaction[faction]}
                  key={faction}
                  label={factionLabels[faction]}
                  payload={{ kind: 'commitment', faction }}
                  selected={committedFaction === faction}
                  onClick={() => handleCommitmentCardClick(faction)}
                />
              ))}
            </div>
          </div>

          <div className="operation-group faction-tools hand-cluster">
            <span className="operation-label">陣營牌</span>
            <div className="operation-card-row">
              {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
                <DraggableCard
                  className={`operation-card faction-action-card ${canChoosePlay ? 'is-playable-card' : ''}`}
                  disabled={!canChoosePlay}
                  imageSrc={factionCardImageByFaction[faction]}
                  key={faction}
                  label={factionLabels[faction]}
                  payload={{ kind: 'faction', faction }}
                  selected={lockedFaction === faction}
                  onClick={() => handleFactionCardClick(faction)}
                />
              ))}
            </div>
          </div>

          <div className="operation-group hand-tools hand-cluster">
            <span className="operation-label">功能牌手牌</span>
            <div className="operation-card-row hand-fan">
              {humanPlayer.hand.length === 0 ? <span className="muted empty-hand">沒有功能牌</span> : null}
              {humanPlayer.hand.map((card, index) => {
                const isPlayable = canChoosePlay && chosenFaction !== '' && card !== 'fate' && canUseCardWithFaction(card, chosenFaction);
                const isDisabled = !isPlayable;
                return (
                  <DraggableCard
                    className={`operation-card hand-action-card ${isPlayable ? 'is-playable-card' : ''}`}
                    disabled={isDisabled}
                    imageSrc={cardImageByType[card]}
                    key={`${card}-${index}`}
                    label={CARD_LABELS[card]}
                    note={
                      isDisabled && gameState.phase === 'playCards' && !humanPlayer.chosenFaction
                        ? card === 'fate'
                          ? '宣告階段'
                          : chosenFaction
                            ? '需搭配盟約'
                            : '先選陣營'
                        : undefined
                    }
                    payload={{ kind: 'card', cardType: card }}
                    selected={selectedCard === card}
                    onClick={() => handleFunctionCardClick(card)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="operation-actions action-corner">
          <button className="secondary-button quiet-button" type="button" onClick={() => setSelectedCard('')} disabled={Boolean(humanPlayer.chosenFaction) || gameState.phase !== 'playCards'}>
            不使用功能牌
          </button>
          {showBlankOrderPreview ? <p className="blank-order-note">空白密令：本回合不使用功能牌，無效果。</p> : null}
          {renderPrimaryAction()}
          <button className="phase-advance-button" type="button" onClick={handleAdvance} disabled={!canAdvance}>
            推進階段
          </button>
          {localError ? <p className="table-error">{localError}</p> : null}
        </div>
      </section>

      <CardEffectOverlay
        confirmed={hasPeekConfirmed && peekResultShown && Boolean(lockedPeekTarget)}
        disabledConfirm={hasPeekConfirmed || !pendingPeekTarget}
        isOpen={pendingHumanPeek}
        notice={peekNotice}
        selectedTargetId={hasPeekConfirmed ? confirmedPeekTargetId : pendingPeekTarget?.id ?? ''}
        targetPlayers={peekTargetPlayers}
        onCancelTarget={handleCancelPeekTarget}
        onConfirmTarget={handleConfirmPeekTarget}
        onKeepFaction={() => handleResolvePeek(false)}
        onSwitchFaction={() => handleResolvePeek(true)}
        onTargetChange={handlePeekTargetChange}
      />

      {inspectedCard ? <CardDetailPanel target={inspectedCard} onClose={() => setInspectedCard(undefined)} /> : null}
    </section>
  );
}
