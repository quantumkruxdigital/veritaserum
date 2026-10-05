import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';

const IMAGE=/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i;
export const isImage=p=>IMAGE.test(p);
let api=null,obj=null;
export function imageViewer(openPath){
 if(api){if(openPath)api.open(openPath);return win('images','Images',720,560,()=>{})}
 return win('images','Images',720,560,b=>{
  b.classList.add('image-viewer');
  const title=h('div',{className:'image-title',textContent:'Image Viewer'}),stage=h('div',{className:'image-stage'}),img=h('img',{alt:''}),info=h('div',{className:'image-info'});
  let scale=1,rotation=0,current='';
  const apply=()=>img.style.transform=`scale(${scale}) rotate(${rotation}deg)`;
  const open=async p=>{if(!p||!isImage(p))return;current=p;if(obj)URL.revokeObjectURL(obj);const blob=V.blob?await V.blob(p):new Blob([await V.read(p)]);obj=URL.createObjectURL(blob);img.src=obj;title.textContent=p.split('/').pop();scale=1;rotation=0;apply();info.textContent=p};
  const tools=h('div',{className:'image-tools'},
   h('button',{className:'btn',textContent:'−',onclick:()=>{scale=Math.max(.1,scale-.1);apply()}}),
   h('button',{className:'btn',textContent:'100%',onclick:()=>{scale=1;rotation=0;apply()}}),
   h('button',{className:'btn',textContent:'+',onclick:()=>{scale=Math.min(8,scale+.1);apply()}}),
   h('button',{className:'btn',textContent:'↻',onclick:()=>{rotation=(rotation+90)%360;apply()}}));
  stage.append(img);b.append(title,tools,stage,info);api={open};if(openPath)open(openPath);
 })
}
