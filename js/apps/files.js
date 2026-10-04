// Files app: folders, notes, browser uploads, and type-aware opening.
import {notes} from './notes.js';
import {music,isAudio} from './music.js';
import {res} from '../kernel/localfs.js';
import {h} from '../kernel/util.js';
import {V, remote} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';

const TEXT=/\.(txt|md|json|js|mjs|css|html|xml|csv|log|toml|ini|yaml|yml)$/i;
const open=p=>isAudio(p)?music(p):TEXT.test(p)||!p.includes('.')?notes(p):notes(p);
const nice=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
export function files(){win('files','Files',500,440,b=>{let p='/docs';
 const r=async()=>{let es=[];try{es=await V.ls(p)}catch(x){b.textContent=String(x?.message||x);return}
  const pick=h('input',{type:'file',multiple:true,style:'display:none',onchange:async()=>{const fs=[...pick.files];for(const f of fs){let k=res(p,f.name);try{await V.put(k,f)}catch(x){alert('Upload failed: '+String(x?.message||x));break}}pick.value='';r()}});
  const upload=h('button',{className:'btn',textContent:'Upload files',onclick:()=>pick.click()}),folder=h('button',{className:'btn',textContent:'New folder',onclick:async()=>{const n=prompt('Folder name');if(n)try{await V.mkdir(res(p,n));r()}catch(x){alert(String(x?.message||x))}}});
  const i=h('input',{placeholder:'new note name, then Enter',style:'width:100%;margin-top:8px',onkeydown:async e=>{if(e.key=='Enter'&&i.value){const k=res(p,i.value);try{await V.write(k,'');notes(k);r()}catch(x){i.value='';i.placeholder=String(x?.message||x)}}}});
  const dz=h('div',{className:'dz',textContent:'Drop files here to upload',ondragover:e=>{e.preventDefault()},ondrop:async e=>{e.preventDefault();for(const f of e.dataTransfer.files)await V.put(res(p,f.name),f);r()}});
  b.replaceChildren(h('div',{className:'pth',textContent:p+(remote?'   (cloud/server)':'   (this browser)')}),h('div',{className:'fbar'},upload,folder,pick),dz,...(p!='/'?[h('div',{className:'row',textContent:'..',onclick(){p=res(p,'..');r()}})]:[]),...es.sort((x,y)=>x.type==y.type?x.name.localeCompare(y.name):x.type<y.type?-1:1).map(e=>{const k=res(p,e.name);return h('div',{className:'row',onclick(){e.type=='d'?(p=k,r()):open(k)}},h('span',{textContent:(e.type=='d'?'▸ ':'· ')+e.name}),h('span',{className:'meta'},e.type=='f'?nice(e.size||0):'',h('b',{textContent:'✕',onclick(ev){ev.stopPropagation();if(confirm('Delete '+e.name+'?'))V.rm(k).then(r)}})))}),i)};r()})}
