// Real integration — Cloudflare Worker proxy → Anthropic (Sparky's Electrical)
(function(){
  const name    = 'sparkysbot';
  const API_URL = 'https://api.blackdiamondconsulting.ai/chat';
  const SITE_ID = '8877d8fc';

  function init({container}){
    const widget = buildWidget("Sparky's Assistant — Claude (via Proxy)");
    container.appendChild(widget);
    const body       = widget.querySelector('.chat-body');
    const input      = widget.querySelector('.chat-input input');
    const send       = widget.querySelector('.chat-input button');
    const modelLabel = widget.querySelector('.model-label');
    const tokenLabel = widget.querySelector('.token-label');
    const resetLink  = widget.querySelector('.reset-chat');
    resetLink.classList.add('hidden');

    const history = [];
    const firedIntents = new Set();
    const pendingConversions = new Map();

    resetLink.addEventListener('click', e => {
      e.preventDefault();
      history.length = 0;
      firedIntents.clear();
      pendingConversions.clear();
      modelLabel.textContent = '';
      tokenLabel.textContent = '';
      resetLink.classList.add('hidden');
      body.innerHTML = '';
      appendMsg(body, 'bot', 'Chat reset. How can I help you?');
    });

    appendMsg(body, 'bot', "Hi! I'm Sparky's Electrical assistant. Need a quote on an outlet, panel upgrade, EV charger, or anything else? Ask away!");
    input.focus();

    async function handleSend(){
      const text = input.value.trim();
      if(!text) return;
      if(window.BotIntent) window.BotIntent.track("Sparky's Electrical Services", text, firedIntents, pendingConversions);
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
        if(window.BotIntent) window.BotIntent.trackReply(data.reply, pendingConversions, "Sparky's Electrical Services");
        thinking.className = 'msg bot';
        thinking.textContent = data.reply;
        if(data.usage){
          if(data.model) modelLabel.textContent = shortModel(data.model);
          const total = data.usage.input_tokens + data.usage.output_tokens;
          tokenLabel.textContent = total.toLocaleString() + ' tokens';
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
