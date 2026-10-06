// Unified Media library/player for audio and video stored in the CuriOS VFS.
import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {set} from '../kernel/state.js';
import {win} from '../shell/wm.js';

const AUDIO=/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i;
const VIDEO=/\.(mp4|webm|ogv|mov|m4v|mkv)$/i;
const FAVKEY='curios.media.favorites.v1', METAKEY='curios.media.metadata.v1';
let api=null, objectUrl=null;
const name=p=>p.split('/').pop();
export const isAudio=p=>AUDIO.test(p);
export const isVideo=p=>VIDEO.test(p);
export const isMedia=p=>isAudio(p)||isVideo(p);
const loadFav=()=>{try{return new Set(JSON.parse(localStorage.getItem(FAVKEY)||'[]'))}catch{return new Set()}};
const saveFav=s=>localStorage.setItem(FAVKEY,JSON.stringify([...s]));
const loadMeta=()=>{try{return JSON.parse(localStorage.getItem(METAKEY)||'{}')}catch{return {}}};
const saveMeta=m=>localStorage.setItem(METAKEY,JSON.stringify(m));
async function scan(dir='/',out=[]){for(const e of await V.ls(dir,true).catch(()=>[])){const p=(dir=='/'?'':dir)+'/'+e.name;if(e.type=='d'){if(!p.startsWith('/.curios'))await scan(p,out)}else if(isMedia(p))out.push(p)}return out}

