import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {api} from '../kernel/runner.js';
import {win} from '../shell/wm.js';

const safe=n=>(n||'video.mp4').replace(/[\\/:*?"<>|]+/g,'_').slice(0,180)||'video.mp4';
export function videoImporter(){return win('videoimport','Video Importer',520,330,b=>{
 b.classList.add('video-importer');
 const input=h('input',{placeholder:'Paste a YouTube video URL',style:'width:100%'}),status=h('div',{className:'video-status',textContent:'Downloads are saved to /Videos.'}),go=h('button',{className:'btn',textContent:'Download to WebOS'});
 go.onclick=async()=>{const u=input.value.trim();if(!/^https?:\/\//i.test(u))return status.textContent='Enter a valid video URL.';go.disabled=true;status.textContent='Downloading… Keep this window open.';try{
   const r=await api('/api/youtube',{method:'POST',body:JSON.stringify({url:u})});const blob=await r.blob();let name='video.mp4';const cd=r.headers.get('content-disposition')||'',m=/filename="([^"]+)"/.exec(cd);if(m)name=safe(m[1]);
   let dest='/Videos/'+name,i=2;while(await V.stat(dest)){const dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';dest=`/Videos/${stem} (${i++})${ext}`}
   if(V.put)await V.put(dest,blob);else await V.write(dest,await blob.arrayBuffer());status.textContent='Saved: '+dest;window.dispatchEvent(new CustomEvent('wos:vfs-changed',{detail:{paths:[dest]}}));
  }catch(e){status.textContent='Download unavailable: '+String(e?.message||e)+'. The WebOS server needs yt-dlp installed.'}finally{go.disabled=false}};
 b.append(h('div',{className:'hd',textContent:'YouTube → WebOS'}),h('p',{textContent:'Import videos you own or have permission to download. The server fetches the media, then WebOS stores it in the active /Videos filesystem.'}),input,go,status);
})}
