import {ratingId, ratingsFor, progress, nextUnrated, summarize, synthesize, normalizeLayout, move, cycleCandidate, reviewPlan, pageProgress, inheritSignals, aggregateRatings, activeMilliseconds, rankScores, comparisonCandidates, compactLayout, swapLayout} from './echo-core.mjs';
import {activityRecorder} from './echo-activity.mjs';

const config = {...{api: 'https://api.meissner.services/review', catalog: '/review/components.json'}, ...(window.EchoReviewConfig || {})};
const params = new URLSearchParams(location.search);
const iteration = Math.max(1, Number(params.get('i')) || 1);
let sid = params.get('s') || stored('echo:last-session') || '';
let rater = params.get('r') || 'owner';
let modalOpened=0, onboardingPromise=null;
const ratingMode=location.pathname.includes('/rank/')?'rank':location.pathname.includes('/compare/')?'compare':'tour';
const privacy=document.createElement('meta');privacy.name='referrer';privacy.content='no-referrer';document.head.append(privacy);
let enabled = params.get('review') !== 'off' && !!sid;
let session = {ratings: [], layouts: {}, requests: []}, ratings = new Map(), catalog = [], selected = null, layout = null;
let syncError = '', moveFrom = null, pointerStart = null, loadPromise = null;
let activity=null, activitySid='';
const activityEpoch=Date.now(), activityMonotonic=performance.now();
function browserId(storage,key) {
  try {const target=window[storage];let value=target.getItem(key);if(!value){value=crypto.randomUUID();target.setItem(key,value);}return value;}
  catch {return crypto.randomUUID();}
}
const activityDevice=browserId('localStorage','echo:activity-device');
const activityTab=browserId('sessionStorage','echo:activity-tab');
function startActivity() {
  if(!sid)return;
  if(activitySid!==sid){
    const key=`echo:activity:${sid}:${rater}:${activityDevice}:${activityTab}`;
    let fallback=[];
    activity=activityRecorder({now:()=>Math.round(activityEpoch+performance.now()-activityMonotonic),device:activityDevice,rater,
      read:()=>{try{return JSON.parse(stored(key) || JSON.stringify(fallback));}catch{return fallback;}},write:spans=>{fallback=spans;store(key,JSON.stringify(spans));},
      send:async body=>{
        const response=await fetch(`${config.api}/s/${encodeURIComponent(sid)}/activity`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),referrerPolicy:'no-referrer',keepalive:true});
        if(!response.ok)throw new Error(`Active-time sync returned ${response.status}`);return response.json();
      }});
    activitySid=sid;activity.visible(document.visibilityState==='visible');
  }
  activity.enabled(enabled);
}
async function flushActivity() {
  if(!activity)return;
  await activity.flush();
  const status=document.querySelector('[data-echo-activity-status]');
  if(status)status.textContent=activity.pending()?'Active review time saved on this device; sync pending.':'Active review time synced.';
}
for(const event of ['pointerdown','keydown','wheel','scroll'])document.addEventListener(event,e=>{if(e.isTrusted)activity?.input();},{passive:true});
document.addEventListener('visibilitychange',()=>{activity?.visible(document.visibilityState==='visible');if(document.visibilityState!=='visible')flushActivity();});
window.addEventListener('pagehide',()=>{activity?.enabled(false);flushActivity();});
window.addEventListener('pageshow',()=>{startActivity();});
window.addEventListener('online',()=>flushActivity());
setInterval(()=>flushActivity(),15000);
const ui = document.createElement('div'); ui.className = 'echo-ui'; ui.dataset.echoUi = '';
const sheet = document.createElement('link'); sheet.rel = 'stylesheet'; sheet.href = new URL('./echo-review.css', import.meta.url); document.head.append(sheet);
function stored(key) { try { return localStorage.getItem(key); } catch { return null; } }
function store(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
function node(tag, text, attrs = {}) {
  const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = text;
  for (const [key, value] of Object.entries(attrs)) { if (key === 'class') n.className = value; else n.setAttribute(key, value); }
  return n;
}
function button(text, handler, attrs = {}) { const b = node('button', text, {type:'button', ...attrs}); b.addEventListener('click', handler); return b; }
function echoIcon(value) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true'); svg.classList.add('echo-icon');
  for (let i = value - 1; i >= 0; i--) {
    const path = document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d','M2 5h11v10H7l-4 4v-4H2Z'); path.setAttribute('transform',`translate(${i*2.2} ${i*.8})`);
    path.setAttribute('fill','var(--echo-surface)'); path.setAttribute('stroke','currentColor'); path.setAttribute('stroke-width','1.4'); svg.append(path);
  }
  return svg;
}
async function api(path, method = 'GET', body) {
  const response = await fetch(config.api + path, {method, headers: {'Content-Type':'application/json'},
    referrerPolicy:'no-referrer', body: body === undefined ? undefined : JSON.stringify(body)});
  if (!response.ok) throw new Error(`Review service returned ${response.status}`);
  return response.json();
}
function link(path, cid) {
  const u = new URL(path, location.origin); if (sid) {u.searchParams.set('s',sid);u.searchParams.set('r',rater);}
  if (iteration > 1) u.searchParams.set('i',String(iteration));
  if (!enabled) u.searchParams.set('review','off');
  if (cid) u.hash = cid; return u.pathname + u.search + u.hash;
}
function propagate() {
  if (!sid) return;
  for (const a of document.querySelectorAll('a[href]')) {
    const u = new URL(a.getAttribute('href'), location.href);
    if (u.origin !== location.origin || a.getAttribute('href').startsWith('#')) continue;
    if (/^\/(?:[1-7](?:\/|$)|review(?:\/|$)|how-we-work(?:\/|$))/.test(u.pathname)) {
      u.searchParams.set('s',sid);u.searchParams.set('r',rater);
      if (iteration > 1 && u.pathname.startsWith('/review/')) u.searchParams.set('i',String(iteration));
      else u.searchParams.delete('i');
      if (!enabled) u.searchParams.set('review','off'); else u.searchParams.delete('review');
      a.href = u.pathname+u.search+u.hash;
    }
  }
}
function components() {
  return [...document.querySelectorAll('[data-component]')].filter(el=>!el.closest('[data-echo-ui]')).map(el=>({
    cid:el.dataset.component, type:el.dataset.type || 'component', page:el.dataset.variant || location.pathname.split('/')[1],
    label:el.dataset.label || el.dataset.component.replaceAll('.',' / '), el
  }));
}
function reflect() {
  startActivity();
  document.documentElement.classList.toggle('echo-on', enabled); toggle.setAttribute('aria-pressed',String(enabled));
  toggle.textContent = enabled ? 'Rating on · turn off' : 'Rate this';
  for(const a of modeNav.querySelectorAll('a'))a.href=link(iteration>1 && a.textContent==='Pages'?'/review/iterate/':a.dataset.path);
  const first=ratingsFor(session.ratings,1,rater);if(iteration===1)for(const [id,row] of ratings)first.set(id,row);
  const state=pageProgress(first);meter.textContent=`${state.answered} of 7 pages rated · one 1–5 score anywhere per page${Object.keys(cachePending()).length?' · saved on this device; sync pending':''}`;
  progressBar.value=state.answered;nextButton.textContent=state.next?'Next rating':'Review complete · summary';
  summaryLink.href = link('/review/summary/'); propagate();
}
function cachePending() { try { return JSON.parse(stored(`echo:pending:${sid}:${rater}`) || '{}'); } catch { return {}; } }
async function persistRating(component, values) {
  const cid = ratingId(iteration,component.cid);
  if(values.changedMeasures){const fresh=await api(`/s/${encodeURIComponent(sid)}`),previous=ratingsFor(fresh.ratings,iteration,rater).get(component.cid);for(const m of ['style','copy'])if(!values.changedMeasures.includes(m))values[m]=previous?.[m] ?? values[m] ?? null;}
  const payload = {iteration, variant:String(component.page || 'iteration'), ...values, rater, mode:values.mode || ratingMode, elapsed_ms:values.elapsed_ms ?? Math.max(0,Math.round(performance.now()-modalOpened))};
  delete payload.changedMeasures;
  const pending = cachePending(); pending[cid] = payload; store(`echo:pending:${sid}:${rater}`,JSON.stringify(pending));
  ratings.set(component.cid,{cid,...payload}); reflect();
  try {
    await api(`/s/${encodeURIComponent(sid)}/ratings/${encodeURIComponent(cid)}`,'PUT',payload);
    const current = cachePending(); if (JSON.stringify(current[cid]) === JSON.stringify(payload)) delete current[cid];
    store(`echo:pending:${sid}:${rater}`,JSON.stringify(current)); syncError='';
  } catch (error) { syncError=error.message; throw error; }
}
async function loadSession() {
  if (!sid) return;
  session = await api(`/s/${encodeURIComponent(sid)}`);
  await ensurePlan();
  ratings = ratingsFor(session.ratings,iteration,rater);
  for (const [cid, values] of Object.entries(cachePending())) {
    if (!cid.startsWith(`i${iteration}:`)) continue;
    const logical = cid.slice(cid.indexOf(':')+1); ratings.set(logical,{cid,...values});
    try { await persistRating({cid:logical,page:values.variant},values); } catch { /* visible queued state */ }
  }
  reflect();
}
async function ensureSession() {
  if (sid) return;
  const created = await api('/sessions','POST',{label:'Echo Review'}); sid=created.sid;
  store('echo:last-session',sid); enabled=true;
  const u=new URL(location.href);u.searchParams.set('s',sid);u.searchParams.set('r',rater);u.searchParams.delete('review');history.replaceState(null,'',u);
  await loadSession(); reflect();
}
const bar = node('aside',null,{class:'echo-toolbar','aria-label':'Echo Review controls','data-echo-ui':''});
const toggle = button('Rate this',async()=>{
  try { const wasOn=enabled; await ensureSession(); enabled=!wasOn; reflect(); }
  catch(error) { meter.textContent=error.message; }
},{'aria-pressed':String(enabled)});
const meter = node('span','',{role:'status','aria-live':'polite'});
const summaryLink = node('a','Your summary',{href:link('/review/summary/')});
const progressBar=node('progress',null,{max:'7',value:'0','aria-label':'Pages rated out of seven'});
const nextButton=button('Next rating',()=>nextPageRating());
const modeNav=node('nav',null,{'aria-label':'Review mode',class:'echo-modes'});for(const [label,path] of [['Pages','/1/'],['Compare','/review/compare/'],['Rank','/review/rank/']])modeNav.append(node('a',label,{href:link(path),'data-path':path,'aria-current':ratingMode===label.toLowerCase() || ratingMode==='tour' && label==='Pages'?'page':'false'}));
bar.append(toggle,nextButton,modeNav,progressBar,meter,summaryLink);document.body.append(bar,ui);
const dialog = node('dialog',null,{class:'echo-dialog','aria-labelledby':'echo-title','data-echo-ui':''});ui.append(dialog);
let priorFocus = null;
function closeModal() { dialog.close(); selected?.el.classList.remove('echo-selected'); priorFocus?.focus(); }
function openModal(component) {
  if (!enabled || !sid) return;
  selected?.el.classList.remove('echo-selected'); selected=component; priorFocus=document.activeElement;
  component.el.classList.add('echo-selected'); dialog.replaceChildren();modalOpened=performance.now();
  const heading=node('h2',component.label,{id:'echo-title'}); const crumbs=node('nav',null,{'aria-label':'Component breadcrumb',class:'echo-breadcrumb'});
  const ancestry=[]; let el=component.el;
  while(el) { if(el.dataset?.component) ancestry.unshift(el); el=el.parentElement; }
  for(const ancestor of ancestry) crumbs.append(button(ancestor.dataset.label || ancestor.dataset.component,()=>openModal(components().find(c=>c.el===ancestor))));
  const draftKey=`echo:modal-draft:${sid}:${rater}:${iteration}:${component.cid}`;let draft=null;try{draft=JSON.parse(stored(draftKey) || 'null');}catch{}
  const values={style:null,copy:null,note:'',...(ratings.get(component.cid)||{}),...(draft?.values || {})};
  const rows=[],changedMeasures=new Set(draft?.changedMeasures || []);
  function remember(){store(draftKey,JSON.stringify({values:{style:values.style,copy:values.copy,note:values.note},changedMeasures:[...changedMeasures]}));}
  for(const measure of ['style','copy']) {
    const field=node('fieldset'); const legend=node('legend',measure==='style'?'STYLE · how it looks':'COPY · what it says');
    const choices=node('div',null,{class:'echo-choices'});
    for(const value of [1,2,3,4,5,0]) {
      const label=value===0?'N/A':`${value} ${value===1?'echo':'echoes'}`;
      const b=button(value===0?'N/A':String(value),()=>{changedMeasures.add(measure);values[measure]=value;remember(); for(const choice of choices.children)choice.setAttribute('aria-pressed',String(Number(choice.dataset.value)===value));},
        {'aria-label':`${measure}: ${label}`,'aria-pressed':String(values[measure]===value),'data-value':String(value)});
      if(value) b.prepend(echoIcon(value)); choices.append(b);
    }
    const clear=button('Leave unrated',()=>{changedMeasures.add(measure);values[measure]=null;remember();for(const choice of choices.children)choice.setAttribute('aria-pressed','false');},{class:'echo-clear'});
    field.append(legend,choices,clear); rows.push(field);
  }
  const note=node('textarea',null,{id:'echo-note',rows:'3',maxlength:'2000'});note.value=values.note || '';note.addEventListener('input',()=>{values.note=note.value;remember();});
  const status=node('p','Choose either measure, both, or N/A. Unsaved choices stay on this device until you save them.',{role:'status','aria-live':'polite'});
  const save=button('Save and next unrated',async()=>{
    save.disabled=true; values.note=note.value;
    try {
      await persistRating(component,{style:values.style,copy:values.copy,note:values.note,changedMeasures:[...changedMeasures]});store(draftKey,'');
      if(iteration===1 && ratingMode==='tour'){closeModal();await nextPageRating();return;}
      const next=nextUnrated(components(),ratings,component.cid);
      if(next) { next.el.scrollIntoView({block:'center',behavior:'auto'});openModal(next); }
      else { closeModal(); meter.textContent='This page is answered. Try another design or see your summary.'; }
    } catch(error) { status.textContent=`Saved on this device; not synced: ${error.message}. Try Save again when connected.`; save.disabled=false; }
  });
  dialog.append(button('Close',closeModal,{'aria-label':'Close rating dialog',class:'echo-close'}),heading,crumbs,...rows,
    node('label','Optional note',{for:'echo-note'}),note,status,save,node('a','Continue to summary',{href:link('/review/summary/')}));
  if(!dialog.open) dialog.showModal(); rows[0].querySelector('button').focus();
}
dialog.addEventListener('cancel',event=>{event.preventDefault();closeModal();});
dialog.addEventListener('keydown',event=>{
  if(event.target.matches('textarea,input') || !/^[1-5]$/.test(event.key)) return;
  const field=event.target.closest('fieldset') || dialog.querySelector('fieldset');
  field.querySelector(`[data-value="${event.key}"]`).click();event.preventDefault();
});
document.addEventListener('click',async event=>{
  if(!enabled || event.target.closest('[data-echo-ui]') || event.target.closest('meissner-contact') && event.target.closest('input,textarea,select,button,a'))return;
  const el=event.target.closest('[data-component]');if(!el)return;
  event.preventDefault();event.stopImmediatePropagation();
  try { await (loadPromise || Promise.resolve());openModal(components().find(c=>c.el===el)); }
  catch(error) { meter.textContent=error.message; }
},true);
function deepLink() {
  if(!enabled || !location.hash)return;
  let cid;try{cid=decodeURIComponent(location.hash.slice(1));}catch{return;}
  const component=components().find(c=>c.cid===cid);
  if(component){component.el.scrollIntoView({block:'center'});openModal(component);}
}
window.addEventListener('hashchange',deepLink);
window.addEventListener('online',()=>loadSession().catch(error=>{meter.textContent=error.message;}));
async function loadCatalog() {
  const response=await fetch(config.catalog,{referrerPolicy:'no-referrer'});if(!response.ok)throw new Error('Component inventory unavailable');
  const data=await response.json();catalog=Array.isArray(data)?data:Object.values(data).flat();return catalog;
}
async function hub() {
  const host=document.querySelector('[data-echo-hub]');if(!host)return;
  host.replaceChildren(node('h1','Find what feels right.'),node('p','Rate any part of seven prototypes in echoes. Keep style and copy separate, then combine your preferences into the next version.'),
    button(sid?'Resume your review':'Start a review',async()=>{try{await ensureSession();enabled=true;await onboarding();location.href=link('/1/');}catch(error){meter.textContent=error.message;}}));
  const pages=node('nav',null,{'aria-label':'Seven prototypes'});for(let i=1;i<=7;i++)pages.append(node('a',`Design ${i}`,{href:link(`/${i}/`)}));
  host.append(pages,node('a','See your summary',{href:link('/review/summary/')}),node('p','Your ratings live only under your private review link; ask and we delete them.'));
}
function componentLink(c, label) { return node('a',label || c.cid,{href:link(`/${c.page}/`,c.cid)}); }
async function summaryPage() {
  const host=document.querySelector('[data-echo-summary]');if(!host)return;
  if(!sid){host.replaceChildren(node('p','Start a review to see your preferences.'),node('a','Start a review',{href:'/review/'}));return;}
  await loadCatalog(); const signals=inheritSignals(catalog,ratings);const summaries=summarize(catalog,signals);
  host.replaceChildren(node('h1','Your echoes, side by side.'),node('p','Style and copy are separate. N/A is respected; unrated parts never become zero. Partial ratings are enough to explore.'));
  await flushActivity();
  try {const fresh=await api(`/s/${encodeURIComponent(sid)}`),ms=fresh.activity?.per_rater_ms?.[rater];
    if(Number.isFinite(ms))host.append(node('p',`${rater==='owner'?"Brian’s":"Your"} active review time: ${(ms/60000).toFixed(1)} minutes saved. Idle and background time excluded; overlapping devices counted once.`));
  }catch{host.append(node('p','Saved active review time is temporarily unavailable.'));}
  const team=aggregateRatings(session.ratings,iteration);
  if(team.splits.length){const group=node('section',null,{class:'echo-summary-group'});group.append(node('h2','Teammate agreement and splits'),node('p','Each rater keeps separate ratings. These comparisons exclude N/A; your own preferences remain above.'));
    for(const split of team.splits)group.append(node('p',`${split.cid} · ${split.measure}: ${split.raters} raters, ${split.min.toFixed(1)}–${split.max.toFixed(1)} echoes · ${split.agreement?'agreement':'different preferences'}.`));host.append(group);}
  for(const group of summaries) {
    const section=node('section',null,{class:'echo-summary-group'});section.append(node('h2',group.type));
    for(const measure of ['style','copy']) {
      const result=group.measures[measure], block=node('div');
      block.append(node('h3',measure.toUpperCase()),node('p',`${result.rated} of ${result.total} candidates rated${result.average===null?'':`; average ${result.average.toFixed(1)} echoes`}.`));
      for(const [label,list] of [['Liked (4–5)',result.liked],['Didn’t like (1–2)',result.disliked]]) {
        const p=node('p',label+': ');if(!list.length)p.append(document.createTextNode('none recorded directly'));
        for(const c of list)p.append(componentLink(c,`${c.cid} (${c.value}) `));block.append(p);
      }
      if(result.inherited.length){const p=node('p','Weak inherited signal from each candidate’s own page; this is a guess, not a direct score: ');for(const c of result.inherited)p.append(componentLink(c,`${c.cid} (${c.value.toFixed(1)} page average) `));block.append(p);}
      if(result.inconclusive) {
        const reason=result.rated<2?'Fewer than two candidates have a score.':'The leading two are within half an echo.';
        block.append(node('p',`Not enough to conclude. ${reason} Optional: rate another candidate to help settle it; the seven-page minimum never grows.`));
        const unscored=group.candidates.find(c=>ratings.get(c.cid)?.[measure]==null);if(unscored)block.append(componentLink(unscored,'Try another candidate'));
      } else {block.append(componentLink(result.ranked[0],`${measure} preference: ${result.ranked[0].cid}`));}
      section.append(block);
    }
    host.append(section);
  }
  const create=button('Generate your next iteration',async()=>{
    create.disabled=true;
    try {
      const next=iteration+1, previous=session.layouts?.[String(next)];
      const draft=previous?.layout || previous || await createDraft();
      draft.candidate_catalog ||= catalog;const compact=compactLayout(draft);
      if(!previous)await api(`/s/${encodeURIComponent(sid)}/layout/${next}`,'PUT',{layout:compact});
      // The draft survives even if requesting the crew is temporarily unavailable.
      try { await api(`/s/${encodeURIComponent(sid)}/iterate`,'POST',{iteration:next,notes:'Please refine the draft copy and transitions; preserve viewer layout choices.'}); }
      catch(error) {store(`echo:iterate-pending:${sid}:${next}`,'1');}
      const u=new URL('/review/iterate/',location.origin);u.searchParams.set('s',sid);u.searchParams.set('r',rater);u.searchParams.set('i',String(next));location.href=u.pathname+u.search;
    }catch(error){meter.textContent=error.message;create.disabled=false;}
  });
  host.prepend(create,node('p','Your first draft appears immediately, built deterministically from your ratings. The crew then refines the copy and transitions; this page will show when that version is ready.'));
  await pollReady(host);
}
async function pollReady(host) {
  if(!sid)return;
  const status=node('p','No crew-refined result yet.',{class:'echo-refinement-status',role:'status','aria-live':'polite'});host.append(status);
  async function check(){
    try {
      const fresh=await api(`/s/${encodeURIComponent(sid)}`); const requests=fresh.requests || [];
      const ready=requests.filter(r=>r.status==='ready' && r.result_url).at(-1);
      if(ready){status.replaceChildren(document.createTextNode('Your refined version is ready. '),node('a','Open your refined version',{href:safeHref(ready.result_url)}));}
      else if(requests.length)status.textContent=`Crew refinement: ${requests.at(-1).status}. Your immediate draft remains available.`;
    }catch{status.textContent='Refinement status unavailable. Your saved draft remains available.';}
  }
  await check();window.setInterval(check,15000);
}
function layoutValue(value) { return value?.layout || value; }
function iterationCatalog(value) {
  return (value?.slots || []).flatMap(slot=>[
    {cid:slot.id,type:slot.type,kind:'section',parent:null,page:slot.style_from,path:'/review/iterate/'},
    ...['headline','body','cta'].map(type=>({cid:`${slot.id}.${type}`,type,kind:'component',parent:slot.id,page:slot.style_from,path:'/review/iterate/'}))
  ]);
}
const originalLoadCatalog=loadCatalog;
loadCatalog=async function(){
  if(iteration>1){catalog=iterationCatalog(layoutValue(session.layouts?.[String(iteration)]));return catalog;}
  return originalLoadCatalog();
};
const originalComponentLink=componentLink;
componentLink=function(c,label){return c.path?node('a',label || c.cid,{href:link(c.path,c.cid)}):originalComponentLink(c,label);};
function safeHref(raw) {
  try {const u=new URL(raw,location.origin);return ['http:','https:','mailto:'].includes(u.protocol)?u.href:'#';}catch{return '#';}
}
async function copiesForCurrent() {
  if(iteration>1){
    const previous=layoutValue(session.layouts?.[String(iteration)]), copies={};
    for(const slot of previous?.slots || []) copies[slot.id]=previous.refined?.slots?.find(c=>c.id===slot.id && c.copy_from===slot.copy_from)?.copy || previous.copies?.[slot.copy_from] || {title:slot.type,body:[]};
    return copies;
  }
  return publicCopies(catalog);
}
async function publicCopies(inventory){
  const copies={};const pages=[...new Set(inventory.map(c=>String(c.page)))];
  await Promise.all(pages.map(async page=>{
    const response=await fetch(`/${page}/`,{referrerPolicy:'no-referrer'});if(!response.ok)throw new Error(`Design ${page} unavailable`);
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    for(const c of inventory.filter(c=>String(c.page)===page)){
      const el=[...doc.querySelectorAll('[data-component]')].find(e=>e.dataset.component===c.cid);if(!el)continue;
      const title=el.querySelector('[data-copy-role="title"],h1,h2,h3')?.textContent.trim() || (el.matches('h1,h2,h3')?el.textContent.trim():c.type);
      const bodies=[...el.querySelectorAll('[data-copy-role="body"],p,li,blockquote')].filter(e=>!e.closest('.tag,.review-section-tag')).map(e=>e.textContent.trim()).filter(Boolean);
      const a=el.querySelector('[data-copy-role="cta"],a[href]');const image=el.matches('img')?el:el.querySelector('img');
      copies[c.cid]={title,body:bodies.length?bodies.slice(0,16):[c.text || ''],cta:a?{text:a.textContent.trim(),href:safeHref(a.getAttribute('href'))}:null,
        image:image?{src:new URL(image.getAttribute('src'),new URL(`/${page}/`,location.origin)).pathname,alt:image.getAttribute('alt') || ''}:null};
    }
  }));return copies;
}
// Attach structured copy before the summary's deterministic draft is persisted.
const originalSynthesize=synthesize;
async function createDraft() {
  const draft=originalSynthesize(catalog,inheritSignals(catalog,ratings),iteration+1);draft.copies=await copiesForCurrent();return draft;
}
let saveChain=Promise.resolve();
function saveLayout() {
  const snapshot=compactLayout(JSON.parse(JSON.stringify(layout)));store(`echo:layout-pending:${sid}:${iteration}`,'1');store(`echo:layout:${sid}:${iteration}`,JSON.stringify(snapshot));
  saveChain=saveChain.catch(()=>{}).then(async()=>{
    const fresh=await api(`/s/${encodeURIComponent(sid)}`);const remote=layoutValue(fresh.layouts?.[String(iteration)]);
    const combined={...snapshot,...(remote?.refined?{refined:remote.refined}:{})};
    await api(`/s/${encodeURIComponent(sid)}/layout/${iteration}`,'PUT',{layout:combined});
    store(`echo:layout-pending:${sid}:${iteration}`,'');syncError='';meter.textContent='Layout saved to your private review link.';
  }).catch(error=>{syncError=error.message;meter.textContent=`Layout saved on this device; not synced: ${error.message}`;});
  return saveChain;
}
function renderSlots(host) {
  host.replaceChildren();host.dataset.style=layout.theme || '1';
  const intro=node('div',null,{'data-echo-ui':'',class:'echo-iteration-heading'});
  intro.append(node('h1',`Iteration ${iteration}`),node('p',layout.refined?'Crew-refined copy is available below. Your order, hidden parts and swaps are preserved.':'This is your immediate draft, assembled deterministically from separate style and copy preferences. Crew refinement follows; no turnaround is promised.'),
    node('a','Rate this iteration, then see its summary',{href:link('/review/summary/')}));
  const notices=node('p','Drag a handle (hold it on a phone), or use Move up/down. Hide, restore and swap choices are saved.');intro.append(notices);host.append(intro);
  for(const id of layout.order){
    const slot=layout.slots.find(s=>s.id===id);if(!slot || layout.hidden.includes(id))continue;
    const refined=layout.refined?.slots?.find(s=>s.id===id);
    const copy=refined?.copy_from===slot.copy_from?refined.copy:layout.copies?.[slot.copy_from] || {title:slot.type,body:[]};
    const article=node('section',null,{id:slot.id,'data-component':slot.id,'data-type':slot.type,'data-variant':slot.style_from,'data-style':slot.style_from,'data-slot':slot.id,class:'echo-slot'});
    const tools=node('div',null,{'data-echo-ui':'',class:'echo-slot-tools'});
    const handle=button('↕ Drag',()=>{}, {'aria-label':`Drag ${slot.type} to reorder`,class:'echo-drag-handle',draggable:'true'});
    handle.addEventListener('dragstart',event=>{moveFrom=slot.id;event.dataTransfer.setData('text/plain',slot.id);event.dataTransfer.effectAllowed='move';});
    handle.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse')return;
      const timer=setTimeout(()=>{moveFrom=slot.id;article.classList.add('echo-dragging');},400);
      pointerStart={timer,id:slot.id,x:event.clientX,y:event.clientY};handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointerup',event=>{
      if(!pointerStart)return;clearTimeout(pointerStart.timer);
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-slot]');
      if(moveFrom && target && target.dataset.slot!==moveFrom){layout=move(layout,moveFrom,target.dataset.slot);renderSlots(host);saveLayout();}
      pointerStart=null;moveFrom=null;article.classList.remove('echo-dragging');
    });
    handle.addEventListener('pointercancel',()=>{if(pointerStart)clearTimeout(pointerStart.timer);pointerStart=null;moveFrom=null;article.classList.remove('echo-dragging');});
    function reorder(direction){const index=layout.order.indexOf(id), target=direction<0?layout.order[index-1]:layout.order[index+2] ?? null;if(direction<0 && index===0)return;layout=move(layout,id,target);renderSlots(host);saveLayout();}
    async function swap(measure){try{const changed=cycleCandidate(slot,measure,catalog);if(measure==='copy' && !layout.copies?.[changed.copy_from]){const sourceCopies=await publicCopies(catalog);layout.copies={...layout.copies,...sourceCopies};}layout=swapLayout(layout,id,measure,catalog);renderSlots(host);await saveLayout();}catch(error){meter.textContent=error.message;}}
    tools.append(handle,button('Move up',()=>reorder(-1)),button('Move down',()=>reorder(1)),
      button('Hide',()=>{layout.hidden.push(id);renderSlots(host);saveLayout();}),button('Swap copy',()=>swap('copy')),button('Swap style',()=>swap('style')));
    const caption=node('p',`${slot.type} · copy ${slot.copy_from} · style /${slot.style_from}${slot.provisional_copy || slot.provisional_style?' · provisional preference':''}${refined && refined.copy_from!==slot.copy_from?' · your swap kept; crew copy belongs to the previous source':''}`,{class:'echo-source-caption','data-echo-ui':''});
    const title=node(slot.type==='hero'?'h1':'h2',copy.title || slot.type,{'data-component':`${id}.headline`,'data-type':'headline'});
    const body=node('div',null,{'data-component':`${id}.body`,'data-type':'body'});for(const text of copy.body || [])body.append(node('p',text));
    article.append(tools,caption,title,body);
    if(copy.image?.src && copy.image.src.startsWith('/'))article.append(node('img',null,{src:copy.image.src,alt:copy.image.alt || '',class:'echo-slot-logo','data-component':`${id}.logo`,'data-type':'logo'}));
    if(copy.cta)article.append(node('a',copy.cta.text,{href:safeHref(copy.cta.href),'data-component':`${id}.cta`,'data-type':'cta',class:'echo-slot-cta'}));
    article.addEventListener('dragover',event=>{if(moveFrom){event.preventDefault();event.dataTransfer.dropEffect='move';}});
    article.addEventListener('drop',event=>{event.preventDefault();if(moveFrom){layout=move(layout,moveFrom,id);moveFrom=null;renderSlots(host);saveLayout();}});
    host.append(article);
  }
  const restore=node('div',null,{'data-echo-ui':'',class:'echo-restore'});restore.append(node('h2','Hidden parts'));
  if(!layout.hidden.length)restore.append(node('p','Nothing hidden.'));
  for(const id of layout.hidden)restore.append(button(`Restore ${id.replace('slot-','')}`,()=>{layout.hidden=layout.hidden.filter(x=>x!==id);renderSlots(host);saveLayout();}));
  host.append(restore);reflect();
}
async function iterationPage() {
  const host=document.querySelector('[data-echo-iteration]');if(!host)return;
  if(!sid){host.append(node('a','Start a review',{href:'/review/'}));return;}
  const saved=layoutValue(session.layouts?.[String(iteration)]);const pending=stored(`echo:layout:${sid}:${iteration}`);
  layout=normalizeLayout(stored(`echo:layout-pending:${sid}:${iteration}`) && pending?JSON.parse(pending):saved || (pending?JSON.parse(pending):{}));
  if(layout.slots.length && stored(`echo:layout-pending:${sid}:${iteration}`))await saveLayout();
  if(!layout.slots.length){host.append(node('p','Generate this iteration from the previous summary first.'),node('a','Your summary',{href:link('/review/summary/')}));return;}
  if(!layout.copies){await originalLoadCatalog();layout.copies=await copiesForCurrent();await saveLayout();}
  // Swaps retain the prior source-candidate inventory, rather than inventing new candidates.
  catalog=layout.candidate_catalog || catalog;
  if(!catalog.length)await originalLoadCatalog();
  renderSlots(host);
  if(stored(`echo:iterate-pending:${sid}:${iteration}`)){
    try{await api(`/s/${encodeURIComponent(sid)}/iterate`,'POST',{iteration,notes:'Refine the persisted immediate draft.'});store(`echo:iterate-pending:${sid}:${iteration}`,'');}catch{meter.textContent='Draft available; crew request not yet accepted. Reload to retry.';}
  }
  await pollReady(host);
}
async function initialize(){
  for(const c of components())if(!c.el.id)c.el.id=c.cid;
  if(sid){store('echo:last-session',sid);loadPromise=loadSession();try{await loadPromise;}catch(error){meter.textContent=error.message;}}
  reflect();await hub();
  try{await summaryPage();await iterationPage();await comparePage();await rankPage();if(sid)await onboarding();deepLink();}catch(error){meter.textContent=error.message;}
  new MutationObserver(()=>propagate()).observe(document.body,{childList:true,subtree:true});
}
initialize();
window.EchoReview={ratingId,refresh:loadSession,session:()=>sid,mode:()=>enabled,components:()=>components().map(({el,...c})=>c)};

