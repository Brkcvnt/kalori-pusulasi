const CACHE='kalori-pusulasi-v15';
const ASSETS=['./','./index.html','./style.css?v=15','./theme.js?v=11','./app.js?v=15','./history-view.js?v=15','./navigation.js?v=13','./planner.js?v=15','./core.js','./insights.js?v=14','./insights.js?v=7','./sync.js?v=15','./reminder.js?v=7','./diary.js?v=14','./diary.js?v=7','./barcode.js?v=7','./zxing-browser-0.1.5.min.js','./food-picker.js?v=15','./food-search.js?v=15','./meal-capture.js?v=14','./fast-food-tr.json','./usda-foods.json','./packaged-foods.json','./manifest.webmanifest?v=11','./icon.svg?v=11','./icon-dark.svg?v=11','./icon-192.png?v=11','./icon-512.png?v=11'];
const urls=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
const shell=new URL('./index.html',self.registration.scope).href;

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(path=>new Request(
  new URL(path,self.registration.scope),{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys
  .filter(key=>key.startsWith('kalori-pusulasi-')&&key!==CACHE)
  .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 const navigation=request.mode==='navigate'&&
  (url.href.split('?')[0]===shell||url.href.split('?')[0]===self.registration.scope);
 if(!navigation&&!urls.has(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>
  (await cache.match(navigation?shell:request))??fetch(request)));
});
