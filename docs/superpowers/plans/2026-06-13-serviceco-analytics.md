# Service Co Analytics Instrumentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 Plausible custom events to the Service Co sandbox and red team module to track preset/model selection, system prompt reveals, red team launches, per-probe results, and run completions.

**Architecture:** All calls use `window.plausible('Event Name', { props: {...} })` guarded by `typeof plausible === 'function'`, matching the existing pattern in `js/intent.js`. No new files, no new state — events fire from existing handler sites using variables already in scope.

**Tech Stack:** Vanilla JS, Plausible Analytics (already initialized in `index.html`)

---

## Verification Setup

Before testing any events, paste this into the browser console to log all Plausible calls without suppressing real tracking:

```js
const _origPlausible = window.plausible;
window.plausible = function(event, opts) {
  console.log('[PLAUSIBLE]', event, JSON.stringify(opts && opts.props));
  return _origPlausible && _origPlausible.apply(this, arguments);
};
```

After pasting, any `plausible()` call will print to console. Refresh page to restore normal behavior.

---

## Task 1: Instrument `servicecobot.js` — 4 events

**Files:**
- Modify: `js/integrations/servicecobot.js`

- [ ] **Step 1: Add `Preset Selected` event in `applyPreset`**

In `applyPreset` (lines 62–71), add the plausible call in the `else` branch so it only fires on user-initiated changes, not the initial load:

```js
function applyPreset(preset, isInit){
  currentPreset = preset;
  presetBtns.forEach(b => b.classList.toggle('active', b.dataset.preset === preset));
  updatePromptText();
  if(isInit){
    resetChat('Hello! I\'m the Service Co assistant. Pick a preset above, then ask me anything — or hit "Run Red Team" to probe the bot adversarially.');
  } else {
    resetChat('Switched to ' + PRESETS[preset].label + ' preset. Conversation reset.');
    if(typeof plausible === 'function') plausible('Preset Selected', { props: { preset } });
  }
}
```

- [ ] **Step 2: Add `Model Selected` event in the model change handler**

In the `modelSelect.addEventListener('change', ...)` block (lines 79–85), add after `resetChat(...)`:

```js
modelSelect.addEventListener('change', () => {
  const m = modelSelect.value;
  if(m !== currentModel){
    currentModel = m;
    resetChat('Model changed to ' + MODELS.find(x => x.value === m).label + '. Conversation reset.');
    if(typeof plausible === 'function') plausible('Model Selected', { props: { model: m } });
  }
});
```

- [ ] **Step 3: Add `System Prompt Viewed` event in the prompt toggle handler**

In `promptToggle.addEventListener('click', ...)` (lines 87–90), add after `promptToggle.textContent = ...`:

```js
promptToggle.addEventListener('click', () => {
  const visible = promptBody.classList.toggle('visible');
  promptToggle.textContent = visible ? '▲ Hide system prompt' : '▼ Show system prompt';
  if(visible && typeof plausible === 'function') plausible('System Prompt Viewed', { props: { preset: currentPreset } });
});
```

- [ ] **Step 4: Add `Red Team Launched` event in the rtBtn handler**

In `rtBtn.addEventListener('click', ...)` (lines 97–99), fire before the `onRedTeam` callback:

```js
rtBtn.addEventListener('click', () => {
  if(typeof plausible === 'function') plausible('Red Team Launched', { props: { preset: currentPreset, model: currentModel } });
  if(typeof onRedTeam === 'function') onRedTeam({ preset: currentPreset, model: currentModel });
});
```

- [ ] **Step 5: Verify in browser**

1. Run `npx serve .` and open `http://localhost:3000/?biz=serviceco`
2. Paste the verification snippet from the top of this plan into the browser console
3. Click **Loose** → expect: `[PLAUSIBLE] Preset Selected {"preset":"loose"}`
4. Change model to **Sonnet** → expect: `[PLAUSIBLE] Model Selected {"model":"sonnet"}`
5. Click **▼ Show system prompt** → expect: `[PLAUSIBLE] System Prompt Viewed {"preset":"loose"}`
6. Click **▼ Show system prompt** again to close → no event (close is not tracked)
7. Click **Run Red Team** → expect: `[PLAUSIBLE] Red Team Launched {"preset":"loose","model":"sonnet"}`
8. Refresh page → no `Preset Selected` event on initial load

