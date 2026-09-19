# 審判困境：審判庭介面重設計

## 設計目標

以四人圍桌的卡牌遊戲構圖強化承諾與背叛的氣氛。公開資訊放在角色座位，中央以實體印記與桌牌為主，階段提示短暫出現；手牌收於桌沿，玩家查看某張牌時才抬起。揭牌後先以簡單戰報說明功能牌效果，再於同一個可暫停視窗顯示裁決點數。

本次以開始實作時的工作區為規則基準，不回復既有 Alpha 2A／2B 成果、不開啟額外實驗牌池。核心檔案雜湊記錄在 `artifacts/visual-checks/game-core-baseline.json`。2026-09-15 只新增真人淘汰後繼續觀戰所需的 Bot 決策補齊入口，判定、點數、卡牌效果及牌庫不變。

## 最新狀態：原圖 Token 清晰度（2026-09-19）

使用者明確要求保留原本的盟約／叛離圖案，不使用重新製作的版本。原始兩張 PNG 與素材對應未修改。

- `CommitmentTokenArt` 共用 CSS 顯示視窗，排除兩張原圖不同的透明留白，統一圖案佔比並保留全部非透明像素。圖案本身與紋路不重繪；顯示時僅提高 6% 對比。
- 己方 Token 顯示框 92px、桌機對手 76px、手機對手 58px；去掉外圈光暈，保留接觸陰影與原來的傾斜。鍵盤焦點沿圓形外緣呈現。
- 手牌、己方與對手桌面共用原圖視窗，拋出動畫複製同樣視窗。原生拖曳明確由可拖曳按鈕接手，確認承諾及遊戲規則不變。
- 原圖 SHA 與逐像素裁切查核、桌機／手機截圖、飛行檢查均通過；承諾、四種布局及修正後的原生拖曳至裁決皆通過。
- 最新建置：JS `index-B_mNgX7w.js`、CSS `index-DWajLRb8.css`。證據在 `artifacts/visual-checks/token-readability/`；使用 `node artifacts/visual-checks/token-readability.cjs` 重現。

## 全階段審判銘牌交付（2026-09-16）

承諾、發言、宿命、出牌、公開功能牌、揭示、抽牌、回合結束共用完整銘牌，戰報、裁決與終局也沿用同一標題美術。

- 黑曜石深底完整遮住背景，配合青銅切角邊框、內側刻線、對稱幾何紋飾、暖金明體字；移除只在公開／宿命階段出現的舊藍框。
- 所有標題由 `TribunalPlaque.tsx` 與 `tribunal-plaque.css` 共用，沒有加入外部素材或套件。宿命／混沌的決策另有獨立底板，廣播本身不攔截操作。
- 提示依回合／階段建立新節點，快速過場也會重新進場，維持原本 1500ms 移除與減少動態設定。各階段延遲、戰報／結算閱讀時間及規則皆不變。
- 132 項測試與正式建置通過；最新 JS `index-97SKfGUs.js`、CSS `index-CHab4t2l.css`。
- `phase-banner-review.cjs`：桌機／手機全階段及三種結果標題通過，24 張截圖，並驗證快速連續階段不繼承透明狀態、長標題不溢出、操作可達。
- 7 組相關自動流程回歸與 11 組裁決視窗檢查通過；包括正常入口到第二回合、原生拖曳、1366×768／1920×1080／375×812／812×375 布局。

## 功能牌戰報交付（2026-09-16）

使用者試玩後批准在功能牌解析與分數展示之間加入戰報，已完成並通過驗收。流程為「公開功能牌處理 → 揭牌 → 本回合戰報 → 本回合裁決」，維持現有牌桌與自動流程。

