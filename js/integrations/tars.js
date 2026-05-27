// Simulated TARS-style conversational form adapter
(function(){
  const name = 'tars';

  function init({container}){
    const widget = buildWidget('TARS Demo — Booking Bot');
    container.appendChild(widget);
    const body = widget.querySelector('.chat-body');
    // start with conversational form
    showQuestion(body, 'Hi! What service do you need? (e.g., leak repair, installation)');
  }

  function showQuestion(body, q){
    const qEl = document.createElement('div'); qEl.className='msg bot'; qEl.textContent=q; body.appendChild(qEl);
    const inputRow = document.createElement('div'); inputRow.className='chat-input';
    const input = document.createElement('input'); input.placeholder='Your answer...';
    const btn = document.createElement('button'); btn.textContent='Next';
    inputRow.appendChild(input); inputRow.appendChild(btn);
    body.parentElement.appendChild(inputRow);
    btn.addEventListener('click', ()=>{
      const val = input.value.trim(); if(!val) return;
      appendMsg(body,'user',val);
      inputRow.remove();
      // follow up question
      setTimeout(()=>{
        appendMsg(body,'bot','Thanks — what date would you prefer?');
        // simple capture then finish
        const rInputRow = document.createElement('div'); rInputRow.className='chat-input';
        const rinput = document.createElement('input'); rinput.placeholder='YYYY-MM-DD or "tomorrow"';
        const rbtn = document.createElement('button'); rbtn.textContent='Finish';
        rInputRow.appendChild(rinput); rInputRow.appendChild(rbtn);
        body.parentElement.appendChild(rInputRow);
        rbtn.addEventListener('click', ()=>{
          const when = rinput.value.trim()||'as soon as possible';
          appendMsg(body,'user',when);
          rInputRow.remove();
          setTimeout(()=>appendMsg(body,'bot',`Great — we've penciled you in for ${when}. A confirmation link will be sent.`),500);
        });
      },700);
    });
  }

  function appendMsg(body, cls, text){
    const el = document.createElement('div'); el.className='msg '+cls; el.textContent=text; body.appendChild(el);
  }

  function buildWidget(title){
    const wrap = document.createElement('div'); wrap.className='chat-widget';
    wrap.innerHTML = `
      <div class="chat-header">${title}</div>
      <div class="chat-body"></div>
    `;
    return wrap;
  }

  window.PluggableBot.register({name, init});
})();
