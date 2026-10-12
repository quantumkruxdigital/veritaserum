// CuriOS dock: movable launcher/app icons + fixed Volume and Session controls.
import {alchemy} from '../apps/alchemy.js';
import {files} from '../apps/files.js';
import {scribe} from '../apps/scribe.js';
import {media} from '../apps/media.js';
import {imageViewer} from '../apps/image-viewer.js';
import {videoImporter} from '../apps/video-importer.js';
import {settings} from '../apps/settings.js';
import {vault} from '../apps/vault.js';
import {photoAlbum} from '../apps/photo-album.js';
import {reelMagick} from '../apps/reel-magick.js';
import {ppl} from '../apps/ppl.js';
import {rift} from '../apps/rift.js';
import {retroBox} from '../apps/retro-box.js';
import {voyager} from '../apps/voyager.js';
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
const PLACEMENT_KEY='curios.dock.placement.v1';
const PLACEMENTS=['top','bottom','right'];
export function getDockPlacement(){
 const saved=localStorage.getItem(PLACEMENT_KEY)||'right';
 return PLACEMENTS.includes(saved)?saved:'right';
}
export function setDockPlacement(position){
 if(!PLACEMENTS.includes(position))return;
 localStorage.setItem(PLACEMENT_KEY,position);
 applyDockPlacement();
}
function applyDockPlacement(){
 const dock=document.getElementById('dock');if(!dock)return;
 const placement=getDockPlacement();
 dock.dataset.placement=placement;
 document.getElementById('fit')?.classList.toggle('dock-right-default-layout',placement==='right');
 const clock=document.getElementById('clk');
 const fit=document.getElementById('fit');
 if(clock&&fit){
  if(placement==='right'){
   if(clock.parentElement!==fit)fit.appendChild(clock);
   clock.classList.add('desktop-clock');
  }else{
   if(clock.parentElement!==dock)dock.insertBefore(clock,document.getElementById('dock-right'));
   clock.classList.remove('desktop-clock');
  }
 }
}


const apps={
 voyager:{name:'Voyager',open:voyager,icon:'assets/apps/voyager.svg'},
 retrobox:{name:'Retro-Box',open:retroBox,icon:'assets/apps/retrobox-custom.png'},
 rift:{name:'RIFT',open:rift,icon:'assets/apps/rift.svg'},
 files:{name:'Files',open:files,icon:'assets/apps/files.png'},
 media:{name:'Media',open:media,icon:'assets/apps/media.png'},
 images:{name:'Images',open:imageViewer,icon:'assets/apps/images.png'},
 videoimport:{name:'Video Importer',open:videoImporter,icon:'assets/apps/videoimport.png'},
 scribe:{name:'Scribe',open:()=>scribe('/Documents/untitled.scribe'),icon:'assets/apps/scribe.png'},
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
let dragDroppedInside=false;
let dragEndPoint=null;

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
  title:editMode?(id==='menu'?'Drag to rearrange':'Drag to rearrange or off dock to unpin'):undefined
 };
}

