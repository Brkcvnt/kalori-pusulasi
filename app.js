import {calculate,total,calories,dateKey} from './core.js';
import {setupFoodPicker} from './food-picker.js?v=6';
import {meals,nutrients,validateEntry,validateCollection,scaleEntries,macroTotals,historyDays} from './diary.js?v=6';
import {setupBarcodeScanner} from './barcode.js?v=6';
const $=s=>document.querySelector(s), key='kalori-pusulasi-v1';
let state={version:1,profile:null,days:{}}, timer, storageOK=true;
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('#toast').hidden=true,4500);}
try{const saved=localStorage.getItem(key);if(saved)state=validate(JSON.parse(saved));}catch{storageOK=false;setTimeout(()=>toast('Kayıtlar okunamadı. Yedek al; tarayıcı depolamasını kontrol et.'),100);}
function validate(s){
 if(s.version!==1||!s.days||typeof s.days!=='object'||Array.isArray(s.days))throw Error('Yedek biçimi geçersiz.');
 if(s.profile){calculate(s.profile);if(s.profile.custom && (!Number.isFinite(+s.profile.custom)||+s.profile.custom<1000||+s.profile.custom>6000))throw Error('Hedef geçersiz.');}
 for(const [d,v] of Object.entries(s.days)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Array.isArray(v.entries)||v.entries.length>10000||!(v.target===null||(Number.isFinite(v.target)&&v.target>0)))throw Error('Gün kaydı geçersiz.');
  v.entries.forEach(validateEntry);
 }
 if(s.collections!==undefined)validateCollection(s.collections);
 return s;
}
function save(){try{localStorage.setItem(key,JSON.stringify(state));storageOK=true;$('#save-status').textContent='✓ Bu tarayıcıya kaydedildi';return true;}catch{storageOK=false;$('#save-status').textContent='Kaydedilemedi · Yedek indir';toast('Cihaza kaydedilemedi. Kaybetmemek için yedeğini indir.');return false;}}
function goal(){return state.profile ? (+state.profile.custom||calculate(state.profile)):null;}
$('#day').value=dateKey();$('#day').max=dateKey();
function day(){return state.days[$('#day').value]||{target:goal(),entries:[]};}
function num(n){return n.toLocaleString('tr-TR',{maximumFractionDigits:1});}
const ff=$('#food-form'),pf=$('#profile-form');
function preview(){try{if(ff.elements.per100.value==='')throw Error();$('#food-preview').textContent=num(calories(+ff.elements.per100.value,+ff.elements.grams.value))+' kcal';}catch{$('#food-preview').textContent='— kcal';}}
const picker=setupFoodPicker({form:ff,onChange:preview,onError:toast});
ff.addEventListener('input',preview);
function selectedEntry(){
 const food=picker.getSelected();
 if(!food||food.per100===null)throw Error('Önce sonuçlardan bir besin seç.');
 const name=ff.elements.name.value.trim();
 if(!name||name!==food.name.slice(0,80))throw Error('Besini sonuçlardan yeniden seç.');
 if(!ff.elements.grams.reportValidity())return null;
 const grams=+ff.elements.grams.value,per100=food.per100;
 return {id:crypto.randomUUID(),name,meal:ff.elements.meal.value,grams,per100,kcal:calories(per100,grams),
  source:food.source,sourceId:food.id,unit:food.unit,brand:food.brand,macros:food.macros};
}
function resetFoodForm(){
 picker.remember();
 ff.reset();
 picker.reset();
 preview();
}
ff.addEventListener('submit',event=>{
 event.preventDefault();
 try{
  const entry=selectedEntry();
  if(!entry)return;
  const record=day();
  if(record.entries.length>=10000)throw Error('Bu gün için kayıt sınırına ulaştın.');
  record.entries.push(entry);
  state.days[$('#day').value]=record;
  const ok=save();
  resetFoodForm();
  render();
  if(ok)toast('Besin günlüğüne eklendi.');
 }catch(error){toast(error.message);}
});
$('#add-ingredient').onclick=()=>{
 try{
  const entry=selectedEntry();
  if(!entry)return;
  recipeDraft.push(entry);
  collectionForm.elements.type.value='recipe';
  updateCollectionForm();
  resetFoodForm();
  toast('Malzeme tarif taslağına eklendi.');
 }catch(error){toast(error.message);}
};
setupBarcodeScanner((code,error)=>{
 if(error){toast(error);return;}
 picker.findBarcode(code);
});
pf.addEventListener('submit',e=>{e.preventDefault();try{const p=Object.fromEntries(new FormData(pf));calculate(p);state.profile=p;const d=$('#day').value;if(d===dateKey())state.days[d]={...day(),target:goal()};const ok=save();render();if(ok)toast('Profilin ve hedefin kaydedildi.');}catch(err){toast(err.message);}});
if(state.profile)for(const [k,v]of Object.entries(state.profile))if(pf.elements[k])pf.elements[k].value=v;
$('#day').addEventListener('change',()=>{checkedEntries.clear();if(!$('#day').value||$('#day').value>dateKey())$('#day').value=dateKey();render();});
$('#today').onclick=()=>{if($('#day').value!==dateKey())checkedEntries.clear();$('#day').value=dateKey();$('#day').max=dateKey();render();};
const editDialog=$('#edit-dialog'),editForm=$('#edit-form'),collectionForm=$('#collection-form');
let editId,editDate;
const checkedEntries=new Set();
const recipeDraft=[];
const chooseMeal=(select,value)=>{
 select.replaceChildren(...meals.map(meal=>new Option(meal,meal)));
 select.value=value;
};
function startEdit(entry){
 editId=entry.id;
 editDate=$('#day').value;
 $('#edit-name').textContent=entry.name;
 $('#edit-unit').textContent=entry.unit||'g / ml';
 chooseMeal(editForm.elements.meal,entry.meal);
 editForm.elements.grams.value=entry.grams;
 editDialog.showModal();
}
editForm.addEventListener('submit',event=>{
 event.preventDefault();
 const record=state.days[editDate];
 const entry=record?.entries.find(item=>item.id===editId);
 if(!entry){editDialog.close();return;}
 try{
  const grams=+editForm.elements.grams.value;
  const kcal=calories(entry.per100,grams);
  Object.assign(entry,{grams,kcal,meal:editForm.elements.meal.value});
  const ok=save();
  editDialog.close();
  render();
  if(ok)toast('Besin kaydı güncellendi.');
 }catch(error){toast(error.message);}
});
$('#cancel-edit').onclick=()=>editDialog.close();

