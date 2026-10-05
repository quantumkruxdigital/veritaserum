// Boot: mount the filesystem, restore the desktop, keep it synced.
import {conv} from './apps/convert.js';
import {files} from './apps/files.js';
import {notes} from './apps/notes.js';
import {music} from './apps/music.js';
import {settings} from './apps/settings.js';
import {vault} from './apps/vault.js';
import {cmd} from './kernel/cmds.js';
import {CFG} from './kernel/config.js';
import {LocalFS, fs, kids, mk, res, rmf, wr} from './kernel/localfs.js';
import {Mount} from './kernel/mount.js';
import {RemoteFS, RunnerKV, api} from './kernel/runner.js';
import {set} from './kernel/state.js';
import {SB, SupaKV, jwt} from './kernel/supabase.js';
import {KV, V, kvPut, setSys} from './kernel/vfs.js';
import {tick} from './shell/dock.js';
import {showLogin} from './shell/login.js';
import {layout, win, wins} from './shell/wm.js';
import {configureContext} from './shell/context.js';
import {H, act, setHist} from './term/terminal.js';
import './term/commands.js';   // registers the built-in terminal commands (side effects only)

if(location.hash.startsWith('#t=')){try{localStorage.setItem('wos.token',decodeURIComponent(location.hash.slice(3)))}catch{}history.replaceState(null,'',location.pathname)}
(async()=>{const say=t=>act.io.say(t);
 const seed=async()=>{if(!await V.stat('/docs')){await V.mkdir('/docs').catch(()=>0);await V.write('/docs/welcome.txt','This folder lives on your server. Open it from any device.').catch(()=>0)}};
 try{
  if(CFG.supabaseUrl){
   if(!SB){showLogin();return say('Sign in to mount your desktop.')}
   try{await jwt()}catch{showLogin('Session expired. Sign in again.');return}
   setSys({V:Mount,KV:SupaKV,remote:true});await seed()
  }else if(localStorage.getItem('wos.token')){await api('/api/ls');setSys({V:RemoteFS,remote:true});await seed()}
  else return say('Files live in this browser. Run  login <token>  to mount your server and keep your desktop everywhere.');
  try{const j=await(await api('/api/sys')).json();setSys({DEV:!!j.device,RUNNER:!!j&&'device' in j})}catch{}
  const d=await KV.get('desk'),v=await KV.get('vault');setSys({VC:v&&v.salt?v:null});
  Object.assign(set,d.set||{});document.documentElement.style.setProperty('--cy',set.ac);tick();if(Array.isArray(d.hist))setHist(d.hist);
  const ops={files:()=>files(),music:()=>music(),conv:()=>conv(),vault:()=>vault(),sys:()=>settings()};
  for(const w of d.win||[]){const f=w.id.startsWith('n:')?()=>notes(w.id.slice(2)):ops[w.id];if(!f)continue;f();const x=wins[w.id];if(!x)continue;Object.assign(x.e.style,{left:w.l,top:w.t,width:w.w,height:w.h});x.e.mx=w.mx||0;if(w.hide)x.e.style.display='none'}
  let last=JSON.stringify({set,hist:H,win:layout()});
  setInterval(()=>{const j=JSON.stringify({set,hist:H,win:layout()});if(j!==last){last=j;kvPut('desk',JSON.parse(j))}},3000);
  say(CFG.supabaseUrl?'Signed in as '+SB.email+'. Files, vault and desktop follow you to any device; npm runs in /work.':'Server mounted: your files, vault and desktop now follow you to any device.')
 }catch(e){setSys({V:LocalFS,remote:false,KV:RunnerKV});say('Not mounted ('+String(e?.message||e)+'). Using this browser\'s files.')}})();
const launchers={files:()=>files(),music:()=>music(),notes:()=>notes('/docs/scratch.txt'),conv:()=>conv(),sys:()=>settings(),vault:()=>vault()};
configureContext({launchApp:id=>launchers[id]?.(),openPath:async p=>{const st=await V.stat(p).catch(()=>null);if(st?.type=='d'){files(p)}else if(p)files(p)}});
addEventListener('wos:terminal-toggle',()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',ctrlKey:true,bubbles:true})));
act.io.say('kernel ready · '+Object.keys(fs).length+' fs nodes · terminal resident (Ctrl+Space)');
window.os={cmd,fs:{res,kids,wr,mk,rmf},win,set};
