# 審判困境 v2 Web Prototype - Codex Rules

## Project Goal

This project is a rapid gameplay validation prototype for 審判困境 v2.

The goal is to validate:
- commitment pressure
- alliance / betrayal decision tension
- judgment point balance
- public and hidden function card interactions
- bot decision logic
- round pacing

This is not a final commercial product.

## Codex Game Studio Skill

For game design, prototype implementation, QA, balancing, playtest, or release-prep work in this repo, use the `codex-game-studio` skill.

Apply it as a compact studio workflow:
- Orient: identify the current prototype stage and relevant system.
- Frame: ask only blocking questions; otherwise make conservative assumptions.
- Execute: edit the needed code, docs, tests, or prototype content.
- Verify: run relevant tests, builds, smoke checks, or browser playtests when applicable.

Use lean review intensity by default because this is a rapid validation prototype. Use full review only for broad rule changes, release-facing work, or changes that affect multiple core systems.

The game studio workflow must follow this project's MVP limits and rule-validation goal. Do not expand scope just because a studio artifact could exist.

## Tech Stack

- Vite
- React
- TypeScript
- CSS
- No backend for the first prototype
- No database for the first prototype
- No online multiplayer for the first prototype

## Language Rules

- All player-facing text must be Traditional Chinese.
- All code comments must be Traditional Chinese.
- File names and function names can use English.

## Architecture Rules

Game rules must be separated from UI.

Core game logic should live in:

src/game/

React components should live in:

src/components/

Styles should live in:

src/styles/

Do not put rule logic directly inside React components.

## Core Concepts

This version does NOT use betting chips or betting pools.

The core resource is Judgment Points.

Default values:
- Starting Judgment Points: 6
- Win at: 12
- Eliminated at: 0
- Max rounds: 10

## Round Flow

Each round follows:

1. commitment
2. discussion
3. playCards
4. resolvePublicCards
5. reveal
6. resolveJudgment
7. drawCards
8. roundEnd

## MVP Scope

First prototype includes:

- Fixed 4-player game
- 1 human player + 3 bots
- Commitment Token:
  - Alliance Commitment
  - Betrayal Commitment
- Alliance / Betrayal faction cards
- Judgment Point calculation
- Dealer button rotation
- Event log
- Initial hand size: 2
- Hand limit: 3
- Draw 1 card at round end if hand size is below 3
- Each player may use at most 1 function card per round

## First MVP Cards

Only implement these cards in the first MVP:

- 宿命
- 真理之眼
- 庇護
- 反擊

Do not implement in the first MVP:

- 混沌
- 鏡像
- 賭命
- 權宜牌

## Base Judgment Rules

Use these base settlement rules:

- All Alliance: everyone +2
- Minority Betrayal: each Betrayer +2, each Alliance player -1
- Equal Alliance and Betrayal count: everyone -1
- Betrayal Overload: each Betrayer -2, each Alliance player -1
- All Betrayal: everyone -3
- Lone Hero: if there is exactly 1 Alliance player, that Alliance player +2, all Betrayers -1

Important:
- Lone Hero has special priority.
- If Lone Hero condition is met, use Lone Hero settlement directly.

## Card Resolve Order

Public cards in the first MVP:

1. 宿命
2. 真理之眼

Hidden cards in the first MVP:

1. 庇護
2. 反擊

Full v2 order reserved for later:

Public:
1. 宿命
2. 真理之眼
3. 混沌

Hidden:
1. 庇護
2. 反擊
3. 鏡像
4. 賭命

## Commitment Rule

At round start, each player publicly reveals a commitment:

- Alliance commitment
- Betrayal commitment

At final settlement:

- If final faction matches commitment: +1 Judgment Point
- If final faction does not match commitment: -1 Judgment Point

Do not implement 混沌 exemption yet.

## Bot Rules

The first prototype should include 3 bot personalities:

1. 守信型
   - More likely to keep commitment.
   - More likely to choose Alliance.

2. 投機型
   - More likely to betray when it seems profitable.
   - More likely to break commitment.

3. 觀望型
   - Adjusts decision based on previous round result.
   - Uses mixed strategy.

Bot logic must be placed in:

src/game/botDecision.ts

Do not put bot logic directly in UI components.

## Simulator Rules

The prototype should eventually include a simulator that can run:

- 100 games
- 500 games
- 1000 games

The simulator should measure:

- Average game length
- Win rate by bot personality
- Average Judgment Point gain or loss
- Frequency of Alliance wins
- Frequency of Betrayal-favored results
- Whether one strategy is too dominant

The simulator must reuse the same core resolver logic.

Do not duplicate settlement rules in simulator code.

## Coding Rules

- Use TypeScript strictly.
- Prefer pure functions for rule calculation.
- Add Traditional Chinese comments for all major rule logic.
- Keep files small and readable.
- Do not use copyrighted IP assets.
- Do not add unnecessary animations or external UI libraries.
- After each implementation, summarize changed files and how to test.

## Design Principle

This is a rule validation machine first.

Clarity, correctness, and fast iteration are more important than visual polish.
