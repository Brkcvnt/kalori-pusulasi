import {localFoods,productFood,searchFoods,searchUrl,fallbackSearchUrl,responseFoods,normalize} from './food-search.js?v=5';

export function setupFoodPicker({form,onChange,onError}){
 const input=form.elements.name,per100=form.elements.per100;
 const results=document.querySelector('#food-results'),status=document.querySelector('#food-search-status'),detail=document.querySelector('#selected-food'),online=document.querySelector('#search-online');
 let catalog=[],selected=null,controller,revision=0,lastRequest=0,lastQuery='',lastResults=[],searchTimer,active=-1;
 const setStatus=text=>status.textContent=text;
 function closeResults(){clearTimeout(searchTimer);results.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function openResults(){results.hidden=!results.childElementCount;input.setAttribute('aria-expanded',String(!results.hidden));}
 function cancelSearch(){clearTimeout(searchTimer);++revision;controller?.abort();}
 function scheduleSearch(){
  closeResults();results.replaceChildren();
  if(normalize(input.value).length<2){setStatus('En az 2 harf yaz veya barkod gir.');return;}
  setStatus('Besinler aranıyor…');
  searchTimer=setTimeout(searchLocal,150);
 }
 function clear(){selected=null;per100.value='';detail.replaceChildren();document.querySelector('#add-food').disabled=true;onChange();}
 async function choose(food){
  if(food.per100===null)return;
  cancelSearch();closeResults();selected=food;input.value=food.name.slice(0,80);per100.value=food.per100;
  detail.replaceChildren();const strong=document.createElement('strong');strong.textContent=food.name;
  const p=document.createElement('p');p.textContent=(food.brand?food.brand+' · ':'')+food.per100.toLocaleString('tr-TR')+' kcal / 100 '+food.unit;
  const a=document.createElement('a');a.href=food.url;a.target='_blank';a.rel='noopener';a.textContent='Kaynak: '+food.source+' ↗';
  detail.append(strong,p,a);if(food.original&&food.original!==food.name){const s=document.createElement('small');s.textContent=food.original;detail.append(s);}
  detail.hidden=false;results.replaceChildren();setStatus('Besin seçildi. Yediğin miktarı gir.');document.querySelector('#amount-label').textContent='Miktar ('+food.unit+')';document.querySelector('#add-food').disabled=false;onChange();
  if(food.source==='Open Food Facts'&&navigator.onLine){
   const id=revision;const refresh=new AbortController();controller=refresh;const timeout=setTimeout(()=>refresh.abort(),8000);
   setStatus('Ürünün güncel etiketi internetten kontrol ediliyor…');document.querySelector('#add-food').disabled=true;
   try{const response=await fetch(searchUrl(food.code),{signal:refresh.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error();const live=responseFoods(await response.json())[0];if(id!==revision)return;
    if(live&&live.id!==food.id)throw Error('Product identity mismatch');
    if(!live||live.per100===null){clear();detail.hidden=true;setStatus('Bu ürünün güncel kaynağında kalori bilgisi bulunamadı. Başka bir ürün seç.');return;}
    selected=live;input.value=live.name.slice(0,80);per100.value=live.per100;strong.textContent=live.name;p.textContent=(live.brand?live.brand+' · ':'')+live.per100.toLocaleString('tr-TR')+' kcal / 100 '+live.unit;
    setStatus('Güncel kalori internetten alındı. Yediğin miktarı gir.');onChange();
   }catch{if(id===revision)setStatus('Güncel etikete erişilemedi. Cihazdaki kaynak değeri kullanılıyor; ambalajdaki ürünle eşleştiğini kontrol et.');}
   finally{clearTimeout(timeout);if(id===revision&&selected)document.querySelector('#add-food').disabled=false;}
  }
 }
 function show(foods){
  closeResults();const fragment=document.createDocumentFragment();
  for(const f of foods){
   const b=document.createElement('button');b.type='button';b.className='food-result';b.id='food-option-'+fragment.childElementCount;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.disabled=f.per100===null;
   const title=document.createElement('strong');title.textContent=f.name;
   const subtitle=document.createElement('small');subtitle.textContent=[f.brand,f.source,f.per100===null?'Kalori bilgisi yok':f.per100.toLocaleString('tr-TR')+' kcal / 100 '+f.unit].filter(Boolean).join(' · ');
   b.append(title,subtitle);b.onclick=()=>choose(f);fragment.append(b);
  }
  results.replaceChildren(fragment);if(document.activeElement===input)openResults();
 }
 function searchLocal(){
  const query=input.value.trim();const found=searchFoods(catalog,query,12);
  show(found);setStatus(query.length<2?'En az 2 harf yaz veya barkod gir.':found.length?found.length+' sonuç gösteriliyor. Marka ve hazırlanışına göre bir besin seç; farklı ürün için İnternette ara’ya dokun.':'Katalogda bulunamadı. İnternette ara’yı dene.');
 }
 input.addEventListener('input',e=>{cancelSearch();clear();detail.hidden=true;closeResults();if(!e.isComposing)scheduleSearch();});
 input.addEventListener('compositionend',scheduleSearch);
 input.addEventListener('focus',()=>{if(!selected)scheduleSearch();});
 input.addEventListener('keydown',e=>{
  if(e.isComposing)return;
  if(e.key==='Escape'){e.preventDefault();closeResults();return;}
  const options=[...results.children].filter(b=>!b.disabled);
  if((e.key==='ArrowDown'||e.key==='ArrowUp')&&options.length){
   e.preventDefault();openResults();active=active<0?(e.key==='ArrowDown'?0:options.length-1):(active+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
   for(const b of results.children)b.setAttribute('aria-selected',String(b===options[active]));
   input.setAttribute('aria-activedescendant',options[active].id);options[active].scrollIntoView({block:'nearest'});return;
  }
  if(e.key==='Enter'){e.preventDefault();if(!results.hidden&&active>=0)options[active]?.click();else online.click();}
 });
 // Keep touch/click selection reliable when focus leaves the input.
 results.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
 document.addEventListener('pointerdown',e=>{if(e.target!==input&&!results.contains(e.target))closeResults();});
 form.addEventListener('focusout',e=>{if(e.relatedTarget!==input&&!results.contains(e.relatedTarget))closeResults();});
 online.onclick=async()=>{
  clearTimeout(searchTimer);const query=input.value.trim();if(normalize(query).length<2){setStatus('Aramak için en az 2 harf yaz veya barkod gir.');return;}
  if(lastQuery===query&&lastResults.length){show(lastResults);openResults();setStatus('Son çevrimiçi aramanın sonuçları. Bir ürün seç.');return;}
  const wait=7000-(Date.now()-lastRequest);if(wait>0){setStatus('Yeni internet araması için '+Math.ceil(wait/1000)+' saniye bekle.');return;}
  const id=++revision;controller?.abort();const ownController=new AbortController();controller=ownController;lastRequest=Date.now();online.disabled=true;
  setStatus('İnternette aranıyor…');const timeout=setTimeout(()=>ownController.abort(),20000);
  try{
   let response;
   const options={signal:ownController.signal,credentials:'omit',referrerPolicy:'no-referrer'};
   try{response=await fetch(searchUrl(query),options);}catch(err){if(ownController.signal.aborted||/^\d{8,14}$/.test(query)||window.AndroidBackup)throw err;response=await fetch(fallbackSearchUrl(query),options);}
   if(!response.ok)throw Error(response.status===429?'Arama sınırına ulaşıldı. Bir dakika sonra dene.':'Ürün servisine şu anda erişilemiyor.');
   const foods=responseFoods(await response.json());if(id!==revision)return;
   lastQuery=query;lastResults=foods;show(foods);openResults();
   setStatus(foods.length?foods.length+' çevrimiçi sonuç. Kalorisi bulunmayan ürünler seçilemez.':'Ürün bulunamadı. Marka + ürün adıyla veya barkodla tekrar dene.');
  }catch(err){
   if(id!==revision)return;searchLocal();openResults();const localCount=searchFoods(catalog,query).length;
   setStatus((err.name==='AbortError'?'Arama zaman aşımına uğradı.':err.message==='Failed to fetch'?'Çevrimiçi arama servisine erişilemiyor.':err.message)+' '+(localCount?'Aşağıdaki sonuçlar cihazdaki kaynak kataloğundan gösteriliyor.':'Bağlantını kontrol et veya daha genel bir besin adı dene.'));
  }finally{clearTimeout(timeout);online.disabled=false;}
 };
 // Only the selected public nutrition records are cached; diary and profile data are never sent.
 let remembered=[];try{const saved=JSON.parse(localStorage.getItem('kalori-pusulasi-food-cache')||'[]');remembered=saved.filter(f=>f.source==='Open Food Facts'&&/^off:\d{4,14}$/.test(f.id)&&typeof f.name==='string'&&Number.isFinite(f.per100)&&f.per100>=0&&f.per100<=1000).slice(-100).map(f=>({...f,url:'https://world.openfoodfacts.org/product/'+f.id.slice(4)}));}catch{}
 catalog.push(...remembered);
 Promise.allSettled([fetch('./usda-foods.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>localFoods(d.foods)),fetch('./packaged-foods.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>d.products.map(productFood).filter(Boolean))]).then(parts=>{
  const unique=new Map(catalog.map(f=>[f.id,f]));for(const p of parts)if(p.status==='fulfilled')for(const f of p.value)if(!unique.has(f.id))unique.set(f.id,f);
  catalog=[...unique.values()];searchFoods(catalog,'');document.querySelector('#catalog-count').textContent=catalog.length.toLocaleString('tr-TR')+' besin ve ürün cihaz kataloğunda';
  if(!selected&&document.activeElement===input)scheduleSearch();if(parts.some(p=>p.status==='rejected'))onError('Besin kataloğunun bir bölümü yüklenemedi. İnternet aramasını kullanabilir veya sayfayı yenileyebilirsin.');
 });
 clear();
 return {getSelected(){return selected;},remember(){if(selected?.source==='Open Food Facts'){remembered=[...remembered.filter(f=>f.id!==selected.id),selected].slice(-100);try{localStorage.setItem('kalori-pusulasi-food-cache',JSON.stringify(remembered));}catch{}}},reset(){cancelSearch();closeResults();clear();detail.hidden=true;results.replaceChildren();setStatus('Yeni besin için ad veya barkod yaz.');}};
}
