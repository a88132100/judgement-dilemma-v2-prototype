import { useEffect, useMemo, useRef, useState } from 'react';
import { canUseCardWithFaction, cardRequirementText } from '../game/cardRules';
import { getChaosTargetPlayers, getPeekTargetPlayers, getPublicCardResolvePlayers, resolveChaosChoice, resolvePeekChoice } from '../game/cardResolver';
import { CARD_LABELS, FACTION_LABELS, PHASE_LABELS } from '../game/constants';
import { buildBotSpeech } from '../game/botSpeech';
import {
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
import { DropZone, type DropPoint } from './DropZone';
import type { DragPayload } from './dragTypes';
import { useCardCast } from './useCardCast';
import { useRoundFlow } from './useRoundFlow';
import { TribunalPlaque } from './TribunalPlaque';
import { CommitmentTokenArt } from './CommitmentTokenArt';

interface TablePlayAreaProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  flowPaused?: boolean;
}

type FateKind = 'majority' | 'identity';

const revealPhases = new Set<RoundPhase>(['reveal', 'resolveJudgment', 'drawCards', 'roundEnd', 'gameEnd']);

const factionLabels: Record<Faction, string> = {
  alliance: '盟約',
  betrayal: '叛離'
};

// 用固定種子讓同一回合的 Bot 發言穩定，不因 React 重新渲染而跳句。
function stableSpeechRng(seed: string): () => number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return () => (hash % 1000) / 1000;
}

function handLimitText(player: PlayerState): string {
  return `手牌 ${player.hand.length} / 3`;
}

function choiceButtonClass(isSelected: boolean) {
  return `stage-choice-button ${isSelected ? 'is-selected' : ''}`;
}

