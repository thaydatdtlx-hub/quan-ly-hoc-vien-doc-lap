const CACHE_NAME="thay-dat-pwa-v1";
const CORE_ASSETS=[
  "/",
  "/index.html",
  "/hoc-vien.html",
  "/lich-dao-tao.html",
  "/600-cau-hoi.html",
  "/offline.html",
  "/site.webmanifest",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/app-icon-maskable-512.png",
  "/apple-touch-icon-180.png",
  "/logo-thay-dat-compact.webp"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith("thay-dat-pwa-")&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"){
    event.respondWith(
      fetch(request)
        .then(response=>{
          if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
          return response;
        })
        .catch(async()=>await caches.match(request,{ignoreSearch:true})||await caches.match(url.pathname)||await caches.match("/offline.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});
