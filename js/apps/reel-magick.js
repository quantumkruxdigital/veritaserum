// Reel-Magick: CuriOS non-linear video editor. Projects use .rmgk.
import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';
import {registerContext} from '../shell/context.js';
import {isVideo,isAudio} from './media.js';

const PROJECT_EXT='.rmgk';
const IMAGE=/\.(png|jpe?g|webp|gif|bmp|avif)$/i;
const mediaOk=p=>isVideo(p)||isAudio(p)||IMAGE.test(p);
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36);
const basename=p=>p.split('/').pop();
const changed=paths=>dispatchEvent(new CustomEvent('curios:vfs-changed',{detail:{paths}}));
let api=null;

async function scan(dir='/',out=[]){
 for(const e of await V.ls(dir,true).catch(()=>[])){
  const p=(dir==='/'?'':dir)+'/'+e.name;
  if(e.type==='d'){if(!p.startsWith('/.curios'))await scan(p,out)}else if(mediaOk(p))out.push(p);
 }
 return out;
}
async function blobURL(path){const b=V.blob?await V.blob(path):new Blob([await V.read(path)]);return URL.createObjectURL(b)}
async function durationOf(path){if(IMAGE.test(path))return 5;const u=await blobURL(path);try{return await new Promise(ok=>{const e=document.createElement(isAudio(path)?'audio':'video');e.preload='metadata';e.onloadedmetadata=()=>ok(isFinite(e.duration)?e.duration:5);e.onerror=()=>ok(5);e.src=u})}finally{setTimeout(()=>URL.revokeObjectURL(u),1000)}}
const fresh=()=>({version:1,name:'Untitled Reel',width:1280,height:720,fps:30,tracks:[{id:uid(),type:'video',name:'Video 1',clips:[]},{id:uid(),type:'audio',name:'Audio 1',clips:[]}],created:new Date().toISOString()});
const clipEnd=c=>c.start+(c.out-c.in)/(c.speed||1);
const projectDuration=p=>Math.max(1,...p.tracks.flatMap(t=>t.clips.map(clipEnd)));
const activeAt=(p,time,type='video')=>p.tracks.filter(t=>t.type===type).flatMap(t=>t.clips).filter(c=>time>=c.start&&time<clipEnd(c)).sort((a,b)=>b.start-a.start)[0];

