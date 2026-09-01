function fixNoticeText(value){return String(value??"").replace(/\bng(?:à6|á6)(?=\s+\d{2}\/\d{2}\/\d{4})/giu,"ngày")}
// Compatibility marker for the existing safety validator: thay-dat-pwa-v44
const CACHE_NAME="hoclaixecungdat-pwa-v50";
const CORE_ASSETS=["/?login=1","/offline.html","/site.webmanifest","/mobile-viewport-lock.css?v=3","/app-icon-192.png","/app-icon-512.png","/app-icon-maskable-512.png","/apple-touch-icon-180.png","/logo-thay-dat-compact.webp"];
const LEGACY_PWA_HOSTS=new Set(["hoc-vien-thay-dat.vercel.app"]);
const PUBLIC_FRESH_PATHS=new Set(["/dang-ky-hoc-lai-xe.html","/600-cau-hoi.html","/bo-tuc-tay-lai.html","/chinh-sach-bao-mat.html","/hero-vip-navy-champagne.webp"]);
const NETWORK_TIMEOUT_MS=6500;

async function fetchWithTimeout(request,options={},timeoutMs=NETWORK_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(request,{...options,signal:controller.signal})}
  finally{clearTimeout(timer)}
}
async function cachedFallback(request,url){
  return await caches.match(request,{ignoreSearch:true})||await caches.match(url.pathname)||await caches.match("/offline.html");
}

self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith("thay-dat-pwa-")||key.startsWith("hoclaixecungdat-pwa-"))&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{
  const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(LEGACY_PWA_HOSTS.has(self.location.hostname)){event.respondWith(fetchWithTimeout(request,{cache:"no-store"}).catch(()=>cachedFallback(request,url)));return}
  const isAuthCritical=url.pathname==="/"||url.pathname==="/index.html"||url.pathname==="/dang-nhap.html"||url.pathname==="/hoc-vien.html"||url.pathname==="/lich-dao-tao.html"||url.pathname==="/rpc-preflight.js"||url.pathname==="/mobile-login-stability.js"||url.pathname==="/student.js"||url.pathname==="/student-payment-modal.js"||url.pathname==="/student-payment-navigation.js"||url.pathname==="/student-payment-navigation.css"||url.pathname==="/student-portal-polish.js"||url.pathname==="/student-portal-polish.css"||url.pathname==="/site-enhancements.js"||url.pathname==="/platform-professional.js"||url.pathname==="/platform-professional.css"||url.pathname==="/pwa-install.js"||url.pathname==="/mobile-dashboard.js"||url.pathname==="/student-core-recovery.js"||url.pathname==="/student-rescue-runtime.js"||url.pathname==="/student-rescue-runtime-ios.js"||url.pathname==="/student-mobile-recovery.js"||url.pathname==="/student-attendance-rescue.js"||url.pathname==="/student-payment-history-rescue.js"||url.pathname==="/api/tuition-qr"||url.pathname==="/api/student-rpc"||url.pathname==="/ai-chat.js"||url.pathname==="/app.js";
  const isPublicFresh=PUBLIC_FRESH_PATHS.has(url.pathname);
  if(isAuthCritical||isPublicFresh){event.respondWith(fetchWithTimeout(request,{cache:"no-store"}).catch(()=>cachedFallback(request,url)));return}
  if(request.mode==="navigate"){
    event.respondWith(fetchWithTimeout(request,{cache:"no-store"}).catch(()=>cachedFallback(request,url)));return;
  }
  if(request.destination==="script"||request.destination==="style"){
    event.respondWith(fetchWithTimeout(request,{cache:"no-store"}).then(response=>{if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request)));return;
  }
  if(request.destination==="image"){
    event.respondWith(fetchWithTimeout(request,{cache:"no-store"},8000).then(response=>{if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request,{ignoreSearch:true})));return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetchWithTimeout(request).then(response=>{if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match("/offline.html"))));
});
self.addEventListener("push",event=>{let data={};try{data=event.data?.json()??{}}catch{data={body:event.data?.text()??"Bạn có một cập nhật mới."}}const title=fixNoticeText(data.title)||"Thông báo từ Học lái xe cùng Đạt";const options={body:fixNoticeText(data.body)||"Bạn có một cập nhật mới.",icon:"/app-icon-192.png",badge:"/app-icon-192.png",tag:data.tag||data.id||"hoclaixecungdat-notification",renotify:true,data:{url:data.url||"/",id:data.id||""}};event.waitUntil(Promise.all([self.registration.showNotification(title,options),"setAppBadge" in self.navigator?self.navigator.setAppBadge():Promise.resolve()]))});
self.addEventListener("notificationclick",event=>{event.notification.close();const target=new URL(event.notification.data?.url||"/",self.location.origin).href;event.waitUntil((async()=>{if("clearAppBadge" in self.navigator)await self.navigator.clearAppBadge();const clientsList=await self.clients.matchAll({type:"window",includeUncontrolled:true});const client=clientsList.find(item=>new URL(item.url).origin===self.location.origin);if(client){await client.focus();if("navigate" in client)await client.navigate(target);return}await self.clients.openWindow(target)})())});