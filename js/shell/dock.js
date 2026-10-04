// Top dock: launchers, clock, popovers.
import {conv} from '../apps/convert.js';
import {files} from '../apps/files.js';
import {notes} from '../apps/notes.js';
import {music} from '../apps/music.js';
import {settings} from '../apps/settings.js';
import {vault} from '../apps/vault.js';
import {beep} from '../kernel/audio.js';
import {dev} from '../kernel/device.js';
import {set, sv} from '../kernel/state.js';
import {$, h} from '../kernel/util.js';
import {DEV} from '../kernel/vfs.js';
import {S, show, wins} from './wm.js';
import {togTerm} from '../term/terminal.js';

const I={menu:'<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',term:'<path d="M4 6l6 6-6 6M12 19h8"/>',vol:'<path d="M4 9h4l5-4v14l-5-4H4zM17 8c2 2 2 6 0 8"/>',files:'<path d="M3 7 a2 2 0 0 1 2-2 h4 l2 2 h8 a2 2 0 0 1 2 2 v8 a2 2 0 0 1-2 2 H5 a2 2 0 0 1-2-2 z"/>',vault:'<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 018 0v3"/>'};
document.querySelectorAll('#dock button').forEach(b=>b.innerHTML='<svg viewBox="0 0 24 24">'+I[b.dataset.a]+'</svg>');
export const tick=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');let H=d.getHours();const s=set.h24?'':H>=12?' PM':' AM';if(!set.h24)H=H%12||12;$('#clk').textContent=`${p(H)}:${p(d.getMinutes())}:${p(d.getSeconds())}${s}`};
tick();
setInterval(tick,1000);
const pop=$('#pop'),closePop=()=>pop.style.display='none';
function popAt(btn,...c){const r=btn.getBoundingClientRect(),f=$('#fit').getBoundingClientRect();pop.replaceChildren(...c);pop.style.display='block';pop.style.left=Math.max(4,Math.min(1090,(r.left-f.left)/S-60))+'px'}
$('#dock').onclick=e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();const a=b.dataset.a;
 if(a=='menu'){const run=Object.entries(wins).map(([id,w])=>h('button',{textContent:(w.e.style.display=='none'?'○ ':'● ')+w.t,onclick(){closePop();show(id)}}));
  popAt(b,...[['Files',files],['Music',()=>music()],['Notes',()=>notes('/docs/scratch.txt')],['Convert',conv],['Settings',settings],['Vault',vault]].map(([t,f])=>h('button',{textContent:t,onclick(){closePop();f()}})),...(run.length?[h('div',{className:'hd',textContent:'Running (○ = minimized)',style:'margin:8px 0 2px;padding:0 10px'}),...run]:[]))}
 else if(a=='term')togTerm();else if(a=='files')files();else if(a=='vault')vault();
 else if(a=='vol'){const m=h('input',{type:'checkbox',checked:!!set.mute,onchange(){set.mute=+m.checked;sv();if(DEV)dev('volume',set.mute?'mute':'unmute').catch(()=>0)}}),r=h('input',{type:'range',min:0,max:100,value:set.vol,style:'width:100%',oninput(){set.vol=+r.value;set.mute=0;m.checked=false;sv();if(DEV)dev('volume','set',set.vol).then(()=>dev('volume','unmute')).catch(()=>0)}});popAt(b,h('label',{className:'s'},'Volume',r),h('label',{className:'s'},'Mute',m),h('button',{textContent:'Test tone',onclick:beep}))}};
addEventListener('pointerdown',e=>{if(!e.target.closest('#pop,#dock'))closePop()});
