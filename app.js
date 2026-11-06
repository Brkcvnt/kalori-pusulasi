import {calculate,total,calories,dateKey} from './core.js';
import {setupFoodPicker} from './food-picker.js?v=7';
import {meals,nutrients,validateEntry,validateCollection,scaleEntries,macroTotals,historyDays} from './diary.js?v=7';
import {setupBarcodeScanner} from './barcode.js?v=7';
import {extraNutrients,toBaseAmount,periodSummary,dateOffset,diaryCsv,datedMeal,withAmount} from './insights.js?v=7';
import {setupSync} from './sync.js?v=9';
import {setupReminder} from './reminder.js?v=7';
import {setupNavigation} from './navigation.js?v=9';
import {setupPlanner,validatePlans} from './planner.js?v=9';
const $=s=>document.querySelector(s), key='kalori-pusulasi-v1';
let state={version:1,profile:null,days:{}}, timer, storageOK=true;
let reminderUpdate=()=>{},syncSchedule=()=>{};
function toast(text,undo){
 $('#toast-text').textContent=text;
 $('#toast').hidden=false;
 const button=$('#undo-delete');
 button.hidden=!undo;
 button.onclick=undo?()=>{button.onclick=null;undo();}:null;
 clearTimeout(timer);
 timer=setTimeout(()=>{$('#toast').hidden=true;button.onclick=null;},undo?8000:4500);
}
try{const saved=localStorage.getItem(key);if(saved)state=validate(JSON.parse(saved));}catch{storageOK=false;setTimeout(()=>toast('Kayıtlar okunamadı. Yedek al; tarayıcı depolamasını kontrol et.'),100);}
function validate(s){
 if(s.version!==1||!s.days||typeof s.days!=='object'||Array.isArray(s.days))throw Error('Yedek biçimi geçersiz.');
 if(s.profile){calculate(s.profile);if(s.profile.custom && (!Number.isFinite(+s.profile.custom)||+s.profile.custom<1000||+s.profile.custom>6000))throw Error('Hedef geçersiz.');}
 for(const [d,v] of Object.entries(s.days)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Array.isArray(v.entries)||v.entries.length>10000||!(v.target===null||(Number.isFinite(v.target)&&v.target>0)))throw Error('Gün kaydı geçersiz.');
  v.entries.forEach(validateEntry);
 }
 if(s.collections!==undefined)validateCollection(s.collections);
 if(s.plans!==undefined)validatePlans(s.plans);
 for(const field of ['proteinGoal','carbsGoal','fatGoal']){
  const value=s.profile?.[field];
  if(value!==undefined&&value!==''&&(!Number.isFinite(+value)||+value<1||+value>1000))throw Error('Makro hedefi geçersiz.');
 }
 if(s.favorites!==undefined){
  if(!Array.isArray(s.favorites)||s.favorites.length>100)throw Error('Favori listesi geçersiz.');
  s.favorites.forEach(validateEntry);
 }
 return s;
}
function save(){try{localStorage.setItem(key,JSON.stringify(state));storageOK=true;$('#save-status').textContent='✓ Bu tarayıcıya kaydedildi';reminderUpdate();syncSchedule();return true;}catch{storageOK=false;$('#save-status').textContent='Kaydedilemedi · Yedek indir';toast('Cihaza kaydedilemedi. Kaybetmemek için yedeğini indir.');return false;}}
function goal(){return state.profile ? (+state.profile.custom||calculate(state.profile)):null;}
$('#day').value=dateKey();$('#day').max=dateKey();
function day(){return state.days[$('#day').value]||{target:goal(),entries:[]};}
function num(n){return n.toLocaleString('tr-TR',{maximumFractionDigits:1});}
const ff=$('#food-form'),pf=$('#profile-form');

