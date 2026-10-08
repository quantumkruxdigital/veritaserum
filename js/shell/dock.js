// CuriOS dock: movable launcher/app icons + fixed Volume and Session controls.
import {alchemy} from '../apps/alchemy.js';
import {files} from '../apps/files.js';
import {scribe} from '../apps/scribe.js';
import {sam} from '../apps/sam.js';
import {media} from '../apps/media.js';
import {imageViewer} from '../apps/image-viewer.js';
import {videoImporter} from '../apps/video-importer.js';
import {settings} from '../apps/settings.js';
import {vault} from '../apps/vault.js';
import {photoAlbum} from '../apps/photo-album.js';
import {reelMagick} from '../apps/reel-magick.js';
import {ppl} from '../apps/ppl.js';
import {showWelcome} from '../apps/welcome.js';
import {beep} from '../kernel/audio.js';
import {dev} from '../kernel/device.js';
import {set,sv} from '../kernel/state.js';
import {$,h} from '../kernel/util.js';
import {DEV} from '../kernel/vfs.js';
import {S,show,wins} from './wm.js';
import {lockSession,logoutSession} from './session.js';

const PIN_KEY='curios.dock.pins.v1';
const ORDER_KEY='curios.dock.order.v1';
const LEGACY_POS_KEY='curios.dock.launcherPosition.v1';

const apps={
 files:{name:'Files',open:files,icon:'assets/apps/files.png'},
 media:{name:'Media',open:media,icon:'assets/apps/media.png'},
 images:{name:'Images',open:imageViewer,icon:'assets/apps/images.png'},
 videoimport:{name:'Video Importer',open:videoImporter,icon:'assets/apps/videoimport.png'},
 scribe:{name:'Scribe',open:()=>scribe('/Documents/untitled.scribe'),icon:'assets/apps/scribe.png'},
 sam:{name:'SAM',open:sam},
 alchemy:{name:'Alchemy',open:alchemy,icon:'assets/apps/alchemy.png'},
 photos:{name:'Photo Album',open:photoAlbum,icon:'assets/apps/photoalbum.png'},
 reelmagick:{name:'Reel-Magick',open:reelMagick,icon:'assets/apps/reelmagick.png'},
 ppl:{name:'CuriOS-Ppl',open:ppl,icon:'assets/apps/ppl.png'},
 vault:{name:'Vault',open:vault,icon:'assets/apps/vault.png'},
 welcome:{name:'Welcome to CuriOS',open:()=>showWelcome()},
 sys:{name:'Settings',open:settings,icon:'assets/apps/settings.png'}
};

const I={
 menu:'<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
 vol:'<path d="M4 9h4l5-4v14l-5-4H4zM17 8c2 2 2 6 0 8"/>',
 session:'<path d="M12 3v9M7.2 5.8a8 8 0 1 0 9.6 0"/>'
};

let editMode=false;
let dragged=null;

function readJSON(key,fallback){
 try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}
}

const pins=()=>{
 const p=readJSON(PIN_KEY,['files']);
 return Array.isArray(p)?[...new Set(p.filter(id=>apps[id]&&id!=='sys'))]:['files'];
};
const storePins=a=>localStorage.setItem(PIN_KEY,JSON.stringify(a));

function legacyOrder(){
 const p=pins(),pos=localStorage.getItem(LEGACY_POS_KEY)||'left';
 return pos==='right'?[...p,'menu']:['menu',...p];
}

function order(){
 const p=pins();
 const raw=readJSON(ORDER_KEY,null);
 const base=Array.isArray(raw)?raw:legacyOrder();
 const allowed=new Set(['menu',...p]);
 const clean=[];
 for(const id of base){if(allowed.has(id)&&!clean.includes(id))clean.push(id)}
 if(!clean.includes('menu'))clean.unshift('menu');
 for(const id of p)if(!clean.includes(id))clean.push(id);
 localStorage.setItem(ORDER_KEY,JSON.stringify(clean));
 return clean;
}

