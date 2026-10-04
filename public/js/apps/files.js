// Files app.
import {notes} from './notes.js';
import {res} from '../kernel/localfs.js';
import {h} from '../kernel/util.js';
import {V, remote} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';

export function files(){win('files','Files',420,400,b=>{let p='/docs';const r=async()=>{let es=[];try{es=await V.ls(p)}catch(x){b.textContent=String(x?.message||x);return}
 const i=h('input',{placeholder:'new note name, then Enter',style:'width:100%;margin-top:8px',onkeydown:async e=>{if(e.key=='Enter'&&i.value){const k=res(p,i.value);try{await V.write(k,'');notes(k);r()}catch(x){i.value='';i.placeholder=String(x?.message||x)}}}});
 b.replaceChildren(h('div',{className:'pth',textContent:p+(remote?'   (server)':'   (this browser)')}),...(p!='/'?[h('div',{className:'row',textContent:'..',onclick(){p=res(p,'..');r()}})]:[]),...es.sort((x,y)=>x.type==y.type?x.name.localeCompare(y.name):x.type<y.type?-1:1).map(e=>{const k=res(p,e.name);return h('div',{className:'row',onclick(){e.type=='d'?(p=k,r()):notes(k)}},(e.type=='d'?'▸ ':'· ')+e.name,h('b',{textContent:'✕',onclick(ev){ev.stopPropagation();V.rm(k).then(r)}}))}),i)};r()})}
