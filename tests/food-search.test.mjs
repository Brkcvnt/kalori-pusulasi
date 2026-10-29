import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productFood,localFoods,searchFoods,searchUrl,responseFoods} from '../food-search.js';
const product=(n={})=>({code:'8690504953807',product_name:'Halley',brands:['Ülker'],nutriments:n});
test('Only per-100 nutrition is used; missing, null and empty values are not zero',()=>{
 for(const n of [{},{'energy-kcal_100g':null},{'energy-kcal_100g':''},{'energy-kcal_serving':90},{'energy-kcal_100g':false}])assert.equal(productFood(product(n)).per100,null);
 assert.equal(productFood(product({'energy-kcal_100g':0})).per100,0);
 assert.equal(productFood(product({'energy-kcal_100g':'440'})).per100,440);
 assert.equal(productFood(product({'energy-kcal_100g':1001})).per100,null);
});
test('kJ fallback converts energy to kcal, including genuine zero',()=>{
 assert.equal(productFood(product({energy_100g:418.4})).per100,100);
 assert.equal(productFood(product({'energy-kj_100g':0})).per100,0);
 assert.equal(productFood(product({'energy-kcal_100g':null,energy_100g:418.4})).per100,100);
});
test('name, brand and barcode search with Turkish character normalization',()=>{
 const f=productFood(product({'energy-kcal_100g':440}));
 assert.equal(searchFoods([f],'ulker halley')[0],f);
 assert.equal(searchFoods([f],'8690504953807')[0],f);
 assert.equal(searchFoods([f],'nonexistent').length,0);
 const p=productFood({...product(),product_name_tr:'Sütlü çikolata'});assert.equal(searchFoods([p],'sutlu')[0],p);
});
test('source identifiers are safe; response formats and request fields are explicit',()=>{
 assert.equal(productFood({...product(),code:'<script>'}),null);
 assert.equal(responseFoods({hits:[product({'energy-kcal_100g':440})]}).length,1);
 assert.equal(responseFoods({product:product({'energy-kcal_100g':440})}).length,1);
 assert.throws(()=>responseFoods({hits:{}}));
 assert.equal(new URL(searchUrl('8690504953807')).pathname,'/api/v2/product/8690504953807');
 const q=new URL(searchUrl('brands:evil *')).searchParams.get('q');assert.equal(q,'"brands:evil" "*"');
});
test('bundled data has real source energy, adequate coverage, and separate licenses',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../usda-foods.json',import.meta.url)));
 const foods=localFoods(data.foods);assert.equal(foods.length,7793);
 assert.ok(foods.every(f=>Number.isFinite(f.per100)&&f.per100>=0&&f.per100<=1000&&f.original&&f.url.startsWith('https://fdc.nal.usda.gov/')));
 for(const q of ['elma','muz','tavuk','pirinç','yoğurt','mercimek','bulgur','patates','badem'])assert.ok(searchFoods(foods,q).length,q);
 const off=JSON.parse(fs.readFileSync(new URL('../packaged-foods.json',import.meta.url)));assert.equal(off.license,'ODbL-1.0');assert.equal(off.products.length,3345);
 assert.ok(searchFoods(off.products.map(productFood).filter(Boolean),'ülker').length);
});
test('short queries stay closed; bounded results preserve ranking and stable ties',()=>{
 const foods=['Elmalı kek','Elma suyu','Elma','Kırmızı elma','Elma'].map((name,i)=>({id:String(i),name,brand:'',original:'',code:'869000000000'+i}));
 assert.deepEqual(searchFoods(foods,'e'),[]);
 assert.deepEqual(searchFoods(foods,'elma',3).map(f=>f.id),['2','4','1']);
 assert.deepEqual(searchFoods(foods,'8690000000000',1).map(f=>f.id),['0']);
 assert.deepEqual(searchFoods(foods,'elma',0),[]);
});
test('repeated typing reuses catalog fields; a replacement catalog builds a fresh index',()=>{
 let reads=0;
 const food={id:'test',get name(){reads++;return 'Sütlü çikolata';},brand:'Ülker',original:'Milk chocolate'};
 const catalog=[food];
 assert.equal(searchFoods(catalog,'ulker sutlu')[0],food);
 const initialReads=reads;
 assert.equal(searchFoods(catalog,'milk')[0],food);
 assert.equal(searchFoods(catalog,'cikolata')[0],food);
 assert.equal(reads,initialReads);
 assert.deepEqual(searchFoods([{id:'new',name:'Yoğurt'}],'sutlu'),[]);
});
