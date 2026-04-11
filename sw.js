const CACHE='europa2026-v6';
const PAGES=['index.html','ruta.html','barcelona.html','atenas.html','grecia-islas.html','continental.html','budapest.html','madrid.html','organizar.html','style.css','shared.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PAGES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(e.request.method==='GET'&&res.status===200){var c=res.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}return res;})));});