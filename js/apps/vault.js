// Encrypted vault.
import {saveFile} from '../kernel/save.js';
import {h} from '../kernel/util.js';
import {VC, kvPut, remote, setSys} from '../kernel/vfs.js';
import {win, wins} from '../shell/wm.js';

const B=b=>{let s='';new Uint8Array(b).forEach(c=>s+=String.fromCharCode(c));return btoa(s)},U=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const kd=async(pw,salt)=>crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
const en=async(k,o)=>{const iv=crypto.getRandomValues(new Uint8Array(12));return{iv:B(iv),ct:B(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(o))))}};
const de=async(k,r)=>JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:U(r.iv)},k,U(r.ct))));
export const vm=()=>{if(remote)return VC||null;try{return JSON.parse(localStorage.getItem('curios.vault'))}catch{return null}},vs=m=>{if(remote){setSys({VC:m});kvPut('vault',m);return}try{localStorage.setItem('curios.vault',JSON.stringify(m))}catch{}};
export let vkey=null,vitems=[],vlock=null,vnote='';
const vdestroy=why=>{if(remote){setSys({VC:null});kvPut('vault',{})}else localStorage.removeItem('curios.vault');vkey=null;vitems=[];vnote=why||''};
export function vault(){win('vault','Vault',440,470,()=>{},()=>clearTimeout(vlock));vrender()}
function vrender(){const b=wins.vault?.bd;if(!b)return;const m=vm();b.replaceChildren();
 const pw=h('input',{type:'password',placeholder:'Password'}),msg=h('div',{className:'msg',textContent:vnote}),go=h('button',{className:'btn'});vnote='';
 if(!vkey){const pw2=h('input',{type:'password',placeholder:'Confirm password'});
  go.textContent=m?'Unlock':'Create vault';const fn=async()=>{go.textContent='Working…';
   if(!m){if(pw.value.length<8||pw.value!=pw2.value){msg.textContent='Use 8+ characters and match both fields.';go.textContent='Create vault';return}
    const salt=crypto.getRandomValues(new Uint8Array(16));vkey=await kd(pw.value,salt);vs({salt:B(salt),ver:await en(vkey,'ok'),items:[],fails:0,maxFails:0,dead:0,lock:5,last:Date.now()});vitems=[];vidle();return vrender()}
   if(m.dead&&Date.now()-m.last>m.dead*864e5){vdestroy('Vault expired and was wiped.');return vrender()}
   try{const k=await kd(pw.value,U(m.salt));await de(k,m.ver);vkey=k;vitems=[];for(const r of m.items)vitems.push({r,p:await de(k,r)});m.fails=0;m.last=Date.now();vs(m);vidle();vrender()}
   catch{m.fails++;if(m.maxFails&&m.fails>=m.maxFails){vdestroy('Too many wrong passwords. Vault wiped.');return vrender()}vs(m);msg.textContent='Wrong password.'+(m.maxFails?` ${m.maxFails-m.fails} attempts left.`:'');go.textContent='Unlock'}};
  go.onclick=fn;pw.onkeydown=e=>e.key=='Enter'&&fn();
  b.append(h('div',{className:'vf'},h('div',{textContent:m?'Enter your vault password.':'Create a vault. There is no password recovery.'}),pw,...(m?[]:[pw2]),go,msg));return}
 const nm=h('input',{placeholder:'Item name',style:'width:100%'}),tx=h('textarea',{placeholder:'Secret text',style:'height:70px;margin-top:6px'}),fi=h('input',{type:'file'});
 const add=async p=>{if(!p.n)return;const r=await en(vkey,p),mm=vm();mm.items.push(r);vs(mm);vitems.push({r,p});vrender()};
 const list=vitems.map((it,i)=>h('div',{className:'row'},h('span',{textContent:(it.p.k=='f'?'▤ ':'· ')+it.p.n,onclick(){if(it.p.k=='f')saveFile(it.p.n,new Blob([U(it.p.d)])).catch(()=>0);else{tx.value=it.p.d;nm.value=it.p.n}}}),h('b',{textContent:'✕',onclick(){const mm=vm();mm.items=mm.items.filter(x=>x.ct!=it.r.ct);vs(mm);vitems.splice(i,1);vrender()}})));
 const sel=(k,o)=>{const s=h('select',{onchange(){const mm=vm();mm[k]=+s.value;vs(mm);vidle()}});o.forEach(([v,t])=>s.append(h('option',{value:v,textContent:t,selected:m[k]==v})));return s};
 const kill=h('button',{className:'btn warn',textContent:'Destroy vault now',onclick(){if(kill.a){vdestroy('Vault destroyed.');vrender()}else{kill.a=1;kill.textContent='Click again to destroy everything'}}});
 b.append(h('div',{className:'hd',textContent:'Items (click to open or download)'}),...list,h('div',{className:'hd',textContent:'Add'}),nm,tx,h('div',{style:'display:flex;gap:6px;margin-top:6px'},h('button',{className:'btn',textContent:'Save text',onclick:()=>add({k:'t',n:nm.value,d:tx.value})}),h('button',{className:'btn',textContent:'Lock now',onclick:vlockNow})),h('div',{style:'margin-top:6px'},fi),
  h('div',{className:'hd',textContent:'Settings'}),h('label',{className:'s'},'Wipe after failed attempts',sel('maxFails',[[0,'Off'],[3,'3'],[5,'5'],[10,'10']])),h('label',{className:'s'},'Wipe if unopened for',sel('dead',[[0,'Off'],[7,'7 days'],[30,'30 days'],[90,'90 days']])),h('label',{className:'s'},'Auto-lock after idle',sel('lock',[[0,'Off'],[1,'1 min'],[5,'5 min'],[15,'15 min']])),h('div',{className:'hd',textContent:'Names and contents are encrypted with AES-256-GCM; the key comes from your password (PBKDF2, 250k rounds).'}),kill);
 fi.onchange=()=>{const f=fi.files[0];if(!f)return;const r=new FileReader();r.onload=()=>add({k:'f',n:f.name,d:B(r.result)});r.readAsArrayBuffer(f)}}
export function vlockNow(){vkey=null;vitems=[];clearTimeout(vlock);vrender()}
function vidle(){clearTimeout(vlock);const m=vm();if(vkey&&m?.lock)vlock=setTimeout(vlockNow,m.lock*6e4)}
addEventListener('pointerdown',()=>vkey&&vidle());
addEventListener('keydown',()=>vkey&&vidle());