const favorite=$('#favorite-food'),measure=ff.elements.measure,quantity=ff.elements.grams;
const measures=new Map();
let pickedId;
function sourceFood(entry,quickLabel){
 const id=entry.sourceId;
 if(typeof id!=='string'||!/^(usda:\d+|off:\d{4,14})$/.test(id))return null;
 const [prefix,code]=id.split(':');
 return {id,code:prefix==='off'?code:undefined,name:entry.name,brand:entry.brand,
  per100:entry.per100,unit:entry.unit||'g / ml',macros:entry.macros,extras:entry.extras,measures:entry.measures,
  source:prefix==='off'?'Open Food Facts':'USDA',
  url:prefix==='off'?'https://world.openfoodfacts.org/product/'+code:'https://fdc.nal.usda.gov/food-details/'+code+'/nutrients',
  quickLabel};
}
function quickFoods(){
 const items=new Map();
 function add(entry,label){
  const food=sourceFood(entry,label);
  if(food&&!items.has(food.id))items.set(food.id,food);
 }
 for(const entry of state.favorites??[])add(entry,'★ Favori');
 for(const date of Object.keys(state.days).sort().reverse()){
  const entries=state.days[date].entries;
  for(let i=entries.length-1;i>=0&&items.size<Math.max(12,(state.favorites?.length??0)+6);i--)add(entries[i],'Son kullanılan');
  if(items.size>=Math.max(12,(state.favorites?.length??0)+6))break;
 }
 return [...items.values()];
}
function preview(){
 try{
  if(ff.elements.per100.value==='')throw Error();
  $('#food-preview').textContent=num(calories(+ff.elements.per100.value,toBaseAmount(+quantity.value,measures.get(measure.value))))+' kcal';
 }catch{$('#food-preview').textContent='— kcal';}
}
function updatePickedFood(food){
 const active=food?.id===pickedId?measure.value:'';
 pickedId=food?.id;
 const unit=food?.unit??'g / ml';
 measures.clear();
 measures.set('',1);
 for(const [name,amount] of Object.entries(food?.measures??{}))measures.set(name,amount);
 measure.replaceChildren(...[...measures].map(([name,amount])=>new Option(name?name+' ('+num(amount)+' '+unit+')':unit,name)));
 measure.value=measures.has(active)?active:'';
 $('#measure-field').hidden=measures.size===1;
 $('#amount-label').textContent=measure.value?'Miktar ('+measure.value.toLocaleLowerCase('tr-TR')+')':'Miktar ('+unit+')';
 const starred=(state.favorites??[]).some(entry=>entry.sourceId===pickedId);
 favorite.hidden=!food;
 favorite.setAttribute('aria-pressed',String(starred));
 favorite.textContent=starred?'★ Favorilerden çıkar':'☆ Favorilere ekle';
 preview();
}
const picker=setupFoodPicker({form:ff,onChange:updatePickedFood,onError:toast,getQuickFoods:quickFoods});
ff.addEventListener('input',preview);
measure.onchange=()=>{
 quantity.value=measure.value?'1':'100';
 updatePickedFood(picker.getSelected());
};
favorite.onclick=()=>{
 const food=picker.getSelected();
 if(!food)return;
 const index=(state.favorites??[]).findIndex(entry=>entry.sourceId===food.id);
 if(index>=0)state.favorites.splice(index,1);
 else{
  if((state.favorites?.length??0)>=100){toast('En fazla 100 besin favorilere eklenebilir.');return;}
  (state.favorites??=[]).push({id:crypto.randomUUID(),name:food.name.slice(0,80),meal:meals[0],grams:100,
   per100:food.per100,kcal:calories(food.per100,100),sourceId:food.id,brand:food.brand,unit:food.unit,
   macros:food.macros,extras:food.extras,measures:food.measures});
 }
 save();
 updatePickedFood(food);
};
function selectedEntry(){
 const food=picker.getSelected();
 if(!food||food.per100===null)throw Error('Önce sonuçlardan bir besin seç.');
 const name=ff.elements.name.value.trim();
 if(!name||name!==food.name.slice(0,80))throw Error('Besini sonuçlardan yeniden seç.');
 if(!ff.elements.grams.reportValidity())return null;
 const grams=toBaseAmount(+quantity.value,measures.get(measure.value)),per100=food.per100;
 return {id:crypto.randomUUID(),name,meal:ff.elements.meal.value,grams,per100,kcal:calories(per100,grams),
  source:food.source,sourceId:food.id,unit:food.unit,brand:food.brand,macros:food.macros,extras:food.extras,measures:food.measures};
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

const copyMeal=$('#copy-meal');
function updateCopyMeal(){
 const meal=ff.elements.meal.value;
 const entries=datedMeal(state.days,$('#day').value,meal);
 copyMeal.disabled=!entries.length;
 $('#copy-meal-note').textContent=entries.length?meal+' · '+entries.length+' besin kopyalanabilir.':'Önceki gün '+meal.toLocaleLowerCase('tr-TR')+' kaydı yok.';
}
ff.elements.meal.addEventListener('change',updateCopyMeal);
copyMeal.onclick=()=>{
 const entries=datedMeal(state.days,$('#day').value,ff.elements.meal.value);
 const record=day();
 if(!entries.length)return;
 if(record.entries.length+entries.length>10000){toast('Bu gün için kayıt sınırına ulaştın.');return;}
 record.entries.push(...entries.map(entry=>({...entry,id:crypto.randomUUID()})));
 state.days[$('#day').value]=record;
 const ok=save();
 render();
 if(ok)toast('Önceki günün öğünü kopyalandı.');
};

let editingRecipe;
function endRecipeEdit(){
 editingRecipe=undefined;
 recipeDraft.length=0;
 checkedEntries.clear();
 collectionForm.elements.type.disabled=false;
 collectionForm.reset();
}
function startRecipeEdit(item){
 if(recipeDraft.length&&!confirm('Açık tarif taslağı bu tarifle değiştirilsin mi?'))return;
 editingRecipe=item.id;
 checkedEntries.clear();
 recipeDraft.splice(0,recipeDraft.length,...item.entries.map(entry=>({...entry})));
 collectionForm.elements.type.value='recipe';
 collectionForm.elements.type.disabled=true;
 collectionForm.elements.name.value=item.name;
 collectionForm.elements.servings.value=item.servings;
 renderEntries(day());
 collectionForm.elements.name.focus();
}
$('#cancel-recipe-edit').onclick=()=>{endRecipeEdit();renderEntries(day());};

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
 $('#save-collection').textContent=editingRecipe?'Tarif değişikliklerini kaydet':'Seçimi kaydet';
 $('#cancel-recipe-edit').hidden=!editingRecipe;
 $('#collection-count').textContent=count+' besin seçildi';
 $('#recipe-draft').hidden=!recipe||!recipeDraft.length;
 const list=$('#recipe-ingredients');
 list.replaceChildren();
 for(const [index,entry] of recipeDraft.entries()){
  const row=document.createElement('li');

  row.className='recipe-ingredient';
  const name=document.createElement('span');
  name.textContent=entry.name;
  const label=document.createElement('label');
  label.textContent=entry.unit||'g / ml';
  const amount=document.createElement('input');
  amount.type='number';amount.min='0.001';amount.max='10000';amount.step='any';amount.required=true;
  amount.setAttribute('form','collection-form');
  amount.disabled=!recipe;
  amount.setAttribute('aria-label',entry.name+' miktarı');
  amount.value=entry.grams;
  const energy=document.createElement('small');
  energy.textContent=num(entry.kcal)+' kcal';
  amount.oninput=()=>{
   if(!amount.validity.valid){energy.textContent='— kcal';return;}
   recipeDraft[index]=withAmount(entry,+amount.value);
   energy.textContent=num(recipeDraft[index].kcal)+' kcal';
  };
  label.append(amount);
  row.append(name,label,energy);
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
 const item={id:editingRecipe??crypto.randomUUID(),type,name,servings,entries:entries.map(entry=>({...entry}))};
 try{
  validateCollection([item]);
  scaleEntries(item,1);
  const index=(state.collections??=[]).findIndex(saved=>saved.id===item.id);
  if(index<0)state.collections.push(item);
  else state.collections[index]=item;
  const ok=save();
  if(type==='recipe')endRecipeEdit();
  else{checkedEntries.clear();collectionForm.reset();}
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
  const edit=row.querySelector('.edit-recipe');
  edit.hidden=!recipe;
  edit.onclick=()=>startRecipeEdit(item);
  row.querySelector('.remove-collection').onclick=()=>{
   if(!confirm(item.name+' kayıtlı listeden silinsin mi?'))return;
   state.collections=state.collections.filter(saved=>saved.id!==item.id);
   if(editingRecipe===item.id)endRecipeEdit();
   save();
   render();
  };
  list.append(row);
 }
}
function renderEntries(record){
 const list=$('#entries');
 $('#entry-count').textContent=record.entries.length+' kayıt';
 $('#diary-records h2').textContent=$('#day').value===dateKey()?'Bugünkü kayıtlar':'Seçili günün kayıtları';
 list.replaceChildren();
 if(!record.entries.length){
  const empty=document.createElement('p');
  empty.className='empty';
  empty.textContent='Günlüğün yeni bir başlangıca hazır. İlk besinini ekle.';
  list.append(empty);
 }
 for(const meal of meals){
  const entries=record.entries.filter(entry=>entry.meal===meal);
  if(!entries.length)continue;
  const group=document.createElement('section');
  group.className='meal-group';
  const title=document.createElement('h3');
  title.textContent=meal+' · '+num(total(entries))+' kcal';
  const summary=document.createElement('p');
  summary.className='hint';
  const totals=macroTotals(entries);
  summary.textContent=Object.entries(nutrients).map(([key,label])=>{
   const {grams,known}=totals[key];
   return label+' '+(known?num(grams)+' g':'—')+(known<entries.length?' ('+known+'/'+entries.length+')':'');
  }).join(' · ');
  group.append(title,summary);
  list.append(group);
  for(const entry of entries){
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
   const date=$('#day').value;
   const position=record.entries.indexOf(entry);
   record.entries=record.entries.filter(item=>item.id!==entry.id);
   checkedEntries.delete(entry.id);
   state.days[date]=record;
   const ok=save();
   render();
   if(ok)toast('Besin kaydı silindi.',()=>{
    const current=state.days[date];
    if(!current||current.entries.some(item=>item.id===entry.id)||current.entries.length>=10000){
     toast('Kayıt geri alınamadı.');return;
    }
    current.entries.splice(position,0,entry);
    const restored=save();
    render();
    if(restored)toast('Besin kaydı geri alındı.');
   });
  };
   group.append(row);
  }
 }
 updateCollectionForm();
}
function renderMacros(list,entries,labels){
 list.replaceChildren();
 const totals=macroTotals(entries,labels);
 for(const [key,label] of Object.entries(labels)){
  const cell=document.createElement('div');
  const title=document.createElement('dt');
  title.textContent=label;
  const value=document.createElement('dd');
  const {grams,known}=totals[key];
  value.textContent=known?num(grams)+' g':'—';
  const goal=labels===nutrients?+state.profile?.[key+'Goal']:0;
  if(goal>0)value.textContent+=' / '+num(goal)+' g';
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
  if(index===count-1)cell.setAttribute('aria-current','date');
  cell.onclick=()=>{
   $('#day').value=dateKey(item.date);
   $('#day').dispatchEvent(new Event('change'));
   goTo('diary',true,'records');
  };
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

 const week=$('#week-comparison');
 week.replaceChildren();
 const fortnight=historyDays($('#day').value,state.days,14);
 for(const [label,period] of [['Son 7 gün',fortnight.slice(7)],['Önceki 7 gün',fortnight.slice(0,7)]]){
  const summary=periodSummary(period);
  const card=document.createElement('article');
  const title=document.createElement('strong');
  title.textContent=label;
  const info=document.createElement('p');
  info.className='hint';
  info.textContent=summary.logged?summary.logged+'/7 gün kayıtlı · '+num(summary.average)+' kcal/gün':'Kayıt yok';
  const goalInfo=document.createElement('p');
  goalInfo.className='hint';
  goalInfo.textContent=summary.targets?'Hedef aşılmadı · '+summary.within+'/'+summary.targets+' gün':'Hedef karşılaştırması yok';
  card.append(title,info,goalInfo);
  week.append(card);
 }
}
function render(){
 const record=day(),sum=total(record.entries),target=record.target,diff=target===null?null:target-sum;
 $('#consumed').textContent=num(sum);$('#target').textContent=target===null?'—':num(target);$('#difference').textContent=diff===null?'—':num(Math.abs(diff));
 $('#difference-label').textContent=diff!==null&&diff<0?'Hedefin üzerinde':'Hedefe kalan';$('#difference-note').textContent=target===null?'Profilini tamamla':'kcal';
 $('#balance-title').textContent=diff===null?'Önce seni tanıyalım.':diff<0?`Hedefinin ${num(-diff)} kcal üzerindesin.`:diff===0?'Günlük hedefine ulaştın.':`Hedefine ${num(diff)} kcal kaldı.`;
 $('#balance-note').textContent=target===null?'Günlük ihtiyacını görmek için profilini doldur.':`${num(sum)} kcal alındı · ${num(target)} kcal günlük hedef`;
 $('#ring').style.background=`conic-gradient(#d8e98c ${target?Math.min(sum/target,1)*360:0}deg,#36574b 0)`;
 renderEntries(record);
 renderMacros($('#macro-totals'),record.entries,nutrients);
 renderMacros($('#extra-totals'),record.entries,extraNutrients);
 updateCopyMeal();
 renderCollections();
 renderPlans();
 $('#profile-result').textContent=state.profile?`Kilonu koruma tahmini: ${num(calculate(state.profile))} kcal/gün. ${state.profile.custom?'Özel hedefin: '+num(+state.profile.custom)+' kcal.':''}`:'';
 renderHistory();
}

const csvForm=$('#csv-form');
csvForm.elements.start.value=dateOffset(dateKey(),-29);
csvForm.elements.end.value=dateKey();
csvForm.onsubmit=event=>{
 event.preventDefault();
 try{
  const start=csvForm.elements.start.value,end=csvForm.elements.end.value;
  const data=diaryCsv(state.days,start,end);
  if(!data){toast('Bu tarihlerde dışa aktarılacak besin kaydı yok.');return;}
  const filename='kalori-pusulasi-'+start+'-'+end+'.csv';
  if(window.AndroidBackup?.exportCsv){window.AndroidBackup.exportCsv(data,filename);return;}
  const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){toast(error.message);}
};
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kalori-pusulasi-'+dateKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('Yedek 5 MB’dan küçük olmalı.');const next=validate(JSON.parse(await file.text()));if(!confirm('Bu yedek mevcut profil ve günlük kayıtlarının yerini alacak. Önce mevcut yedeğini indirdiğinden emin ol. Devam edilsin mi?'))return;state=next;endRecipeEdit();fillProfile();updatePickedFood(picker.getSelected());const ok=save();render();if(ok)toast('Yedek geri yüklendi.');}catch(err){toast('Yedek yüklenemedi: '+err.message);}finally{e.target.value='';}};
let installEvent;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#install').hidden=false;});$('#install').onclick=async()=>{await installEvent?.prompt();$('#install').hidden=true;};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

function fillProfile(){
 for(const input of pf.elements)if(input.name){
  input.value=state.profile?.[input.name]??(input.name==='sex'?'female':input.name==='activity'?'1.2':'');
 }
}
function applySyncedState(payload){
 if(recipeDraft.length||editDialog.open)throw Error('Eşitlemeden önce açık düzenlemeyi kaydet veya kapat.');
 const next=validate(payload);
 localStorage.setItem(key,JSON.stringify(next));
 state=next;
 endRecipeEdit();
 fillProfile();
 updatePickedFood(picker.getSelected());
 reminderUpdate();
 render();
}
reminderUpdate=setupReminder(()=>Boolean(state.days[dateKey()]?.entries.length),toast);
const goTo=setupNavigation();

function recordPlannedEntries(date,entries){
 const record=state.days[date]??{target:goal(),entries:[]};
 if(record.entries.length+entries.length>10000)throw Error('Bu gün için kayıt sınırına ulaştın.');
 record.entries.push(...entries.map(entry=>({...entry,id:crypto.randomUUID()})));
 state.days[date]=record;
 $('#day').value=date;
 checkedEntries.clear();
}
function startTemplate(item){
 if((recipeDraft.length||checkedEntries.size)&&!confirm('Mevcut tarif taslağı bu şablonla değiştirilsin mi?'))return;
 endRecipeEdit();
 recipeDraft.push(...item.entries);
 collectionForm.elements.type.value='recipe';
 collectionForm.elements.name.value=item.name;
 collectionForm.elements.servings.value=item.servings;
 renderEntries(day());
 collectionForm.elements.name.focus();
}
const renderPlans=setupPlanner({
 getState:()=>state,save,update:()=>{render();goTo('diary',true,'records');},
 recordEntries:recordPlannedEntries,startTemplate,num,toast
});

syncSchedule=setupSync({getState:()=>JSON.stringify(state),applyState:applySyncedState});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){$('#day').max=dateKey();render();}});render();

const nativeUpdates=window.AndroidBackup;
if(nativeUpdates?.updateNotificationStatus){
 const section=$('#update-notifications'),toggle=$('#toggle-update-notifications');
 function updateNotificationSettings(){
  const status=nativeUpdates.updateNotificationStatus();
  toggle.textContent=status==='off'?'Güncelleme bildirimlerini aç':'Güncelleme bildirimlerini kapat';
  $('#update-notification-status').textContent={
   off:'Bildirimler kapalı.',
   on:'Bildirimler açık.',
   blocked:'Bildirimler Android ayarlarında engellenmiş.'
  }[status];
 }
 toggle.onclick=()=>nativeUpdates.setUpdateNotifications(nativeUpdates.updateNotificationStatus()==='off');
 window.addEventListener('kalori-update-notification-change',updateNotificationSettings);
 section.hidden=false;
 updateNotificationSettings();
}
