import {validMacro} from './diary.js?v=7';

import {measuresFor} from './insights.js?v=7';

// Nutrition parsing is independent of the UI so missing and serving-only values cannot become zero kcal.
export const normalize=s=>String(s??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim();
const numeric=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))?Number(v):null;
const macrosOf=values=>Object.fromEntries(Object.entries(values)
 .map(([name,value])=>[name,numeric(value)])
 .filter(([,value])=>validMacro(value)));
export function productFood(p){
 if(!p||typeof p!=='object')return null;
 const n=p.nutriments||{};
 let kcal=numeric(n['energy-kcal_100g']);
 if(kcal===null){const kj=numeric(n['energy-kj_100g']??n.energy_100g);if(kj!==null)kcal=kj/4.184;}
 const name=String(p.product_name_tr||p.product_name||p.generic_name||'').trim();
 const code=String(p.code??'');
 if(!name||!/^\d{4,14}$/.test(code))return null;
 const macros=macrosOf({protein:n.proteins_100g,carbs:n.carbohydrates_100g,fat:n.fat_100g});
 const extras=macrosOf({fiber:n.fiber_100g,sugars:n.sugars_100g,salt:n.salt_100g});
 const unit=['g','ml'].includes(p.product_quantity_unit)?p.product_quantity_unit:
  ['g','ml'].includes(p.serving_quantity_unit)?p.serving_quantity_unit:'g / ml';
 const measures=measuresFor(p,unit);
 return {id:'off:'+code,code,name,macros,extras,measures,brand:Array.isArray(p.brands)?p.brands.join(', '):String(p.brands||''),per100:kcal!==null&&kcal>=0&&kcal<=1000?Math.round(kcal*10)/10:null,source:'Open Food Facts',url:'https://world.openfoodfacts.org/product/'+code,unit,original:''};
}
export function localFoods(rows){return rows.map(([id,name,per100,original,macros,extras,measures])=>({id:'usda:'+id,name,per100,original,macros,extras:extras??undefined,measures,brand:'',unit:'g',source:'USDA',url:'https://fdc.nal.usda.gov/food-details/'+id+'/nutrients'}));}
// Catalog arrays are replaced after loading; normalized fields are reused while typing.
const indexes=new WeakMap();
export function searchFoods(foods,query,limit=30){
 let index=indexes.get(foods);
 if(!index){
  index=foods.map((food,order)=>{const name=normalize(food.name);return {food,order,name,all:name+' '+normalize(food.brand)+' '+normalize(food.original)};});
  indexes.set(foods,index);
 }
 const q=normalize(query),tokens=q.split(' ').filter(Boolean),barcode=query.trim();
 if(q.length<2)return [];
 // Keep only the best matches, avoiding a full result sort on broad queries.
 const best=[];
 for(const row of index){
  const {food,name,all,order}=row;
  const exactCode=food.code===barcode;
  if(!exactCode&&!tokens.every(t=>all.includes(t)))continue;
  const score=exactCode?-100:(name===q?-50:name.startsWith(q+' ')?-30:name.startsWith(q)?-10:0)+name.length/1000;
  let at=best.findIndex(r=>score<r.score||(score===r.score&&order<r.order));
  if(at<0)at=best.length;
  if(at<limit){best.splice(at,0,{food,score,order});if(best.length>limit)best.pop();}
 }
 return best.map(row=>row.food);
}
const fields='code,product_name,product_name_tr,brands,nutriments,product_quantity,product_quantity_unit,serving_quantity,serving_quantity_unit,serving_size';
export function searchUrl(query){
 if(/^\d{8,14}$/.test(query.trim()))return 'https://world.openfoodfacts.org/api/v2/product/'+query.trim()+'?fields='+fields;
 // Quote every word: do not interpret user input as a Lucene field or wildcard query.
 const q=query.trim().split(/\s+/).map(s=>'"'+s.replace(/[\\"]/g,'')+'"').join(' ');
 return 'https://search.openfoodfacts.org/search?'+new URLSearchParams({q,langs:'tr,en',page_size:'24',fields,app_name:'KaloriPusulasi'});
}
export function responseFoods(data){
 const rows=data.hits??data.products??(data.product?[data.product]:[]);
 if(!Array.isArray(rows))throw Error('Ürün servisi geçersiz yanıt verdi.');
 return rows.map(productFood).filter(Boolean);
}
export function fallbackSearchUrl(query){return 'https://world.openfoodfacts.org/cgi/search.pl?'+new URLSearchParams({search_terms:query,search_simple:'1',action:'process',json:'1',page_size:'24',fields,lc:'tr'});}
