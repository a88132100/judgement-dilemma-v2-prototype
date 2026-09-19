# Alpha Freeze 候選清單

## 目的

此文件定義目前可進入 Alpha Freeze 候選的內容與尚未凍結的風險。

Freeze Candidate 代表「規則與驗證基準可暫時鎖定，供下一階段整合與回歸使用」，不代表正式發布版本。

## Gate 結論

GO WITH RISKS。

規則、文件與前置驗證線可以進入 Alpha Freeze Candidate。整體 Alpha Freeze 仍需等待 UI/美術線完成整合 smoke test 後再正式鎖定。

## 納入 Freeze 候選的內容

### 規則基準

- 起始裁決點數：6。
- 勝利門檻：11。
- 出局門檻：0。
- 回合上限：10。
- 固定 4 人局：1 名真人玩家與 3 名 Bot。
- 承諾機制維持合作承諾與背叛承諾。
- 最終陣營符合承諾時 +1，不符合承諾時 -1。

### 回合流程

- commitment
- discussion
- fateDeclare
- playCards
- resolvePublicCards
- reveal
- resolveJudgment
- drawCards
- roundEnd

### MVP 卡牌

- 宿命：獨立宣告階段解析，位於發言後、出牌前。
- 真理之眼：目前唯一公開型功能牌。
- 庇護：隱藏型功能牌。
- 反擊：隱藏型功能牌。

### 驗證狀態

- 1000 局模擬已由使用者確認先前完成，本輪不重跑。
- 真人流程測試已由使用者確認完成，流程上沒有明顯問題。
- Bot 發言資料層與純函式測試已完成。
- Bot 人格標籤已顯示於對手座位卡。
- Bot 發言已顯示於發言階段。
- Alpha Gate 檢查表已建立。
- 規則調整候選清單已建立，但目前不啟用任何數值調整。

## 不納入本次 Freeze 的內容

- UI 介面調整。
- 美術素材調整。
- 混沌。
- 鏡像。
- 賭命。
- 權宜牌。
- 後端、資料庫、登入或線上多人。
- 部署最佳化、素材壓縮與載入分級。
- 任何未經模擬與人工回歸驗證的新數值調整。

## Freeze 候選驗收清單

- [x] 文件勝利門檻為 11。
- [x] 宿命列為獨立宣告階段。
- [x] 宿命不列入公開型功能牌解析順序。
- [x] MVP 卡牌池未擴張。
- [x] 1000 局模擬前置條件已確認完成。
- [x] 真人流程測試已確認完成。
- [x] Alpha Gate 檢查表已建立。
- [x] 規則調整候選清單已建立。
- [x] Bot 發言已接入發言階段 UI。
- [ ] UI/美術線整合後完成 smoke test。
- [ ] Freeze 前重新確認 `npm run test` 通過。
- [ ] Freeze 前重新確認 `npm run build` 通過。

## 主要風險

### 工作區變更混雜

目前工作區同時存在文件、規則、Bot、UI 與素材變更。進入 freeze 前需要依變更切分計畫分批檢查，避免把無關變更一起納入。

### UI/美術線尚未在本文件中驗收

本文件只凍結規則與驗證基準。UI、styles、assets 需要在另一條工作線完成 smoke test 後才可納入整體 Alpha Freeze。

### Bot 發言仍需人工 UI smoke

資料層與發言階段 UI 已完成，但仍需確認桌面與小螢幕尺寸下不遮擋主要操作。

### 真人測試缺少逐局數據

目前只有流程通過結論。若要進入正式調參，仍需補逐局時間、結束回合、玩家理解問題與訪談資料。

## Freeze 判定

目前狀態是 Alpha Freeze Candidate，而不是 Alpha Freeze Final。

可進入下一階段的前提是：

1. 保持規則基準不再擴張。
2. UI/美術線完成可操作 smoke test。
3. 依變更切分計畫整理目前 dirty worktree。
4. Freeze 前再次執行 `npm run test` 與 `npm run build`。
