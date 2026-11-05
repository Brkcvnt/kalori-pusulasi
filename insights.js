import {calories,dateKey} from './core.js';

export const extraNutrients={fiber:'Lif',sugars:'Şeker',salt:'Tuz'};
const amountValid=value=>Number.isFinite(value)&&value>0&&value<=10000;
export function measuresFor(p,unit){
 if(!['g','ml'].includes(unit))return {};
 const measures={};
 const serving=Number(p.serving_quantity);
 if(p.serving_quantity_unit===unit&&amountValid(serving)){
  const text=String(p.serving_size??'').trim();
  const name=/^1\s+(dilim|slice)\b/i.test(text)?'Dilim':/^1\s+(adet|piece)\b/i.test(text)?'Adet':'Porsiyon';
  measures[name]=serving;
 }
 const pack=Number(p.product_quantity);
 if(p.product_quantity_unit===unit&&amountValid(pack))measures.Paket=pack;
 return measures;
}
export function toBaseAmount(count,factor=1){
 if(!Number.isFinite(count)||count<=0||!amountValid(factor))throw Error('Geçerli bir miktar gir.');
 const amount=Math.round(count*factor*1000)/1000;
 if(!amountValid(amount))throw Error('Toplam miktar 0,001–10.000 aralığında olmalı.');
 return amount;
}
export function dateOffset(day,offset){
 const date=new Date(day+'T12:00:00');
 date.setDate(date.getDate()+offset);
 return dateKey(date);
}
export function periodSummary(history){
 const logged=history.filter(item=>item.calories!==null);
 const targets=logged.filter(item=>item.target!==null);
 return {logged:logged.length,average:logged.length?logged.reduce((sum,item)=>sum+item.calories,0)/logged.length:null,
  targets:targets.length,within:targets.filter(item=>item.calories<=item.target).length};
}
export function nutrientAmount(entry,key){
 const value=entry.macros?.[key]??entry.extras?.[key];
 return Number.isFinite(value)&&value>=0&&value<=100?value*entry.grams/100:null;
}
function csvCell(value){
 if(value===null||value===undefined)return '';
 if(typeof value==='number')return String(Math.round(value*1000)/1000).replace('.',',');
 let text=String(value);
 if(/^\s*[=+@-]|^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function diaryCsv(days,start,end){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)
  throw Error('Geçerli bir başlangıç ve bitiş tarihi seç.');
 const columns=['Tarih','Öğün','Besin','Marka','Miktar','Birim','Kalori (kcal)','Protein (g)','Karbonhidrat (g)','Yağ (g)','Lif (g)','Şeker (g)','Tuz (g)'];
 const rows=[columns.map(csvCell).join(';')];
 for(const date of Object.keys(days).sort()){
  if(date<start||date>end)continue;
  for(const entry of days[date].entries){
   rows.push([date,entry.meal,entry.name,entry.brand,entry.grams,entry.unit,entry.kcal,
    ...['protein','carbs','fat','fiber','sugars','salt'].map(key=>nutrientAmount(entry,key))].map(csvCell).join(';'));
  }
 }
 return rows.length===1?null:'\uFEFF'+rows.join('\r\n')+'\r\n';
}
export function datedMeal(days,date,meal){
 return days[dateOffset(date,-1)]?.entries.filter(entry=>entry.meal===meal)??[];
}
export function withAmount(entry,grams){
 return {...entry,grams,kcal:calories(entry.per100,grams)};
}

