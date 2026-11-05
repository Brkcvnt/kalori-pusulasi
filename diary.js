import {calories,dateKey,total} from './core.js';

import {extraNutrients,nutrientAmount} from './insights.js?v=7';

export const meals=['Kahvaltı','Öğle yemeği','Akşam yemeği','Ara öğün'];
export const nutrients={protein:'Protein',carbs:'Karbonhidrat',fat:'Yağ'};
export const validMacro=value=>Number.isFinite(value)&&value>=0&&value<=100;

export function validateEntry(e){
 if(!e||typeof e.name!=='string'||e.name.length>80||!meals.includes(e.meal)||
    typeof e.id!=='string'||!Number.isFinite(e.kcal)||e.kcal!==calories(e.per100,e.grams))
  throw Error('Besin kaydı geçersiz.');
 if(e.macros!==undefined&&(!e.macros||typeof e.macros!=='object'||Array.isArray(e.macros)||
    Object.keys(e.macros).some(key=>!Object.hasOwn(nutrients,key)||!validMacro(e.macros[key]))))
  throw Error('Makro besin kaydı geçersiz.');
 if(e.extras!==undefined&&(!e.extras||typeof e.extras!=='object'||Array.isArray(e.extras)||
    Object.keys(e.extras).some(key=>!Object.hasOwn(extraNutrients,key)||!validMacro(e.extras[key]))))
  throw Error('Ek besin değeri geçersiz.');
 if(e.measures!==undefined&&(!e.measures||typeof e.measures!=='object'||Array.isArray(e.measures)||
    Object.entries(e.measures).some(([key,value])=>!['Adet','Dilim','Paket','Porsiyon'].includes(key)||
      !Number.isFinite(value)||value<=0||value>10000)))
  throw Error('Porsiyon ölçüsü geçersiz.');
}

export function validateCollection(items){
 if(!Array.isArray(items))throw Error('Kayıtlı öğün ve tarif listesi geçersiz.');
 const ids=new Set();
 for(const item of items){
  if(!item||typeof item.id!=='string'||ids.has(item.id)||typeof item.name!=='string'||
     !item.name.trim()||item.name.length>80||!['meal','recipe'].includes(item.type)||
     !Array.isArray(item.entries)||!item.entries.length||item.entries.length>10000||
     !Number.isInteger(item.servings)||item.servings<1||item.servings>100||
     (item.type==='meal'&&item.servings!==1))
   throw Error('Kayıtlı öğün veya tarif geçersiz.');
  ids.add(item.id);
  item.entries.forEach(validateEntry);
 }
}

export function scaleEntries(item,servings){
 if(!Number.isFinite(servings)||servings<=0)throw Error('Geçerli bir porsiyon miktarı gir.');
 const ratio=servings/item.servings;
 return item.entries.map(entry=>{
  const grams=Math.round(entry.grams*ratio*1000)/1000;
  if(grams<=0||grams>10000)throw Error('Bu porsiyon miktarı kaydedilemiyor.');
  return {...entry,grams,kcal:calories(entry.per100,grams)};
 });
}

export function macroTotals(entries,labels=nutrients){
 return Object.fromEntries(Object.keys(labels).map(key=>{
  let grams=0,known=0;
  for(const entry of entries){
   const amount=nutrientAmount(entry,key);
   if(amount===null)continue;
   grams+=amount;
   known++;
  }
  return [key,{grams,known}];
 }));
}

export function historyDays(selected,days,count){
 const end=new Date(selected+'T12:00:00');
 return Array.from({length:count},(_,index)=>{
  const date=new Date(end);
  date.setDate(end.getDate()-count+index+1);
  const record=days[dateKey(date)];
  return {date,target:record?.target??null,calories:record?.entries.length?total(record.entries):null};
 });
}

