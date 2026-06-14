window.BotIntent = (function () {
  const AFFIRMATION_RE = /\b(thanks|thank you|great|sounds good|perfect|appreciate|confirmed|got it|see you then|that works|will do|yes|yep|awesome|excellent|booked|done)\b/i;

  const INTENTS = [
    {
      slug: `emergency`,
      label: `Emergency`,
      re: /\b(emergency|flooding|flood|burst pipe|no power|power outage|sparks|electrical fire|urgent|asap)\b/i,
      fulfillRe: /\b(dispatch(ing)?|on (the|my) way|eta|sending (a |someone|a technician)|heading over|en route|technician will)\b/i,
    },
    {
      slug: `inspection`,
      label: `Inspection Request`,
      re: /\b(inspect(ion)?|damage assessment|storm damage|insurance claim|assess damage)\b/i,
      fulfillRe: /\b(schedule|book(ed)?|available|come out|we('ll| can) (send|come|be there)|inspection (on|at|for))\b/i,
    },
    {
      slug: `appointment`,
      label: `Appointment Request`,
      re: /\b(schedule|book|appointment|come out|come by|when can you|send someone|service call|dispatch|availability)\b/i,
      fulfillRe: /\b(scheduled|booked|confirmed|see you|appointment (on|at|for)|available (on|at|this)|we('ll| will) (be|send|have))\b/i,
    },
    {
      slug: `estimate`,
      label: `Estimate Request`,
      re: /\b(estimate|quote|how much (does|would|will|do)|what (does|would|will) (it|this|that) cost|price(s|ing)?|ballpark|charge (for|to))\b/i,
      fulfillRe: /(\$[\d,]+|\d+\s*dollars?)|(estimate|quote|price|cost|range)\s+(is|of|for|around|starts?|between|from)/i,
    }
  ];

  // Called with each user message.
  // fired: Set — deduplicates Chat Intent events per conversation.
  // pending: Map (optional) — tracks conversion state per intent slug:
  //   'fired'      → intent detected, waiting for bot fulfillment signal
  //   'bot_offered' → bot gave a fulfillment signal, waiting for user affirmation
  //   'converted'  → Chat Conversion event fired, done
  function track(bizLabel, text, fired, pending) {
    // Two-signal gate: if bot already offered, a user affirmation fires the conversion
    if (pending && AFFIRMATION_RE.test(text)) {
      for (const [slug, state] of pending) {
        if (state !== `bot_offered`) continue;
        const intent = INTENTS.find(i => i.slug === slug);
        if (!intent) continue;
        pending.set(slug, `converted`);
        console.log(`[BotIntent] conversion`, bizLabel, `→`, intent.label);
        if (typeof plausible === `function`) {
          plausible(`Chat Conversion`, { props: { biz: bizLabel, intent: intent.label } });
        }
      }
    }

    for (const intent of INTENTS) {
      if (!intent.re.test(text)) continue;
      if (fired.has(intent.slug)) continue;
      fired.add(intent.slug);
      if (pending && !pending.has(intent.slug)) {
        pending.set(intent.slug, `fired`);
      }
      console.log(`[BotIntent]`, bizLabel, `→`, intent.label);
      if (typeof plausible === `function`) {
        plausible(`Chat Intent`, { props: { biz: bizLabel, intent: intent.label } });
      }
    }
  }

  // Called with each bot reply. Advances pending intents from 'fired' → 'bot_offered'
  // when the reply contains a fulfillment signal for that intent type.
  function trackReply(botReply, pending) {
    if (!pending) return;
    for (const [slug, state] of pending) {
      if (state !== `fired`) continue;
      const intent = INTENTS.find(i => i.slug === slug);
      if (intent && intent.fulfillRe && intent.fulfillRe.test(botReply)) {
        pending.set(slug, `bot_offered`);
        console.log(`[BotIntent] bot_offered`, slug);
      }
    }
  }

  return { track, trackReply };
})();
