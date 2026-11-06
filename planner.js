import {calories,dateKey,total} from './core.js';
import {meals,scaleEntries,validateCollection} from './diary.js?v=7';
import {localFoods} from './food-search.js?v=7';

const templates=[
 {name:'Menemen',servings:2,meal:'Kahvaltı',foods:[['171287','Yumurta',100],['170457','Domates',240],['170427','Yeşil biber',60],['171413','Zeytinyağı',12]]},
 {name:'Mercimek çorbası',servings:3,meal:'Öğle yemeği',foods:[['172421','Haşlanmış mercimek',300],['170000','Soğan',80],['170393','Havuç',80],['171413','Zeytinyağı',15]]},
 {name:'Kuru fasulye',servings:3,meal:'Akşam yemeği',foods:[['175203','Haşlanmış kuru fasulye',450],['170000','Soğan',100],['170459','Domates salçası',35],['171413','Zeytinyağı',18]]},
 {name:'Bulgur pilavı',servings:3,meal:'Akşam yemeği',foods:[['170287','Pişmiş bulgur',450],['170457','Domates',140],['170000','Soğan',75],['171413','Zeytinyağı',15]]},
];
export function recipeTemplateRows(){return templates;}
export function makeTemplate(template,catalog){
 return {id:crypto.randomUUID(),type:'recipe',name:template.name,servings:template.servings,entries:template.foods.map(([id,name,grams])=>{
  const food=catalog.get(id);
  if(!food)throw Error('Şablon malzemesi cihaz kataloğunda bulunamadı.');
  return {id:crypto.randomUUID(),name,grams,meal:template.meal,per100:food.per100,kcal:calories(food.per100,grams),
   source:food.source,sourceId:food.id,unit:food.unit,macros:food.macros,extras:food.extras,measures:food.measures};
 })};
}
export function validDate(value){
 const parsed=new Date(value+'T12:00:00');
 return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(+parsed)&&dateKey(parsed)===value;
}
export function validatePlans(plans){
 if(!Array.isArray(plans)||plans.length>3000)throw Error('Öğün planı geçersiz.');
 const ids=new Set();
 for(const item of plans){
  if(!item||typeof item.id!=='string'||ids.has(item.id)||!validDate(item.date)||!meals.includes(item.meal)||
     !Number.isFinite(item.servings)||item.servings<0.1||item.servings>100)throw Error('Planlı öğün geçersiz.');
  validateCollection([item.collection]);
  scaleEntries(item.collection,item.servings);
  ids.add(item.id);
 }
}
export function planEntries(item){
 return scaleEntries(item.collection,item.servings).map(entry=>({...entry,meal:item.meal}));
}
export function shoppingItems(plans){
 const amounts=new Map();
 for(const item of plans)for(const entry of planEntries(item)){
  const unit=entry.unit||'g / ml';
  const id=JSON.stringify([entry.sourceId||entry.name,unit]);
  const previous=amounts.get(id);
  if(previous)previous.grams+=entry.grams;
  else amounts.set(id,{name:entry.name,unit,grams:entry.grams});
 }
 return [...amounts.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
}
export function setupPlanner({getState,save,update,recordEntries,startTemplate,num,toast}){
 const $=s=>document.querySelector(s);
 const form=$('#plan-form'),date=form.elements.date,collection=form.elements.collection,servings=form.elements.servings;
 const tomorrow=new Date();
 tomorrow.setDate(tomorrow.getDate()+1);
 date.value=dateKey(tomorrow);
 for(const meal of meals)form.elements.meal.add(new Option(meal,meal));
 let source;
 const catalog=()=>source??=fetch('./usda-foods.json').then(response=>{
  if(!response.ok)throw Error('Besin kataloğu açılamadı.');
  return response.json();
 }).then(data=>new Map(localFoods(data.foods).map(food=>[food.id.slice(5),food]))).catch(error=>{source=undefined;throw error;});
 for(const template of templates){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=template.name+' · '+template.servings+' porsiyon';
  button.onclick=async()=>{
   button.disabled=true;
   try{startTemplate(makeTemplate(template,await catalog()));}
   catch(error){toast(error.message);}
   finally{button.disabled=false;}
  };
  $('#template-list').append(button);
 }
 function renderPlans(){
  const current=getState();
  const old=collection.value;
  collection.replaceChildren(...(current.collections??[]).map(item=>new Option(item.name,item.id)));
  if([...collection.options].some(option=>option.value===old))collection.value=old;
  $('#plan-add').disabled=!collection.options.length;
  $('#plan-source-note').textContent=collection.options.length?'Porsiyonu ve öğünü seçerek planına ekle.':'Planlamak için önce bir tarif veya öğün kaydet.';
  const selected=(current.plans??[]).filter(item=>item.date===date.value);

  $('#plan-list').replaceChildren(...selected.map(item=>{
   const card=$('#plan-item').content.firstElementChild.cloneNode(true);
   const amount=card.querySelector('input');
   card.querySelector('strong').textContent=item.collection.name;
   amount.value=item.servings;
   amount.setAttribute('aria-label',item.collection.name+' porsiyonu');
   const preview=()=>{card.querySelector('p').textContent=item.meal+' · '+num(total(planEntries(item)))+' kcal';};
   preview();
   amount.onchange=()=>{
    try{
     if(!amount.reportValidity())return;
     const revised={...item,servings:+amount.value};
     validatePlans([revised]);
     item.servings=revised.servings;
     save();
     preview();
     refreshSummary(selected);
    }catch(error){amount.value=item.servings;toast(error.message);}
   };
   const add=card.querySelector('.plan-log');
   add.disabled=item.date>dateKey();
   if(add.disabled)add.title='Planlanan gün geldiğinde ekleyebilirsin.';
   add.onclick=()=>{
    if(item.date>dateKey()||!amount.reportValidity())return;
    try{
     recordEntries(item.date,planEntries({...item,servings:+amount.value}));
     current.plans=current.plans.filter(other=>other.id!==item.id);
     if(save())toast('Planlanan öğün günlüğe eklendi.');
     update();
    }catch(error){toast(error.message);}
   };
   card.querySelector('.plan-remove').onclick=()=>{
    current.plans=current.plans.filter(other=>other.id!==item.id);
    save();
    renderPlans();
   };
   return card;
  }));
  refreshSummary(selected);
 }
 function refreshSummary(selected){
  $('#plan-total').textContent=selected.length?'Planlanan toplam · '+num(selected.reduce((sum,item)=>sum+total(planEntries(item)),0))+' kcal':'Bu tarihte planlı öğün yok.';
  $('#shopping-list').replaceChildren(...shoppingItems(selected).map(item=>{
   const li=document.createElement('li');
   li.textContent=item.name+' · '+num(item.grams)+' '+item.unit;
   return li;
  }));
  $('#shopping').hidden=!selected.length;
 }
 form.onsubmit=event=>{
  event.preventDefault();
  const current=getState();
  try{
   const saved=current.collections?.find(item=>item.id===collection.value);
   if(!saved)throw Error('Önce bir öğün veya tarif seç.');
   const item={id:crypto.randomUUID(),date:date.value,meal:form.elements.meal.value,servings:+servings.value,
    collection:JSON.parse(JSON.stringify(saved))};
   const plans=[...current.plans??[],item];
   if(plans.length>3000)throw Error('Plan sınırına ulaştın.');
   validatePlans([item]);
   current.plans=plans;
   if(save())toast('Öğün plana eklendi.');
   renderPlans();
  }catch(error){toast(error.message);}
 };
 date.onchange=renderPlans;
 return renderPlans;
}

