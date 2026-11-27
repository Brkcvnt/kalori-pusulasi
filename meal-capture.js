import {entryCalories} from './core.js';
import {normalize} from './food-search.js?v=7';

const number = new Intl.NumberFormat('tr-TR', {maximumFractionDigits:1});
const endpoint = './api/meal-photo';

function element(tag, text) {
 const node = document.createElement(tag);
 if (text !== undefined) node.textContent = text;
 return node;
}

function encodePhoto(source,width,height) {
 const scale=Math.min(1,1280/Math.max(width,height));
 const canvas=element('canvas');
 canvas.width=Math.max(1,Math.round(width*scale));
 canvas.height=Math.max(1,Math.round(height*scale));
 const context=canvas.getContext('2d');
 context.fillStyle='white';
 context.fillRect(0,0,canvas.width,canvas.height);
 context.drawImage(source,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/jpeg',.82);
}

function prepareImage(file) {
 return new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
   try {
    resolve(encodePhoto(image,image.naturalWidth,image.naturalHeight));
   } catch { reject(Error('Fotoğraf hazırlanamadı.')); }
   finally { URL.revokeObjectURL(url); }
  };
  image.onerror = () => {
   URL.revokeObjectURL(url);
   reject(Error('Fotoğraf açılamadı. JPEG, PNG veya WebP deneyebilirsin.'));
  };
  image.src = url;
 });
}

