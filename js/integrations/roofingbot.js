// Real integration — Cloudflare Worker proxy → Anthropic (Nailed It Roofing)
(function(){
  const name    = 'roofingbot';
  const API_URL = 'https://api.blackdiamondconsulting.ai/chat';
  const SITE_ID = '60e5fd54';

  function init({container}){
    const widget = buildWidget('Nailed It Roofing — Claude (via Proxy)');
    container.appendChild(widget);
    const body       = widget.querySelector('.chat-body');
    const input      = widget.querySelector('.chat-input input');
    const send       = widget.querySelector('.chat-input button');
    const modelLabel = widget.querySelector('.model-label');
    const tokenLabel = widget.querySelector('.token-label');
    const resetLink  = widget.querySelector('.reset-chat');
    resetLink.classList.add('hidden');

    const history = [];

    resetLink.addEventListener('click', e => {
      e.preventDefault();
      history.length = 0;
      modelLabel.textContent = '';
      tokenLabel.textContent = '';
      resetLink.classList.add('hidden');
      body.innerHTML = '';
      appendMsg(body, 'bot', 'Chat reset. How can I help you?');
    });

    appendMsg(body, 'bot', "Hi! Welcome to Nailed It Roofing. Need a repair, replacement, or storm damage estimate? I can help with pricing and scheduling!");
    input.focus();

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
          body: JSON.stringify({site_id: SITE_ID, messages: history})
        });
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json();
        if(data.error) throw new Error(data.error);
        history.push({role:'assistant', content: data.reply});
        thinking.className = 'msg bot';
        thinking.textContent = data.reply;
        if(data.usage){
          if(data.model) modelLabel.textContent = shortModel(data.model);
          const total = data.usage.input_tokens + data.usage.output_tokens;
          tokenLabel.textContent = total.toLocaleString() + ' tok';
          resetLink.classList.remove('hidden');
        }
      } catch(e){
        thinking.className = 'msg bot';
        thinking.textContent = 'Error: ' + e.message;
      } finally {
        send.disabled = false;
        body.scrollTop = body.scrollHeight;
      }
    }

    send.addEventListener('click', handleSend);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') handleSend(); });
  }

  function shortModel(m){
    return m.replace(/^claude-/, '').replace(/-\d{8,}$/, '');
  }

  function appendMsg(body, cls, text){
    const el = document.createElement('div');
    el.className = 'msg ' + cls;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function buildWidget(title){
    const wrap = document.createElement('div'); wrap.className = 'chat-widget';
    wrap.innerHTML = `
      <div class="chat-header">
        <div>${title}</div>
        <div class="token-count"><span class="model-label"></span><span class="token-label"></span><a class="reset-chat" href="#">Reset chat</a></div>
      </div>
      <div class="chat-body"></div>
      <div class="chat-input"><input placeholder="Type a message..."><button>Send</button></div>
    `;
    return wrap;
  }

  window.PluggableBot.register({name, init});
})();
