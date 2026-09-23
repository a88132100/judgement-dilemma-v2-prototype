# CODEX_HANDOFF

## Current Goal

將《審判困境 v2》Web Prototype 推進到 Alpha 驗證階段，優先驗證規則平衡、Bot 決策與玩家理解度。

## Current Phase

Polish / 牌桌與發言修正完成；真理之眼下拉選單可讀性修正通過本機驗收（2026-09-23）。原始素材與遊戲規則保持不變；本次依使用者指示將累積修正同步至 GitHub `origin/main`。

## GitHub Synchronization — 2026-09-23

- 使用者已授權提交與推送目前全部改動：桌緣角色遮擋、跨席位出牌間距、發言銘牌與對話順序、真理之眼下拉選單配色，以及測試與交接文件。
- 同步前本機 `main` 與最新遠端 `origin/main` 一致。沿用既有忽略規則，不納入 `artifacts/`、`dist/`、`node_modules/` 等本機產物。
- 既有驗證涵蓋 136 項測試、10 種尺寸 39 個布局情境、發言／拖曳／查驗流程與正式建置；下列各交付節的「未提交或推送」是當時狀態，已由本次同步取代。
- 本次執行 GitHub 同步；若 Vercel 設有 Git 自動部署，推送可能觸發該流程，尚未驗證線上部署結果。

## Latest Peek Dropdown Fix — 2026-09-23

- 使用者回報真理之眼下拉選項只有反白列看得見。根因是 `global.css` 的 `option` 指定深色文字，原生選單卻沿用深色底。
- `src/styles/global.css`：`select` 明確使用 `color-scheme: dark`；`option` 指定淺色字 `#edf2ef` 與深色底 `#10191c`，保留原生反白與鍵盤操作，未更動目標名單或規則。
- `node artifacts/visual-checks/tribunal-autoflow.cjs peek` 通過：三位可查驗對手完整姓名、未選中選項對比至少 4.5:1、逐一選取、鍵盤切換、确认後鎖定目標、私查結果與後續換陣營流程。實際展開清單截圖 `artifacts/visual-checks/tribunal-autoflow/peek-dropdown-readable.png` 已目視確認三列可讀。
- `npm run build` 通過，JS `index-Co2doCYc.js`、CSS `index-CHV9y30x.css`。本次只有樣式修正，未新增或重跑規則單元測試；開發站 5175 可重新整理驗收，未提交、推送或部署。

## Latest Table Layout And Discussion Fix — 2026-09-22

使用者指出正式站人物像放在桌上、對面的牌與己方桌牌交疊，以及發言銘牌與第一句同時出現導致文字框先下後上；已明確授權修改。

- 根因：880px 高度斷點突然放大人物並將對面牌堆推至 320px，而己方仍採場景高度 51.5%；1920×910 滿桌可重現約 42px 交疊。舊 QA 未量測不同玩家桌牌彼此的旋轉外框；本次補上跨席位、Token 與文字標籤量測。
- `GameBoard.tsx`、`tribunal-board.css`：桌機背景、角色與桌緣遮擋共用 1672×941 美術座標。使用原背景加 SVG 桌緣裁切遮住角色下半身，角色名牌保持在遮擋前方；没有重繪或新增圖片資產。
- 雙方出牌位置共用遠桌緣、牌高與安全間距，移除造成跳位的放大定位；手牌尺寸同時受可用高度限制，牌下標籤縮短距離，牌庫移到右下避開對手牌。Token 維持上一版原圖裁切與大小。
- 761–1180px 中型視窗使用完整桌面比例與至少 900px 可捲動高度，三席牌堆採同列排列。手機仍使用原直向捲動布局；不強行把完整桌面壓縮到矮視窗內。
- `useRoundFlow.ts`、`TablePlayArea.tsx`：發言先顯示 1500ms 銘牌，退場後才顯示第一句並開始每位完整 3500ms 計時。銘牌與發言互斥，第一句不再被標題推低。開啟閱讀視窗與隱藏分頁保留剩餘時間，銘牌動畫同步暫停；略過、重開與卸載清除舊排程。
- `useRoundFlow.test.tsx` 新增 4 項時序回歸。`npm run test`：9 檔 136 項全部通過；`npm run build` 通過，JS `index-DhcljCDd.js`、CSS `index-B8x98T5D.css`。
- `node artifacts/visual-checks/seat-layout-regression.cjs`：10 個尺寸、39 個承諾／公開／揭示／抬手牌情境皆通過，沒有跨區碰撞、水平溢出或執行錯誤。含 1920×879／880／910／1080、1366×768、1181×880、1180×880、1024×768、812×375、375×812。
- `tribunal-autoflow.cjs discussion timer formal fate peek chaos drag layout`：發言、計時、正式入口到第二回合、宿命／真理之眼／混沌、布局皆通過。拖曳腳本原先在銘牌期間就找略過按鈕，補上新的 1500ms 等待後單獨重跑 `drag` 通過；沒有因此改動遊戲邏輯。發言 QA 驗證三句位置相同、銘牌不共存、3500ms 間隔與暫停續讀。
- 正式建置本機預覽 `http://127.0.0.1:5176/` 亦通過 `formal` 完整流程，並確認 1920×910 原角色圖片、SVG 遮擋和打包資產正常；代表畫面 `artifacts/visual-checks/production-layout-fixed.png`。非線上正式站驗收。
- 維持開發預覽 `http://127.0.0.1:5175/`。`src/game/` 與 `src/assets/` 無修改。`DEBUG_HANDOFF.md` 記錄邊界碰撞與驗證假設；QA 產物依既有規則留在忽略的 `artifacts/`。
- 下一步：在本機以使用者實際視窗尺寸試玩並檢視畫面；本次未推送 GitHub 或更新正式站。

## GitHub Synchronization — 2026-09-19

