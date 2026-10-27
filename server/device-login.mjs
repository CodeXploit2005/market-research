import {randomUUID} from 'node:crypto';
import {authenticateDeviceCode} from './vendor/auth.js';

function friendly(error){if(error?.status===429)return 'OpenAI đang giới hạn lượt đăng nhập. Chờ một lát rồi tạo mã mới.';if(error?.status===401)return 'OpenAI từ chối xác thực. Hãy tạo mã mới và kiểm tra tài khoản.';if([400,403].includes(error?.status))return 'OpenAI chưa cho phép đăng nhập bằng mã thiết bị. Kiểm tra Device code login trong phần bảo mật ChatGPT hoặc quyền workspace.';if(error?.status)return `OpenAI trả HTTP ${error.status}. Đăng nhập bằng mã thiết bị chưa khả dụng từ máy chủ này.`;if(/timed out|TimeoutError/i.test(error?.message||error?.name))return 'Mã đăng nhập đã hết hạn hoặc OpenAI phản hồi quá lâu. Hãy tạo mã mới.';return 'Chưa hoàn tất đăng nhập. Kiểm tra kết nối tới OpenAI và thử lại.'}

export class DeviceLogin {
 constructor(client,{authenticate=authenticateDeviceCode,timeoutMs=15*60*1000,now=()=>Date.now()}={}){this.client=client;this.authenticate=authenticate;this.timeoutMs=timeoutMs;this.now=now;this.attempt=null;this.lastStart=-Infinity}
 publicState(owner,id){const a=this.attempt;if(!a||a.owner!==owner||(id&&a.id!==id))return null;return {id:a.id,status:a.status,...(a.status==='pending'?{verificationUrl:a.verificationUrl,userCode:a.userCode,expiresAt:a.expiresAt}:{}),...(a.error?{error:a.error}:{})}}
 async start(owner){
  if(this.client.provider==='api'){const e=new Error('Máy chủ đang dùng API key. Xóa OPENAI_API_KEY khỏi Render nếu muốn chuyển sang đăng nhập ChatGPT.');e.status=409;throw e}
  if(this.attempt&&['starting','pending'].includes(this.attempt.status)){if(this.attempt.owner===owner)return this.publicState(owner);const e=new Error('Một phiên đăng nhập khác đang chờ xác nhận. Hãy thử lại sau.');e.status=409;throw e}
  if(this.now()-this.lastStart<10000){const e=new Error('Chờ 10 giây trước khi tạo mã mới.');e.status=429;throw e}this.lastStart=this.now();
  const controller=new AbortController(),a={id:randomUUID(),owner,status:'starting',controller};this.attempt=a;
  let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
  a.completion=(async()=>{try{const result=await this.authenticate({printUrl:false,timeoutMs:this.timeoutMs,signal:controller.signal,onDeviceCode:details=>{if(controller.signal.aborted)return;const official=new URL(details.verificationUrl);if(official.origin!=='https://auth.openai.com'||official.pathname!=='/codex/device')throw new Error('Invalid verification URL');a.verificationUrl=official.href;a.userCode=String(details.userCode).slice(0,40);a.expiresAt=details.expiresAt;a.status='pending';resolveReady()}});if(controller.signal.aborted)return;this.client.acceptLogin(result.tokens);a.status='succeeded'}catch(error){if(!controller.signal.aborted){a.status='error';a.error=friendly(error)}}finally{if(a.status!=='pending'){delete a.userCode;delete a.verificationUrl}resolveReady()}})();
  await ready;return this.publicState(owner);
 }
 cancel(owner,id){const a=this.attempt;if(!a||a.owner!==owner||a.id!==id)return false;if(['starting','pending'].includes(a.status)){a.status='cancelled';delete a.userCode;delete a.verificationUrl;a.controller.abort(new Error('Cancelled'))}return true}
 cancelPending(){const a=this.attempt;if(a)this.cancel(a.owner,a.id)}
}
