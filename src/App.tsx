import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { OpponentSelectScreen } from './components/OpponentSelectScreen';
import { TitleScreen } from './components/TitleScreen';
import { createGame } from './game/createGame';
import { DEFAULT_OPPONENTS, type OpponentMetadata } from './game/opponents';
import type { GameState } from './game/types';

type AppScreen = 'title' | 'opponentSelect' | 'game';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('title');
  const [selectedOpponents, setSelectedOpponents] = useState<OpponentMetadata[]>(DEFAULT_OPPONENTS);
  const [gameState, setGameState] = useState<GameState | null>(null);

  function startGame(opponents: OpponentMetadata[]) {
    setSelectedOpponents(opponents);
    setGameState(createGame(Math.random, { opponents }));
    setScreen('game');
  }

  function restartGame() {
    setGameState(createGame(Math.random, { opponents: selectedOpponents }));
  }

  function returnToTitle() {
    setGameState(null);
    setScreen('title');
  }

  if (screen === 'title') {
    return <TitleScreen onStart={() => setScreen('opponentSelect')} />;
  }

  if (screen === 'opponentSelect') {
    return <OpponentSelectScreen opponents={selectedOpponents} onBack={() => setScreen('title')} onStart={startGame} />;
  }

  if (!gameState) {
    return <TitleScreen onStart={() => setScreen('opponentSelect')} />;
  }

  return (
    <GameBoard
      gameState={gameState}
      onGameStateChange={setGameState}
      onRestart={restartGame}
      onBackToTitle={returnToTitle}
    />
  );
}
