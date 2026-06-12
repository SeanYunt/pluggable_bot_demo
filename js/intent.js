window.BotIntent = (function () {
  const INTENTS = [
    {
      slug: 'emergency',
      label: 'Emergency',
      re: /\b(emergency|flooding|flood|burst pipe|no power|power outage|sparks|electrical fire|urgent|asap)\b/i
    },
    {
      slug: 'inspection',
      label: 'Inspection Request',
      re: /\b(inspect(ion)?|damage assessment|storm damage|insurance claim|assess damage)\b/i
    },
    {
      slug: 'appointment',
      label: 'Appointment Request',
      re: /\b(schedule|book|appointment|come out|come by|when can you|send someone|service call|dispatch|availability)\b/i
    },
    {
      slug: 'estimate',
      label: 'Estimate Request',
      re: /\b(estimate|quote|how much (does|would|will|do)|what (does|would|will) (it|this|that) cost|price(s|ing)?|ballpark|charge (for|to))\b/i
    }
  ];

  function track(bizLabel, text, fired) {
    for (const intent of INTENTS) {
      if (!intent.re.test(text)) continue;
      if (fired.has(intent.slug)) continue;
      fired.add(intent.slug);
      console.log('[BotIntent]', bizLabel, '→', intent.label);
      if (typeof plausible === 'function') {
        plausible('Chat Intent', { props: { biz: bizLabel, intent: intent.label } });
      }
    }
  }

  return { track };
})();
