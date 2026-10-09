import {set,sv} from './state.js';
import {V} from './vfs.js';

export const STOCK_WALLPAPERS=[
 {id:'symbiotic',name:'Symbiotic',url:'assets/symbiotic.png'},
 {id:'superposition',name:'Superposition',url:'assets/superposition.png'},
 {id:'curios-circuit',name:'CuriOS Circuit',url:'assets/curios-circuit.svg'}
];

let objectUrl='';
const FALLBACK='assets/symbiotic.png';

function absoluteAsset(url){
  try{return new URL(url,document.baseURI).href}catch{return url}
}

function setDesktopImage(url){
  const desk=document.getElementById('desk');
  const css=`url("${String(url).replaceAll('"','%22')}")`;
  // Keep the CSS variable for theme compatibility, but also paint #desk directly.
  // Direct assignment avoids custom-property URL resolution/caching inconsistencies.
  document.documentElement.style.setProperty('--wallpaper',css);
  if(desk){
    desk.style.backgroundImage=`linear-gradient(#03071122,#03071122),${css}`;
    desk.style.backgroundPosition='center';
    desk.style.backgroundSize='cover';
    desk.style.backgroundRepeat='no-repeat';
  }
}

async function loadable(url){
  if(String(url).startsWith('blob:')) return url;
  return await new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve(url);
    img.onerror=()=>resolve(null);
    img.src=url;
  });
}

export async function applyWallpaper(choice=set.wallpaper||{type:'stock',id:'symbiotic'}){
  let url=absoluteAsset(FALLBACK);

  if(choice?.type==='stock'){
    const found=STOCK_WALLPAPERS.find(x=>x.id===choice.id);
    if(found) url=absoluteAsset(found.url);
  }else if(choice?.type==='vfs'&&choice.path){
    try{
      const blob=V.blob?await V.blob(choice.path):new Blob([await V.read(choice.path)]);
      if(objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl=URL.createObjectURL(blob);
      url=objectUrl;
    }catch(err){
      console.warn('[CuriOS] wallpaper read failed:',choice.path,err);
    }
  }

  const usable=await loadable(url);
  if(!usable){
    console.warn('[CuriOS] wallpaper failed to load:',url);
    url=absoluteAsset(FALLBACK);
  }

  setDesktopImage(url);
  return url;
}

export async function setWallpaper(choice){
  set.wallpaper=choice;
  sv();
  await applyWallpaper(choice);
  window.dispatchEvent(new CustomEvent('curios:wallpaper-changed',{detail:choice}));
}

window.addEventListener('curios:wallpaper-changed',e=>applyWallpaper(e.detail).catch(err=>console.warn('[CuriOS] wallpaper apply failed',err)));
window.addEventListener('resize',()=>applyWallpaper(set.wallpaper).catch(()=>0));
