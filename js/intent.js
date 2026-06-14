window.BotIntent = (function () {
  const AFFIRMATION_RE = /\b(thanks|thank you|great|sounds good|perfect|appreciate|confirmed|got it|see you then|that works|will do|yes|yep|awesome|excellent|booked|done)\b/i;

  // State machine per intent slug (stored in pendingConversions Map):
  //   'fired'         → user expressed intent; waiting for bot fulfillment signal
  //   'bot_solicited' → bot asked if user wants this (no prior user signal); waiting for affirmation
  //   'bot_offered'   → bot gave fulfillment/confirmation; waiting for user affirmation
  //   'converted'     → Chat Conversion fired; done
  const INTENTS = [
    {
      slug: `emergency`,
      label: `Emergency`,
      re: /\b(emergency|flooding|flood|burst pipe|no power|power outage|sparks|electrical fire|urgent|asap)\b/i,
      fulfillRe: /\b(dispatch(ing)?|on (the|my) way|eta|sending (a |someone|a technician)|heading over|en route|technician will)\b/i,
      solicitRe: null,
    },
    {
      slug: `inspection`,
      label: `Inspection Request`,
      re: /\b(inspect(ion)?|damage assessment|storm damage|insurance claim|assess damage)\b/i,
      fulfillRe: /\b(schedule|book(ed)?|available|come out|we('ll| can) (send|come|be there)|inspection (on|at|for))\b/i,
      solicitRe: /\b(schedule (a |an )?inspection|come out and (assess|look|check|inspect)|send (a |someone|an inspector)|assess the (damage|situation)|take a look at)\b/i,
    },
    {
      slug: `appointment`,
      label: `Appointment Request`,
      re: /\b(schedule|book|appointment|come out|come by|when can you|send someone|service call|dispatch|availability)\b/i,
      fulfillRe: /\b(scheduled|booked|confirmed|see you|appointment (on|at|for)|available (on|at|this)|we('ll| will) (be|send|have))\b/i,
      solicitRe: /\b(want to (schedule|book)|schedule (a |an )?(visit|appointment|service call|time)|book (a |an )?(visit|appointment|service call|time)|set up (a |an )?(appointment|visit|service)|can (schedule|book) (you|a|an)|happy to (schedule|book)|like to (schedule|book))\b/i,
    },
    {
      slug: `estimate`,
      label: `Estimate Request`,
      re: /\b(estimate|quote|how much (does|would|will|do)|what (does|would|will) (it|this|that) cost|price(s|ing)?|ballpark|charge (for|to))\b/i,
      fulfillRe: /(\$[\d,]+|\d+\s*dollars?)|(estimate|quote|price|cost|range)\s+(is|of|for|around|starts?|between|from)/i,
      solicitRe: /\b(want (a |an )?(quote|estimate|price)|would you like (a |an )?(quote|estimate|price)|provide (a |an )?(quote|estimate)|get you (a |an )?(quote|estimate)|happy to (quote|give you an estimate))\b/i,
    }
  ];

  function track(bizLabel, text, fired, pending) {
    if (pending) {
      const isAffirmation = AFFIRMATION_RE.test(text);

      if (isAffirmation) {
        for (const [slug, state] of pending) {
          const intent = INTENTS.find(i => i.slug === slug);
          if (!intent) continue;

          if (state === `bot_offered`) {
            // Two-signal gate complete: bot offered + user affirmed → conversion
            pending.set(slug, `converted`);
            console.log(`[BotIntent] conversion`, bizLabel, `→`, intent.label);
            if (typeof plausible === `function`) {
              plausible(`Chat Conversion`, { props: { biz: bizLabel, intent: intent.label } });
            }
          } else if (state === `bot_solicited`) {
            // Bot solicited + user affirmed → fire secondary Chat Intent, enter normal flow
            fired.add(slug);
            pending.set(slug, `fired`);
            console.log(`[BotIntent] secondary intent`, bizLabel, `→`, intent.label);
            if (typeof plausible === `function`) {
              plausible(`Chat Intent`, { props: { biz: bizLabel, intent: intent.label } });
            }
          }
        }
      }
    }

    // Detect new intents from user text
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

  // Called after each bot reply. Two jobs:
  //   1. Advance 'fired' → 'bot_offered' when the reply contains a fulfillment signal
  //   2. Add 'bot_solicited' when the bot asks if the user wants something not yet expressed
  function trackReply(botReply, pending) {
    if (!pending) return;
    for (const intent of INTENTS) {
      const state = pending.get(intent.slug);

      if (state === `fired` && intent.fulfillRe && intent.fulfillRe.test(botReply)) {
        pending.set(intent.slug, `bot_offered`);
        console.log(`[BotIntent] bot_offered`, intent.slug);
      } else if (state === undefined && intent.solicitRe && intent.solicitRe.test(botReply)) {
        pending.set(intent.slug, `bot_solicited`);
        console.log(`[BotIntent] bot_solicited`, intent.slug);
      }
    }
  }

  return { track, trackReply };
})();