- 戰報採原有黑金視窗，以卡圖、使用者、實際目標及簡短效果說明呈現每張已使用功能牌；未觸發或遭混沌取消也明確說明。
- 1–2 張牌顯示 4 秒、3 張 6 秒、4 張 8 秒。無功能牌時顯示「本回合無人使用功能牌」1.5 秒；可暫停閱讀或按「查看結算」。
- 同一視窗切至裁決後重新給予 8 秒閱讀時間；終局也先完成戰報與裁決，再由「查看終局」進入結果。
- 戰報不呈現最終分數表，背景座位的最終點數與淘汰標記暫時隱藏。真理之眼私查內容不進戰報，暗牌只在揭牌後顯示。
- 切換視圖只控制閱讀；核心以既有流程結算一次。`roundCardReport.ts` 讀取真實解析結果，沒有重算目標或額外使用 RNG。
- 原有暫停、隱藏頁面與重開清理保留；焦點在視窗背景或標題時，Tab／Shift+Tab 也會留在操作項目。

主要檔案：`RoundCardReport.tsx`、`RoundSettlementDialog.tsx`、`GameBoard.tsx`、`round-settlement.css`；資料層為 `roundCardReport.ts`／測試，以及 `types.ts`、`cardResolver.ts`、`stateMachine.ts` 的解析結果記錄。

### 最新驗證

- 9 個測試檔、132 項測試通過；正式建置通過，JS `index-C4vSct4g.js`、CSS `index-UGo6lPKL.css`。
- 9 組戰報瀏覽器驗收、原有 13 組自動流程與 11 組裁決視窗檢查皆通過。
- 固定種子 9152026 的 100 局逐局完整狀態比對一致，僅排除新增戰報欄位；前後 RNG 都為 11,609 次。證據在 `artifacts/card-report-validation/comparison.json`。
- 戰報於 1366×768、375×812 無水平溢出、底部操作可達。結果及截圖在 `artifacts/visual-checks/round-report-smoke/`。
- 先前 23 檔雜湊不變／只改 2 檔的描述各屬當日歷史交付；此次新增解析結果資料以完整狀態與 RNG 比對確認規則維持一致。

## 六項介面修改記錄（2026-09-15）

使用者 review 並批准的六項介面修改已完成，以下保留當時測試結果；戰報新增行為以頂部最新狀態為準。

1. **印記與桌牌更清楚**：放大承諾印記與已出桌牌，按座位分區，保留傾斜、陰影與無框桌面；己方桌物件和手牌之間留出安全距離。
2. **提示短暫出現**：階段廣播顯示 1500ms 後退場；桌心不再長留大標題、重複卡片資料或結算列表，宿命／公開牌等實際決策保留操作介面。
3. **手牌收放**：平時沿桌邊收起，滑鼠 hover 或鍵盤 focus 只抬起單張。觸控首點展開，第二次點選才出牌，仍可另行查看詳情。
4. **自動九階段過場**：確認承諾及出牌後自行繼續；宿命使用、真理之眼兩段選擇、混沌指定目標必須等待玩家，沒有任意替玩家決定的倒數。
5. **逐句發言**：Bot 每句約 3500ms，可暫停與略過；閱讀卷宗／詳情、等待私訊決策及隱藏頁面會停止自動過場。
6. **回合裁決視窗**：預設顯示 8 秒，自動繼續前可暫停查看。展開明細會凍結倒數，收合後仍待玩家恢復；隱藏頁面／外部閱讀也會凍結。最後一回合不自動消失，按「查看終局」才顯示勝負結果。真人先出局時繼續觀戰 Bot 後續回合。

### 過場節奏與決策邊界

| 階段 | 現在的前進方式 |
| --- | --- |
| commitment | 等待確認承諾；完成後約 600ms 進入發言 |
| discussion | 每位 Bot 約 3500ms；可暫停、繼續或略過發言 |
| fateDeclare | 有宿命時等待使用／不使用；沒有時約 400ms 自動提交不使用，所有宣告完成後約 700ms 進入出牌 |
| playCards | 等待確認陣營及本回合功能牌選擇；完成後約 600ms 進入公開解析 |
| resolvePublicCards | 真理之眼與混沌等待完整決策；沒有待決策效果時約 1200ms 進入揭示 |
| reveal | 約 2000ms 展示後，沿既有 `advancePhase` 執行本回合裁決 |
| resolveJudgment | 先顯示功能牌戰報 4–8 秒（無牌 1.5 秒），再顯示裁決 8 秒；可暫停或略過戰報，查看明細時不計時 |
| drawCards | 約 1200ms 後由既有流程執行補牌 |
| roundEnd | 約 500ms 後進入下一回合；終局停止自動流程 |

