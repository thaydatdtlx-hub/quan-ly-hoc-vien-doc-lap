const CACHE_NAME="thay-dat-pwa-v3";
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

self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?.json()??{}}catch{data={body:event.data?.text()??"Bạn có một cập nhật mới."}}
  const title=data.title||"Thông báo từ Thầy Đạt";
  const options={
    body:data.body||"Bạn có một cập nhật mới.",
    icon:"/app-icon-192.png",
    badge:"/app-icon-192.png",
    tag:data.tag||data.id||"thay-dat-notification",
    renotify:true,
    data:{url:data.url||"/",id:data.id||""}
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title,options),
    "setAppBadge" in self.navigator?self.navigator.setAppBadge():Promise.resolve()
  ]));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"/",self.location.origin).href;
  event.waitUntil((async()=>{
    if("clearAppBadge" in self.navigator)await self.navigator.clearAppBadge();
    const clientsList=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const client=clientsList.find(item=>new URL(item.url).origin===self.location.origin);
    if(client){await client.focus();if("navigate" in client)await client.navigate(target);return;}
    await self.clients.openWindow(target);
  })());
});
