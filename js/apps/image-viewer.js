// CuriOS Images: viewer-first, layered non-destructive image editor.
import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';
import {registerContext} from '../shell/context.js';
const IMAGE=/\.(png|jpe?g|gif|webp|bmp|svg|avif|cimg)$/i;
export const isImage=p=>IMAGE.test(p);
const q=(s)=>String(s||'').split('/').pop();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const filters={None:'none',Grayscale:'grayscale(1)',Sepia:'sepia(1)',Contrast:'contrast(1.6)',Vintage:'sepia(.45) saturate(.75) contrast(.9)',Brighten:'brightness(1.3)',Blur:'blur(2px)'};
const readBlob=async p=>V.blob?V.blob(p):new Blob([await V.read(p)]);
const store=async(p,blob)=>{if(V.put)await V.put(p,blob);else await V.write(p,await blob.arrayBuffer());window.dispatchEvent(new CustomEvent('curios:vfs-changed',{detail:{paths:[p]}}))};
const blobURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)});
const imageFrom=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Unable to decode image'));im.src=src});
let api=null;
export function imageViewer(openPath){
 if(api){if(openPath)api.open(openPath);return win('images','Images',980,700,()=>{})}
 return win('images','Images',980,700,b=>{
  b.classList.add('image-editor','cimg-app');
  let current='',mode='viewer',layers=[],selected=null,zoom=1,drag=null,undoStack=[],busy=false;
  let W=1280,H=720;
  const el=(tag,props={},...children)=>h(tag,props,...children);
  const button=(name,fn)=>el('button',{className:'btn',textContent:name,onclick:fn});
  const bar=el('div',{className:'cimg-toolbar'}),canvas=el('canvas',{className:'cimg-canvas'}),ctx=canvas.getContext('2d'),stage=el('div',{className:'cimg-stage'}),layerPanel=el('aside',{className:'cimg-layers'}),layout=el('div',{className:'cimg-layout'}),status=el('div',{className:'image-info'}),title=el('strong',{textContent:'Images'});
  const modeBtn=button('Enter Editor',()=>setMode(mode==='viewer'?'editor':'viewer'));
  const snapshot=()=>{undoStack.push(JSON.stringify({layers:layers.map(({img,...rest})=>rest),selected,W,H}));if(undoStack.length>30)undoStack.shift()};
  const active=()=>layers.find(l=>l.id===selected);
  const addLayer=async(src,name,save=true)=>{const img=await imageFrom(src);if(save)snapshot();const l={id:crypto.randomUUID(),name:name||'Image Layer',src,img,x:0,y:0,w:img.naturalWidth,h:img.naturalHeight,opacity:100,visible:true,filter:'None',rotation:0};layers.push(l);selected=l.id;draw();return l};
  const draw=(refresh=true)=>{canvas.width=W;canvas.height=H;ctx.clearRect(0,0,W,H);for(const l of layers){if(!l.visible||!l.img)continue;ctx.save();ctx.globalAlpha=l.opacity/100;ctx.filter=filters[l.filter]||'none';ctx.translate(l.x+l.w/2,l.y+l.h/2);ctx.rotate(l.rotation*Math.PI/180);ctx.drawImage(l.img,-l.w/2,-l.h/2,l.w,l.h);ctx.restore()}canvas.style.width=(W*zoom)+'px';canvas.style.height=(H*zoom)+'px';status.textContent=`${q(current)||'Untitled'} · ${W} × ${H} · ${Math.round(zoom*100)}% · ${layers.length} layer${layers.length===1?'':'s'}`;if(refresh)renderLayers()};
  const renderLayers=()=>{layerPanel.replaceChildren(el('strong',{textContent:'Layers'}),button('+ Add Image Layer',pickLayer),...layers.slice().reverse().map(l=>{const eye=button(l.visible?'◉':'○',()=>{snapshot();l.visible=!l.visible;draw()});eye.title='Toggle layer visibility';const row=el('div',{className:'cimg-layer'+(selected===l.id?' chosen':''),onclick:()=>{selected=l.id;renderLayers()}},eye,el('span',{textContent:l.name,className:'cimg-layer-name'}));row.dataset.layerId=l.id;return row}));const l=active();if(!l)return;const range=(label,key,min,max,step=1)=>{const value=el('span',{textContent:String(l[key])});const input=el('input',{type:'range',min,max,step,value:l[key],oninput:e=>{l[key]=Number(e.target.value);value.textContent=String(l[key]);drawCanvasOnly()},onchange:()=>draw()});return el('label',{className:'cimg-control'},el('span',{textContent:label+' '} ,value),input)};layerPanel.append(range('Opacity','opacity',0,100),range('Width','w',1,Math.max(4000,W*4)),range('Height','h',1,Math.max(4000,H*4)),range('X','x',-W,W*2),range('Y','y',-H,H*2),range('Rotation','rotation',-180,180));const select=el('select',{onchange:e=>{snapshot();l.filter=e.target.value;draw()}});for(const f of Object.keys(filters)){const opt=el('option',{value:f,textContent:f});opt.selected=f===l.filter;select.append(opt)}layerPanel.append(el('label',{className:'cimg-control'},'Filter',select),button('Duplicate',duplicate),button('Delete',remove),button('Move Up',()=>reorder(1)),button('Move Down',()=>reorder(-1)))};
  const drawCanvasOnly=()=>draw(false);
  const setMode=m=>{mode=m;modeBtn.textContent=m==='viewer'?'Enter Editor':'Return to Viewer';b.classList.toggle('cimg-editing',m==='editor');renderToolbar();draw()};
  const pickFile=()=>new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>resolve(input.files?.[0]||null);input.click()});
  async function pickLayer(){try{const f=await pickFile();if(f)await addLayer(await blobURL(f),f.name)}catch(e){alert(e.message)}}
  function duplicate(){const l=active();if(!l)return;snapshot();const copy={...l,id:crypto.randomUUID(),name:l.name+' copy',x:l.x+20,y:l.y+20};layers.splice(layers.indexOf(l)+1,0,copy);selected=copy.id;draw()}
  function remove(){const l=active();if(!l||layers.length===1)return;snapshot();layers=layers.filter(x=>x!==l);selected=layers.at(-1)?.id;draw()}
  function reorder(d){const l=active(),i=layers.indexOf(l),j=i+d;if(i<0||j<0||j>=layers.length)return;snapshot();[layers[i],layers[j]]=[layers[j],layers[i]];draw()}
  function undo(){const prev=undoStack.pop();if(!prev)return;const s=JSON.parse(prev);W=s.W;H=s.H;selected=s.selected;Promise.all(s.layers.map(async l=>({...l,img:await imageFrom(l.src)}))).then(v=>{layers=v;draw()}).catch(e=>alert(e.message))}
  const zoomBy=n=>{zoom=clamp(zoom*n,.1,4);draw()};
  async function open(p){if(!p||busy)return;busy=true;try{const blob=await readBlob(p);if(/\.cimg$/i.test(p)){const doc=JSON.parse(await blob.text());if(doc.version!==1||!Array.isArray(doc.layers))throw new Error('Unsupported CuriOS image document');const decoded=await Promise.all(doc.layers.map(async l=>({...l,img:await imageFrom(l.src)})));W=doc.width;H=doc.height;layers=decoded;selected=layers.at(-1)?.id}else{const src=await blobURL(blob),im=await imageFrom(src);W=im.naturalWidth;H=im.naturalHeight;layers=[];selected=null;await addLayer(src,q(p),false)}current=p;undoStack=[];zoom=Math.min(1,720/W,470/H);title.textContent=q(p);setMode('viewer')}catch(e){alert('Unable to open image: '+e.message)}finally{busy=false}}
  async function saveProject(){try{const p=prompt('Save editable project as',current.replace(/\.[^/.]+$/, '')+'.cimg'||'/Pictures/Untitled.cimg');if(!p)return;const data={version:1,width:W,height:H,layers:layers.map(({img,...rest})=>rest)};await store(p,new Blob([JSON.stringify(data)],{type:'application/json'}));status.textContent='Saved project: '+p}catch(e){alert(e.message)}}
  async function exportImage(){try{const fmt=(prompt('Export format: png, jpeg, webp','png')||'png').toLowerCase();if(!['png','jpeg','webp'].includes(fmt))return;const path=prompt('Export image to',current.replace(/\.[^/.]+$/, '')+'.'+(fmt==='jpeg'?'jpg':fmt)||'/Pictures/Export.png');if(!path)return;draw();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/'+fmt,.92));if(!blob)throw new Error('Export failed');await store(path,blob);status.textContent='Exported '+path}catch(e){alert(e.message)}}
  const renderToolbar=()=>{bar.replaceChildren(title,modeBtn,button('−',()=>zoomBy(.8)),button('+',()=>zoomBy(1.25)),button('Fit',()=>{zoom=Math.min(1,720/W,470/H);draw()}));if(mode==='editor')bar.append(button('Add Layer',pickLayer),button('Undo',undo),button('Save Project',saveProject),button('Export',exportImage));else bar.append(button('Export',exportImage))};
  canvas.addEventListener('pointerdown',e=>{if(mode!=='editor'||e.button!==0||!active())return;const r=canvas.getBoundingClientRect();drag={id:selected,x:e.clientX,y:e.clientY,ox:active().x,oy:active().y};snapshot();canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const l=layers.find(x=>x.id===drag.id);if(!l)return;l.x=Math.round(drag.ox+(e.clientX-drag.x)/zoom);l.y=Math.round(drag.oy+(e.clientY-drag.y)/zoom);draw()});
  canvas.addEventListener('pointerup',()=>{drag=null});canvas.addEventListener('pointercancel',()=>{drag=null});
  const unreg=registerContext('images',e=>{const onLayer=e.target.closest('.cimg-layer');if(onLayer){selected=onLayer.dataset.layerId;renderLayers()}const l=active();return [{label:mode==='viewer'?'Enter Editor Mode':'Return to Viewer Mode',action:()=>setMode(mode==='viewer'?'editor':'viewer')},...(mode==='editor'?[{separator:'Layer Actions'},{label:'Add Image Layer',action:pickLayer},{label:'Duplicate Layer',action:duplicate,disabled:!l},{label:l?.visible?'Hide Layer':'Show Layer',action:()=>{if(l){snapshot();l.visible=!l.visible;draw()}},disabled:!l},{label:'Layer Filter',children:Object.keys(filters).map(f=>({label:f,action:()=>{if(l){snapshot();l.filter=f;draw()}}}))},{label:'Move Layer Up',action:()=>reorder(1)},{label:'Move Layer Down',action:()=>reorder(-1)},{label:'Delete Layer',action:remove,disabled:layers.length<2},{separator:'Document'},{label:'Undo',action:undo,disabled:!undoStack.length},{label:'Save Editable Project (.cimg)',action:saveProject}]:[]),{label:'Export Image',action:exportImage}]});
  stage.append(canvas);layout.append(stage,layerPanel);b.append(bar,layout,status);renderToolbar();setMode('viewer');api={open};if(openPath)open(openPath);
  return()=>{unreg();api=null};
 });
}
