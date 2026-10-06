import {set,sv} from './state.js';
import {V} from './vfs.js';

export const STOCK_WALLPAPERS=[
 {id:'superposition',name:'Superposition',url:'assets/superposition.png'},
 {id:'curios-circuit',name:'CuriOS Circuit',url:'assets/curios-circuit.svg'}
];
let objectUrl='';
export async function applyWallpaper(choice=set.wallpaper||{type:'stock',id:'curios-circuit'}){
 let url='assets/curios-circuit.svg';
 if(choice?.type==='stock')url=STOCK_WALLPAPERS.find(x=>x.id===choice.id)?.url||url;
 else if(choice?.type==='vfs'&&choice.path){
  try{const blob=V.blob?await V.blob(choice.path):new Blob([await V.read(choice.path)]);if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(blob);url=objectUrl}catch{}
 }
 document.documentElement.style.setProperty('--wallpaper',`url("${url}")`);
 return url;
}
export async function setWallpaper(choice){set.wallpaper=choice;sv();await applyWallpaper(choice);window.dispatchEvent(new CustomEvent('curios:wallpaper-changed',{detail:choice}))}

window.addEventListener('curios:wallpaper-changed',e=>applyWallpaper(e.detail).catch(()=>0));
