# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Running the Project

```
npx serve .
```

Open `http://localhost:3000`. No build step, no dependencies to install — this is a fully static site.

**Before deploying**, bump `DEPLOY_V` in [js/main.js](js/main.js) (line 3) to a new string — this cache-busts dynamically injected adapter scripts at the CDN/browser layer.

URL parameters:
- `?biz=bluepipe` | `?biz=sparky` | `?biz=roofing` | `?biz=serviceco` — load a specific business context
- `?mode=redteam` — open the adversarial test panel

## Architecture

### Core Pluggable Pattern

[js/main.js](js/main.js) is the loader and router. It maintains a business registry and lazy-loads integration adapters via script injection:

```js
window.PluggableBot = {
  adapters: {},
  register(adapter) { this.adapters[adapter.name] = adapter; }
}
```

Each file in [js/integrations/](js/integrations/) calls `window.PluggableBot.register({ name, init })`. When a tab is clicked, `switchBiz()` clears `#chat-root`, injects the adapter's `<script>`, and calls `init({ container })` on load.

### Adapters

Real (Claude via proxy):
- [js/integrations/plumbingbot.js](js/integrations/plumbingbot.js) — BluePipe Plumbing (`site_id: 1ec42202`)
- [js/integrations/sparkysbot.js](js/integrations/sparkysbot.js) — Sparky's Electrical (`site_id: 8877d8fc`)
- [js/integrations/roofingbot.js](js/integrations/roofingbot.js) — Nailed It Roofing (`site_id: 60e5fd54`)
- [js/integrations/servicecobot.js](js/integrations/servicecobot.js) — Service Co sandbox (`site_id: a2abacdf`) — special; see below

Simulated (no network):
- [js/integrations/localbot.js](js/integrations/localbot.js) — canned keyword replies, artificial delay
- [js/integrations/tars.js](js/integrations/tars.js) — scripted two-turn form flow
- [js/integrations/landbot.js](js/integrations/landbot.js) — button-driven multiple choice UI

All real integrations POST to `https://api.blackdiamondconsulting.ai/chat` with body `{ site_id, messages: [{role, content}] }` and receive `{ reply, usage, model }`. The Service Co sandbox and Red Team module also send optional `preset` and `model` fields the Worker uses to override the system prompt and select the model. The Cloudflare Worker proxy (separate repo at [cloudflare-bot-proxy](../cloudflare-bot-proxy/)) resolves the `site_id` to a system prompt and handles the Anthropic API key.

### Service Co Sandbox (Special Adapter)

The `serviceco` business has `isSandbox: true` in the registry. This flag changes `switchBiz()` behavior: the standard `#demo-content` and the "Open Chat" / "Red Team" header buttons are hidden; the adapter mounts directly into `#sc-root` and fills the whole main area.

`servicecobot.js` renders preset buttons (Loose / Standard / Strict), a model selector (Haiku / Sonnet), and an inline chat. Presets send a `preset` field to the proxy so the Worker can override the system prompt. Clicking "Run Red Team" inside the sandbox calls the `onRedTeam(opts)` callback injected by `loadIntegration`, which triggers `launchRedTeamFromSandbox` with `{ preset, model }` — those values are forwarded to the red team module and displayed as metadata on the results panel.

### Theme System

Business identity lives in `html[data-biz="..."]`. [css/style.css](css/style.css) overrides `--accent`, `--bg`, and `--border` CSS variables per `data-biz` attribute. `switchBiz()` sets this attribute, triggering a CSS transition for smooth theme switching.

### Analytics

Two distinct analytics mechanisms exist — both wrap the Plausible `plausible(event, { props })` global:

**1. Intent tracking** — [js/intent.js](js/intent.js) exposes `window.BotIntent.track(bizName, userText, firedIntents, pendingConversions)` and `window.BotIntent.trackReply(botReply, pendingConversions)`. It implements a four-state machine per intent slug tracked in the `pendingConversions` Map:
- `'fired'` — user expressed the intent (via user message regex); `Chat Intent` event fired
- `'bot_solicited'` — bot asked if user wants something without the user expressing it first (e.g. "Want to schedule?"); detected by `solicitRe` in `trackReply()`
- `'bot_offered'` — bot gave a fulfillment signal (price, confirmation, dispatch); detected by `fulfillRe` in `trackReply()`
- `'bot_deflected'` — bot explicitly redirected to phone/other channel (e.g. "please call us"); detected by global `DEFLECTION_RE` in `trackReply()`; `Chat Deflection` event fired
- `'converted'` — user affirmed a `bot_offered` intent; `Chat Conversion` fired. If user affirms a `bot_solicited` intent, a secondary `Chat Intent` fires first, then the intent advances to `'fired'` (awaiting bot fulfillment).

**2. Local `track()` helpers** — [js/redteam.js](js/redteam.js) and [js/integrations/servicecobot.js](js/integrations/servicecobot.js) each define a module-local `track(event, props)` function for direct Plausible event firing.

**Plausible events catalog:**

| Event | Source | Key props |
|---|---|---|
| `Chat Intent` | intent.js | `biz`, `intent` (Emergency / Inspection Request / Appointment Request / Estimate Request) |
| `Chat Conversion` | intent.js | `biz`, `intent` — two-signal gate: bot fulfillment signal then user affirmation |
| `Chat Deflection` | intent.js | `biz`, `intent` — bot redirected to phone/other channel; distinguishes from user abandonment |
| `Preset Selected` | servicecobot.js | `preset` |
| `Model Selected` | servicecobot.js | `model` |
| `System Prompt Viewed` | servicecobot.js | `preset` |
| `Red Team Launched` | servicecobot.js | `preset`, `model` |
| `Red Team Run Started` | redteam.js | `source` (sandbox\|header), optional `preset`, `model` |
| `Red Team Probe Result` | redteam.js | `probe_id`, `verdict` (pass\|fail\|error), optional `preset`, `model` |
| `Red Team Run Completed` | redteam.js | `passed`, `total`, optional `preset`, `model` |

### Red Team Module

[js/redteam.js](js/redteam.js) implements adversarial probe testing. Six probes (off-topic request, instruction disclosure, scope creep, persona override, authority claim, sycophancy) each define `msg(ctx)` or `turns[]` for input and a `judge(reply)` function that returns `pass`, `fail`, or `ambiguous`. Results render as cards in `#rt-root` with transcripts and badges.

## Adding a New Adapter

1. Create `js/integrations/yourbot.js`
2. Call `window.PluggableBot.register({ name: 'yourbot', init({ container }) { ... } })`
3. In the adapter's message handler, call `window.BotIntent.track(bizName, userText, firedIntents, pendingConversions)` where `firedIntents` is a `Set` and `pendingConversions` is a `Map`, both initialized per conversation. After each bot reply, call `window.BotIntent.trackReply(botReply, pendingConversions)`. Clear both on reset. (See any real adapter for the pattern.)
4. Add an entry to the `businesses` map in [js/main.js](js/main.js) with `name`, `tagline`, `about`, `bot`, `siteId`, and `trade` fields
5. Add a tab button in [index.html](index.html)
6. Add a `[data-biz="yourbot"]` theme block in [css/style.css](css/style.css)

## Related Repository

The Cloudflare Worker proxy lives at `../cloudflare-bot-proxy/`. It maps `site_id` values to system prompts and manages the Anthropic API key server-side. To add a new business, register a new `site_id` there.
