export const reviewPages=['/1/','/2/','/3/','/4/','/5/','/6/','/7/','/review/','/review/summary/','/review/iterate/','/review/compare/','/review/rank/','/how-we-work/'];
/** Only public static content. Drop capability queries from cache keys; never cache the API. */
export function publicCacheKey(url,origin,method='GET') {
  const u=new URL(url,origin);if(method!=='GET' || u.origin!==origin)return null;
  const path=u.pathname;
  if(reviewPages.includes(path) || path==='/offline.html' || path==='/review.webmanifest' || path==='/review/components.json' || /^\/4\/history\/[a-f0-9]{7}\.html$/.test(path) ||
    /^\/(?:assets|[1-7])\/[\w./-]+\.(?:css|js|mjs|svg|png|jpg|webp|json)$/.test(path))return origin+path;
  return null;
}
export function privateSnapshot(session,sid,rater){return {sid,rater,session:{...session,ratings:(session.ratings || []).filter(row=>(row.rater || 'owner')===rater),activity:{per_rater_ms:{[rater]:session.activity?.per_rater_ms?.[rater] || 0}}}};}
export function restoreSnapshot(value,sid,rater){return value?.sid===sid && value?.rater===rater?value.session:null;}
export function mountOfflineFeature(parent,page) {
  if(!('serviceWorker' in navigator))return;
  if(!document.querySelector('link[rel=manifest]')){const link=document.createElement('link');link.rel='manifest';link.href='/review.webmanifest';document.head.append(link);}
  const host=document.createElement('section');host.className='echo-feature';host.dataset.component=`${page}.PWA`;host.dataset.type='pwa';host.id=`${page}.PWA`;
  const heading=document.createElement('h2');heading.textContent='Take the review with you.';
  const description=document.createElement('p');description.textContent='Save the seven designs to browse without internet. Your ratings and notes stay in this browser and sync when you reconnect. You can also add a shortcut to your home screen if your browser supports it.';
  const controls=document.createElement('div');controls.dataset.echoInteractive='';
  const prepare=document.createElement('button');prepare.type='button';prepare.textContent='Save for offline browsing';
  const install=document.createElement('button');install.type='button';install.textContent='Add to home screen';install.hidden=true;
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Nothing is saved for offline browsing until you choose it. Clearing your browser data removes your saved copy.';
  controls.append(prepare,install);host.append(heading,description,controls,status);parent.append(host);
  let prompt=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;install.hidden=false;});
  install.addEventListener('click',async()=>{if(!prompt)return;await prompt.prompt();await prompt.userChoice;prompt=null;install.hidden=true;});
  prepare.addEventListener('click',async()=>{
    prepare.disabled=true;status.textContent='Saving the design pages for offline browsing…';
    try {const registration=await navigator.serviceWorker.register('/review-sw.js',{type:'module',scope:'/',updateViaCache:'none'});
      const worker=registration.installing || registration.waiting;
      if(worker && worker.state!=='activated')await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('App update timed out; try again.')),30000);worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}if(worker.state==='redundant'){clearTimeout(timer);reject(new Error('App update could not activate.'));}});});
      await navigator.serviceWorker.ready;
      const result=await new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>reject(new Error('Preparation timed out; reconnect and try again.')),30000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};registration.active.postMessage({type:'prepare-offline'},[channel.port2]);});
      if(!result.ready)throw new Error(result.error || 'Could not prepare every page.');
      status.textContent=`Ready to browse offline: ${result.pages} design and review pages. You can add a shortcut from your browser’s “Install app” or “Add to Home Screen” menu. Sending feedback and requesting changes still need internet.`;
    }catch(error){status.textContent=error.message;}finally{prepare.disabled=false;}
  });
}
