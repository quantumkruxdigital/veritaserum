// Built-in terminal commands.
import {conv} from '../apps/convert.js';
import {files} from '../apps/files.js';
import {scribe} from '../apps/scribe.js';
import {sam,askSAM} from '../apps/sam.js';
import {AIService,aiConfig} from '../kernel/ai-service.js';
import {settings} from '../apps/settings.js';
import {vault, vkey, vlockNow, vm} from '../apps/vault.js';
import {beep} from '../kernel/audio.js';
import {cmd, cmds} from '../kernel/cmds.js';
import {CFG} from '../kernel/config.js';
import {dev} from '../kernel/device.js';
import {fs, res} from '../kernel/localfs.js';
import {rcwd} from '../kernel/mount.js';
import {becomeRoot, isRoot, obliterateSystem} from '../kernel/root.js';
import {api} from '../kernel/runner.js';
import {set, sv} from '../kernel/state.js';
import {sbSave} from '../kernel/supabase.js';
import {RUNNER, DEV, V} from '../kernel/vfs.js';
import {tick} from '../shell/dock.js';
import {S, show, wins} from '../shell/wm.js';
import {closePane, split, togTerm} from './terminal.js';

const APPS={settings,convert:conv,files,term:()=>togTerm(true),vault,scribe:()=>scribe('/Documents/untitled.scribe'),sam:()=>sam()};
cmd('help','list commands',(a,io)=>Object.entries(cmds).filter(([,c])=>!c.hidden).forEach(([n,c])=>io.say(n.padEnd(8)+c.d)));
cmd('ls','ls [-a] [dir]  list folder',async(a,io)=>{const all=a.includes('-a'),d=a.find(x=>x!='-a');(await V.ls(res(io.cwd,d||'.'),all)).sort((x,y)=>x.type==y.type?x.name.localeCompare(y.name):x.type<y.type?-1:1).forEach(e=>io.say((e.type=='d'?'d ':'- ')+e.name+(e.type=='f'&&e.size!=null?'  '+e.size:'')))});
cmd('cd','change folder',async(a,io)=>{const p=res(io.cwd,a[0]||'/');if((await V.stat(p))?.type!='d')throw'not a folder';io.cwd=p});
cmd('pwd','print folder',(a,io)=>io.say(io.cwd));
cmd('cat','show file',async(a,io)=>io.say(await V.read(res(io.cwd,a[0]||''))));
cmd('write','write "path" "text"',async(a,io)=>V.write(res(io.cwd,a[0]),a.slice(1).join(' ')));
cmd('mkdir','make folder',async(a,io)=>V.mkdir(res(io.cwd,a[0])));
cmd('rm','remove file or folder',async(a,io)=>V.rm(res(io.cwd,a[0])));
cmd('open','open app ('+Object.keys(APPS).join(' ')+') or file',async(a,io)=>{const p=res(io.cwd,a[0]||'');if((await V.stat(p))?.type=='f')return scribe(p);(APPS[a[0]]||(()=>{throw'unknown app or file'}))()});
cmd('wins','list open windows',(a,io)=>io.say(Object.keys(wins).join('  ')||'none'));
cmd('close','close window by id',a=>{const w=wins[a[0]];if(!w)throw'no such window';w.e.querySelector('.ct b:last-child').click()});
cmd('vol','vol [0-100|mute|on]',(a,io)=>{if(a[0]=='mute')set.mute=1;else if(a[0]=='on')set.mute=0;else if(a[0]!=null){set.vol=Math.max(0,Math.min(100,+a[0]||0));set.mute=0}sv();if(DEV)dev('volume','set',set.vol).then(()=>dev('volume',set.mute?'mute':'unmute')).catch(()=>0);io.say('volume '+(set.mute?'muted':set.vol))});
cmd('win','win <id> hide|show|max|close',a=>{const w=wins[a[0]];if(!w)throw'no such window (see wins)';const b=w.e.querySelectorAll('.ct b');({hide:()=>b[0].click(),max:()=>b[1].click(),close:()=>b[2].click(),show:()=>show(a[0])})[a[1]]?.()});
cmd('term','term --ws -v|-h  split this pane (v: side by side, h: stacked)',(a,io)=>{if(a[0]!='--ws'||!['-v','-h'].includes(a[1]))throw'usage: term --ws -v | term --ws -h';split(io.pane,a[1]=='-v'?'v':'h')});
cmd('sam','sam [status|auto|local|cloud|models|model <name>|message]',async(a,io)=>{const op=a[0];if(!op){sam();return}if(op=='status'){const s=await AIService.status();io.say('route '+aiConfig.route+' · local '+(s.local?.available?'ready':'offline')+' · cloud '+(s.cloud?.available?'ready':'not configured'));return}if(['auto','local','cloud'].includes(op)){aiConfig.route=op;io.say('SAM route: '+op);return}if(op=='models'){const m=await AIService.models();io.say('local: '+((m.local||[]).join(', ')||'none'));io.say('cloud: '+((m.cloud||[]).join(', ')||'provider default'));return}if(op=='model'){if(!a[1])throw'usage: sam model <name>';if(aiConfig.route=='cloud')aiConfig.cloudModel=a[1];else aiConfig.localModel=a[1];io.say('SAM model: '+a[1]);return}askSAM(a.join(' '))});

