import { useSyncExternalStore } from 'react';

const queries = [
  '(any-pointer: coarse)',
  '(hover: none)',
  '(max-width: 1180px)',
  '(max-width: 760px)',
  '(max-height: 600px)',
  '(orientation: portrait)'
];

function subscribe(onChange: () => void) {
  const media = queries.map((query) => window.matchMedia(query));
  media.forEach((query) => query.addEventListener('change', onChange));
  return () => media.forEach((query) => query.removeEventListener('change', onChange));
}

function snapshot() {
  const [coarse, noHover, medium, narrow, short, portrait] = queries.map((query) => window.matchMedia(query).matches);
  const touch = coarse || noHover;
  // 同時考慮可用空間及輸入方式；不以瀏覽器名稱猜測裝置，也不重建對局。
  const compact = narrow || (medium && touch) || short;
  return `${compact ? portrait ? 'portrait' : 'compact' : 'desktop'}:${touch ? 'touch' : 'mouse'}`;
}

export function useBoardViewport() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 'desktop:mouse');
  const [layout, input] = value.split(':');
  return { layout, input, needsLandscape: layout === 'portrait' };
}
