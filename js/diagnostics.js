import {readJSON,esc,downloadFile} from './utils.js?v=1.1.0';
import {LayerManager} from './layers.js?v=1.1.0';
const $=s=>document.querySelector(s);let sites=[],busy=false,currentController=null;
const report={build:'1.1.0',started:null,device:{},services:[]};
async function init(){
 let floor=false;try{floor=!!(navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'));}catch{}
 report.device={secureContext:isSecureContext,cameraAPI:!!navigator.mediaDevices?.getUserMedia,webXRFloorAPI:floor,webGL:!!document.createElement('canvas').getContext('webgl')};
 $('#device').textContent=Object.entries(report.device).map(([k,v])=>`${k}: ${v?'available':'not available'}`).join('\n')+'\nCamera positioning is manual unless device-tracked floor AR is selected.';
 sites=await readJSON('data/ecosystems.json');$('#results').innerHTML=sites.map(e=>`<article class="diagnostic-row" id="test-${e.id}"><div><h2>${esc(e.name)}</h2><p>${esc(e.layer.provider)} · ${esc(e.layer.method)}</p><p class="diagnostic-info">${esc(e.layer.edition)}</p></div><span class="diagnostic-status">NOT TESTED</span></article>`).join('');
}
$('#run').onclick=async()=>{
 if(busy||!sites.length)return;busy=true;report.started=new Date().toISOString();report.services=[];$('#run').disabled=true;$('#cancel').disabled=false;$('#save').disabled=true;
 const map={on(){},requestDraw(){}},manager=new LayerManager(map,sites,()=>{});
 for(const e of sites){if(!busy)break;const row=$('#test-'+e.id),status=row.querySelector('.diagnostic-status'),info=row.querySelector('.diagnostic-info');status.textContent='REQUESTING';row.dataset.status='loading';
  const z=5,n=2**z,lat=e.lat*Math.PI/180,x=Math.floor((e.lng+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(lat))/Math.PI)/2*n),t={id:e.id,e,z,n,x,y,date:'2024-11-30',controller:new AbortController()};currentController=t.controller;const start=performance.now();
  try{await manager.fetchTile(t);const ms=Math.round(performance.now()-start);status.textContent=t.partial?'PARTIAL FEATURES':'RECEIVED';row.dataset.status='ready';info.textContent=`${ms} ms · ${t.sourceLabel}${t.empty?' · empty tile response':''}`;report.services.push({id:e.id,status:'received',milliseconds:ms,source:t.sourceURL,url:t.requestURL,alternate:!!t.sourceIndex,empty:!!t.empty,partial:!!t.partial});}
  catch(err){status.textContent=busy?'UNAVAILABLE':'CANCELLED';row.dataset.status='unavailable';info.textContent=err.message;report.services.push({id:e.id,status:busy?'unavailable':'cancelled',error:err.message,url:t.requestURL});}
 }
 currentController=null;busy=false;$('#run').disabled=false;$('#cancel').disabled=true;$('#save').disabled=!report.services.length;
};
$('#cancel').onclick=()=>{busy=false;currentController?.abort();};
$('#save').onclick=()=>downloadFile('carbon-atlas-service-diagnostics.json',JSON.stringify(report,null,2));
window.addEventListener('pagehide',()=>{busy=false;currentController?.abort();});
init().catch(e=>{$('#device').textContent='Startup failed: '+e.message;});
