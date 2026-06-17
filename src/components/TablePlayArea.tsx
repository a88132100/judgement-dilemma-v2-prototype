import { useEffect, useMemo, useState } from 'react';
import { canUseCardWithFaction } from '../game/cardRules';
import { CARD_LABELS, FACTION_LABELS, PHASE_LABELS } from '../game/constants';
import { advancePhase, completeHumanPlay, submitHumanCommitment } from '../game/stateMachine';
import type { CardType, Faction, FatePrediction, GameState, PlayerState } from '../game/types';
import { cardBackImage, cardImageByType, commitmentTokenImageByFaction, factionCardImageByFaction } from './assetMap';
import { DraggableCard } from './DraggableCard';
import { DropZone } from './DropZone';
import type { DragPayload } from './dragTypes';

interface TablePlayAreaProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
}

type FateKind = 'majority' | 'identity';

const revealPhases = new Set(['reveal', 'resolveJudgment', 'drawCards', 'roundEnd', 'gameEnd']);

export function TablePlayArea({ gameState, onGameStateChange }: TablePlayAreaProps) {
  const human = gameState.players.find((player) => player.isHuman);
  const botPlayers = gameState.players.filter((player) => !player.isHuman);
  const otherPlayers = gameState.players.filter((player) => !player.isHuman && !player.isEliminated);
  const [commitment, setCommitment] = useState<Faction | ''>('');
  const [chosenFaction, setChosenFaction] = useState<Faction | ''>('');
  const [selectedCard, setSelectedCard] = useState<CardType | ''>('');
  const [targetPlayerId, setTargetPlayerId] = useState(otherPlayers[0]?.id ?? '');
  const [fateKind, setFateKind] = useState<FateKind>('majority');
  const [fateFaction, setFateFaction] = useState<Faction>('alliance');
  const [localError, setLocalError] = useState('');

  const uniqueHand = useMemo(() => Array.from(new Set(human?.hand ?? [])), [human?.hand]);
  const handKey = human?.hand.join('|') ?? '';
  const showReveal = revealPhases.has(gameState.phase);

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
      setLocalError(`${CARD_LABELS[selectedCard]} 需要搭配盟約使用。`);
    }
  }, [chosenFaction, selectedCard]);

  if (!human) {
    return null;
  }

  const committedFaction = human.commitment ?? commitment;
  const lockedFaction = human.chosenFaction ?? chosenFaction;
  const lockedCard = human.playedCard?.type ?? selectedCard;

  function handleCommitmentDrop(payload: DragPayload): boolean {
    if (payload.kind !== 'commitment') {
      setLocalError('請把承諾 token 放到承諾槽。');
      return false;
    }
    setCommitment(payload.faction);
    setLocalError('');
    return true;
  }

  function handleFactionDrop(payload: DragPayload): boolean {
    if (payload.kind !== 'faction') {
      setLocalError('請把陣營牌放到陣營暗放槽。');
      return false;
    }
    setChosenFaction(payload.faction);
    setLocalError('');
    return true;
  }

  function handleCardDrop(payload: DragPayload): boolean {
    if (payload.kind !== 'card') {
      setLocalError('請把功能牌放到功能牌暗放槽。');
      return false;
    }
    if (!chosenFaction) {
      setLocalError('請先暗放陣營牌，再放置功能牌。');
      return false;
    }
    if (!canUseCardWithFaction(payload.cardType, chosenFaction)) {
      setLocalError(`${CARD_LABELS[payload.cardType]} 需要搭配盟約使用。`);
      return false;
    }
    setSelectedCard(payload.cardType);
    setLocalError('');
    return true;
  }

  function handleCommitment() {
    if (!commitment) {
      setLocalError('請先把承諾 token 放到承諾槽。');
      return;
    }
    onGameStateChange(submitHumanCommitment(gameState, commitment));
  }

  function handleCompletePlay() {
    if (!chosenFaction) {
      setLocalError('請先把陣營牌放到陣營暗放槽。');
      return;
    }
    const fatePrediction: FatePrediction | undefined =
      selectedCard === 'fate'
        ? fateKind === 'majority'
          ? { kind: 'majority', predictedMajority: fateFaction }
          : { kind: 'identity', targetPlayerId, predictedFaction: fateFaction }
        : undefined;
    const nextState = completeHumanPlay(gameState, {
      chosenFaction,
      card: selectedCard
        ? {
            type: selectedCard,
            targetPlayerId: selectedCard === 'peek' ? targetPlayerId : selectedCard === 'fate' && fateKind === 'identity' ? targetPlayerId : undefined,
            fatePrediction
          }
        : undefined
    });
    onGameStateChange(nextState);
    if (nextState.players.find((player) => player.isHuman)?.chosenFaction) {
      resetCardState();
    }
  }

  function handleAdvance() {
    onGameStateChange(advancePhase(gameState));
  }

  function renderCommitmentSlot(faction: Faction | '') {
    if (!faction) {
      return undefined;
    }
    return (
      <span className="placed-card token-placed">
        <img src={commitmentTokenImageByFaction[faction]} alt="" onError={(event) => event.currentTarget.remove()} />
        <span>已選擇承諾：{FACTION_LABELS[faction]}</span>
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

  function renderBotSeat(player: PlayerState) {
    const botRevealedFaction = showReveal && player.chosenFaction ? player.chosenFaction : undefined;
    const botRevealedCard = showReveal && player.playedCard ? player.playedCard.type : undefined;
    return (
      <span className="bot-seat" key={player.id}>
        <strong>{player.name}</strong>
        <span className="mini-slot">{player.commitment ? renderHiddenCardSlot('已承諾') : '等待承諾'}</span>
        <span className="mini-slot">
          {player.judgedFaction || player.chosenFaction
            ? renderHiddenCardSlot('已暗放陣營', botRevealedFaction ? factionCardImageByFaction[botRevealedFaction] : undefined, botRevealedFaction ? FACTION_LABELS[botRevealedFaction] : undefined)
            : '等待暗放'}
        </span>
        <span className="mini-slot">
          {player.judgedFaction
            ? player.playedCard
              ? renderHiddenCardSlot('已暗放功能牌', botRevealedCard ? cardImageByType[botRevealedCard] : undefined, botRevealedCard ? CARD_LABELS[botRevealedCard] : undefined)
              : '未使用功能牌'
            : '功能牌未定'}
        </span>
      </span>
    );
  }

  return (
    <section className="table-play-area">
      <div className="table-status-bar">
        <div>
          <span className="eyebrow">本回合決策</span>
          <h2>審判桌</h2>
        </div>
        <button className="phase-advance-button" type="button" onClick={handleAdvance} disabled={gameState.phase === 'commitment' && !human.commitment}>
          進入下一階段：{PHASE_LABELS[gameState.phase]}
        </button>
      </div>

      <div className="bot-table-row" aria-label="Bot 暗放卡槽">
        {botPlayers.map(renderBotSeat)}
      </div>

      {gameState.phase === 'commitment' ? (
        <div className="table-phase-grid commitment-layout">
          <div className="drag-source-panel token-source-panel">
            <h3>你的承諾 token</h3>
            <div className="draggable-row">
              {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
                <DraggableCard
                  className="token-drag table-token"
                  imageSrc={commitmentTokenImageByFaction[faction]}
                  key={faction}
                  label={FACTION_LABELS[faction]}
                  payload={{ kind: 'commitment', faction }}
                  selected={commitment === faction}
                  onClick={() => {
                    setCommitment(faction);
                    setLocalError('');
                  }}
                />
              ))}
            </div>
          </div>
          <DropZone className="table-card-slot commitment-slot" title="承諾槽" hint="放置承諾 token" onDropPayload={handleCommitmentDrop}>
            {renderCommitmentSlot(committedFaction)}
          </DropZone>
          <button className="confirm-button" type="button" onClick={handleCommitment} disabled={Boolean(human.commitment) || !commitment}>
            鎖定承諾
          </button>
        </div>
      ) : null}

      {gameState.phase === 'playCards' ? (
        <div className="table-phase-grid play-layout">
          <div className="drag-source-panel faction-source-panel">
            <h3>陣營牌</h3>
            <div className="draggable-row">
              {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
                <DraggableCard
                  imageSrc={factionCardImageByFaction[faction]}
                  key={faction}
                  label={FACTION_LABELS[faction]}
                  payload={{ kind: 'faction', faction }}
                  selected={chosenFaction === faction}
                  onClick={() => {
                    setChosenFaction(faction);
                    setLocalError('');
                  }}
                />
              ))}
            </div>
          </div>

          <div className="table-slots">
            <DropZone className="table-card-slot" title="陣營暗放槽" hint="放置陣營牌" onDropPayload={handleFactionDrop}>
              {lockedFaction
                ? renderHiddenCardSlot('已蓋牌暗放', factionCardImageByFaction[lockedFaction], FACTION_LABELS[lockedFaction])
                : undefined}
            </DropZone>
            <DropZone className="table-card-slot" title="功能牌暗放槽" hint="可空白；放置 1 張功能牌" onDropPayload={handleCardDrop}>
              {lockedCard ? renderHiddenCardSlot('已蓋牌暗放', cardImageByType[lockedCard], CARD_LABELS[lockedCard]) : <span className="drop-zone-hint">未使用功能牌</span>}
            </DropZone>
          </div>

          <div className="drag-source-panel hand-source-panel">
            <h3>你的功能牌</h3>
            <div className="draggable-row">
              {uniqueHand.map((card) => {
                const isDisabled = !chosenFaction || !canUseCardWithFaction(card, chosenFaction);
                return (
                  <DraggableCard
                    disabled={isDisabled}
                    imageSrc={cardImageByType[card]}
                    key={card}
                    label={CARD_LABELS[card]}
                    note={isDisabled ? (chosenFaction ? '不可用' : '先放陣營') : undefined}
                    payload={{ kind: 'card', cardType: card }}
                    selected={selectedCard === card}
                    onClick={() => {
                      if (isDisabled) {
                        setLocalError(chosenFaction ? `${CARD_LABELS[card]} 需要搭配盟約使用。` : '請先暗放陣營牌。');
                        return;
                      }
                      setSelectedCard(card);
                      setLocalError('');
                    }}
                  />
                );
              })}
            </div>
            <button className="secondary-button quiet-button" type="button" onClick={() => setSelectedCard('')} disabled={Boolean(human.chosenFaction)}>
              不使用功能牌
            </button>
          </div>

          {selectedCard === 'peek' || selectedCard === 'fate' ? (
            <label className="table-form-control">
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
          {selectedCard === 'fate' ? (
            <div className="sub-panel table-fate-panel">
              <label>
                預言類型
                <select value={fateKind} onChange={(event) => setFateKind(event.target.value as FateKind)}>
                  <option value="majority">陣營多數</option>
                  <option value="identity">玩家身分</option>
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
          <button className="confirm-button" type="button" onClick={handleCompletePlay} disabled={Boolean(human.chosenFaction) || !chosenFaction}>
            確認暗放
          </button>
        </div>
      ) : null}

      {localError ? <p className="table-error">{localError}</p> : null}
    </section>
  );
}
