import {spawn} from 'node:child_process';
const base='http://localhost:4318';
let running=false;try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1500)}),data=await r.json();running=data.name==='GiáSát Research Engine'}catch{}
if(running){console.log('GiáSát đang chạy. Mở giao diện hiện có.');if(process.platform==='win32')spawn('rundll32',['url.dll,FileProtocolHandler',base],{stdio:'ignore',windowsHide:true}).unref();console.log('Mở hộp Kết nối trên giao diện để lấy địa chỉ Wi-Fi và mã ghép nối.')}else{const child=spawn(process.execPath,['server/index.mjs','--lan','--open'],{stdio:'inherit',windowsHide:true});child.on('exit',code=>process.exitCode=code||0)}
