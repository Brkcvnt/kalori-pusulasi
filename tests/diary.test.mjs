import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEntry,validateCollection,scaleEntries,macroTotals,historyDays} from '../diary.js';
import {productFood,localFoods} from '../food-search.js';

const entry={id:'one',name:'Örnek',meal:'Kahvaltı',grams:150,per100:123,kcal:184.5};
const recipe={id:'recipe',type:'recipe',name:'Tarif',servings:4,entries:[entry]};

test('Eski kayıtlar açılır ve tarif miktarları kaloriyle birlikte ölçeklenir',()=>{
 assert.doesNotThrow(()=>validateEntry(entry));
 assert.doesNotThrow(()=>validateCollection([recipe]));
 const [portion]=scaleEntries(recipe,1.5);
 assert.equal(portion.grams,56.25);
 assert.equal(portion.kcal,69.2);
 assert.equal(recipe.entries[0].grams,150);
 assert.doesNotThrow(()=>validateEntry(portion));
 assert.throws(()=>scaleEntries(recipe,0));
 assert.throws(()=>validateCollection([{...recipe,servings:0}]));
 assert.throws(()=>validateCollection([recipe,recipe]));
});

test('Eksik makrolar sıfırla karışmaz ve eski kayıtlar kapsama oranına dahil edilir',()=>{
 const food=productFood({code:'8691234567890',product_name:'Örnek',nutriments:{
  'energy-kcal_100g':123,proteins_100g:'10',fat_100g:0,carbohydrates_100g:'',
  carbohydrates_serving:4
 }});
 assert.deepEqual(food.macros,{protein:10,fat:0});
 assert.deepEqual(macroTotals([entry,{...entry,macros:food.macros}]),{
  protein:{grams:15,known:1},carbs:{grams:0,known:0},fat:{grams:0,known:1}
 });
 assert.throws(()=>validateEntry({...entry,macros:{fat:-1}}));
 const [basic]=localFoods([['1','Muz',89,'Bananas',{protein:1.09,carbs:22.84,fat:0.33}]]);
 assert.equal(basic.macros.carbs,22.84);
});

test('30 günlük geçmiş ay ve yıl sınırını geçer, boş gün ile sıfır kaloriyi ayırır',()=>{
 const days={
  '2025-12-03':{target:2000,entries:[entry]},
  '2025-12-05':{target:2000,entries:[entry]},
  '2026-01-01':{target:2100,entries:[]},
  '2026-01-02':{target:2200,entries:[{kcal:0}]}
 };
 const rows=historyDays('2026-01-02',days,30);
 assert.equal(rows.length,30);
 assert.equal(rows[0].date.getDate(),4);
 assert.equal(rows[0].date.getMonth(),11);
 assert.deepEqual(rows.filter(row=>row.calories!==null).map(row=>row.calories),[184.5,0]);
 assert.deepEqual(rows.slice(-2).map(({target,calories})=>[target,calories]),[[2100,null],[2200,0]]);
});
