import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localFoods} from '../food-search.js';
import {gestureAction} from '../navigation.js';
import {makeTemplate,recipeTemplateRows,planEntries,shoppingItems,validatePlans,validDate} from '../planner.js';

test('Alt çizgide hızlı hareket özet, bekleyerek bırakma bölüm seçiciyi açar',()=>{
 const base={x:180,y:700,dx:4,dy:-100,width:360,held:70,handle:true};
 assert.equal(gestureAction(base),'dashboard');
 assert.equal(gestureAction({...base,held:320}),'recent');
 assert.equal(gestureAction({...base,dy:-30}),null);
 assert.equal(gestureAction({...base,dx:140}),null);
});

test('Geri hareketi iki yanda çalışır, ekranın tam kenarını ve dikey kaydırmayı kullanmaz',()=>{
 const base={x:28,y:330,dx:90,dy:6,width:360,held:70,handle:false};
 assert.equal(gestureAction(base),'back');
 assert.equal(gestureAction({...base,x:333,dx:-90}),'back');
 assert.equal(gestureAction({...base,x:4}),null);
 assert.equal(gestureAction({...base,x:180}),null);
 assert.equal(gestureAction({...base,dy:100}),null);
});

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

