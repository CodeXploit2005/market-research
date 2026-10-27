import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {networkInterfaces} from 'node:os';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
import {SearchClient} from './search.mjs';
import {research,imageResearch} from './research.mjs';

const cloud=process.env.RENDER==='true';
const publicOrigin=process.env.RENDER_EXTERNAL_URL?new URL(process.env.RENDER_EXTERNAL_URL).origin:null;
const publicHost=process.env.RENDER_EXTERNAL_HOSTNAME||(publicOrigin?new URL(publicOrigin).hostname:null);
const root=resolve(fileURLToPath(new URL('../dist',import.meta.url))),port=Number(process.env.PORT||4318),lan=process.argv.includes('--lan'),host=lan||cloud?'0.0.0.0':'127.0.0.1';
if(cloud&&!/^[A-Za-z0-9]{12,64}$/.test(process.env.GIASAT_PAIRING_CODE||''))throw new Error('Render cần GIASAT_PAIRING_CODE: 12–64 ký tự chữ và số.');
const pin=(process.env.GIASAT_PAIRING_CODE||randomBytes(5).toString('hex')).toUpperCase(),sessions=new Map(),jobs=new Map(),attempts=new Map(),client=new SearchClient();let active=0;
const allowedOrigin=new Set(['https://gia-sat-market-dungtran.blondsky20.chatgpt.site']);
const ips=Object.values(networkInterfaces()).flat().filter(x=>x.family==='IPv4'&&!x.internal).map(x=>x.address);
const urls=cloud&&publicOrigin?[publicOrigin]:[`http://localhost:${port}`,...(lan?ips.map(ip=>`http://${ip}:${port}`):[])];
const safeEqual=(a,b)=>{const aa=Buffer.from(a||''),bb=Buffer.from(b||'');return aa.length===bb.length&&timingSafeEqual(aa,bb)};
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function getSession(req){const token=(req.headers.authorization||'').replace(/^Bearer /,'')||((req.headers.cookie||'').match(/giasat=([^;]+)/)||[])[1];const s=sessions.get(token);return s&&s.exp>Date.now()?s:null}
async function body(req){let raw='';for await(const b of req){raw+=b;if(raw.length>16000)throw new Error('Yêu cầu quá lớn')}return JSON.parse(raw||'{}')}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 const reqOrigin=req.headers.origin,expected=publicOrigin||`http://${req.headers.host}`;const isAllowed=!reqOrigin||reqOrigin===expected||allowedOrigin.has(reqOrigin);
 if(reqOrigin&&isAllowed){res.setHeader('Access-Control-Allow-Origin',reqOrigin);res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Private-Network','true')}
 if(!isAllowed)return send(res,403,{error:'Origin không được phép.'});if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
 try{const url=new URL(req.url,expected),path=url.pathname;const loopback=!cloud&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  // Restrict Host to avoid DNS rebinding. LAN clients still need pairing.
  const hostname=new URL(`http://${req.headers.host}`).hostname.replace(/[\[\]]/g,'');if(!['localhost','127.0.0.1','::1',...ips,publicHost].includes(hostname))return send(res,403,{error:'Host không được phép.'});
  if(path==='/api/connect'&&req.method==='POST'){
   const ip=req.socket.remoteAddress,a=attempts.get(ip)||{count:0,at:Date.now()};if(Date.now()-a.at>60000){a.count=0;a.at=Date.now()}attempts.set(ip,a);if(++a.count>8)return send(res,429,{error:'Đã thử quá nhiều lần. Chờ một phút.'});
   const data=await body(req);if(!safeEqual(String(data.pin||'').toUpperCase(),pin)&&!(loopback&&reqOrigin===expected&&data.local===true))return send(res,401,{error:'Mã ghép nối chưa đúng.'});
   const token=randomBytes(32).toString('hex');sessions.set(token,{id:randomBytes(8).toString('hex'),exp:Date.now()+24*3600000});res.setHeader('Set-Cookie',`giasat=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${cloud?'; Secure':''}`);return send(res,200,{token});
  }
  if(path==='/api/health'){return send(res,200,{ok:true,name:'GiáSát Research Engine',version:'2.0.0',...(getSession(req)?await client.status():{})})}
  if(path.startsWith('/api/')){
   const session=getSession(req);if(!session)return send(res,401,{error:'Kết nối máy chủ bằng mã ghép nối trước khi nghiên cứu.'});
   if(path==='/api/pairing'&&req.method==='GET')return send(res,200,{pin,urls});
   if(path==='/api/research'&&req.method==='POST'){
    if(active>=2)return send(res,429,{error:'Đang có nghiên cứu chạy. Chờ hoàn tất rồi thử lại.'});const data=await body(req);const product=String(data.product||'').trim();if(!product||product.length>120)return send(res,400,{error:'Tên sản phẩm cần từ 1 đến 120 ký tự.'});if(!['month','year'].includes(data.period)||!['Chính chủ','Cấp riêng','Dùng chung','Chưa rõ'].includes(data.account))return send(res,400,{error:'Gói nghiên cứu không hợp lệ.'});
    const status=await client.status();if(!status.ready)return send(res,503,{error:'Chưa có phiên tìm kiếm trên PC. Chạy node server/login.mjs hoặc cấu hình OPENAI_API_KEY.'});
    const id=randomBytes(16).toString('hex'),controller=new AbortController(),job={id,owner:session.id,status:'running',events:[],createdAt:Date.now(),controller};jobs.set(id,job);active++;
    research(client,{product,period:data.period,account:data.account,depth:data.depth==='medium'?'medium':'high'},event=>job.events.push({...event,at:new Date().toISOString()}),controller.signal).then(result=>{job.result=result;job.status='done'}).catch(e=>{job.error=e.message;job.status=controller.signal.aborted?'cancelled':'error'}).finally(()=>active--);return send(res,202,{id});
   }
   const match=path.match(/^\/api\/jobs\/([a-f0-9]{32})$/);if(match){const j=jobs.get(match[1]);if(!j||j.owner!==session.id)return send(res,404,{error:'Không tìm thấy phiên nghiên cứu.'});if(req.method==='DELETE'){j.controller.abort();return send(res,200,{ok:true})}if(req.method==='GET')return send(res,200,{id:j.id,status:j.status,events:j.events,result:j.result,error:j.error})}
   if(path==='/api/images'&&req.method==='POST'){if(active>=2)return send(res,429,{error:'Máy chủ đang bận.'});const data=await body(req),product=String(data.product||'').trim();if(!product||product.length>120)return send(res,400,{error:'Tên sản phẩm không hợp lệ.'});active++;try{return send(res,200,await imageResearch(client,product,AbortSignal.timeout(150000)))}finally{active--}}
   return send(res,404,{error:'Không có chức năng này.'});
  }
  if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Phương thức không hỗ trợ.'});
  const file=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))return send(res,403,{error:'Không được phép.'});
  try{const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data)}catch{return send(res,404,{error:'Không tìm thấy trang.'})}
 }catch(e){if(!res.headersSent)send(res,500,{error:e instanceof SyntaxError?'Dữ liệu yêu cầu không hợp lệ.':e.message})}
});
const cleanup=setInterval(()=>{for(const[id,j]of jobs)if(Date.now()-j.createdAt>3600000){j.controller.abort();jobs.delete(id)}for(const[t,s]of sessions)if(s.exp<Date.now())sessions.delete(t);for(const[ip,a]of attempts)if(Date.now()-a.at>60000)attempts.delete(ip)},60000);cleanup.unref();
server.listen(port,host,()=>{console.log(`GiáSát đã sẵn sàng: ${urls.join(' · ')}`);console.log(cloud?'Mã ghép nối: dùng giá trị GIASAT_PAIRING_CODE trong Render Environment.':`Mã ghép nối điện thoại: ${pin}`);console.log('Giữ cửa sổ này mở khi dùng công cụ. Ctrl+C để dừng.');if(process.argv.includes('--open')&&process.platform==='win32')spawn('rundll32',['url.dll,FileProtocolHandler',urls[0]],{windowsHide:true,stdio:'ignore'}).unref()});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Cổng ${port} đang được sử dụng. Mở http://localhost:${port} hoặc đổi PORT.`:e.message);process.exitCode=1});

