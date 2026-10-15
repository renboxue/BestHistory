/* BestHistory public demo — fake sample visits; real local UI filtering; no production services. */
(() => {
  'use strict';
  const demo=window.BHDemoData;
  if(!demo){document.body.textContent='Sample demo data could not be loaded.';return;}
  const history=demo.records;
  const profiles=structuredClone(demo.profiles);
  const state={view:'websites',query:'',tag:'all',sort:'recent',selected:null,siteView:'recent',vaultConfigured:false,vaultUnlocked:false,vaultPassword:null,autoLockSeconds:30,autoLockTimer:null,pendingPrivate:null,manualPrivate:new Set(),pinned:new Set(['quietfocus.example','huegarden.example']),hidden:new Set(['paperstack.example']),incognitoAdded:false,aiPending:null};
  const SAMPLE_MEMORY='I visited a site that reminded me to take breaks whenever I got distracted.';
  const SAMPLE_TARGET='quietfocus.example';
  const privateSamples=[
    {domain:'personal-library.example',profile:{name:'Personal Library',category:'Private reading',tags:['private'],note:'Fictional reading collected in a private window.'},lastVisitTime:Date.now()-220000000,visitCount:4,pages:[{title:'A private reading list',url:'https://personal-library.example/saved-reading',lastVisitTime:Date.now()-220000000,visitCount:4,domain:'personal-library.example'}]},
    {domain:'secret-garden.example',profile:{name:'Secret Garden',category:'Personal journal',tags:['private'],note:'Fictional personal notes saved outside ordinary history.'},lastVisitTime:Date.now()-440000000,visitCount:2,pages:[{title:'Personal reflections',url:'https://secret-garden.example/notes',lastVisitTime:Date.now()-440000000,visitCount:2,domain:'secret-garden.example'}]}
  ];
  const $=id=>document.getElementById(id);
  const safe=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const niceDate=t=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(new Date(t));
  const niceTime=t=>new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit'}).format(new Date(t));
  function groupHistory(){
    const m=new Map();
    for(const rec of history){
      let s=m.get(rec.domain);
      if(!s){s={domain:rec.domain,profile:profiles[rec.domain],pages:[],lastVisitTime:0,visitCount:0};m.set(rec.domain,s);}
      s.pages.push(rec);s.visitCount+=rec.visitCount;s.lastVisitTime=Math.max(s.lastVisitTime,rec.lastVisitTime);
    }
    return [...m.values()];
  }
  for(const site of privateSamples)profiles[site.domain]=structuredClone(site.profile);
  function matches(site,query){
    // The installed app matches the normalized full query against its local fields.
    const term=query.trim().toLowerCase();
    if(!term)return {match:true,score:0};
    const fields=[site.profile.name,site.domain,site.profile.category,site.profile.note,...site.profile.tags,...site.pages.map(p=>p.title),...site.pages.map(p=>p.url)];
    const hits=fields.filter(v=>String(v||'').toLowerCase().includes(term));
    return {match:hits.length>0,score:hits.length};
  }
  function privateDomains(){return new Set([...privateSamples.map(s=>s.domain),...state.manualPrivate]);}
  function allSites(){
    const publicSites=groupHistory().filter(s=>!state.manualPrivate.has(s.domain));
    if(!state.vaultUnlocked)return publicSites;
    const moved=groupHistory().filter(s=>state.manualPrivate.has(s.domain));
    const incognito=state.incognitoAdded?[{domain:'midnight-journal.example',profile:{name:'Midnight Journal',category:'Incognito visit',tags:['private'],note:'Simulated incognito visit.'},lastVisitTime:Date.now(),visitCount:1,pages:[{title:'A page opened in incognito (simulated)',url:'https://midnight-journal.example/something',lastVisitTime:Date.now(),visitCount:1,domain:'midnight-journal.example'}]}]:[];
    return [...publicSites,...privateSamples,...moved,...incognito];
  }
  function sitesFiltered(){
    const priv=privateDomains();
    if(state.incognitoAdded)priv.add('midnight-journal.example');
    return allSites().map(site=>({...site,match:matches(site,state.query)}))
      .filter(s=>{
        if(!s.match.match)return false;
        if(state.tag!=='all'&&!s.profile.tags.includes(state.tag))return false;
        if(state.siteView==='private')return state.vaultUnlocked&&priv.has(s.domain);
        if(state.siteView==='hidden')return state.hidden.has(s.domain);
        if(state.hidden.has(s.domain))return false;
        if(state.siteView==='pinned')return state.pinned.has(s.domain);
        if(state.siteView==='unorganized')return s.domain==='notebridge.example';
        return true;
      }).sort((a,b)=>(state.siteView==='frequent'||state.sort==='frequent')?b.visitCount-a.visitCount:state.siteView==='all'||state.sort==='az'?a.profile.name.localeCompare(b.profile.name):b.lastVisitTime-a.lastVisitTime);
  }
  function icon(site){return safe(site.profile.name[0].toUpperCase());}
  function notify(msg){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.add('hidden'),3500);}
  function showView(name){
    state.view=name;
    document.querySelectorAll('.nav-item').forEach(el=>{const on=el.dataset.view===name;el.classList.toggle('active',on);on?el.setAttribute('aria-current','page'):el.removeAttribute('aria-current');});
    document.querySelectorAll('.view').forEach(el=>el.classList.add('hidden'));
    $(name+'-view').classList.remove('hidden');
    if(name==='websites')renderSites();if(name==='timeline')renderTimeline();if(name==='vault')renderVault();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function renderTags(){
    const counts=new Map();
    for(const p of Object.values(profiles))for(const tag of p.tags)counts.set(tag,(counts.get(tag)||0)+1);
    const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,9);
    $('tag-filters').innerHTML=`<button type="button" class="tag ${state.tag==='all'?'active':''}" data-tag="all">All websites</button>`+
      top.map(([tag,n])=>`<button type="button" class="tag ${state.tag===tag?'active':''}" data-tag="${safe(tag)}">#${safe(tag)} <small>${n}</small></button>`).join('');
  }
  function renderSites(){
    renderTags();const list=sitesFiltered();
    $('private-filter').classList.toggle('hidden',!state.vaultUnlocked);
    $('private-filter-help').classList.toggle('hidden',!(state.vaultUnlocked&&state.siteView==='private'));
    document.querySelectorAll('[data-site-view]').forEach(b=>b.classList.toggle('active',b.dataset.siteView===state.siteView));
    $('result-count').textContent=`(${list.length})`;
    $('empty-sites').classList.toggle('hidden',Boolean(list.length));
    $('site-grid').innerHTML=list.slice(0,90).map(s=>`<button class="site-card" type="button" data-site="${safe(s.domain)}"><span class="favicon">${state.vaultUnlocked&&(privateDomains().has(s.domain)||s.domain==='midnight-journal.example')?'🔒':icon(s)}</span><span class="site-copy"><span class="site-name">${safe(s.profile.name)} ${state.vaultUnlocked&&(privateDomains().has(s.domain)||s.domain==='midnight-journal.example')?'<em class="private-site-badge">PRIVATE</em>':''}</span><span class="site-domain">${safe(s.domain)}</span><span class="site-meta"><span>${s.pages.length} pages</span><span>${s.visitCount} visits</span><span>${safe(niceDate(s.lastVisitTime))}</span></span><span class="site-tags">${s.profile.tags.slice(0,3).map(t=>`<em>${safe(t)}</em>`).join('')}</span></span></button>`).join('');
  }
  function detailHtml(site){
    const pages=[...site.pages].sort((a,b)=>b.lastVisitTime-a.lastVisitTime);
    return `<div class="detail-title"><span class="favicon">${icon(site)}</span><div><h2>${safe(site.profile.name)}</h2><p>${safe(site.domain)} · ${site.pages.length} pages</p></div></div>
      <p class="detail-note">${safe(site.profile.category)} — ${safe(site.profile.note)}</p>
      <label for="detail-notes">Your notes (editable in this demo)</label><textarea id="detail-notes" maxlength="500">${safe(site.profile.note)}</textarea>
      <label for="detail-tags">Tags (separate with commas)</label><input id="detail-tags" maxlength="120" value="${safe(site.profile.tags.join(', '))}">
      <div class="detail-actions"><button id="save-profile" type="button">Save in demo</button><button id="clear-profile" class="secondary" type="button">Reset these edits</button><button id="mark-private" class="secondary" type="button">🔒 Mark site private</button></div>
      <div class="detail-subhead">Previously visited pages</div>
      ${pages.map(p=>`<div class="detail-page"><strong>${safe(p.title)}</strong><small>${safe(niceDate(p.lastVisitTime))} · ${p.visitCount} visits · Sample record, not a live website</small></div>`).join('')}`;
  }
  function openSite(domain){
    const site=allSites().find(s=>s.domain===domain);if(!site)return;
    state.selected=domain;
    $('details-body').innerHTML=detailHtml(site);
    const mark=$('mark-private');if(mark && privateDomains().has(domain))mark.classList.add('hidden');
    $('details-overlay').classList.remove('hidden');document.body.style.overflow='hidden';
    document.querySelector('.detail-panel').focus();
  }
  function closeSite(){state.selected=null;$('details-overlay').classList.add('hidden');updateModalOverflow();}
  function saveProfile(){
    if(!state.selected)return;
    profiles[state.selected].note=$('detail-notes').value.trim().slice(0,500);
    profiles[state.selected].tags=[...new Set($('detail-tags').value.split(/[,，;；\n]+/).map(x=>x.trim()).filter(Boolean))].slice(0,10).map(x=>x.slice(0,20));
    notify('Saved for this demo session only. Refresh to reset.');renderSites();openSite(state.selected);
  }
  function renderTimeline(){
    const days=Number($('timeline-filter').value)||0;
    const regular=history.filter(p=>!state.manualPrivate.has(p.domain));const priv=state.vaultUnlocked?allSites().filter(s=>privateDomains().has(s.domain)||s.domain==='midnight-journal.example').flatMap(s=>s.pages):[];const sorted=[...regular,...priv].filter(p=>!days||p.lastVisitTime>=Date.now()-days*86400000).sort((a,b)=>b.lastVisitTime-a.lastVisitTime);
    const byDate=new Map();for(const p of sorted){const date=niceDate(p.lastVisitTime);if(!byDate.has(date))byDate.set(date,[]);byDate.get(date).push(p);}
    $('timeline-list').innerHTML=[...byDate].slice(0,32).map(([date,rows])=>`<div class="timeline-date">${safe(date)}</div>${rows.slice(0,18).map(p=>`<button type="button" class="timeline-row" data-site="${safe(p.domain)}"><span class="timeline-time">${safe(niceTime(p.lastVisitTime))}</span><span><span class="timeline-title">${safe(p.title)}</span><span class="timeline-domain">${safe(p.domain)}</span></span></button>`).join('')}`).join('')||'<p class="empty">No sample visits in this date range.</p>';
  }
  function openAI(){
    $('ai-modal').classList.remove('hidden');
    $('ai-text').value=SAMPLE_MEMORY;
    $('ai-results').innerHTML='';
    $('ai-thinking').classList.add('hidden');
    updateModalOverflow();
    $('ai-run').focus();
    runAI(); // The sole advertised demo example starts automatically.
  }
  function updateModalOverflow(){
    document.body.style.overflow=(!$('details-overlay').classList.contains('hidden')||!$('vault-modal').classList.contains('hidden')||!$('ai-modal').classList.contains('hidden'))?'hidden':'';
  }
  function closeAI(){
    if(state.aiPending){clearTimeout(state.aiPending);state.aiPending=null;}
    $('ai-modal').classList.add('hidden');$('ai-thinking').classList.add('hidden');$('ai-run').disabled=false;updateModalOverflow();
  }
  function runAI(){
    // A canned animation and result only; nothing is sent to a server.
    $('ai-results').innerHTML='';$('ai-thinking').classList.remove('hidden');$('ai-run').disabled=true;
    if(state.aiPending)clearTimeout(state.aiPending);
    state.aiPending=setTimeout(()=>{
      state.aiPending=null;
      if($('ai-modal').classList.contains('hidden'))return;
      $('ai-thinking').classList.add('hidden');$('ai-run').disabled=false;
      const site=groupHistory().find(s=>s.domain===SAMPLE_TARGET);
      if(!site){$('ai-results').innerHTML='<p class="ai-no-demo">The demo sample is currently unavailable.</p>';return;}
      $('ai-results').innerHTML=`<div class="ai-clues"><span>break reminders</span><span>staying on task</span><span>regular rest</span></div><div class="ai-result-heading"><strong>Possible matches in sample history</strong><small>1</small></div><article class="ai-result"><span class="ai-rank">1</span><div><strong>${safe(site.profile.name)} · ${safe(site.pages[0].title)}</strong><small>${safe(site.domain)} · ${safe(niceDate(site.lastVisitTime))}</small><code>${safe(site.pages[0].url)}</code><div class="ai-reasons"><span>Intent clue</span><span>Website function</span></div></div><button id="ai-view-site" type="button">View in history</button></article><div class="ai-canned-label">✓ Pre-scripted match to an existing fictional website; no model ran.</div>`;
    },1500);
  }
  function bumpAutoLock(){
    if(state.autoLockTimer){clearTimeout(state.autoLockTimer);state.autoLockTimer=null;}
    if(state.vaultUnlocked)state.autoLockTimer=setTimeout(()=>lockVault(),state.autoLockSeconds*1000);
  }
  function updateVault(){
    const on=state.vaultUnlocked;
    $('private-mode-state').textContent=on?'On · unlocked':state.vaultConfigured?'Locked':'Setup required';
    $('private-mode-icon').textContent=on?'◆':'◇';
    $('private-mode-toggle').classList.toggle('active',on);
    $('private-mode-banner').classList.toggle('hidden',!on);
    $('simulate-locked-visit').classList.toggle('hidden',!state.vaultConfigured);
    document.body.classList.toggle('private-active',on);
    if(!on&&state.siteView==='private')state.siteView='recent';
    renderSites();renderStats();renderTimeline();bumpAutoLock();
  }
  function renderStats(){
    const sites=allSites();const pages=state.vaultUnlocked?history.filter(p=>!state.manualPrivate.has(p.domain)).length+sites.filter(s=>privateDomains().has(s.domain)||s.domain==='midnight-journal.example').reduce((n,s)=>n+s.pages.length,0):history.filter(p=>!state.manualPrivate.has(p.domain)).length;
    const visits=sites.reduce((v,s)=>v+s.visitCount,0);
    $('stats').innerHTML=`<article><span>Websites</span><strong>${sites.length}</strong></article><article><span>Saved pages</span><strong>${pages}</strong></article><article><span>Sample visits</span><strong>${visits.toLocaleString('en')}</strong></article>`;
  }
  function openVault(kind){
    $('vault-modal').classList.remove('hidden');$('vault-dialog').innerHTML=kind==='setup'?`<button class="modal-close" data-modal-close="vault" aria-label="Close">×</button><div class="vault-setup-hero"><small>PRIVATE MODE · SCRIPTED DEMO</small><h2 id="vault-modal-title">Some sites aren't convenient to leave in history. Private mode remembers them quietly for you.</h2><strong>Some history shouldn't be seen by others—or forgotten by you.</strong><p>Sometimes you want to look in private without leaving it in regular history, but still find it later.</p></div><div class="vault-benefits"><div>◉ Hidden from regular history</div><div>◐ Remember incognito visits</div><div>⌁ Encrypted locally in the real extension</div><div>🔒 Password access and auto-lock</div></div><form id="vault-setup-form" class="vault-form"><h3>Set my private password</h3><p>At least 8 characters. In this demo, the value lives only in page memory. No encryption or password persistence occurs.</p><label>Password<input id="vault-new-password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirm password<input id="vault-confirm-password" type="password" minlength="8" autocomplete="new-password" required></label><label>Auto-lock after <select id="vault-auto-lock"><option>30 seconds</option><option>1 minute</option><option>5 minutes</option><option>15 minutes</option></select></label><p class="vault-error hidden" id="vault-error" role="alert"></p><button type="submit" class="main-btn">Turn on private mode</button><small>Demo-only password and simulated private records; no real vault is created.</small></form><p class="modal-footnote">The installed feature is not a VPN and does not make you anonymous online.</p>`:
      kind==='unlock'?`<button class="modal-close" data-modal-close="vault" aria-label="Close">×</button><form id="vault-unlock-form" class="vault-form vault-unlock-form"><h2 id="vault-modal-title">🔒 Unlock private mode</h2><p>Enter your password to reveal private sites and pages.</p><label>Password<input id="vault-password" type="password" autocomplete="off" required></label><p id="vault-error" class="vault-error hidden" role="alert"></p><button type="submit" class="main-btn">Unlock</button><button type="button" id="vault-forgot" class="text-btn">Forgot password? Reset demo vault</button><small>Demo password verification occurs only in this page's memory.</small></form>`:
      `<button class="modal-close" data-modal-close="vault" aria-label="Close">×</button><form id="vault-reset-form" class="vault-form vault-unlock-form"><h2 id="vault-modal-title">Reset private mode (demo)</h2><p>The installed extension's reset permanently destroys private records. Here, reset only clears this tab's simulated state.</p><label>Type RESET DEMO to confirm<input id="vault-reset-confirm" autocomplete="off" required></label><p id="vault-error" class="vault-error hidden" role="alert"></p><button type="submit" class="main-btn">Reset this demo</button></form>`;
    updateModalOverflow();$('vault-dialog').querySelector('input')?.focus();
  }
  function closeVault(){ $('vault-modal').classList.add('hidden');updateModalOverflow(); }
  function lockVault(){if(state.autoLockTimer){clearTimeout(state.autoLockTimer);state.autoLockTimer=null;}state.vaultUnlocked=false;state.pendingPrivate=null;state.query='';$('search-input').value='';closeSite();updateVault();notify('Private mode locked · private filter and records hidden.');}
  function toggleVault(){if(state.vaultUnlocked){lockVault();return;}openVault(state.vaultConfigured?'unlock':'setup');}
  function submitSetup(form){
    const pass=form.querySelector('#vault-new-password').value,confirm=form.querySelector('#vault-confirm-password').value;
    const error=form.querySelector('#vault-error');
    if(pass.length<8||pass!==confirm){error.textContent=pass.length<8?'Use at least 8 characters.':'The two passwords do not match.';error.classList.remove('hidden');return;}
    state.autoLockSeconds=({'30 seconds':30,'1 minute':60,'5 minutes':300,'15 minutes':900})[form.querySelector('#vault-auto-lock').value]||30;
    state.vaultPassword=pass;state.vaultConfigured=true;state.vaultUnlocked=true;closeVault();updateVault();
    if(state.pendingPrivate){movePrivate(state.pendingPrivate);state.pendingPrivate=null;}
    notify('Demo private mode unlocked. Private Sites is now in the website filters.');
  }
  function submitUnlock(form){
    const error=form.querySelector('#vault-error');
    if(form.querySelector('#vault-password').value!==state.vaultPassword){error.textContent='Incorrect demo password.';error.classList.remove('hidden');return;}
    state.vaultUnlocked=true;closeVault();updateVault();
    if(state.pendingPrivate){movePrivate(state.pendingPrivate);state.pendingPrivate=null;}
    notify('Demo private mode unlocked.');
  }
  function movePrivate(domain){
    state.manualPrivate.add(domain);closeSite();state.siteView='private';state.query='';$('search-input').value='';updateVault();notify('Site moved to Private Sites (simulation only).');
  }
  function markPrivate(){
    if(!state.selected)return;
    const site=state.selected;
    if(!state.vaultConfigured){state.pendingPrivate=site;openVault('setup');return;}
    if(!state.vaultUnlocked){state.pendingPrivate=site;openVault('unlock');return;}
    movePrivate(site);
  }
  function reset(){
    Object.keys(demo.profiles).forEach(k=>profiles[k]=structuredClone(demo.profiles[k]));
    for(const site of privateSamples)profiles[site.domain]=structuredClone(site.profile);
    if(state.autoLockTimer){clearTimeout(state.autoLockTimer);state.autoLockTimer=null;}
    state.query='';state.tag='all';state.sort='recent';state.vaultUnlocked=false;state.vaultConfigured=false;state.vaultPassword=null;state.manualPrivate.clear();state.incognitoAdded=false;state.siteView='recent';state.pendingPrivate=null;
    $('search-input').value='';$('sort-select').value='recent';closeSite();closeAI();closeVault();showView('websites');updateVault();notify('Demo has been reset.');
  }
  document.addEventListener('click',event=>{
    if(state.vaultUnlocked)bumpAutoLock();
    const el=event.target.closest('[data-view], [data-site], [data-tag]');
    if(el?.dataset.view){showView(el.dataset.view);return;}
    if(el?.dataset.site){openSite(el.dataset.site);return;}
    if(el?.dataset.tag){state.tag=el.dataset.tag;renderSites();return;}
    if(event.target.closest('#save-profile'))saveProfile();
    if(event.target.closest('#clear-profile')&&state.selected){profiles[state.selected]=structuredClone(demo.profiles[state.selected]||privateSamples.find(s=>s.domain===state.selected)?.profile||profiles[state.selected]);openSite(state.selected);renderSites();notify('Website note and tags reset.');}
    if(event.target.closest('#private-mode-toggle'))toggleVault();
    if(event.target.closest('#private-lock'))lockVault();
    if(event.target.closest('#traditional-search-btn')){$('search-input').focus();}
    if(event.target.closest('#open-ai-recall'))openAI();
    if(event.target.closest('#ai-run'))runAI();
    if(event.target.closest('#ai-view-site')){closeAI();state.query='';$('search-input').value='';state.siteView='recent';showView('websites');openSite(SAMPLE_TARGET);}
    if(event.target.closest('#simulate-incognito')||event.target.closest('#simulate-locked-visit')){
      state.incognitoAdded=true;updateVault();
      notify(state.vaultUnlocked?'Fictional incognito visit added to Private Sites.':'Fictional incognito visit recorded while locked. Unlock to see it.');
    }
    if(event.target.closest('#mark-private'))markPrivate();
    if(event.target.closest('#vault-forgot'))openVault('reset');
    if(event.target.closest('[data-modal-close="vault"]'))closeVault();
    if(event.target.closest('[data-modal-close="ai"]'))closeAI();
    const viewButton=event.target.closest('[data-site-view]');
    if(viewButton){state.siteView=viewButton.dataset.siteView;state.tag='all';state.query='';$('search-input').value='';renderSites();}
    if(event.target.closest('#close-details')||event.target.closest('[data-close="true"]'))closeSite();
  });
  $('search-input').addEventListener('input',e=>{if(state.vaultUnlocked)bumpAutoLock();state.query=e.target.value;renderSites();});
  $('vault-modal').addEventListener('submit',e=>{
    if(e.target.id==='vault-setup-form'){e.preventDefault();submitSetup(e.target);}
    if(e.target.id==='vault-unlock-form'){e.preventDefault();submitUnlock(e.target);}
    if(e.target.id==='vault-reset-form'){
      e.preventDefault();const err=$('vault-error');
      if($('vault-reset-confirm').value.trim()!=='RESET DEMO'){err.textContent='Type RESET DEMO to continue.';err.classList.remove('hidden');return;}
      state.vaultConfigured=false;state.vaultUnlocked=false;state.vaultPassword=null;state.manualPrivate.clear();state.incognitoAdded=false;state.pendingPrivate=null;closeVault();updateVault();notify('Demo private data reset.');
    }
  });
  $('sort-select').addEventListener('change',e=>{state.sort=e.target.value;renderSites();});
  $('timeline-filter').addEventListener('change',renderTimeline);
  $('reset-demo').addEventListener('click',reset);
  document.addEventListener('keydown',e=>{
    if(state.vaultUnlocked)bumpAutoLock();
    if(e.key==='Escape'&&!$('vault-modal').classList.contains('hidden')){closeVault();return;}
    if(e.key==='Escape'&&!$('ai-modal').classList.contains('hidden')){closeAI();return;}
    if(e.key==='Escape'&&!$('details-overlay').classList.contains('hidden')){closeSite();return;}
    if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();showView('websites');$('search-input').focus();}
  });
  renderStats();updateVault();
})();
