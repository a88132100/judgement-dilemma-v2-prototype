import { useCallback, useEffect, useRef } from 'react';
import type { DropPoint } from './DropZone';

interface CardCast {
  source: HTMLElement | null;
  destination: HTMLElement | null;
  imageSrc: string;
  backImageSrc?: string;
  origin?: DropPoint;
  tilt: number;
}

// 只處理手牌到桌面的視覺位移；落牌與確認仍由原本的介面及規則流程決定。
export function useCardCast(resetKey: object) {
  const cleanupRef = useRef<() => void>(() => {});

  const cancelCast = useCallback(() => {
    cleanupRef.current();
    cleanupRef.current = () => {};
  }, []);

  useEffect(() => cancelCast, [resetKey, cancelCast]);

  const castCard = useCallback(({ source, destination, imageSrc, backImageSrc, origin, tilt }: CardCast) => {
    cancelCast();
    if (!destination || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const sourceRect = source?.querySelector('.commitment-token-art, img')?.getBoundingClientRect() ?? source?.getBoundingClientRect();
    if (!sourceRect && !origin) {
      return;
    }

    // 等候選牌的 React 更新，取得真正落定牌面的尺寸，而不是空白落點尺寸。
    const frame = requestAnimationFrame(() => {
      if (!destination.isConnected) {
        return;
      }
      const piece = destination.querySelector<HTMLElement>('.placed-card');
      const landedImage = piece?.querySelector<HTMLElement>('.commitment-token-art, img');
      const destinationRect = landedImage?.getBoundingClientRect() ?? destination.getBoundingClientRect();
      const width = landedImage?.offsetWidth || Math.min(destinationRect.width, 92);
      const height = landedImage?.offsetHeight || Math.min(destinationRect.height, 128);
      if (!width || !height) {
        return;
      }

      const startX = origin?.clientX ?? (sourceRect!.left + sourceRect!.width / 2);
      const startY = origin?.clientY ?? (sourceRect!.top + sourceRect!.height / 2);
      const endX = destinationRect.left + destinationRect.width / 2;
      const endY = destinationRect.top + destinationRect.height / 2;
      const startScale = sourceRect ? Math.min(sourceRect.width / width, 2.5) : 1.3;
      const flight = document.createElement('div');
      flight.className = 'tribunal-card-flight';
      flight.setAttribute('aria-hidden', 'true');
      Object.assign(flight.style, {
        position: 'fixed', left: '0', top: '0', width: `${width}px`, height: `${height}px`,
        pointerEvents: 'none', zIndex: '100', transformStyle: 'preserve-3d', willChange: 'transform'
      });

      const tokenArt = landedImage?.classList.contains('commitment-token-art') ? landedImage : undefined;
      const front = tokenArt ? tokenArt.cloneNode(true) as HTMLElement : document.createElement('img');
      if (front instanceof HTMLImageElement) front.src = imageSrc;
      // 陰影放在各牌面，避免父層 filter 將 3D 牌面壓平而無法翻背。
      Object.assign(front.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'contain',
        backfaceVisibility: 'hidden', filter: 'drop-shadow(0 15px 12px #0009)'
      });
      flight.append(front);
      if (backImageSrc) {
        const back = front.cloneNode() as HTMLImageElement;
        back.src = backImageSrc;
        back.style.transform = 'rotateY(180deg)';
        flight.append(back);
      }

      const previousVisibility = piece?.style.visibility ?? '';
      if (piece) {
        piece.style.visibility = 'hidden';
      }
      destination.classList.add('is-casting');
      document.body.append(flight);
      const flip = backImageSrc ? 180 : 0;
      const transform = (x: number, y: number, scale: number, angle: number, turn: number) =>
        `translate3d(${x - width / 2}px, ${y - height / 2}px, 0) perspective(700px) rotate(${angle}deg) rotateY(${turn}deg) scale(${scale})`;
      const animation = flight.animate([
        { transform: transform(startX, startY, startScale, -tilt, 0), offset: 0 },
        { transform: transform(startX + (endX - startX) * 0.46, startY + (endY - startY) * 0.46 - 58, Math.max(startScale, 1.15), tilt * 0.4, flip * 0.42), offset: 0.42 },
        { transform: transform(endX, endY - 8, 1.06, tilt, flip), offset: 0.82 },
        { transform: transform(endX, endY, 1, tilt, flip), offset: 1 }
      ], { duration: 420, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'forwards' });

      const clean = () => {
        animation.cancel();
        flight.remove();
        destination.classList.remove('is-casting');
        if (piece) {
          piece.style.visibility = previousVisibility;
        }
      };
      cleanupRef.current = clean;
      animation.onfinish = () => {
        clean();
        cleanupRef.current = () => {};
        if (piece?.isConnected) {
          const restingTransform = getComputedStyle(piece).transform;
          const landing = piece.animate([
            { transform: `${restingTransform === 'none' ? '' : restingTransform} scale(1.025)` },
            { transform: restingTransform }
          ], { duration: 70, easing: 'ease-out' });
          cleanupRef.current = () => landing.cancel();
        }
      };
    });
    cleanupRef.current = () => cancelAnimationFrame(frame);
  }, [cancelCast]);

  return { castCard, cancelCast };
}