`useRoundFlow` 的排程綁定原對局狀態，一次只執行一個過場；重開、卸載與階段切換會清除舊回呼。結算閱讀由 `RoundSettlementDialog` 獨立掌握，避免重複結算或抽牌。`completeEliminatedHumanTurn` 只在沒有存活真人時補完尚未決定的 Bot，重用原本 Bot 策略及用牌邏輯。

### 最新驗證與維護提醒

- `npm run test`：8 個檔案、118 項測試通過，包含 StrictMode 單次結算／補牌及真人淘汰流程。
- `npm run build` 通過；最新產物為 JS `index-BhWZY1bd.js`、CSS `index-D6mdv8_j.css`；收尾修改後的 118 項測試亦重新執行通過。
- 最新布局於 1366×768、1920×1080、375×812、812×375 通過，無水平溢出、桌物件與手牌重疊或桌牌與角色名牌碰撞，hover／focus 不會移動桌面。
- 裁決視窗 11 項專門檢查通過，結果在 `artifacts/visual-checks/round-settlement-smoke/results.json`。
- `node artifacts/visual-checks/tribunal-autoflow.cjs` 最終整合 13 個情境全部通過，無頁面執行錯誤；包含正式首回合至第二回合、特殊牌決策、淘汰後觀戰、各種暫停與重開、終局、四種布局及原生拖曳。結果在 `artifacts/visual-checks/tribunal-autoflow/results.json`。
- 核心基準 23 檔中，只有 `stateMachine.ts` 和 `stateMachine.test.ts` 改變；其餘 21 檔 SHA-256 不變。
- 桌機場景保持 `overflow: clip`：`overflow: hidden` 會讓抬起手牌的 hover／focus 造成內部 `scrollTop=48`，整張桌面跟著移動。手機及矮橫向畫面另保留垂直捲動。
- 桌機左右牌堆 `top: 66%` 經放滿三件暗放物件及揭示後剩下兩件物件驗收，牌面與角色名牌保持間距；公開解析除了混沌目標決策外只顯示短暫提示，真理之眼仍由私訊視窗操作。
- 拖曳驗收須先讓 hover 抬牌完成，再取得目前位置，避免凍結測試時鐘時沿用抬牌前的位置。原生承諾／陣營／功能牌拖曳及確認後自動裁決已通過，正式拖曳規則未改動。

本次主要檔案：`GameBoard.tsx`、`ActionPanel.tsx`、`TablePlayArea.tsx`、`DraggableCard.tsx`、`TableSeatSlots.tsx`、`useRoundFlow.ts`／測試、`RoundSettlementDialog.tsx`、`tribunal-board.css`、`round-settlement.css`、`stateMachine.ts`／測試。

## 美術與布局

- 原創燭光審判庭與黑石牌桌背景，六位角色以保留既有特徵的透明坐姿素材置於桌旁；卡牌保留原素材。
- 上、左、右三名 Bot；玩家的承諾印記、陣營與功能牌置於下方。
- 完整九階段導覽，宿命獨立顯示；沒有待決策的階段自動過場，玩家選擇仍由明確確認提交。
- 點選或拖曳將牌打到整片無框桌面，再手動確認；另設「查看」按鈕閱讀詳情。空桌不顯示卡槽。
- 盟約藍色、叛離紅色、確認金色；同時保留文字辨識。
- 手機採直向重排，矮螢幕保留捲動；支援鍵盤焦點與減少動態效果。

