import { useEffect, useRef } from 'react';

const focusableSelector = 'button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(isOpen: boolean, onEscape?: () => void) {
  const dialogRef = useRef<HTMLElement>(null);
  const escapeHandlerRef = useRef(onEscape);

  useEffect(() => {
    escapeHandlerRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const focusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0
      );

    // 浮層開啟時移入焦點，避免鍵盤仍操作被遮住的牌桌。
    (focusableElements()[0] ?? dialog).focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const activeDialog = activeElement instanceof Element ? activeElement.closest('[role="dialog"]') : null;
      if (activeDialog && activeDialog !== dialog) {
        return;
      }

      if (event.key === 'Escape' && escapeHandlerRef.current) {
        event.preventDefault();
        event.stopPropagation();
        escapeHandlerRef.current();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const focusIsOutside = !(activeElement instanceof HTMLElement) || !elements.includes(activeElement);
      if (focusIsOutside || (event.shiftKey && activeElement === first) || (!event.shiftKey && activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 關閉後回到原本卡牌或操作按鈕；已離場的節點不再接收焦點。
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  return dialogRef;
}
