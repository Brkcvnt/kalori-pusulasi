
const key='kalori-pusulasi-sync-v1';
const rpc='/rest/v1/rpc/kalori_save_diary';
export function syncConfig(project,publicKey){
 const url=new URL(project.trim());
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url.origin)||url.href!==url.origin+'/'||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey.trim()))
  throw Error('Supabase proje adresini ve publishable key değerini kontrol et.');
 return {project:url.origin,publicKey:publicKey.trim()};
}
export function syncDecision(base,remote,local,hasData){
 if(!base){
  if(remote?.digest===local)return 'same';
  if(!hasData&&remote)return 'download';
  if(!hasData&&!remote)return 'idle';
  return 'choose';
 }
 if(remote?.digest===local)return 'same';
 if(!remote)return 'choose';
 if(local===base.digest)return 'download';
 if(remote.digest===base.digest)return 'upload';
 return 'choose';
}
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object'){
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 }
 return value;
}
async function digest(value){
 const bytes=new TextEncoder().encode(JSON.stringify(canonical(value)));
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function setupSync({getState,applyState}){
 const $=selector=>document.querySelector(selector);
 const form=$('#sync-login'),status=$('#sync-status'),conflict=$('#sync-conflict');
 form.elements.project.value ||= 'https://qzhvjadpncqnuxbsroyj.supabase.co';
 form.elements.publicKey.value ||= 'sb_publishable_TTpHceCD1qqShPE32xzNaQ_YTQuuHuw';
 let connection,timer,busy=false,queued=false,choice,refreshPending;
 try{
  const saved=JSON.parse(localStorage.getItem(key));
  if(saved?.access&&saved.refresh){
   syncConfig(saved.project,saved.publicKey);
   connection=saved;
  }
 }catch{}
 const tell=text=>status.textContent=text;
 const persist=()=>localStorage.setItem(key,JSON.stringify(connection));
 function setControls(){
  form.hidden=!!connection;
  $('#sync-actions').hidden=!connection;
  conflict.hidden=!choice;
  for(const element of document.querySelectorAll('#sync-settings button'))element.disabled=busy;
 }
 function configureNative(){
  window.AndroidBackup?.setSyncHost?.(connection?new URL(connection.project).hostname:'');
 }
 async function request(config,path,{method='GET',body,token,timeoutMs=15000,signal}={}){
  const headers={apikey:config.publicKey,Accept:'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  if(body!==undefined)headers['Content-Type']='application/json';
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(config.project+path,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body),
    cache:'no-store',credentials:'omit',redirect:'error',signal:signal?AbortSignal.any([signal,controller.signal]):controller.signal,referrerPolicy:'no-referrer'
   });
   if(!response.ok){
    const error=Error('Sunucu isteği tamamlanamadı.');
    error.status=response.status;
    throw error;
   }
   return await response.json();
  }finally{clearTimeout(timeout);}
 }
 function session(result){
  if(!result.access_token||!result.refresh_token||!result.user?.id)throw Error('Oturum doğrulanamadı.');
  return {access:result.access_token,refresh:result.refresh_token,user:result.user.id,
   expires:Date.now()+Number(result.expires_in||3600)*1000};
 }
 function refresh(){
  const active=connection;
  if(!active)throw Error('Önce hesabına giriş yap.');
  if(refreshPending?.connection===active)return refreshPending.promise;
  const promise=request(active,'/auth/v1/token?grant_type=refresh_token',
   {method:'POST',body:{refresh_token:active.refresh}}).then(result=>{
    const next=session(result);
    if(connection!==active||next.user!==active.user)throw Error('Hesap doğrulanamadı.');
    Object.assign(active,next);
    persist();
   }).finally(()=>{if(refreshPending?.promise===promise)refreshPending=undefined;});
  refreshPending={connection:active,promise};
  return promise;
 }
 async function authenticated(path,options={}){
  if(connection.expires<Date.now()+60000)await refresh();
  try{return await request(connection,path,{...options,token:connection.access});}
  catch(error){
   if(error.status!==401)throw error;
   await refresh();
   return request(connection,path,{...options,token:connection.access});
  }
 }
 async function readRemote(){
  const [row]=await authenticated('/rest/v1/kalori_diaries?select=revision,payload&limit=1');
  if(!row)return null;
  if(!Number.isSafeInteger(row.revision)||row.revision<1||row.payload?.version!==1)throw Error('Hesaptaki kayıt biçimi geçersiz.');
  return {...row,digest:await digest(row.payload)};
 }
 async function upload(payload,hash,revision){
  const next=await authenticated(rpc,{method:'POST',body:{expected_revision:revision,payload}});
  if(next===null)return null;
  if(!Number.isSafeInteger(next)||next<=revision)throw Error('Sunucu geçersiz eşitleme sürümü döndürdü.');
  return {revision:next,digest:hash};
 }
 function schedule(){
  clearTimeout(timer);
  if(!connection||choice||!navigator.onLine)return;
  if(busy){queued=true;return;}
  timer=setTimeout(()=>run(),1000);
 }
 async function run(decision,retry=true){
  if(!connection||busy)return;
  if(choice&&!decision){tell('Eşitlemeye devam etmek için hangi kayıtları kullanacağını seç.');return;}
  clearTimeout(timer);
  const pending=choice;
  choice=undefined;
  busy=true;
  setControls();
  tell('Eşitleniyor…');
  try{
   const remote=await readRemote();
   const before=getState();
   const payload=JSON.parse(before);
   const hash=await digest(payload);
   const hasData=Boolean(payload.profile||Object.keys(payload.days).length||payload.collections?.length||payload.favorites?.length||payload.plans?.length);
   const unchanged=pending&&(remote?.revision??0)===pending.revision&&hash===pending.localDigest;
   const action=decision&&unchanged?decision:syncDecision(connection.base,remote,hash,hasData);
   if(action==='choose'){
    choice={revision:remote?.revision??0,localDigest:hash};
    $('#sync-remote').hidden=!remote;
    tell(remote?'Hesaptaki ve cihazdaki kayıtlar farklı. Birini seçmeden önce istersen JSON yedeği indir.':'Bu hesaba cihazdaki kayıtları ilk kez yüklemek için onayla.');
    return;
   }
   if(action==='idle'){tell('Hesap bağlandı. İlk kayıt eklendiğinde yükleme onayı istenecek.');return;}
   if(action==='download'){
    if(getState()!==before){queued=true;return;}
    applyState(remote.payload);
   }
   const base=action==='upload'?await upload(payload,hash,remote?.revision??0):
    {revision:remote.revision,digest:remote.digest};
   if(!base){
    if(retry){queued=false;timer=setTimeout(()=>run(undefined,false),0);return;}
    throw Error('Hesaptaki kayıtlar bu sırada değişti. Yeniden eşitle.');
   }
   connection.base=base;
   persist();
   tell('Son eşitleme '+new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}));
  }catch(error){
   tell(error.status===401?'Oturum doğrulanamadı. Bağlantıyı kesip yeniden oturum aç.':error.status?'Eşitleme sunucusuna erişilemedi. Proje ayarlarını kontrol et.':error.message||'Eşitleme tamamlanamadı.');
  }finally{
   busy=false;
   setControls();
   if(queued){queued=false;schedule();}
  }
 }
 form.onsubmit=async event=>{
  event.preventDefault();
  if(busy||connection)return;
  busy=true;setControls();
  try{
   const config=syncConfig(form.elements.project.value,form.elements.publicKey.value);
   window.AndroidBackup?.setSyncHost?.(new URL(config.project).hostname);
   const registration=event.submitter?.id==='sync-register';
   const auth=await request(config,registration?'/auth/v1/signup':'/auth/v1/token?grant_type=password',
    {method:'POST',body:{email:form.elements.email.value.trim(),password:form.elements.password.value}});
   if(registration&&!auth.access_token){
    tell('Hesap oluşturuldu. E-postadaki doğrulama bağlantısını açıp ardından oturum aç.');
    return;
   }
   connection={...config,...session(auth)};
   persist();
  }catch(error){
   tell(error.status?'Oturum açılamadı. Hesap, şifre ve Supabase ayarlarını kontrol et.':error.message);
  }finally{
   form.elements.password.value='';
   configureNative();
   busy=false;setControls();
  }
  if(connection)run();
 };
 $('#sync-stop').onclick=()=>{
  clearTimeout(timer);
  connection=undefined;
  choice=undefined;
  localStorage.removeItem(key);
  configureNative();
  setControls();
  tell('Bu cihazın hesap bağlantısı kesildi.');
 };
 $('#sync-now').onclick=()=>run();
 $('#sync-local').onclick=()=>run('upload');
 $('#sync-remote').onclick=()=>{
  if(confirm('Bu cihazdaki günlük, profil, öğünler, tarifler, planlar ve favoriler hesaptaki kayıtlarla değiştirilsin mi?'))run('download');
 };
 window.addEventListener('online',schedule);
 setInterval(()=>{if(!document.hidden)schedule();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
 configureNative();
 setControls();
 schedule();
 return {
  schedule,
  async photoAnalysis(body, signal){
   if(!connection){const error=Error('Fotoğraf analizi için Profil → Cihazlar arasında eşitle bölümünden hesabına giriş yap.');error.status=401;throw error;}
   return authenticated('/functions/v1/kalori-meal-photo',{method:'POST',body,timeoutMs:38000,signal});
  }
 };
}