使用者已授權將目前累積改動全部提交並推送至既有 GitHub `origin/main`。本次提交整合 Alpha 規則、牌桌介面、美術、戰報、階段銘牌、原圖 Token 清晰度與相關文件／預覽圖；推送前完整測試為 9 檔 132 項通過。沿用 `.gitignore` 排除 `node_modules/`、`dist/`、`artifacts/` 等本機產物，另忽略 Windows `desktop.ini`。本次同步不代表另行授權部署。

## Latest Token Readability Delivery — 2026-09-19

使用者要求落桌 Token 更清楚，並明確更正「不要重製圖案，我要我原本的，只是幫我變清楚」。後續相關調整須保留原本圖案；本次生成的替代稿完全未套用、未匯入專案。

- 原圖皆為 1088×1088；盟約實際圖案僅 900×927，叛離僅 760×753。原 80px 容器裡，叛離圓面實際約 56px，透明留白使兩種圖案大小不一致。
- 新增 `CommitmentTokenArt.tsx`、`commitment-token.css`：以 CSS 視窗置中原圖、排除透明留白，保留安全邊，僅顯示時套 `contrast(1.06)`。逐像素查核兩種視窗都沒有剪掉任何非透明像素。
- 己方桌面容器 80→92px、對手 68→76px、手機對手 50→58px；去掉對手外緣色光，使用較小的接觸陰影。鍵盤焦點改沿圓形 Token 顯示。
- `DraggableCard.tsx`、`TablePlayArea.tsx`、`TableSeatSlots.tsx` 共用同一原圖視窗；`useCardCast.ts` 複製視窗，保持手上、飛行及落桌的圖案裁切比例。`tribunal-board.css` 明確指定可拖曳 Token 按鈕的原生拖曳樣式，避免全域 reset 導致失效。
- `assetMap.ts` 與 `src/assets/tokens/` 原 PNG 完全未改。SHA-256：盟約 `389E150B214A4AF60D2AC8D77D635F81B1665829637C5836B9BFC2C67D54F38F`；叛離 `5B580CEE1A40D6EC228A67F98A15A6E5F601400D8DBF2AEF351BBF379E6F4FED`。
- `node artifacts/visual-checks/token-readability.cjs` 通過：1366／375 原圖來源、尺寸、無水平溢出、圓形焦點／查看詳情、兩種 Token 飛行與落定視窗一致；無頁面錯誤。獨立保真證據：`artifacts/visual-checks/token-readability/independent-original-audit.json`。
- `tribunal-autoflow.cjs commitment layout drag` 中承諾與四尺寸布局通過；發現的新 Token 拖曳問題經最小事件診斷確認後修正，`tribunal-autoflow.cjs drag` 單獨重跑通過，包含原生承諾／陣營／功能牌拖曳至裁決。先前合併結果保留失敗紀錄，最新拖曳結果為 `results-drag.json`。
- 最後 `npm run build` 通過：JS `index-B_mNgX7w.js`、CSS `index-DWajLRb8.css`。本次僅視覺與拖曳承載，未新增或重跑單元測試，驗證使用對應瀏覽器流程與正式建置。
- 本機入口仍為 `http://127.0.0.1:5175/`。代表畫面：`artifacts/visual-checks/token-readability/betrayal-1366.png`。已完成必要實作與驗收；下一步試玩原圖放大後的辨識度。未提交或回復工作區既有變更。

## Latest Phase Plaque Delivery — 2026-09-16

使用者指出承諾／抽牌提示與背景混淆、公開提示藍框不符美術，並追加要求所有階段套用新設計。本節保留階段銘牌交付，最新 Token 調整以頂部 2026-09-19 記錄為準。

- 新增共用 `src/components/TribunalPlaque.tsx`、`src/styles/tribunal-plaque.css`：完整不透明黑曜石底、青銅切角雙邊線、對稱刻紋與暖金明體標題；裝飾為本地 CSS／SVG，不新增套件或圖片請求。
- `TablePlayArea.tsx`、`tribunal-board.css`：8 個桌面階段提示全部套用銘牌；公開／宿命不再借用父層藍底，決策內容置於獨立深色面板。廣播不攔截點擊或拖曳，沿用 1500ms 移除時間。
- 階段廣播補上回合／階段 key，避免抽牌 → 回合結束 → 承諾等快速銜接沿用已淡出的 CSS 動畫。未改 `useRoundFlow`、階段延遲或核心規則。
- `RoundSettlementDialog.tsx`、`GameResultPanel.tsx`、`round-settlement.css`：戰報、裁決及終局標題使用同一銘牌。保留原標題語義、焦點、明細、閱讀倒數與操作。
- `npm run test`：9 檔 132 項全部通過。`npm run build` 通過，JS `index-97SKfGUs.js`、CSS `index-CHab4t2l.css`。
- `node artifacts/visual-checks/phase-banner-review.cjs`：1366×768／375×812 的 8 階段、戰報、裁決、終局與宿命／混沌操作全部通過；正常動態模式驗證相鄰快速階段重建廣播、透明度恢復及 1500ms 移除。共 24 張截圖，結果在 `artifacts/visual-checks/phase-banner-review/results.json`。
- `node artifacts/visual-checks/tribunal-autoflow.cjs commitment fate peek chaos formal layout drag`：7 組相關回歸通過，包含正式入口到第二回合、4 種布局與原生拖曳。`round-settlement-smoke.cjs` 的 11 組閱讀／焦點／終局檢查也全部通過。無頁面執行錯誤。
- 本機試玩：`http://127.0.0.1:5175/`。代表截圖：`artifacts/visual-checks/phase-banner-review/resolvePublicCards-1366.png`、`drawCards-1366.png`、`report-375.png`。
- 必要實作與驗收已完成，無新增已知阻礙；手機與矮橫向視窗仍沿用垂直捲動。下一步以實際試玩確認提示的閱讀感受。工作區原有變更未回復或提交。

## Latest Battle Report Delivery — 2026-09-16

本節記錄同日較早的戰報交付，最新標題美術以頂部銘牌交付為準。使用者試玩後指出功能牌公開至點數結算太快，批准加入簡單戰報。

### 完成內容

