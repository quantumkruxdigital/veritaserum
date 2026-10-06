// Scribe word processor. Rich HTML documents plus plain-text/source editing.
import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';

const HTML=/\.html?$/i, RICH=/\.(scribe|rtf)$/i, TEXT=/\.(txt|md|markdown|csv|json|js|mjs|css|xml|svg|log|ini|toml|ya?ml)$/i;
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const plainFromHtml=s=>{const d=document.createElement('div');d.innerHTML=s;return d.innerText};
const rtfEsc=s=>String(s).replace(/\\/g,'\\\\').replace(/{/g,'\\{').replace(/}/g,'\\}').replace(/\n/g,'\\par\n');
const htmlFromRtf=s=>esc(String(s).replace(/\\par[d]?\s?/g,'\n').replace(/\\'[0-9a-f]{2}/gi,'').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'')).replace(/\n/g,'<br>');
const notify=path=>dispatchEvent(new CustomEvent('curios:vfs-changed',{detail:{path,source:'editor'}}));
const ext=p=>(p.match(/\.([^.\/]+)$/)?.[1]||'').toLowerCase();
const defaultMode=p=>HTML.test(p)||RICH.test(p)?'rich':'plain';

export function scribe(k='/Documents/untitled.scribe'){
 const id='scribe:'+k;
 win(id,k.split('/').pop()||'Scribe',760,560,b=>{
  b.classList.add('editor-body'); b.style.padding=0;
  let path=k, mode=defaultMode(k), htmlSource=false, dirty=false, timer=0, loaded=false;
  const shell=h('div',{className:'wp-shell'}), bar=h('div',{className:'wp-bar'}), editor=h('div',{className:'wp-editor',contentEditable:'true',spellcheck:true}), source=h('textarea',{className:'wp-source',spellcheck:false}), status=h('div',{className:'wp-status'});
  const size=h('select',{className:'wp-size',title:'Text size'},...['12','14','16','18','24','32','48'].map(n=>h('option',{value:n,textContent:n+' px',selected:n=='16'})));
  const btn=(label,title,fn)=>h('button',{className:'wp-btn',textContent:label,title,onmousedown:e=>e.preventDefault(),onclick:fn});
  const command=(c,v=null)=>{editor.focus();document.execCommand(c,false,v);changed()};
  const bold=btn('B','Bold (Ctrl+B)',()=>command('bold')); bold.style.fontWeight='700';
  const italic=btn('I','Italic (Ctrl+I)',()=>command('italic')); italic.style.fontStyle='italic';
  const left=btn('≡','Align left',()=>command('justifyLeft')), center=btn('≡','Align center',()=>command('justifyCenter')), right=btn('≡','Align right',()=>command('justifyRight')); center.style.textAlign='center';right.style.textAlign='right';
  const outdent=btn('⇤','Outdent (Shift+Tab)',()=>command('outdent')), indent=btn('⇥','Indent (Tab)',()=>command('indent'));
  const settings=btn('⚙','Editor settings',()=>menuSettings());
  const saveBtn=btn('Save','Save (Ctrl+S)',()=>save());
  const importBtn=btn('Import','Import a document',()=>picker.click());
  const exportBtn=btn('Export','Export / Save As',()=>menuExport());
  const picker=h('input',{type:'file',accept:'.txt,.md,.markdown,.html,.htm,.rtf,.scribe,.csv,.json,.css,.js,.xml,.svg,.log,.ini,.toml,.yaml,.yml,text/*',style:'display:none'});
  size.onchange=()=>command('fontSize','7'); // execCommand sizes are mapped below to px.
  size.addEventListener('change',()=>{editor.querySelectorAll('font[size="7"]').forEach(x=>{x.removeAttribute('size');x.style.fontSize=size.value+'px'})});
  bar.append(saveBtn,importBtn,exportBtn,h('span',{className:'wp-sep'}),size,bold,italic,h('span',{className:'wp-sep'}),left,center,right,h('span',{className:'wp-sep'}),outdent,indent,h('span',{className:'wp-grow'}),settings,picker);
  shell.append(bar,editor,source,status); b.append(shell);

  function setStatus(msg=''){const words=(htmlSource?source.value:editor.innerText).trim().split(/\s+/).filter(Boolean).length;status.textContent=(dirty?'● Unsaved':'Saved')+'  ·  '+words+' words  ·  '+(htmlSource?'HTML source':mode=='rich'?'Rich text':'Plain text')+(msg?'  ·  '+msg:'')}
  function changed(){if(!loaded)return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>save(true),650);setStatus()}
  editor.addEventListener('input',changed); source.addEventListener('input',changed);
  editor.addEventListener('keydown',e=>{if(e.key=='Tab'){e.preventDefault();command(e.shiftKey?'outdent':'indent')}});
  shell.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()=='s'){e.preventDefault();save()} });
  picker.onchange=async()=>{const f=picker.files?.[0];if(!f)return;const name=f.name||'import.txt',x=ext(name);let raw=await f.text();path='/Documents/'+name;mode=x=='html'||x=='htm'||x=='scribe'||x=='rtf'?'rich':'plain';if(x=='rtf')raw=htmlFromRtf(raw);if(mode=='rich')editor.innerHTML=raw;else editor.innerText=raw;source.value=mode=='rich'?editor.innerHTML:editor.innerText;htmlSource=false;syncView();dirty=true;await save();picker.value=''};

  function syncView(){source.hidden=!htmlSource;editor.hidden=htmlSource;[size,bold,italic,left,center,right,outdent,indent].forEach(x=>x.disabled=htmlSource||mode=='plain');setStatus()}
  function toggleHtml(){if(htmlSource){editor.innerHTML=source.value;htmlSource=false;mode='rich'}else{source.value=mode=='rich'?editor.innerHTML:esc(editor.innerText);htmlSource=true;mode='rich'}syncView();(htmlSource?source:editor).focus()}
  function menuSettings(){const old=shell.querySelector('.wp-menu');old?.remove();const m=h('div',{className:'wp-menu'},h('div',{className:'wp-menu-title',textContent:'Editor settings'}),h('button',{textContent:(htmlSource?'✓ ':'')+'HTML code editing mode',onclick(){toggleHtml();m.remove()}}),h('button',{textContent:'Rich text mode',onclick(){if(htmlSource){editor.innerHTML=source.value;htmlSource=false}mode='rich';syncView();changed();m.remove()}}),h('button',{textContent:'Plain text mode',onclick(){if(htmlSource){editor.innerHTML=source.value;htmlSource=false}mode='plain';editor.innerText=editor.innerText;syncView();changed();m.remove()}}));shell.append(m);setTimeout(()=>addEventListener('pointerdown',e=>{if(!m.contains(e.target)&&e.target!==settings)m.remove()},{once:true}),0)}
  function menuExport(){const old=shell.querySelector('.wp-menu');old?.remove();const m=h('div',{className:'wp-menu wp-export'},h('div',{className:'wp-menu-title',textContent:'Export / Save As'}));for(const [label,x] of [['Scribe Document','scribe'],['HTML','html'],['Plain Text','txt'],['Markdown / Text','md'],['RTF','rtf']])m.append(h('button',{textContent:label,onclick(){saveAs(x);m.remove()}}));shell.append(m);setTimeout(()=>addEventListener('pointerdown',e=>{if(!m.contains(e.target)&&e.target!==exportBtn)m.remove()},{once:true}),0)}
  function contentFor(x){const html=htmlSource?source.value:(mode=='rich'?editor.innerHTML:esc(editor.innerText).replace(/\n/g,'<br>')),plain=htmlSource?plainFromHtml(source.value):editor.innerText;if(x=='html'||x=='scribe')return html;if(x=='rtf')return'{\\rtf1\\ansi\n'+rtfEsc(plain)+'\n}';return plain}
  async function save(auto=false){try{let x=ext(path);if(!x)x=mode=='rich'?'scribe':'txt';const data=contentFor(x);await V.write(path,data);dirty=false;notify(path);setStatus(auto?'autosaved':'saved')}catch(e){setStatus('save failed: '+String(e?.message||e))}}
  async function saveAs(x){const base=(path.split('/').pop()||'document').replace(/\.[^.]+$/,'')||'document',name=prompt('Save in /Documents as:',base+'.'+x);if(!name)return;path='/Documents/'+name.replace(/^\/+/, '');mode=(x=='html'||x=='scribe'||x=='rtf')?'rich':'plain';dirty=true;await save();setStatus('saved as '+path)}

  V.read(path).catch(()=> '').then(raw=>{if(/\u0000/.test(raw)){editor.innerText='[binary file cannot be edited]';editor.contentEditable='false';return}const x=ext(path);mode=defaultMode(path);if(x=='rtf')editor.innerHTML=htmlFromRtf(raw);else if(mode=='rich')editor.innerHTML=raw;else editor.innerText=raw;source.value=mode=='rich'?editor.innerHTML:esc(editor.innerText);loaded=true;dirty=false;syncView();editor.focus()});
 })
}