function storeOrder(a){
 const clean=[];
 for(const id of a)if((id==='menu'||apps[id])&&!clean.includes(id))clean.push(id);
 if(!clean.includes('menu'))clean.unshift('menu');
 localStorage.setItem(ORDER_KEY,JSON.stringify(clean));
}

export const isDockPinned=id=>pins().includes(id);
export function toggleDockPin(id){
 if(!apps[id]||id==='sys')return;
 let p=pins(),o=order();
 if(p.includes(id)){
  p=p.filter(x=>x!==id);o=o.filter(x=>x!==id);
 }else{
  p.push(id);o.push(id);
 }
 storePins(p);storeOrder(o);renderDock();
}

function movableProps(id){
 return {
  className:'dock-movable',
  draggable:editMode,
  dataset:{dockItem:id},
  title:editMode?'Drag to rearrange':undefined
 };
}

function iconButton(id){
 const a=apps[id];
 const b=h('button',{
  ...movableProps(id),
  className:'dock-app dock-movable',
  title:editMode?'Drag to rearrange':a.name,
  dataset:{app:id,dockItem:id},
  onclick:e=>{if(editMode){e.preventDefault();return}if(wins[id])show(id);else a.open()}
 });
 if(a.icon)b.append(h('img',{src:a.icon,alt:''}));else b.textContent=a.name.slice(0,1);
 return b;
}

function menuButton(){
 const b=h('button',{
  ...movableProps('menu'),
  dataset:{a:'menu',dockItem:'menu'},
  title:editMode?'Drag to rearrange':'Apps'
 });
 b.innerHTML='<svg viewBox="0 0 24 24">'+I.menu+'</svg>';
 return b;
}

export function renderDock(){
 const left=$('#dock-left'),right=$('#dock-right'),dock=$('#dock');
 if(!left||!right||!dock)return;
 dock.classList.toggle('dock-editing',editMode);
 left.replaceChildren(...order().map(id=>id==='menu'?menuButton():iconButton(id)));
 const vol=h('button',{dataset:{a:'vol'},title:'Volume'}),session=h('button',{dataset:{a:'session'},title:'Lock / Log Out'});
 vol.innerHTML='<svg viewBox="0 0 24 24">'+I.vol+'</svg>';
 session.innerHTML='<svg viewBox="0 0 24 24">'+I.session+'</svg>';
 right.replaceChildren(vol,session);
}

export function setDockEditMode(on){editMode=!!on;renderDock()}
export function isDockEditing(){return editMode}

export const tick=()=>{
 const d=new Date(),p=n=>String(n).padStart(2,'0');
 let H=d.getHours();const s=set.h24?'':H>=12?' PM':' AM';
 if(!set.h24)H=H%12||12;
 const c=$('#clk');if(c)c.textContent=`${p(H)}:${p(d.getMinutes())}:${p(d.getSeconds())}${s}`;
};

tick();setInterval(tick,1000);renderDock();

const pop=$('#pop'),closePop=()=>pop.style.display='none';
function popAt(btn,...c){
 const r=btn.getBoundingClientRect(),f=$('#fit').getBoundingClientRect();
 pop.replaceChildren(...c);pop.style.display='block';
 pop.style.left=Math.max(4,Math.min(1090,(r.left-f.left)/S-60))+'px';
}
function popAtPoint(x,y,...c){
 const f=$('#fit').getBoundingClientRect();
 pop.replaceChildren(...c);pop.style.display='block';
 const px=(x-f.left)/S,py=(y-f.top)/S;
 pop.style.left=Math.max(4,Math.min(1090,px-60))+'px';
 pop.style.top=Math.max(74,Math.min(700,py+8))+'px';
}

function appEntry(id){
 const a=apps[id],b=h('button',{
  className:'launcher-app',
  onclick(){closePop();a.open()},
  oncontextmenu:e=>{
   e.preventDefault();e.stopPropagation();if(id==='sys')return;
   popAt(b,
    h('div',{className:'hd',textContent:a.name}),
    h('button',{textContent:isDockPinned(id)?'Unpin from Dock':'Pin to Dock',onclick(){toggleDockPin(id);closePop()}})
   );
  }
 });
 if(a.icon)b.append(h('img',{className:'app-icon',src:a.icon,alt:''}));
 b.append(document.createTextNode(a.name));
 return b;
}

