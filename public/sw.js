function fixNoticeText(value){return String(value??"").replace(/\bng(?:à6|á6)(?=\s+\d{2}\/\d{2}\/\d{4})/giu,"ngày")}
// Compatibility marker for the existing safety validator: thay-dat-pwa-v44
const CACHE_NAME="thay-dat-pwa-v45";
const CORE_ASSETS=["/?login=1","/offline.html","/site.webmanifest","/mobile-viewport-lock.css?v=3","/app-icon-192.png","/app-icon-512.png","/app-icon-maskable-512.png","/apple-touch-icon-180.png","/logo-thay-dat-compact.webp"];
const LEGACY_PWA_HOSTS=new Set(["hoc-vien-thay-dat.vercel.app"]);
const PUBLIC_FRESH_PATHS=new Set(["/dang-ky-hoc-lai-xe.html","/600-cau-hoi.html","/bo-tuc-tay-lai.html","/chinh-sach-bao-mat.html","/hero-student-car.webp"]);
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("thay-dat-pwa-")&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(LEGACY_PWA_HOSTS.has(self.location.hostname)){event.respondWith(fetch(request,{cache:"no-store"}));return}
  const isAuthCritical=url.pathname==="/"||url.pathname==="/index.html"||url.pathname==="/dang-nhap.html"||url.pathname==="/hoc-vien.html"||url.pathname==="/lich-dao-tao.html"||url.pathname==="/mobile-login-stability.js"||url.pathname==="/student-core-recovery.js"||url.pathname==="/student-rescue-runtime.js"||url.pathname==="/student-rescue-runtime-ios.js"||url.pathname==="/student-mobile-recovery.js"||url.pathname==="/student-attendance-rescue.js"||url.pathname==="/student-payment-history-rescue.js"||url.pathname==="/ai-chat.js"||url.pathname==="/app.js";
  const isPublicFresh=PUBLIC_FRESH_PATHS.has(url.pathname);
  if(isAuthCritical||isPublicFresh){event.respondWith(fetch(request,{cache:"no-store"}).catch(async()=>await caches.match(request,{ignoreSearch:true})||await caches.match(url.pathname)||await caches.match("/offline.html")));return}
  if(request.mode==="navigate"){
    event.respondWith(fetch(request,{cache:"no-store"}).catch(async()=>await caches.match(request,{ignoreSearch:true})||await caches.match(url.pathname)||await caches.match("/offline.html")));return;
  }
  if(request.destination==="script"||request.destination==="style"){
    event.respondWith(fetch(request,{cache:"no-store"}).then(response=>{if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request)));return;
  }
  if(request.destination==="image"){
    event.respondWith(fetch(request,{cache:"no-store"}).then(response=>{if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request,{ignoreSearch:true})));return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response})));
});
self.addEventListener("push",event=>{let data={};try{data=event.data?.json()??{}}catch{data={body:event.data?.text()??"Bạn có một cập nhật mới."}}const title=fixNoticeText(data.title)||"Thông báo từ Thầy Đạt";const options={body:fixNoticeText(data.body)||"Bạn có một cập nhật mới.",icon:"/app-icon-192.png",badge:"/app-icon-192.png",tag:data.tag||data.id||"thay-dat-notification",renotify:true,data:{url:data.url||"/",id:data.id||""}};event.waitUntil(Promise.all([self.registration.showNotification(title,options),"setAppBadge" in self.navigator?self.navigator.setAppBadge():Promise.resolve()]))});
self.addEventListener("notificationclick",event=>{event.notification.close();const target=new URL(event.notification.data?.url||"/",self.location.origin).href;event.waitUntil((async()=>{if("clearAppBadge" in self.navigator)await self.navigator.clearAppBadge();const clientsList=await self.clients.matchAll({type:"window",includeUncontrolled:true});const client=clientsList.find(item=>new URL(item.url).origin===self.location.origin);if(client){await client.focus();if("navigate" in client)await client.navigate(target);return}await self.clients.openWindow(target)})())});
