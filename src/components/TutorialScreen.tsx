import { useMemo, useState, type CSSProperties } from 'react';
import {
  applyRoundResult,
  buildFinalRoundResult,
  getRoundSituation,
  resolveBaseJudgment,
  resolveCommitmentDelta
} from '../game/judgmentResolver';
import { BASELINE_RULES_CONFIG } from '../game/rulesConfig';
import { buildScoreBreakdown, roundSituationLabels, signed } from '../game/scoreBreakdown';
import type { Faction, GameState, PlayedCard, PlayerState, RoundResult } from '../game/types';
import { backgroundImages, cardImageByType, commitmentTokenImageByFaction, factionCardImageByFaction } from './assetMap';
import { ScoreBreakdownPanel } from './ScoreBreakdownPanel';

interface TutorialScreenProps {
  onBackToTitle: () => void;
  onComplete: () => void;
  onStartGame: () => void;
}

type TutorialStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface TutorialState {
  step: TutorialStep;
  players: PlayerState[];
  log: string[];
  selectedSpeech?: string;
  inspectedTargetId?: string;
  peekResult?: Faction;
  isSwitchingFaction?: boolean;
  result?: RoundResult;
  resolvedPlayers?: PlayerState[];
  selectedScorePlayerId?: string;
}

const factionLabels: Record<Faction, string> = {
  alliance: '盟約',
  betrayal: '叛離'
};

const commitmentLabels: Record<Faction, string> = {
  alliance: '合作',
  betrayal: '背叛'
};

const aiScript: Record<string, { commitment: Faction; faction: Faction }> = {
  'tutorial-ai-1': { commitment: 'alliance', faction: 'alliance' },
  'tutorial-ai-2': { commitment: 'alliance', faction: 'betrayal' },
  'tutorial-ai-3': { commitment: 'betrayal', faction: 'betrayal' },
  'tutorial-ai-4': { commitment: 'alliance', faction: 'alliance' }
};

const speechOptions = [
  '我這回合會合作，大家一起拿分。',
  '我不相信你們，我可能會背叛。',
  '我先觀察，不保證。'
];

const tutorialCopy: Record<TutorialStep, { title: string; body: string }> = {
  0: {
    title: '新手教學',
    body: '歡迎進入新手教學。這不是正式對局，而是一場用來理解規則的訓練。'
  },
  1: {
    title: '承諾階段',
    body: '每回合開始，你必須先公開承諾自己打算合作或背叛。守諾會在結算時 +1，失信會 -1。'
  },
  2: {
    title: '發言階段',
    body: '發言階段用來說服、威脅或誤導其他玩家。你說出口的話，未必等於你真正會出的牌。'
  },
  3: {
    title: '真正出牌',
    body: '現在選擇你真正要執行的陣營。你可以守諾，也可以失信。'
  },
  4: {
    title: '真理之眼',
    body: '真理之眼會在所有玩家暗放完陣營牌後、翻牌前指定 1 位其他玩家，偷看其本回合面前的陣營選擇卡。'
  },
  5: {
    title: '揭示階段',
    body: '現在揭示所有玩家的實際陣營。注意：真正影響結算的是最終判定陣營。'
  },
  6: {
    title: '局勢判定',
    body: '先看本回合陣營分布，再判定局勢名稱。基礎結算會沿用正式遊戲邏輯。'
  },
  7: {
    title: '基礎結算',
    body: '每位玩家會先依照本回合局勢與最終陣營取得基礎加扣分。'
  },
  8: {
    title: '承諾獎懲',
    body: '基礎結算後，再依照公開承諾與最終陣營是否一致，計算守諾或失信修正。'
  },
  9: {
    title: '最終結果',
    body: '現在把基礎結算、功能牌修正與承諾修正加總。點擊任一玩家可查看加扣分明細。'
  },
  10: {
    title: '教學完成',
    body: '你已完成新手教學。正式對局會加入更多功能牌、反制與心理博弈。'
  }
};

function createTutorialPlayer(id: string, name: string, isHuman: boolean, hand: PlayerState['hand'] = []): PlayerState {
  return {
    id,
    name,
    isHuman,
    judgmentPoints: BASELINE_RULES_CONFIG.startingJudgmentPoints,
    isEliminated: false,
    hand,
    hasPlayedCardThisRound: false
  };
}

