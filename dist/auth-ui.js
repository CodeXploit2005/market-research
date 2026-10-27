const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function createChatGPTAuth({api,isConnected,getBackend,onAuthenticated,toast,confirmAction}){
 const section=document.querySelector('#chatgptAuthSection');let account=null,flow=null,error='',polling=false,activeId=null,pollBackend=null,starting=false,lastRenderKey='';
 const storageKey=()=>`giasat-device-login:${getBackend()}`;
 function remember(value){try{value?sessionStorage.setItem(storageKey(),value):sessionStorage.removeItem(storageKey())}catch{}}
 function render(){
  section.hidden=false;const connected=isConnected(),pending=flow&&['starting','pending'].includes(flow.status),ready=account?.ready;
  const key=JSON.stringify({connected,account,flow,error,starting});if(key===lastRenderKey)return;lastRenderKey=key;
  section.innerHTML='<div class="auth-section-heading"><span class="auth-step">2</span><div><h3>Đăng nhập ChatGPT</h3><p>Dùng tài khoản ChatGPT/Codex của bạn để tìm kiếm.</p></div><span class="auth-state '+(ready?'auth-state-ready':'')+'">'+(ready?'Đã có phiên':connected?'Chưa đăng nhập':'Chưa kết nối')+'</span></div>'+
  (!connected?'<div class="auth-hint">Hoàn tất kết nối máy chủ ở bước trên để mở đăng nhập ChatGPT.</div>':account?.loginAvailable===false?'<div class="auth-hint">Máy chủ đang dùng OpenAI API key. Muốn chuyển sang đăng nhập ChatGPT, xóa OPENAI_API_KEY trong Environment của Render rồi deploy lại.</div>':
   '<div class="auth-privacy"><span>✓</span> Mật khẩu chỉ nhập trên trang chính thức của OpenAI.</div>'+
   (pending?'<div class="device-code-panel"><span class="device-code-label">MÃ XÁC NHẬN MỘT LẦN</span><div class="device-code-row"><strong>'+escape(flow.userCode||'Đang tạo mã…')+'</strong>'+(flow.userCode?'<button type="button" class="icon-button" id="copyDeviceCode" aria-label="Sao chép mã xác nhận" title="Sao chép mã">⧉</button>':'')+'</div>'+(flow.verificationUrl?'<a class="openai-login-link" href="https://auth.openai.com/codex/device" target="_blank" rel="noopener noreferrer">Mở trang OpenAI để đăng nhập <span>↗</span></a>':'')+'<ol><li>Mở trang OpenAI bằng nút phía trên.</li><li>Đăng nhập tài khoản và nhập đúng mã này.</li><li>Quay lại GiáSát, kết quả được cập nhật tự động.</li></ol><div class="device-waiting"><span class="spinner"></span><span>Đang chờ bạn xác nhận'+(flow.expiresAt?' · Mã hết hạn lúc '+new Date(flow.expiresAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'')+'</span></div><button type="button" class="quiet" id="cancelDeviceLogin">Hủy đăng nhập</button></div>':
    ready?'<div class="auth-success"><span>✓</span><div><b>Đã sẵn sàng dùng phiên trên máy chủ</b><p>Bạn có thể đóng hộp này và bắt đầu nghiên cứu.</p></div></div><div class="auth-buttons"><button type="button" id="startDeviceLogin" class="soft">Đổi tài khoản</button>'+(account.managed?'<button type="button" id="logoutChatGPT" class="quiet">Đăng xuất khỏi GiáSát</button>':'')+'<button type="button" id="authDoneBtn" class="primary">Xong</button></div>':
    '<button type="button" id="startDeviceLogin" class="primary full auth-login-button" '+(starting?'disabled':'')+'>'+ (starting?'<span class="spinner"></span> Đang tạo mã…':'Đăng nhập bằng tài khoản ChatGPT <span>↗</span>')+'</button>')+
   '<p class="auth-account-note">Tài khoản này phục vụ máy chủ GiáSát. Chỉ chia sẻ mã truy cập GiáSát với người bạn cho phép dùng hạn mức của mình.</p>')+
  (error?'<div class="auth-error" role="alert">'+escape(error)+'</div>':'')+
  (connected&&account?.loginAvailable!==false?'<details class="auth-help"><summary>Nếu không đăng nhập được</summary><p>Trong ChatGPT, kiểm tra Settings → Security → Device code login. Tài khoản workspace có thể cần quản trị viên cho phép.</p><p>Chỉ xác nhận mã bạn vừa tạo tại máy chủ GiáSát của mình. Không gửi mã xác nhận cho người khác.</p>'+(account?.cloud?'<p>Render Free có thể xóa phiên khi ngủ, restart hoặc deploy. Khi đó đăng nhập lại ở đây. Báo cáo trong trình duyệt vẫn được giữ.</p>':'')+'</details>':'');
  section.querySelector('#startDeviceLogin')?.addEventListener('click',start);
  section.querySelector('#cancelDeviceLogin')?.addEventListener('click',cancel);
  section.querySelector('#authDoneBtn')?.addEventListener('click',()=>document.querySelector('#connectionDialog').close());
  section.querySelector('#logoutChatGPT')?.addEventListener('click',logout);
  section.querySelector('#copyDeviceCode')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(flow.userCode);toast('Đã sao chép mã. Chỉ nhập mã trên trang OpenAI.')}catch{toast('Hãy chọn và sao chép mã hiển thị.')}});
 }
 async function refresh(){
  if(!isConnected()){account=null;error='';render();return}
  try{account=await api('/api/auth/status');error='';if(account.login){flow=account.login;activeId=flow.id;if(['starting','pending'].includes(flow.status)){remember(activeId);pollBackend=getBackend();poll()}}else{flow=null;activeId=null;remember(null)}render()}catch(e){error=e.message;render()}
 }
 async function start(){if(starting)return;const replacing=account?.ready;if(replacing&&!await confirmAction('Đổi tài khoản tìm kiếm?','Tài khoản được dùng chung cho máy chủ này. Phiên hiện tại được giữ cho đến khi đăng nhập mới thành công.'))return;starting=true;error='';flow=null;render();try{flow=await api('/api/auth/device',{method:'POST',body:{},timeout:40000});activeId=flow.id;pollBackend=getBackend();if(['starting','pending'].includes(flow.status)){remember(activeId);render();poll()}else await finish(flow)}catch(e){error=e.message;render()}finally{starting=false;render()}}
 async function finish(result){flow=result;activeId=null;remember(null);if(result.status==='succeeded'){error='';await onAuthenticated();account=await api('/api/auth/status');flow=null;toast('Đã đăng nhập ChatGPT trên máy chủ GiáSát.')}else if(result.status==='error'){error=result.error||'Đăng nhập chưa hoàn tất.';flow=null}else{error='';flow=null}render()}
 async function poll(){if(polling)return;polling=true;let failures=0;try{while(activeId&&pollBackend===getBackend()){
   let state;try{state=await api('/api/auth/device/'+activeId);failures=0}catch(e){if(++failures>=3){error=e.message;render();break}await pause(2000);continue}
   if(state.id!==activeId)break;flow=state;if(!['starting','pending'].includes(state.status)){await finish(state);break}render();await pause(2000)
  }}finally{polling=false}}
 async function cancel(){const current=activeId;activeId=null;if(current){try{await api('/api/auth/device/'+current,{method:'DELETE'})}catch(e){error=e.message}}remember(null);flow=null;starting=false;render()}
 async function logout(){if(!await confirmAction('Đăng xuất ChatGPT khỏi GiáSát?','Xóa phiên do GiáSát lưu trên máy chủ. Không đăng xuất tài khoản trên trang ChatGPT hoặc xóa phiên Codex gốc.'))return;try{await api('/api/auth/logout',{method:'POST',body:{}});activeId=null;flow=null;remember(null);await onAuthenticated();await refresh();toast('Đã xóa phiên ChatGPT do GiáSát lưu.')}catch(e){error=e.message;render()}}
 render();return {refresh};
}