export function TablePlayArea({ gameState, onGameStateChange, flowPaused = false }: TablePlayAreaProps) {
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
  const commitmentLandingRef = useRef<HTMLDivElement>(null);
  const factionLandingRef = useRef<HTMLDivElement>(null);
  const functionLandingRef = useRef<HTMLDivElement>(null);
  const dragSourceRef = useRef<HTMLButtonElement | null>(null);
  const { castCard, cancelCast } = useCardCast(gameState);
  const showReveal = revealPhases.has(gameState.phase);
  const botSpeeches = useMemo(
    () =>
      gameState.players
        .filter((player) => !player.isHuman && !player.isEliminated)
        .map((player) => buildBotSpeech(player, stableSpeechRng(`${gameState.round}:${player.id}`))),
    [gameState.players, gameState.round]
  );
  const pendingHumanPeek = gameState.phase === 'resolvePublicCards' && !human?.isEliminated && human?.playedCard?.type === 'peek' && !human.hasResolvedPeek;
  const { speechIndex, discussionPaused, announcementVisible, skipDiscussion, toggleDiscussionPause } = useRoundFlow({
    gameState,
    onGameStateChange,
    paused: flowPaused || Boolean(inspectedCard) || pendingHumanPeek
  });

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
    // 重開可能仍是相同回合、階段與手牌；新初始對局必須清掉尚未確認的選擇。
    if (gameState.round === 1 && gameState.phase === 'commitment' && !human?.commitment && gameState.roundResults.length === 0) {
      setCommitment('');
      resetCardState();
      dragSourceRef.current = null;
    }
  }, [gameState]);

  useEffect(() => {
    if (hasPeekConfirmed) {
      return;
    }
    const targetPool =
      gameState.phase === 'resolvePublicCards' && human?.playedCard?.type === 'peek' && !human.hasResolvedPeek && human.id
        ? getPeekTargetPlayers(gameState, human.id)
        : gameState.phase === 'resolvePublicCards' && human?.playedCard?.type === 'chaos' && !human.hasResolvedChaos && human.id
          ? getChaosTargetPlayers(gameState, human.id)
        : otherPlayers;
    if (!targetPlayerId || !targetPool.some((player) => player.id === targetPlayerId)) {
      setTargetPlayerId(targetPool[0]?.id ?? '');
    }
  }, [gameState, hasPeekConfirmed, human?.id, human?.hasResolvedChaos, human?.hasResolvedPeek, human?.playedCard?.type, otherPlayers, targetPlayerId]);

  useEffect(() => {
    if (selectedCard && chosenFaction && !canUseCardWithFaction(selectedCard, chosenFaction)) {
      setSelectedCard('');
      setLocalError(`${CARD_LABELS[selectedCard]} ${cardRequirementText(selectedCard) ?? '不可搭配此陣營'}。`);
    }
  }, [chosenFaction, selectedCard]);

  if (!human) {
    return null;
  }

  const humanPlayer = human;
  const peekTargetPlayers = pendingHumanPeek ? getPeekTargetPlayers(gameState, humanPlayer.id) : [];
  const pendingPeekTarget = peekTargetPlayers.find((player) => player.id === targetPlayerId) ?? peekTargetPlayers[0];
  const confirmedPeekTarget = peekTargetPlayers.find((player) => player.id === confirmedPeekTargetId);
  const lockedPeekTarget = hasPeekConfirmed ? confirmedPeekTarget : undefined;
  const pendingHumanChaos =
    gameState.phase === 'resolvePublicCards' && !humanPlayer.isEliminated && humanPlayer.playedCard?.type === 'chaos' && !humanPlayer.hasResolvedChaos;
  const chaosTargetPlayers = pendingHumanChaos ? getChaosTargetPlayers(gameState, humanPlayer.id) : [];
  const pendingChaosTarget = chaosTargetPlayers.find((player) => player.id === targetPlayerId) ?? chaosTargetPlayers[0];
  const committedFaction = humanPlayer.commitment ?? commitment;
  const lockedFaction = humanPlayer.chosenFaction ?? chosenFaction;
  const lockedCard = humanPlayer.playedCard?.type ?? selectedCard;
  const lockedFunctionSelection: FunctionCardSelection | '' =
    humanPlayer.functionCardSelection ?? (humanPlayer.chosenFaction ? humanPlayer.playedCard?.type ?? 'blank' : lockedCard);
  const canChooseCommitment = gameState.phase === 'commitment' && !humanPlayer.isEliminated && !humanPlayer.commitment;
  const canDeclareFate = gameState.phase === 'fateDeclare' && !humanPlayer.isEliminated && !humanPlayer.hasResolvedFateDeclaration;
  const canChoosePlay = gameState.phase === 'playCards' && !humanPlayer.isEliminated && !humanPlayer.chosenFaction;
  const showBlankOrderPreview = canChoosePlay && Boolean(chosenFaction) && !selectedCard;
  const publicCardPlayers = getPublicCardResolvePlayers(gameState);

  function inspectCard(target: CardDetailTarget) {
    setInspectedCard(target);
  }

  function castPayload(payload: DragPayload, source: HTMLButtonElement | null, origin?: DropPoint) {
    if (payload.kind === 'commitment') {
      castCard({ source, destination: commitmentLandingRef.current, imageSrc: commitmentTokenImageByFaction[payload.faction], origin, tilt: -12 });
    } else if (payload.kind === 'faction') {
      castCard({ source, destination: factionLandingRef.current, imageSrc: factionCardImageByFaction[payload.faction], backImageSrc: cardBackImage, origin, tilt: -8 });
    } else {
      castCard({ source, destination: functionLandingRef.current, imageSrc: cardImageByType[payload.cardType], backImageSrc: cardBackImage, origin, tilt: 7 });
    }
  }

  function rememberDragSource(source: HTMLButtonElement) {
    dragSourceRef.current = source;
  }

  function handleCommitmentCardClick(faction: Faction, source: HTMLButtonElement) {
    if (!canChooseCommitment) {
      inspectCard({ kind: 'commitment', faction });
      return;
    }
    setCommitment(faction);
    setLocalError('');
    castPayload({ kind: 'commitment', faction }, source);
  }

  function handleFactionCardClick(faction: Faction, source: HTMLButtonElement) {
    if (!canChoosePlay) {
      inspectCard({ kind: 'faction', faction });
      return;
    }
    setChosenFaction(faction);
    setLocalError('');
    castPayload({ kind: 'faction', faction }, source);
  }

  function handleFunctionCardClick(card: CardType, source: HTMLButtonElement) {
    if (!canChoosePlay) {
      inspectCard({ kind: 'function', cardType: card });
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
    if (card === 'gamble' && humanPlayer.hasUsedGambleThisGame) {
      setLocalError('賭命每場遊戲最多只能使用 1 次。');
      return;
    }
    if (!canUseCardWithFaction(card, chosenFaction)) {
      setLocalError(`${CARD_LABELS[card]} ${cardRequirementText(card) ?? '不可搭配此陣營'}。`);
      return;
    }
    setSelectedCard(card);
    setLocalError('');
    castPayload({ kind: 'card', cardType: card }, source);
  }

  function handleCommitmentDrop(payload: DragPayload): boolean {
    if (humanPlayer.commitment) {
      setLocalError('本回合已完成承諾。');
      return false;
    }
    if (payload.kind !== 'commitment') {
      setLocalError('請先擲出一枚承諾印記。');
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
      setLocalError('請先打出盟約或叛離陣營牌。');
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
      setLocalError('請選擇一張功能牌打到桌面。');
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
    if (payload.cardType === 'gamble' && humanPlayer.hasUsedGambleThisGame) {
      setLocalError('賭命每場遊戲最多只能使用 1 次。');
      return false;
    }
    if (!canUseCardWithFaction(payload.cardType, chosenFaction)) {
      setLocalError(`${CARD_LABELS[payload.cardType]} ${cardRequirementText(payload.cardType) ?? '不可搭配此陣營'}。`);
      return false;
    }
    setSelectedCard(payload.cardType);
    setLocalError('');
    return true;
  }

  function handleTableDrop(payload: DragPayload, point: DropPoint): boolean {
    let accepted = false;
    if (canChooseCommitment) {
      accepted = handleCommitmentDrop(payload);
    } else if (canChoosePlay) {
      if (payload.kind === 'commitment') {
        setLocalError('承諾已立，現在請打出陣營牌。');
      } else {
        accepted = payload.kind === 'faction' ? handleFactionDrop(payload) : handleCardDrop(payload);
      }
    }
    if (accepted) {
      castPayload(payload, dragSourceRef.current, point);
    }
    dragSourceRef.current = null;
    return accepted;
  }

  function handleCommitment() {
    if (!commitment) {
      setLocalError('請先選擇一枚承諾印記。');
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
      setLocalError(`${CARD_LABELS[selectedCard]} ${cardRequirementText(selectedCard) ?? '不可搭配此陣營'}。`);
      return undefined;
    }
    if (selectedCard === 'gamble' && humanPlayer.hasUsedGambleThisGame) {
      setLocalError('賭命每場遊戲最多只能使用 1 次。');
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

  function handleResolveChaos() {
    if (!pendingChaosTarget) {
      setLocalError('請先選擇 1 名混沌目標。');
      return;
    }
    const result = resolveChaosChoice(gameState, humanPlayer.id, pendingChaosTarget.id);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    setLocalError('');
    onGameStateChange(result.state);
  }

  function renderCommitmentSlot(faction: Faction | '') {
    if (!faction) {
      return undefined;
    }
    return (
      <button className="placed-card placed-card-button token-placed" type="button" onClick={() => inspectCard({ kind: 'commitment', faction })}>
        <CommitmentTokenArt faction={faction} />
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

  function renderTablePieces() {
    const functionPiece = lockedFunctionSelection
      ? lockedFunctionSelection === 'blank'
        ? renderHiddenCardSlot('已暗放', cardBackImage, '空白密令', { kind: 'blankFunction' })
        : renderHiddenCardSlot('已暗放', cardImageByType[lockedFunctionSelection], CARD_LABELS[lockedFunctionSelection], {
            kind: 'function',
            cardType: lockedFunctionSelection
          })
      : undefined;

    return (
      <div className="tribunal-your-table" aria-label="你已打到桌面的牌與印記">
        <div className={`table-cast-landing ${committedFaction ? 'has-piece' : ''}`} data-cast-kind="commitment" ref={commitmentLandingRef}>
          {renderCommitmentSlot(committedFaction)}
        </div>
        <div className={`table-cast-landing ${lockedFaction ? 'has-piece' : ''}`} data-cast-kind="faction" ref={factionLandingRef}>
          {lockedFaction ? renderHiddenCardSlot('已暗放陣營', factionCardImageByFaction[lockedFaction], factionLabels[lockedFaction], { kind: 'faction', faction: lockedFaction }) : null}
        </div>
        <div className={`table-cast-landing ${functionPiece ? 'has-piece' : ''}`} data-cast-kind="card" ref={functionLandingRef}>
          {functionPiece}
        </div>
      </div>
    );
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

  function renderDiscussionStage() {
    const speech = botSpeeches[speechIndex];
    return (
      <section className="phase-playfield discussion-playfield" aria-label="發言階段牌桌">
        {speech ? (
          <article className="speaker-dialogue" key={speech.speakerPlayerId} aria-live="polite">
            <strong>{speech.speakerName}</strong>
            <p>「{speech.line.text}」</p>
            <small>{speechIndex + 1} / {botSpeeches.length}</small>
          </article>
        ) : null}
        <div className="discussion-controls">
          <button type="button" onClick={toggleDiscussionPause} aria-pressed={discussionPaused}>{discussionPaused ? '繼續發言' : '暫停發言'}</button>
          <button type="button" onClick={skipDiscussion}>略過發言</button>
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
              <div className="fate-choice-board">
                <fieldset className="stage-choice-group">
                  <legend>預言類型</legend>
                  <button className={choiceButtonClass(fateKind === 'majority')} type="button" aria-pressed={fateKind === 'majority'} onClick={() => setFateKind('majority')}>
                    勝負預言
                  </button>
                  <button className={choiceButtonClass(fateKind === 'identity')} type="button" aria-pressed={fateKind === 'identity'} onClick={() => setFateKind('identity')}>
                    身分預言
                  </button>
                </fieldset>
                <fieldset className="stage-choice-group">
                  <legend>預言陣營</legend>
                  <button className={choiceButtonClass(fateFaction === 'alliance')} type="button" aria-pressed={fateFaction === 'alliance'} onClick={() => setFateFaction('alliance')}>
                    合作
                  </button>
                  <button className={choiceButtonClass(fateFaction === 'betrayal')} type="button" aria-pressed={fateFaction === 'betrayal'} onClick={() => setFateFaction('betrayal')}>
                    背叛
                  </button>
                </fieldset>
                {fateKind === 'identity' ? (
                  <fieldset className="stage-choice-group stage-choice-group-wide">
                    <legend>指定玩家</legend>
                    {otherPlayers.map((player) => (
                      <button
                        className={choiceButtonClass(targetPlayerId === player.id)}
                        type="button"
                        aria-pressed={targetPlayerId === player.id}
                        key={player.id}
                        onClick={() => setTargetPlayerId(player.id)}
                      >
                        {player.name}
                      </button>
                    ))}
                  </fieldset>
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

  function renderPublicCardsStage() {
    return (
      <section className="phase-playfield public-playfield" aria-label="公開功能牌觸發階段牌桌">
        {renderStageTitle('公開處理列', '公開功能牌依序觸發', publicCardPlayers.length > 0 ? '真理之眼先處理，混沌後處理' : '本回合沒有公開功能牌')}
        {pendingHumanChaos ? (
          <div className="fate-declare-panel">
            <div className="fate-choice-board chaos-choice-board">
              <fieldset className="stage-choice-group stage-choice-group-wide">
                <legend>混沌目標</legend>
                {chaosTargetPlayers.map((player) => (
                  <button
                    className={choiceButtonClass(pendingChaosTarget?.id === player.id)}
                    type="button"
                    aria-pressed={pendingChaosTarget?.id === player.id}
                    key={player.id}
                    onClick={() => setTargetPlayerId(player.id)}
                  >
                    {player.name}
                  </button>
                ))}
              </fieldset>
            </div>
            <div className="peek-resolution-actions">
              <button className="confirm-button" type="button" onClick={handleResolveChaos} disabled={!pendingChaosTarget}>
                確認混沌
              </button>
            </div>
          </div>
        ) : null}
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
                      : playedCard.type === 'chaos'
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

  function renderStageCenter() {
    if (gameState.phase === 'discussion') {
      return renderDiscussionStage();
    }
    if (canDeclareFate && humanPlayer.hand.includes('fate')) {
      return renderFateDeclareStage();
    }
    if (pendingHumanChaos) {
      return renderPublicCardsStage();
    }
    return null;
  }

  function renderPrimaryAction() {
    if (humanPlayer.isEliminated) return null;
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

  const stageCenter = renderStageCenter();

  return (
    <section className={`table-play-area tribunal-play-area phase-${gameState.phase}`} aria-label="中央審判區與你的操作區">
      <DropZone active={canChooseCommitment || canChoosePlay} title="審判牌桌" hint={canChooseCommitment ? '點選印記或拖到桌面立誓' : '點選手牌或拖到桌面出牌'} onDropPayload={handleTableDrop}>
        <div className={`central-judgement-ui alpha-center-stage phase-${gameState.phase}${stageCenter ? ' has-stage-content' : ''}`}>
          {announcementVisible && gameState.phase !== 'resolveJudgment' && gameState.phase !== 'gameEnd' ? (
            <div className="stage-announcement" role="status" aria-atomic="true" key={`${gameState.round}-${gameState.phase}`}>
              <TribunalPlaque>
                <span className="tribunal-plaque-kicker">第 {String(gameState.round).padStart(2, '0')} 回合</span>
                <strong className="tribunal-plaque-title">{PHASE_LABELS[gameState.phase]}</strong>
              </TribunalPlaque>
            </div>
          ) : null}
          {stageCenter ? <div className="stage-decision-surface">{stageCenter}</div> : null}
        </div>
        {renderTablePieces()}
      </DropZone>

      <section className="player-foreground alpha-player-foreground" aria-label="自己的操作區">
        <div className="operation-player self-seat-hud tribunal-self-seat">
          <span className="self-seat-avatar" aria-hidden="true">誓</span>
          <span className="self-name">你的席位</span>
          <strong><b>{humanPlayer.judgmentPoints}</b><span>裁決點</span></strong>
          <small>{handLimitText(humanPlayer)}</small>
          <span className={`self-commitment ${humanPlayer.commitment ?? ''}`}>{humanPlayer.commitment ? `已承諾${factionLabels[humanPlayer.commitment]}` : '尚未立誓'}</span>
        </div>

        <div className="hand-stage alpha-hand-stage" aria-label="自己的手牌">
          <div className="operation-group token-tools hand-cluster alpha-hand-cluster">
            <span className="operation-label">公開承諾</span>
            <div className="operation-card-row token-row">
              {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
                <DraggableCard
                  className={`operation-card operation-token ${canChooseCommitment ? 'is-playable-card' : ''} ${committedFaction === faction ? 'is-on-table' : ''}`}
                  disabled={!canChooseCommitment}
                  imageSrc={commitmentTokenImageByFaction[faction]}
                  key={faction}
                  label={factionLabels[faction]}
                  payload={{ kind: 'commitment', faction }}
                  selected={committedFaction === faction}
                  onClick={(source) => handleCommitmentCardClick(faction, source)}
                  onPickUp={rememberDragSource}
                  onInspect={() => inspectCard({ kind: 'commitment', faction })}
                />
              ))}
            </div>
          </div>

          <div className="operation-group faction-tools hand-cluster alpha-hand-cluster">
            <span className="operation-label">陣營牌</span>
            <div className="operation-card-row">
              {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
                <DraggableCard
                  className={`operation-card faction-action-card ${canChoosePlay ? 'is-playable-card' : ''} ${lockedFaction === faction ? 'is-on-table' : ''}`}
                  disabled={!canChoosePlay}
                  imageSrc={factionCardImageByFaction[faction]}
                  key={faction}
                  label={factionLabels[faction]}
                  payload={{ kind: 'faction', faction }}
                  selected={lockedFaction === faction}
                  onClick={(source) => handleFactionCardClick(faction, source)}
                  onPickUp={rememberDragSource}
                  onInspect={() => inspectCard({ kind: 'faction', faction })}
                />
              ))}
            </div>
          </div>

          <div className="operation-group hand-tools hand-cluster alpha-hand-cluster">
            <span className="operation-label">功能牌手牌</span>
            <div className="operation-card-row hand-fan">
              {humanPlayer.hand.length === 0 ? <span className="muted empty-hand">沒有功能牌</span> : null}
              {humanPlayer.hand.map((card, index) => {
                const isGambleUnavailable = card === 'gamble' && Boolean(humanPlayer.hasUsedGambleThisGame);
                const isPlayable =
                  canChoosePlay && chosenFaction !== '' && card !== 'fate' && !isGambleUnavailable && canUseCardWithFaction(card, chosenFaction);
                const isDisabled = !isPlayable;
                return (
                  <DraggableCard
                    className={`operation-card hand-action-card ${isPlayable ? 'is-playable-card' : ''} ${selectedCard === card ? 'is-on-table' : ''}`}
                    disabled={isDisabled}
                    imageSrc={cardImageByType[card]}
                    key={`${card}-${index}`}
                    label={CARD_LABELS[card]}
                    note={
                      isDisabled && gameState.phase === 'playCards' && !humanPlayer.chosenFaction
                        ? isGambleUnavailable
                          ? '已使用'
                          : chosenFaction
                            ? cardRequirementText(card)
                            : '先選陣營'
                        : undefined
                    }
                    payload={{ kind: 'card', cardType: card }}
                    selected={selectedCard === card}
                    onClick={(source) => handleFunctionCardClick(card, source)}
                    onPickUp={rememberDragSource}
                    onInspect={() => inspectCard({ kind: 'function', cardType: card })}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="operation-actions action-corner alpha-command-stack">
          <span className="command-caption">{humanPlayer.isEliminated ? '觀戰中' : canChooseCommitment ? '立下你的誓言' : canChoosePlay ? '決定你的密令' : ''}</span>
          <button className="secondary-button quiet-button" type="button" onClick={() => { cancelCast(); setSelectedCard(''); }} disabled={Boolean(humanPlayer.chosenFaction) || gameState.phase !== 'playCards'}>
            不使用功能牌
          </button>
          {showBlankOrderPreview ? <p className="blank-order-note">空白密令：本回合不使用功能牌，無效果。</p> : null}
          {renderPrimaryAction()}
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
