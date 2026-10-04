// Chordbook service worker (replaces chordbook-v1; the old cache is deleted on activate).
// The page (index.html) is NETWORK-FIRST, so a new deploy shows up on the next open instead of being trapped
// behind an old cache. Everything else same-origin (manifest, icons…) is stale-while-revalidate, so the app
// still opens offline. Bump VERSION on every deploy to also drop old caches right away.
const VERSION='2026.10.04-r3',CACHE='chordbook-'+VERSION;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./icon-512-maskable.png'].map(u=>c.add(new Request(u,{cache:'reload'}))))))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('chordbook-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
const timeout=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  const font=url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com';
  if(url.origin!==location.origin&&!font)return;   // samples, sync worker etc. are not touched
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{const r=await timeout(fetch(req.url,{cache:'no-store'}),4000);if(r&&r.ok){c.put('./index.html',r.clone());c.put(req,r.clone())}return r}
      catch(_){return (await c.match(req))||(await c.match('./index.html'))||(await c.match('./'))||Response.error()}
    })());return;
  }
  e.respondWith((async()=>{
    const c=await caches.open(CACHE),hit=await c.match(req),net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>null);
    return hit||(await net)||Response.error();
  })());
});
