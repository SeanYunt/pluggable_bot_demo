window.BotIntent = (function () {
  const AFFIRMATION_RE = /\b(thanks|thank you|great|sounds good|perfect|appreciate|confirmed|got it|see you then|that works|will do|yes|yep|awesome|excellent|booked|done)\b/i;

  // Matches explicit bot redirect-to-phone or inability-to-fulfill language
  const DEFLECTION_RE = /\b(not able to (schedule|book|dispatch)|can'?t (schedule|book|dispatch)|unable to (schedule|book)|please call|give us a call|call us|call now|call (our|the) (team|office|number|line)|contact us (directly|to schedule|to book)|reach out (to us )?by phone)\b/i;

  // State machine per intent slug (stored in pendingConversions Map):
  //   'fired'         → user expressed intent; waiting for bot fulfillment signal
  //   'bot_solicited' → bot asked if user wants this (no prior user signal); waiting for affirmation
  //   'bot_offered'   → bot gave fulfillment/confirmation; waiting for user affirmation
  //   'bot_deflected' → bot explicitly redirected to phone/other channel; Chat Deflection fired
  //   'converted'     → user affirmed a bot_offered intent; Chat Conversion fired
  const INTENTS = [
    {
      slug: `emergency`,
      label: `Emergency`,
      re: /\b(emergency|flooding|flood|burst pipe|no power|power outage|sparks|electrical fire|urgent|asap)\b/i,
      fulfillRe: /\b(dispatch(ing)?|on (the|my) way|eta|sending (a |someone|a technician)|heading over|en route|technician will|prioritize|expedite|emergency (service|scheduling|appointment)|earliest available|rush)\b/i,
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
            pending.set(slug, `converted`);
            console.log(`[BotIntent] conversion`, bizLabel, `→`, intent.label);
            if (typeof plausible === `function`) {
              plausible(`Chat Conversion`, { props: { biz: bizLabel, intent: intent.label } });
            }
          } else if (state === `bot_solicited`) {
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

  // Called after each bot reply. Jobs:
  //   1. Advance 'fired' → 'bot_offered' via fulfillRe
  //   2. Add 'bot_solicited' via solicitRe for intents not yet in pending
  //   3. Cascade: appointment/inspection bot_offered → emergency bot_offered
  //   4. Deflection: bot redirect-to-phone → fire Chat Deflection for remaining 'fired' intents
  function trackReply(botReply, pending, bizLabel) {
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

    // Cascade: scheduling fulfillment implies emergency fulfillment
    if (pending.get(`emergency`) === `fired`) {
      const schedulingFulfilled = [`appointment`, `inspection`].some(
        slug => pending.get(slug) === `bot_offered`
      );
      if (schedulingFulfilled) {
        pending.set(`emergency`, `bot_offered`);
        console.log(`[BotIntent] bot_offered emergency (cascade)`);
      }
    }

    // Deflection: bot explicitly redirected — mark remaining fired intents as deflected
    if (DEFLECTION_RE.test(botReply)) {
      for (const [slug, state] of pending) {
        if (state !== `fired`) continue;
        const intent = INTENTS.find(i => i.slug === slug);
        if (!intent) continue;
        pending.set(slug, `bot_deflected`);
        console.log(`[BotIntent] bot_deflected`, slug);
        if (bizLabel && typeof plausible === `function`) {
          plausible(`Chat Deflection`, { props: { biz: bizLabel, intent: intent.label } });
        }
      }
    }
  }

  return { track, trackReply };
})();
