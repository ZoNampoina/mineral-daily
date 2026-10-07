const CACHE='arizona-v21-29';
const CORE=[
  './',
  './index.html',
  './app.css?v=21.17',
  './app-core.js?v=21.17',
  './app-audio.js?v=21.17',
  './app-extras.js?v=21.17',
  './app-intelligence.js?v=21.17',
  './app-engineer.js?v=21.17',
  './app-v20.js?v=21.17',
  './app-v21.js?v=21.17',
  './app-v21-5.js?v=21.17',
  './app-performance.js?v=21.17',
  './app-admin.js?v=21.17',
  './weekly-dashboard.js?v=21.17',
  './app-images.js?v=21.17',
  './manifest.webmanifest?v=21.17'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(async()=>{
        const exact=await caches.match(event.request);
        if(exact)return exact;
        if(event.request.mode==='navigate')return caches.match('./index.html');
        return Response.error();
      })
  );
});
