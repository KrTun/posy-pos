/* 手作攤收銀 — 離線用的 Service Worker。
   策略：同網域的 GET 走「先連網、連不到才用快取」，所以有網路時一定拿到最新版，
   沒網路時照樣能記帳。跨網域（Google 字型、Apps Script 同步）一律直接走網路，不碰快取。 */
var CACHE = "posy-pos-v3";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var r = e.request;
  if (r.method !== "GET") return;                                  // 同步用的 POST 不攔
  if (new URL(r.url).origin !== self.location.origin) return;      // 字型、Apps Script 直接走網路
  // cache:"no-cache" 會強制跟伺服器驗證。GitHub Pages 送 max-age=600，
  // 不這樣做的話改版後最多十分鐘才會生效，使用者只會看到舊畫面。
  e.respondWith(
    fetch(r.url, {cache:"no-cache", credentials:"same-origin"}).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(r, copy); });
      return res;
    }).catch(function(){
      return caches.match(r).then(function(hit){ return hit || caches.match("./index.html"); });
    })
  );
});
