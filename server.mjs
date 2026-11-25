import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serveMealPhoto} from './photo-analysis.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript',
 '.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
 try {
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(p==='/api/meal-photo')return await serveMealPhoto(req,res);
  const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||p.split('/').some(x=>x.startsWith('.'))||f.endsWith('.mjs')){
   res.writeHead(403);
   return res.end();
  }
  const data=await readFile(f);
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(data);
 } catch {
  if(!res.headersSent)res.writeHead(404);
  res.end('Not found');
 }
}).listen(4173,'127.0.0.1',()=>console.log('http://localhost:4173'));
