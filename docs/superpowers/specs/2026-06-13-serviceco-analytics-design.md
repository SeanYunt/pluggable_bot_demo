# Service Co Analytics Instrumentation — Design Spec

**Date:** 2026-06-13
**Scope:** Add Plausible custom events to the Service Co sandbox and red team module

---

## Goal

Surface meaningful usage metrics for the Service Co demo tab — which presets and models users explore, whether they run the red team, and how each preset performs against adversarial probes.

## Approach

Option B (Full sandbox funnel): instrument all meaningful user interactions in the Service Co tab without adding per-message chat noise.

Uses the existing `window.plausible('Event Name', { props: {...} })` pattern already established in `js/intent.js`. All calls are guarded with `if (typeof plausible === 'function')`.

---

## Event Inventory

### `js/integrations/servicecobot.js`

| Event name | Trigger | Props |
|---|---|---|
| `Preset Selected` | User clicks a preset button (skip initial `applyPreset` on load) | `{ preset: 'loose' \| 'standard' \| 'strict' }` |
| `Model Selected` | User changes the model `<select>` | `{ model: 'haiku' \| 'sonnet' }` |
| `System Prompt Viewed` | User expands "Show system prompt" (only on open, not close) | `{ preset }` |
| `Red Team Launched` | User clicks "Run Red Team" in sandbox | `{ preset, model }` |

**Implementation notes:**
- `applyPreset(preset, isInit)` already has an `isInit` flag — skip the Plausible call when `isInit === true`
- `currentPreset` and `currentModel` are in scope at every event site — no new state needed

### `js/redteam.js`

| Event name | Trigger | Props |
|---|---|---|
| `Red Team Run Started` | User clicks "Run All Probes" | `{ preset, model, source: 'sandbox' \| 'header' }` |
| `Red Team Probe Result` | Each probe completes (success or error) | `{ probe_id, verdict: 'pass' \| 'fail' \| 'ambiguous' \| 'error', preset, model }` |
| `Red Team Run Completed` | All probes finish | `{ preset, model, passed, total }` |

**Implementation notes:**
- `preset` and `model` already flow into `launch()` as optional params — pass them through to the inner `runBtn` click handler and `runProbe` loop
- `source` is `'sandbox'` when `preset` is non-null, `'header'` otherwise
- On probe error, use `verdict: 'error'` so failures are distinguishable from probe outcomes
- Props with `null`/`undefined` values are omitted from Plausible automatically

---

## Files Changed

- `js/integrations/servicecobot.js` — 4 new `plausible()` calls
- `js/redteam.js` — 3 new `plausible()` calls (1 on run start, 1 per probe in loop, 1 on completion)

No new files. No changes to HTML, CSS, or proxy.

---

## What This Enables in Plausible

- **Funnel:** Preset Selected → Red Team Launched → Run Started → Run Completed
- **Probe failure heatmap:** filter `Red Team Probe Result` by `verdict=fail`, group by `probe_id`
- **Preset comparison:** which preset passes the most probes?
- **Model preference:** Haiku vs Sonnet selection rate
- **System prompt curiosity:** how often do users expand the prompt before running red team?

---

## Out of Scope

- Per-message chat events (`Sandbox Chat Sent`) — adds noise without meaningful insight at this stage
- Back button clicks from red team panel
- Non-Service Co adapter instrumentation (covered separately by `BotIntent`)
