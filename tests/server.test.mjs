import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {request} from 'node:http';

test('Render uses public HTTPS origin, requires pairing even behind a loopback proxy and sets Secure cookie',async()=>{
 const port=14320,base=`http://localhost:${port}`,origin='https://fixture.onrender.com';
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),RENDER:'true',RENDER_EXTERNAL_URL:origin,RENDER_EXTERNAL_HOSTNAME:'fixture.onrender.com',GIASAT_PAIRING_CODE:'TESTONLYPAIR1234',OPENAI_API_KEY:'fixture-key-not-real'},stdio:['ignore','pipe','pipe']});
 try{await Promise.race([once(child.stdout,'data'),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Render fixture startup timed out')),7000).unref())]);
 const headers={Host:'fixture.onrender.com',Origin:origin,'Content-Type':'application/json'};
 assert.equal((await fetch(base+'/api/health',{headers})).status,200);
 const localBypass=await fetch(base+'/api/connect',{method:'POST',headers,body:JSON.stringify({local:true})});assert.equal(localBypass.status,401);
 const paired=await fetch(base+'/api/connect',{method:'POST',headers,body:JSON.stringify({pin:'TESTONLYPAIR1234'})});assert.equal(paired.status,200);assert.match(paired.headers.get('set-cookie'),/; Secure/);
 const {token}=await paired.json();const pairing=await fetch(base+'/api/pairing',{headers:{...headers,Authorization:'Bearer '+token}});assert.deepEqual((await pairing.json()).urls,[origin]);
 assert.equal((await fetch(base+'/api/auth/status',{headers})).status,401);
 const status=await fetch(base+'/api/auth/status',{headers:{...headers,Authorization:'Bearer '+token}});const account=await status.json();assert.equal(account.loginAvailable,false);assert.equal(JSON.stringify(account).includes('fixture-key-not-real'),false);
 const start=await fetch(base+'/api/auth/device',{method:'POST',headers:{...headers,Authorization:'Bearer '+token}});assert.equal(start.status,409);
 const other=await fetch(base+'/api/auth/device/00000000-0000-4000-8000-000000000000',{headers:{...headers,Authorization:'Bearer '+token}});assert.equal(other.status,404);
 const invalidHost=await new Promise((resolve,reject)=>{const req=request(base+'/api/health',{headers:{Origin:origin,Host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()});assert.equal(invalidHost,403);
 }finally{child.kill();await once(child,'exit')}
});

test('HTTP engine serves UI, enforces pairing, rejects cross-origin and invalid research',async()=>{
 const port=14319,base=`http://localhost:${port}`;
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 try{await Promise.race([once(child.stdout,'data'),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Server startup timed out')),7000).unref())]);
  const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/Hiểu thị trường/);
  const anon=await fetch(base+'/api/pairing');assert.equal(anon.status,401);
  const badOrigin=await fetch(base+'/api/health',{headers:{Origin:'https://attacker.example'}});assert.equal(badOrigin.status,403);
  const pair=await fetch(base+'/api/connect',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({local:true})});assert.equal(pair.status,200);const {token}=await pair.json();
  const status=await fetch(base+'/api/health',{headers:{Authorization:'Bearer '+token}});assert.equal(status.status,200);assert.equal((await status.json()).name,'GiáSát Research Engine');
  const invalid=await fetch(base+'/api/research',{method:'POST',headers:{Origin:base,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({product:'test',period:'invalid',account:'Chính chủ'})});assert.equal(invalid.status,400);
  const invalidJob=await fetch(base+'/api/jobs/'+'a'.repeat(32),{headers:{Authorization:'Bearer '+token}});assert.equal(invalidJob.status,404);
  const staticSecret=await fetch(base+'/server/vendor/auth.js');assert.equal(staticSecret.status,404);
 }finally{child.kill();await once(child,'exit')}
});
test('stdio MCP lists web, images and market tools without calling services',async()=>{const child=spawn(process.execPath,['server/mcp.mjs'],{cwd:new URL('..',import.meta.url),stdio:['pipe','pipe','pipe']});try{let result='';child.stdout.on('data',b=>result+=b);child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})+'\n');await Promise.race([once(child.stdout,'data'),new Promise((_,rej)=>setTimeout(()=>rej(new Error('MCP timeout')),5000).unref())]);const data=JSON.parse(result.trim());assert.deepEqual(data.result.tools.map(t=>t.name),['web_search','image_search','research_market'])}finally{child.kill();await once(child,'exit')}});
