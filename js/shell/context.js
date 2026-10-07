// Universal context-menu service. Apps contribute contextual actions; the shell always adds Quick Launch.
import {h} from '../kernel/util.js';

const KEY='curios.quickLaunch.v1';
let launchApp=()=>{}, openPath=()=>{};
const providers=new Map();
const appNames={files:'Files',media:'Media',images:'Images',videoimport:'Video Importer',scribe:'Scribe',sam:'SAM',alchemy:'Alchemy',sys:'Settings',vault:'Vault'};
const appAliases={menu:null,term:null,vol:null,files:'files',vault:'vault'};

function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function save(v){localStorage.setItem(KEY,JSON.stringify(v));window.dispatchEvent(new CustomEvent('quicklaunchchange'))}
export const quickLaunch=()=>load();
export const configureContext=o=>{if(o.launchApp)launchApp=o.launchApp;if(o.openPath)openPath=o.openPath};
export const registerContext=(id,fn)=>{providers.set(id,fn);return()=>providers.delete(id)};
export function pinQuick(item){const a=load(),key=item.type+':'+item.target;if(a.some(x=>x.type+':'+x.target==key))return false;a.push(item);save(a);return true}
export function unpinQuick(item){save(load().filter(x=>x.type+':'+x.target!=item.type+':'+item.target))}
export const isPinned=item=>load().some(x=>x.type==item.type&&x.target==item.target);

let menu;
function ensure(){if(menu)return menu;menu=h('div',{id:'ctx',className:'ctx'});document.body.append(menu);return menu}
function close(){if(menu)menu.style.display='none'}
function item(label,fn,cls='',disabled=false,children=null){const b=h('button',{className:'ctx-item '+cls,disabled,onclick:e=>{e.stopPropagation();if(disabled)return;if(children?.length)return;close();fn&&fn()}});b.append(h('span',{textContent:label}),children?.length?h('span',{className:'ctx-arrow',textContent:'›'}):'');if(children?.length){const sub=h('div',{className:'ctx-sub'});for(const a of children)sub.append(item(a.label,a.action,a.danger?'danger':'',!!a.disabled,a.children));b.append(sub)}return b}
function sep(label){return h('div',{className:'ctx-sep',textContent:label})}
function show(x,y,items){const m=ensure();m.replaceChildren(...items);m.style.display='block';m.style.left='0';m.style.top='0';const r=m.getBoundingClientRect(),px=Math.max(4,Math.min(innerWidth-r.width-4,x)),py=Math.max(4,Math.min(innerHeight-r.height-4,y));m.style.left=px+'px';m.style.top=py+'px'}

function quickItems(){const pins=load(),out=[sep('Quick Launch')];if(!pins.length)out.push(h('div',{className:'ctx-empty',textContent:'Nothing pinned yet'}));
 for(const q of pins){const label=(q.type=='app'?'◆ ':'▸ ')+(q.label||q.target);out.push(item(label,()=>q.type=='app'?launchApp(q.target):openPath(q.target)))}
 return out;
}
function universal(target){const out=[];const appBtn=target.closest?.('#dock button[data-a]');if(appBtn){const id=appAliases[appBtn.dataset.a];if(id){const q={type:'app',target:id,label:appNames[id]||id};out.push(item(isPinned(q)?'Unpin '+q.label+' from Quick Launch':'Pin '+q.label+' to Quick Launch',()=>isPinned(q)?unpinQuick(q):pinQuick(q)),sep('Universal'))}}
 out.push(...quickItems());out.push(sep('Universal'),item('Open Files',()=>launchApp('files')),item('Open Terminal',()=>window.dispatchEvent(new CustomEvent('curios:terminal-toggle'))));return out}

document.addEventListener('contextmenu',async e=>{e.preventDefault();close();const w=e.target.closest?.('.win'),id=w?.dataset?.winId;let local=[];if(id&&providers.has(id)){try{local=await providers.get(id)(e)||[]}catch{local=[]}}
 const rendered=[];if(local.length){rendered.push(sep(appNames[id]||'App'));for(const a of local){if(a.separator)rendered.push(sep(a.separator));else rendered.push(item(a.label,a.action,a.danger?'danger':'',!!a.disabled,a.children))}rendered.push(sep('Universal'))}
 rendered.push(...universal(e.target));show(e.clientX,e.clientY,rendered)
},{capture:true});
document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('#ctx'))close()},true);addEventListener('blur',close);

// Touch devices: long-press is the universal context-menu gesture.
let lpTimer=0,lpStart=null;
document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.button!==0)return;lpStart={x:e.clientX,y:e.clientY,target:e.target};clearTimeout(lpTimer);lpTimer=setTimeout(()=>{lpTimer=0;lpStart?.target?.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:lpStart.x,clientY:lpStart.y}))},520)},true);
document.addEventListener('pointermove',e=>{if(lpStart&&Math.hypot(e.clientX-lpStart.x,e.clientY-lpStart.y)>12){clearTimeout(lpTimer);lpTimer=0;lpStart=null}},true);
for(const ev of ['pointerup','pointercancel'])document.addEventListener(ev,()=>{clearTimeout(lpTimer);lpTimer=0;lpStart=null},true);
