export const $=s=>document.querySelector(s);
export const $$=s=>[...document.querySelectorAll(s)];
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export async function readJSON(path){if(window.ATLAS_EMBEDDED?.json?.[path])return window.ATLAS_EMBEDDED.json[path];const r=await fetch(path);if(!r.ok)throw Error(`Asset ${path}: ${r.status}`);return r.json();}
export async function readBuffer(path){const b=window.ATLAS_EMBEDDED?.binary?.[path];if(b){const text=atob(b);return Uint8Array.from(text,c=>c.charCodeAt(0)).buffer;}const r=await fetch(path);if(!r.ok)throw Error(`Asset ${path}: ${r.status}`);return r.arrayBuffer();}
export function downloadFile(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}
export async function netFetch(url,options={}){
 const controller=new AbortController();const t=setTimeout(()=>controller.abort(),14000);
 try{const r=await fetch(url,{...options,signal:options.signal||controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);return r;}finally{clearTimeout(t);}
}
export function loadImage(url,{cors=false,timeout=16000}={}){return new Promise((resolve,reject)=>{const im=new Image();if(cors)im.crossOrigin='anonymous';const t=setTimeout(()=>{im.src='';reject(Error('Image request timed out'));},timeout);im.onload=()=>{clearTimeout(t);resolve(im);};im.onerror=()=>{clearTimeout(t);reject(Error('Image service unavailable'));};im.src=url;});}
export function scenario(year,loss=1.5,gain=.5,start=2030,base=2026){
 year=clamp(Number(year)||base,base,2100);loss=clamp(Number(loss)||0,0,20);gain=clamp(Number(gain)||0,0,10);start=clamp(Number(start)||2030,base,2100);
 const elapsed=year-base,pre=Math.min(elapsed,start-base),post=Math.max(0,year-start);
 return {pressure:100*(1-loss/100)**elapsed,action:100*(1-loss/100)**pre*(1+gain/100)**post};
}
