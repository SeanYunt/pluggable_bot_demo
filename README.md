# Pluggable Bot Demo — BluePipe Plumbing

This small static demo shows how a single website can host multiple chatbot integrations and switch between them via a visual toggle or a URL query parameter.

Getting started

1. Open `index.html` in a static server (recommended) or directly in the browser.
   - Quick: run a simple HTTP server from the project folder, for example using Python:

```
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

How to switch bots

- Use the dropdown and click **Open Chat** to load a demo integration.
- Or use a URL parameter: `?bot=landbot` or `?bot=localbot` or `?bot=tars`.

What this demo includes

- `index.html` — main page with controls.
- `css/style.css` — simple styles and chat widget styling.
- `js/main.js` — loader that dynamically injects integration adapters and manages `?bot=` query param.
- `js/integrations/*.js` — three simulated integration adapters:
  - `localbot.js` — simulated AI assistant (canned replies)
  - `tars.js` — simulated conversational form flow
  - `landbot.js` — simulated quick-response widget

How to add a real third-party integration

There are two safe patterns:

1. Replace a simulated adapter with the provider's embed code

   - Open `js/integrations/localbot.js` (or create `yourprovider.js`).
   - Instead of the simulated `init` implementation, inject the vendor's script snippet and call the vendor's widget open API inside `init({container})`.

   Example skeleton:

```js
window.PluggableBot.register({
  name: 'yourprovider',
  init({container}){
    // insert vendor script tag or widget snippet
    const s = document.createElement('script');
    s.src = 'https://vendor.example.com/widget.js';
    document.body.appendChild(s);
    // some vendors expose init after load; follow provider docs
  }
});
```

2. Use the loader approach and call the provider's initialize API

   - The loader (`js/main.js`) will load `js/integrations/yourprovider.js` and `yourprovider.js` should register itself with `window.PluggableBot.register({name, init})`.

Free/trial providers to consider (start here):

- Landbot — offers trial and embeddable widgets.
- Calendly — scheduling widget (free tier) for appointment booking.
- Tidio, Crisp, Tars — have free or trial plans and embeddable scripts.

Notes and caveats

- Some vendors require account-specific IDs or tokens in their script snippet. Keep keys out of public repos; use environment variables or server-side injection for production demos.
- Some external sites block embedding via iframe (X-Frame-Options). Use vendor-provided embed scripts or open in a modal/popover per provider docs.

Next steps I can do for you

- Add a real provider integration (I can add the embed snippet if you provide the vendor widget code or keys).
- Add analytics to track which adapter was demoed and user interactions.
- Deploy this demo to GitHub Pages or a public URL.
