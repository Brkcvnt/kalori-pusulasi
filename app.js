import {calculate,total,calories,dateKey} from './core.js';
const $=s=>document.querySelector(s), key='kalori-pusulasi-v1';
let state={version:1,profile:null,days:{}}, timer, storageOK=true;
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('#toast').hidden=true,4500);}
try{const saved=localStorage.getItem(key);if(saved)state=validate(JSON.parse(saved));}catch{storageOK=false;setTimeout(()=>toast('Kayıtlar okunamadı. Yedek al; tarayıcı depolamasını kontrol et.'),100);}
function validate(s){
 if(s.version!==1||!s.days||typeof s.days!=='object'||Array.isArray(s.days))throw Error('Yedek biçimi geçersiz.');
 if(s.profile){calculate(s.profile);if(s.profile.custom && (!Number.isFinite(+s.profile.custom)||+s.profile.custom<1000||+s.profile.custom>6000))throw Error('Hedef geçersiz.');}
 for(const [d,v] of Object.entries(s.days)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Array.isArray(v.entries)||v.entries.length>10000||!(v.target===null||(Number.isFinite(v.target)&&v.target>0)))throw Error('Gün kaydı geçersiz.');
  for(const e of v.entries)if(typeof e.name!=='string'||e.name.length>80||!['Kahvaltı','Öğle yemeği','Akşam yemeği','Ara öğün'].includes(e.meal)||typeof e.id!=='string'||!Number.isFinite(e.kcal)||e.kcal!==calories(e.per100,e.grams))throw Error('Besin kaydı geçersiz.');
 }return s;
}
function save(){try{localStorage.setItem(key,JSON.stringify(state));storageOK=true;$('#save-status').textContent='✓ Bu tarayıcıya kaydedildi';return true;}catch{storageOK=false;$('#save-status').textContent='Kaydedilemedi · Yedek indir';toast('Cihaza kaydedilemedi. Kaybetmemek için yedeğini indir.');return false;}}
function goal(){return state.profile ? (+state.profile.custom||calculate(state.profile)):null;}
$('#day').value=dateKey();$('#day').max=dateKey();
function day(){return state.days[$('#day').value]||{target:goal(),entries:[]};}
function num(n){return Math.round(n).toLocaleString('tr-TR');}
const foods=[['Yulaf ezmesi',370],['Yoğurt (sade)',61],['Süt',61],['Yumurta (haşlanmış)',155],['Tavuk göğsü (pişmiş)',165],['Pirinç (pişmiş)',130],['Bulgur (pişmiş)',83],['Elma',52],['Muz',89],['Tam buğday ekmeği',247],['Beyaz peynir',260],['Zeytinyağı',884],['Badem',579],['Mercimek çorbası',70]];
for(const [name] of foods){const o=document.createElement('option');o.value=name;$('#foods').append(o);}
const ff=$('#food-form'),pf=$('#profile-form');
ff.elements.name.addEventListener('input',()=>{const food=foods.find(f=>f[0].toLocaleLowerCase('tr')===ff.elements.name.value.toLocaleLowerCase('tr'));if(food){ff.elements.per100.value=food[1];preview();}});
function preview(){try{$('#food-preview').textContent=num(calories(+ff.elements.per100.value,+ff.elements.grams.value))+' kcal';}catch{$('#food-preview').textContent='— kcal';}}
ff.addEventListener('input',preview);
ff.addEventListener('submit',e=>{e.preventDefault();try{const name=ff.elements.name.value.trim();if(!name)throw Error('Besin adını yaz.');if(!$('#day').value)throw Error('Bir gün seç.');const grams=+ff.elements.grams.value,per100=+ff.elements.per100.value;const record=day();record.entries.push({id:crypto.randomUUID(),name,meal:ff.elements.meal.value,grams,per100,kcal:calories(per100,grams)});state.days[$('#day').value]=record;const ok=save();ff.reset();preview();render();if(ok)toast('Besin günlüğüne eklendi.');}catch(err){toast(err.message);}});
pf.addEventListener('submit',e=>{e.preventDefault();try{const p=Object.fromEntries(new FormData(pf));calculate(p);state.profile=p;const d=$('#day').value;if(d===dateKey())state.days[d]={...day(),target:goal()};const ok=save();render();if(ok)toast('Profilin ve hedefin kaydedildi.');}catch(err){toast(err.message);}});
if(state.profile)for(const [k,v]of Object.entries(state.profile))if(pf.elements[k])pf.elements[k].value=v;
$('#day').addEventListener('change',()=>{if(!$('#day').value||$('#day').value>dateKey())$('#day').value=dateKey();render();});
$('#today').onclick=()=>{$('#day').value=dateKey();$('#day').max=dateKey();render();};
function render(){
 const record=day(),sum=total(record.entries),target=record.target,diff=target===null?null:target-sum;
 $('#consumed').textContent=num(sum);$('#target').textContent=target===null?'—':num(target);$('#difference').textContent=diff===null?'—':num(Math.abs(diff));
 $('#difference-label').textContent=diff!==null&&diff<0?'Hedefin üzerinde':'Hedefe kalan';$('#difference-note').textContent=target===null?'Profilini tamamla':'kcal';
 $('#balance-title').textContent=diff===null?'Önce seni tanıyalım.':diff<0?`Hedefinin ${num(-diff)} kcal üzerindesin.`:diff===0?'Günlük hedefine ulaştın.':`Hedefine ${num(diff)} kcal kaldı.`;
 $('#balance-note').textContent=target===null?'Günlük ihtiyacını görmek için profilini doldur.':`${num(sum)} kcal alındı · ${num(target)} kcal günlük hedef`;
 $('#ring').style.background=`conic-gradient(#d8e98c ${target?Math.min(sum/target,1)*360:0}deg,#36574b 0)`;
 $('#entry-count').textContent=record.entries.length+' kayıt';$('#entries').replaceChildren();
 if(!record.entries.length){const p=document.createElement('p');p.className='empty';p.textContent='Günlüğün yeni bir başlangıca hazır. İlk besinini ekle.';$('#entries').append(p);}
 for(const entry of record.entries){const row=document.createElement('div');row.className='entry';const info=document.createElement('div');info.className='entry-info';const name=document.createElement('strong');name.textContent=entry.name;const small=document.createElement('small');small.textContent=`${entry.meal} · ${entry.grams} g / ml`;info.append(name,small);const kcal=document.createElement('strong');kcal.textContent=num(entry.kcal)+' kcal';const btn=document.createElement('button');btn.className='delete';btn.textContent='×';btn.setAttribute('aria-label',entry.name+' kaydını sil');btn.onclick=()=>{record.entries=record.entries.filter(x=>x.id!==entry.id);state.days[$('#day').value]=record;save();render();};row.append(info,kcal,btn);$('#entries').append(row);}
 $('#profile-result').textContent=state.profile?`Kilonu koruma tahmini: ${num(calculate(state.profile))} kcal/gün. ${state.profile.custom?'Özel hedefin: '+num(+state.profile.custom)+' kcal.':''}`:'';
 $('#history-chart').replaceChildren();
 for(let i=6;i>=0;i--){const d=new Date($('#day').value+'T12:00:00');d.setDate(d.getDate()-i);const k=dateKey(d),v=state.days[k],value=v?total(v.entries):0;const t=v?v.target:goal();const item=document.createElement('div');item.className='history-day'+(i===0?' active':'');const b=document.createElement('b');b.textContent=d.toLocaleDateString('tr-TR',{weekday:'short'});const track=document.createElement('div');track.className='bar-track';const bar=document.createElement('div');bar.className='bar';bar.style.height=Math.min(t?value/t*90:value/2500*90,90)+'px';track.append(bar);const s=document.createElement('small');s.textContent=v?num(value)+' kcal':'Kayıt yok';const em=document.createElement('em');em.textContent=t?'Hedef '+num(t):'Hedef yok';item.append(b,track,s,em);$('#history-chart').append(item);}
}
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kalori-pusulasi-'+dateKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('Yedek 5 MB’dan küçük olmalı.');const next=validate(JSON.parse(await file.text()));if(!confirm('Bu yedek mevcut profil ve günlük kayıtlarının yerini alacak. Önce mevcut yedeğini indirdiğinden emin ol. Devam edilsin mi?'))return;state=next;for(const el of pf.elements)if(el.name)el.value=state.profile?.[el.name]??(el.name==='sex'?'female':el.name==='activity'?'1.2':'');const ok=save();render();if(ok)toast('Yedek geri yüklendi.');}catch(err){toast('Yedek yüklenemedi: '+err.message);}finally{e.target.value='';}};
let installEvent;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#install').hidden=false;});$('#install').onclick=async()=>{await installEvent?.prompt();$('#install').hidden=true;};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){$('#day').max=dateKey();render();}});render();
