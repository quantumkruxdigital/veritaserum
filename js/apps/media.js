// Vela Player — CuriOS-native port of the Vela music player experience.
// Playback uses the CuriOS VFS and HTMLMediaElement, not Tauri/rodio.
import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {set} from '../kernel/state.js';
import {win} from '../shell/wm.js';

const AUDIO=/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i;
const VIDEO=/\.(mp4|webm|ogv|mov|m4v|mkv)$/i;
const KEY='curios.vela.v1';
export const isAudio=p=>AUDIO.test(p);
export const isVideo=p=>VIDEO.test(p);
export const isMedia=p=>isAudio(p)||isVideo(p);
const base=p=>p.split('/').pop();
const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return {favorites:x.favorites||[],metadata:x.metadata||{},playlists:x.playlists||{},volume:x.volume??.8,repeat:x.repeat||'off',shuffle:!!x.shuffle}}catch{return {favorites:[],metadata:{},playlists:{},volume:.8,repeat:'off',shuffle:false}}};
async function scan(dir='/',out=[],seen=new Set()){
 if(seen.has(dir))return out;seen.add(dir);
 for(const e of await V.ls(dir,true).catch(()=>[])){
  const p=(dir==='/'?'':dir)+'/'+e.name;
  if(e.type==='d'){if(!p.startsWith('/.curios'))await scan(p,out,seen)}
  else if(isMedia(p))out.push(p);
 }
 return out;
}
// Session-only thumbnail cache. Never persist video frames or large media blobs to localStorage.
const thumbnails=new Map();
let thumbQueue=Promise.resolve();
function makeThumbnail(path){
 if(thumbnails.has(path))return Promise.resolve(thumbnails.get(path));
 const task=async()=>{
  if(thumbnails.has(path))return thumbnails.get(path);
  let url=null,el=null;
  try{
   const blob=V.blob?await V.blob(path):new Blob([await V.read(path)]);
   url=URL.createObjectURL(blob);
   el=document.createElement('video');el.preload='metadata';el.muted=true;el.playsInline=true;el.src=url;
   const wait=(event,timeout=9000)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(new Error('Video thumbnail timeout')),timeout);
    const done=()=>finish();const fail=()=>finish(new Error('Unsupported video'));
    function finish(err){clearTimeout(timer);el.removeEventListener(event,done);el.removeEventListener('error',fail);err?reject(err):resolve()}
    el.addEventListener(event,done,{once:true});el.addEventListener('error',fail,{once:true});
   });
   if(el.readyState<1)await wait('loadedmetadata');
   const duration=Number.isFinite(el.duration)?el.duration:0;
   if(duration>0){el.currentTime=Math.min(Math.max(duration*.1,.1),10);await wait('seeked',7000)}
   else if(el.readyState<2)await wait('loadeddata',7000);
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
   const ctx=canvas.getContext('2d');if(!ctx||!el.videoWidth)throw new Error('No video frame');
   const scale=Math.max(canvas.width/el.videoWidth,canvas.height/el.videoHeight);
   const w=el.videoWidth*scale, h=el.videoHeight*scale;
   ctx.drawImage(el,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
   const data=canvas.toDataURL('image/jpeg',.72);
   // Keep a bounded cache to avoid unbounded memory usage.
   if(thumbnails.size>=90)thumbnails.delete(thumbnails.keys().next().value);
   thumbnails.set(path,data);return data;
  }catch{return null}finally{if(el){el.pause();el.removeAttribute('src');el.load()}if(url)URL.revokeObjectURL(url)}
 };
 const result=thumbQueue.then(task,task);thumbQueue=result.then(()=>{},()=>{});return result;
}
let instance=null;
export function media(openPath){
 if(instance){if(openPath)instance.open(openPath);return win('media','Vela Player',1000,680,()=>{})}
 return win('media','Vela Player',1000,680,root=>{
  root.classList.add('vela-app');
  const prefs=load();let tracks=[],current=null,videoLayout='grid',galleryObserver=null,section=isVideo(openPath||'')?'Videos':'Music',filter='',onlyFav=false,playingUrl=null,artUrl=null,queue=[],queueVisible=false,repeat=prefs.repeat,shuffle=prefs.shuffle,volume=prefs.volume,playlists=prefs.playlists,metadata=prefs.metadata,favorites=new Set(prefs.favorites),busy=false,closed=false;
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify({favorites:[...favorites],metadata,playlists,volume,repeat,shuffle}))}catch(e){console.warn('Vela preferences could not be saved',e)}};
  const fmt=n=>Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'0:00';
  const btn=(text,fn,cls='')=>h('button',{className:'vela-btn '+cls,textContent:text,onclick:fn});
  const sidebar=h('aside',{className:'vela-sidebar'}),top=h('div',{className:'vela-top'}),stage=h('div',{className:'vela-stage'}),list=h('div',{className:'vela-list'}),right=h('aside',{className:'vela-queue'});
  const search=h('input',{type:'search',placeholder:'Search Vela library…',className:'vela-search',oninput:e=>{filter=e.target.value.toLowerCase();renderList()}});
  const heading=h('strong',{textContent:'All Music'}),status=h('span',{className:'vela-status'});
  const audio=h('audio',{preload:'metadata'}),video=h('video',{preload:'metadata',playsInline:true,controls:false});
  const cover=h('img',{className:'vela-cover',alt:'Cover artwork'}),placeholder=h('div',{className:'vela-placeholder',textContent:'♫'});
  const title=h('strong',{className:'vela-track-title',textContent:'Nothing playing'}),subtitle=h('span',{className:'vela-track-sub',textContent:'Select media from your library'});
  const seek=h('input',{type:'range',min:0,max:1000,value:0}),time=h('span',{className:'vela-time',textContent:'0:00 / 0:00'});
  const play=btn('▶',toggle),prev=btn('⏮',()=>advance(-1)),next=btn('⏭',()=>advance(1));
  const shuffleBtn=btn('⇄',()=>{shuffle=!shuffle;persist();updateControls()}),repeatBtn=btn('↻',()=>{repeat=repeat==='off'?'all':repeat==='all'?'one':'off';persist();updateControls()});
  const volumeInput=h('input',{type:'range',min:0,max:100,step:1,value:Math.round(volume*100),title:'Volume',oninput:e=>{volume=Number(e.target.value)/100;audio.volume=video.volume=volume;persist()}});
  const active=()=>current&&isVideo(current)?video:audio;
  function updateControls(){play.textContent=active().paused?'▶':'❚❚';shuffleBtn.classList.toggle('on',shuffle);repeatBtn.classList.toggle('on',repeat!=='off');repeatBtn.textContent=repeat==='one'?'↻¹':'↻';}
  function filesForView(){let arr=tracks.filter(p=>section==='Videos'?isVideo(p):section==='Music'?isAudio(p):section==='Favorites'?favorites.has(p):section.startsWith('playlist:')?(playlists[section.slice(9)]||[]).includes(p):true);
   if(onlyFav)arr=arr.filter(p=>favorites.has(p));if(filter)arr=arr.filter(p=>`${base(p)} ${p} ${metadata[p]?.title||''} ${metadata[p]?.artist||''} ${metadata[p]?.album||''}`.toLowerCase().includes(filter));return arr;
  }
  function renderSidebar(){sidebar.replaceChildren(h('div',{className:'vela-brand'},h('span',{textContent:'◉'}),h('strong',{textContent:'VELA'}),h('small',{textContent:'PLAYER'})));
   for(const [id,label] of [['Music','♫  All Music'],['Videos','▣  Videos'],['All','▤  All Media'],['Favorites','♥  Favorites']])sidebar.append(btn(label,()=>{section=id;renderSidebar();renderList()},'vela-nav '+(section===id?'on':'')));
   sidebar.append(h('div',{className:'vela-side-head'},h('span',{textContent:'PLAYLISTS'}),btn('+',()=>{const name=prompt('Playlist name');if(!name?.trim())return;const id='p'+Date.now();playlists[id]=[];metadata['playlist:'+id]={title:name.trim()};persist();section='playlist:'+id;renderSidebar();renderList()})));
   for(const id of Object.keys(playlists)){const label=metadata['playlist:'+id]?.title||'Playlist';sidebar.append(btn('≡  '+label,()=>{section='playlist:'+id;renderSidebar();renderList()},'vela-nav '+(section==='playlist:'+id?'on':'')))}
   sidebar.append(h('div',{className:'vela-side-foot',textContent:'CuriOS EDITION · LOCAL LIBRARY'}));
  }
  function disconnectGallery(){galleryObserver?.disconnect();galleryObserver=null}
  function videoCard(p){
   const m=metadata[p]||{};
   const image=h('div',{className:'vela-poster-image',textContent:'▣'});
   const cached=thumbnails.get(p);
   if(cached){image.style.backgroundImage=`url("${cached}")`;image.textContent=''}
   const card=h('article',{className:'vela-poster '+(current===p?'on':''),tabIndex:0,role:'button',title:'Play '+(m.title||base(p)),ondblclick:()=>open(p),onkeydown:e=>{if(e.key==='Enter'){e.preventDefault();open(p)}}},
    image,h('div',{className:'vela-poster-info'},h('strong',{textContent:m.title||base(p)}),h('small',{textContent:m.artist||'Video'})),
    h('div',{className:'vela-poster-actions'},btn('▶ Play',e=>{e.stopPropagation();open(p)}),btn(favorites.has(p)?'♥':'♡',e=>{e.stopPropagation();favorites.has(p)?favorites.delete(p):favorites.add(p);persist();renderList()}),btn('⋯',e=>{e.stopPropagation();const action=prompt('Action: edit / queue','queue');if(action==='edit')editMeta(p);if(action==='queue'){queue.push(p);renderQueue()}})));
   card.dataset.videoPath=p;card.addEventListener('click',()=>{if(current!==p){title.textContent=m.title||base(p);subtitle.textContent='Double-click or press Play to watch'}});
   return card;
  }
  function attachGallery(){
   disconnectGallery();
   if(!('IntersectionObserver' in window))return;
   galleryObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){if(!entry.isIntersecting)continue;
     galleryObserver.unobserve(entry.target);
     const card=entry.target,p=card.dataset.videoPath;
     if(!p||thumbnails.has(p))continue;
     makeThumbnail(p).then(data=>{if(closed||!data||!card.isConnected)return;const image=card.querySelector('.vela-poster-image');if(image){image.style.backgroundImage=`url("${data}")`;image.textContent=''}});
    }
   },{root:list,rootMargin:'160px'});
   list.querySelectorAll('.vela-poster').forEach(el=>galleryObserver.observe(el));
  }
  function renderList(){viewBtn.style.display=section==='Videos'?'':'none';const entries=filesForView();heading.textContent=section.startsWith('playlist:')?(metadata[section]?.title||'Playlist'):({Music:'All Music',Videos:'Videos',All:'All Media',Favorites:'Favorites'}[section]||section);status.textContent=entries.length+' items';
   disconnectGallery();list.classList.toggle('vela-gallery',section==='Videos'&&videoLayout==='grid');
   if(section==='Videos'&&videoLayout==='grid'){list.replaceChildren(...(entries.length?entries.map(videoCard):[h('div',{className:'vela-empty',textContent:'No videos yet. Import videos using Files or Video Importer.'})]));attachGallery();return}
   list.replaceChildren(...(entries.length?entries.map(p=>{const m=metadata[p]||{};const fav=btn(favorites.has(p)?'♥':'♡',e=>{e.stopPropagation();favorites.has(p)?favorites.delete(p):favorites.add(p);persist();renderList()},'vela-heart');
    const menu=btn('⋯',e=>{e.stopPropagation();const action=prompt('Action: playlist / edit / queue / remove', 'queue');if(action==='queue'){queue.push(p);renderQueue()}else if(action==='edit')editMeta(p);else if(action==='playlist'){const ids=Object.keys(playlists);if(!ids.length){alert('Create a playlist first.');return}const choice=prompt(ids.map((id,i)=>`${i+1}: ${metadata['playlist:'+id]?.title||'Playlist'}`).join('\n')+'\nChoose number');const id=ids[Number(choice)-1];if(id&&!playlists[id].includes(p)){playlists[id].push(p);persist();renderList()}}else if(action==='remove'&&section.startsWith('playlist:')){playlists[section.slice(9)]=playlists[section.slice(9)].filter(x=>x!==p);persist();renderList()}});
    return h('div',{className:'vela-item '+(current===p?'on':''),ondblclick:()=>open(p)},h('span',{className:'vela-item-icon',textContent:isVideo(p)?'▣':'♫'}),h('div',{className:'vela-item-details'},h('strong',{textContent:m.title||base(p)}),h('small',{textContent:[m.artist,m.album].filter(Boolean).join(' · ')||p})),fav,menu)
   }):[h('div',{className:'vela-empty',textContent:'No media in this view. Add files using CuriOS Files or Video Importer, then Refresh.'})]));
  }
  function renderQueue(){right.replaceChildren(h('div',{className:'vela-queue-head'},h('strong',{textContent:'UP NEXT'}),btn('×',()=>{queueVisible=false;right.hidden=true})),...queue.map((p,i)=>h('div',{className:'vela-queue-row'},btn(`${i+1}. ${metadata[p]?.title||base(p)}`,()=>open(p)),btn('×',()=>{queue.splice(i,1);renderQueue()}))),btn('Clear queue',()=>{queue=[];renderQueue()}));right.hidden=!queueVisible}
  async function art(path){if(artUrl){URL.revokeObjectURL(artUrl);artUrl=null}cover.style.display='none';placeholder.style.display='block';if(!path)return;try{const blob=V.blob?await V.blob(path):new Blob([await V.read(path)]);artUrl=URL.createObjectURL(blob);cover.src=artUrl;cover.style.display='block';placeholder.style.display='none'}catch{}}
  async function open(p){if(!isMedia(p))return;try{busy=true;const blob=V.blob?await V.blob(p):new Blob([await V.read(p)]);if(closed)return;const url=URL.createObjectURL(blob);audio.pause();video.pause();audio.removeAttribute('src');video.removeAttribute('src');if(playingUrl)URL.revokeObjectURL(playingUrl);playingUrl=url;current=p;const el=active();el.src=url;el.volume=volume;const m=metadata[p]||{};title.textContent=m.title||base(p);subtitle.textContent=[m.artist,m.album].filter(Boolean).join(' · ')||p;video.style.display=isVideo(p)?'block':'none';cover.style.display='none';placeholder.style.display=isVideo(p)?'none':'block';stage.classList.toggle('vela-video-mode',isVideo(p));await art(m.art);if(isVideo(p)){cover.style.display='none';placeholder.style.display='none'}renderList();await el.play().catch(()=>{});updateControls()}catch(e){console.error('Vela playback',e);status.textContent='Unable to open this file'}finally{busy=false}}
  function toggle(){if(!current||busy)return;const el=active();if(el.paused)el.play().catch(()=>{});else el.pause()}
  function advance(delta=1){if(queue.length&&delta>0){const p=queue.shift();renderQueue();open(p);return}const entries=filesForView();if(!entries.length)return;let idx=entries.indexOf(current);if(shuffle&&delta>0){idx=Math.floor(Math.random()*entries.length)}else{idx+=delta;if(idx>=entries.length){if(repeat==='off')return;idx=0}if(idx<0)idx=entries.length-1}open(entries[idx])}
  function editMeta(p){const m=metadata[p]||{};const t=prompt('Title',m.title||base(p));if(t===null)return;const artist=prompt('Artist / Creator',m.artist||'');if(artist===null)return;const album=prompt('Album / Series',m.album||'');if(album===null)return;const artwork=prompt('Artwork path in CuriOS Files (optional)',m.art||'');if(artwork===null)return;metadata[p]={...m,title:t,artist,album,art:artwork};persist();renderList();if(current===p){title.textContent=t||base(p);subtitle.textContent=[artist,album].filter(Boolean).join(' · ')||p;art(artwork)}}
  async function refresh(){const previous=current;tracks=(await scan()).sort((a,b)=>a.localeCompare(b));if(previous&&!tracks.includes(previous)){audio.pause();video.pause();current=null;title.textContent='Nothing playing';subtitle.textContent='Select media from your library'}renderList();if(openPath&&tracks.includes(openPath)){const p=openPath;openPath=null;await open(p)}}
  for(const el of [audio,video]){el.addEventListener('play',updateControls);el.addEventListener('pause',updateControls);el.addEventListener('ended',()=>{if(repeat==='one'){el.currentTime=0;el.play().catch(()=>{})}else advance(1)});el.addEventListener('timeupdate',()=>{if(el!==active())return;seek.value=el.duration?Math.round(el.currentTime/el.duration*1000):0;time.textContent=fmt(el.currentTime)+' / '+fmt(el.duration)});el.addEventListener('error',()=>{if(el===active())status.textContent='Format not supported by this browser'})}
  seek.oninput=()=>{const el=active();if(Number.isFinite(el.duration))el.currentTime=el.duration*Number(seek.value)/1000};audio.volume=video.volume=volume;
  const fullscreen=btn('⛶',()=>{if(isVideo(current))video.requestFullscreen?.().catch(()=>{})},'');
  const controls=h('div',{className:'vela-controls'},h('div',{className:'vela-now'},title,subtitle),h('div',{className:'vela-transport'},shuffleBtn,prev,play,next,repeatBtn,fullscreen),h('div',{className:'vela-progress'},seek,time),h('div',{className:'vela-volume'},h('span',{textContent:'VOL'}),volumeInput));
  stage.append(video,cover,placeholder,controls,audio);
  const viewBtn=btn('▦ Grid',()=>{videoLayout=videoLayout==='grid'?'list':'grid';viewBtn.textContent=videoLayout==='grid'?'▦ Grid':'☷ List';renderList()});
  top.append(h('div',{className:'vela-headline'},heading,status),search,viewBtn,btn('♡ Favorites',()=>{onlyFav=!onlyFav;renderList()}),btn('↻ Refresh',refresh),btn('☷ Queue',()=>{queueVisible=!queueVisible;renderQueue()}));
  root.append(sidebar,h('main',{className:'vela-main'},top,stage,list),right);
  instance={open:async p=>{await refresh();if(tracks.includes(p))await open(p)},refresh};
  const onChange=()=>{clearTimeout(onChange.timer);onChange.timer=setTimeout(refresh,300)};
  window.addEventListener('curios:vfs-changed',onChange);
  root.closest('.win')?.addEventListener('curios:close',()=>{closed=true;disconnectGallery();audio.pause();video.pause();clearTimeout(onChange.timer);window.removeEventListener('curios:vfs-changed',onChange);if(playingUrl)URL.revokeObjectURL(playingUrl);if(artUrl)URL.revokeObjectURL(artUrl);instance=null},{once:true});
  renderSidebar();renderQueue();updateControls();refresh();
 });
}
