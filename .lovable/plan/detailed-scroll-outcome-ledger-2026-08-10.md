# Detailed Scroll Outcome Ledger

Right now an imprint or a field reading only reports the verdict ("backfired", "ruined") in a toast or feed line. This adds a full, per-attempt record: which roll happened, which attribute check decided it, and exactly what it did to the champion.

## What you will see

Every attempt (imprinting in the Scriptorium, and reading a scroll in the field) records one entry with four outcome kinds:

- **Improved** — flawless weave; two scrolls from one, or a surged spell
- **Bound** — a clean success
- **Ruined** — the weave failed but turned outward; materials lost, champion unharmed
- **Backfire** — the failure turned inward; HP and MP torn out

Each entry shows:

- The champion, the scroll, and the moment it happened
- **The check**: the rolled number against the threshold it had to beat, and which attribute set that threshold — WIT decides whether the weave holds and whether it is improved; MEN decides whether a failure merely ruins the vellum or bites back
- **The cost paid**: materials, gold, MP spent up front (paid whatever the result)
- **The resulting state**: HP and MP before and after, as exact values and as a share of max, plus the scroll count in the warehouse before and after

## Where it appears

- A **Ledger** section in the Scriptorium, listing recent attempts newest-first, filterable by outcome (all / improved / bound / ruined / backfire) and by champion. Backfire rows expand to show the full breakdown.
- The Champion dossier gains the same list, scoped to that champion, next to their scroll record.
- Field readings during expeditions feed the same ledger, so a backfire mid-expedition is traceable afterwards, not just a one-line note.
- The odds bar in the Scriptorium gains hover detail explaining, per band, which attribute drives it and what the current WIT/MEN values contribute.

## Technical notes

- `src/lib/game/scrolls.ts`: add a detail-returning roll (`rollOutcomeDetail`) that returns the outcome plus the raw roll, band boundaries, the deciding attribute (`wit` for improved/hold, `men` for the backfire split), the stat value used, and the pivot. Keep `rollOutcome` as a thin wrapper so existing callers are unchanged.
- New `ScrollAttempt` record type on `GameState` (`scrollLog: ScrollAttempt[]`, capped at ~80 entries, trimmed oldest-first): id, at, memberId, scrollId, phase (`imprint` | `read`), outcome, roll detail, cost paid, and before/after HP, MP and scroll stock.
- `src/hooks/useClanGame.ts` `imprintScroll`: swap in the detail roll and push one record per attempt, capturing HP/MP before and after the mutation and the resulting `s.inventory[def.id]`.
- `src/lib/game/engine.ts` `readScroll`: same capture inside the expedition resolver; the records ride back with the expedition result and are appended on tick alongside `scrollNotes`.
- New `src/components/game/ScrollLedger.tsx` renders the list, reused by `ScriptoriumPanel.tsx` and `ChampionDialog.tsx`.
- Numbers are shown exactly as the engine computed them (rounded only for display), so the ledger reconciles with the champion's live HP/MP bar.
