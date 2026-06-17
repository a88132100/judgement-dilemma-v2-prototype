import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { canUseCardWithFaction } from '../game/cardRules';
import { CARD_LABELS, PHASE_LABELS } from '../game/constants';
import { advancePhase, completeHumanPlay, submitHumanCommitment, validateHumanPlay } from '../game/stateMachine';
import type { CardType, Faction, FatePrediction, GameState, HumanPlayInput, PlayerState, RoundPhase } from '../game/types';
import { cardBackImage, cardImageByType, commitmentTokenImageByFaction, factionCardImageByFaction } from './assetMap';
import { DraggableCard } from './DraggableCard';
import { DropZone } from './DropZone';
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
  const [localError, setLocalError] = useState('');
  const handKey = human?.hand.join('|') ?? '';
  const showReveal = revealPhases.has(gameState.phase);
  const currentRoundResult = gameState.roundResults.find((result) => result.round === gameState.round);
  const latestRoundResult = currentRoundResult ?? gameState.roundResults.at(-1);

  function resetCardState() {
    setChosenFaction('');
    setSelectedCard('');
    setTargetPlayerId(otherPlayers[0]?.id ?? '');
    setFateKind('majority');
    setFateFaction('alliance');
    setLocalError('');
  }

  useEffect(() => {
    setCommitment('');
    resetCardState();
  }, [gameState.round, gameState.phase, handKey, human?.chosenFaction, human?.commitment]);

  useEffect(() => {
    if (!targetPlayerId || !otherPlayers.some((player) => player.id === targetPlayerId)) {
      setTargetPlayerId(otherPlayers[0]?.id ?? '');
    }
  }, [otherPlayers, targetPlayerId]);

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
  const committedFaction = humanPlayer.commitment ?? commitment;
  const lockedFaction = humanPlayer.chosenFaction ?? chosenFaction;
  const lockedCard = humanPlayer.playedCard?.type ?? selectedCard;
  const humanCommitmentLabel = humanPlayer.commitment ? `承諾：${factionLabels[humanPlayer.commitment]}` : '尚未承諾';
  const humanPlayLabel = humanPlayer.chosenFaction ? '已暗放陣營' : '等待出牌';
  const humanFunctionLabel = humanPlayer.playedCard ? `功能牌：${CARD_LABELS[humanPlayer.playedCard.type]}` : '功能牌：未使用';
  const canAdvance =
    gameState.phase !== 'gameEnd' &&
    !(gameState.phase === 'commitment' && !humanPlayer.commitment) &&
    !(gameState.phase === 'playCards' && !humanPlayer.chosenFaction);

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
    if (selectedCard === 'peek' && !targetPlayerId) {
      setLocalError('窺探需要指定一名目標玩家。');
      return undefined;
    }
    if (selectedCard === 'fate' && fateKind === 'identity' && !targetPlayerId) {
      setLocalError('宿命的玩家身分預言需要指定目標玩家。');
      return undefined;
    }

    const fatePrediction: FatePrediction | undefined =
      selectedCard === 'fate'
        ? fateKind === 'majority'
          ? { kind: 'majority', predictedMajority: fateFaction }
          : { kind: 'identity', targetPlayerId, predictedFaction: fateFaction }
        : undefined;

    return {
      chosenFaction,
      card: selectedCard
        ? {
            type: selectedCard,
            targetPlayerId: selectedCard === 'peek' ? targetPlayerId : selectedCard === 'fate' && fateKind === 'identity' ? targetPlayerId : undefined,
            fatePrediction
          }
        : undefined
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

  function handleAdvance() {
    if (gameState.phase === 'gameEnd') {
      return;
    }
    if (gameState.phase === 'commitment' && !humanPlayer.commitment) {
      setLocalError('請先確認本回合承諾。');
      return;
    }
    if (gameState.phase === 'playCards' && !humanPlayer.chosenFaction) {
      setLocalError('請先確認本回合出牌。');
      return;
    }
    setLocalError('');
    onGameStateChange(advancePhase(gameState));
  }

  function renderCommitmentSlot(faction: Faction | '') {
    if (!faction) {
      return undefined;
    }
    return (
      <span className="placed-card token-placed">
        <img src={commitmentTokenImageByFaction[faction]} alt="" onError={(event) => event.currentTarget.remove()} />
        <span>承諾：{factionLabels[faction]}</span>
      </span>
    );
  }

  function renderHiddenCardSlot(label: string, faceImage?: string, faceLabel?: string) {
    return (
      <span className="placed-card">
        <img src={showReveal && faceImage ? faceImage : cardBackImage} alt="" onError={(event) => event.currentTarget.remove()} />
        <span>{showReveal && faceLabel ? faceLabel : label}</span>
      </span>
    );
  }

  function renderStaticSlot(title: string, hint: string, children?: ReactNode) {
    return (
      <section className="drop-zone table-card-slot is-static">
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
        <DropZone className="table-token-slot" title="你的承諾 token" hint="拖曳一枚承諾 token" onDropPayload={handleCommitmentDrop}>
          {content}
        </DropZone>
      );
    }

    return renderStaticSlot('你的承諾 token', '等待承諾', content);
  }

  function renderFactionZone() {
    const content = lockedFaction ? renderHiddenCardSlot('已暗放', factionCardImageByFaction[lockedFaction], factionLabels[lockedFaction]) : undefined;

    if (gameState.phase === 'playCards' && !humanPlayer.chosenFaction) {
      return (
        <DropZone className="table-card-slot" title="陣營牌放置區" hint="拖曳盟約或叛離牌" onDropPayload={handleFactionDrop}>
          {content}
        </DropZone>
      );
    }

    return renderStaticSlot('陣營牌放置區', '等待暗放陣營', content);
  }

  function renderFunctionZone() {
    const content = lockedCard ? renderHiddenCardSlot('已伏置', cardImageByType[lockedCard], CARD_LABELS[lockedCard]) : undefined;

    if (gameState.phase === 'playCards' && !humanPlayer.chosenFaction) {
      return (
        <DropZone className="table-card-slot" title="功能牌觸發區" hint="可選擇 1 張功能牌" onDropPayload={handleCardDrop}>
          {content}
        </DropZone>
      );
    }

    return renderStaticSlot('功能牌觸發區', '本回合未使用功能牌', content);
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

        <div className="judgement-zone-grid">
          <section className="table-zone commitment-zone" aria-label="承諾 token 放置區">
            <div className="table-zone-heading">
              <span>承諾 token</span>
              <strong>公開承諾</strong>
            </div>
            <div className="commitment-token-track">{gameState.players.map(renderCommitmentMarker)}</div>
            {renderCommitmentZone()}
          </section>

          <section className="table-zone card-zone" aria-label="陣營牌與功能牌放置區">
            <div className="table-zone-heading">
              <span>中央審判區</span>
              <strong>暗放與觸發</strong>
            </div>
            <div className="table-slots">
              {renderFactionZone()}
              {renderFunctionZone()}
            </div>
          </section>

          <section className="table-zone verdict-zone" aria-label="本回合裁決結果">
            <div className="table-zone-heading">
              <span>{currentRoundResult ? '本回合裁決' : latestRoundResult ? `第 ${latestRoundResult.round} 回合裁決` : '裁決結果'}</span>
              <strong>{latestRoundResult ? situationLabels[latestRoundResult.situation.resultType] : '等待揭示'}</strong>
            </div>
            <p>{latestRoundResult ? latestRoundResult.summary : '承諾、陣營與功能牌都會在這張桌上留下痕跡。'}</p>
          </section>
        </div>
      </div>

      <section className="operation-dock" aria-label="自己的操作區">
        <div className="operation-player">
          <span>你的席位</span>
          <strong>{humanPlayer.judgmentPoints} 裁決點</strong>
          <small>{handLimitText(humanPlayer)}</small>
          <small>{humanCommitmentLabel}</small>
          <small>{humanPlayLabel}</small>
          <small>{humanFunctionLabel}</small>
        </div>

        <div className="operation-group token-tools">
          <span className="operation-label">承諾 token</span>
          <div className="operation-card-row token-row">
            {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
              <DraggableCard
                className="operation-card operation-token"
                disabled={Boolean(humanPlayer.commitment) || gameState.phase !== 'commitment'}
                imageSrc={commitmentTokenImageByFaction[faction]}
                key={faction}
                label={factionLabels[faction]}
                payload={{ kind: 'commitment', faction }}
                selected={committedFaction === faction}
                onClick={() => {
                  setCommitment(faction);
                  setLocalError('');
                }}
              />
            ))}
          </div>
        </div>

        <div className="operation-group faction-tools">
          <span className="operation-label">陣營牌</span>
          <div className="operation-card-row">
            {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
              <DraggableCard
                className="operation-card faction-action-card"
                disabled={Boolean(humanPlayer.chosenFaction) || gameState.phase !== 'playCards'}
                imageSrc={factionCardImageByFaction[faction]}
                key={faction}
                label={factionLabels[faction]}
                payload={{ kind: 'faction', faction }}
                selected={lockedFaction === faction}
                onClick={() => {
                  setChosenFaction(faction);
                  setLocalError('');
                }}
              />
            ))}
          </div>
        </div>

        <div className="operation-group hand-tools">
          <span className="operation-label">功能牌手牌</span>
          <div className="operation-card-row hand-fan">
            {humanPlayer.hand.length === 0 ? <span className="muted empty-hand">沒有功能牌</span> : null}
            {humanPlayer.hand.map((card, index) => {
              const isDisabled = Boolean(humanPlayer.chosenFaction) || gameState.phase !== 'playCards' || !chosenFaction || !canUseCardWithFaction(card, chosenFaction);
              return (
                <DraggableCard
                  className="operation-card hand-action-card"
                  disabled={isDisabled}
                  imageSrc={cardImageByType[card]}
                  key={`${card}-${index}`}
                  label={CARD_LABELS[card]}
                  note={isDisabled && gameState.phase === 'playCards' && !humanPlayer.chosenFaction ? (chosenFaction ? '需搭配盟約' : '先選陣營') : undefined}
                  payload={{ kind: 'card', cardType: card }}
                  selected={selectedCard === card}
                  onClick={() => {
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
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="operation-actions">
          {(selectedCard === 'peek' || selectedCard === 'fate') && !humanPlayer.chosenFaction ? (
            <label className="operation-select">
              目標玩家
              <select value={targetPlayerId} onChange={(event) => setTargetPlayerId(event.target.value)}>
                {otherPlayers.map((player) => (
                  <option value={player.id} key={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {selectedCard === 'fate' && !humanPlayer.chosenFaction ? (
            <div className="operation-options">
              <label>
                預言類型
                <select value={fateKind} onChange={(event) => setFateKind(event.target.value as FateKind)}>
                  <option value="majority">多數陣營</option>
                  <option value="identity">指定玩家</option>
                </select>
              </label>
              <label>
                預言陣營
                <select value={fateFaction} onChange={(event) => setFateFaction(event.target.value as Faction)}>
                  <option value="alliance">盟約</option>
                  <option value="betrayal">叛離</option>
                </select>
              </label>
            </div>
          ) : null}
          <button className="secondary-button quiet-button" type="button" onClick={() => setSelectedCard('')} disabled={Boolean(humanPlayer.chosenFaction) || gameState.phase !== 'playCards'}>
            不使用功能牌
          </button>
          {renderPrimaryAction()}
          <button className="phase-advance-button" type="button" onClick={handleAdvance} disabled={!canAdvance}>
            推進階段
          </button>
          {localError ? <p className="table-error">{localError}</p> : null}
        </div>
      </section>
    </section>
  );
}
