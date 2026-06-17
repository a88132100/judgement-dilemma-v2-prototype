import type { GameState } from '../game/types';
import { TablePlayArea } from './TablePlayArea';

interface ActionPanelProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
}

export function ActionPanel(props: ActionPanelProps) {
  return <TablePlayArea {...props} />;
}