function createInitialTutorialState(): TutorialState {
  return {
    step: 0,
    players: [
      createTutorialPlayer('tutorial-human', '你', true, ['peek']),
      createTutorialPlayer('tutorial-ai-1', 'AI 1', false),
      createTutorialPlayer('tutorial-ai-2', 'AI 2', false),
      createTutorialPlayer('tutorial-ai-3', 'AI 3', false),
      createTutorialPlayer('tutorial-ai-4', 'AI 4', false)
    ],
    log: ['新手教學已建立：5 位玩家，起始裁決點數皆為 6。'],
    selectedScorePlayerId: 'tutorial-human'
  };
}

function zeroDeltas(playerIds: string[]): Record<string, number> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));
}

function tutorialGameState(players: PlayerState[], log: string[]): GameState {
  return {
    players,
    round: 1,
    maxRounds: 1,
    phase: 'resolveJudgment',
    dealerPlayerId: players[0].id,
    deck: [],
    discardPile: [],
    eventLog: log,
    roundResults: []
  };
}

function resolveTutorialRound(players: PlayerState[], log: string[]): { result: RoundResult; resolvedPlayers: PlayerState[]; log: string[] } {
  const state = tutorialGameState(players, log);
  const situation = getRoundSituation(players);
  const baseDeltaByPlayerId = resolveBaseJudgment(players, situation, BASELINE_RULES_CONFIG);
  const emptyDeltas = zeroDeltas(situation.validPlayerIds);
  const commitmentDeltaByPlayerId = resolveCommitmentDelta(players, situation, BASELINE_RULES_CONFIG);
  const result = buildFinalRoundResult({
    state,
    situation,
    baseDeltaByPlayerId,
    adjustedBaseDeltaByPlayerId: baseDeltaByPlayerId,
    shieldDeltaByPlayerId: emptyDeltas,
    counterDeltaByPlayerId: emptyDeltas,
    fateDeltaByPlayerId: emptyDeltas,
    commitmentDeltaByPlayerId
  });
  const resolved = applyRoundResult(state, result, BASELINE_RULES_CONFIG);
  return {
    result,
    resolvedPlayers: resolved.players,
    log: resolved.eventLog
  };
}

function updateHuman(players: PlayerState[], update: (player: PlayerState) => PlayerState): PlayerState[] {
  return players.map((player) => (player.isHuman ? update(player) : player));
}

function truthEyePlayedCard(userPlayerId: string, targetPlayerId: string): PlayedCard {
  return {
    type: 'peek',
    userPlayerId,
    targetPlayerId,
    isPublic: true
  };
}

