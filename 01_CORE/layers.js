import {clamp,loadImage,netFetch,debounce} from './utils.js?v=1.1.0';
import {CIRCUMFERENCE} from './map.js?v=1.1.0';
// Minimal, bounded Mapbox Vector Tile decoder; geometry is from the provider, not fabricated.
class PBFReader {
 constructor(bytes){this.b=bytes;this.i=0;this.end=bytes.length;}
 varint(){let n=0,shift=0;while(this.i<this.end&&shift<56){const v=this.b[this.i++];n+=(v&127)*2**shift;if(!(v&128))return n;shift+=7;}throw Error('Invalid PBF varint');}
 bytes(){const n=this.varint(),end=this.i+n;if(end>this.end)throw Error('Truncated PBF');const b=this.b.subarray(this.i,end);this.i=end;return b;}
 skip(w){if(w===0)this.varint();else if(w===1)this.i+=8;else if(w===2){const n=this.varint();this.i+=n;}else if(w===5)this.i+=4;else throw Error('Unsupported PBF wire type');if(this.i>this.end)throw Error('Truncated PBF field');}
}
export function decodeMVT(buffer){if(buffer.byteLength>16*1024*1024)throw Error('Vector tile too large');const p=new PBFReader(new Uint8Array(buffer)),layers=[];while(p.i<p.end){const t=p.varint();if((t>>3)===3&&(t&7)===2)layers.push(parseLayer(p.bytes()));else p.skip(t&7);}return layers;}
function parseLayer(bytes){const p=new PBFReader(bytes),features=[];let extent=4096,name='';while(p.i<p.end){const t=p.varint(),f=t>>3,w=t&7;if(f===1&&w===2)name=new TextDecoder().decode(p.bytes());else if(f===2&&w===2)features.push(parseFeature(p.bytes()));else if(f===5&&w===0)extent=p.varint();else p.skip(w);}if(!(extent>0&&extent<1e7))throw Error('Invalid tile extent');return{name,extent,features};}
function parseFeature(bytes){const p=new PBFReader(bytes);let type=0,g=[];while(p.i<p.end){const t=p.varint(),f=t>>3,w=t&7;if(f===3&&w===0)type=p.varint();else if(f===4&&w===2){const q=new PBFReader(p.bytes());while(q.i<q.end)g.push(q.varint());}else p.skip(w);}let x=0,y=0,i=0,path=[],paths=[];const unzig=n=>n%2?-(n+1)/2:n/2;while(i<g.length){const cmd=g[i++],id=cmd&7,count=Math.floor(cmd/8);if(count>1e6)throw Error('Invalid tile command');if(id===1||id===2){for(let k=0;k<count;k++){if(i+1>=g.length)throw Error('Truncated geometry');x+=unzig(g[i++]);y+=unzig(g[i++]);if(id===1&&path.length){paths.push(path);path=[];}path.push([x,y]);}}else if(id===7){if(path.length)path.push([...path[0]]);}else throw Error('Invalid geometry command');}if(path.length)paths.push(path);return{type,paths};}
/** Source-backed GIS client. No invented geometry, proxy server, key or build step.
 * Only visible requests are scheduled; old requests are cancelled on pan/toggle.
 * Alternate publications are identified in status, never called the same edition.
 */
