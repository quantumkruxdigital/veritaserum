const CACHE='curios-shell-v10-vela-video-gallery';
const CORE=['./','index.html','css/os.css','manifest.webmanifest','assets/icons/curios-192.png','assets/icons/curios-512.png','assets/apps/alchemy.png','assets/apps/vault.png','assets/apps/images.png','assets/apps/media.png','assets/apps/reelmagick.png','assets/apps/files.png','assets/apps/videoimport.png','assets/apps/ppl.png','js/apps/ppl.js','js/apps/reel-magick.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(xs=>Promise.all(xs.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Cache only successful same-origin static shell assets. Never cache API responses,
// authentication callbacks, cross-origin requests, or arbitrary navigation responses.
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin || url.pathname.startsWith('/api/')) return;
  if(req.mode==='navigate') {
    e.respondWith(fetch(req).catch(()=>caches.match('./')));
    return;
  }
  e.respondWith(fetch(req).then(r=>{
    if(r.ok && r.type==='basic') {
      const clone=r.clone();
      e.waitUntil(caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{}));
    }
    return r;
  }).catch(async()=> (await caches.match(req)) || Response.error()));
});
