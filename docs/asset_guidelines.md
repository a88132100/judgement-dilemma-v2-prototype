# 美術素材接入規範

## 目前已接入素材

cards:
- `src/assets/cards/card_fate.png`
- `src/assets/cards/card_peek.png`
- `src/assets/cards/card_shield.png`
- `src/assets/cards/card_counter.png`
- `src/assets/cards/card_alliance.png`
- `src/assets/cards/card_betrayal.png`

tokens:
- `src/assets/tokens/token_commit_alliance.png`
- `src/assets/tokens/token_commit_betrayal.png`

backgrounds:
- `src/assets/backgrounds/bg_judgement_table.png`

## 尚未接入素材

- `src/assets/cards/card_chaos.png`
- `src/assets/cards/card_mirror.png`
- `src/assets/cards/card_gamble.png`
- `src/assets/audio/` 內所有音訊
- `src/assets/backgrounds/bg_trial_room.png`
- `src/assets/ui/` 內 UI 素材

## 檔名命名規則

- 功能牌：`card_{card_key}.png`
- 陣營牌：`card_{faction_key}.png`
- 承諾 token：`token_commit_{faction_key}.png`
- key 使用小寫英文，單字以底線分隔。
- 檔名應對應程式中的 `CardType` 或 `Faction` key，避免 UI 對照表需要額外轉譯。

## 未來素材尺寸建議

- 功能牌與陣營牌：建議維持相同長寬比，優先使用直式卡面，例如 512 x 704 或 1024 x 1408。
- 承諾 token：建議使用正方形透明背景，例如 256 x 256 或 512 x 512。
- 小型 UI 使用時會裁切為縮圖，因此重要資訊應放在圖面中央。
- 所有素材應保留文字 fallback；圖片不可成為唯一可讀資訊。

## 不應接入未實作卡牌的原因

`混沌`、`鏡像`、`賭命` 尚未進入目前 MVP 規則。若先在 UI 中接入這些卡牌素材，玩家可能誤以為它們已可使用，造成測試回饋混淆。未實作卡牌應等核心規則、合法性驗證、AI 決策與測試都完成後再接入。
