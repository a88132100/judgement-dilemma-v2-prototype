import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { OpponentSelectScreen } from './components/OpponentSelectScreen';
import { TitleScreen } from './components/TitleScreen';
import { TutorialScreen } from './components/TutorialScreen';
import { createGame } from './game/createGame';
import { DEFAULT_OPPONENTS, DEFAULT_SELECTED_OPPONENTS, type OpponentMetadata } from './game/opponents';
import type { GameState } from './game/types';

type AppScreen = 'title' | 'opponentSelect' | 'tutorial' | 'game';

const tutorialStorageKey = 'completedTutorial';

function readIsAlphaBoardPreview(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('preview') === 'alpha-board';
  } catch {
    return false;
  }
}

function readCompletedTutorial(): boolean {
  try {
    return window.localStorage.getItem(tutorialStorageKey) === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const isAlphaBoardPreview = readIsAlphaBoardPreview();
  const [screen, setScreen] = useState<AppScreen>('title');
  const [selectedOpponents, setSelectedOpponents] = useState<OpponentMetadata[]>(DEFAULT_SELECTED_OPPONENTS);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [previewGameState, setPreviewGameState] = useState<GameState>(() => createGame(Math.random, { opponents: DEFAULT_SELECTED_OPPONENTS }));
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

  function returnFromPreview() {
    window.location.assign(window.location.pathname);
  }

  function restartPreviewGame() {
    setPreviewGameState(createGame(Math.random, { opponents: DEFAULT_SELECTED_OPPONENTS }));
  }

  function completeTutorial() {
    setCompletedTutorial(true);
    try {
      window.localStorage.setItem(tutorialStorageKey, 'true');
    } catch {
      // 瀏覽器若封鎖儲存，至少讓本次 App session 不再顯示首次提示。
    }
  }

  if (isAlphaBoardPreview) {
    return (
      <GameBoard
        gameState={previewGameState}
        onGameStateChange={setPreviewGameState}
        onRestart={restartPreviewGame}
        onBackToTitle={returnFromPreview}
        variant="alpha"
      />
    );
  }

  if (screen === 'title') {
    return <TitleScreen completedTutorial={completedTutorial} onStart={() => setScreen('opponentSelect')} onStartTutorial={() => setScreen('tutorial')} />;
  }

  if (screen === 'opponentSelect') {
    return (
      <OpponentSelectScreen
        initialSelectedOpponents={selectedOpponents}
        opponents={DEFAULT_OPPONENTS}
        onBack={() => setScreen('title')}
        onStart={startGame}
      />
    );
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
