const aliases={'saved-meals':'plan',settings:'profile','diary-records':'diary'};
const control='button,a,input,select,textarea,label,summary,video,dialog,.history,[contenteditable]';
export function gestureAction({x,y,dx,dy,width,held,handle}){
 if(handle&&dy<=-52&&Math.abs(dy)>Math.abs(dx)*1.35)return held>=300?'recent':'dashboard';
 const inward=(x>=16&&x<=54&&dx>=64)||(x<=width-16&&x>=width-54&&dx<=-64);
 return !handle&&inward&&Math.abs(dx)>Math.abs(dy)*1.6?'back':null;
}
export function setupNavigation(){
 const nav=document.querySelector('#section-nav');
 const links=[...nav.querySelectorAll('a')];
 const sections=new Map(links.map(link=>[link.hash.slice(1),document.querySelector('[data-page="'+link.hash.slice(1)+'"]')]));
 const root=document.querySelector('#workspace');
 const handle=document.querySelector('#gesture-handle');
 const recent=document.querySelector('#recent-dialog');
 const list=document.querySelector('#recent-sections');
 const visited=[];
 let active,gesture,swiped=false;
 const narrow=matchMedia('(max-width: 760px), (pointer: coarse)');
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
  const previous=visited.indexOf(id);
  if(previous>=0)visited.splice(previous,1);
  visited.unshift(id);
  if(focus)focusHeading(panel.querySelector('[data-pane]:not([data-inactive])')||panel);
 }
 function go(id,focus=true,pane){
  const target=route(id);
  if(!sections.has(target))return;
  if(target!==active)history.pushState({kaloriDepth:(history.state?.kaloriDepth??0)+1},'','#'+target);
  display(id,focus,pane);
 }
 function back(){
  const dialog=document.querySelector('dialog[open]');
  if(dialog){dialog.close();return;}
  if(history.state?.kaloriDepth>0)history.back();
  else if(active!=='dashboard')go('dashboard');
 }
 function openRecent(){
  if(recent.open||document.querySelector('dialog[open]'))return;
  list.replaceChildren();
  for(const id of new Set([...visited,...sections.keys()])){
   const link=links.find(item=>item.hash==='#'+id);
   const button=document.createElement('button');
   button.type='button';
   button.textContent=link.querySelector('span:last-child').textContent;
   if(id===active)button.setAttribute('aria-current','page');
   button.onclick=()=>{recent.close();go(id);};
   list.append(button);
  }
  recent.showModal();
 }
 document.querySelector('#app-back').onclick=back;
 document.querySelector('#close-recent').onclick=()=>recent.close();
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

 function start(event,onHandle){
  if(!narrow.matches||!event.isPrimary||event.pointerType==='mouse'&&!onHandle)return;
  if(!onHandle&&(event.target.closest(control)||document.querySelector('dialog[open]')))return;
  const x=event.clientX,y=event.clientY;
  if(!onHandle&&!(x>=16&&x<=54||x<=innerWidth-16&&x>=innerWidth-54))return;
  gesture={id:event.pointerId,x,y,lastX:x,lastY:y,lastMove:performance.now(),handle:onHandle};
  if(onHandle)handle.setPointerCapture(event.pointerId);
 }
 root.addEventListener('pointerdown',event=>start(event,false));
 handle.addEventListener('pointerdown',event=>{swiped=false;start(event,true);});
 handle.addEventListener('click',event=>{if(!swiped||event.detail===0)openRecent();});
 document.addEventListener('pointermove',event=>{
  if(gesture?.id!==event.pointerId)return;
  if(Math.hypot(event.clientX-gesture.lastX,event.clientY-gesture.lastY)<6)return;
  gesture.lastX=event.clientX;
  gesture.lastY=event.clientY;
  gesture.lastMove=performance.now();
 });
 document.addEventListener('pointercancel',event=>{if(gesture?.id===event.pointerId)gesture=null;});
 document.addEventListener('pointerup',event=>{
  if(gesture?.id!==event.pointerId)return;
  const action=gestureAction({...gesture,dx:event.clientX-gesture.x,dy:event.clientY-gesture.y,
   width:innerWidth,held:performance.now()-gesture.lastMove});
  if(action){
   swiped=gesture.handle;
   if(action==='back')back();
   else if(action==='recent')openRecent();
   else go('dashboard');
  }
  gesture=null;
 });
 return go;
}