cmd('su','enter super-user mode',async(a,io)=>{
 if(a.length)throw'usage: su';
 if(isRoot()){io.say('already root');return}
 const pw=await io.secret('Password: ');
 await becomeRoot(pw);
 io.say('root privileges granted');
});
cmd('obliviate','',async(a,io)=>{
 if(!isRoot())throw'root privileges required';
 if(a.length!==1||a[0]!=='-sys')throw'usage: obliviate -sys';
 io.say('WARNING: this permanently deletes all CuriOS user files, settings, favorites, Quick Launch data, media state, vault data, and mounted workspace data.');
 const confirm=await io.secret('Type OBLIVIATE to confirm: ');
 if(confirm!=='OBLIVIATE')throw'aborted';
 io.say('obliviating system user data…');
 await obliterateSystem();
 io.say('complete');
 setTimeout(()=>location.reload(),250);
},{hidden:true});
cmd('exit','close this pane (last pane hides the terminal)',(a,io)=>closePane(io.pane));
cmd('wifi','wifi list|status|on|off|connect <ssid> [password]',async(a,io)=>{const r=await dev('wifi',...a);(Array.isArray(r)?r.map(x=>(x.active?'* ':'  ')+x.ssid+'  '+x.signal+'%  '+x.security):[r.out||JSON.stringify(r)]).forEach(t=>io.say(t))});
cmd('brightness','brightness [1-100]',async(a,io)=>io.say('brightness '+(await dev('brightness',...(a[0]?['set',a[0]]:['get']))).percent+'%'));
cmd('battery','battery status',async(a,io)=>{const r=await dev('battery');io.say(r.present?r.percent+'%  '+r.status:'no battery')});
cmd('power','power suspend|reboot|poweroff',async(a,io)=>{await dev('power',...a);io.say('ok')});
cmd('sysinfo','device info',async(a,io)=>io.say(JSON.stringify(await dev('info'))));
cmd('beep','play a tone at current volume',()=>beep());
cmd('accent','accent #rrggbb',a=>{if(!/^#[0-9a-f]{6}$/i.test(a[0]||''))throw'use #rrggbb';set.ac=a[0];sv();document.documentElement.style.setProperty('--cy',a[0])});
cmd('clock','clock 12|24',a=>{set.h24=a[0]=='12'?0:1;sv();tick()});
cmd('lock','lock the vault',()=>vlockNow());
cmd('vault','vault status',(a,io)=>{const m=vm();io.say(!m?'no vault':vkey?'unlocked':'locked');if(m)io.say(`wipe after ${m.maxFails||'off'} fails, dead-man ${m.dead||'off'} days, auto-lock ${m.lock||'off'} min`)});
cmd('clear','clear screen',(a,io)=>io.clear());
cmd('echo','print text',(a,io)=>io.say(a.join(' ')));
cmd('sys','system info',(a,io)=>io.say(`stage 1280x800  scale ${S.toFixed(2)}  files ${Object.keys(fs).length}  windows ${Object.keys(wins).length}`));
cmd('login','login <token>  sign in to your server',async(a,io)=>{if(CFG.supabaseUrl)throw'This desktop uses Supabase accounts. Run logout to get the sign-in screen.';if(!a[0])throw'usage: login <token>';localStorage.setItem('curios.token',a[0]);try{await api('/api/ls')}catch(e){localStorage.removeItem('curios.token');throw e}io.say('signed in, loading your server desktop…');setTimeout(()=>location.reload(),700)});
for(const n of['npm','npx','node'])cmd(n,n+' ...  runs on your server (Ctrl+C stops it)',async(a,io)=>{
 if(CFG.supabaseUrl&&!RUNNER)throw'No runner is connected: npm and node need server/server.mjs running (see README).';const wd=rcwd(io.cwd);if(wd==null)throw'npm and node run in /work. Try: cd /work';io.ac=new AbortController();const el=io.say('');let txt='';
 try{const r=await api('/api/exec',{method:'POST',signal:io.ac.signal,body:JSON.stringify({cmd:n,args:a,cwd:wd})}),rd=r.body.getReader(),dec=new TextDecoder();
  for(;;){const{done,value}=await rd.read();if(done)break;txt+=dec.decode(value,{stream:true});el.textContent=txt.replace(/\u0001exit:\S*$/,'');el.scrollIntoView({block:'end'})}
  const m=txt.match(/\u0001exit:(\S+)$/);if(m&&m[1]!='0')io.say('exit code '+m[1],'e')}
 catch(e){if(e.name=='AbortError')el.textContent=txt+'\n^C';else throw e}finally{io.ac=null}});
cmd('logout','sign out of your server and return to this browser\'s files',()=>{localStorage.removeItem('curios.token');sbSave(null);setTimeout(()=>location.reload(),300)});
