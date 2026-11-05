
import {dateKey} from './core.js';

export function setupReminder(hasEntries,onReminder){
 const form=document.querySelector('#reminder-form');
 const info=document.querySelector('#reminder-status');
 const native=window.AndroidBackup?.setReminderTime?window.AndroidBackup:null;
 const key='kalori-pusulasi-reminder-v1';
 const sentKey=key+'-sent';
 let time=native?.getReminderTime()||'';
 try{if(!native)time=localStorage.getItem(key)||'';}catch{}
 if(time)form.elements.time.value=time;
 document.querySelector('#reminder-help').textContent=native
  ?'Seçtiğin saatte bugün için kayıt yoksa Android bildirim gönderir. Pil tasarrufu bildirimi geciktirebilir.'
  :'Tarayıcı açıkken çalışır. Uygulama kapalıyken Android uygulamasındaki hatırlatıcıyı kullanabilirsin.';
 function show(){
  info.textContent=time?'Hatırlatıcı açık · '+time:'Hatırlatıcı kapalı.';
 }
 function update(){
  if(native){native.updateReminderLogged(dateKey(),hasEntries());return;}
  if(!time||hasEntries()||document.hidden)return;
  try{if(localStorage.getItem(sentKey)===dateKey())return;}catch{return;}
  const now=new Date();
  const current=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  if(current<time)return;
  localStorage.setItem(sentKey,dateKey());
  info.textContent='Bugünün besin günlüğünde henüz kayıt yok.';
  onReminder(info.textContent);
  if('Notification'in window&&'serviceWorker'in navigator&&Notification.permission==='granted'){
   navigator.serviceWorker.ready.then(registration=>registration.showNotification('Kalori Pusulası',{
    body:'Bugünün besin günlüğünde henüz kayıt yok.',tag:'kalori-diary-reminder'
   })).catch(()=>{});
  }
 }
 form.onsubmit=async event=>{
  event.preventDefault();
  const next=form.elements.time.value;
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(next))return;
  if(native){
   native.updateReminderLogged(dateKey(),hasEntries());
   native.setReminderTime(next);
   info.textContent='Hatırlatma saati · '+next+'. Android bildirim izni gerektirir.';
   return;
  }
  if('Notification'in window&&Notification.permission==='default'){
   try{await Notification.requestPermission();}catch{}
  }
  time=next;
  localStorage.setItem(key,time);
  show();
  update();
 };
 document.querySelector('#reminder-off').onclick=()=>{
  time='';
  if(native)native.setReminderTime('');
  else localStorage.removeItem(key);
  show();
 };
 window.addEventListener('kalori-reminder-change',()=>{time=native?.getReminderTime()||'';show();});
 show();
 if(!native){
  setInterval(update,30000);
  document.addEventListener('visibilitychange',update);
 }
 update();
 return update;
}

