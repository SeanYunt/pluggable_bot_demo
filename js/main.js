// Pluggable bot loader with tab-based business switching
(function(){
  const root        = document.getElementById('chat-root');
  const openBtn     = document.getElementById('openChat');
  const redTeamBtn  = document.getElementById('redTeamBtn');
  const demoContent = document.getElementById('demo-content');
  const rtRoot      = document.getElementById('rt-root');
  const scRoot      = document.getElementById('sc-root');
  const html        = document.documentElement;

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
      siteId:  '1ec42202',
      trade:   'plumbing',
    },
    sparky: {
      name:    "Sparky's Electrical Services",
      tagline: 'Licensed electrician — residential & commercial',
      about:   "Sparky's Electrical provides licensed electrical services for homes and businesses. Panel upgrades, EV chargers, outlets, ceiling fans, and more.",
      bot:     'sparkysbot',
      siteId:  '8877d8fc',
      trade:   'electrical work',
    },
    roofing: {
      name:    'Nailed It Roofing',
      tagline: 'Residential & commercial roofing done right',
      about:   'Nailed It Roofing handles everything from full replacements to leak repairs and storm damage assessments. We work with most insurance companies.',
      bot:     'roofingbot',
      siteId:  '60e5fd54',
      trade:   'roofing',
    },
    serviceco: {
      name:    'Service Co',
      tagline: 'System prompt sandbox — see how strictness shapes AI behavior',
      about:   'Experiment with Loose, Standard, and Strict system prompts. Run the same red team probes against each preset and see how prompt design changes what the bot will and won\'t say.',
      bot:     'servicecobot',
      siteId:  'a2abacdf',
      trade:   'customer service',
      isSandbox: true,
    },
  };

  let currentBiz = 'serviceco';

  function loadIntegration(name, container, opts){
    container = container || root;
    opts = opts || {};
    container.innerHTML = '';
    const initArgs = Object.assign({container}, opts);
    if(window.PluggableBot.adapters[name]){
      window.PluggableBot.adapters[name].init(initArgs);
      return Promise.resolve();
    }
    return new Promise((resolve, reject)=>{
      const script = document.createElement('script');
      script.src = `js/integrations/${name}.js`;
      script.onload = ()=>{
        if(window.PluggableBot.adapters[name]){
          window.PluggableBot.adapters[name].init(initArgs);
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
    const isSandbox = !!data.isSandbox;

    html.dataset.biz = biz;

    document.querySelector('.biz-name').textContent    = data.name;
    document.querySelector('.biz-tagline').textContent = data.tagline;
    document.querySelector('.biz-about').textContent   = data.about;
    document.title = data.name + ' — Bot Demo';

    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.biz === biz)
    );

    root.innerHTML = '';
    openBtn.style.display    = isSandbox ? 'none' : '';
    redTeamBtn.style.display = isSandbox ? 'none' : '';

    if(isSandbox){
      demoContent.style.display = 'none';
      scRoot.style.display = 'block';
      loadIntegration(data.bot, scRoot, {
        onRedTeam: (opts) => launchRedTeamFromSandbox(biz, opts),
      }).catch(err => console.error(err));
    } else {
      demoContent.style.display = '';
      scRoot.style.display = 'none';
      scRoot.innerHTML = '';
    }

    const url = new URL(location.href);
    url.searchParams.set('biz', biz);
    url.searchParams.delete('mode');
    history.replaceState({}, '', url.toString());
  }

  function launchRedTeam(biz) {
    const data = businesses[biz] || businesses[currentBiz];

    const url = new URL(location.href);
    url.searchParams.set('mode', 'redteam');
    history.replaceState({}, '', url.toString());

    root.innerHTML = '';
    demoContent.style.display = 'none';
    rtRoot.innerHTML = '';
    rtRoot.classList.add('rt-active');

    function doLaunch() {
      window.RedTeam.launch({
        container: rtRoot,
        bizName:   data.name,
        trade:     data.trade,
        siteId:    data.siteId,
        onBack:    exitRedTeam,
      });
    }

    if (window.RedTeam) {
      doLaunch();
    } else {
      const script = document.createElement('script');
      script.src = 'js/redteam.js';
      script.onload = doLaunch;
      script.onerror = () => { rtRoot.textContent = 'Failed to load red team module.'; };
      document.body.appendChild(script);
    }
  }

  function exitRedTeam() {
    rtRoot.innerHTML = '';
    rtRoot.classList.remove('rt-active');
    demoContent.style.display = '';

    const url = new URL(location.href);
    url.searchParams.delete('mode');
    history.replaceState({}, '', url.toString());
  }

  function launchRedTeamFromSandbox(biz, opts) {
    const data = businesses[biz];

    const url = new URL(location.href);
    url.searchParams.set('mode', 'redteam');
    history.replaceState({}, '', url.toString());

    scRoot.style.display = 'none';
    rtRoot.innerHTML = '';
    rtRoot.classList.add('rt-active');

    function doLaunch(){
      window.RedTeam.launch({
        container: rtRoot,
        bizName:   data.name,
        trade:     data.trade,
        siteId:    data.siteId,
        preset:    opts && opts.preset,
        model:     opts && opts.model,
        onBack: () => {
          rtRoot.innerHTML = '';
          rtRoot.classList.remove('rt-active');
          const url2 = new URL(location.href);
          url2.searchParams.delete('mode');
          history.replaceState({}, '', url2.toString());
          switchBiz(biz);
        },
      });
    }

    if(window.RedTeam){
      doLaunch();
    } else {
      const script = document.createElement('script');
      script.src = 'js/redteam.js';
      script.onload = doLaunch;
      script.onerror = () => { rtRoot.textContent = 'Failed to load red team module.'; };
      document.body.appendChild(script);
    }
  }

  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => {
      exitRedTeam();
      switchBiz(tab.dataset.biz);
    })
  );

  openBtn.addEventListener('click', ()=>{
    if(root.children.length){
      root.innerHTML = '';
    } else {
      loadIntegration(businesses[currentBiz].bot).catch(err => console.error(err));
    }
  });

  redTeamBtn.addEventListener('click', () => launchRedTeam(currentBiz));

  const params = new URLSearchParams(location.search);
  const initBiz = params.get('biz') || 'serviceco';
  switchBiz(initBiz);
  if (params.get('mode') === 'redteam') {
    if(businesses[initBiz] && businesses[initBiz].isSandbox){
      launchRedTeamFromSandbox(initBiz);
    } else {
      launchRedTeam(initBiz);
    }
  }

})();
