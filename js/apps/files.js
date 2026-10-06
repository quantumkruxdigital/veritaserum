// Files app: persistent browser uploads, two-pane navigation, directory management, and type-aware opening.
import {scribe} from './scribe.js';
import {media,isAudio,isVideo} from './media.js';
import {imageViewer,isImage} from './image-viewer.js';
import {res} from '../kernel/localfs.js';
import {h} from '../kernel/util.js';
import {V, remote} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';
import {registerContext,pinQuick,unpinQuick,isPinned} from '../shell/context.js';
import {alchemyFormats,convertPath} from './alchemy.js';

const TEXT=/\.(txt|md|json|js|mjs|css|html|xml|csv|log|toml|ini|yaml|yml)$/i;
const open=p=>(isAudio(p)||isVideo(p))?media(p):isImage(p)?imageViewer(p):TEXT.test(p)||!p.includes('.')?scribe(p):scribe(p);
const nice=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
const base=p=>p=='/'?'/':p.split('/').pop();
const parent=p=>p=='/'?'/':res(p,'..');
const fsChanged=(paths=[])=>window.dispatchEvent(new CustomEvent('curios:vfs-changed',{detail:{paths}}));

async function moveNode(from,to){
 if(from=='/'||to=='/'||to.startsWith(from+'/'))throw new Error('Invalid destination');
 if(await V.stat(to))throw new Error('A file or folder with that name already exists.');
 const st=await V.stat(from);if(!st)throw new Error('Item no longer exists.');
 if(st.type=='d'){
  await V.mkdir(to);
  for(const e of await V.ls(from,true))await moveNode(res(from,e.name),res(to,e.name));
 }else{
  if(V.blob&&V.put)await V.put(to,await V.blob(from));
  else await V.write(to,await V.read(from));
 }
 await V.rm(from);
}