$('#dock').onclick=e=>{
 const b=e.target.closest('button[data-a]');if(!b)return;
 e.stopPropagation();const a=b.dataset.a;
 if(a==='menu'){
  if(editMode)return;
  const ids=['files','media','images','videoimport','scribe','sam','alchemy','photos','reelmagick','ppl','vault'];
  const run=Object.entries(wins).map(([id,w])=>h('button',{textContent:(w.e.style.display==='none'?'○ ':'● ')+w.t,onclick(){closePop();show(id)}}));
  popAt(b,...ids.map(appEntry),h('div',{className:'launcher-settings-divider'}),appEntry('sys'),...(run.length?[h('div',{className:'hd',textContent:'Running (○ = minimized)',style:'margin:8px 0 2px;padding:0 10px'}),...run]:[]));
 }else if(a==='session'){
  popAt(b,h('div',{className:'hd',textContent:'Session'}),h('button',{textContent:'Lock',onclick(){closePop();lockSession()}}),h('button',{textContent:'Log Out',onclick(){closePop();logoutSession()}}));
 }else if(a==='vol'){
  const m=h('input',{type:'checkbox',checked:!!set.mute,onchange(){set.mute=+m.checked;sv();if(DEV)dev('volume',set.mute?'mute':'unmute').catch(()=>0)}}),
        r=h('input',{type:'range',min:0,max:100,value:set.vol,style:'width:100%',oninput(){set.vol=+r.value;set.mute=0;m.checked=false;sv();if(DEV)dev('volume','set',set.vol).then(()=>dev('volume','unmute')).catch(()=>0)}});
  popAt(b,h('label',{className:'s'},'Volume',r),h('label',{className:'s'},'Mute',m),h('button',{textContent:'Test tone',onclick:beep}));
 }
};

// Right-click empty dock space to enter/leave Edit Dock mode.
$('#dock').addEventListener('contextmenu',e=>{
 if(e.target.closest('#dock-right button'))return;
 if(e.target.closest('button')&&!editMode)return;
 e.preventDefault();e.stopPropagation();
 const items=[
  h('div',{className:'hd',textContent:'Dock'}),
  h('button',{textContent:editMode?'Done Editing Dock':'Edit Dock',onclick(){setDockEditMode(!editMode);closePop()}})
 ];
 if(editMode)items.push(h('button',{textContent:'Reset Dock Order',onclick(){localStorage.removeItem(ORDER_KEY);renderDock();closePop()}}));
 popAtPoint(e.clientX,e.clientY,...items);
});

const left=$('#dock-left');
left.addEventListener('dragstart',e=>{
 if(!editMode)return e.preventDefault();
 const b=e.target.closest('[data-dock-item]');if(!b)return;
 dragged=b;b.classList.add('dock-dragging');
 e.dataTransfer.effectAllowed='move';
 e.dataTransfer.setData('text/plain',b.dataset.dockItem);
});
left.addEventListener('dragover',e=>{
 if(!editMode||!dragged)return;
 e.preventDefault();e.dataTransfer.dropEffect='move';
 const target=e.target.closest('[data-dock-item]');
 if(!target||target===dragged)return;
 const r=target.getBoundingClientRect();
 const before=e.clientX<r.left+r.width/2;
 left.insertBefore(dragged,before?target:target.nextSibling);
});
left.addEventListener('drop',e=>{
 if(!editMode||!dragged)return;
 e.preventDefault();
 storeOrder([...left.querySelectorAll('[data-dock-item]')].map(x=>x.dataset.dockItem));
});
left.addEventListener('dragend',()=>{
 if(!dragged)return;
 dragged.classList.remove('dock-dragging');dragged=null;
 storeOrder([...left.querySelectorAll('[data-dock-item]')].map(x=>x.dataset.dockItem));
});

addEventListener('pointerdown',e=>{if(!e.target.closest('#pop,#dock'))closePop()});
addEventListener('curios:dock-refresh',()=>renderDock());