export function reelMagick(openPath){
 if(api){if(openPath)api.open(openPath);return win('reelmagick','Reel-Magick',1120,700,()=>{})}
 return win('reelmagick','Reel-Magick',1120,700,b=>{
  b.classList.add('reel-magick');
  let project=fresh(),projectPath='',media=[],selected='',playhead=0,playing=false,last=0,raf=0,previewUrl='',mediaUrls=new Map(),dragClip=null;
  const mediaPane=h('aside',{className:'rmgk-media'}),preview=h('div',{className:'rmgk-preview'}),video=h('video',{playsInline:true,muted:false}),image=h('img'),empty=h('div',{className:'rmgk-preview-empty',textContent:'REEL-MAGICK'}),time=h('span',{className:'rmgk-time',textContent:'00:00.00'}),timeline=h('div',{className:'rmgk-timeline'}),status=h('div',{className:'rmgk-status',textContent:'Ready'});
  preview.append(video,image,empty);
  const btn=(label,fn,title=label)=>h('button',{className:'btn mini',textContent:label,title,onclick:fn});
  const toolbar=h('div',{className:'rmgk-toolbar'},btn('↶',undo,'Undo'),btn('✂ Split',splitSelected),btn('⧉ Duplicate',duplicateSelected),btn('⌫ Delete',deleteSelected),btn('＋ Video Track',()=>addTrack('video')),btn('＋ Audio Track',()=>addTrack('audio')),h('span',{className:'rmgk-grow'}),btn('−',()=>zoom(-.15),'Zoom out'),btn('+',()=>zoom(.15),'Zoom in'));
  const transport=h('div',{className:'rmgk-transport'},btn('⏮',()=>seek(0),'Beginning'),btn('▶',togglePlay,'Play / Pause'),time,h('span',{className:'rmgk-grow'}),btn('Save .rmgk',saveProject),btn('Save As',()=>saveProject(true)),btn('Export MP4',exportMP4));
  const top=h('div',{className:'rmgk-top'},mediaPane,h('main',{className:'rmgk-monitor'},preview,transport,toolbar));
  b.append(top,timeline,status);
  let scale=80,history=[];
  const snapshot=()=>{history.push(JSON.stringify(project));if(history.length>40)history.shift()};
  function undo(){if(!history.length)return;project=JSON.parse(history.pop());selected='';renderTimeline();renderPreview()}
  const allClips=()=>project.tracks.flatMap(t=>t.clips);
  const selectedClip=()=>allClips().find(c=>c.id===selected);
  const findTrack=id=>project.tracks.find(t=>t.id===id);
  function setStatus(s){status.textContent=s}
  function fmt(s){s=Math.max(0,s||0);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')+'.'+String(Math.floor(s%1*100)).padStart(2,'0')}
  function zoom(d){scale=Math.max(28,Math.min(220,scale*(1+d)));renderTimeline()}
  function addTrack(type){snapshot();project.tracks.push({id:uid(),type,name:(type==='video'?'Video ':'Audio ')+(project.tracks.filter(t=>t.type===type).length+1),clips:[]});renderTimeline()}
  async function importMedia(path){if(!mediaOk(path))return;media.includes(path)||media.push(path);renderMedia();if(isVideo(path)||isAudio(path))setStatus('Imported '+basename(path))}
  async function refreshMedia(){media=(await scan()).sort();renderMedia()}
  function renderMedia(){mediaPane.replaceChildren(h('div',{className:'rmgk-pane-head'},h('b',{textContent:'Imported Media'}),btn('↻',refreshMedia,'Refresh')),...media.map(p=>h('div',{className:'rmgk-media-item',draggable:true,dataset:{mediaPath:p},ondragstart:e=>{e.dataTransfer.setData('application/x-rmgk-media',p)}},h('span',{textContent:isVideo(p)?'▣':isAudio(p)?'♫':'▧'}),h('span',{textContent:basename(p),title:p}))));if(!media.length)mediaPane.append(h('div',{className:'rmgk-hint',textContent:'Video, audio and images from CuriOS Files appear here. Drag them onto a track.'}))}
  async function addClip(path,trackId,start){const t=findTrack(trackId);if(!t||!mediaOk(path))return;snapshot();const dur=await durationOf(path),type=isAudio(path)?'audio':'video';if(t.type!==type){const match=project.tracks.find(x=>x.type===type);if(match)return addClip(path,match.id,start);return}const c={id:uid(),path,start:Math.max(0,start),in:0,out:dur,speed:1,volume:1,opacity:1,scale:1,rotation:0,x:0,y:0,effect:'none',transition:'none'};t.clips.push(c);selected=c.id;renderTimeline();seek(c.start)}
  function renderTimeline(){const dur=projectDuration(project),ruler=h('div',{className:'rmgk-ruler',style:{width:(dur*scale+160)+'px'}});for(let s=0;s<=dur+1;s+=Math.max(1,Math.round(80/scale))){ruler.append(h('span',{style:{left:(120+s*scale)+'px'},textContent:fmt(s).slice(0,5)}))}const rows=project.tracks.map(t=>{const lane=h('div',{className:'rmgk-lane',dataset:{trackId:t.id},ondragover:e=>e.preventDefault(),ondrop:e=>{e.preventDefault();const p=e.dataTransfer.getData('application/x-rmgk-media');if(p){const r=lane.getBoundingClientRect();addClip(p,t.id,Math.max(0,(e.clientX-r.left)/scale))}else if(dragClip){const c=selectedClip();if(c){snapshot();const old=project.tracks.find(x=>x.clips.some(q=>q.id===c.id));old.clips=old.clips.filter(q=>q.id!==c.id);t.clips.push(c);const r=lane.getBoundingClientRect();c.start=Math.max(0,(e.clientX-r.left)/scale);dragClip=null;renderTimeline()}}}});for(const c of t.clips){const el=h('div',{className:'rmgk-clip '+(selected===c.id?'sel':''),dataset:{clipId:c.id},draggable:true,style:{left:(c.start*scale)+'px',width:Math.max(26,(clipEnd(c)-c.start)*scale)+'px'},onclick:e=>{e.stopPropagation();selected=c.id;seek(Math.max(c.start,Math.min(playhead,clipEnd(c)-.01)));renderTimeline()},ondragstart:e=>{dragClip=c.id;e.dataTransfer.setData('text/plain',c.id)}},h('span',{textContent:basename(c.path)}),h('small',{textContent:c.effect!=='none'?c.effect:''}));lane.append(el)}return h('div',{className:'rmgk-track'},h('div',{className:'rmgk-track-head'},h('b',{textContent:t.name}),h('span',{textContent:t.type==='video'?'▣':'♫'})),lane)});const scroller=h('div',{className:'rmgk-scroll'},h('div',{className:'rmgk-timeline-inner'},ruler,...rows,h('div',{className:'rmgk-playhead',style:{left:(120+playhead*scale)+'px'}})));scroller.onclick=e=>{if(e.target.closest('.rmgk-clip'))return;const r=scroller.querySelector('.rmgk-lane')?.getBoundingClientRect();if(r)seek(Math.max(0,(e.clientX-r.left)/scale))};timeline.replaceChildren(scroller)}
  async function urlFor(path){if(mediaUrls.has(path))return mediaUrls.get(path);const u=await blobURL(path);mediaUrls.set(path,u);return u}
  async function renderPreview(){const c=activeAt(project,playhead,'video');time.textContent=fmt(playhead);if(!c){video.pause();video.style.display='none';image.style.display='none';empty.style.display='grid';return}empty.style.display='none';const u=await urlFor(c.path),local=c.in+(playhead-c.start)*(c.speed||1);const filter=c.effect==='bw'?'grayscale(1)':c.effect==='warm'?'sepia(.35) saturate(1.35)':c.effect==='cool'?'hue-rotate(170deg) saturate(1.15)':c.effect==='vivid'?'saturate(1.65) contrast(1.08)':c.effect==='soft'?'contrast(.9) brightness(1.08)':'none';const transform=`translate(${c.x||0}px,${c.y||0}px) scale(${c.scale||1}) rotate(${c.rotation||0}deg)`;if(IMAGE.test(c.path)){video.pause();video.style.display='none';image.style.display='block';if(image.src!==u)image.src=u;Object.assign(image.style,{filter,transform,opacity:String(c.opacity??1)})}else{image.style.display='none';video.style.display='block';if(video.src!==u){video.src=u;await new Promise(ok=>{video.onloadedmetadata=()=>ok();video.onerror=()=>ok()})}if(Math.abs(video.currentTime-local)>.18)try{video.currentTime=Math.max(0,local)}catch{}video.playbackRate=c.speed||1;video.volume=Math.max(0,Math.min(1,c.volume??1));Object.assign(video.style,{filter,transform,opacity:String(c.opacity??1)})}}
  function seek(t){playhead=Math.max(0,Math.min(projectDuration(project),t));renderPreview();renderTimeline()}
  function togglePlay(){playing=!playing;last=performance.now();if(playing){video.play().catch(()=>0);raf=requestAnimationFrame(frame)}else{cancelAnimationFrame(raf);video.pause()} }
  function frame(now){if(!playing)return;const dt=(now-last)/1000;last=now;playhead+=dt;if(playhead>=projectDuration(project)){playhead=0;playing=false;video.pause()}renderPreview();renderTimeline();if(playing)raf=requestAnimationFrame(frame)}
  function splitSelected(){const c=selectedClip();if(!c||playhead<=c.start+.03||playhead>=clipEnd(c)-.03)return;snapshot();const src=(playhead-c.start)*(c.speed||1),n={...c,id:uid(),start:playhead,in:c.in+src};c.out=c.in+src;findTrack(project.tracks.find(t=>t.clips.includes(c)).id).clips.push(n);selected=n.id;renderTimeline()}
  function duplicateSelected(){const c=selectedClip();if(!c)return;snapshot();const n={...c,id:uid(),start:clipEnd(c)+.05};project.tracks.find(t=>t.clips.includes(c)).clips.push(n);selected=n.id;renderTimeline()}
  function deleteSelected(){const c=selectedClip();if(!c)return;snapshot();for(const t of project.tracks)t.clips=t.clips.filter(x=>x.id!==c.id);selected='';renderTimeline();renderPreview()}
  function setClipProp(key,val){const c=selectedClip();if(!c)return;snapshot();c[key]=val;renderTimeline();renderPreview()}
  function clipMenu(c){selected=c.id;return [
   {label:'Split at Playhead',action:splitSelected},{label:'Duplicate Clip',action:duplicateSelected},{label:'Delete Clip',danger:true,action:deleteSelected},
   {separator:'Quick Effects'},
   {label:'Effects',children:[['None','none'],['Black & White','bw'],['Warm','warm'],['Cool','cool'],['Vivid','vivid'],['Soft','soft']].map(([label,v])=>({label:(c.effect===v?'✓ ':'')+label,action:()=>setClipProp('effect',v)}))},
   {label:'Transitions',children:[['None','none'],['Cross Dissolve','dissolve'],['Fade','fade'],['Slide','slide'],['Wipe','wipe']].map(([label,v])=>({label:(c.transition===v?'✓ ':'')+label,action:()=>setClipProp('transition',v)}))},
   {label:'Speed',children:[.25,.5,1,1.5,2].map(v=>({label:(c.speed===v?'✓ ':'')+v+'×',action:()=>setClipProp('speed',v)}))},
   {label:'Volume',children:[0,.25,.5,.75,1].map(v=>({label:Math.round(v*100)+'%',action:()=>setClipProp('volume',v)}))},
   {separator:'Transform'},
   {label:'Scale…',action:()=>{const v=Number(prompt('Scale (1 = 100%)',c.scale||1));if(v>0)setClipProp('scale',v)}},{label:'Rotate…',action:()=>{const v=Number(prompt('Rotation degrees',c.rotation||0));if(isFinite(v))setClipProp('rotation',v)}},{label:'Opacity…',action:()=>{const v=Number(prompt('Opacity 0–1',c.opacity??1));if(isFinite(v))setClipProp('opacity',Math.max(0,Math.min(1,v)))}}
  ]}
  registerContext('reelmagick',async ev=>{const ce=ev.target.closest('[data-clip-id]');if(ce){const c=allClips().find(x=>x.id===ce.dataset.clipId);return c?clipMenu(c):[]}const mp=ev.target.closest('[data-media-path]');if(mp)return [{label:'Add to Timeline',action:()=>addClip(mp.dataset.mediaPath,project.tracks.find(t=>t.type===(isAudio(mp.dataset.mediaPath)?'audio':'video')).id,playhead)}];if(ev.target.closest('.rmgk-lane'))return [{label:'Paste / Add Media at Playhead',disabled:true},{label:'Add Video Track',action:()=>addTrack('video')},{label:'Add Audio Track',action:()=>addTrack('audio')}];return []});
  async function saveProject(force=false){let p=projectPath;if(force||!p){const n=prompt('Project filename',project.name.replace(/[^a-z0-9 _-]/gi,'').trim()||'Untitled Reel');if(!n)return;p='/Documents/'+(n.toLowerCase().endsWith(PROJECT_EXT)?n:n+PROJECT_EXT)}project.name=basename(p).replace(/\.rmgk$/i,'');await V.write(p,JSON.stringify(project,null,2));projectPath=p;changed([p]);setStatus('Saved '+p)}
  async function loadProject(path){try{const j=JSON.parse(await V.read(path));if(!j?.tracks)throw new Error('Invalid Reel-Magick project');project=j;projectPath=path;selected='';playhead=0;for(const c of allClips())media.includes(c.path)||media.push(c.path);renderMedia();renderTimeline();renderPreview();setStatus('Opened '+path)}catch(e){alert('Reel-Magick: '+(e.message||e))}}
  async function exportMP4(){const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'].find(x=>MediaRecorder.isTypeSupported?.(x));if(!mime){alert('This browser cannot encode MP4 directly. Reel-Magick MP4 export requires browser MediaRecorder MP4 support on this device.');return}const name=prompt('Export filename',project.name+'.mp4');if(!name)return;setStatus('Rendering MP4…');const canvas=document.createElement('canvas');canvas.width=project.width||1280;canvas.height=project.height||720;const cx=canvas.getContext('2d'),stream=canvas.captureStream(project.fps||30),chunks=[],rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8_000_000});rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);const done=new Promise(ok=>rec.onstop=ok);rec.start(1000);const dur=projectDuration(project),v=document.createElement('video');v.muted=true;let lastPath='',lastU='';for(let t=0;t<dur;t+=1/(project.fps||30)){const c=activeAt(project,t,'video');cx.fillStyle='#000';cx.fillRect(0,0,canvas.width,canvas.height);if(c){const u=await urlFor(c.path);if(IMAGE.test(c.path)){const im=new Image();im.src=u;await im.decode().catch(()=>0);drawFit(cx,im,canvas,c)}else{if(lastPath!==c.path){v.src=u;lastPath=c.path;await new Promise(ok=>{v.onloadedmetadata=ok;v.onerror=ok})}try{v.currentTime=c.in+(t-c.start)*(c.speed||1);await new Promise(ok=>{const f=()=>ok();v.onseeked=f;setTimeout(f,45)});drawFit(cx,v,canvas,c)}catch{}}}await new Promise(ok=>setTimeout(ok,Math.max(1,1000/(project.fps||30)-2)))}rec.stop();await done;const out='/Videos/'+(name.toLowerCase().endsWith('.mp4')?name:name+'.mp4');await V.put(out,new Blob(chunks,{type:'video/mp4'}));changed([out]);setStatus('Exported '+out);alert('Reel-Magick exported '+out)}
  function drawFit(cx,src,canvas,c){const sw=src.videoWidth||src.naturalWidth||src.width,sh=src.videoHeight||src.naturalHeight||src.height;if(!sw||!sh)return;const s=Math.min(canvas.width/sw,canvas.height/sh)*(c.scale||1),w=sw*s,h=sh*s;cx.save();cx.globalAlpha=c.opacity??1;cx.translate(canvas.width/2+(c.x||0),canvas.height/2+(c.y||0));cx.rotate((c.rotation||0)*Math.PI/180);cx.filter=c.effect==='bw'?'grayscale(1)':c.effect==='warm'?'sepia(.35) saturate(1.35)':c.effect==='cool'?'hue-rotate(170deg) saturate(1.15)':c.effect==='vivid'?'saturate(1.65) contrast(1.08)':c.effect==='soft'?'contrast(.9) brightness(1.08)':'none';cx.drawImage(src,-w/2,-h/2,w,h);cx.restore()}
  api={open:async p=>{if(p?.toLowerCase().endsWith(PROJECT_EXT))return loadProject(p);if(mediaOk(p)){await importMedia(p);const t=project.tracks.find(x=>x.type===(isAudio(p)?'audio':'video'));return addClip(p,t.id,projectDuration(project)>1?projectDuration(project):0)}}};
  refreshMedia().then(()=>openPath&&api.open(openPath));renderTimeline();renderPreview();
  b.closest('.win')?.addEventListener('curios:close',()=>{cancelAnimationFrame(raf);video.pause();for(const u of mediaUrls.values())URL.revokeObjectURL(u);api=null},{once:true});
 })
}
export const isReelProject=p=>/\.rmgk$/i.test(p);
