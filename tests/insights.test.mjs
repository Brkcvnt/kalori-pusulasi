
import test from 'node:test';
import assert from 'node:assert/strict';
import {productFood} from '../food-search.js';
import {diaryCsv,datedMeal,periodSummary,toBaseAmount,withAmount} from '../insights.js';
import {syncConfig,syncDecision} from '../sync.js';

test('Paket ve dilim yalnızca kaynakta uyumlu ağırlıkla verildiklerinde eklenir',()=>{
 const product=productFood({code:'4006381333931',product_name:'Ekmek',serving_size:'1 slice (27 g)',
  serving_quantity:'27',serving_quantity_unit:'g',product_quantity:'500',product_quantity_unit:'g',
  nutriments:{'energy-kcal_100g':250,fiber_100g:0,salt_100g:'1.1',sugars_serving:2}});
 assert.deepEqual(product.measures,{Dilim:27,Paket:500});
 assert.deepEqual(product.extras,{fiber:0,salt:1.1});
 assert.equal(toBaseAmount(2,product.measures.Dilim),54);
 assert.equal(toBaseAmount(.5,product.measures.Paket),250);
 assert.throws(()=>toBaseAmount(22,product.measures.Paket));
 assert.deepEqual(productFood({code:'4006381333931',product_name:'Örnek',
  product_quantity:500,product_quantity_unit:'ml',serving_quantity:30,serving_quantity_unit:'g'}).measures,{Paket:500});
});

const sample={id:'id',name:'=HYPERLINK("x")',meal:'Kahvaltı',grams:150,per100:25,kcal:37.5,
 unit:'g',macros:{protein:1},extras:{fiber:0}};
test('CSV tarih aralığı, Türkçe ondalık, formül önlemi ve eksik değerleri korur',()=>{
 const days={'2026-10-31':{entries:[sample]},'2026-11-01':{entries:[{...sample,name:'Seçilmeyen'}]}};
 const csv=diaryCsv(days,'2026-10-31','2026-10-31');
 assert.ok(csv.startsWith('\uFEFF'));
 assert.match(csv,/"'=HYPERLINK\(""x""\)";/);
 assert.match(csv,/;37,5;1,5;;;0;;\r\n$/);
 assert.ok(!csv.includes('Seçilmeyen'));
 assert.equal(diaryCsv(days,'2026-10-30','2026-10-30'),null);
 assert.throws(()=>diaryCsv(days,'2026-11-01','2026-10-31'));
});

test('Önceki öğün ay sınırını geçer, tarif miktarı geçmiş kaydı değiştirmez',()=>{
 const days={'2026-10-31':{entries:[sample,{...sample,meal:'Ara öğün'}]}};
 assert.deepEqual(datedMeal(days,'2026-11-01','Kahvaltı'),[sample]);
 assert.equal(withAmount(sample,100).kcal,25);
 assert.equal(sample.kcal,37.5);
 assert.deepEqual(periodSummary([{calories:0,target:null},{calories:100,target:90},
  {calories:160,target:200},{calories:null,target:200}]),{logged:3,average:260/3,targets:2,within:1});
});

test('Eşitleme çakışmaları seçim ister ve yalnızca Supabase açık anahtarını kabul eder',()=>{
 assert.deepEqual(syncConfig('https://abc123.supabase.co','sb_publishable_123'),{
  project:'https://abc123.supabase.co',publicKey:'sb_publishable_123'});
 assert.throws(()=>syncConfig('https://abc123.supabase.co.evil.test','sb_publishable_123'));
 assert.throws(()=>syncConfig('https://abc123.supabase.co','sb_secret_123'));
 const base={revision:2,digest:'a'};
 assert.equal(syncDecision(base,{revision:3,digest:'b'},'a',true),'download');
 assert.equal(syncDecision(base,{revision:2,digest:'a'},'b',true),'upload');
 assert.equal(syncDecision(base,{revision:3,digest:'b'},'c',true),'choose');
 assert.equal(syncDecision(null,{revision:3,digest:'b'},'c',true),'choose');
 assert.equal(syncDecision(null,null,'c',true),'choose');
 assert.equal(syncDecision(null,null,'c',false),'idle');
});

