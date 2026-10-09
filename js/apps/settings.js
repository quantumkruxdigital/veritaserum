// CuriOS Settings: wallpaper plus optional device controls.
import {dev} from '../kernel/device.js';
import {h} from '../kernel/util.js';
import {DEV,V} from '../kernel/vfs.js';
import {set} from '../kernel/state.js';
import {STOCK_WALLPAPERS,setWallpaper} from '../kernel/wallpaper.js';
import {win} from '../shell/wm.js';
import {getDockPlacement,setDockPlacement} from '../shell/dock.js';
const IMAGE=/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i;
async function imagePaths(dir='/',out=[]){for(const e of await V.ls(dir,true).catch(()=>[])){const p=(dir==='/'?'':dir)+'/'+e.name;if(e.type==='d'){if(!p.startsWith('/.curios'))await imagePaths(p,out)}else if(IMAGE.test(p))out.push(p)}return out}
export function settings(){win('sys','Settings',520,620,b=>{
 const msg=h('div',{className:'msg',style:'color:var(--dim)'}),wl=h('div'),pwf=h('div'),bt=h('div'),err=e=>msg.textContent=String(e?.message||e);
 const wall=h('div',{className:'wallpaper-grid'}),custom=h('div',{className:'wallpaper-path',textContent:set.wallpaper?.type==='vfs'?set.wallpaper.path:'Using a stock CuriOS wallpaper'});
 const renderWall=()=>{wall.replaceChildren(...STOCK_WALLPAPERS.map(x=>h('button',{className:'wallpaper-card '+(set.wallpaper?.type==='stock'&&set.wallpaper.id===x.id?'sel':''),onclick:async()=>{await setWallpaper({type:'stock',id:x.id});custom.textContent='Using stock wallpaper: '+x.name;renderWall()}},h('img',{className:'wallpaper-thumb',src:x.url}),h('span',{textContent:x.name}))));};renderWall();
 const choose=async()=>{const pics=await imagePaths();if(!pics.length)return err('No images found in CuriOS Files. Add an image to /Pictures first.');const current=set.wallpaper?.type==='vfs'?set.wallpaper.path:pics[0];const p=prompt('Wallpaper path in CuriOS Files:\n\n'+pics.slice(0,25).join('\n'),current);if(!p)return;if(!pics.includes(p)&&!IMAGE.test(p))return err('Choose an image file.');if(!await V.stat(p).catch(()=>null))return err('Image not found: '+p);await setWallpaper({type:'vfs',path:p});custom.textContent=p;renderWall()};
 const br=h('input',{type:'range',min:1,max:100,value:60,style:'width:160px',oninput:()=>dev('brightness','set',br.value).catch(err)}),
 scan=async()=>{try{const l=await dev('wifi','list');wl.replaceChildren(...l.sort((x,y)=>y.signal-x.signal).map(n=>h('div',{className:'row',onclick:()=>ask(n)},(n.active?'● ':'  ')+n.ssid,h('b',{textContent:n.signal+'%'+(n.security?' 🔒':'')}))))}catch(e){err(e)}},
 go=async(n,pw)=>{msg.textContent='Connecting to '+n.ssid+'…';try{const r=await dev('wifi','connect',n.ssid,...(pw?[pw]:[]));msg.textContent=r.out||'done';pwf.replaceChildren();scan()}catch(e){err(e)}},
 ask=n=>{if(!n.security||n.active)return go(n);const i=h('input',{type:'password',placeholder:n.ssid+' password',style:'flex:1',onkeydown:e=>e.key==='Enter'&&go(n,i.value)});pwf.replaceChildren(h('div',{style:'display:flex;gap:6px;margin:6px 0'},i,h('button',{className:'btn',textContent:'Connect',onclick:()=>go(n,i.value)})));i.focus()},
 pw=(label,op)=>{const x=h('button',{className:'btn',textContent:label,onclick(){if(x.a)dev('power',op).catch(err);else{x.a=1;x.textContent='Confirm: '+label}}});return x};
 const dockPosition=h('select',{style:'width:100%;margin:7px 0 10px',onchange:e=>setDockPlacement(e.target.value)},...[['top','Top — horizontal'],['bottom','Bottom — horizontal'],['right','Right — vertical']].map(([value,label])=>h('option',{value,textContent:label})));
 dockPosition.value=getDockPlacement();
 const dockHelp=h('div',{style:'color:var(--dim);font-size:11px;line-height:1.45'},'Right-click empty space on the dock and choose Edit Dock to drag the launcher and pinned apps into any order. Volume and Lock / Log Out stay reserved.');
 b.append(h('div',{className:'hd',textContent:'Dock'}),h('label',{textContent:'Dock position'}),dockPosition,dockHelp,h('div',{className:'hd',textContent:'Wallpaper'}),wall,h('button',{className:'btn',textContent:'Choose from CuriOS Files',onclick:choose}),custom,h('div',{className:'hd',textContent:'Wi-Fi'}),h('button',{className:'btn',textContent:'Scan',onclick:scan}),wl,pwf,h('div',{className:'hd',textContent:'Brightness'}),br,h('div',{className:'hd',textContent:'Battery'}),bt,h('div',{className:'hd',textContent:'Power'}),h('div',{style:'display:flex;gap:6px'},pw('Suspend','suspend'),pw('Restart','reboot'),pw('Power off','poweroff')),msg);
 if(!DEV){msg.textContent='Wallpaper settings work everywhere. Device controls require the bootable CuriOS server (CURIOS_DEVICE=1).';return}scan();dev('brightness','get').then(r=>r.percent&&(br.value=r.percent)).catch(()=>0);dev('battery').then(r=>bt.textContent=r.present?r.percent+'%  '+r.status:'No battery').catch(()=>0)
 })}
