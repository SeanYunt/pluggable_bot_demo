# Pluggable Bot Demo

A static demo showing how a single page can host multiple chatbot integrations and switch between them per business context using a tab bar or URL parameter.

## Getting started

Serve the project with any static file server:

```
npx serve .
```

Then open `http://localhost:3000` in your browser.

## How to switch businesses

- Click a tab (BluePipe Plumbing, Sparky's Electrical, Nailed It Roofing) to switch context.
- Or use the URL parameter: `?biz=bluepipe`, `?biz=sparky`, or `?biz=roofing`.
- Click **Open Chat** to load that business's bot. Click it again to close.

## Project structure

- `index.html` — page shell with tab bar and chat mount point.
- `css/style.css` — layout and chat widget styles.
- `js/main.js` — tab switching, URL sync, and lazy integration loader.
- `js/integrations/` — one adapter file per bot:
  - `plumbingbot.js` — BluePipe Plumbing (Claude via Cloudflare Worker proxy)
  - `sparkysbot.js` — Sparky's Electrical (Claude via Cloudflare Worker proxy)
  - `roofingbot.js` — Nailed It Roofing (Claude via Cloudflare Worker proxy)
  - `llamabot.js` — local Gemma/Ollama integration
  - `localbot.js` — simulated assistant (canned replies, no network)
  - `tars.js` — simulated conversational form flow
  - `landbot.js` — simulated quick-response widget

## How adapters work

Each adapter file calls `window.PluggableBot.register({ name, init })`. The loader in `main.js` lazy-loads the adapter script on demand and calls `init({ container })` to mount the widget.

Skeleton for a new adapter:

```js
window.PluggableBot.register({
  name: 'yourprovider',
  init({ container }) {
    // build or inject your widget into container
  }
});
```

## Cloudflare proxy adapters

`plumbingbot.js`, `sparkysbot.js`, and `roofingbot.js` all POST to a Cloudflare Worker at `https://api.blackdiamondconsulting.ai/chat` with a `site_id` and message history. Each site ID is registered in the Cloudflare Worker's KV store and maps to an encrypted Anthropic API key and system prompt.

To update a `site_id`, edit the `SITE_ID` constant at line 5 of the relevant integration file.

## Notes

- Keep API keys out of public repos. The Cloudflare proxy handles key storage server-side.
- Some vendors block iframe embedding (X-Frame-Options). Use vendor embed scripts or a modal per provider docs.
