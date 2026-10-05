// Window manager: stage scaling, windows, chrome buttons, layout capture.
import {$, h} from '../kernel/util.js';

export let S=1;
const fit=()=>{S=Math.min(innerWidth/1280,innerHeight/800);$('#fit').style.transform=`translate(${-640*S}px,${-400*S}px) scale(${S})`};
fit();
addEventListener('resize',fit);
export const wins={};
let z=10;
export const show=id=>{const w=wins[id];w.e.style.display='flex';w.e.style.zIndex=++z};
export function win(id,title,w,hh,build,onclose){
 if(wins[id]){wins[id].e.style.display='flex';wins[id].e.style.zIndex=++z;return wins[id]}
 const n=Object.keys(wins).length,e=h('div',{className:'win'}),bd=h('div',{className:'bd'});
 e.dataset.winId=id;
 e.style.cssText=`left:${90+n*30}px;top:${96+n*26}px;width:${w}px;height:${hh}px;z-index:${++z}`;
 const hide=()=>e.style.display='none',max=()=>{if(e.mx){Object.assign(e.style,e.mx);e.mx=0}else{e.mx={left:e.style.left,top:e.style.top,width:e.style.width,height:e.style.height};Object.assign(e.style,{left:'0px',top:'82px',width:'1280px',height:'718px'})}},close=()=>{e.remove();delete wins[id];onclose&&onclose()};
 const tb=h('div',{className:'tb',ondblclick:ev=>{if(ev.target.tagName!='B')max()}},h('span',{className:'tt',textContent:title}),h('span',{className:'ct'},h('b',{title:'Minimize',onclick:hide}),h('b',{title:'Maximize',onclick:max}),h('b',{title:'Close',onclick:close})));
 e.onpointerdown=()=>e.style.zIndex=++z;
 tb.onpointerdown=ev=>{if(ev.target.tagName=='B'||e.mx)return;tb.setPointerCapture(ev.pointerId);const x=ev.clientX,y=ev.clientY,l=e.offsetLeft,t=e.offsetTop;tb.onpointermove=m=>{e.style.left=l+(m.clientX-x)/S+'px';e.style.top=Math.max(0,t+(m.clientY-y)/S)+'px'};tb.onpointerup=()=>tb.onpointermove=null};
 e.append(tb,bd);$('#desk').append(e);wins[id]={e,bd,t:title};build(bd);return wins[id]}
export const layout=()=>Object.entries(wins).map(([id,w])=>({id,l:w.e.style.left,t:w.e.style.top,w:w.e.style.width,h:w.e.style.height,hide:w.e.style.display=='none',mx:w.e.mx||null}));
