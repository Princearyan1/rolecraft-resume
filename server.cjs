const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,engine=import('./tailoring.mjs');
const port=Number(process.env.PORT||4173);
const publicUrl=process.env.RENDER_EXTERNAL_URL||process.env.PUBLIC_URL;
const allowedOrigins=new Set(publicUrl?[new URL(publicUrl).origin]:[`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
const allowedHosts=new Set([...allowedOrigins].map(x=>new URL(x).host));
let activeRequests=0;const recentRequests=new Map();
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
http.createServer(async(req,res)=>{
  if(req.url==='/healthz'){json(res,200,{status:'ok'});return}
  if(!allowedHosts.has(req.headers.host)){json(res,403,{error:'Invalid host'});return}
  const pathname=new URL(req.url,'http://127.0.0.1:4173').pathname;
  if(pathname==='/api/status'){json(res,200,{configured:Boolean(process.env.GROQ_API_KEY)});return}
  if(pathname==='/api/tailor'){
    if(req.method!=='POST'){json(res,405,{error:'Use POST'});return}
    if(!allowedOrigins.has(req.headers.origin)||!req.headers['content-type']?.startsWith('application/json')){json(res,403,{error:'Same-origin JSON required'});return}
    const now=Date.now(),visitor=process.env.RENDER?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress;
    for(const [key,time] of recentRequests)if(now-time>60000)recentRequests.delete(key);
    if(activeRequests>=2||recentRequests.has(visitor)){json(res,429,{error:'Please wait one minute before rewriting again to protect the free API allowance.'});return}
    activeRequests++;recentRequests.set(visitor,now);
    try{let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>400000){json(res,413,{error:'Document too large'});return}body+=chunk}let input;try{input=JSON.parse(body)}catch{json(res,400,{error:'Invalid request'});return}json(res,200,await(await engine).tailorResume(input,process.env));}catch(error){json(res,error.status||502,{error:error.name==='TimeoutError'?'AI rewriting timed out. Please try again.':error.message})}finally{activeRequests--}return;
  }
  if(req.method!=='GET'){res.writeHead(405).end();return}
  if(!['/','/index.html','/style.css','/app.js','/ai.js'].includes(pathname)){res.writeHead(404).end('Not found');return}
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname))}catch{res.writeHead(400).end();return}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'})[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data)});
}).listen(port,publicUrl?'0.0.0.0':'127.0.0.1',()=>console.log('Rolecraft: '+(publicUrl||`http://127.0.0.1:${port}`)+' — AI '+(process.env.GROQ_API_KEY?'configured':'not configured')));