- 畫面流程為「公開功能牌處理 → 揭牌 → 本回合戰報 → 本回合裁決」。同一個原生視窗先列卡圖、使用者、實際目標及生效／未觸發／失效原因，再切到原有分數明細。
- 依功能牌數量提供 4–8 秒閱讀時間；無功能牌時顯示簡短說明 1.5 秒。可「暫停閱讀」或按「查看結算」立即切換；裁決另有完整 8 秒閱讀時間。
- 戰報切換不推進核心階段、不重新裁決或抽取隨機目標。最後一回合也先戰報再裁決，按「查看終局」才顯示勝負。
- 戰報期間不呈現最終分數明細，背景座位的最終點數及淘汰標記暫時隱藏；真理之眼不公開私查目標或陣營，暗牌在揭牌後才出現在戰報。
- 隱藏頁面、外部閱讀與手動暫停保留剩餘時間；Escape 暫停，點背景不關閉。修正焦點在視窗本身／標題時反向 Tab 可能離開視窗的情況。

### 主要檔案與邊界

- `src/game/roundCardReport.ts`、`roundCardReport.test.ts`：由已完成的解析結果建立公開戰報，覆蓋實際效果、失效原因與保密；不重新呼叫解析器或 RNG。
- `src/game/types.ts`、`cardResolver.ts`、`stateMachine.ts`：增加戰報資料及記錄既有宿命／賭命命中結果，原結算順序與數值不變。混沌只描述已施加反轉，不以最終陣營猜測多次反轉的中間狀態。
- `src/components/RoundCardReport.tsx`、`RoundSettlementDialog.tsx`、`GameBoard.tsx`、`src/styles/round-settlement.css`：戰報畫面、分段倒數、閱讀狀態及桌機／手機布局。

### 最終驗證

- `npm run test`：9 個測試檔、132 項全部通過，其中新增 14 項戰報測試。
- `npm run build`：TypeScript 與 Vite 通過；JS `index-C4vSct4g.js`、CSS `index-UGo6lPKL.css`。
- `node artifacts/visual-checks/round-report-smoke.cjs`：9 組戰報驗收通過，涵蓋四張牌、混沌失效、真理之眼保密、無功能牌、暫停、焦點／隱藏頁面／重開、終局、桌機／手機及完整 GameBoard；無頁面錯誤。
- 原有 `tribunal-autoflow.cjs` 的 13 組流程與 `round-settlement-smoke.cjs` 的 11 組裁決檢查皆重新通過。舊腳本已適配先戰報再結算，原有倒數與操作斷言保留。
- `node artifacts/card-report-validation/compare.cjs`：固定種子 9152026 的 100 局逐局完整狀態一致，僅排除新增 `cardReport`；得分、勝者、牌庫、棄牌、紀錄及模擬統計一致。前後各使用 11,609 次 RNG，原 23 檔基準快照 SHA 驗證通過。
- 戰報核心比對證據為 `artifacts/card-report-validation/comparison.json` 與 `after.json`；備份測試使用 `.test.ts.snapshot`，避免 Vitest 誤收。下方「21 個核心檔案不變」只代表 2026-09-15 歷史驗收，不代表此次新增資料的檔案完全未改。
- 戰報截圖與結果：`artifacts/visual-checks/round-report-smoke/`。1366×768、375×812 均無水平溢出，底部按鈕可達；原流程的四種布局也通過。

### 使用與後續

