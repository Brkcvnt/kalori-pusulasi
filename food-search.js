// Nutrition parsing is independent of the UI so missing and serving-only values cannot become zero kcal.
export const normalize=s=>String(s??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim();
const numeric=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))?Number(v):null;
export function productFood(p){
 if(!p||typeof p!=='object')return null;
 const n=p.nutriments||{};
 let kcal=numeric(n['energy-kcal_100g']);
 if(kcal===null){const kj=numeric(n['energy-kj_100g']??n.energy_100g);if(kj!==null)kcal=kj/4.184;}
 const name=String(p.product_name_tr||p.product_name||p.generic_name||'').trim();
 const code=String(p.code??'');
 if(!name||!/^\d{4,14}$/.test(code))return null;
 return {id:'off:'+code,code,name,brand:Array.isArray(p.brands)?p.brands.join(', '):String(p.brands||''),per100:kcal!==null&&kcal>=0&&kcal<=1000?Math.round(kcal*10)/10:null,source:'Open Food Facts',url:'https://world.openfoodfacts.org/product/'+code,unit:'g / ml',original:''};
}
export function localFoods(rows){return rows.map(([id,name,per100,original])=>({id:'usda:'+id,name,per100,original,brand:'',unit:'g',source:'USDA',url:'https://fdc.nal.usda.gov/food-details/'+id+'/nutrients'}));}
export function searchFoods(foods,query,limit=30){
 const q=normalize(query),tokens=q.split(' ').filter(Boolean);
 if(!q)return [];
 return foods.map((f,index)=>{
  if(f.code===query.trim())return {f,score:-100,index};
  const name=normalize(f.name),all=name+' '+normalize(f.brand)+' '+normalize(f.original);
  if(!tokens.every(t=>all.includes(t)))return null;
  return {f,score:(name===q?-50:name.startsWith(q+' ')?-30:name.startsWith(q)?-10:0)+name.length/1000,index};
 }).filter(Boolean).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,limit).map(x=>x.f);
}
const fields='code,product_name,product_name_tr,brands,nutriments';
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
