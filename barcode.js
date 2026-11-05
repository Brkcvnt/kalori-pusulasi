export function setupBarcodeScanner(onBarcode){
 const dialog=document.querySelector('#scan-dialog');
 const video=dialog.querySelector('video');
 const status=document.querySelector('#scan-status');
 const canvas=document.createElement('canvas');
 const context=canvas.getContext('2d',{willReadFrequently:true});
 let stream,timer,session=0;
 function stop(){
  session++;
  clearTimeout(timer);
  stream?.getTracks().forEach(track=>track.stop());
  stream=null;
  video.srcObject=null;
 }
 function close(){
  stop();
  if(dialog.open)dialog.close();
 }
 dialog.addEventListener('close',()=>{if(!dialog.open)stop();});
 document.querySelector('#stop-scan').onclick=close;
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open)close();});
 document.querySelector('#scan-barcode').onclick=async()=>{
  if(!navigator.mediaDevices?.getUserMedia||!context){
   onBarcode(null,'Bu tarayıcıda kamera açılamıyor. Barkodu elle girebilirsin.');
   return;
  }
  const active=++session;
  dialog.showModal();
  status.textContent='Kamera açılıyor…';
  const current=()=>dialog.open&&active===session;
  try{
   await import('./zxing-browser-0.1.5.min.js');
   if(!current())return;
   const reader=new globalThis.ZXingBrowser.BrowserMultiFormatOneDReader();
   const opened=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},
    audio:false
   });
   if(!current()){opened.getTracks().forEach(track=>track.stop());return;}
   stream=opened;
   video.srcObject=stream;
   await video.play();
   if(!current())return;
   status.textContent='Barkodu kameraya göster.';
   function scan(){
    if(!current())return;
    if(video.readyState>=2){
     canvas.width=video.videoWidth;
     canvas.height=video.videoHeight;
     context.drawImage(video,0,0);
     let code;
     try{code=reader.decodeFromCanvas(canvas).getText();}catch{}
     if(/^\d{8,14}$/.test(code??'')){
      close();
      onBarcode(code);
      return;
     }
    }
    timer=setTimeout(scan,220);
   }
   scan();
  }catch{
   if(current()){
    stop();
    status.textContent='Kamera açılamadı. Kamera iznini kontrol et veya barkodu elle gir.';
   }
  }
 };
}