- 本機入口：`http://127.0.0.1:5175/`；直接進桌：`http://127.0.0.1:5175/?preview=alpha-board`。
- 啟動：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort`。
- 可直接試玩一回合，檢查戰報中的牌效說明，使用「暫停閱讀」或「查看結算」。本次必要實作與驗收已完成，後續可依實際閱讀感受微調秒數。
- 未提交或回復工作區既有變更；未變更權宜牌實驗池、遊戲規則或 Bot 策略。

## Latest UI Flow Delivery — 2026-09-15

本節記錄六項介面修改交付；目前版本以頂部 2026-09-16 戰報交付為準。使用者已 review 並批准六項修改後開始實作。

### 完成內容

1. 承諾印記與桌牌放大，依座位與己方桌面分區擺放；空桌沒有框，桌物件與收起的手牌保留間隔。
2. 中央階段提示只顯示 1500ms；常駐大標題、重複揭示小卡與桌心結算列表移除，必要的宿命及公開功能牌決策介面仍可操作。
3. 手牌平時收於桌沿；滑鼠 hover 或鍵盤 focus 只抬起單張。觸控首點展開、再次點選才出牌；查看詳情與確認仍是獨立操作。
4. 移除「推進階段」，依既有九階段自動過場；承諾、出牌、宿命使用、真理之眼兩段決策、混沌目標確認保留。沒有宿命時自動提交不使用，並完成 Bot 宣告。
5. Bot 發言逐句顯示，每句約 3500ms，可暫停或略過。開啟卷宗／牌詳情、等待真理之眼選擇或隱藏頁面時停止自動過場，恢復後沿用剩餘時間；重開、離席與終局清除舊排程。
6. 每回合以 `RoundSettlementDialog` 顯示公開承諾、原始／最終陣營及加扣分原因；預設 8 秒後繼續。暫停查看、展開明細及頁面隱藏會凍結倒數，收合明細後仍待玩家選擇繼續。終局先保留最後裁決，按「查看終局」進入勝負結果。真人先出局時可繼續觀戰，其他 Bot 仍會完成後續回合。

### 修改檔案與流程邊界

- `src/components/GameBoard.tsx`、`ActionPanel.tsx`、`TablePlayArea.tsx`：接入自動過場、閱讀暫停及終局銜接。
- `src/components/DraggableCard.tsx`、`TableSeatSlots.tsx`、`src/styles/tribunal-board.css`：手牌收放、觸控確認、桌物件尺寸與各視窗布局。
- `src/components/useRoundFlow.ts`、`useRoundFlow.test.tsx`：單次階段排程、暫停續時及 StrictMode 回歸測試。
- `src/components/RoundSettlementDialog.tsx`、`src/styles/round-settlement.css`：8 秒裁決視窗、明細、焦點限制與單次繼續出口。
- `src/game/stateMachine.ts`：只將原有 Bot 宿命／出牌邏輯抽為共用 helper，新增 `completeEliminatedHumanTurn` 補齊真人淘汰後尚未完成的 Bot 決策；重複呼叫不會重抽策略或再次使用手牌。既有裁決與補牌函式不改動。
- `src/game/stateMachine.test.ts`：真人淘汰流程及 helper 冪等測試。
- 對照 `artifacts/visual-checks/game-core-baseline.json` 的 23 個檔案，僅 `stateMachine.ts` 與其測試改變；其餘 21 個核心檔案 SHA-256 一致。
- 桌機裁切改用 `overflow: clip`。先前 `overflow: hidden` 容器會被 hover／focus 引發內部捲動至 `scrollTop=48`，讓整張桌面位移；修正後桌面保持固定。手機與矮橫向視窗仍可垂直捲動。
- 桌機左右桌牌堆定位於場景 `top: 66%`；放滿三件暗放物件及揭示後剩下兩件物件時均不碰撞角色名牌。公開解析除混沌目標決策外只顯示短暫階段提示，真理之眼維持獨立私訊選擇。

### 最終驗證

- `npm run test`：8 個測試檔案、118 項全部通過；新增測試涵蓋單次結算／補牌、暫停續時、快速略過、待決策阻擋、重開／終局／卸載及真人淘汰。
- 最新 `npm run build` 通過：JS `index-BhWZY1bd.js`，CSS `index-D6mdv8_j.css`；118 項測試亦於收尾修改後由主代理重新執行通過。
- 最新布局驗收於 1366×768、1920×1080、375×812、812×375 通過；無水平溢出、桌物件與手牌重疊或桌牌與角色名牌碰撞，hover／focus 不會移動桌面。結果：`artifacts/visual-checks/tribunal-autoflow/results-layout.json`。
- `round-settlement-smoke.cjs` 的 11 項裁決視窗檢查通過，包括倒數單次出口、明細／手動／外部／隱藏頁面暫停、重開清除、終局、Escape／Tab 與桌機／手機可達性；結果：`artifacts/visual-checks/round-settlement-smoke/results.json`。
- `node artifacts/visual-checks/tribunal-autoflow.cjs`：最終整合 13 個情境全部通過，無頁面執行錯誤。涵蓋正式入口至第二回合、承諾、宿命、真理之眼、混沌、結算、真人淘汰、重開／隱藏頁面計時、終局、逐句發言、裁決倒數、四種布局及原生拖曳；結果：`artifacts/visual-checks/tribunal-autoflow/results.json`。
- 原生拖曳驗收依實際操作先 hover 等牌面抬起，再取得目前位置拖出。凍結時鐘下直接沿用舊位置的腳本問題已排除，正式拖曳與卡牌限制沒有因此改動。`DEBUG_HANDOFF.md` 的兩項調查均已解決。

### 目前使用方式

- 正式本機入口：`http://127.0.0.1:5175/`；直接進桌：`http://127.0.0.1:5175/?preview=alpha-board`。
- 啟動：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort`。
- 現行瀏覽器驗收：`node artifacts/visual-checks/tribunal-autoflow.cjs` 與 `node artifacts/visual-checks/round-settlement-smoke.cjs`。
- 舊 `tribunal-smoke.cjs`、`tribunal-card-cast.cjs`、`tribunal-responsive.cjs` 是手動推進版本的歷史驗收，尚未適配現在的自動流程，不能用其失敗判定目前版本回歸。
- 本機預覽產物在 `artifacts/visual-checks/tribunal-autoflow/`；這些是 QA 證據，不會被正式遊戲匯入。
- 權宜牌維持既有獨立實驗池；未提交或回復工作區原有變更。本次六項修改已完成，下一步由使用者實際試玩節奏與觸控手感。手機與矮橫向視窗仍採垂直捲動。

## Latest UI Refinement — 2026-09-12

本節記錄 2026-09-12 交付，覆蓋再下一節較早的橢圓肖像／卡槽版本；目前狀態以頂部最新交付為準。使用者要求角色像坐在牌桌旁，承諾和卡牌要像打到桌上，不能放入顯示框。

### 完成內容與檔案

- `PlayerPanel.tsx`、`seatedCharacterAssets.ts`：六位角色改為透明坐姿圖，保留原角色臉孔、服裝、手持牌與椅背；僅在桌沿顯示小名牌、點數、莊家及狀態。
- `src/assets/bots/seated/`：六張 640×640 原創衍生坐姿 PNG。以專案 raw 角色圖作內建 imagegen 參考，經 generate2dsprite 去背及殘留洋紅清理。完整提示詞存於 `docs/ui-references/seated-character-prompts.json`；處理產物在 `artifacts/seated-characters/`。
- `TableSeatSlots.tsx`：只在確實承諾或出牌後顯示實體印記／牌，沒有空槽。空白密令在揭示前仍以同樣牌背保密，揭示後撤去。
- `TablePlayArea.tsx`、`DropZone.tsx`、`DraggableCard.tsx`：整片無框桌面接收拖曳；點選或拖曳後，牌先落桌，再由原有按鈕確認。已上桌的手牌降低亮度，仍能換選及查看。
- `useCardCast.ts`：420ms 飛行與翻背、70ms 落定；快連點、外部狀態更新、重開及卸載會清除動畫。減少動態設定直接落定。陰影必須留在各牌面上，父層 filter 會破壞 preserve-3d 翻背。
- `tribunal-board.css`：直接更新既有新版樣式，調整坐姿、實體桌牌、階段提示及響應尺寸。未新增外部 UI 函式庫。

### 本次驗證

- `npm run test`：7 個測試檔案、108 項通過。
- `npm run build`：TypeScript 與 Vite 通過，最後動畫修正後重新建置；JS `index-DVG7N2r2.js`。
- `node artifacts/visual-checks/tribunal-smoke.cjs`：正式完整回合、宿命、真理之眼、混沌、鏡像、賭命、終局共七個情境通過，55 張截圖，無頁面錯誤或水平溢出。
- `node artifacts/visual-checks/tribunal-card-cast.cjs`：正式 GameBoard/CSS 下九項檢查通過，包括原生拖曳、飛行中核心尚未鎖定、翻背、連點／重開清除、桌牌詳情、減少動態。結果與截圖在 `artifacts/visual-checks/tribunal-card-cast/`。
- `node artifacts/visual-checks/tribunal-responsive.cjs`：1366×768、1440×810、1920×1080、375×812、812×375 全部可選牌與確認；最後樣式更新後重跑通過。手機與矮視窗保留垂直捲動。
- `src/game` 23 個檔案與 `game-core-baseline.json` 的 SHA-256 全數一致，沒有增刪核心檔案。六位角色 ID 與素材對應經核對。

### 使用與後續

- 最新本機預覽為 `http://127.0.0.1:5175/`；直接進桌為 `http://127.0.0.1:5175/?preview=alpha-board`。
- 啟動命令：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort`。舊 5174 程序曾回傳過時 CSS，驗證時先確認服務回傳含 `.seated-character-art` 的新版樣式。
- 代表截圖：`artifacts/visual-checks/tribunal-card-cast/cards-on-table.png`。
- 沒有變更結算、牌庫、Bot 決策、確認節奏或權宜牌實驗池。沒有提交或回復工作區原有變更。
- 下一步可直接試玩取得操作感回饋；本次兩項使用者修正已交付，沒有未完成的必要實作。

## Latest UI Delivery — 2026-09-11

本節為 2026-09-11 介面交付記錄；目前狀態以頂部最新交付為準，以下較早 Alpha 記錄保留作歷史參考。

### 完成內容

- 正式遊戲與 `?preview=alpha-board` 已共用新版四人審判桌，不再分為兩套畫面。
- 新增原創燭光審判庭背景，角色、卡牌、承諾與牌庫維持獨立物件。
- 角色位於上、左、右，手牌在桌沿展開；公開資訊、階段內容與操作各有固定位置。
- 九階段導覽獨立列出宿命；倒數只供思考參考，確認後仍手動推進。
- 點選卡牌直接選取，另用「查看」開啟詳情；承諾與陣營的拖曳落牌驗收通過。
- 事件、回合摘要改為可開啟的卷宗；分數明細可完整捲動。
- 真理之眼與卡牌詳情支援焦點管理；終局可重開或返回主畫面，遮罩會阻擋底層操作。
- 主畫面、六名對手選擇及教學同步黑金樣式。
- 舊樣式整理到 `legacy-ui.css` 的 legacy 層；不再載入 `alpha-board.css`，避免累積覆寫干擾。

### 本次主要檔案

- `src/components/GameBoard.tsx`、`PlayerPanel.tsx`、`TableSeatSlots.tsx`
- `src/components/TablePlayArea.tsx`、`DraggableCard.tsx`
- `src/components/CardDetailPanel.tsx`、`CardEffectOverlay.tsx`、`GameResultPanel.tsx`、`useDialogFocus.ts`
- `src/components/RoundSummaryPanel.tsx`、`TutorialScreen.tsx`（繁中文案）
- `src/styles/legacy-ui.css`、`tribunal-board.css`、`tribunal-lobby.css`、`src/main.tsx`
- `src/assets/backgrounds/bg_tribunal_board_v3.png`
- `docs/tribunal-ui-redesign.md`（含美術提示詞、參考來源、驗收方式）
- `artifacts/visual-checks/`（本機驗收腳本、規則雜湊基準、截圖及 JSON；非正式遊戲資源）

### 驗證結果

- `npm run test`：7 個檔案、108 個測試通過。
- `npm run build`：TypeScript 與 Vite 正式建置通過。
- 瀏覽器：正式入口完成首回合至第二回合；宿命、真理之眼、混沌、鏡像、賭命流程與終局／重開／離席共七個情境通過。
- 真理之眼目標鎖定、私訊不進公共紀錄、暗牌揭示時機及四名玩家分數明細可達性已確認。
- 1366×768、1440×810、1920×1080、375×812、812×375 的選牌／確認通過；無水平溢出或頁面執行錯誤。
- 對局前入口於 1366／375 寬度操作通過，無破圖。
- `src/game/` 共 23 個檔案與本次實作前 SHA-256 全部一致；保留原本未提交的 Alpha 規則成果。

### 目前限制與使用方式

- 角色與卡牌沿用既有灰階美術，新增原創素材只有審判庭場景。
- 手機及矮橫向視窗需要垂直捲動；桌機基準尺寸維持單一畫面。
- 權宜牌仍維持獨立實驗池，這次未改牌庫或開啟實驗玩法。
- 工作區原有大量未提交變更；本次未回復、提交或整理那些既有改動。
- 本機入口：`http://127.0.0.1:5174/`；直接進桌：`http://127.0.0.1:5174/?preview=alpha-board`。
- 若預覽服務未執行，可使用 `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort` 啟動。
- 下一個最安全任務：以新版實際試玩取得畫面與操作感受回饋；核心平衡調整另開範圍。

