# DEBUG_HANDOFF

## 目前狀態：Token 拖曳調查已解決（2026-09-19）

- 現象：原 PNG 換成 CSS 留白裁切視窗後，點選正常、原生拖曳沒有 `dragstart`，落桌數為 0。
- 最小重現：`artifacts/visual-checks/token-drag-diagnosis.cjs` 使用正式 GameBoard，記錄 pointerdown／dragstart／drop；先 hover 仍可重現，因此與以下 2026-09-15 舊位置問題不同。
- 已否證：讓裁切視窗 `pointer-events:none` 只能令事件落到按鈕，仍不能觸發拖曳。
- 已確認根因：全域 `all:revert` 後，按鈕雖然 `draggable=true`，計算後 `-webkit-user-drag:auto`；之前依賴內部原生 img 觸發拖曳，新的裝飾圖禁用自身拖曳後不再觸發。瀏覽器只注入 `-webkit-user-drag:element; user-select:none` 就恢復帶正確資料的 `dragstart → drop → dragend`。
- 修正：只對 `.operation-token[draggable="true"]` 明確指定原生拖曳樣式；裝飾視窗保持穿透。未修改規則或 DropZone。
- 驗證：`node artifacts/visual-checks/tribunal-autoflow.cjs drag` 通過，承諾／陣營／功能牌拖曳與確認後自動裁決正常；原圖來源與飛行視窗驗收也通過。診斷證據在 `artifacts/visual-checks/token-readability/drag-diagnosis.json`。

## 歷史狀態（2026-09-15）

兩項調查均已解決。名牌與桌牌使用66%定位，通過1366×768、1920×1080、375×812及812×375驗收，包含暗放三件、揭示兩件、hover及鍵盤焦點；全部量測無名牌／手牌交疊，桌面內部捲動為0。

拖曳失敗來自QA在凍結時鐘下直接使用hover前的舊位置，沒有讓牌面抬起後重新取中心。先hover並走400ms，再呼叫原生dragTo，陣營及功能牌的dragstart、帶有application/judgement-dilemma資料的drop都正常，確認後完成自動裁決。`results-drag.json`已通過。文字選取假設經暫時注入CSS否證，注入已移除；沒有為測試更改正式拖曳或核心邏輯。以下保留調查記錄。

## 錯誤現象

2026-09-15 收尾驗收：放大後的對手桌牌在暗放三件與揭示兩件時，旋轉後的外接矩形可能碰到名牌；原生拖曳驗收中，承諾成功但陣營沒有落桌。

## 最小重現步驟

執行 `node artifacts/visual-checks/tribunal-autoflow.cjs layout drag`，使用正式 GameBoard 與 CSS、1366×768 畫面。

## 目前錯誤訊息 / log

`revealed-1366 對手桌牌不可被角色名牌遮住`。最新量測右側牌面 y=444.047，名牌底部 y=447.266，重疊 3.219px。座位牌堆的 top=64%（442.875px），旋轉及牌堆寬度變動造成差異。詳見 `artifacts/visual-checks/tribunal-autoflow/results-layout.json`。

## 已嘗試修法

牌堆定位由 55% 改 62% 再 64%。改善了三件暗放布局，但揭示撤掉空白牌之後，牌堆寬度和旋轉外接矩形不同，仍有少量重疊。

## 失敗原因

只依單一牌數布局估算間距，沒有同時測量揭示後兩件牌堆。拖曳問題尚在收集 dragstart/drop 事件，不能據此修改規則或落牌流程。

## 根因假設

桌牌問題來自旋轉後的矩形及牌數改變，而非牌桌捲動；最新 sceneScroll 三層全為 0。需保留至少 10px 名牌間距；1366 的場景高692px，定位下移2%增加13.84px，足以補上3.219px重疊並留下10px以上間距。

## 下一個驗證步驟

1. 將兩側牌堆定位為66%，重跑完整 layout（靜止、hover、鍵盤、三件暗放、兩件揭示、兩種桌機及兩種觸控尺寸）。任何重疊仍存在時，先檢查具體矩形，不再猜測位置。
2. 拖曳由 QA 代理收集真實游標路徑及事件，判斷來源是否因 hover 變形導致測試按錯位置。

## 不准再重複的修法

- 不可只凭畫面猜百分比，必須比對失敗狀態的外接矩形。
- 不可恢復 overflow:hidden 來讓測試捲動；這會讓操作手牌移動整張牌桌。
- 不可改核心陣營限制來讓測試通過。
