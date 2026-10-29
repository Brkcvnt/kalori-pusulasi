export function calculate(p) {
  for (const [key,min,max] of [['age',18,100],['height',120,230],['weight',35,300]]) {
    if (!Number.isFinite(+p[key]) || +p[key]<min || +p[key]>max) throw Error('Yaş 18–100, boy 120–230 cm, kilo 35–300 kg aralığında olmalı.');
  }
  if (!['female','male'].includes(p.sex) || ![1.2,1.375,1.55,1.725].includes(+p.activity)) throw Error('Hesaplama seçeneklerini kontrol et.');
  const resting = 10*p.weight+6.25*p.height-5*p.age+(p.sex==='male'?5:-161);
  return Math.round(resting*p.activity);
}
export function total(entries) { return entries.reduce((s,e)=>s+e.kcal,0); }
export function calories(per100, grams) {
  if (!Number.isFinite(per100)||!Number.isFinite(grams)||per100<0||per100>1000||grams<=0||grams>10000) throw Error('Kalori 0–1000, miktar 0’dan büyük ve en fazla 10000 olmalı.');
  return Math.round(per100*grams/100*10)/10;
}
export function dateKey(d=new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
