// The resident terminal: panes, splitting, history, Ctrl+Space.
import {cmds} from '../kernel/cmds.js';
import {$, h} from '../kernel/util.js';
import {isRoot} from '../kernel/root.js';

const tp=$('#tp'),root=h('div',{className:'split'});
tp.append(root);
export let H=[];
try{H=JSON.parse(localStorage.getItem('curios.hist'))||[]}catch{}
export let act=null;
function pane(cwd){
 const out=h('div',{className:'out'}),inp=h('input',{spellcheck:false,autocomplete:'off'}),pr=h('span',{className:'p'}),el=h('div',{className:'pane'},out,h('div',{className:'ln'},pr,inp));
 const io={cwd,pane:el,say:(t,c)=>{const e=h('div',{className:c||'',textContent:t});out.append(e);out.scrollTop=1e9;return e},clear:()=>out.replaceChildren(),secret:null};
 const pp=()=>pr.textContent=isRoot()?('root:'+io.cwd+' # '):(io.cwd+' ›');
 io.secret=label=>new Promise((ok,no)=>{if(io._secret) return no(new Error('secret prompt already active'));io._secret={ok,no};inp.type='password';inp.value='';pr.textContent=label||'Password: ';inp.focus()});
 pp();let hi=H.length;el.io=io;el.inp=inp;
 inp.onfocus=()=>{act?.classList.remove('act');act=el;el.classList.add('act')};el.onclick=()=>inp.focus();
 inp.onkeydown=e=>{
  if(io._secret){
   if(e.key=='Escape'){const q=io._secret;io._secret=null;inp.type='text';inp.value='';pp();q.no(new Error('authentication cancelled'));return}
   if(e.key=='Enter'){const q=io._secret,v=inp.value;io._secret=null;inp.type='text';inp.value='';pp();q.ok(v);return}
   return
  }
  if(e.ctrlKey&&e.key=='c'&&io.ac){io.ac.abort();return}if(e.key=='Escape')return togTerm(false);if(e.key=='Enter'&&inp.value.trim()){const line=inp.value;H.push(line);H=H.slice(-100);hi=H.length;try{localStorage.setItem('curios.hist',JSON.stringify(H))}catch{}inp.value='';io.say((isRoot()?'root:'+io.cwd+' # ':io.cwd+' › ')+line,'p');const a=(line.match(/"[^"]*"|\S+/g)||[]).map(x=>x.replace(/^"|"$/g,'')),c=cmds[a.shift()];try{c?Promise.resolve(c.f(a,io)).catch(x=>io.say(String(x?.message||x),'e')).finally(pp):io.say('unknown command (try help)','e')}catch(x){io.say(String(x),'e')}pp()}else if(e.key=='ArrowUp'&&hi>0)inp.value=H[--hi];else if(e.key=='ArrowDown')inp.value=H[++hi]||''};
 return el}
const panes=()=>tp.querySelectorAll('.pane');
export function split(el,dir){if(panes().length>=8)throw'pane limit reached (8)';const n=pane(el.io.cwd),sp=h('div',{className:'split'+(dir=='h'?' col':'')});el.parentNode.replaceChild(sp,el);sp.append(el,n);n.inp.focus()}
export function closePane(el){const p=el.parentNode;if(p===root){togTerm(false);return}el.remove();if(p.children.length==1)p.replaceWith(p.firstChild);(root.querySelector('.pane')).inp.focus()}
export function togTerm(on){on=on??!tp.classList.contains('on');tp.classList.toggle('on',on);tp.inert=!on;if(on)setTimeout(()=>(act||root.querySelector('.pane')).inp.focus(),30)}
const p0=pane('/Documents');
root.append(p0);
act=p0;
p0.classList.add('act');
const terminalHotkey=e=>{if(e.ctrlKey&&(e.code==='Space'||e.key===' ')){e.preventDefault();e.stopPropagation();togTerm()}};
addEventListener('keydown',terminalHotkey,{capture:true});
addEventListener('curios:terminal-toggle',()=>togTerm());
export function setHist(a){H=a}

addEventListener('curios:root-change',()=>document.querySelectorAll('.pane').forEach(p=>{const io=p.io,pr=p.querySelector('.p');if(io&&pr&&!io._secret)pr.textContent=isRoot()?('root:'+io.cwd+' # '):(io.cwd+' ›')}));
