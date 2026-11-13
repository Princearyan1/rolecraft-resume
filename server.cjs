const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const port=Number(process.env.PORT||4173);
const files=new Set(['/index.html','/style.css','/app.js','/ai.js','/local-tailor.mjs','/tailoring.mjs']);
http.createServer((req,res)=>{
 if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"status":"ok","mode":"browser-only"}');return}
 if(req.method!=='GET'){res.writeHead(405).end();return}
 const pathname=new URL(req.url,'http://localhost').pathname;
 const name=pathname==='/'?'/index.html':pathname;
 if(!files.has(name)){res.writeHead(404).end('Not found');return}
 fs.readFile(path.join(__dirname,name),(error,data)=>{if(error){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'no-store'});res.end(data)});
}).listen(port,'0.0.0.0',()=>console.log('Rolecraft browser-only mode — no AI API key required'));
