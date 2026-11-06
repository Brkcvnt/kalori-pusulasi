import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localFoods} from '../food-search.js';
import {makeTemplate,recipeTemplateRows,planEntries,shoppingItems,validatePlans,validDate} from '../planner.js';

test('Şablonlar gerçek katalog verisi kullanır, plan porsiyonu ve alışveriş miktarı birlikte ölçeklenir',()=>{
 const {foods}=JSON.parse(readFileSync(new URL('../usda-foods.json',import.meta.url),'utf8'));
 const catalog=new Map(localFoods(foods).map(food=>[food.id.slice(5),food]));
 const templates=recipeTemplateRows().map(row=>makeTemplate(row,catalog));
 const collection=templates[0];
 const plan={id:'one',date:'2026-11-07',meal:'Kahvaltı',servings:1.5,collection};
 validatePlans([plan,...templates.slice(1).map((item,index)=>({...plan,id:String(index),collection:item}))]);
 assert.equal(planEntries(plan)[0].grams,75);
 assert.equal(collection.entries[0].grams,100);
 assert.equal(shoppingItems([plan,{...plan,id:'two',servings:.5}]).find(item=>item.name==='Yumurta').grams,100);
 assert.throws(()=>validatePlans([plan,{...plan}]));
 assert.throws(()=>validatePlans([{...plan,date:'2026-02-31'}]));
 assert.equal(validDate('2028-02-29'),true);
});