## Latest Completed Work

- 確認勝利門檻正式鎖定為 11 裁決點數。
- 確認宿命正式作為獨立宣告階段，位於發言階段後、出牌階段前。
- 確認宿命不在公開型功能牌觸發順序中；目前公開型功能牌只解析真理之眼。
- 將專案規則文件中殘留的 12 點勝利門檻修正為 11。
- 新增 `docs/alpha-validation-plan.md`，記錄不碰 UI/美術的 Alpha 驗證計畫。
- 使用者確認先前已完成 1000 局模擬，因此不重新執行 Sprint 1。
- 新增 `docs/playtest-checklist.md`，作為下一階段人工試玩驗證清單。
- 使用者確認真人測試已完成，流程上沒有明顯問題。
- 新增 `docs/playtest-summary-alpha-01.md`，記錄 Alpha 流程測試通過。
- 新增非 UI 的 Bot 發言資料層與測試，支援守信型、投機型、觀望型語氣。
- Bot 發言已接入發言階段 UI；對手座位卡也會顯示人格標籤。
- 新增 Alpha Gate 檢查表與規則調整候選清單。
- 新增 `docs/alpha-freeze-candidate.md`，定義目前可進入 Alpha Freeze Candidate 的規則與驗證基準。
- 新增 `docs/change-split-plan.md`，規劃目前 dirty worktree 後續 review、stage、commit 或 PR 的切分方式。
- 已從 Google Drive 讀取 `審判困境v2` 規則文檔，並新增 `docs/full-card-spec.md` 作為 Alpha 2 完整功能牌規格整理。
- 使用者確認主牌庫暫定 26 張，權宜牌延後，不納入本次實作。
- 已實作主牌庫剩餘功能牌：混沌、鏡像、賭命。
- 混沌已接入公開型功能牌解析順序：真理之眼後處理混沌。
- 混沌會反轉目標最終陣營，並使目標暗放型功能牌失效；若因此導致原本守諾玩家失信，承諾修正為 0。
- 鏡像已接入暗放結算：少數背叛局勢下交換基礎結算；多人鎖定同一背叛者時只一人成功，其餘免疫負基礎結算；鎖定不同背叛者可同時成功。
- 賭命已接入暗放結算：唯一背叛成功 +4，失敗 -2 並隨機棄 1 張手牌，無手牌可棄則本次跳過補牌；每人每場最多使用 1 次。
- Bot 決策、Simulator 指標、分數明細、回合摘要、卡牌說明與最小 UI 接線已支援混沌、鏡像、賭命。
- 新增 Alpha 2A 整體流程回歸測試：混沌完整裁決流程、鏡像完整裁決流程、賭命失敗跳過補牌流程。
- Alpha 2B 權宜牌核心工程完成：六張權宜牌已加入型別、獨立牌池、結算流程、Bot 出牌、分數拆解、simulator 統計與回歸測試；預設主牌庫仍維持 26 張。