export function setupMealCapture({searchFoods, addEntries, cloudAnalysis}) {
 const get = id => document.getElementById(id);
 const dialog = get('meal-capture');
 const brand = get('capture-brand');
 const search = get('capture-search');
 const results = get('capture-results');
 const status = get('capture-status');
 const file = get('capture-photo');
 const image = get('capture-preview');
 const analyze = get('capture-analyze');
 const providerNotice = get('capture-provider-notice');
 const video = get('capture-camera-video');
 const cameraPanel = get('capture-camera-panel');
 const cameraButton = get('capture-camera-start');
 const shutter = get('capture-camera-shutter');
 let cameraSession=0;
 const items = get('capture-items');
 const form = get('capture-form');
 const save = get('capture-save');
 let rows = [], catalog, isPhoto, photo, service, pending, generation = 0;

 const loadCatalog = () => fetch('./fast-food-tr.json').then(response => {
  if (!response.ok) throw Error();
  return response.json();
 });
 function findProducts(query) {
  const words = normalize(query).split(' ').filter(Boolean);
  return (catalog?.products ?? []).filter(product => {
   const haystack = normalize(product.brand + ' ' + product.name);
   return (!brand.value || product.brand === brand.value) && words.every(word => haystack.includes(word));
  });
 }
 function menuEntry(product) {
  return {name:product.name, brand:product.brand, unit:product.unit, portionKcal:product.kcal,
   source:catalog.sources[product.brand][0], macros:product.macros};
 }
 function foodEntry(food) {
  return {name:food.name.slice(0,80), brand:food.brand, unit:food.unit, per100:food.per100,
   source:food.source, sourceId:food.id, macros:food.macros, extras:food.extras, measures:food.measures};
 }
 function options(query) {
  const chain = findProducts(query);
  const named = chain.slice(0, 30).map(product => ({
   label:product.brand+' · '+product.name, product,
   entry:product.kcal===null?null:menuEntry(product)
  }));
  return isPhoto && normalize(query).length>=2
   ? [...named, ...searchFoods(query).map(food => ({label:food.name+(food.brand?' · '+food.brand:''), entry:foodEntry(food)}))]
   : named;
 }
 function quantities(row) {
  const amount = Number(row.amount);
  const entry = {...row.entry, grams:amount};
  return {...entry,kcal:entryCalories(entry)};
 }
 function updateTotal() {
  try {
   if (!rows.length) throw Error();
   let total=0, low=0, high=0, hasRange=false;
   for (const row of rows) {
    if (!row.entry || !row.amount) throw Error();
    const entry=quantities(row);
    total+=entry.kcal;
    const range = row.guess && !row.edited && entry.portionKcal===undefined && entry.unit===row.guess.unit;
    low+=range?entryCalories(entry, row.guess.min):entry.kcal;
    high+=range?entryCalories(entry, row.guess.max):entry.kcal;
    hasRange ||= Boolean(range);
   }
   get('capture-total').textContent=(hasRange?'Tahmini toplam ':'Toplam ')+number.format(total)+' kcal'+
    (hasRange?' · porsiyon aralığı '+number.format(low)+'–'+number.format(high)+' kcal':'');
   save.disabled=false;
  } catch {
   get('capture-total').textContent=rows.length?'Her satır için bir besin ve miktar seç.':'Henüz ürün eklenmedi.';
   save.disabled=true;
  }
 }
 function renderRows() {
  items.replaceChildren();
  for (const row of rows) {
   const article=element('article');
   article.append(element('strong',row.title));
   if (row.guess) {
    const label=element('label','Katalogda ara');
    const query=element('input');
    query.type='search';
    query.maxLength=80;
    query.value=row.query;
    label.append(query);
    const select=element('select');
    select.setAttribute('aria-label',row.title+' için katalog kaydı');
    function fillChoices() {
     const matches=options(row.query).filter(option=>option.entry);
     select.replaceChildren(new Option('Besin seç',''), ...matches.map((option,index)=>new Option(option.label,String(index))));
     if(row.entry)select.value=String(matches.findIndex(option=>JSON.stringify(option.entry)===JSON.stringify(row.entry)));
     select.onchange=()=>{
      row.entry=select.value===''?null:matches[Number(select.value)].entry;
      row.amount=row.entry?.unit===row.guess.unit?row.guess.amount:'';
      row.edited=false;
      renderRows();
     };
    }
    query.oninput=()=>{row.query=query.value;row.entry=null;row.amount='';fillChoices();amount.value='';amount.disabled=true;updateTotal();};
    fillChoices();
    article.append(label,select,element('small','Fotoğraf tahmini '+row.guess.min+'–'+row.guess.max+' '+row.guess.unit));
   }
   const label=element('label','Miktar'+(row.entry?' ('+row.entry.unit+')':''));
   const amount=element('input');
   amount.type='number';
   amount.min='0.001';
   amount.max='10000';
   amount.step='any';
   amount.required=true;
   amount.disabled=!row.entry;
   amount.value=row.amount;
   amount.oninput=()=>{row.amount=amount.value;row.edited=true;updateTotal();};
   label.append(amount);
   const remove=element('button','Çıkar');
   remove.type='button';
   remove.className='ghost';
   remove.setAttribute('aria-label',row.title+' öğesini çıkar');
   remove.onclick=()=>{rows=rows.filter(item=>item!==row);renderRows();};
   article.append(label,remove);
   items.append(article);
  }
  updateTotal();
 }
 function renderResults() {
  const query=search.value.trim();
  results.replaceChildren();
  if (isPhoto && !query) return;
  const matches=options(query);
  if (!matches.length) results.append(element('p',catalog?'Ürün bulunamadı.':'Katalog yükleniyor…'));
  for (const option of matches) {
   const article=element('article');
   const product=option.product;
   if (option.entry) {
    const energy=product?number.format(product.kcal)+' kcal / '+product.unit:number.format(option.entry.per100)+' kcal / 100 '+option.entry.unit;
    const button=element('button',option.label+' · '+energy);
    button.type='button';
    button.className='ghost';
    button.onclick=()=>{
     rows.push({title:option.label,entry:option.entry,amount:product?1:100});
     renderRows();
    };
    article.append(button);
   } else article.append(element('strong',option.label),element('small','Besin değeri yayımlanmamış veya doğrulanamadı. Bilinen bileşenleri ayrı ayrı ekleyebilirsin.'));
   if (product) {
    const [url,label]=catalog.sources[product.brand];
    const link=element('a',label+' · kontrol '+catalog.checked);
    link.href=url;
    link.target='_blank';
    link.rel='noopener noreferrer';
    article.append(link);
   }
   results.append(article);
  }
  if (!isPhoto && findProducts(query).length>matches.length) results.append(element('small','İlk '+matches.length+' sonuç gösteriliyor. Marka seç veya aramayı daralt.'));
 }
 function updateAnalyze() {
  analyze.disabled=!photo||!service||Boolean(pending);
 }
 function stopCamera() {
  cameraSession++;
  video.srcObject?.getTracks().forEach(track=>track.stop());
  video.srcObject=null;
  cameraPanel.hidden=true;
  cameraButton.disabled=false;
  shutter.disabled=true;
 }
 function showPhoto(prepared) {
  pending?.abort();
  pending=null;
  rows=rows.filter(row=>!row.guess);
  renderRows();
  photo=prepared;
  image.src=photo;
  image.hidden=false;
  status.textContent=service?'Fotoğraf hazır. Analiz edebilir veya besinleri elle ekleyebilirsin.':'Fotoğraf hazır. Besinleri arayıp tek tek ekle.';
  updateAnalyze();
 }
 async function startCamera() {
  stopCamera();
  const session=cameraSession;
  cameraPanel.hidden=false;
  cameraButton.disabled=true;
  status.textContent='Kamera açılıyor…';
  try {
   if(!navigator.mediaDevices?.getUserMedia)throw Error();
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
   if(session!==cameraSession||!dialog.open){
    stream.getTracks().forEach(track=>track.stop());
    return;
   }
   video.srcObject=stream;
   await video.play();
   if(session!==cameraSession)return;
   shutter.disabled=!video.videoWidth;
   status.textContent='Yemeği kadraja al ve Fotoğraf çek’e dokun.';
  } catch(error) {
   if(session!==cameraSession)return;
   stopCamera();
   status.textContent=error.name==='NotAllowedError'?'Kamera izni verilmedi. İzin ayarlarını kontrol et veya galeriden fotoğraf seç.':'Kamera açılamadı. Galeriden fotoğraf seçebilirsin.';
  }
 }
 video.addEventListener('loadeddata',()=>{shutter.disabled=!video.srcObject||!video.videoWidth;});
 cameraButton.onclick=startCamera;
 get('capture-camera-stop').onclick=()=>{stopCamera();status.textContent='Kamera kapatıldı.';};
 shutter.onclick=()=>{
  if(!video.srcObject||!video.videoWidth)return;
  try {
   const prepared=encodePhoto(video,video.videoWidth,video.videoHeight);
   stopCamera();
   file.value='';
   showPhoto(prepared);
  } catch {status.textContent='Fotoğraf çekilemedi. Tekrar dene.';}
 };
 async function open(photoMode, cameraMode=false) {
  const ticket=++generation;
  isPhoto=photoMode;
  rows=[];
  photo=null;
  service=false;
  providerNotice.hidden=true;
  pending=null;
  file.value='';
  image.removeAttribute('src');
  image.hidden=true;
  get('capture-photo-panel').hidden=!isPhoto;
  get('capture-brand-label').hidden=isPhoto;
  brand.value='';
  search.value='';
  status.textContent='';
  get('capture-title').textContent=isPhoto?'Fotoğraftan öğün ekle':'Fast food kataloğu';
  updateAnalyze();
  renderResults();
  renderRows();
  dialog.showModal();
  if(cameraMode)startCamera();
  if (!catalog) loadCatalog().then(data=>{
   catalog=data;
   if (!dialog.open || ticket!==generation) return;
   brand.replaceChildren(new Option('Tüm markalar',''),...Object.keys(data.sources).map(name=>new Option(name,name)));
   if (!search.value && !isPhoto) brand.value='Burger King';
   renderResults();
  }).catch(()=>{
   if (dialog.open && ticket===generation) status.textContent='Fast food kataloğu yüklenemedi.';
  });
  else if (!isPhoto && brand.options.length<2) {
   brand.replaceChildren(new Option('Tüm markalar',''),...Object.keys(catalog.sources).map(name=>new Option(name,name)));
  }
  if (isPhoto) {
   let notice='Fotoğraf analizi şu anda kullanılamıyor. Besinleri elle ekleyebilirsin.';
   let selectedService=false;
   try {
    const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(4000)});
    if(response.ok&&(await response.json()).available===true)selectedService='local';
   }catch{}
   if(ticket!==generation||!dialog.open)return;
   if(!selectedService)try{
    const health=await cloudAnalysis({check:true},AbortSignal.timeout(8000));
    if(health.available===true&&health.provider==='Gemini')selectedService='cloud';
   }catch(error){
    if(error.status===401)notice='Otomatik analiz için Profil → Cihazlar arasında eşitle bölümünden hesabına giriş yap.';
    else if(error.status===403)notice='Bu hesapta otomatik analiz yetkisi yok.';
    else if(error.status===503)notice='Fotoğraf analiz servisi henüz yapılandırılmadı.';
   }
   if(ticket!==generation||!dialog.open)return;
   service=selectedService;
   providerNotice.hidden=!service;
   providerNotice.textContent=service==='cloud'?'Analiz et’e bastığında fotoğraf Google Gemini’ye gönderilir. Ücretsiz kotada Google fotoğrafları ürünlerini geliştirmek için kullanabilir.':'Analiz et’e bastığında fotoğraf OpenAI’a gönderilir.';
   if(!service&&cameraPanel.hidden&&(!status.textContent||photo))status.textContent=notice;
   updateAnalyze();
  }
 }
 get('open-photo-meal').onclick=()=>open(true);
 get('open-camera-meal').onclick=()=>open(true,true);
 get('open-fast-food').onclick=()=>open(false);
 get('capture-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{
  generation++;
  stopCamera();
  pending?.abort();
  pending=null;
  photo=null;
  file.value='';
  image.removeAttribute('src');
  image.hidden=true;
 });
 search.oninput=brand.onchange=renderResults;
 file.onchange=async()=>{
  stopCamera();
  const chosen=file.files[0];
  const ticket=generation;
  pending?.abort();
  photo=null;
  image.hidden=true;
  image.removeAttribute('src');
  updateAnalyze();
  if(!chosen)return;
  try {
   if(chosen.size>25*1024*1024)throw Error('25 MB altında bir fotoğraf seç.');
   const prepared=await prepareImage(chosen);
   if(ticket!==generation||file.files[0]!==chosen)return;
   showPhoto(prepared);
  } catch(error) {
   if(ticket===generation && file.files[0]===chosen)status.textContent=error.message;
  }
  updateAnalyze();
 };
 analyze.onclick=async()=>{
  if(!photo||!service||pending)return;
  const ticket=generation;
  const controller=new AbortController();
  pending=controller;
  updateAnalyze();
  status.textContent='Fotoğraf inceleniyor…';
  try {
   const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(45000)]);
   let data;
   if(service==='cloud')data=await cloudAnalysis({image:photo},signal);
   else{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({image:photo}),signal});
    if(!response.ok)throw Error('Analiz tamamlanamadı. Tekrar dene veya besinleri elle ekle.');
    data=await response.json();
   }
   if(ticket!==generation||controller.signal.aborted)return;
   rows=rows.filter(row=>!row.guess);
   rows.push(...data.items.map(guess=>({guess,title:guess.name,query:guess.name,entry:null,amount:''})));
   status.textContent=data.items.length?(data.note||'Her öneri için uygun katalog kaydını seç.'):'Yiyecek belirlenemedi. Daha net bir fotoğraf dene veya besinleri elle ekle.';
   renderRows();
  } catch(error) {
   if(ticket===generation&&!controller.signal.aborted)status.textContent=error.status===429?'Ücretsiz analiz kotası doldu. Daha sonra tekrar dene veya besinleri elle ekle.':error.name==='TimeoutError'?'Analiz zaman aşımına uğradı.':error.message;
  } finally {
   if(pending===controller){pending=null;updateAnalyze();}
  }
 };
 form.onsubmit=event=>{
  event.preventDefault();
  if(save.disabled)return;
  try { addEntries(rows.map(quantities));dialog.close(); }
  catch(error){status.textContent=error.message;}
 };
}
