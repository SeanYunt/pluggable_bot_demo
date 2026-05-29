// Real integration — Cloudflare Worker proxy → Anthropic
(function(){
  const name = 'plumbingbot';
  const API_URL = 'https://api.blackdiamondconsulting.ai/chat';
  const SITE_ID = '1ec42202';

  function init({container}){
    const widget = buildWidget('BluePipe Assistant — Claude (via Proxy)');
    container.appendChild(widget);
    const body  = widget.querySelector('.chat-body');
    const input = widget.querySelector('.chat-input input');
    const send  = widget.querySelector('.chat-input button');
    const tokenLabel = widget.querySelector('.token-label');
    const resetLink  = widget.querySelector('.reset-chat');
    resetLink.classList.add('hidden');

    const history = [];

    resetLink.addEventListener('click', e => {
      e.preventDefault();
      history.length = 0;
      tokenLabel.textContent = '';
      resetLink.classList.add('hidden');
      body.innerHTML = '';
      appendMsg(body, 'bot', 'Chat reset. How can I help you?');
    });

    appendMsg(body, 'bot', 'Hi! I\'m the BluePipe Plumbing assistant. Got a leak, clog, or need a quote? I\'m here to help 24/7.');
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
          const total = data.usage.input_tokens + data.usage.output_tokens;
          tokenLabel.textContent = 'Tokens used: ' + total.toLocaleString();
          resetLink.classList.remove('hidden');
        }
      } catch(e){
        thinking.className = 'msg bot';
        thinking.textContent = 'Error: '+e.message;
      } finally {
        send.disabled = false;
        body.scrollTop = body.scrollHeight;
      }
    }

    send.addEventListener('click', handleSend);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') handleSend(); });
  }

  function renderMarkdown(text){
    return text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/\n/g,'<br>');
  }

  function appendMsg(body, cls, text){
    const el = document.createElement('div');
    el.className = 'msg '+cls;
    if(cls === 'bot') el.innerHTML = renderMarkdown(text);
    else el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
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
