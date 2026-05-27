// Simulated Landbot-style widget (guided quick responses)
(function(){
  const name = 'landbot';

  function init({container}){
    const widget = buildWidget('Landbot Demo — Quick Help');
    container.appendChild(widget);
    const body = widget.querySelector('.chat-body');
    appendMsg(body,'bot','Welcome to BluePipe — choose an option:');
    const options = ['Request emergency visit','Get pricing','Ask a question'];
    const optRow = document.createElement('div'); optRow.style.padding='8px';
    options.forEach(opt=>{
      const b = document.createElement('button'); b.textContent=opt; b.style.margin='6px';
      b.addEventListener('click',()=>{
        appendMsg(body,'user',opt);
        // simple canned followup
        setTimeout(()=>appendMsg(body,'bot',`You selected: ${opt}. We'll contact you shortly.`),400);
      });
      optRow.appendChild(b);
    });
    body.appendChild(optRow);
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
