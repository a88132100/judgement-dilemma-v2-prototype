import type { CSSProperties } from 'react';
import type { GameState } from '../game/types';
import { ActionPanel } from './ActionPanel';
import { backgroundImages } from './assetMap';
import { EventLog } from './EventLog';
import { HandPanel } from './HandPanel';
import { PhasePanel } from './PhasePanel';
import { PlayerPanel } from './PlayerPanel';
import { SimulatorPanel } from './SimulatorPanel';

interface GameBoardProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  onRestart: () => void;
}

export function GameBoard({ gameState, onGameStateChange, onRestart }: GameBoardProps) {
  const human = gameState.players.find((player) => player.isHuman);
  const judgementTableStyle = { '--judgement-table-bg': `url(${backgroundImages.judgementTable})` } as CSSProperties;

  return (
    <main className="app-shell">
      <section className="top-bar">
        <div>
          <span className="eyebrow">Prototype v0.8</span>
          <h1>審判困境 v2</h1>
          <p>四人心理博弈測試局</p>
        </div>
        <button className="secondary-button" type="button" onClick={onRestart}>
          重新開始
        </button>
      </section>

      <section className="game-table-layout">
        <div className="table-column">
          <section className="player-grid table-edge-seats" aria-label="玩家審判席">
            {gameState.players.map((player) => (
              <PlayerPanel key={player.id} player={player} dealerPlayerId={gameState.dealerPlayerId} phase={gameState.phase} />
            ))}
          </section>

          <section className="judgement-table" style={judgementTableStyle}>
            <div className="judgement-table-overlay">
              <PhasePanel gameState={gameState} />
              <ActionPanel gameState={gameState} onGameStateChange={onGameStateChange} />
            </div>
          </section>

          {human ? <HandPanel player={human} /> : null}
        </div>
        <aside className="right-rail">
          <EventLog events={gameState.eventLog} />
        </aside>
      </section>

      <SimulatorPanel />
    </main>
  );
}