async function ensurePlan() {
  const old=layoutValue(session.layouts?.['1']) || {};
  if(old.review_plan?.denominator===7 && old.review_plan?.version===2)return;
  const value={...old,review_plan:reviewPlan()};delete value.core_cids;
  await api(`/s/${encodeURIComponent(sid)}/layout/1`,'PUT',{layout:value});session.layouts['1']=value;
}
async function nextPageRating() {
  if(!sid){await ensureSession();await onboarding();}
  enabled=true;reflect();
  if(iteration>1){const next=nextUnrated(components(),ratings,selected?.cid);if(next){next.el.scrollIntoView({block:'center'});openModal(next);}else{store(draftKey,'');location.href=link('/review/summary/');}return;}
  const state=pageProgress(ratings);
  if(!state.next){location.href=link('/review/summary/');return;}
  if(location.pathname===`/${state.next}/`){const c=components().find(c=>c.type==='hero') || components()[0];if(c){c.el.scrollIntoView({block:'center'});openModal(c);}return;}
  if(!catalog.length)await loadCatalog();const hero=comparisonCandidates(catalog,'hero').find(c=>String(c.page)===state.next);location.href=link(`/${state.next}/`,hero?.cid);
}
async function onboarding() {
  if(onboardingPromise)return onboardingPromise;
  const value=layoutValue(session.layouts?.['1']) || {};
  if(value.onboarding_seen || stored(`echo:onboarding:${sid}`))return;
  const intro=node('dialog',null,{class:'echo-dialog','data-echo-ui':'','aria-labelledby':'echo-intro-title'});ui.append(intro);
  intro.append(node('h2','Anything, or just one thing per page.',{id:'echo-intro-title'}),
    node('p','As you move through the review sites you can rate ANYTHING. But don’t worry, you don’t have to. Rate anything you like, or nothing more than one thing per page. Race through giving 5s to favorites and 1s to what you don’t like, or rate every last piece. Either works.'),
    node('p','The bar tracks one 1–5 style OR copy rating on each of seven pages. N/A is welcome, but does not count toward that minimum. Extra ratings help us; they never grow the minimum.'),node('p','Browse the pages, compare pieces side by side, or drag them best to worst. Switch whenever you like.'),node('p','1 echo = dislike · 5 echoes = favorite · N/A = not applicable. Style is how it looks; copy is what it says.'));
  onboardingPromise=new Promise(resolve=>{
    intro.append(button('Got it',async()=>{
      try{const fresh=await api(`/s/${encodeURIComponent(sid)}`);const plan=layoutValue(fresh.layouts?.['1']) || value;await api(`/s/${encodeURIComponent(sid)}/layout/1`,'PUT',{layout:{...plan,onboarding_seen:true}});session.layouts['1']={...plan,onboarding_seen:true};store(`echo:onboarding:${sid}`,'1');intro.close();intro.remove();resolve();}
      catch(error){meter.textContent=error.message;}
    }));intro.addEventListener('cancel',event=>event.preventDefault());intro.showModal();
  });
  return onboardingPromise;
}
function privateLink(){const u=new URL(location.href);u.searchParams.set('s',sid);u.searchParams.set('r',rater);return u.href;}
async function sharing() {
  if(!sid)return;
  const box=node('dialog',null,{class:'echo-dialog','data-echo-ui':'','aria-labelledby':'echo-share-title'});ui.append(box);
  const url=privateLink();const input=node('input',null,{type:'url',readonly:'',value:url,'aria-label':'Private review link'});
  box.append(node('h2','Continue on another device',{id:'echo-share-title'}),node('p','This private link includes your session and rater. Anyone holding it can access this review.'),input,
    button('Copy link',async()=>{try{await navigator.clipboard.writeText(url);meter.textContent='Private link copied.';}catch{input.select();meter.textContent='Select and copy this private link.';}}));
  try{const {default:qrcode}=await import('./echo-qr.mjs');const qr=qrcode(0,'M');qr.addData(url);qr.make();const drawing=node('div',null,{class:'echo-qr','aria-label':'QR code for this private review link'});drawing.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});box.append(drawing);}catch{box.append(node('p','QR unavailable; the copyable link still works.'));}
  box.append(button('Close',()=>{box.close();box.remove();}));box.showModal();
}
const extras=node('details',null,{class:'echo-more'});extras.append(node('summary','Resume · invite'));bar.append(extras);
extras.append(node('span','',{role:'status','data-echo-activity-status':''}));
extras.append(button('Continue on another device',sharing),button('Invite a teammate',async()=>{
  if(!sid)await ensureSession();const name=prompt('Teammate name (shown inside this review only)');if(!name)return;
  try{const invite=await api(`/s/${encodeURIComponent(sid)}/raters`,'POST',{name});const u=new URL(privateLink());u.searchParams.set('r',invite.rater);const box=node('dialog',null,{class:'echo-dialog','data-echo-ui':''});box.append(node('h2','Private teammate link'),node('input',null,{type:'url',value:u.href,readonly:'','aria-label':'Teammate private review link'}),button('Close',()=>{box.close();box.remove();}));ui.append(box);box.showModal();}catch(error){meter.textContent=error.message;}
}));
const compareLink=node('a','Compare all 7 heroes',{href:link('/review/compare/?type=hero')});extras.append(compareLink);
const compareType=node('select',null,{'aria-label':'Compare component type'});
for(const type of ['hero','process','pricing','contact','logo','story'])compareType.append(node('option',type,{value:type}));
compareType.addEventListener('change',()=>{compareLink.textContent=`Compare all ${compareType.value} candidates`;compareLink.href=link(`/review/compare/?type=${compareType.value}`);});extras.append(compareType);
async function comparePage(){
  const host=document.querySelector('[data-echo-compare]');if(!host)return;
  if(!sid){host.append(node('a','Start a review',{href:'/review/'}));return;}
  await loadCatalog();const type=params.get('type') || 'hero';const candidates=comparisonCandidates(catalog,type);
  const copies=await copiesForCurrent();host.classList.add('echo-compare');host.replaceChildren(node('h1',`Compare ${type} candidates`),node('p','Rate these in place, or follow the seven-page tour. Some types appear on fewer than seven prototypes. This shortcut never adds required pages.'));
  for(const c of candidates){const copy=copies[c.cid] || {title:type,body:[]};const section=node('section',null,{class:'echo-slot',id:c.cid,'data-component':c.cid,'data-type':type,'data-variant':c.page,'data-style':c.page});section.append(node('p',`Design /${c.page}`,{'data-echo-ui':''}),node('h2',copy.title));for(const text of copy.body)section.append(node('p',text));if(copy.image?.src)section.append(node('img',null,{src:copy.image.src,alt:copy.image.alt,class:'echo-slot-logo'}));host.append(section);}
  reflect();
}
async function rankPage(){
  const host=document.querySelector('[data-echo-rank]');if(!host)return;
  if(!sid){host.append(node('a','Start a review',{href:'/review/'}));return;}
  await loadCatalog();const type=params.get('type') || 'hero';
  const candidates=comparisonCandidates(catalog,type);
  const key=`i${iteration}:${rater}:${type}`, plan=layoutValue(session.layouts?.['1']) || {}, saved=plan.rankings?.[key];
  const draftKey=`echo:rank-draft:${sid}:${rater}:${iteration}:${type}`;
  let order=candidates.map(c=>c.cid), skipped=[], measure='style', styleOrder=null;
  if(saved?.style){order=saved.style.order.filter(id=>candidates.some(c=>c.cid===id));skipped=saved.style.skipped || [];}
  try{const draft=JSON.parse(stored(draftKey) || 'null');if(draft){const valid=new Set(candidates.map(c=>c.cid));order=draft.order.filter(id=>valid.has(id));skipped=draft.skipped.filter(id=>valid.has(id));measure=draft.measure;styleOrder=draft.styleOrder;}}catch{}
  const copies=await copiesForCurrent();
  function render(){
    store(draftKey,JSON.stringify({order,skipped,measure,styleOrder}));
    modalOpened=performance.now();
    host.replaceChildren(node('h1',`Rank ${type} · ${measure.toUpperCase()}`),node('p','Best at the top, least favorite at the bottom. Hold a handle on a phone, drag with a mouse, or use Move up/down. Skip means no opinion, not dislike.'));
    const list=node('ol',null,{class:'echo-rank-list'});let dragging=null;
    function reposition(id,before){order=order.filter(v=>v!==id);const index=before===null?order.length:order.indexOf(before);order.splice(index<0?order.length:index,0,id);render();}
    for(const [index,id] of order.entries()){
      const c=candidates.find(c=>c.cid===id), copy=copies[id] || {}, row=node('li',null,{'data-rank-id':id,class:'echo-rank-item'});
      const handle=button('↕',()=>{}, {class:'echo-drag-handle',draggable:'true','aria-label':`Drag ${id}`});
      handle.addEventListener('dragstart',event=>{dragging=id;event.dataTransfer.setData('text/plain',id);});
      row.addEventListener('dragover',event=>event.preventDefault());row.addEventListener('drop',event=>{event.preventDefault();const from=event.dataTransfer.getData('text/plain');if(order.includes(from) && from!==id)reposition(from,id);});
      let timer=null,held=false;
      handle.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')return;timer=setTimeout(()=>{held=true;row.classList.add('echo-dragging');},400);handle.setPointerCapture(event.pointerId);});
      handle.addEventListener('pointerup',event=>{clearTimeout(timer);const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-rank-id]');if(held && target && target.dataset.rankId!==id)reposition(id,target.dataset.rankId);held=false;row.classList.remove('echo-dragging');});
      handle.addEventListener('pointercancel',()=>{clearTimeout(timer);held=false;row.classList.remove('echo-dragging');});
      const preview=node('div',null,{'data-style':c.page,class:'echo-slot'});preview.append(node('strong',`/${c.page} · ${copy.title || id}`));if(copy.image?.src)preview.append(node('img',null,{src:copy.image.src,alt:copy.image.alt || '',class:'echo-slot-logo'}));
      if(measure==='copy')for(const text of (copy.body || []).slice(0,3))preview.append(node('p',text));
      row.append(handle,preview,button('Move up',()=>{if(index>0)reposition(id,order[index-1]);}),button('Move down',()=>{if(index<order.length-1)reposition(id,order[index+2] || null);}),button('Skip',()=>{order=order.filter(v=>v!==id);skipped.push(id);render();}));list.append(row);
    }
    host.append(list);const tray=node('section',null,{class:'echo-skip-tray'});tray.append(node('h2','Skip / no opinion'));
    for(const id of skipped)tray.append(button(`Restore ${id}`,()=>{skipped=skipped.filter(v=>v!==id);order.push(id);render();}));host.append(tray);
    const status=node('p','',{role:'status'});
    const save=button(measure==='style'?'Save style · then copy':'Save copy · see summary',async()=>{
      save.disabled=true;
      try{
        const fresh=await api(`/s/${encodeURIComponent(sid)}`), prior=layoutValue(fresh.layouts?.['1']) || {};
        const rankings={...(prior.rankings || {})}, ranking={...(rankings[key] || {})};ranking[measure]={order:[...order],skipped:[...skipped],at:new Date().toISOString()};rankings[key]=ranking;
        await api(`/s/${encodeURIComponent(sid)}/layout/1`,'PUT',{layout:{...prior,rankings}});
        const scores=rankScores(order);
        for(const id of [...order,...skipped]){const c=candidates.find(c=>c.cid===id),old=ratings.get(id) || {};
          await persistRating(c,{style:old.style ?? null,copy:old.copy ?? null,[measure]:scores.get(id) ?? 0,note:old.note || '',mode:'rank',changedMeasures:[measure]});}
        if(measure==='style'){styleOrder={order:[...order],skipped:[...skipped]};measure='copy';render();}else{store(draftKey,'');location.href=link('/review/summary/');}
      }catch(error){status.textContent=`Raw order saved; echo scores are not fully synced: ${error.message}. Retry when available.`;save.disabled=false;}
    });
    host.append(save,status);
    if(measure==='copy' && styleOrder)host.append(button('Same order for copy',()=>{order=[...styleOrder.order];skipped=[...styleOrder.skipped];render();}));
    host.append(node('label','Choose a different type: ',{for:'echo-rank-type'}));const select=node('select',null,{id:'echo-rank-type'});
    for(const value of ['hero','process','pricing','contact','logo','story'])select.append(node('option',value,{value}));select.value=type;select.addEventListener('change',()=>{location.href=link(`/review/rank/?type=${select.value}`);});host.append(select);
  }
  render();
}
let lastScroll=scrollY;addEventListener('scroll',()=>{bar.classList.toggle('echo-bar-small',scrollY>lastScroll && scrollY>200);lastScroll=scrollY;},{passive:true});
new ResizeObserver(()=>{document.body.style.paddingBottom=`${bar.getBoundingClientRect().height+20}px`;}).observe(bar);
