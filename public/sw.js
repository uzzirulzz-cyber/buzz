const CACHE_VERSION="bx-v1";const APP_SHELL=["/","/manifest.json","/icon-192.png","/icon-512.png","/apple-touch-icon.png","/favicon-32.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_VERSION).then(c=>c.addAll(APP_SHELL).catch(()=>null)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_VERSION).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{const{request:r}=e;const u=new URL(r.url);if(r.method!=="GET"||u.pathname.startsWith("/api/"))return;
if(r.mode==="navigate"){e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE_VERSION).then(c=>c.put("/",c)).catch(()=>null);return res}).catch(()=>caches.match("/")));return}
e.respondWith(caches.match(r).then(c=>{const n=fetch(r).then(res=>{if(res&&res.status===200&&res.type==="basic"){const c=res.clone();caches.open(CACHE_VERSION).then(x=>x.put(r,c)).catch(()=>null)}return res}).catch(()=>c);return c||n}))});
