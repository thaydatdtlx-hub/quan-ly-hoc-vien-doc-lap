import {readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";

const root=new URL("../",import.meta.url);
const [sql,client,worker,edge,adminHtml,studentHtml]=await Promise.all([
  readFile(new URL("CAP-NHAT-THONG-BAO-DAY-BUOC-12.sql",root),"utf8"),
  readFile(new URL("push-notifications.js",root),"utf8"),
  readFile(new URL("public/sw.js",root),"utf8"),
  readFile(new URL("supabase/functions/web-push/index.ts",root),"utf8"),
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("hoc-vien.html",root),"utf8")
]);

for(const token of ["app_push_subscriptions","app_save_push_subscription","app_disable_push_subscription","app_create_push_test_notification","enable row level security"]){
  if(!sql.includes(token))throw new Error(`SQL Push thiếu: ${token}`);
}
for(const token of ["Notification.requestPermission","pushManager.subscribe","app_save_push_subscription","app_create_push_test_notification","applicationServerKey"]){
  if(!client.includes(token))throw new Error(`Giao diện Push thiếu: ${token}`);
}
for(const token of ['addEventListener("push"','showNotification','addEventListener("notificationclick"','openWindow','setAppBadge']){
  if(!worker.includes(token))throw new Error(`Service Worker Push thiếu: ${token}`);
}
for(const token of ["webpush.setVapidDetails","webpush.sendNotification","SUPABASE_SERVICE_ROLE_KEY","VAPID_PRIVATE_KEY","statusCode===410","app_push_subscriptions"]){
  if(!edge.includes(token))throw new Error(`Edge Function thiếu: ${token}`);
}
for(const [name,html] of [["Admin",adminHtml],["Học viên",studentHtml]]){
  for(const token of ["push-notification-panel","PushNotificationToggle","PushNotificationTest","/push-notifications.js"]){
    if(!html.toLowerCase().includes(token.toLowerCase()))throw new Error(`${name} thiếu điều khiển ${token}.`);
  }
}
const keys=JSON.parse(execFileSync(process.execPath,[new URL("generate-vapid-keys.mjs",import.meta.url).pathname],{encoding:"utf8"}));
if(keys.VAPID_PUBLIC_KEY.length!==87||keys.VAPID_PRIVATE_KEY.length<40)throw new Error("Bộ tạo khóa VAPID không hợp lệ.");
console.log("Web Push hợp lệ: đăng ký thiết bị, quyền người dùng, gửi nền, mở đúng trang, badge và thông báo thử.");