function updateCollectionForm(){
 const recipe=collectionForm.elements.type.value==='recipe';
 $('#recipe-servings').hidden=!recipe;
 collectionForm.elements.servings.disabled=!recipe;
 const count=checkedEntries.size+(recipe?recipeDraft.length:0);
 $('#save-collection').disabled=!count;
 $('#collection-count').textContent=count+' besin seçildi';
 $('#recipe-draft').hidden=!recipe||!recipeDraft.length;
 const list=$('#recipe-ingredients');
 list.replaceChildren();
 for(const [index,entry] of recipeDraft.entries()){
  const row=document.createElement('li');
  row.textContent=entry.name+' · '+num(entry.grams)+' '+entry.unit+' · '+num(entry.kcal)+' kcal';
  const remove=document.createElement('button');
  remove.type='button';
  remove.textContent='Çıkar';
  remove.setAttribute('aria-label',entry.name+' malzemesini çıkar');
  remove.onclick=()=>{recipeDraft.splice(index,1);updateCollectionForm();};
  row.append(remove);
  list.append(row);
 }

}
collectionForm.elements.type.onchange=updateCollectionForm;
collectionForm.addEventListener('submit',event=>{
 event.preventDefault();
 const name=collectionForm.elements.name.value.trim();
 const entries=day().entries.filter(entry=>checkedEntries.has(entry.id));
 const type=collectionForm.elements.type.value;
 const servings=type==='recipe'?+collectionForm.elements.servings.value:1;
 if(type==='recipe')entries.push(...recipeDraft);
 const item={id:crypto.randomUUID(),type,name,servings,entries:entries.map(entry=>({...entry}))};
 try{
  validateCollection([item]);
  scaleEntries(item,1);
  (state.collections??=[]).push(item);
  const ok=save();
  checkedEntries.clear();
  if(type==='recipe')recipeDraft.length=0;
  collectionForm.reset();
  render();
  if(ok)toast(type==='recipe'?'Tarif kaydedildi.':'Öğün kaydedildi.');
 }catch(error){toast(error.message);}
});
function renderCollections(){
 const list=$('#collection-list');
 list.replaceChildren();
 if(!state.collections?.length){
  const empty=document.createElement('p');
  empty.className='empty';
  empty.textContent='Kaydettiğin öğün ve tarifler burada görünecek.';
  list.append(empty);
  return;
 }
 for(const item of state.collections){
  const row=$('#collection-template').content.firstElementChild.cloneNode(true);
  const form=row.querySelector('form');
  const recipe=item.type==='recipe';
  row.querySelector('strong').textContent=item.name;
  row.querySelector('.collection-description').textContent=(recipe?'Tarif · '+item.servings+' porsiyon':'Kayıtlı öğün')+' · '+item.entries.map(entry=>entry.name).join(', ');
  form.elements.servings.disabled=!recipe;
  form.elements.servings.closest('label').hidden=!recipe;
  chooseMeal(form.elements.meal,item.entries[0].meal);
  if(!recipe){
   form.elements.meal.prepend(new Option('Kayıtlı öğünleri koru',''));
   form.elements.meal.value='';
  }
  const portion=()=>recipe?+form.elements.servings.value:1;
  const updatePreview=()=>{
   try{row.querySelector('output').textContent=num(total(scaleEntries(item,portion())))+' kcal';}
   catch{row.querySelector('output').textContent='— kcal';}
  };
  updatePreview();
  form.elements.servings.oninput=updatePreview;
  form.onsubmit=event=>{
   event.preventDefault();
   try{
    const record=day();
    const entries=scaleEntries(item,portion());
    if(record.entries.length+entries.length>10000)throw Error('Bu gün için kayıt sınırına ulaştın.');
    record.entries.push(...entries.map(entry=>({...entry,id:crypto.randomUUID(),meal:form.elements.meal.value||entry.meal})));
    state.days[$('#day').value]=record;
    const ok=save();
    render();
    if(ok)toast(item.name+' günlüğe eklendi.');
   }catch(error){toast(error.message);}
  };
  row.querySelector('.remove-collection').onclick=()=>{
   if(!confirm(item.name+' kayıtlı listeden silinsin mi?'))return;
   state.collections=state.collections.filter(saved=>saved.id!==item.id);
   save();
   renderCollections();
  };
  list.append(row);
 }
}
function renderEntries(record){
 const list=$('#entries');
 $('#entry-count').textContent=record.entries.length+' kayıt';
 list.replaceChildren();
 if(!record.entries.length){
  const empty=document.createElement('p');
  empty.className='empty';
  empty.textContent='Günlüğün yeni bir başlangıca hazır. İlk besinini ekle.';
  list.append(empty);
 }
 for(const entry of record.entries){
  const row=$('#entry-template').content.firstElementChild.cloneNode(true);
  const checkbox=row.querySelector('input');
  checkbox.checked=checkedEntries.has(entry.id);
  checkbox.setAttribute('aria-label',entry.name+' kaydını seç');
  checkbox.onchange=()=>{
   if(checkbox.checked)checkedEntries.add(entry.id);
   else checkedEntries.delete(entry.id);
   updateCollectionForm();
  };
  row.querySelector('.entry-name').textContent=entry.name;
  row.querySelector('small').textContent=entry.meal+' · '+num(entry.grams)+' '+(entry.unit||'g / ml')+(entry.brand?' · '+entry.brand:'');
  row.querySelector('.entry-kcal').textContent=num(entry.kcal)+' kcal';
  const edit=row.querySelector('.edit-entry');
  edit.setAttribute('aria-label',entry.name+' kaydını düzenle');
  edit.onclick=()=>startEdit(entry);
  const remove=row.querySelector('.delete');
  remove.setAttribute('aria-label',entry.name+' kaydını sil');
  remove.onclick=()=>{
   record.entries=record.entries.filter(item=>item.id!==entry.id);
   checkedEntries.delete(entry.id);
   state.days[$('#day').value]=record;
   save();
   render();
  };
  list.append(row);
 }
 updateCollectionForm();
}
function renderMacros(entries){
 const list=$('#macro-totals');
 list.replaceChildren();
 const totals=macroTotals(entries);
 for(const [key,label] of Object.entries(nutrients)){
  const cell=document.createElement('div');
  const title=document.createElement('dt');
  title.textContent=label;
  const value=document.createElement('dd');
  const {grams,known}=totals[key];
  value.textContent=known?num(grams)+' g':'—';
  if(known<entries.length){
   const coverage=document.createElement('small');
   coverage.textContent=known+'/'+entries.length+' kayıtta bilgi var';
   cell.append(title,value,coverage);
  }else cell.append(title,value);
  list.append(cell);
 }
}
const range=$('#history-range');
range.onchange=renderHistory;
function renderHistory(){
 const count=+range.value;
 const history=historyDays($('#day').value,state.days,count);
 const chart=$('#history-chart');
 chart.classList.toggle('month',count===30);
 chart.replaceChildren();
 for(const [index,item] of history.entries()){
  const cell=$('#history-template').content.firstElementChild.cloneNode(true);
  cell.classList.toggle('active',index===count-1);
  cell.querySelector('b').textContent=item.date.toLocaleDateString('tr-TR',{day:'numeric',month:'short'});
  cell.querySelector('.bar').style.height=Math.min((item.calories??0)/(item.target??2500)*90,90)+'px';
  cell.querySelector('small').textContent=item.calories===null?'Kayıt yok':num(item.calories)+' kcal';
  cell.querySelector('em').textContent=item.target?'Hedef '+num(item.target):'Hedef yok';
  chart.append(cell);
 }
 const logged=history.filter(item=>item.calories!==null);
 $('#history-summary').textContent=logged.length
  ? logged.length+'/'+count+' gün kayıtlı · Günlük ortalama '+num(logged.reduce((sum,item)=>sum+item.calories,0)/logged.length)+' kcal'
  : 'Bu aralıkta günlük kaydı yok.';
}
function render(){
 const record=day(),sum=total(record.entries),target=record.target,diff=target===null?null:target-sum;
 $('#consumed').textContent=num(sum);$('#target').textContent=target===null?'—':num(target);$('#difference').textContent=diff===null?'—':num(Math.abs(diff));
 $('#difference-label').textContent=diff!==null&&diff<0?'Hedefin üzerinde':'Hedefe kalan';$('#difference-note').textContent=target===null?'Profilini tamamla':'kcal';
 $('#balance-title').textContent=diff===null?'Önce seni tanıyalım.':diff<0?`Hedefinin ${num(-diff)} kcal üzerindesin.`:diff===0?'Günlük hedefine ulaştın.':`Hedefine ${num(diff)} kcal kaldı.`;
 $('#balance-note').textContent=target===null?'Günlük ihtiyacını görmek için profilini doldur.':`${num(sum)} kcal alındı · ${num(target)} kcal günlük hedef`;
 $('#ring').style.background=`conic-gradient(#d8e98c ${target?Math.min(sum/target,1)*360:0}deg,#36574b 0)`;
 renderEntries(record);
 renderMacros(record.entries);
 renderCollections();
 $('#profile-result').textContent=state.profile?`Kilonu koruma tahmini: ${num(calculate(state.profile))} kcal/gün. ${state.profile.custom?'Özel hedefin: '+num(+state.profile.custom)+' kcal.':''}`:'';
 renderHistory();
}
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kalori-pusulasi-'+dateKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('Yedek 5 MB’dan küçük olmalı.');const next=validate(JSON.parse(await file.text()));if(!confirm('Bu yedek mevcut profil ve günlük kayıtlarının yerini alacak. Önce mevcut yedeğini indirdiğinden emin ol. Devam edilsin mi?'))return;state=next;checkedEntries.clear();recipeDraft.length=0;for(const el of pf.elements)if(el.name)el.value=state.profile?.[el.name]??(el.name==='sex'?'female':el.name==='activity'?'1.2':'');const ok=save();render();if(ok)toast('Yedek geri yüklendi.');}catch(err){toast('Yedek yüklenemedi: '+err.message);}finally{e.target.value='';}};
let installEvent;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#install').hidden=false;});$('#install').onclick=async()=>{await installEvent?.prompt();$('#install').hidden=true;};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){$('#day').max=dateKey();render();}});render();
