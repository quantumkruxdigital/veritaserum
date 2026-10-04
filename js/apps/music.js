// Music player: plays audio stored in the WebOS VFS without exposing storage URLs.
import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {set} from '../kernel/state.js';
import {win} from '../shell/wm.js';

const AUDIO=/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i;
let current=null, url=null, api=null;
const name=p=>p.split('/').pop();
export const isAudio=p=>AUDIO.test(p);
async function scan(dir='/',out=[]){for(const e of await V.ls(dir)){const p=(dir=='/'?'':dir)+'/'+e.name;if(e.type=='d'){if(!p.startsWith('/.wos'))await scan(p,out)}else if(isAudio(p))out.push(p)}return out}
export function music(openPath){
 if(api){if(openPath)api.open(openPath);return win('music','Music',560,430,()=>{})}
 const W=win('music','Music',560,430,b=>{
  b.classList.add('music');
  const title=h('div',{className:'track',textContent:'Nothing playing'}),time=h('span',{textContent:'0:00 / 0:00'}),seek=h('input',{type:'range',min:0,max:1000,value:0}),audio=h('audio'),play=h('button',{className:'btn',textContent:'▶ Play'}),prev=h('button',{className:'btn',textContent:'⏮'}),next=h('button',{className:'btn',textContent:'⏭'}),list=h('div',{className:'plist'});
  let tracks=[],idx=-1;
  const fmt=n=>!isFinite(n)?'0:00':Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
  const rows=()=>{list.replaceChildren(...tracks.map((p,i)=>h('div',{className:'row '+(i==idx?'sel':''),onclick:()=>load(i,true)},h('span',{textContent:name(p)}),h('small',{textContent:p.replace('/'+name(p),'')||'/'}))))};
  const load=async(i,go=false)=>{if(i<0||i>=tracks.length)return;idx=i;current=tracks[i];if(url)URL.revokeObjectURL(url);const blob=V.blob?await V.blob(current):new Blob([await V.read(current)]);url=URL.createObjectURL(blob);audio.src=url;audio.volume=set.mute?0:set.vol/100;title.textContent=name(current);rows();if(go)audio.play().catch(()=>0)};
  const refresh=async()=>{const keep=current;tracks=(await scan()).sort((a,b)=>a.localeCompare(b));idx=keep?tracks.indexOf(keep):-1;rows();if(openPath&&tracks.includes(openPath)){await load(tracks.indexOf(openPath),true);openPath=null}else if(idx<0&&tracks.length)await load(0,false)};
  play.onclick=()=>audio.paused?audio.play():audio.pause();prev.onclick=()=>load((idx-1+tracks.length)%tracks.length,true);next.onclick=()=>load((idx+1)%tracks.length,true);
  audio.onplay=()=>play.textContent='❚❚ Pause';audio.onpause=()=>play.textContent='▶ Play';audio.onended=()=>tracks.length&&load((idx+1)%tracks.length,true);
  audio.ontimeupdate=()=>{seek.value=audio.duration?audio.currentTime/audio.duration*1000:0;time.textContent=fmt(audio.currentTime)+' / '+fmt(audio.duration)};
  seek.oninput=()=>{if(audio.duration)audio.currentTime=audio.duration*(seek.value/1000)};
  api={open:async p=>{await refresh();const i=tracks.indexOf(p);if(i>=0)load(i,true)},refresh};
  b.append(title,h('div',{className:'transport'},prev,play,next),seek,h('div',{className:'mtime'},time,h('button',{className:'btn mini',textContent:'↻ Library',onclick:refresh})),list);refresh();
 });
 return W;
}