export function tileBounds(t){return [(t.x/t.n-.5)*CIRCUMFERENCE,(.5-(t.y+1)/t.n)*CIRCUMFERENCE,((t.x+1)/t.n-.5)*CIRCUMFERENCE,(.5-t.y/t.n)*CIRCUMFERENCE];}
export function requestURL(t,l=t.e.layer){
 if(l.type==='mvt')return `${l.url}/tile/${t.z}/${t.y}/${t.x}.pbf`;
 const bbox=tileBounds(t).join(',');
 if(l.type==='arcgis')return l.url+'/export?'+new URLSearchParams({bbox,bboxSR:'3857',imageSR:'3857',size:'512,512',dpi:'96',format:'png32',transparent:'true',layers:'show:'+l.layers,f:'image'});
 const version=l.version||'1.3.0';const p=new URLSearchParams({service:'WMS',version,request:'GetMap',layers:l.wmsLayer,styles:'',format:'image/png',transparent:'TRUE',bbox,width:'512',height:'512'});
 p.set(version==='1.3.0'?'crs':'srs','EPSG:3857');if(l.type==='wms')p.set('time',t.date);else if(l.time)p.set('time',l.time);
 return l.url+(l.url.includes('?')?'&':'?')+p;
}
export function maskTreeCover(data,color){
 const rgb=color.replace('#','').match(/../g).map(v=>parseInt(v,16));
 for(let i=0;i<data.length;i+=4){
  // ESA class 10 is #006400. Tight tolerance accepts display antialiasing,
  // not the other green classes. This is visualisation, not area measurement.
  const tree=data[i+3]>0&&data[i]<=22&&Math.abs(data[i+1]-100)<=22&&data[i+2]<=22;
  data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=tree?235:0;
 }return data;
}
export class LayerManager{
 constructor(map,sites,onStatus){
  this.map=map;this.sites=sites;this.onStatus=onStatus;this.active=new Set();this.opacity=.75;this.date='2024-11-30';this.cache=new Map();this.queue=[];this.inflight=0;this.visible=[];this.version=0;this.preferred=new Map();this.sourceFailures=new Map();this.retryTimer=null;
  this.updateLater=debounce(()=>this.update(),200);map.on('moveend',()=>this.updateLater());map.on('resize',()=>this.updateLater());map.painter=c=>this.paint(c);
 }
 toggle(id,on){if(!this.sites.some(e=>e.id===id))return;if(on)this.active.add(id);else this.active.delete(id);this.update();}
 clear(){this.active.clear();this.update();}
 setDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))return;this.date=date;this.update();}
 retry(id){for(const[k,v]of this.cache)if(id?v.id===id:this.active.has(v.id)){v.controller?.abort();this.cache.delete(k);}if(id){this.preferred.delete(id);for(const k of this.sourceFailures.keys())if(k.startsWith(id+'/'))this.sourceFailures.delete(k);}else{this.preferred.clear();this.sourceFailures.clear();}this.update();}
 update(){
  const map=this.map;if(!map.width)return;this.version++;const visible=[],b=map.bounds();
  for(const id of this.active){const e=this.sites.find(e=>e.id===id),z=Math.min(e.layer.maxZoom||14,Math.max(0,Math.floor(map.zoom-1))),n=2**z;
   const minX=Math.floor(b[0]*n),maxX=Math.min(minX+32,Math.floor(b[2]*n)),minY=Math.max(0,Math.floor(b[1]*n)),maxY=Math.min(n-1,Math.floor(b[3]*n));
   for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
    const xx=((x%n)+n)%n,key=`${id}/${z}/${xx}/${y}/${id==='plankton'?this.date:'static'}`;let t=this.cache.get(key);
    if(!t){t={key,id,z,x:xx,y,n,status:'queued',e,date:this.date,attempts:0};this.cache.set(key,t);}
    const centerX=(b[0]+b[2])*n/2,centerY=(b[1]+b[3])*n/2;t.priority=Math.hypot(x+.5-centerX,y+.5-centerY);
    visible.push({item:t,displayX:x});
   }
  }
  this.visible=visible;const needed=new Set(visible.map(v=>v.item.key));
  for(const t of this.cache.values())if(t.status==='loading'&&!needed.has(t.key))t.controller?.abort();
  this.queue=[...new Set(visible.map(v=>v.item))].filter(t=>t.status==='queued').sort((a,b)=>a.priority-b.priority);
  this.pump();this.map.requestDraw();this.report();this.trim();
 }
 trim(){if(this.cache.size<=260)return;const keep=new Set(this.visible.map(v=>v.item.key));for(const[k,t]of this.cache){if(!keep.has(k)&&t.status!=='loading')this.cache.delete(k);if(this.cache.size<=180)break;}}
 pump(){
  while(this.inflight<5&&this.queue.length){const t=this.queue.shift();if(t.status!=='queued'||!this.active.has(t.id))continue;t.status='loading';t.controller=new AbortController();this.inflight++;
   this.fetchTile(t).then(()=>{t.status='ready';t.error=null;t.loadedAt=Date.now();}).catch(err=>{if(err.name==='AbortError'){t.status='queued';}else{t.status='error';t.error=String(err.message||err);t.attempts++;}}).finally(()=>{this.inflight--;t.controller=null;
    // A rapid pan may cancel and then re-request the exact same tile.
    if(t.status==='queued'&&this.visible.some(v=>v.item===t)&&this.active.has(t.id)&&!this.queue.includes(t))this.queue.push(t);
    this.map.requestDraw();this.report();this.pump();
   });
  }
 }
 async fetchTile(t){
  const primary=t.e.layer,sources=[primary,...(primary.alternatives||[])];const preferred=this.preferred.get(t.id)||0;
  const indices=sources.map((_,i)=>i).sort((a,b)=>Number(b===preferred)-Number(a===preferred));let last;
  for(const i of indices){const source=sources[i],failureKey=t.id+'/'+i,until=this.sourceFailures.get(failureKey)||0;
   if(until>Date.now()&&sources.length>1&&indices.some(j=>j!==i&&(this.sourceFailures.get(t.id+'/'+j)||0)<=Date.now()))continue;
   if(t.controller?.signal.aborted)throw new DOMException('Request cancelled','AbortError');
   try{await this.loadSource(t,source);t.sourceIndex=i;t.sourceLabel=i?source.label:'Primary publication';t.sourceURL=source.url;this.preferred.set(t.id,i);this.sourceFailures.delete(failureKey);return;}
   catch(err){if(t.controller?.signal.aborted)throw new DOMException('Request cancelled','AbortError');last=err;
    // Missing sparse MVT tile is not evidence of an outage or habitat absence.
    if(!String(err.message).includes('HTTP 404'))this.sourceFailures.set(failureKey,Date.now()+20000);
   }
  }
  throw last||Error('Dataset service unavailable.');
 }
 async loadSource(t,l){
  const signal=t.controller?.signal;delete t.features;delete t.image;t.partial=false;
  if(l.type==='mvt'){
   t.requestURL=requestURL(t,l);const buffer=await netFetch(t.requestURL,{signal,timeout:10500,responseType:'arrayBuffer'});t.features=decodeMVT(buffer);t.empty=!t.features.some(v=>v.features.length);return;
  }
  if(l.type==='features'){await this.loadFeatures(t,l,signal);return;}
  const url=requestURL(t,l);t.requestURL=url;
  const im=await loadImage(url,{cors:l.type==='worldcover',signal,timeout:12500});
  if(l.type==='wms'){t.image=im;return;}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d',{willReadFrequently:l.type==='worldcover'});c.drawImage(im,0,0,512,512);
  if(l.type==='worldcover'){
   let data;try{data=c.getImageData(0,0,512,512);}catch{throw Error('Tree classification requires the provider’s cross-origin image access.');}
   maskTreeCover(data.data,t.e.color);t.empty=!data.data.some((v,i)=>i%4===3&&v);c.putImageData(data,0,0);
  }else{
   c.globalCompositeOperation='source-in';c.fillStyle=t.e.color;c.fillRect(0,0,512,512);
   if(t.id==='kelp'){c.globalCompositeOperation='source-atop';c.strokeStyle='#ffffff66';c.lineWidth=1;for(let k=-512;k<1024;k+=11){c.beginPath();c.moveTo(k,0);c.lineTo(k+512,512);c.stroke();}}
  }
  t.image=canvas;
 }
 async loadFeatures(t,l,signal){
  const [xmin,ymin,xmax,ymax]=tileBounds(t),width=xmax-xmin;const features=[];let offset=0,more=false;
  do{
   const p=new URLSearchParams({f:'json',where:'1=1',geometry:JSON.stringify({xmin,ymin,xmax,ymax,spatialReference:{wkid:3857}}),geometryType:'esriGeometryEnvelope',spatialRel:'esriSpatialRelIntersects',inSR:'3857',outSR:'3857',returnGeometry:'true',outFields:'*',maxAllowableOffset:String(width/2048),geometryPrecision:'1',resultOffset:String(offset),resultRecordCount:'1000'});
   t.requestURL=l.url+'/'+l.layers+'/query?'+p;const data=await netFetch(t.requestURL,{signal,timeout:12000,responseType:'json'});if(data.error)throw Error(data.error.message||'Feature service error');if(!Array.isArray(data.features))throw Error('Invalid feature response');
   for(const f of data.features){const g=f.geometry;if(!g)continue;const paths=g.rings||g.paths||(g.x!==undefined?[[[g.x,g.y]]]:g.points?[g.points]:[]);features.push({type:g.rings?3:g.paths?2:1,paths:paths.map(path=>path.map(p=>[(p[0]-xmin)/width*4096,(ymax-p[1])/width*4096]))});}
   more=!!data.exceededTransferLimit;offset+=data.features.length;if(more&&!data.features.length)throw Error('Feature service returned an incomplete page');
  }while(more&&offset<10000);
  t.partial=more;t.features=[{extent:4096,name:l.label,features}];t.empty=!features.length;
 }
 paint(c){
  const map=this.map;for(const{item:t,displayX}of this.visible){if(t.status!=='ready'||!this.active.has(t.id))continue;const n=t.n,s=map.scale/n,p=map.normalPoint([displayX/n,t.y/n],false);
   c.save();c.globalAlpha=this.opacity;c.beginPath();c.rect(p[0],p[1],s+.4,s+.4);c.clip();
   if(t.id==='forest'){const a=map.point([0,23.44])[1],b=map.point([0,-23.44])[1];c.beginPath();c.rect(0,a,map.width,b-a);c.clip();}
   if(t.image)c.drawImage(t.image,p[0],p[1],s+.4,s+.4);
   if(t.features){c.fillStyle=t.e.color;c.strokeStyle=t.e.color;c.lineWidth=1.15;for(const layer of t.features){const f=s/layer.extent;for(const feature of layer.features){
    if(feature.type===1){for(const path of feature.paths)for(const q of path){c.beginPath();c.arc(p[0]+q[0]*f,p[1]+q[1]*f,2.4,0,Math.PI*2);c.fill();}}
    else{c.beginPath();for(const path of feature.paths){for(let i=0;i<path.length;i++){const q=[p[0]+path[i][0]*f,p[1]+path[i][1]*f];i?c.lineTo(...q):c.moveTo(...q);}if(feature.type===3)c.closePath();}if(feature.type===3){c.globalAlpha=this.opacity*.65;c.fill('evenodd');c.globalAlpha=this.opacity;}c.setLineDash(t.id==='kelp'?[4,2]:[]);c.stroke();}
   }}}
   c.restore();
  }
 }
 report(){
  const groups=[...this.active].map(id=>{const items=[...new Set(this.visible.filter(v=>v.item.id===id).map(v=>v.item))],ready=items.filter(t=>t.status==='ready').length,errors=items.filter(t=>t.status==='error').length,pending=items.length-ready-errors;return{id,ready,errors,pending,total:items.length,partial:items.some(t=>t.partial),alternate:items.some(t=>t.status==='ready'&&t.sourceIndex>0),sourceLabels:[...new Set(items.filter(t=>t.status==='ready').map(t=>t.sourceLabel))],error:items.find(t=>t.error)?.error||'',status:pending?'loading':errors?(ready?'partial':'unavailable'):'ready'};});
  const ready=groups.reduce((a,g)=>a+g.ready,0),errors=groups.reduce((a,g)=>a+g.errors,0),pending=groups.reduce((a,g)=>a+g.pending,0);const tiles=ready+errors+pending;
  let text=pending?`Loading published data · ${ready}/${tiles} tiles`:errors?`${ready} tiles received · ${errors} unavailable`:`${groups.length} dataset${groups.length===1?'':'s'} · ${ready} tiles received`;
  if(!ready&&!pending&&errors)text='Data service unavailable · retry or inspect source';
  this.onStatus({visible:!!groups.length,groups,text,detail:'EPSG:3857 display · WGS 84 coordinates'+(this.active.has('plankton')?' · '+this.date:''),errors,ready,pending,tiles});
 }
}

export function validateGeoJSON(data){let count=0;const walk=g=>{if(!g||typeof g!=='object')throw Error('Expected a GeoJSON object.');if(g.type==='FeatureCollection'){if(!Array.isArray(g.features)||g.features.length>10000)throw Error('Use 10,000 features or fewer.');g.features.forEach(walk);}else if(g.type==='Feature'){count++;if(g.geometry!==null)walk(g.geometry);}else if(g.type==='GeometryCollection'){if(!Array.isArray(g.geometries))throw Error('Invalid geometry collection.');g.geometries.forEach(walk);}else if(['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon'].includes(g.type)){const check=(a,depth=0)=>{if(!Array.isArray(a)||depth>6)throw Error('Invalid coordinates.');if(typeof a[0]==='number'){if(a.length<2||!a.every(Number.isFinite)||Math.abs(a[0])>180||Math.abs(a[1])>90)throw Error('Coordinates must be WGS 84 longitude/latitude.');if(++count>500000)throw Error('Use a simplified GeoJSON under 500,000 coordinate pairs.');}else a.forEach(b=>check(b,depth+1));};check(g.coordinates);}else throw Error('Unsupported GeoJSON geometry.');};walk(data);return data;}