## Modified Files That Matter

- `AGENTS.md`
- `MVP_SCOPE.md`
- `docs/alpha-validation-plan.md`
- `docs/playtest-checklist.md`
- `docs/playtest-summary-alpha-01.md`
- `docs/alpha-gate-checklist.md`
- `docs/rule-tuning-candidates.md`
- `docs/alpha-freeze-candidate.md`
- `docs/change-split-plan.md`
- `docs/full-card-spec.md`
- `src/components/assetMap.ts`
- `src/components/cardDetails.ts`
- `src/components/RoundSummaryPanel.tsx`
- `src/components/PlayerPanel.tsx`
- `src/components/TablePlayArea.tsx`
- `src/styles/components.css`
- `src/styles/alpha-board.css`
- `src/game/cardResolver.ts`
- `src/game/cardResolver.test.ts`
- `src/game/cardRules.ts`
- `src/game/constants.ts`
- `src/game/deck.test.ts`
- `src/game/judgmentResolver.ts`
- `src/game/judgmentResolver.test.ts`
- `src/game/log.ts`
- `src/game/rulesConfig.ts`
- `src/game/scoreBreakdown.ts`
- `src/game/simulator.ts`
- `src/game/simulator.test.ts`
- `src/game/stateMachine.ts`
- `src/game/stateMachine.test.ts`
- `src/game/types.ts`
- `src/game/botDecision.ts`
- `src/game/botProfiles.ts`
- `src/game/botSpeech.ts`
- `src/game/botSpeech.test.ts`
- `CODEX_HANDOFF.md`

## Test Commands And Results

- `npm run test`：通過，7 個測試檔、78 個測試全數 passed。
- `npm run build`：通過，Vite production build 成功。
- Bot 發言 UI 接入後，`npm run test`：通過，7 個測試檔、78 個測試全數 passed。
- Bot 發言 UI 接入後，`npm run build`：通過，Vite production build 成功。
- 本機測試入口 `http://127.0.0.1:5174` 回應 200。
- 本輪新增 `docs/full-card-spec.md` 為文件整理，尚未因該文件重跑 test/build。
- Alpha 2A 主牌庫功能牌實作後，`npm run test`：通過，7 個測試檔、93 個測試全數 passed。
- Alpha 2A 主牌庫功能牌實作後，`npm run build`：通過，TypeScript build 與 Vite production build 成功。
- 前景啟動檢查 `npm run dev -- --host 127.0.0.1 --port 5174`：可啟動並顯示 `http://localhost:5174/`；背景啟動在目前 Codex sandbox 中未能保留長駐程序。
- Alpha 2A 新牌 QA 後，`npm run test -- src/game/stateMachine.test.ts src/game/cardResolver.test.ts`：通過，2 個測試檔、50 個測試全數 passed。
- Alpha 2A 新牌 QA 後，`npm run test`：通過，7 個測試檔、96 個測試全數 passed。
- Alpha 2A 新牌 QA 後，`npm run build`：通過，TypeScript build 與 Vite production build 成功。
- Alpha 2B 權宜牌核心工程後，`npm run test -- src/game/cardResolver.test.ts src/game/stateMachine.test.ts src/game/judgmentResolver.test.ts src/game/deck.test.ts src/game/simulator.test.ts`：通過，5 個測試檔、99 個測試全數 passed。
- Alpha 2B 權宜牌核心工程後，`npm run test`：通過，7 個測試檔、108 個測試全數 passed。
- Alpha 2B 權宜牌核心工程後，`npm run build`：通過，TypeScript build 與 Vite production build 成功。

## Known Risks Or Unverified Areas

