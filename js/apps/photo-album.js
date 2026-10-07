// Photo Album: non-destructive albums + collage studio over the CuriOS VFS.
import {h} from '../kernel/util.js';
import {V,KV,kvPut} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';
const KEY='photoalbum.v1', IMG=/\.(png|jpe?g|gif|webp|bmp|avif)$/i;
let state={albums:[],favorites:[],captions:{}};
const path=(d,n)=>(d==='/'?'':d)+'/'+n;
async function scan(d='/Pictures',out=[]){for(const e of await V.ls(d,true).catch(()=>[])){const p=path(d,e.name);if(e.type==='d')await scan(p,out);else if(IMG.test(p))out.push(p)}return out}
async function load(){state=Object.assign(state,await KV.get(KEY).catch(()=>null)||{});return state} const save=()=>kvPut(KEY,state);
async function url(p){return URL.createObjectURL(await V.blob(p))}
const uid=()=>Math.random().toString(36).slice(2,9);
export function photoAlbum(){win('photos','Photo Album',900,650,async b=>{await load();b.classList.add('photo-album');let all=await scan(),mode='library',album=null,urls=[];
 const clean=()=>{urls.forEach(URL.revokeObjectURL);urls=[]}, top=h('div',{className:'pa-top'}),body=h('div',{className:'pa-body'}),msg=h('div',{className:'msg'});
 const button=(t,f)=>h('button',{className:'btn',textContent:t,onclick:f});
 async function render(){clean();top.replaceChildren(button('Library',()=>{mode='library';album=null;render()}),button('New Album',newAlbum),button('Collage Studio',()=>{mode='collage';render()}),h('span',{className:'pa-grow'}),h('span',{textContent:`${all.length} photos`}));body.replaceChildren();if(mode==='collage')return collage();
  const side=h('aside',{className:'pa-side'},h('div',{className:'hd',textContent:'Albums'}),...state.albums.map(a=>h('button',{className:album?.id===a.id?'sel':'',onclick(){album=a;render()}},a.name+'  '+a.photos.length)),h('button',{onclick(){album={id:'fav',name:'Favorites',photos:state.favorites};render()}},'★ Favorites'));
  const files=album?album.photos:all, grid=h('div',{className:'pa-grid'});for(const p of files){if(!all.includes(p))continue;const u=await url(p);urls.push(u);const im=h('img',{src:u,alt:state.captions[p]||p.split('/').pop()}),card=h('figure',{className:'pa-card',ondblclick:()=>lightbox(p,u)},im,h('figcaption',{},h('b',{textContent:state.captions[p]||p.split('/').pop()}),h('span',{textContent:state.favorites.includes(p)?'★':'☆',title:'Favorite',onclick:e=>{e.stopPropagation();toggleFav(p)}})));card.oncontextmenu=e=>{e.preventDefault();photoMenu(p)};grid.append(card)}
  body.append(side,h('main',{className:'pa-main'},h('div',{className:'pa-heading'},h('div',{className:'hd',textContent:album?.name||'All Photos'}),album&&album.id!=='fav'?button('Add Photos',()=>addPhotos(album)):''),grid));}
 function newAlbum(){const n=prompt('Album name');if(!n?.trim())return;state.albums.push({id:uid(),name:n.trim(),photos:[],cover:null});save();render()}
 async function addPhotos(a){const choices=all.filter(p=>!a.photos.includes(p));const p=prompt('Photo path to add:\n\n'+choices.slice(0,30).join('\n'),choices[0]||'');if(p&&choices.includes(p)){a.photos.push(p);save();render()}}
 function toggleFav(p){const i=state.favorites.indexOf(p);i<0?state.favorites.push(p):state.favorites.splice(i,1);save();render()}
 function photoMenu(p){const c=prompt('Caption (leave unchanged by Cancel):',state.captions[p]||'');if(c!==null){state.captions[p]=c;save();render()}}
 function lightbox(p,u){const o=h('div',{className:'pa-lightbox',onclick:e=>e.target===o&&o.remove()},h('button',{textContent:'×',onclick:()=>o.remove()}),h('img',{src:u}),h('div',{textContent:state.captions[p]||p.split('/').pop()}));document.body.append(o)}
 async function collage(){const selected=[],wrap=h('div',{className:'collage-shell'}),pick=h('div',{className:'collage-pick'}),canvas=h('canvas',{width:1200,height:1200}),stage=h('div',{className:'collage-stage'},canvas),ctx=canvas.getContext('2d');
  const draw=async()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const n=selected.length;if(!n)return;const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols),cw=canvas.width/cols,ch=canvas.height/rows;for(let i=0;i<n;i++){const bl=await V.blob(selected[i]),u=URL.createObjectURL(bl),im=new Image();im.src=u;await im.decode();const x=(i%cols)*cw,y=Math.floor(i/cols)*ch,s=Math.max(cw/im.width,ch/im.height),sw=cw/s,sh=ch/s,sx=(im.width-sw)/2,sy=(im.height-sh)/2;ctx.drawImage(im,sx,sy,sw,sh,x+5,y+5,cw-10,ch-10);URL.revokeObjectURL(u)}};
  for(const p of all.slice(0,80)){const u=await url(p);urls.push(u);pick.append(h('button',{className:'collage-thumb',onclick:async e=>{const i=selected.indexOf(p);i<0?selected.push(p):selected.splice(i,1);e.currentTarget.classList.toggle('sel',i<0);await draw()}},h('img',{src:u})))}
  const exportIt=async type=>{if(!selected.length)return;const blob=await new Promise(r=>canvas.toBlob(r,type,type==='image/jpeg'?.92:undefined));let n=1,p='/Pictures/Collage.'+(type==='image/png'?'png':'jpg');while(await V.stat(p))p=`/Pictures/Collage (${++n}).${type==='image/png'?'png':'jpg'}`;await V.put(p,blob);window.dispatchEvent(new CustomEvent('curios:vfs-changed',{detail:{paths:[p]}}));all=await scan();msg.textContent='Saved '+p};
  wrap.append(h('div',{className:'collage-tools'},button('Export PNG',()=>exportIt('image/png')),button('Export JPEG',()=>exportIt('image/jpeg')),h('span',{textContent:'Select photos below; the collage updates automatically.'})),stage,pick);body.append(wrap)}
 b.append(top,body,msg);render();addEventListener('curios:vfs-changed',async()=>{all=await scan();render()},{once:true})})}