export function media(openPath){
 if(api){if(openPath)api.open(openPath);return win('media','Media',780,560,()=>{})}
 const W=win('media','Media',780,560,b=>{
  b.classList.add('media-app');
  let tracks=[],current=null,index=-1,section=openPath&&isVideo(openPath)?'video':'audio',onlyFav=false,favs=loadFav(),meta=loadMeta(),artUrl='';
  const tabs=h('div',{className:'media-tabs'}),stage=h('div',{className:'media-stage'}),library=h('div',{className:'media-library'});
  const title=h('div',{className:'media-title',textContent:'Nothing playing'}),sub=h('div',{className:'media-sub',textContent:'Choose something from your library'});
  const art=h('img',{className:'media-cover',alt:'Album art'}),audio=h('audio'),video=h('video',{controls:false,playsInline:true}),play=h('button',{className:'btn',textContent:'▶ Play'}),prev=h('button',{className:'btn',textContent:'⏮'}),next=h('button',{className:'btn',textContent:'⏭'}),fav=h('button',{className:'btn',textContent:'☆ Favorite'}),edit=h('button',{className:'btn',textContent:'Edit Info'}),seek=h('input',{type:'range',min:0,max:1000,value:0}),time=h('span',{textContent:'0:00 / 0:00'});
  const active=()=>current&&isVideo(current)?video:audio;
  const fmt=n=>!isFinite(n)?'0:00':Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
  const filtered=()=>tracks.filter(p=>(section=='audio'?isAudio(p):isVideo(p))&&(!onlyFav||favs.has(p)));
  function renderTabs(){tabs.replaceChildren(
   h('button',{className:'media-tab '+(section=='audio'?'sel':''),textContent:'♫ Audio',onclick:()=>{section='audio';renderTabs();renderLibrary()}}),
   h('button',{className:'media-tab '+(section=='video'?'sel':''),textContent:'▣ Video',onclick:()=>{section='video';renderTabs();renderLibrary()}}),
   h('span',{className:'media-spacer'}),
   h('button',{className:'btn mini '+(onlyFav?'active':''),textContent:onlyFav?'★ Favorites':'☆ Favorites',onclick:()=>{onlyFav=!onlyFav;renderTabs();renderLibrary()}}),
   h('button',{className:'btn mini',textContent:'↻ Refresh',onclick:refresh})
  )}
  function renderLibrary(){const list=filtered();library.replaceChildren(...(list.length?list.map(p=>{const m=meta[p]||{};return h('div',{className:'media-row '+(p==current?'sel':''),ondblclick:()=>open(p,true)},h('span',{className:'media-kind',textContent:isVideo(p)?'▣':'♫'}),h('span',{className:'media-name',textContent:m.title||name(p)}),h('span',{className:'media-path',textContent:m.artist?m.artist+(m.album?' · '+m.album:''):(p.slice(0,-name(p).length)||'/')}),h('button',{className:'media-star',textContent:favs.has(p)?'★':'☆',title:'Favorite',onclick:e=>{e.stopPropagation();toggleFav(p)}}))}):[h('div',{className:'media-empty',textContent:onlyFav?'No favorites here yet.':`No ${section} files found.`})]))}
  function toggleFav(p=current){if(!p)return;favs.has(p)?favs.delete(p):favs.add(p);saveFav(favs);fav.textContent=favs.has(p)?'★ Favorited':'☆ Favorite';renderLibrary()}
  async function showArt(path){if(artUrl){URL.revokeObjectURL(artUrl);artUrl=''}if(!path){art.removeAttribute('src');art.style.display='none';return}try{const blob=V.blob?await V.blob(path):new Blob([await V.read(path)]);artUrl=URL.createObjectURL(blob);art.src=artUrl;art.style.display='block'}catch{art.style.display='none'}}
  async function editMeta(){if(!current||!isAudio(current))return;const m={...(meta[current]||{})};m.title=prompt('Song title',m.title||name(current))??m.title;m.artist=prompt('Artist',m.artist||'')??m.artist;m.album=prompt('Album',m.album||'')??m.album;const ap=prompt('Album art path in CuriOS Files (leave blank for none)',m.art||'');m.art=ap||'';meta[current]=m;saveMeta(meta);title.textContent=m.title||name(current);sub.textContent=[m.artist,m.album].filter(Boolean).join(' · ')||current;await showArt(m.art);renderLibrary()}
  async function open(p,go=true){if(!isMedia(p))return;current=p;section=isVideo(p)?'video':'audio';index=tracks.indexOf(p);if(objectUrl)URL.revokeObjectURL(objectUrl);const blob=V.blob?await V.blob(p):new Blob([await V.read(p)]);objectUrl=URL.createObjectURL(blob);audio.pause();video.pause();audio.removeAttribute('src');video.removeAttribute('src');const el=active();el.src=objectUrl;el.volume=set.mute?0:set.vol/100;const m=meta[p]||{};title.textContent=m.title||name(p);sub.textContent=m.artist?[m.artist,m.album].filter(Boolean).join(' · '):p;await showArt(m.art);fav.textContent=favs.has(p)?'★ Favorited':'☆ Favorite';video.style.display=isVideo(p)?'block':'none';stage.classList.toggle('video-mode',isVideo(p));renderTabs();renderLibrary();if(go)el.play().catch(()=>0)}
  async function refresh(){const keep=current;tracks=(await scan()).sort((a,z)=>a.localeCompare(z));if(keep&&tracks.includes(keep))index=tracks.indexOf(keep);renderTabs();renderLibrary();if(openPath&&tracks.includes(openPath)){const p=openPath;openPath=null;await open(p,true)}}
  function adjacent(delta){const list=filtered();if(!list.length)return;let i=current?list.indexOf(current):-1;i=(i+delta+list.length)%list.length;open(list[i],true)}
  play.onclick=()=>{const el=active();if(!current)return;el.paused?el.play():el.pause()};prev.onclick=()=>adjacent(-1);next.onclick=()=>adjacent(1);fav.onclick=()=>toggleFav();edit.onclick=editMeta;
  for(const el of [audio,video]){el.onplay=()=>play.textContent='❚❚ Pause';el.onpause=()=>play.textContent='▶ Play';el.onended=()=>adjacent(1);el.ontimeupdate=()=>{seek.value=el.duration?el.currentTime/el.duration*1000:0;time.textContent=fmt(el.currentTime)+' / '+fmt(el.duration)}}
  seek.oninput=()=>{const el=active();if(el.duration)el.currentTime=el.duration*(seek.value/1000)};
  const controls=h('div',{className:'media-controls'},h('div',{className:'media-now'},title,sub),h('div',{className:'transport'},prev,play,next,fav,edit),seek,h('div',{className:'mtime'},time));
  stage.append(video,h('div',{className:'media-audio-art',textContent:'♫'}),art,controls,audio);b.append(tabs,stage,library);
  api={open:async p=>{await refresh();if(tracks.includes(p))await open(p,true)},refresh};
  let refreshTimer=0;
  const onFsChanged=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(async()=>{await refresh();refreshTimer=setTimeout(()=>refresh(),650)},80)};
  window.addEventListener('curios:vfs-changed',onFsChanged);
  b.closest('.win')?.addEventListener('curios:close',()=>window.removeEventListener('curios:vfs-changed',onFsChanged),{once:true});
  refresh();
 });
 return W;
}