- 工作區已有其他尚未提交的 UI、Bot、素材變更；本次不回復、不整理那些變更。
- 本次已依使用者回報修改 `src/components/` 與 `src/styles/`，只限 Bot 人格與發言可見化。
- Simulator 核心已存在，但 UI 接入交由另一個對話框處理。
- 1000 局模擬已由使用者確認先前完成；目前未在本次對話重跑。
- 真人測試已由使用者確認流程無明顯問題；本次只記錄高層結論，未補逐局數據。
- Bot 發言已顯示於發言階段，但尚未完成完整人工 UI smoke。
- Alpha Freeze 目前仍是 Candidate，不是 Final；需等 UI/美術線 smoke test 後再正式鎖定。
- Google Drive 規則文檔中主牌庫數量的 31 張已由使用者確認為誤植；目前以 26 張為準。
- 權宜牌核心規則已實作並測試，但仍保留為獨立實驗池；預設 `createDeck()` 仍維持 26 張主牌庫，不混入 60 張權宜牌。
- 權宜牌目前沒有正式美術資產；為了型別與建置完整，asset map 暫時讓六張權宜牌指向既有卡背。
- `人情籌碼` 的真人指定目標 UI 尚未接入；目前核心 resolver 可吃 `targetPlayerId`，Bot 會自動選目標，未指定時 resolver 會從有效玩家中自動挑選。
- `手滑` 與 `雙數玄學` 的額外補牌目前遵守現有手牌上限 3，不突破上限。
- 尚未做瀏覽器人工 smoke test；本輪僅完成單元測試、build，以及前景 dev server 啟動確認。
- 本輪已補自動化整體流程測試，但仍未取代玩家實際在 UI 上驗收混沌指定、鏡像揭示、賭命補牌提示的手感檢查。

## Next Safest Task

下一步建議先決定 Alpha 2B 權宜牌要如何被驗收：若仍不碰 UI/美術，先做 dev-only 啟用方式或 simulator profile；若要讓玩家實際試玩，再接真人出牌/指定目標 UI 與正式權宜牌美術。

---

## 2026-07-31 Alpha 2B Expediency Core Engineering

### Completed

- 新增六張權宜牌 CardType、標籤、公開/暗放分類與解析順序：撿角、信任萬萬稅、人情籌碼、共識、手滑、雙數玄學。
- 預設主牌庫維持 26 張；權宜牌以 `EXPEDIENCY_CARD_COUNTS` 保留為獨立 60 張實驗池。
- 權宜牌核心 resolver 已接入裁決流程：
  - 撿角：使用者 +1。
  - 信任萬萬稅：指定或自動選 1 名失信玩家 -1；混沌豁免者不算失信；無失信玩家則無效。
  - 人情籌碼：目標與使用者最終同陣營時，兩人各 +1。
  - 共識：最終盟約人數 >= 3 時 +1，否則 -1。
  - 手滑：使用者 -1，下一次補牌額外 +1。
  - 雙數玄學：最終叛離人數為偶數時下一次補牌額外 +1；奇數時優先隨機棄手牌，無手牌才 -1。
- `RoundResult`、戰報、分數拆解、回合摘要與 simulator card usage 統計已納入 `expediencyDeltaByPlayerId`。
- Bot 出牌偏好表已補齊新牌，並讓 Bot 可自動選擇人情籌碼目標。
- 未修改 UI 版面與 CSS；只補必要的卡牌說明資料與 asset map 佔位，避免新增 CardType 後編譯失敗。

### Verification

- `npm run test -- src/game/cardResolver.test.ts src/game/stateMachine.test.ts src/game/judgmentResolver.test.ts src/game/deck.test.ts src/game/simulator.test.ts` passed：5 files，99 tests。
- `npm run test` passed：7 files，108 tests。
- `npm run build` passed：TypeScript build 與 Vite production build 完成。

### Known Limits

- 權宜牌尚未混入一般對局牌庫；目前需透過測試、手動塞牌或後續 feature flag 才會進入對局。
- 權宜牌尚無正式美術，六張目前共用卡背作為佔位。
- 真人玩家尚無人情籌碼指定目標 UI；核心邏輯支援目標欄位，UI 可後續再接。

### Next Safest Task

先做一個不碰美術的 Alpha 2B 驗收入口：例如 dev-only 權宜牌實驗模式或 simulator profile，讓 60 張權宜牌可以被明確啟用、測試與比較，而不污染目前 26 張主牌庫基準。

---

## 2026-07-02 Alpha Board Visual Rebuild

### Completed

- 新增 Alpha 對局畫面專用 stylesheet：`src/styles/alpha-board.css`。
- Game Board 改為明確場景層：HUD、背景深度、桌面陰影、桌面 playfield、桌上物件、玩家前景、戰報浮層。
- 以原始 `bg_judgement_table.png` 派生 `bg_judgement_table_alpha.png`，保留原本桌圖紋樣與橢圓構圖，但改成暗色 playfield 用桌面。
- 玩家座位改用 `seat` 圖作為桌邊角色視覺，並新增桌邊暗放牌顯示。
- 手牌與操作區維持裸卡式，集中在玩家前景，不再依賴大型底部面板。
- 右側戰報改成預設小型摘要，可展開，不再壓到右側玩家。

### Verification

- `npm run build` passed.
- `npm run test` passed: 7 files, 78 tests.
- Browser DOM 驗收：
  - 1366x768 CSS viewport：無 vertical scrollbar。
  - 1440x810 CSS viewport：無 vertical scrollbar。
  - 1440x810 右側玩家與戰報安全距離：右側玩家 `x=906..1156`，戰報 `x=1180..1422`。
- in-app browser 截圖輸出會因 DPI 產生重複拼接，因此已另存裁切驗收圖於 `artifacts/visual-checks/alpha-board-css1366-top-left.png`。

### Known Limits

- 目前角色圖仍是灰階 framed portrait，不是 `alpha_target_ui.png` 那種完整彩色立繪，這屬於現有資產限制。
- 桌圖已用原始圖派生暗色版，但因原圖本身是插畫式平面素材，距離示意圖的高細節 3D 桌面仍有美術資產差距。

---

## 2026-07-03 Alpha Preview Composition Pass

### Completed