export function files(start='/Documents'){const existing=document.querySelector('.win[data-win-id="files"]');if(existing&&start!='/Documents')existing.dispatchEvent(new CustomEvent('files:navigate',{detail:start}));win('files','Files',790,520,b=>{
 let p=start,filter='',treeOpen=new Set(['/','/Documents','/Music','/Pictures','/Videos','/Downloads']),selected=new Set(),anchor=null,clipboard={mode:null,paths:[]};
 const pick=h('input',{type:'file',multiple:true,style:'display:none'});
 const shell=h('div',{className:'files-shell'}),main=h('section',{className:'files-main'}),side=h('aside',{className:'files-side'});
 b.classList.add('files-body');b.replaceChildren(shell,pick);shell.append(main,side);
 b.closest('.win').addEventListener('files:navigate',e=>go(e.detail));

 const go=q=>{p=res('/',q);selected.clear();anchor=null;treeOpen.add('/');let cur=p;while(cur!='/'){treeOpen.add(cur);cur=parent(cur)};render()};

 const selectedPaths=()=>[...selected];
 const uniqueDest=async(dir,name)=>{let q=res(dir,name);if(!await V.stat(q))return q;const dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';for(let i=2;;i++){q=res(dir,`${stem} (${i})${ext}`);if(!await V.stat(q))return q}};
 async function copyNode(from,to){const st=await V.stat(from);if(!st)throw new Error('Item no longer exists.');if(st.type=='d'){await V.mkdir(to);for(const e of await V.ls(from,true))await copyNode(res(from,e.name),res(to,e.name))}else if(V.blob&&V.put)await V.put(to,await V.blob(from));else await V.write(to,await V.read(from))}
 const setClip=(mode,paths=selectedPaths())=>{clipboard={mode,paths:[...paths]};renderMain()};
 const paste=async(dest=p)=>{if(!clipboard.paths.length)return;try{for(const from of clipboard.paths){if(dest==from||dest.startsWith(from+'/'))throw new Error('Cannot paste a folder inside itself.');const to=await uniqueDest(dest,base(from));if(clipboard.mode=='cut')await moveNode(from,to);else await copyNode(from,to)}if(clipboard.mode=='cut')clipboard={mode:null,paths:[]};selected.clear();fsChanged([dest,...clipboard.paths]);await render()}catch(x){alert(String(x?.message||x))}};
 const removePaths=async(paths=selectedPaths())=>{if(!paths.length)return;if(!confirm(`Delete ${paths.length==1?base(paths[0]):paths.length+' items'}?`))return;try{for(const q of paths)if(q!='/')await V.rm(q);selected.clear();fsChanged(paths);await render()}catch(x){alert(String(x?.message||x))}};
 const renamePath=async q=>{if(!q||q=='/')return;const n=prompt('Rename',base(q));if(!n||n==base(q))return;try{const next=res(parent(q),n);await moveNode(q,next);selected.delete(q);selected.add(next);fsChanged([q,next]);await render()}catch(x){alert(String(x?.message||x))}};
 const properties=async q=>{const st=await V.stat(q);if(!st)return;let count='';if(st.type=='d'){try{const es=await V.ls(q,true);count=`\nItems: ${es.length}`}catch{}}alert(`${base(q)}\nPath: ${q}\nType: ${st.type=='d'?'Directory':'File'}${st.type=='f'?`\nSize: ${nice(st.size||0)}`:''}${st.mime?`\nMIME: ${st.mime}`:''}${count}`)};
 const selectOne=(q,e,rowOrder)=>{if(e.ctrlKey||e.metaKey){selected.has(q)?selected.delete(q):selected.add(q);anchor=q}else if(e.shiftKey&&anchor){const a=rowOrder.indexOf(anchor),z=rowOrder.indexOf(q);if(a>=0&&z>=0)for(const x of rowOrder.slice(Math.min(a,z),Math.max(a,z)+1))selected.add(x)}else{selected.clear();selected.add(q);anchor=q}renderMain()};
 const upload=async fs=>{for(const f of fs){try{await V.put(res(p,f.name),f);fsChanged([res(p,f.name)])}catch(x){alert('Upload failed: '+String(x?.message||x));break}}await render()};
 pick.onchange=()=>{const fs=[...pick.files];pick.value='';upload(fs)};
 const newFolder=async()=>{const n=prompt('Folder name');if(!n)return;try{await V.mkdir(res(p,n));treeOpen.add(p);fsChanged([res(p,n)]);await render()}catch(x){alert(String(x?.message||x))}};
 const renameFolder=async()=>{if(p=='/')return alert('Root cannot be renamed.');const n=prompt('Rename folder',base(p));if(!n||n==base(p))return;const old=p,next=res(parent(p),n);try{await moveNode(old,next);p=next;treeOpen.delete(old);treeOpen.add(next);fsChanged([old,next]);await render()}catch(x){alert(String(x?.message||x))}};
 const deleteFolder=async()=>{if(p=='/')return alert('Root cannot be deleted.');const old=p;if(!confirm(`Delete ${old} and everything inside it?`))return;try{await V.rm(old);p=parent(old);treeOpen.delete(old);fsChanged([old]);await render()}catch(x){alert(String(x?.message||x))}};

 async function folderChildren(q){try{return (await V.ls(q,true)).filter(e=>e.type=='d').sort((a,z)=>a.name.localeCompare(z.name))}catch{return[]}}
 async function treeNode(q,label=base(q),depth=0){
  const kids=await folderChildren(q),expanded=treeOpen.has(q),row=h('div',{className:'dir-row'+(q==p?' sel':''),title:q});
  row.style.paddingLeft=(8+depth*14)+'px';
  const twist=h('button',{className:'dir-twist',textContent:kids.length?(expanded?'▾':'▸'):'·',title:expanded?'Collapse':'Expand',onclick:e=>{e.stopPropagation();expanded?treeOpen.delete(q):treeOpen.add(q);render()}});
  row.dataset.path=q;row.dataset.kind='directory';row.dataset.label=label;
  const name=h('span',{className:'dir-name',textContent:label});
  row.append(twist,name);row.onclick=()=>go(q);row.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-curios-paths')){e.preventDefault();row.classList.add('drop-target')}};row.ondragleave=()=>row.classList.remove('drop-target');row.ondrop=async e=>{e.preventDefault();e.stopPropagation();row.classList.remove('drop-target');try{const paths=JSON.parse(e.dataTransfer.getData('application/x-curios-paths')||'[]');for(const from of paths){if(from==q||q.startsWith(from+'/'))continue;await moveNode(from,await uniqueDest(q,base(from)))}fsChanged(paths);selected.clear();await render()}catch(x){alert(String(x?.message||x))}};
  const frag=document.createDocumentFragment();frag.append(row);
  if(expanded)for(const k of kids)frag.append(await treeNode(res(q,k.name),k.name,depth+1));
  return frag;
 }

 function crumbs(){
  const bar=h('div',{className:'crumbs'}),root=h('button',{className:'crumb',textContent:'Root',onclick:()=>go('/')});bar.append(root);
  let cur='';for(const seg of p.split('/').filter(Boolean)){cur+='/'+seg;const q=cur;bar.append(h('span',{className:'crumb-sep',textContent:'›'}),h('button',{className:'crumb',textContent:seg,onclick:()=>go(q)}))}return bar;
 }

 async function renderMain(){
  let es=[];try{es=await V.ls(p)}catch(x){main.replaceChildren(h('div',{className:'msg',textContent:String(x?.message||x)}));return}
  const top=h('div',{className:'files-top'},crumbs(),h('div',{className:'files-origin',textContent:remote?'cloud/server':'this browser'}));
  const search=h('input',{className:'file-search',placeholder:'Filter this folder…',value:filter,oninput:e=>{filter=e.target.value.toLowerCase();const at=e.target.selectionStart;renderMain().then(()=>{const x=main.querySelector('.file-search');if(x){x.focus();x.setSelectionRange(at,at)}})}});
  const actions=h('div',{className:'file-actions'},h('button',{className:'btn',textContent:'Upload',onclick:()=>pick.click()}),h('button',{className:'btn',textContent:'New folder',onclick:newFolder}),h('button',{className:'btn',textContent:'Cut',disabled:!selected.size,onclick:()=>setClip('cut')}),h('button',{className:'btn',textContent:'Copy',disabled:!selected.size,onclick:()=>setClip('copy')}),h('button',{className:'btn',textContent:'Paste',disabled:!clipboard.paths.length,onclick:()=>paste()}),search);
  const dz=h('div',{className:'file-drop',textContent:'Drop files here to upload',ondragover:e=>{e.preventDefault();dz.classList.add('over')},ondragleave:()=>dz.classList.remove('over'),ondrop:e=>{e.preventDefault();dz.classList.remove('over');upload([...e.dataTransfer.files])}});
  const list=h('div',{className:'file-list'}),shown=es.filter(e=>!filter||e.name.toLowerCase().includes(filter)).sort((x,y)=>x.type==y.type?x.name.localeCompare(y.name):x.type<y.type?-1:1);
  if(p!='/')list.append(h('div',{className:'file-row up',onclick:()=>go(parent(p))},h('span',{className:'file-icon',textContent:'↰'}),h('span',{className:'file-name',textContent:'Parent folder'}),h('span',{className:'file-kind',textContent:'Directory'})));
  const rowOrder=shown.map(e=>res(p,e.name));
  for(const e of shown){const k=res(p,e.name),row=h('div',{className:'file-row'+(selected.has(k)?' selected':''),title:k,draggable:true,ondblclick:ev=>{ev.stopPropagation();e.type=='d'?go(k):open(k)},ondragstart:ev=>{if(!selected.has(k)){selected.clear();selected.add(k)}ev.dataTransfer.setData('application/x-curios-paths',JSON.stringify(selectedPaths()));ev.dataTransfer.effectAllowed='copyMove'}});row.dataset.path=k;row.dataset.kind=e.type=='d'?'directory':'file';row.dataset.label=e.name;const icon=h('span',{className:'file-icon',textContent:e.type=='d'?'▸':isAudio(k)?'♫':isVideo(k)?'▣':'·'}),nm=h('span',{className:'file-name',textContent:e.name}),kind=h('span',{className:'file-kind',textContent:e.type=='d'?'Directory':nice(e.size||0)}),del=h('button',{className:'file-delete',textContent:'✕',title:'Delete',onclick:ev=>{ev.stopPropagation();removePaths([k])}});row.append(icon,nm,kind,del);row.onclick=ev=>selectOne(k,ev,rowOrder);if(e.type=='d'){row.ondragover=ev=>{if(ev.dataTransfer.types.includes('application/x-curios-paths')){ev.preventDefault();row.classList.add('drop-target')}};row.ondragleave=()=>row.classList.remove('drop-target');row.ondrop=async ev=>{ev.preventDefault();ev.stopPropagation();row.classList.remove('drop-target');try{const paths=JSON.parse(ev.dataTransfer.getData('application/x-curios-paths')||'[]');for(const from of paths){if(from==k||k.startsWith(from+'/'))continue;await moveNode(from,await uniqueDest(k,base(from)))}fsChanged(paths);selected.clear();await render()}catch(x){alert(String(x?.message||x))}}}list.append(row)}
  if(!shown.length)list.append(h('div',{className:'file-empty',textContent:filter?'No matching files or folders.':'This folder is empty.'}));
  const newNote=h('input',{className:'file-new-note',placeholder:'New document name — press Enter',onkeydown:async e=>{if(e.key=='Enter'&&e.currentTarget.value.trim()){const k=res(p,e.currentTarget.value.trim());try{await V.write(k,'');scribe(k);render()}catch(x){alert(String(x?.message||x))}}}});
  main.replaceChildren(top,actions,dz,list,newNote);
 }

 async function renderSide(){
  const places=h('div',{className:'side-section dir-section'},h('div',{className:'side-title',textContent:'Places'}),h('div',{className:'dir-tree'}));
  places.lastChild.append(await treeNode('/','Root'));
  const manage=h('div',{className:'dir-manage'},h('button',{className:'btn mini',textContent:'+ Folder',onclick:newFolder}),h('button',{className:'btn mini',textContent:'Rename',onclick:renameFolder,disabled:p=='/'}),h('button',{className:'btn mini warn',textContent:'Delete',onclick:deleteFolder,disabled:p=='/'}),h('button',{className:'btn mini',textContent:'↻',title:'Refresh',onclick:render}));
  side.replaceChildren(places,manage);
 }
 async function render(){await Promise.all([renderMain(),renderSide()])}
 registerContext('files',async ev=>{
  const el=ev.target.closest('[data-path]');
  if(!el)return [{label:'New folder here',action:newFolder},{label:'Upload files here',action:()=>pick.click()},{label:'Paste',disabled:!clipboard.paths.length,action:()=>paste()}];
  const q=el.dataset.path,label=el.dataset.label||base(q),dir=el.dataset.kind=='directory',pin={type:'path',target:q,label};
  if(!selected.has(q)){selected.clear();selected.add(q);anchor=q;await renderMain()}
  const paths=selectedPaths(),many=paths.length>1,a=[];
  if(!many)a.push({label:dir?'Open '+label:'Open '+label,action:()=>dir?go(q):open(q)});
  if(!many&&!dir){const formats=alchemyFormats(q);if(formats.length)a.push({label:'Alchemy',children:formats.map(fmt=>({label:'Convert to '+fmt.toUpperCase(),action:async()=>{try{const out=await convertPath(q,fmt);await render();alert('Alchemy created '+out)}catch(x){alert('Alchemy: '+String(x?.message||x))}}}))})}
  a.push({separator:'Clipboard'},{label:`Cut${many?' '+paths.length+' items':''}`,action:()=>setClip('cut',paths)},{label:`Copy${many?' '+paths.length+' items':''}`,action:()=>setClip('copy',paths)});
  if(dir)a.push({label:'Paste into '+label,disabled:!clipboard.paths.length,action:()=>paste(q)});
  a.push({separator:'Manage'});if(!many&&q!='/')a.push({label:'Rename',action:()=>renamePath(q)});if(!many)a.push({label:isPinned(pin)?'Unpin from Quick Launch':'Pin to Quick Launch',action:()=>isPinned(pin)?unpinQuick(pin):pinQuick(pin)});if(q!='/')a.push({label:`Delete${many?' '+paths.length+' items':' '+label}`,danger:true,action:()=>removePaths(paths)});if(!many)a.push({label:'Properties',action:()=>properties(q)});return a;
 });
 b.tabIndex=0;b.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()=='a'){e.preventDefault();main.querySelectorAll('.file-row[data-path]').forEach(x=>selected.add(x.dataset.path));renderMain()}else if(mod&&e.key.toLowerCase()=='c'){e.preventDefault();setClip('copy')}else if(mod&&e.key.toLowerCase()=='x'){e.preventDefault();setClip('cut')}else if(mod&&e.key.toLowerCase()=='v'){e.preventDefault();paste()}else if(e.key=='Delete'){e.preventDefault();removePaths()}else if(e.key=='F2'&&selected.size==1){e.preventDefault();renamePath(selectedPaths()[0])}});
 render();
 })}