- [ ] **Step 6: Commit**

```bash
git add js/integrations/servicecobot.js
git commit -m "feat: add Plausible events to Service Co sandbox (preset, model, prompt, red team launch)"
```

---

## Task 2: Instrument `redteam.js` — 3 events

**Files:**
- Modify: `js/redteam.js`

- [ ] **Step 1: Add `Red Team Run Started` event at the top of the run handler**

In `redteam.js`, the `runBtn.addEventListener('click', async () => {` block starts at line 180. Add the event after `runBtn.textContent = 'Running…'`:

```js
runBtn.addEventListener(`click`, async () => {
  runBtn.disabled = true;
  runBtn.textContent = `Running…`;
  if(typeof plausible === 'function'){
    const p = { source: preset ? `sandbox` : `header` };
    if(preset) p.preset = preset;
    if(model) p.model = model;
    plausible(`Red Team Run Started`, { props: p });
  }
  let passed = 0;
```

- [ ] **Step 2: Add `Red Team Probe Result` event inside the probe loop**

Inside the `for (const probe of PROBES)` loop, in the `try` block, add after `const verdict = probe.judge(reply)`:

```js
          const { transcript, reply } = await runProbe(probe, siteId, ctx, preset, model);
          const verdict = probe.judge(reply);
          if (verdict === `pass`) passed++;
          if(typeof plausible === 'function'){
            const p = { probe_id: probe.id, verdict };
            if(preset) p.preset = preset;
            if(model) p.model = model;
            plausible(`Red Team Probe Result`, { props: p });
          }
```

Also add to the `catch` block so errors are trackable:

```js
        } catch (e) {
          card.className = `rt-card rt-error`;
          badgeEl.textContent = `⚠️ Error`;
          transcriptEl.textContent = e.message;
          if(typeof plausible === 'function'){
            const p = { probe_id: probe.id, verdict: `error` };
            if(preset) p.preset = preset;
            if(model) p.model = model;
            plausible(`Red Team Probe Result`, { props: p });
          }
        }
```

- [ ] **Step 3: Add `Red Team Run Completed` event after all probes finish**

After `runBtn.style.display = 'none'` (line 220), add:

```js
      runBtn.style.display = `none`;
      if(typeof plausible === 'function'){
        const p = { passed, total };
        if(preset) p.preset = preset;
        if(model) p.model = model;
        plausible(`Red Team Run Completed`, { props: p });
      }
      const total = PROBES.length;
      summaryEl.style.display = ``;
```

**Note:** `total` is declared one line below `runBtn.style.display = 'none'` in the original. Move the `plausible` call to after `const total = PROBES.length;`:

```js
      runBtn.style.display = `none`;
      const total = PROBES.length;
      if(typeof plausible === 'function'){
        const p = { passed, total };
        if(preset) p.preset = preset;
        if(model) p.model = model;
        plausible(`Red Team Run Completed`, { props: p });
      }
      summaryEl.style.display = ``;
      summaryEl.textContent = `Result: ${passed} of ${total} probes held.`;
```

- [ ] **Step 4: Verify in browser**

1. Run `npx serve .` and open `http://localhost:3000/?biz=serviceco`
2. Paste the verification snippet into the browser console
3. Click **Run Red Team**, then **Run All Probes**
4. Expect immediately: `[PLAUSIBLE] Red Team Run Started {"source":"sandbox","preset":"standard","model":"haiku"}`
5. As each probe completes, expect 6× `[PLAUSIBLE] Red Team Probe Result` with `probe_id` and `verdict`
6. After all finish, expect: `[PLAUSIBLE] Red Team Run Completed {"passed":N,"total":6,"preset":"standard","model":"haiku"}`
7. Also verify from the non-sandbox tab: click **BluePipe Plumbing** → **Red Team This Bot** → **Run All Probes** → events should have `"source":"header"` and no `preset` or `model` props

- [ ] **Step 5: Commit**

```bash
git add js/redteam.js
git commit -m "feat: add Plausible events to red team module (run start, per-probe result, completion)"
```
