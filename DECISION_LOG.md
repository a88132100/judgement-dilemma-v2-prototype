# Decision Log：審判困境 v2

## 2026-04-27

### Decision

第一版《審判困境 v2》Prototype 採用 Web 技術開發。

技術路線：

- Vite
- React
- TypeScript
- CSS

### Reason

目前要驗證的是規則、心理博弈、裁決點數平衡、功能牌效果與 Bot 模擬。

這些內容使用 Web Prototype 比 Unity 更快。

第一版不需要角色操作、3D 場景或物理互動，因此不使用 Unity。

### Rejected Options

#### Unity

暫時不採用。

原因：

- 對規則驗證來說太重。
- UI 綁定與場景設定會拖慢速度。
- 目前不需要 2D / 3D 操作手感。

#### 純 HTML / CSS / JavaScript

暫時不採用。

原因：

- 規則狀態較多。
- 功能牌與 Bot 邏輯會逐漸複雜。
- 使用 TypeScript 較容易維持資料結構清楚。

#### Next.js

暫時不採用。

原因：

- 第一版不需要 SEO、後端路由或正式網站架構。
- Vite 較輕量，適合快速原型。

### MVP Scope Decision

第一版只做：

- 固定 4 人局
- 1 真人玩家 + 3 Bot
- 裁決點數
- 承諾
- 陣營選擇
- 基礎結算
- 宿命
- 真理之眼
- 庇護
- 反擊
- 最小 UI
- 事件紀錄
- 重新開始

第一版不做：

- 混沌
- 鏡像
- 賭命
- 權宜牌
- 線上多人
- 登入
- 後端
- 正式美術

### Next Step

建立 Vite + React + TypeScript 專案，並讓 Codex 先進行 Plan First 架構規劃。
