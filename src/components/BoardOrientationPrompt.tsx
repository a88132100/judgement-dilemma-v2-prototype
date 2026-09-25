import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export function BoardOrientationPrompt({ open, onExit }: { open: boolean; onExit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  return createPortal(
    <dialog ref={dialog} className="board-orientation-prompt" role="dialog" aria-labelledby={titleId} onCancel={(event) => event.preventDefault()}>
      <svg viewBox="0 0 120 90" width="120" height="90" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="27" y="23" width="72" height="43" rx="6" /><path d="M88 39v11M29 10C12 14 8 33 13 47m-7-7 7 9 8-8M97 78c17-5 22-22 17-37m-7 6 7-9 6 9" />
      </svg>
      <p className="orientation-eyebrow">審判困境</p>
      <h2 id={titleId}>請將手機橫放</h2>
      <p>橫向才能同時看清對手、承諾與手牌。<br />若畫面沒有轉動，請先關閉裝置的方向鎖定。</p>
      <p className="orientation-status">對局已暫停，橫放後會自動繼續。<br />使用電腦時，可加寬瀏覽器視窗。</p>
      <button type="button" onClick={onExit}>回到主畫面</button>
    </dialog>, document.body
  );
}
