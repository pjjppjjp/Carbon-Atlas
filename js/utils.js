export const $=s=>document.querySelector(s);
export const $$=s=>[...document.querySelectorAll(s)];
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export async function readJSON(path){if(window.ATLAS_EMBEDDED?.json?.[path])return window.ATLAS_EMBEDDED.json[path];const r=await fetch(path+(path.includes('?')?'&':'?')+'v=1.1.0');if(!r.ok)throw Error(`Asset ${path}: ${r.status}`);return r.json();}
export async function readBuffer(path){const b=window.ATLAS_EMBEDDED?.binary?.[path];if(b){const text=atob(b);return Uint8Array.from(text,c=>c.charCodeAt(0)).buffer;}const r=await fetch(path+(path.includes('?')?'&':'?')+'v=1.1.0');if(!r.ok)throw Error(`Asset ${path}: ${r.status}`);return r.arrayBuffer();}
export function downloadFile(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}
/** One timeout and one cancel path, including caller cancellation. */
export async function netFetch(url,options={}){
 const {signal,timeout=14000,responseType,...rest}=options,controller=new AbortController();
 const abort=()=>controller.abort();if(signal?.aborted)throw new DOMException('Cancelled','AbortError');signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,timeout);
 try{const r=await fetch(url,{...rest,signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);if(responseType==='arrayBuffer')return await r.arrayBuffer();if(responseType==='json')return await r.json();return r;}
 catch(e){if(e.name==='AbortError'&&!signal?.aborted)throw Error('Data request timed out');throw e;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function loadImage(url,{cors=false,timeout=16000,signal}={}){return new Promise((resolve,reject)=>{
 const im=new Image();let settled=false,timer;
 const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);im.onload=im.onerror=null;if(error){im.src='';reject(error);}else resolve(im);};
 const cancel=()=>finish(new DOMException('Image cancelled','AbortError'));
 if(signal?.aborted){cancel();return;}signal?.addEventListener('abort',cancel,{once:true});
 if(cors)im.crossOrigin='anonymous';timer=setTimeout(()=>finish(Error('Image request timed out')),timeout);
 im.onload=()=>finish();im.onerror=()=>finish(Error('Image service unavailable'));im.src=url;
});}
export function scenario(year,loss=1.5,gain=.5,start=2030,base=2026){
 year=clamp(Number(year)||base,base,2100);loss=clamp(Number(loss)||0,0,20);gain=clamp(Number(gain)||0,0,10);start=clamp(Number(start)||2030,base,2100);
 const elapsed=year-base,pre=Math.min(elapsed,start-base),post=Math.max(0,year-start);
 return {pressure:100*(1-loss/100)**elapsed,action:100*(1-loss/100)**pre*(1+gain/100)**post};
}
