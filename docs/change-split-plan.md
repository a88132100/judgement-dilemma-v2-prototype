# 變更切分計畫

## 目的

目前工作區同時包含規則文件、Bot 資料、UI、styles 與素材變更。此文件用來規劃後續 review、stage、commit 或 PR 的切分方式。

本文件只提供切分建議，不代表已執行 `git add`、commit 或 PR。

## 原則

- 不使用 `git add .`。
- 每一批變更都要能說明單一目的。
- UI/美術變更與規則文件變更分開審。
- Freeze 前每批至少執行一次必要檢查。
- 不回復目前工作區中既有變更，除非使用者明確要求。

## 建議切分

### 1. 規則與 Alpha 驗證文件

目的：鎖定 Alpha 規則基準、驗證狀態與下一階段 Gate。

建議納入：

- `AGENTS.md`
- `MVP_SCOPE.md`
- `CODEX_HANDOFF.md`
- `docs/alpha-validation-plan.md`
- `docs/playtest-checklist.md`
- `docs/playtest-summary-alpha-01.md`
- `docs/alpha-gate-checklist.md`
- `docs/rule-tuning-candidates.md`
- `docs/alpha-freeze-candidate.md`
- `docs/change-split-plan.md`

檢查方式：

- 確認 11 點勝利門檻沒有回到 12。
- 確認宿命仍是獨立宣告階段。
- 確認此批沒有混入 UI、styles 或 assets。

### 2. Bot 人格與發言資料層

目的：保留非 UI 的 Bot 行為與發言資料，供後續 UI 接入。

建議納入：

- `src/game/botProfiles.ts`
- `src/game/botProfiles.test.ts`
- `src/game/botSpeech.ts`
- `src/game/botSpeech.test.ts`
- `src/game/botDecision.ts`
- `src/game/createGame.ts`
- `src/game/opponents.ts`
- `src/game/types.ts`

檢查方式：

- `npm run test`
- 確認 Bot 發言不洩漏 hidden faction。
- 確認 Bot 邏輯仍位於 `src/game/`，沒有放進 React components。

### 3. UI 與 Alpha 對局畫面

目的：整理另一條工作線的畫面、版面與互動呈現。

建議納入：

- `src/App.tsx`
- `src/main.tsx`
- `src/components/GameBoard.tsx`
- `src/components/OpponentSelectScreen.tsx`
- `src/components/PlayerPanel.tsx`
- `src/components/TablePlayArea.tsx`
- `src/components/assetMap.ts`
- `src/styles/components.css`
- `src/styles/alpha-board.css`

檢查方式：

- `npm run build`
- 桌面尺寸 smoke test。
- 小螢幕 smoke test。
- 確認核心流程仍可完成一局。

備註：此批屬於 UI/美術線，不在本次非 UI 任務中修改。

### 4. 素材與 UI 參考

目的：整理圖片素材、參考圖與取代舊 avatar 的資產。

建議納入：

- `src/assets/backgrounds/bg_judgement_table_alpha.png`
- `src/assets/bots/avatar/`
- `src/assets/bots/profile/`
- `src/assets/bots/raw/`
- `src/assets/bots/seat/`
- `docs/ui-references/`
- 已刪除的舊 avatar 檔案：
  - `src/assets/bots/avatar_allen_oathkeeper.png`
  - `src/assets/bots/avatar_knox_observer.png`
  - `src/assets/bots/avatar_vera_oathbreaker.png`

檢查方式：

- 確認所有被引用的素材路徑存在。
- 確認 production build 不出現 asset missing。
- Freeze 前再決定是否壓縮素材；目前不作為 Alpha 阻塞項。

### 5. Freeze 驗證批

目的：在前面批次都整理後，做一次總驗證。

建議檢查：

- `git status --short`
- `npm run test`
- `npm run build`
- 一局人工 smoke test。
- 更新 `CODEX_HANDOFF.md`。

## 建議順序

1. 先審規則與 Alpha 驗證文件。
2. 再審 Bot 人格與發言資料層。
3. 等 UI/美術線完成後，審 UI 與素材。
4. 最後做 Freeze 驗證批。

## 不建議現在做的事

- 不要把所有 dirty files 合成單一提交。
- 不要在未確認 UI/美術線狀態前鎖定 Alpha Freeze Final。
- 不要因為準備 freeze 而加入新卡牌或新規則。
- 不要在沒有新數據時調整 11 點勝利門檻或基礎結算值。
