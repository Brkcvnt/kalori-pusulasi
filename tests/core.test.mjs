import {test} from 'node:test';import assert from 'node:assert/strict';import {calculate,calories,total,dateKey} from '../core.js';
test('Mifflin-St Jeor ve aktivite katsayısı',()=>{assert.equal(calculate({age:30,height:180,weight:80,sex:'male',activity:1.2}),2136);assert.equal(calculate({age:30,height:165,weight:65,sex:'female',activity:1.2}),1644);});
test('Porsiyon ve toplam kalori; hedef üstü fark',()=>{assert.equal(calories(165,150),247.5);assert.equal(total([{kcal:247.5},{kcal:52}]),299.5);assert.equal(200-total([{kcal:247.5}]),-47.5);});
test('Geçersiz değerler reddedilir',()=>{assert.throws(()=>calories(-1,100));assert.throws(()=>calories(100,0));assert.throws(()=>calories(Infinity,100));assert.throws(()=>calculate({age:17,height:180,weight:80,sex:'male',activity:1.2}));});
test('Yerel gün UTC dönüşümünden etkilenmez',()=>assert.equal(dateKey(new Date(2026,9,29,0,15)),'2026-10-29'));
