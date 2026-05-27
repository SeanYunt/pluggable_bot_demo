// Real integration — llama.cpp server (Gemma) on localhost:8082
(function(){
  const name = 'llamabot';
  const API_URL = 'http://10.0.0.45:8085/v1/chat/completions';
  const SYSTEM_PROMPT = `You are a helpful assistant for BluePipe Plumbing, a 24/7 emergency plumbing service.

Labor rate: $200/hr
Common jobs:
- Toilet installation: 1.5 hours
- Faucet replacement: 1 hour
- Water heater replacement: 3 hours
- Drain unclog: 0.5–1 hour

Always calculate subtotal as hours × rate. Note that tax is added at checkout.
Keep answers brief and friendly.`;

  function init({container}){
    const widget = buildWidget('BluePipe Assistant — Gemma (local)');
    container.appendChild(widget);
    const body   = widget.querySelector('.chat-body');
    const input  = widget.querySelector('.chat-input input');
    const send   = widget.querySelector('.chat-input button');
    const history = [{role:'system', content: SYSTEM_PROMPT}];
    let totalTokens = 0;
    const tokenDisplay = widget.querySelector('.token-label');
    const resetLink = widget.querySelector('.reset-chat');
    resetLink.classList.add('hidden');

    resetLink.addEventListener('click', e => {
      e.preventDefault();
      history.length = 0;
      history.push({role:'system', content: SYSTEM_PROMPT});
      totalTokens = 0;
      tokenDisplay.textContent = '';
      resetLink.classList.add('hidden');
      body.innerHTML = '';
      appendMsg(body, 'bot', 'Hi! I\'m running on your local Gemma model. How can I help you today?');
    });

    appendMsg(body, 'bot', 'Hi! I\'m running on your local Gemma model. How can I help you today?');

    async function handleSend(){
      const text = input.value.trim();
      if(!text) return;
      appendMsg(body, 'user', text);
      input.value = '';
      send.disabled = true;

      history.push({role:'user', content: text});

      const thinking = document.createElement('div');
      thinking.className = 'msg bot typing';
      thinking.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
      body.appendChild(thinking);
      body.scrollTop = body.scrollHeight;

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({model:'gemma', messages: history, stream: false})
        });
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json();
        const reply = data.choices[0].message.content;
        history.push({role:'assistant', content: reply});
        thinking.className = 'msg bot';
        thinking.textContent = reply;
        if(data.usage) {
          totalTokens += data.usage.total_tokens;
          tokenDisplay.textContent = 'Tokens used: ' + totalTokens.toLocaleString();
          resetLink.classList.remove('hidden');
        }
      } catch(e) {
        thinking.className = 'msg bot';
        thinking.textContent = 'Error reaching local model: '+e.message;
      } finally {
        send.disabled = false;
        body.scrollTop = body.scrollHeight;
      }
    }

    send.addEventListener('click', handleSend);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') handleSend(); });
  }

  function appendMsg(body, cls, text){
    const el = document.createElement('div');
    el.className = 'msg '+cls;
    el.textContent = text;
    body.appendChild(el);
    return el;
  }

  function buildWidget(title){
    const wrap = document.createElement('div'); wrap.className='chat-widget';
    wrap.innerHTML = `
      <div class="chat-header">
        <div>${title}</div>
        <div class="token-count"><span class="token-label"></span><a class="reset-chat" href="#">Reset chat</a></div>
      </div>
      <div class="chat-body"></div>
      <div class="chat-input"><input placeholder="Type a message..."><button>Send</button></div>
    `;
    return wrap;
  }

  window.PluggableBot.register({name, init});
})();
