// Simulated Local AI integration — simple canned responses
(function(){
  const name = 'localbot';

  function init({container}){
    const widget = buildWidget('BluePipe Assistant — Local AI');
    container.appendChild(widget);
    const body = widget.querySelector('.chat-body');
    const input = widget.querySelector('.chat-input input');
    const send = widget.querySelector('.chat-input button');

    appendMsg(body, 'bot', 'Hi! How can I help you today? Ask about booking, pricing, or a plumbing issue.');

    send.addEventListener('click', ()=>{
      const text = input.value.trim(); if(!text) return;
      appendMsg(body, 'user', text);
      input.value='';
      // fake AI response
      setTimeout(()=>{
        const reply = cannedReply(text);
        appendMsg(body, 'bot', reply);
        body.scrollTop = body.scrollHeight;
      }, 700 + Math.random()*800);
    });
  }

  function cannedReply(text){
    text = text.toLowerCase();
    if(text.match(/book|appointment|schedule/)) return 'I can help schedule. What day/time works for you?';
    if(text.match(/price|cost/)) return 'Typical service calls start at $79 — I can get more details if you share the issue.';
    if(text.match(/leak|water|pipe/)) return 'For leaks we recommend turning off the water and booking an emergency visit. Want me to book now?';
    return "Thanks — a human rep will follow up. Meanwhile, can you share your address or phone number?";
  }

  function appendMsg(body, cls, text){
    const el = document.createElement('div'); el.className='msg '+cls; el.textContent=text; body.appendChild(el);
  }

  function buildWidget(title){
    const wrap = document.createElement('div'); wrap.className='chat-widget';
    wrap.innerHTML = `
      <div class="chat-header">${title}</div>
      <div class="chat-body"></div>
      <div class="chat-input"><input placeholder="Type a message..."><button>Send</button></div>
    `;
    return wrap;
  }

  // register
  window.PluggableBot.register({name, init});
})();
