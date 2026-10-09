// Window manager: stage scaling, windows, chrome buttons, layout capture.
import {$, h} from '../kernel/util.js';
import {formFactor} from '../kernel/form-factor.js';

export let S=1;
const fit=()=>{const mobile=formFactor().mode!='desktop';S=mobile?1:Math.max(innerWidth/1280,innerHeight/800);const f=$('#fit');if(mobile){f.style.transform='none';f.style.left='0';f.style.top='0';f.style.width='100vw';f.style.height='100dvh'}else{f.style.left='50%';f.style.top='50%';f.style.width='1280px';f.style.height='800px';f.style.transformOrigin='center center';f.style.transform=`translate(-50%, -50%) scale(${S})`}};
fit();
addEventListener('resize',fit);
export const wins={};
let z=10;
export const show=id=>{const w=wins[id];w.e.style.display='flex';w.e.style.zIndex=++z};
const APP_ICONS={files:'assets/apps/files.png',media:'assets/apps/media.png',videoimport:'assets/apps/videoimport.png',images:'assets/apps/images.png',scribe:'assets/apps/scribe.png',alchemy:'assets/apps/alchemy.png',photos:'assets/apps/photoalbum.png',reelmagick:'assets/apps/reelmagick.png',ppl:'assets/apps/ppl.png',vault:'assets/apps/vault.png',sys:'assets/apps/settings.png'};
const appKey=id=>id.startsWith('scribe:')?'scribe':id.split(':')[0];
export function win(id,title,w,hh,build,onclose){
 if(wins[id]){wins[id].e.style.display='flex';wins[id].e.style.zIndex=++z;return wins[id]}
 const n=Object.keys(wins).length,e=h('div',{className:'win'}),bd=h('div',{className:'bd'});
 e.dataset.winId=id;
 const ff=formFactor();e.style.cssText=ff.mode==='phone'?`left:0;top:var(--mobile-dock-h);width:100%;height:calc(100dvh - var(--mobile-dock-h));z-index:${++z}`:`left:${90+n*30}px;top:${96+n*26}px;width:${Math.min(w,innerWidth-24)}px;height:${Math.min(hh,innerHeight-100)}px;z-index:${++z}`;e.classList.toggle('mobile-full',ff.mode==='phone');
 const hide=()=>e.style.display='none',max=()=>{if(e.mx){Object.assign(e.style,e.mx);e.mx=0}else{e.mx={left:e.style.left,top:e.style.top,width:e.style.width,height:e.style.height};Object.assign(e.style,{left:'0px',top:'82px',width:'1280px',height:'718px'})}},close=()=>{e.remove();delete wins[id];onclose&&onclose()};
 const icon=APP_ICONS[appKey(id)],tb=h('div',{className:'tb',ondblclick:ev=>{if(ev.target.tagName!='B')max()}},...(icon?[h('img',{className:'app-chrome-icon',src:icon,alt:''})]:[]),h('span',{className:'tt',textContent:title}),h('span',{className:'ct'},h('b',{title:'Minimize',onclick:hide}),h('b',{title:'Maximize',onclick:max}),h('b',{title:'Close',onclick:close})));
 e.onpointerdown=()=>e.style.zIndex=++z;
 tb.onpointerdown=ev=>{if(formFactor().mode==='phone'||ev.target.tagName=='B'||e.mx)return;tb.setPointerCapture(ev.pointerId);const x=ev.clientX,y=ev.clientY,l=e.offsetLeft,t=e.offsetTop;tb.onpointermove=m=>{e.style.left=l+(m.clientX-x)/S+'px';e.style.top=Math.max(0,t+(m.clientY-y)/S)+'px'};tb.onpointerup=()=>tb.onpointermove=null};
 e.append(tb,bd);$('#desk').append(e);wins[id]={e,bd,t:title};build(bd);return wins[id]}
export const layout=()=>Object.entries(wins).map(([id,w])=>({id,l:w.e.style.left,t:w.e.style.top,w:w.e.style.width,h:w.e.style.height,hide:w.e.style.display=='none',mx:w.e.mx||null}));
