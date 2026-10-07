const CACHE='curios-shell-v4-white-login';
const CORE=['./','index.html','css/os.css','manifest.webmanifest','assets/icons/curios-192.png','assets/icons/curios-512.png','assets/apps/alchemy.png','assets/apps/vault.png','assets/apps/images.png','assets/apps/media.png','assets/apps/reelmagick.png','assets/apps/files.png','assets/apps/videoimport.png','assets/apps/ppl.png','js/apps/ppl.js','js/apps/reel-magick.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(xs=>Promise.all(xs.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))))});