export function TutorialScreen({ onBackToTitle, onComplete, onStartGame }: TutorialScreenProps) {
  const [state, setState] = useState<TutorialState>(() => createInitialTutorialState());
  const screenStyle = { '--trial-room-bg': `url(${backgroundImages.trialRoom})` } as CSSProperties;
  const activePlayers = state.resolvedPlayers ?? state.players;
  const human = state.players.find((player) => player.isHuman);
  const aiPlayers = state.players.filter((player) => !player.isHuman);
  const selectedScorePlayer = activePlayers.find((player) => player.id === state.selectedScorePlayerId) ?? activePlayers[0];
  const selectedBreakdown = state.result && selectedScorePlayer ? buildScoreBreakdown(selectedScorePlayer, state.result) : undefined;
  const inspectedTarget = aiPlayers.find((player) => player.id === state.inspectedTargetId);
  const currentCopy = tutorialCopy[state.step];

  const scoreBreakdowns = useMemo(() => {
    if (!state.result) {
      return [];
    }
    return activePlayers.map((player) => buildScoreBreakdown(player, state.result as RoundResult));
  }, [activePlayers, state.result]);

  function completeTutorial() {
    onComplete();
    setState((current) => ({ ...current, step: 10 }));
  }

  function skipTutorial() {
    onComplete();
    onBackToTitle();
  }

  function restartTutorial() {
    setState(createInitialTutorialState());
  }

  function chooseCommitment(faction: Faction) {
    const players = state.players.map((player) => {
      if (player.isHuman) {
        return { ...player, commitment: faction };
      }
      const script = aiScript[player.id];
      return script ? { ...player, commitment: script.commitment } : player;
    });
    setState({
      ...state,
      step: 2,
      players,
      log: [
        ...state.log,
        `你承諾本回合選擇${commitmentLabels[faction]}。`,
        ...players
          .filter((player) => !player.isHuman)
          .map((player) => `${player.name} 承諾選擇${commitmentLabels[player.commitment ?? 'alliance']}。`)
      ]
    });
  }

  function chooseSpeech(text: string) {
    setState({
      ...state,
      step: 3,
      selectedSpeech: text,
      log: [...state.log, `你發言：「${text}」`]
    });
  }

  function chooseFaction(faction: Faction) {
    const players = state.players.map((player) => {
      if (player.isHuman) {
        return { ...player, chosenFaction: faction, judgedFaction: faction };
      }
      const script = aiScript[player.id];
      return script ? { ...player, chosenFaction: script.faction, judgedFaction: script.faction } : player;
    });
    setState({
      ...state,
      step: 4,
      players,
      log: [...state.log, '所有玩家已暗放陣營牌。你可以在翻牌前使用真理之眼。']
    });
  }

  function inspectTarget(playerId: string) {
    const target = state.players.find((player) => player.id === playerId);
    if (!target?.chosenFaction) {
      return;
    }
    setState({
      ...state,
      inspectedTargetId: playerId,
      peekResult: target.chosenFaction,
      isSwitchingFaction: false
    });
  }

  function completeTruthEye(shouldSwitch: boolean, nextFaction?: Faction) {
    if (!human || !state.inspectedTargetId) {
      return;
    }
    const players = updateHuman(state.players, (player) => ({
      ...player,
      chosenFaction: nextFaction ?? player.chosenFaction,
      judgedFaction: nextFaction ?? player.judgedFaction,
      playedCard: truthEyePlayedCard(player.id, state.inspectedTargetId as string),
      hand: player.hand.filter((card, index) => card !== 'peek' || index !== player.hand.indexOf('peek')),
      hasPlayedCardThisRound: true,
      hasResolvedPeek: true,
      hasChangedFactionByPeek: shouldSwitch
    }));
    setState({
      ...state,
      step: 5,
      players,
      isSwitchingFaction: false,
      log: [
        ...state.log,
        '你使用真理之眼指定 1 名玩家。',
        shouldSwitch ? '你已重新選擇陣營。' : '你保持目前陣營。'
      ]
    });
  }

  function revealAndResolve() {
    const resolved = resolveTutorialRound(state.players, [...state.log, '所有玩家揭示陣營牌，開始判定局勢。']);
    setState({
      ...state,
      step: 6,
      result: resolved.result,
      resolvedPlayers: resolved.resolvedPlayers,
      log: resolved.log,
      selectedScorePlayerId: human?.id ?? 'tutorial-human'
    });
  }

  function goToStep(step: TutorialStep) {
    setState({ ...state, step });
  }

  function renderFactionButtons(onChoose: (faction: Faction) => void, disabled = false) {
    return (
      <div className="tutorial-choice-row">
        {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
          <button className="tutorial-card-button" type="button" key={faction} onClick={() => onChoose(faction)} disabled={disabled}>
            <img src={factionCardImageByFaction[faction]} alt="" onError={(event) => event.currentTarget.remove()} />
            <span>{factionLabels[faction]}</span>
          </button>
        ))}
      </div>
    );
  }

  function renderCommitments() {
    return (
      <div className="tutorial-player-grid" aria-label="承諾結果">
        {activePlayers.map((player) => (
          <article className={player.isHuman ? 'tutorial-player-card is-human' : 'tutorial-player-card'} key={player.id}>
            <strong>{player.name}</strong>
            <span>{player.commitment ? `承諾${commitmentLabels[player.commitment]}` : '尚未承諾'}</span>
            {player.commitment ? <img src={commitmentTokenImageByFaction[player.commitment]} alt="" onError={(event) => event.currentTarget.remove()} /> : null}
          </article>
        ))}
      </div>
    );
  }

  function renderRevealList() {
    return (
      <div className="tutorial-player-grid" aria-label="揭示結果">
        {activePlayers.map((player) => (
          <article className={player.isHuman ? 'tutorial-player-card is-human' : 'tutorial-player-card'} key={player.id}>
            <strong>{player.name}</strong>
            <span>承諾：{player.commitment ? commitmentLabels[player.commitment] : '未記錄'}</span>
            <img src={player.judgedFaction ? factionCardImageByFaction[player.judgedFaction] : factionCardImageByFaction.alliance} alt="" onError={(event) => event.currentTarget.remove()} />
            <span>最終判定：{player.judgedFaction ? factionLabels[player.judgedFaction] : '未出牌'}</span>
          </article>
        ))}
      </div>
    );
  }

  function renderStepContent() {
    if (state.step === 0) {
      return (
        <div className="tutorial-actions">
          <button className="entry-primary-button" type="button" onClick={() => goToStep(1)}>
            開始教學
          </button>
        </div>
      );
    }

    if (state.step === 1) {
      return (
        <section className="tutorial-focus is-tutorial-highlight">
          <h2>選擇你的公開承諾</h2>
          <div className="tutorial-choice-row">
            {(['alliance', 'betrayal'] as Faction[]).map((faction) => (
              <button className="tutorial-token-button" type="button" key={faction} onClick={() => chooseCommitment(faction)}>
                <img src={commitmentTokenImageByFaction[faction]} alt="" onError={(event) => event.currentTarget.remove()} />
                <span>承諾{commitmentLabels[faction]}</span>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (state.step === 2) {
      return (
        <section className="tutorial-focus">
          <h2>選擇一句發言範例</h2>
          <div className="tutorial-speech-list">
            {speechOptions.map((text) => (
              <button type="button" key={text} onClick={() => chooseSpeech(text)}>
                {text}
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (state.step === 3) {
      return (
        <section className="tutorial-focus is-tutorial-highlight">
          <h2>選擇真正陣營</h2>
          {renderFactionButtons(chooseFaction)}
        </section>
      );
    }

    if (state.step === 4) {
      return (
        <section className="tutorial-focus truth-eye-tutorial">
          <div className="tutorial-card-teach">
            <img src={cardImageByType.peek} alt="" onError={(event) => event.currentTarget.remove()} />
            <div>
              <h2>真理之眼</h2>
              <p>類型：公開型</p>
              <p>觸發時機：所有玩家暗放完陣營牌後、翻牌前。</p>
              <p>效果：指定 1 位其他玩家，偷看其本回合面前那張陣營選擇卡內容。</p>
            </div>
          </div>

          <div className="tutorial-target-grid" aria-label="真理之眼目標">
            {aiPlayers.map((player) => (
              <button
                className={state.inspectedTargetId === player.id ? 'is-selected' : ''}
                type="button"
                key={player.id}
                onClick={() => inspectTarget(player.id)}
                disabled={state.isSwitchingFaction}
              >
                {player.name}
              </button>
            ))}
          </div>

          {inspectedTarget && state.peekResult ? (
            <div className="tutorial-private-result">
              <strong>只有你看到：</strong>
              <span>
                {inspectedTarget.name} 本回合暗放了【{factionLabels[state.peekResult]}】。
              </span>
            </div>
          ) : null}

          {inspectedTarget && !state.isSwitchingFaction ? (
            <div className="tutorial-choice-row">
              <button className="secondary-button" type="button" onClick={() => completeTruthEye(false)}>
                保持目前選擇
              </button>
              <button className="confirm-button" type="button" onClick={() => setState({ ...state, isSwitchingFaction: true })}>
                重新選擇陣營
              </button>
            </div>
          ) : null}

          {state.isSwitchingFaction ? (
            <div className="tutorial-switch-box">
              <h3>重新選擇你的陣營</h3>
              {renderFactionButtons((faction) => completeTruthEye(true, faction))}
            </div>
          ) : null}
        </section>
      );
    }

    if (state.step === 5) {
      return (
        <section className="tutorial-focus">
          {renderRevealList()}
          <div className="tutorial-actions">
            <button className="confirm-button" type="button" onClick={revealAndResolve}>
              判定局勢
            </button>
          </div>
        </section>
      );
    }

    if (state.step === 6 && state.result) {
      return (
        <section className="tutorial-focus">
          <div className="tutorial-situation-card">
            <span>本回合陣營分布</span>
            <strong>
              合作：{state.result.situation.allianceCount} 人 / 背叛：{state.result.situation.betrayalCount} 人
            </strong>
            <h2>{roundSituationLabels[state.result.situation.resultType]}</h2>
          </div>
          <div className="tutorial-actions">
            <button className="confirm-button" type="button" onClick={() => goToStep(7)}>
              查看基礎結算
            </button>
          </div>
        </section>
      );
    }

    if (state.step === 7 && state.result) {
      return (
        <section className="tutorial-focus">
          <div className="tutorial-table-wrap">
            <table className="tutorial-breakdown-table">
              <thead>
                <tr>
                  <th>玩家</th>
                  <th>陣營</th>
                  <th>基礎結果</th>
                  <th>原因</th>
                </tr>
              </thead>
              <tbody>
                {scoreBreakdowns.map((breakdown) => (
                  <tr key={breakdown.playerId}>
                    <td>{breakdown.playerName}</td>
                    <td>{factionLabels[breakdown.judgedFaction]}</td>
                    <td>{signed(breakdown.baseScoreDelta)}</td>
                    <td>{breakdown.baseScoreReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tutorial-actions">
            <button className="confirm-button" type="button" onClick={() => goToStep(8)}>
              查看承諾獎懲
            </button>
          </div>
        </section>
      );
    }

    if (state.step === 8 && state.result) {
      return (
        <section className="tutorial-focus">
          <div className="tutorial-table-wrap">
            <table className="tutorial-breakdown-table">
              <thead>
                <tr>
                  <th>玩家</th>
                  <th>承諾 / 實際</th>
                  <th>修正</th>
                  <th>原因</th>
                </tr>
              </thead>
              <tbody>
                {scoreBreakdowns.map((breakdown) => {
                  const player = activePlayers.find((candidate) => candidate.id === breakdown.playerId);
                  return (
                    <tr key={breakdown.playerId}>
                      <td>{breakdown.playerName}</td>
                      <td>
                        {player?.commitment ? commitmentLabels[player.commitment] : '未記錄'} / {factionLabels[breakdown.judgedFaction]}
                      </td>
                      <td>{signed(breakdown.promiseDelta)}</td>
                      <td>{breakdown.promiseReason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="tutorial-actions">
            <button className="confirm-button" type="button" onClick={() => goToStep(9)}>
              查看最終結果
            </button>
          </div>
        </section>
      );
    }

    if (state.step === 9 && state.result) {
      return (
        <section className="tutorial-focus tutorial-score-stage">
          <div className="tutorial-score-list" aria-label="最終裁決點數">
            {scoreBreakdowns.map((breakdown) => (
              <button
                className={breakdown.playerId === state.selectedScorePlayerId ? 'tutorial-score-row is-selected' : 'tutorial-score-row'}
                type="button"
                key={breakdown.playerId}
                onClick={() => setState({ ...state, selectedScorePlayerId: breakdown.playerId })}
              >
                <strong>{breakdown.playerName}</strong>
                <span>起始：{breakdown.startingScore}</span>
                <span>基礎：{signed(breakdown.baseScoreDelta)}</span>
                <span>守諾 / 失信：{signed(breakdown.promiseDelta)}</span>
                <em className={breakdown.finalDelta >= 0 ? 'positive-delta' : 'negative-delta'}>
                  最終：{breakdown.finalScore}
                </em>
              </button>
            ))}
          </div>
          {selectedBreakdown ? <ScoreBreakdownPanel breakdown={selectedBreakdown} /> : null}
          <div className="tutorial-actions">
            <button className="confirm-button" type="button" onClick={completeTutorial}>
              完成教學
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="tutorial-focus">
        <div className="tutorial-actions">
          <button className="entry-primary-button" type="button" onClick={onStartGame}>
            開始正式審判
          </button>
          <button className="secondary-button" type="button" onClick={onBackToTitle}>
            回到主畫面
          </button>
          <button className="secondary-button" type="button" onClick={restartTutorial}>
            再玩一次新手教學
          </button>
        </div>
      </section>
    );
  }

  return (
    <main className="entry-shell tutorial-screen" style={screenStyle}>
      <section className="tutorial-shell">
        <header className="tutorial-header">
          <div>
            <span className="eyebrow">Tutorial Mode</span>
            <h1>新手教學</h1>
          </div>
          <button className="secondary-button" type="button" onClick={skipTutorial}>
            跳過教學
          </button>
        </header>

        <section className="tutorial-overlay-card" aria-live="polite">
          <span>Step {state.step} / 10</span>
          <h2>{currentCopy.title}</h2>
          <p>{currentCopy.body}</p>
        </section>

        <div className="tutorial-layout">
          <section className="tutorial-main-panel">{renderStepContent()}</section>
          <aside className="tutorial-side-panel">
            <section className="tutorial-mini-panel">
              <h2>承諾狀態</h2>
              {renderCommitments()}
            </section>
            <section className="tutorial-mini-panel">
              <h2>戰報 / 發言紀錄</h2>
              <ol className="tutorial-log">
                {state.log.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