- 僅修改 `?preview=alpha-board` 的 Alpha preview，正式主遊戲入口未替換。
- 以原始 `bg_judgement_table.png` 產生 preview 專用 `bg_judgement_table_playfield.png`，保留原桌圖花紋並處理白底、透明邊界與暗化桌心。
- `GameBoard` Alpha variant 改用新的 playfield 桌圖，並新增審判庭後景、柱影、桌下陰影、桌緣厚度、桌心裁決紋章、桌邊燈點等場景 hook。
- Alpha HUD 重排為左側 Logo、中段回合/階段/流程、右側牌庫/棄牌與設定區，更接近遊戲 HUD。
- 右側戰報改為「戰鬥日誌」摘要框，使用最近事件列表與 icon 標記。
- Alpha CSS 新增 target composition pass，強化四人圍桌、桌面 playfield、裸卡手牌、操作按鈕與角色座位的黑金審判 UI 語言。

### Verification

- `npm run build` passed.
- In-app browser DOM layout measurement:
  - 1366x768 viewport override: no vertical scrollbar, table image uses `bg_judgement_table_playfield.png`, battle log does not overlap right player, command buttons do not overlap hand.
  - 1440x810 viewport override: no vertical scrollbar, table image uses `bg_judgement_table_playfield.png`, battle log does not overlap right player, command buttons do not overlap hand.

### Known Limits

- 目前仍使用既有角色 seat/placeholder 資產，尚未有與 `alpha_target_ui.png` 同等完成度的正式半身角色框與玩家本人立繪。
- 桌面已轉為 playfield 合成層，但仍不是完整手繪 3D 場景；若要更接近示意圖，需要後續補正式桌面厚度、燈具、地面與 UI 邊框美術資產。
- 自動截圖工具在本機 viewport/DPI 下輸出不穩，這次以 DOM 量測與人工 preview 驗收為主。

### Next Safest Task

請在 `http://127.0.0.1:5174/?preview=alpha-board` 直接人工檢查新版構圖。若方向通過，再把 Alpha preview 整理為正式 Game Board replacement；若仍不夠接近示意圖，下一步優先補正式角色框與桌面美術資產，而不是再微調尺寸。

---

## 2026-07-08 AlphaBoardV2 Preview Layout Pass

### Completed

- 新增 `src/components/TableSeatSlots.tsx`，把對手暗放牌從玩家座位元件拆出，改成由牌桌座標層統一管理。
- `PlayerPanel` 新增 `showTableCards`，Alpha 預覽中只負責角色座位、名稱、裁決點與狀態 icon，不再攜帶暗放牌。
- `GameBoard` 的 Alpha variant 加上 `alpha-board-v2` class，並在桌面層插入 `TableSeatSlots`。
- `src/styles/alpha-board.css` 新增 AlphaBoardV2 覆寫層，建立 HUD、牌桌、對手卡槽、中央階段 UI、手牌、右側戰報的安全區。
- 移除上方玩家座位下方殘留的模糊大底盤，改為薄型落地陰影。
- 保留原始審判桌圖案，改用暗化、陰影、暖金刻痕與環境背景處理來降低白底貼圖感。

### Verification

- `npm run build` passed.
- In-app browser DOM layout measurement:
  - 1366x768 viewport override：上方對手卡槽不與中央階段 UI 相交；中央階段 UI 不與手牌相交；右側玩家不與戰報相交。
  - 1440x810 viewport override：上方對手卡槽不與中央階段 UI 相交；中央階段 UI 不與手牌相交；右側玩家不與戰報相交。
- 已重設 in-app browser viewport override，避免測試尺寸停留在瀏覽器中。

### Known Limits

- 目前仍沿用既有角色圖，已透過座位框與裁切方式接近半身立繪感，但尚未達到 `alpha_target_ui.png` 的正式角色立繪完成度。
- 瀏覽器截圖工具在目前 DPI/viewport 環境會產生拼接重複畫面，因此本輪以 DOM bounding box 量測搭配人工視覺檢查為主。

### Next Safest Task

請在 `http://127.0.0.1:5174/?preview=alpha-board` 人工確認 AlphaBoardV2 的整體方向。若方向通過，下一步再做各階段細部美術與正式替換；若仍覺得與示意圖差距大，下一步應優先補角色框與桌面資產，而不是再微調單一元素位置。

---

## 2026-07-19 Alpha 2A Function Card UI Smoke

### Completed

- 使用 5174 測試網域實機檢查《混沌》《鏡像》《賭命》三張功能牌。
- 確認 `card_chaos.png`、`card_mirror.png`、`card_gamble.png` 在 production build 中都有正確載入，瀏覽器端圖片尺寸為 959x1527。
- 以固定亂數進桌，分別強制起手包含三張牌，驗證可在出牌階段選陣營、選功能牌並按下確認出牌。
- 驗證《混沌》進入公開型功能牌觸發階段後會出現「確認混沌」，選擇目標後可解除待處理狀態。
- 驗證三張牌都能從公開處理推進到揭示階段與裁決點數結算；《賭命》案例因玩家達到 11 點，正確進入遊戲結束。
- 本輪未修改 UI 介面與美術，只做流程驗收、測試與 handoff 更新。

### Verification

- Browser smoke: Chrome / Playwright against `http://127.0.0.1:5174/` passed，沒有 request failed。
- `npm run test -- src/game/stateMachine.test.ts src/game/cardResolver.test.ts` passed：2 files，50 tests。
- `npm run build` passed：TypeScript build 與 Vite production build 完成。
- `http://127.0.0.1:5174/` 回應 200。

### Known Limits

- 這次是 1366x768 Chrome 自動煙測，不取代玩家手動驗收。
- 宿命宣告階段在點「略過宿命宣告」或「不使用」後，仍需再按一次「推進階段」才會進入出牌階段；這符合目前獨立宣告階段流程。
- 權宜牌仍依使用者指示保留到後續階段，未在本輪實作。

### Next Safest Task

請使用 `http://127.0.0.1:5174/` 手動驗收《混沌》《鏡像》《賭命》的出牌、揭示與裁決流程。若通過，下一階段建議進入 Alpha 2B：整理權宜牌規格、補上對應測試，並決定是否先做小規模平衡驗收或直接實作權宜牌。
