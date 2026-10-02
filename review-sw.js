import {publicCacheKey,reviewPages} from './assets/echo-shell.mjs';
const CACHE='meissner-review-shell-v2-20261002',origin=self.location.origin;
const modules=['/assets/echo-review.js','/assets/echo-core.mjs','/assets/echo-activity.mjs','/assets/echo-shell.mjs','/assets/echo-share-card.mjs','/assets/echo-qr.mjs','/assets/echo-review.css','/assets/echo-features.css','/assets/shared.js','/assets/shared.css','/assets/facts.json','/review/components.json','/review.webmanifest','/assets/review-app-icon.svg','/offline.html','/4/features.mjs','/4/data-tools.mjs'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/assets/review-app-icon.svg'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('meissner-review-shell-') && key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const key=publicCacheKey(event.request.url,origin,event.request.method);if(!key)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try {const response=await fetch(event.request);if(response.ok)await cache.put(key,response.clone());return response;}
    catch {const cached=await cache.match(key);if(cached)return cached;if(event.request.mode==='navigate')return cache.match(origin+'/offline.html');throw new Error('Public resource not prepared for offline access');}
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='prepare-offline')return;
  event.waitUntil((async()=>{
    try {const cache=await caches.open(CACHE),resources=new Set(modules);resources.add('/4/history.json');
      const historyResponse=await fetch('/4/history.json',{cache:'reload'});if(!historyResponse.ok)throw new Error('Public history could not be prepared');const history=await historyResponse.json();
      const snapshots=history.revisions.map(r=>r.snapshot).filter(path=>/^\/4\/history\/[a-f0-9]{7}\.html$/.test(path));
      for(const page of [...reviewPages,...snapshots]){const response=await fetch(page,{cache:'reload'});if(!response.ok)throw new Error(`Page ${page} could not be prepared`);const html=await response.clone().text();await cache.put(origin+page,response);
        for(const match of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)){const key=publicCacheKey(new URL(match[1],origin+page).href,origin);if(key && !reviewPages.includes(new URL(key).pathname))resources.add(key);}}
      for(const path of resources){const key=publicCacheKey(new URL(path,origin).href,origin);if(!key)continue;const response=await fetch(key,{cache:'reload'});if(!response.ok)throw new Error('A public asset could not be prepared');await cache.put(key,response);}
      event.ports[0]?.postMessage({ready:true,pages:reviewPages.length});
    }catch(error){event.ports[0]?.postMessage({ready:false,error:error.message});}
  })());
});
