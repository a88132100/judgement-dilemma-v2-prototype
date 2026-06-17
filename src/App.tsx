import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { createGame } from './game/createGame';
import type { GameState } from './game/types';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => createGame());

  return (
    <GameBoard
      gameState={gameState}
      onGameStateChange={setGameState}
      onRestart={() => setGameState(createGame())}
    />
  );
}