構圖參考：[爐石戰記官方遊戲介紹](https://playhearthstone.com/en-us/how-to-play/)、[昆特牌官方網站](https://www.playgwent.com/en/)。借鑑牌桌與手牌分區的設計概念，未複製其圖像或介面素材。

## 樣式結構

`legacy-ui.css` 將既有 global／layout／components 樣式放入 legacy 層，保留入口與教學的既有結構。`tribunal-board.css` 獨立接管對局。舊 `alpha-board.css` 不再載入，正式與預覽入口顯示同一新版。

## 原創場景素材

- 工具：內建 imagegen。
- 檔案：`src/assets/backgrounds/bg_tribunal_board_v3.png`。
- 尺寸：1672 × 941；全幅背景，不含玩家、卡牌或介面。
- 碰撞／互動：無；所有遊戲互動由 React 元件處理。
- 載入方式：GameBoard 匯入場景檔，CSS 以 cover 顯示，桌上卡牌與角色另行定位。

最終提示詞：

```text
Use case: stylized-concept. Asset type: original background plate for a playable 16:9 dark fantasy social deduction card game, Judgement Dilemma. Create a premium painterly 3D game board environment seen from a player's seated high oblique angle. A large elliptical obsidian and dark walnut tribunal table occupies x 10%-90%, y 24%-88%; thick carved aged bronze rim, delicate concentric engraved scales-of-justice motif in the center. The center playing surface is dark, quiet, spacious, low contrast with faint bronze inlays; leave all central play space EMPTY for live cards and text overlaid by the game engine. Behind table at top is dim gothic chamber, distant tall windows, charcoal stone arches, subtle teal moonlight haze. Two small warm candle groups at far outer left and right corners, ivory papers and a quill only at far bottom right perimeter. Foreground carved wood rim and shadow. Cohesive charcoal black, aged bronze gold, desaturated midnight teal, small amber highlights. Tangible table thickness, rich tactile materials, strong readable large forms, cinematic candlelight and ambient fill; not pitch black, not flat UI. Beautiful highly finished fantasy card game environment illustration. Landscape 16:9, 1920x1080 if possible. NO characters, NO people, NO portraits, NO hands, NO cards, NO dice, NO numbers, NO text or lettering, NO UI, NO HUD, NO borders around the whole image, NO logos. All runtime controlled game objects are separate. This is a background plate, NOT a screenshot mockup. Original visual design, do not reproduce any existing game assets.
```

## 坐姿與直接出牌修正（2026-09-12）

依使用者回饋，移除橢圓肖像包裝與承諾／陣營／功能牌放置框。角色露出肩膀、手臂、持牌姿勢與椅背，直接與場景疊合。承諾是桌上的實體印記；牌以自然傾斜與接觸陰影落在桌面。

六張坐姿素材由內建 imagegen 以各自原有 raw 角色圖為參考製作，使用單一角色圖而非混合圖集。原始背景為純洋紅，使用 generate2dsprite 的 deterministic processor 去背至 640×640，另清理邊緣混色。提示詞與人物 slug 完整存於 `ui-references/seated-character-prompts.json`，產物為 `src/assets/bots/seated/seated_*.png`。原始生成圖與處理資訊保留於本機，不載入遊戲。

出牌使用 UI 專用 `useCardCast`：420ms 拋出及翻背、70ms 落定。點選從手牌位置飛出，拖曳從放手位置飛至桌面；同時最多一個飛行物件。減少動態設定直接呈現結果。確認前只改本地選擇，原有核心確認與結算時機不變。對手的空白密令在揭示前仍保留同樣卡背，避免從牌數暴露功能牌使用情況。

新版追加驗收：九項正式畫面出牌互動通過；七個遊戲情境與五種尺寸通過；108 個規則測試及正式建置通過；23 個核心檔案雜湊與基準一致。代表畫面為 `artifacts/visual-checks/tribunal-card-cast/cards-on-table.png`。

## 現行驗收（2026-09-16）

- `npm run test`：執行規則及自動流程測試。
- `npm run build`：TypeScript 與正式建置。
- `node artifacts/visual-checks/phase-banner-review.cjs`：所有階段銘牌、戰報／裁決／終局、長標題、手機布局、宿命／混沌操作與快速階段動畫重播。
- `node artifacts/card-report-validation/compare.cjs`：比對戰報改動前後 100 局完整狀態、模擬統計與 RNG，排除新增的 `cardReport` 欄位。
- `node artifacts/visual-checks/round-report-smoke.cjs`：真實解析結果、失效原因、私查保密、戰報／裁決獨立倒數、暫停／略過、終局及桌機／手機布局。
- `node artifacts/visual-checks/tribunal-autoflow.cjs`：本機 Playwright 操作正式入口、固定牌例、自動過場、閱讀暫停與桌機／觸控布局；需先啟動 127.0.0.1:5175。使用本機已附帶 Playwright，不增加產品依賴。
- `node artifacts/visual-checks/round-settlement-smoke.cjs`：裁決視窗的 8 秒單次出口、明細與暫停、頁面隱藏、重開、終局及鍵盤焦點。
- 檢查承諾、發言、宿命、出牌、指定目標、揭示、戰報、結算、補牌、下一回合；對手暗牌與真理之眼私訊不得提早或公開顯示。
- 目前布局尺寸：1366×768、1920×1080、375×812、812×375。

瀏覽器截圖與 JSON 結果存於 `artifacts/visual-checks/`。這些是本機驗收產物，不會被正式遊戲匯入。舊 `tribunal-smoke.cjs`、`tribunal-card-cast.cjs`、`tribunal-responsive.cjs` 依賴手動推進，保留為歷史腳本，尚未適配自動流程。

本機入口：`http://127.0.0.1:5175/`；直接進桌：`http://127.0.0.1:5175/?preview=alpha-board`。

## 完成結果（2026-09-11）

- 既有 108 個測試全部通過；TypeScript 與 Vite 正式建置通過。
- 正式入口完整首回合、宿命、真理之眼、混沌、鏡像、賭命，以及終局／重開／回主畫面，共七個情境通過。
- 五個尺寸可選牌與確認：1366×768、1440×810、1920×1080、375×812、812×375；無水平溢出與頁面執行錯誤。
- 1366×768 原生拖曳承諾與陣營落牌通過；結算明細可捲動完整查看。
- 23 個核心規則檔案均與實作前 SHA-256 一致。
- 主畫面、選角及教學在 1366／375 寬度的入口操作通過。
- 所有圖片均為既有素材或本次原創背景；未新增外部 UI 套件。

目前限制：卡牌保留既有灰階美術；角色已於 2026-09-12 換成坐姿。手機與矮視窗需要垂直捲動。權宜牌維持原本獨立實驗池狀態。

## 早期修改檔案（2026-09-11）

- 牌桌與座位：`GameBoard.tsx`、`PlayerPanel.tsx`、`TableSeatSlots.tsx`。
- 操作與手牌：`TablePlayArea.tsx`、`DraggableCard.tsx`。
- 浮層與終局：`CardDetailPanel.tsx`、`CardEffectOverlay.tsx`、`GameResultPanel.tsx`、`useDialogFocus.ts`。
- 繁中文案：`RoundSummaryPanel.tsx`、`TutorialScreen.tsx`。
- 樣式入口：`src/main.tsx`、`src/styles/legacy-ui.css`、`src/styles/tribunal-board.css`、`src/styles/tribunal-lobby.css`。
- 新場景：`src/assets/backgrounds/bg_tribunal_board_v3.png`。
- 文件：本文件與 `CODEX_HANDOFF.md`。

畫面對照：原有參考 `docs/ui-references/current_game_screen.png`；新版對局 `artifacts/visual-checks/tribunal-final-1366x768.png`。
