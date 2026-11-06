import test from 'node:test';
import assert from 'node:assert/strict';
import {chartScale,comparePeriods} from '../history-view.js';

test('Grafik tüketim ve değişen günlük hedefleri aynı ölçekte gösterir',()=>{
 assert.equal(chartScale([{calories:2100,target:1800},{calories:1400,target:3200}]),4000);
 assert.equal(chartScale([{calories:2700,target:2000}]),4000);
 assert.equal(chartScale([{calories:null,target:null}]),1000);
});

test('Dönemler çakışmaz ve sıfır kalorili kayıt ortalamaya katılır',()=>{
 const entry=kcal=>({grams:100,kcal});
 const days={
  '2026-10-30':{target:2000,entries:[entry(1800)]},
  '2026-10-31':{target:2000,entries:[entry(0)]},
  '2026-11-06':{target:2000,entries:[entry(2200)]}
 };
 const period=comparePeriods('2026-11-06',days,7);
 assert.equal(period.start,'2026-10-31');
 assert.equal(period.previousEnd,'2026-10-30');
 assert.equal(period.present.logged,2);
 assert.equal(period.present.within,1);
 assert.equal(period.total,2200);
 assert.equal(period.difference,-700);
 assert.equal(comparePeriods('2026-11-06',{},30).difference,null);
});
