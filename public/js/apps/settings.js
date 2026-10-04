// Settings app (device controls).
import {dev} from '../kernel/device.js';
import {h} from '../kernel/util.js';
import {DEV} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';

export function settings(){win('sys','Settings',440,500,b=>{
 const msg=h('div',{className:'msg',style:'color:var(--dim)'}),wl=h('div'),pwf=h('div'),bt=h('div'),err=e=>msg.textContent=String(e?.message||e),
 br=h('input',{type:'range',min:1,max:100,value:60,style:'width:160px',oninput:()=>dev('brightness','set',br.value).catch(err)}),
 scan=async()=>{try{const l=await dev('wifi','list');wl.replaceChildren(...l.sort((x,y)=>y.signal-x.signal).map(n=>h('div',{className:'row',onclick:()=>ask(n)},(n.active?'● ':'  ')+n.ssid,h('b',{textContent:n.signal+'%'+(n.security?' 🔒':'')}))))}catch(e){err(e)}},
 go=async(n,pw)=>{msg.textContent='Connecting to '+n.ssid+'…';try{const r=await dev('wifi','connect',n.ssid,...(pw?[pw]:[]));msg.textContent=r.out||'done';pwf.replaceChildren();scan()}catch(e){err(e)}},
 ask=n=>{if(!n.security||n.active)return go(n);const i=h('input',{type:'password',placeholder:n.ssid+' password',style:'flex:1',onkeydown:e=>e.key=='Enter'&&go(n,i.value)});pwf.replaceChildren(h('div',{style:'display:flex;gap:6px;margin:6px 0'},i,h('button',{className:'btn',textContent:'Connect',onclick:()=>go(n,i.value)})));i.focus()},
 pw=(label,op)=>{const x=h('button',{className:'btn',textContent:label,onclick(){if(x.a)dev('power',op).catch(err);else{x.a=1;x.textContent='Confirm: '+label}}});return x};
 b.append(h('div',{className:'hd',textContent:'Wi-Fi'}),h('button',{className:'btn',textContent:'Scan',onclick:scan}),wl,pwf,h('div',{className:'hd',textContent:'Brightness'}),br,h('div',{className:'hd',textContent:'Battery'}),bt,h('div',{className:'hd',textContent:'Power'}),h('div',{style:'display:flex;gap:6px'},pw('Suspend','suspend'),pw('Restart','reboot'),pw('Power off','poweroff')),msg);
 if(!DEV){msg.textContent='Device controls only work on the bootable OS (server started with WOS_DEVICE=1).';return}
 scan();dev('brightness','get').then(r=>r.percent&&(br.value=r.percent)).catch(()=>0);dev('battery').then(r=>bt.textContent=r.present?r.percent+'%  '+r.status:'No battery').catch(()=>0)})}