function iconButton(id){
 const a=apps[id];
 const b=h('button',{
  ...movableProps(id),
  className:'dock-app dock-movable',
  title:editMode?'Drag to rearrange or off dock to unpin':a.name,
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
 applyDockPlacement();
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
 const vertical=localStorage.getItem('curios.dock.placement.v1')==='right' || document.documentElement.dataset.dockPlacement==='right';
 if(vertical){
  pop.style.left=Math.max(4,Math.min(1090,(r.left-f.left)/S-200))+'px';
  pop.style.top=Math.max(4,Math.min(700,(r.top-f.top)/S-30))+'px';
 }else{
  pop.style.left=Math.max(4,Math.min(1090,(r.left-f.left)/S-60))+'px';
  pop.style.top='84px';
 }
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

// Spatial app launcher: a keyboard-accessible, gently orbiting carousel.
const carouselGroups={
 upper:{Explore:['voyager','rift','retrobox','media','ppl'],Create:['images','reelmagick','photos','videoimport'],Educate:['welcome']},
 lower:{Office:['scribe','files'],System:['sys','vault'],Utilities:['alchemy']}
};
const carouselCategory={upper:'Explore',lower:'Office'};
let carouselOpen=false,carouselSelection=0,carouselQuery='';
// A single rotation state survives category changes and carousel redraws.
let carouselCloseTimer=0,carouselAngle=0,carouselVelocity=0,carouselDragging=false,carouselPointer=null,carouselLastX=0,carouselLastTime=0,carouselFrame=0,carouselFrameTime=0;
let carouselUpperVelocity=0;
let carouselUpperAngle=0,carouselActiveRing='lower'; // Lower ring is the default browsing focus.
function animateCarousel(time){
 const dt=Math.min(48,time-(carouselFrameTime||time));carouselFrameTime=time;
 if(carouselOpen){
  if(!carouselDragging||carouselActiveRing!=='lower'){
   carouselAngle+=(carouselVelocity||0)*dt;
   carouselVelocity*=Math.pow(.94,dt/16);
   if(Math.abs(carouselVelocity)<.003){carouselVelocity=0;carouselAngle+=360*dt/68000}
  }
  const lower=carouselRoot.querySelector('.curios-carousel-orbit.lower');
  const upper=carouselRoot.querySelector('.curios-carousel-orbit.upper');
  const lowerSub=carouselRoot.querySelector('.curios-carousel-orbit.lower-sub');
  const upperSub=carouselRoot.querySelector('.curios-carousel-orbit.upper-sub');
  if(lower)lower.style.transform=`rotateX(-30deg) rotateY(${carouselAngle}deg) scale3d(${carouselActiveRing==='lower'?1.2:1},${carouselActiveRing==='lower'?1.2:1},${carouselActiveRing==='lower'?1.2:1})`;
  if(!carouselDragging||carouselActiveRing!=='upper'){
   carouselUpperAngle+=carouselActiveRing==='upper'?carouselUpperVelocity*dt:0;
   if(carouselActiveRing==='upper'){carouselUpperVelocity*=Math.pow(.94,dt/16);if(Math.abs(carouselUpperVelocity)<.003)carouselUpperVelocity=0;}
   if(!carouselUpperVelocity)carouselUpperAngle-=360*dt/82000;
  }
  if(lowerSub)lowerSub.style.transform=`rotateX(-30deg) rotateY(${-carouselAngle*.78}deg) scale3d(${carouselActiveRing==='lower'?1.2:1},${carouselActiveRing==='lower'?1.2:1},${carouselActiveRing==='lower'?1.2:1})`;
  if(upperSub)upperSub.style.transform=`rotateX(-30deg) rotateY(${-carouselUpperAngle*.78}deg) scale3d(${carouselActiveRing==='upper'?1.2:1},${carouselActiveRing==='upper'?1.2:1},${carouselActiveRing==='upper'?1.2:1})`;
  if(upper)upper.style.transform=`rotateX(-30deg) rotateY(${carouselUpperAngle}deg) scale3d(${carouselActiveRing==='upper'?1.2:1},${carouselActiveRing==='upper'?1.2:1},${carouselActiveRing==='upper'?1.2:1})`;
  // Depth-sort both orbital tiers, keeping near-side apps visually above far-side apps.
  for(const orbit of [upper,lower,upperSub,lowerSub]){
   if(!orbit)continue;
   const phase=orbit===upper?carouselUpperAngle:orbit===lower?carouselAngle:orbit===upperSub?-carouselUpperAngle*.78:-carouselAngle*.78;
   orbit.querySelectorAll('.curios-carousel-item').forEach(item=>{
    const angle=parseFloat(item.style.getPropertyValue('--angle'))||0;
    item.style.zIndex=String(Math.round(100+90*Math.cos((angle+phase)*Math.PI/180)));
   });
  }
  carouselFrame=requestAnimationFrame(animateCarousel);
 }
}
function bindCarouselDrag(stage){
 stage.addEventListener('pointerdown',e=>{
  // App cards remain clickable; empty gaps act as a grab handle.
  if(e.button!==0||e.target.closest('.curios-carousel-item'))return;
  const ring=e.target.closest('.curios-carousel-orbit');
  if(ring)selectCarouselRing((ring.classList.contains('upper')||ring.classList.contains('upper-sub'))?'upper':'lower',false);
  carouselDragging=true;carouselPointer=e.pointerId;carouselLastX=e.clientX;carouselLastTime=performance.now();if(carouselActiveRing==='upper')carouselUpperVelocity=0;else carouselVelocity=0;
  stage.setPointerCapture(e.pointerId);stage.classList.add('grabbing');e.preventDefault();
 });
 stage.addEventListener('pointermove',e=>{
  if(!carouselDragging||e.pointerId!==carouselPointer)return;
  const now=performance.now(),dx=e.clientX-carouselLastX,dt=Math.max(8,now-carouselLastTime);
  if(carouselActiveRing==='upper'){carouselUpperAngle+=dx*.38;carouselUpperVelocity=Math.max(-.65,Math.min(.65,dx*.38/dt))}
  else{carouselAngle+=dx*.38;carouselVelocity=Math.max(-.65,Math.min(.65,dx*.38/dt))}
  carouselLastX=e.clientX;carouselLastTime=now;e.preventDefault();
 });
 const release=e=>{
  if(!carouselDragging||e.pointerId!==carouselPointer)return;
  carouselDragging=false;carouselPointer=null;stage.classList.remove('grabbing');
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
 };
 stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
}

const carouselRoot=h('div',{className:'curios-carousel-overlay',role:'dialog','aria-label':'CuriOS application launcher','aria-modal':'true'});
carouselRoot.hidden=true;
$('#fit').append(carouselRoot);
// Categories remain on the primary orbit until they contain at least five apps.
// Larger categories can be expanded as a dedicated orbit by selecting their tab.
const expandedCarouselCategory={upper:null,lower:null};
const categoryCount=(ring,category)=>carouselGroups[ring][category].filter(id=>apps[id]).length;
const ringEntries=(ring)=>{
 const groups=carouselGroups[ring];
 const expanded=expandedCarouselCategory[ring];
 // Main tier remains a 3D orbit; only an explicitly expanded category moves to its own orbit.
 const ids=Object.entries(groups).flatMap(([category,items])=>category===expanded&&categoryCount(ring,category)>=5?[]:items);
 return [...new Set(ids)].filter(id=>apps[id]&&apps[id].name.toLowerCase().includes(carouselQuery.toLowerCase()));
};
const subRingEntries=(ring)=>{
 const category=expandedCarouselCategory[ring];
 if(!category||categoryCount(ring,category)<5)return [];
 return [...new Set(carouselGroups[ring][category])].filter(id=>apps[id]&&apps[id].name.toLowerCase().includes(carouselQuery.toLowerCase()));
};
const browseEntries=(ring)=>[...ringEntries(ring),...subRingEntries(ring)];
const carouselIds=()=>[...browseEntries('upper'),...browseEntries('lower')];
function closeCarousel(){
 if(!carouselOpen)return;
 carouselOpen=false;carouselDragging=false;carouselPointer=null;cancelAnimationFrame(carouselFrame);carouselFrameTime=0;carouselRoot.classList.remove('active');document.dispatchEvent(new CustomEvent('curios:carousel-close'));clearTimeout(carouselCloseTimer);carouselCloseTimer=setTimeout(()=>{if(!carouselOpen)carouselRoot.hidden=true},500);
}
function launchCarouselApp(id){closeCarousel();apps[id]?.open()}
function selectCarouselRing(ring,redraw=true){
 const ids=carouselIds(),entries=browseEntries(ring);if(!entries.length)return;
 carouselActiveRing=ring;
 if(!entries.includes(ids[carouselSelection]))carouselSelection=ids.indexOf(entries[0]);
 if(redraw)drawCarousel();
 else{const stage=carouselRoot.querySelector('.curios-carousel-stage');stage?.classList.toggle('focus-upper',ring==='upper');stage?.classList.toggle('focus-lower',ring==='lower');}
}
function drawCarousel(){
 const ids=carouselIds();if(carouselSelection>=ids.length)carouselSelection=0;
 const backdrop=h('div',{className:'curios-carousel-backdrop',onclick:closeCarousel});
 const shell=h('section',{className:'curios-carousel-shell'});
 const head=h('header',{className:'curios-carousel-header'},
  h('div',{},h('span',{className:'curios-carousel-kicker',textContent:'CuriOS / APPLICATIONS'})),
  h('button',{className:'curios-carousel-close',textContent:'×',title:'Close launcher',onclick:closeCarousel}));
 const search=h('input',{className:'curios-carousel-search',type:'search',placeholder:'Find an application…',value:carouselQuery,'aria-label':'Search applications',oninput(){carouselQuery=search.value;carouselSelection=0;drawCarousel();const el=carouselRoot.querySelector('.curios-carousel-search');el?.focus();el?.setSelectionRange(carouselQuery.length,carouselQuery.length)}});
 const tabs=h('div',{className:'curios-carousel-category-groups'},...['upper','lower'].map(r=>h('nav',{className:'curios-carousel-tabs','aria-label':(r==='upper'?'Upper':'Lower')+' ring categories'},h('span',{className:'curios-carousel-category-label',textContent:r==='upper'?'UPPER':'LOWER'}),...Object.keys(carouselGroups[r]).map(group=>h('button',{className:carouselCategory[r]===group?'selected':'',textContent:group+(categoryCount(r,group)>=5?' · '+categoryCount(r,group):''),title:categoryCount(r,group)>=5?'Open or close '+group+' sub-ring':'Included on primary ring',onclick(){carouselCategory[r]=group;expandedCarouselCategory[r]=categoryCount(r,group)>=5?(expandedCarouselCategory[r]===group?null:group):null;carouselActiveRing=r;carouselSelection=0;drawCarousel()}})))));
 const stage=h('div',{className:'curios-carousel-stage '+(carouselActiveRing==='upper'?'focus-upper':'focus-lower')});
 const upper=h('div',{className:'curios-carousel-orbit upper','aria-label':'Upper app ring',onclick:e=>{if(!e.target.closest('.curios-carousel-item'))selectCarouselRing('upper')}});
 const upperSub=h('div',{className:'curios-carousel-orbit upper-sub','aria-label':'Expanded upper category orbit'});
 const lowerSub=h('div',{className:'curios-carousel-orbit lower-sub','aria-label':'Expanded lower category orbit'});
 const lower=h('div',{className:'curios-carousel-orbit lower','aria-label':'Lower app ring',onclick:e=>{if(!e.target.closest('.curios-carousel-item'))selectCarouselRing('lower')}});
 bindCarouselDrag(stage);
 if(ids.length){
  // Keep the primary/bottom ring populated even when a category has only one app.
  const upperIds=ringEntries('upper');
  const lowerIds=ringEntries('lower');
  const populate=(ring,entries,primary)=>{
   const radius=entries.length<=3?165:Math.min(265,175+entries.length*12);
   entries.forEach((id,index)=>{
    const a=apps[id],angle=360*index/entries.length;
    const item=h('button',{className:'curios-carousel-item'+(id===ids[carouselSelection]?' selected':''),style:`--angle:${angle}deg;--radius:${radius}px`,title:a.name,'aria-label':'Open '+a.name,onclick(){carouselActiveRing=primary?'lower':'upper';launchCarouselApp(id)},oncontextmenu:e=>{e.preventDefault();e.stopPropagation();if(id==='sys')return;toggleDockPin(id);drawCarousel()}});
    if(a.icon)item.append(h('img',{src:a.icon,alt:''}));else item.append(h('span',{textContent:a.name.slice(0,1)}));
    item.append(h('span',{className:'curios-carousel-item-label',textContent:a.name}));ring.append(item);
   });
  };
  populate(upper,upperIds,false);populate(lower,lowerIds,true);
  populate(upperSub,subRingEntries('upper'),false);populate(lowerSub,subRingEntries('lower'),true);
  // The lower ring is the browsing focus. Upper apps remain directly clickable.
  const activeEntries=carouselActiveRing==='upper'&&browseEntries('upper').length?browseEntries('upper'):browseEntries('lower');
  if(!activeEntries.includes(ids[carouselSelection]))carouselSelection=ids.indexOf(activeEntries[0]);
 }else stage.append(h('p',{className:'curios-carousel-empty',textContent:'No matching applications'}));
 stage.append(upper,lower,upperSub,lowerSub);
 const selected=ids[carouselSelection];
 const ringControls=h('div',{className:'curios-carousel-ring-switch','aria-label':'Choose active carousel ring'},
  ...['upper','lower'].map(r=>h('button',{className:carouselActiveRing===r?'active':'',textContent:r==='upper'?'Upper · '+carouselCategory.upper:'Lower · '+carouselCategory.lower,onclick(){selectCarouselRing(r)},'aria-pressed':String(carouselActiveRing===r),disabled:!browseEntries(r).length})));
 const foot=h('footer',{className:'curios-carousel-footer'},
  h('button',{textContent:'←',title:'Previous app',onclick(){carouselSelection=nextRingSelection(-1);drawCarousel()}}),
  h('span',{textContent:selected?apps[selected].name:'No results'}),
  h('button',{textContent:'→',title:'Next app',onclick(){carouselSelection=nextRingSelection(1);drawCarousel()}}),
  h('small',{textContent:'Drag or flick between apps to spin · Click to open · Right-click to pin'}));
 shell.append(head,search,tabs,ringControls,stage,foot);carouselRoot.replaceChildren(backdrop,shell);
}
function nextRingSelection(delta){
 const ids=carouselIds(),entries=browseEntries(carouselActiveRing);if(!entries.length)return carouselSelection;
 const index=Math.max(0,entries.indexOf(ids[carouselSelection]));
 return ids.indexOf(entries[(index+delta+entries.length)%entries.length]);
}
function toggleCarousel(){
 if(carouselOpen){closeCarousel();return}
 if(document.querySelector('#lock'))return;
 closePop();carouselOpen=true;carouselQuery='';carouselSelection=0;carouselActiveRing='lower';carouselUpperVelocity=0;
 clearTimeout(carouselCloseTimer);carouselRoot.hidden=false;document.dispatchEvent(new CustomEvent('curios:carousel-open'));drawCarousel();carouselFrameTime=0;carouselFrame=requestAnimationFrame(animateCarousel);requestAnimationFrame(()=>carouselRoot.classList.add('active'));
}
document.addEventListener('keydown',e=>{
 if(!carouselOpen)return;
 if(e.key==='Escape'){e.preventDefault();closeCarousel()}
 else if(e.target.tagName!=='INPUT'&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();selectCarouselRing(e.key==='ArrowUp'?'upper':'lower')}
 else if(e.target.tagName!=='INPUT'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
  e.preventDefault();const n=carouselIds().length;if(!n)return;
  carouselSelection=nextRingSelection(e.key==='ArrowRight'?1:-1);drawCarousel();
 }else if(e.target.tagName!=='INPUT'&&e.key==='Enter'){
  const id=carouselIds()[carouselSelection];if(id)launchCarouselApp(id);
 }
});
document.addEventListener('curios:session-lock',closeCarousel);
document.addEventListener('curios:session-logout',closeCarousel);

$('#dock').onclick=e=>{
 const b=e.target.closest('button[data-a]');if(!b)return;
 e.stopPropagation();const a=b.dataset.a;
 if(a==='menu'){
  if(editMode)return;
  toggleCarousel();
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
 dragged=b;dragDroppedInside=false;dragEndPoint=null;b.classList.add('dock-dragging');
 e.dataTransfer.effectAllowed='move';
 e.dataTransfer.setData('text/plain',b.dataset.dockItem);
});
left.addEventListener('dragover',e=>{
 if(!editMode||!dragged)return;
 e.preventDefault();e.dataTransfer.dropEffect='move';
 const target=e.target.closest('[data-dock-item]');
 if(!target||target===dragged)return;
 const r=target.getBoundingClientRect();
 const vertical=getDockPlacement()==='right';
 const before=vertical?e.clientY<r.top+r.height/2:e.clientX<r.left+r.width/2;
 left.insertBefore(dragged,before?target:target.nextSibling);
});
left.addEventListener('drop',e=>{
 if(!editMode||!dragged)return;
 e.preventDefault();
 dragDroppedInside=true;
 storeOrder([...left.querySelectorAll('[data-dock-item]')].map(x=>x.dataset.dockItem));
});
// Dragging a pinned app outside the whole dock unpins its shortcut.
// The application itself is never deleted; the permanent Apps launcher stays.
left.addEventListener('dragend',e=>{
 if(!dragged)return;
 const id=dragged.dataset.dockItem;
 const dock=$('#dock');
 const bounds=dock.getBoundingClientRect();
 const x=e.clientX,y=e.clientY;
 const outside=Number.isFinite(x)&&Number.isFinite(y)&&
   (x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom);
 dragged.classList.remove('dock-dragging');dragged=null;
 if(!dragDroppedInside&&outside&&id!=='menu'&&pins().includes(id)){
  const remaining=pins().filter(pin=>pin!==id);
  storePins(remaining);
  storeOrder(order().filter(item=>item!==id));
  renderDock();
 }else{
  storeOrder([...left.querySelectorAll('[data-dock-item]')].map(item=>item.dataset.dockItem));
 }
 dragDroppedInside=false;
});

addEventListener('pointerdown',e=>{if(!e.target.closest('#pop,#dock'))closePop()});
addEventListener('curios:dock-refresh',()=>renderDock());
