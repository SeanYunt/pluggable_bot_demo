// Pluggable bot loader with tab-based business switching
(function(){
  const root    = document.getElementById('chat-root');
  const openBtn = document.getElementById('openChat');
  const html    = document.documentElement;

  window.PluggableBot = window.PluggableBot || {
    adapters: {},
    register(adapter){
      if(!adapter || !adapter.name || !adapter.init) return;
      this.adapters[adapter.name] = adapter;
    }
  };

  const businesses = {
    bluepipe: {
      name:    'BluePipe Plumbing',
      tagline: '24/7 emergency plumbing service',
      about:   'BluePipe Plumbing provides 24/7 emergency plumbing and repairs. Fixtures, drains, water heaters, and more — residential and commercial.',
      bot:     'plumbingbot',
    },
    sparky: {
      name:    "Sparky's Electrical Services",
      tagline: 'Licensed electrician — residential & commercial',
      about:   "Sparky's Electrical provides licensed electrical services for homes and businesses. Panel upgrades, EV chargers, outlets, ceiling fans, and more.",
      bot:     'sparkysbot',
    },
    roofing: {
      name:    'Nailed It Roofing',
      tagline: 'Residential & commercial roofing done right',
      about:   'Nailed It Roofing handles everything from full replacements to leak repairs and storm damage assessments. We work with most insurance companies.',
      bot:     'roofingbot',
    },
  };

  let currentBiz = 'bluepipe';

  function loadIntegration(name){
    root.innerHTML = '';
    if(window.PluggableBot.adapters[name]){
      window.PluggableBot.adapters[name].init({container: root});
      return Promise.resolve();
    }
    return new Promise((resolve, reject)=>{
      const script = document.createElement('script');
      script.src = `js/integrations/${name}.js`;
      script.onload = ()=>{
        if(window.PluggableBot.adapters[name]){
          window.PluggableBot.adapters[name].init({container: root});
          resolve();
        } else {
          reject(new Error('Adapter did not register: ' + name));
        }
      };
      script.onerror = ()=> reject(new Error('Failed to load ' + script.src));
      document.body.appendChild(script);
    });
  }

  function switchBiz(biz){
    if(!businesses[biz]) return;
    currentBiz = biz;
    const data = businesses[biz];

    html.dataset.biz = biz;

    document.querySelector('.biz-name').textContent    = data.name;
    document.querySelector('.biz-tagline').textContent = data.tagline;
    document.querySelector('.biz-about').textContent   = data.about;
    document.title = data.name + ' — Bot Demo';

    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.biz === biz)
    );

    root.innerHTML = '';

    const url = new URL(location.href);
    url.searchParams.set('biz', biz);
    history.replaceState({}, '', url.toString());
  }

  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', ()=> switchBiz(tab.dataset.biz))
  );

  openBtn.addEventListener('click', ()=>{
    // toggle: close if already open, open if not
    if(root.children.length){
      root.innerHTML = '';
    } else {
      loadIntegration(businesses[currentBiz].bot).catch(err => console.error(err));
    }
  });

  const params = new URLSearchParams(location.search);
  switchBiz(params.get('biz') || 'bluepipe');

})();
