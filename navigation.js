const aliases={'saved-meals':'plan',settings:'profile','diary-records':'diary'};
const titles={
 "dashboard": [
  "GÜNLÜK PANO",
  "Günlük özet",
  "Enerji dengeni ve günlük hedefini bir bakışta gör."
 ],
 "diary": [
  "BESİN TAKİBİ",
  "Besin günlüğü",
  "Yediklerini ekle, porsiyonlarını ve öğünlerini düzenle."
 ],
 "plan": [
  "ÖNÜMÜZDEKİ GÜNLER",
  "Öğün planı",
  "Tariflerini düzenle ve öğünlerini önceden planla."
 ],
 "history": [
  "ZAMAN İÇİNDE",
  "Kalori geçmişi",
  "Kayıtlı günlerini incele ve haftalarını karşılaştır."
 ],
 "profile": [
  "KİŞİSEL ALAN",
  "Profil ve ayarlar",
  "Hedeflerini, hatırlatıcılarını ve eşitlemeyi yönet."
 ]
};

export function setupNavigation(){
 const nav=document.querySelector('#section-nav');
 const links=[...nav.querySelectorAll('a')];
 const sections=new Map(links.map(link=>[link.hash.slice(1),document.querySelector('[data-page="'+link.hash.slice(1)+'"]')]));
 let active;
 function route(id){return aliases[id]||id;}
 function showPane(panel,name,focus=false){
  const target=panel.querySelector('[data-pane="'+name+'"]');
  if(!target)return;
  for(const pane of panel.querySelectorAll('[data-pane]'))pane.toggleAttribute('data-inactive',pane!==target);
  for(const button of panel.querySelectorAll('[data-switch]'))button.setAttribute('aria-pressed',String(button.dataset.switch===name));
  if(focus)focusHeading(target);
 }
 function focusHeading(panel){
  const title=panel.querySelector('h2');
  title.tabIndex=-1;
  title.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
 }
 for(const panel of sections.values())for(const button of panel.querySelectorAll('[data-switch]')){
  button.onclick=()=>showPane(panel,button.dataset.switch,true);
 }
 function display(id,focus=false,preferredPane){
  const aliasPane={'saved-meals':'recipes',settings:'preferences','diary-records':'records'}[id];
  id=sections.has(route(id))?route(id):'dashboard';
  const panel=sections.get(id);
  const pane=preferredPane||aliasPane;
  if(pane)showPane(panel,pane);
  if(id===active){
   if(focus&&pane)focusHeading(panel.querySelector('[data-pane]:not([data-inactive])')||panel);
   return;
  }
  active=id;
  for(const [name,panel] of sections)panel.hidden=name!==active;
  for(const link of links){
   if(link.hash==='#'+active)link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
  }
  const [kicker,title,description]=titles[id];
  document.querySelector('#section-kicker').textContent=kicker;
  document.querySelector('#section-title').textContent=title;
  document.querySelector('#section-description').textContent=description;
  if(focus)focusHeading(panel.querySelector('[data-pane]:not([data-inactive])')||panel);
 }
 function go(id,focus=true,pane){
  const target=route(id);
  if(!sections.has(target))return;
  if(target!==active)history.pushState(null,'','#'+target);
  display(id,focus,pane);
 }
 document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[href^="#"]');
  if(!anchor||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!sections.has(route(anchor.hash.slice(1))))return;
  event.preventDefault();
  go(anchor.hash.slice(1));
 });
 const locationChanged=()=>display(location.hash.slice(1),true);
 addEventListener('popstate',locationChanged);
 addEventListener('hashchange',locationChanged);
 display(location.hash.slice(1));

 return go;
}

