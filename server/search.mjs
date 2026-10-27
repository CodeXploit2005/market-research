// Adapted from openai_websearch (MIT); original license in vendor/LICENSE.
import { AuthManager, jwtExpiry, inferAccountId, saveAuthFile } from './vendor/auth.js';
import { fileURLToPath } from 'node:url';
import { existsSync, rmSync } from 'node:fs';

export function cleanURL(value) {
  try { const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return null;for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);u.hash='';return u.href; } catch { return null; }
}
export async function* parseSSE(body) {
  const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
  function parse(block){const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!data||data==='[DONE]')return null;try{return JSON.parse(data)}catch{throw new Error('Dữ liệu SSE không hợp lệ từ dịch vụ tìm kiếm.')}}
  try{while(true){const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');let end;while((end=buffer.indexOf('\n\n'))>=0){const e=parse(buffer.slice(0,end));buffer=buffer.slice(end+2);if(e)yield e}if(done){if(buffer.trim()){const e=parse(buffer);if(e)yield e}break}}}finally{reader.releaseLock()}
}
export async function processStream(body) {
 const messages=[],sources=new Map(),queries=[];let usage=null,completed=false;
 const source=s=>{const a=s.url_citation||s,u=cleanURL(a.url);if(u)sources.set(u,{url:u,title:a.title||new URL(u).hostname})};
 for await(const e of parseSSE(body)){
  if(['error','response.failed','response.incomplete'].includes(e.type))throw new Error('Dịch vụ chưa hoàn thành yêu cầu. Vui lòng thử lại.');
  if(e.type==='response.output_item.done'){
   if(e.item?.type==='web_search_call'){const a=e.item.action||{};queries.push(...(a.queries||[a.query]).filter(Boolean));for(const s of a.sources||[])source(s)}
   if(e.item?.type==='message')for(const c of e.item.content||[])if(c.type==='output_text'){messages.push(c.text||'');for(const a of c.annotations||[])if(a.type==='url_citation')source(a)}
  }
  if(e.type==='response.completed'){completed=true;usage=e.response?.usage||null}
 }
 if(!completed)throw new Error('Luồng kết quả bị ngắt trước khi hoàn tất.');
 const text=messages.join('\n');if(!text.trim())throw new Error('Dịch vụ không trả nội dung.');return {text,sources:[...sources.values()],queries,usage};
}
export class SearchClient {
 constructor({model,provider,timeoutMs=150000,authPath,fallbackToCodex}={}){this.provider=provider||(process.env.OPENAI_API_KEY?'api':'codex');this.model=model||process.env.OPENAI_WEBSEARCH_MODEL||(this.provider==='api'?'gpt-5-mini':'gpt-5.6-luna');this.timeoutMs=timeoutMs;this.authError=false;this.auth=new AuthManager({authPath:authPath||process.env.OPENAI_WEBSEARCH_AUTH_FILE||(process.env.RENDER==='true'?fileURLToPath(new URL('../.local/chatgpt-auth.json',import.meta.url)):undefined),fallbackToCodex:fallbackToCodex??process.env.RENDER!=='true'})}
 async status(){if(this.provider==='api')return {ready:!!process.env.OPENAI_API_KEY,provider:'OpenAI API',model:this.model,loginAvailable:false,managed:false};const data=this.auth._loadFromFile(),valid=!!data?.tokens?.access_token&&(jwtExpiry(data.tokens.access_token)>Date.now()||!!data.tokens.refresh_token);return {ready:valid&&!this.authError,provider:'Repo · phiên ChatGPT/Codex',model:this.model,loginAvailable:true,managed:!!data&&!data._source,needsLogin:this.authError||!valid}}
 acceptLogin(tokens){if(this.provider==='api')throw new Error('Máy chủ đang dùng OPENAI_API_KEY.');if(!tokens?.access_token||!tokens.refresh_token)throw new Error('Phiên đăng nhập không đầy đủ.');saveAuthFile(tokens,{idToken:tokens.id_token,accountId:inferAccountId(tokens.access_token),path:this.auth.authPath});this.auth._cache=null;this.auth._explicit=null;this.authError=false}
 logout(){if(this.provider==='api')throw new Error('Máy chủ đang dùng OPENAI_API_KEY.');if(existsSync(this.auth.authPath))rmSync(this.auth.authPath);this.auth._cache=null;this.auth._explicit=null;this.auth.fallbackToCodex=false;this.authError=false}
 async search(input,{signal,web=true,contextSize='high'}={}){
  const timeout=AbortSignal.timeout(this.timeoutMs),combined=signal?AbortSignal.any([timeout,signal]):timeout;
  let auth;try{auth=this.provider==='api'?{token:process.env.OPENAI_API_KEY}:await this.auth.getValidToken()}catch{this.authError=true;throw new Error('Phiên ChatGPT cần đăng nhập lại. Mở Kết nối → Đăng nhập ChatGPT.')}if(!auth.token)throw new Error('Chưa đăng nhập dịch vụ tìm kiếm.');
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${auth.token}`};if(auth.accountId)headers['ChatGPT-Account-Id']=auth.accountId;
  const body={model:this.model,input:[{type:'message',role:'user',content:input}],stream:true,store:false,reasoning:{effort:'low'},...(web?{tools:[{type:'web_search',search_context_size:contextSize}],tool_choice:'required',include:['web_search_call.action.sources']}:{})};
  try{const res=await fetch(this.provider==='api'?'https://api.openai.com/v1/responses':'https://chatgpt.com/backend-api/codex/responses',{method:'POST',headers,body:JSON.stringify(body),signal:combined});if(!res.ok){if(res.status===401&&this.provider!=='api')this.authError=true;const t=await res.text();const modelError=/model.*(not|unsupported|available)/i.test(t);throw new Error(res.status===401?'Phiên đăng nhập đã hết hạn. Mở Kết nối để đăng nhập lại.':res.status===429?'Dịch vụ đang giới hạn lượt sử dụng. Hãy thử lại sau.':modelError?'Model cấu hình không khả dụng. Kiểm tra OPENAI_WEBSEARCH_MODEL trong cấu hình máy chủ.':`Dịch vụ tìm kiếm trả HTTP ${res.status}.`)}return {...await processStream(res.body),model:this.model}}catch(e){if(combined.aborted)throw new Error(signal?.aborted?'Đã hủy nghiên cứu.':'Tìm kiếm quá thời gian. Vui lòng thử lại.');throw e}
 }
}
