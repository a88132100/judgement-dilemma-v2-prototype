import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { OpponentSelectScreen } from './components/OpponentSelectScreen';
import { TitleScreen } from './components/TitleScreen';
import { TutorialScreen } from './components/TutorialScreen';
import { createGame } from './game/createGame';
import { DEFAULT_OPPONENTS, type OpponentMetadata } from './game/opponents';
import type { GameState } from './game/types';

type AppScreen = 'title' | 'opponentSelect' | 'tutorial' | 'game';

const tutorialStorageKey = 'completedTutorial';

function readCompletedTutorial(): boolean {
  try {
    return window.localStorage.getItem(tutorialStorageKey) === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('title');
  const [selectedOpponents, setSelectedOpponents] = useState<OpponentMetadata[]>(DEFAULT_OPPONENTS);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [completedTutorial, setCompletedTutorial] = useState<boolean>(() => readCompletedTutorial());

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

  function completeTutorial() {
    setCompletedTutorial(true);
    try {
      window.localStorage.setItem(tutorialStorageKey, 'true');
    } catch {
      // 瀏覽器若封鎖儲存，至少讓本次 App session 不再顯示首次提示。
    }
  }

  if (screen === 'title') {
    return <TitleScreen completedTutorial={completedTutorial} onStart={() => setScreen('opponentSelect')} onStartTutorial={() => setScreen('tutorial')} />;
  }

  if (screen === 'opponentSelect') {
    return <OpponentSelectScreen opponents={selectedOpponents} onBack={() => setScreen('title')} onStart={startGame} />;
  }

  if (screen === 'tutorial') {
    return (
      <TutorialScreen
        onBackToTitle={returnToTitle}
        onComplete={completeTutorial}
        onStartGame={() => {
          completeTutorial();
          setScreen('opponentSelect');
        }}
      />
    );
  }

  if (!gameState) {
    return <TitleScreen completedTutorial={completedTutorial} onStart={() => setScreen('opponentSelect')} onStartTutorial={() => setScreen('tutorial')} />;
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
