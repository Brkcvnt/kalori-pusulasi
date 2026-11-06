import {dateKey,total} from './core.js';
import {historyDays,meals} from './diary.js?v=7';
import {dateOffset,periodSummary} from './insights.js?v=7';

const shortDate=new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short'});
const longDate=new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const displayDate=key=>shortDate.format(new Date(key+'T12:00:00'));
const intervalLabel=(start,end)=>displayDate(start)+' – '+displayDate(end)+' '+end.slice(0,4);

export function chartScale(days){
 const max=Math.max(1000,...days.map(day=>Math.max(day.calories??0,day.target??0)));
 const midpoint=max/2;
 const magnitude=10**Math.floor(Math.log10(midpoint));
 const step=[1,2,2.5,5,10].map(factor=>factor*magnitude).find(value=>value>=midpoint);
 return step*2;
}

export function comparePeriods(end,days,count){
 const previousEnd=dateOffset(end,-count);
 const current=historyDays(end,days,count);
 const previous=historyDays(previousEnd,days,count);
 const present=periodSummary(current),past=periodSummary(previous);
 return {current,present,past,
  start:dateKey(current[0].date),previousStart:dateKey(previous[0].date),previousEnd,
  total:current.reduce((sum,day)=>sum+(day.calories??0),0),
  difference:present.average===null||past.average===null?null:present.average-past.average};
}

export function setupHistory({getDays,getDiaryDate,openDiary,exportRange,num}){
 const $=s=>document.querySelector(s);
 const chart=$('#history-chart'),range=$('#history-range'),preview=$('#history-detail');
 const earlier=$('#history-previous'),later=$('#history-next'),today=$('#history-today');
 let selected,end,diaryDate,visibleDays=[],buttons=[],lastCount;
 const kcal=n=>n===null?'—':num(n)+' kcal';
 const text=(selector,value)=>$(selector).textContent=value;

 function showDay(index,{focus=false}={}){
  const day=visibleDays[index];
  if(!day)return;
  selected=dateKey(day.date);
  const entries=getDays()[selected]?.entries??[];
  buttons.forEach((button,i)=>{
   button.setAttribute('aria-pressed',String(i===index));
   button.tabIndex=i===index?0:-1;
  });
  if(focus)buttons[index].focus({preventScroll:true});
  const bounds=chart.getBoundingClientRect(),cell=buttons[index].getBoundingClientRect();
  if(cell.left<bounds.left)chart.scrollLeft+=cell.left-bounds.left-4;
  else if(cell.right>bounds.right)chart.scrollLeft+=cell.right-bounds.right+4;
  text('#history-day-title',longDate.format(day.date));
  text('#history-day-energy',day.calories===null?'Kayıt yok':kcal(day.calories));
  text('#history-day-goal',day.target===null?'Hedef kaydedilmemiş':'Günlük hedef · '+kcal(day.target));
  const difference=day.target===null||day.calories===null?null:day.target-day.calories;
  text('#history-day-difference',difference===null?'':difference===0?'Günlük hedefe ulaşıldı':
   kcal(Math.abs(difference))+(difference>0?' hedefe kaldı':' hedefin üzerinde'));
  const list=$('#history-meals');
  list.replaceChildren();
  for(const meal of meals){
   const items=entries.filter(entry=>entry.meal===meal);
   if(!items.length)continue;
   const row=document.createElement('li');
   const name=document.createElement('span');
   name.textContent=meal;
   const amount=document.createElement('strong');
   amount.textContent=kcal(total(items));
   row.append(name,amount);
   list.append(row);
  }
  list.hidden=!entries.length;
  preview.hidden=false;
 }
 function move(delta){
  end=dateOffset(end,delta);
  if(end>dateKey())end=dateKey();
  selected=end;
  render();
 }
 earlier.onclick=()=>move(-Number(range.value));
 later.onclick=()=>move(Number(range.value));
 today.onclick=()=>{end=dateKey();selected=end;render();};
 range.onchange=()=>render();
 $('#history-open-day').onclick=()=>openDiary(selected);
 $('#history-export-period').onclick=()=>exportRange(dateOffset(end,1-Number(range.value)),end);
 chart.addEventListener('keydown',event=>{
  const index=buttons.indexOf(event.target);
  if(index<0)return;
  const targets={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:buttons.length-1};
  if(!(event.key in targets))return;
  event.preventDefault();
  showDay(Math.max(0,Math.min(buttons.length-1,targets[event.key])),{focus:true});
 });

 function render(){
  const active=getDiaryDate();
  if(active!==diaryDate){
   diaryDate=active;
   end=active;
   selected=active;
  }
  const count=Number(range.value);
  const days=getDays();
  const data=comparePeriods(end,days,count);
  visibleDays=data.current;
  const scale=chartScale(visibleDays);
  earlier.disabled=!Object.keys(days).some(date=>date<data.start);
  later.disabled=end>=dateKey();
  today.disabled=end===dateKey();
  text('#history-interval',intervalLabel(data.start,end));
  text('#history-metric-average',kcal(data.present.average));
  text('#history-metric-total',data.present.logged?kcal(data.total):'—');
  text('#history-metric-logged',data.present.logged+' / '+count);
  text('#history-metric-goal',data.present.targets?data.present.within+' / '+data.present.targets:'—');
  text('#history-axis-top',num(scale));
  text('#history-axis-mid',num(scale/2));
  text('#history-period-current',intervalLabel(data.start,end));
  text('#history-period-previous',intervalLabel(data.previousStart,data.previousEnd));
  text('#history-average-current',data.present.average===null?'—':kcal(data.present.average)+'/gün');
  text('#history-average-previous',data.past.average===null?'—':kcal(data.past.average)+'/gün');
  text('#history-average-change',data.difference===null?'Karşılaştırma için iki dönemde de kayıt gerekli.':
   Math.abs(data.difference)<0.05?'Günlük ortalamalar aynı.':
   'Günlük ortalama '+kcal(Math.abs(data.difference))+(data.difference>0?' arttı.':' azaldı.'));
  const activeIndex=visibleDays.findIndex(day=>dateKey(day.date)===selected);
  const focusIndex=buttons.indexOf(document.activeElement);
  const oldScroll=chart.scrollLeft;
  chart.classList.toggle('month',count===30);
  buttons=visibleDays.map((day,index)=>{
   const button=$('#history-template').content.firstElementChild.cloneNode(true);
   const track=button.querySelector('.history-track');
   track.style.setProperty('--energy-height',((day.calories??0)/scale*100)+'%');
   track.style.setProperty('--goal-height',((day.target??0)/scale*100)+'%');
   track.querySelector('.history-bar').hidden=day.calories===null;
   track.querySelector('.history-goal').hidden=day.target===null;
   button.querySelector('.history-date').textContent=shortDate.format(day.date);
   button.querySelector('.history-energy').textContent=day.calories===null?'—':num(day.calories);
   button.setAttribute('aria-label',longDate.format(day.date)+' · '+(day.calories===null?'Kayıt yok':kcal(day.calories))
     +' · '+(day.target===null?'Hedef yok':'Hedef '+kcal(day.target)));
   button.onclick=()=>showDay(index);
   return button;
  });
  chart.replaceChildren(...buttons);
  chart.scrollLeft=count===lastCount?oldScroll:0;
  lastCount=count;
  showDay(activeIndex<0?count-1:activeIndex,{focus:focusIndex>=0});
 }
 return render;
}

