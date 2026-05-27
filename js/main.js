// Pluggable bot loader
(function(){
  const root = document.getElementById('chat-root');
  const select = document.getElementById('botSelect');
  const openBtn = document.getElementById('openChat');

  // Simple registry that integrations call to register themselves
  window.PluggableBot = window.PluggableBot || {
    adapters: {},
    register(adapter){
      if(!adapter || !adapter.name || !adapter.init) return;
      this.adapters[adapter.name] = adapter;
      console.log('Registered adapter', adapter.name);
    }
  };

  function getSelectedFromURL(){
    const p = new URLSearchParams(location.search);
    return p.get('bot');
  }

  function setURLParam(name){
    const url = new URL(location.href);
    url.searchParams.set('bot', name);
    history.replaceState({}, '', url.toString());
  }

  function loadIntegration(name){
    // remove existing widget
    root.innerHTML = '';
    // if adapter already registered, init it
    if(window.PluggableBot.adapters[name]){
      window.PluggableBot.adapters[name].init({container:root});
      return Promise.resolve();
    }
    // else load script dynamically
    return new Promise((resolve, reject)=>{
      const script = document.createElement('script');
      script.src = `js/integrations/${name}.js`;
      script.onload = ()=>{
        // adapter should register itself on load
        if(window.PluggableBot.adapters[name]){
          window.PluggableBot.adapters[name].init({container:root});
          resolve();
        } else {
          reject(new Error('Adapter did not register: '+name));
        }
      };
      script.onerror = ()=>reject(new Error('Failed to load '+script.src));
      document.body.appendChild(script);
    });
  }

  function openSelected(){
    const name = select.value;
    setURLParam(name);
    loadIntegration(name).catch(err=>{
      console.error(err);
      alert('Could not load integration: '+err.message);
    });
  }

  // initialize select from URL if present
  const initial = getSelectedFromURL();
  if(initial){
    // set select to value if exists
    for(const opt of select.options){
      if(opt.value === initial){ select.value = initial; break; }
    }
    // auto-open
    loadIntegration(select.value).catch(()=>{});
  }

  openBtn.addEventListener('click', openSelected);
  // allow quick switching while open
  select.addEventListener('change', ()=>{
    const name = select.value;
    setURLParam(name);
    // if widget present, reload
    if(root.children.length) loadIntegration(name).catch(()=>{});
  });

})();
