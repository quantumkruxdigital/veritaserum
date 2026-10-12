// Retro-Box: personal ROM library and EmulatorJS-powered player.
// Emulator cores load on demand from the public EmulatorJS distribution.
import {win} from '../shell/wm.js';
import {V} from '../kernel/vfs.js';
import {h} from '../kernel/util.js';
const ROOT='/ROMs';
const GROUPS=[{id:'gbc',name:'Game Boy Color',ext:['gbc','gb'],core:'gb'},{id:'gba',name:'Game Boy Advance',ext:['gba'],core:'gba'},{id:'snes',name:'Super Nintendo / Super Famicom',ext:['sfc','smc','fig','swc'],core:'snes'}];
const groupFor=name=>GROUPS.find(g=>g.ext.includes(name.split('.').pop().toLowerCase()));
const safeName=name=>name.replace(/[\\/\u0000-\u001f]/g,'_').slice(0,160);
async function ensure(path){try{await V.mkdir(path)}catch(e){const s=await V.stat(path).catch(()=>null);if(s?.type!=='d')throw e}}
const join=(a,b)=>a+'/'+b;
export function retroBox(){
 win('retrobox','Retro-Box · Nintendo Classics',1090,715,root=>{
  root.classList.add('retrobox-root');
  const shell=h('div',{className:'rb-shell'}),header=h('div',{className:'rb-head'}),heading=h('div');
  heading.append(h('strong',{textContent:'RETRO-BOX'}),h('small',{textContent:'YOUR LIBRARY · YOUR CLASSICS'}));
  const upload=h('input',{type:'file',multiple:true,accept:'.gb,.gbc,.gba,.sfc,.smc,.fig,.swc',style:'display:none'});
  const add=h('button',{textContent:'+ Import ROMs',className:'rb-add'}),refresh=h('button',{textContent:'Refresh'}),note=h('span',{className:'rb-note',textContent:'Import ROMs you are authorized to use.'});
  add.onclick=()=>upload.click();refresh.onclick=()=>scan();header.append(heading,note,refresh,add,upload);
  const nav=h('div',{className:'rb-tabs'}),content=h('div',{className:'rb-content'}),list=h('div',{className:'rb-list'}),stage=h('div',{className:'rb-stage'}),status=h('div',{className:'rb-status',textContent:'Choose a game to begin.'});
  const player=h('div',{className:'rb-player'}),empty=h('div',{className:'rb-empty',textContent:'SELECT A GAME FROM YOUR LIBRARY'});
  stage.append(empty,player,status);content.append(list,stage);shell.append(header,nav,content);root.append(shell);
  let current=GROUPS[0].id,romUrl=null,loader=null,generation=0;
  for(const g of GROUPS){const b=h('button',{textContent:g.name,'data-group':g.id});b.onclick=()=>{current=g.id;updateTabs();scan()};nav.append(b)}
  function updateTabs(){for(const b of nav.children)b.classList.toggle('active',b.dataset.group===current)}
  function stop(){generation++;player.replaceChildren();loader?.remove();loader=null;empty.style.display='';if(romUrl){URL.revokeObjectURL(romUrl);romUrl=null}delete window.EJS_player;delete window.EJS_gameUrl;delete window.EJS_core;delete window.EJS_pathtodata;}
  async function launch(path,name,g){stop();const token=generation;status.textContent='Loading '+name+'…';empty.style.display='none';
   try{const blob=await V.blob(path);if(token!==generation)return;romUrl=URL.createObjectURL(blob);player.id='retrobox-emulator';
    // EmulatorJS loader reads globals on initialization. Reinsert script for each game.
    window.EJS_player='#retrobox-emulator';window.EJS_gameUrl=romUrl;window.EJS_core=g.core;
    window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';window.EJS_startOnLoaded=true;
    loader=document.createElement('script');loader.src='https://cdn.emulatorjs.org/stable/data/loader.js';loader.async=true;
    loader.onerror=()=>{if(token===generation)status.textContent='Could not load emulator. Internet access is required for the emulator core.'};
    document.body.append(loader);status.textContent=name+' · '+g.name+' · Keyboard and gamepad supported';
   }catch(e){status.textContent='Unable to open ROM: '+(e?.message||e);empty.style.display=''}
  }
  async function scan(){updateTabs();const g=GROUPS.find(x=>x.id===current);list.replaceChildren(h('div',{className:'rb-loading',textContent:'Loading library…'}));
   try{await ensure(ROOT);for(const x of GROUPS)await ensure(join(ROOT,x.id));
    const entries=(await V.ls(join(ROOT,g.id))).filter(e=>e.type!=='d'&&groupFor(e.name)?.id===g.id).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));
    list.replaceChildren();list.append(h('h3',{textContent:g.name}),h('small',{textContent:entries.length+' ROM'+(entries.length===1?'':'s')+' · Alphabetical'}));
    if(!entries.length)list.append(h('p',{className:'rb-hint',textContent:'No games yet. Import your own ROM files to populate this system.'}));
    for(const e of entries){const path=join(join(ROOT,g.id),e.name),b=h('button',{className:'rb-game'});b.append(h('span',{className:'rb-game-icon',textContent:'▣'}),h('span',{textContent:e.name.replace(/\.[^.]+$/,'')}),h('small',{textContent:e.name.split('.').pop().toUpperCase()}));b.onclick=()=>launch(path,e.name,g);list.append(b)}
   }catch(e){list.replaceChildren(h('p',{textContent:'Library error: '+(e?.message||e)}))}
  }
  upload.onchange=async()=>{const files=[...upload.files];let count=0;for(const file of files){const g=groupFor(file.name);if(!g)continue;try{await ensure(ROOT);await ensure(join(ROOT,g.id));await V.put(join(join(ROOT,g.id),safeName(file.name)),file);count++}catch(e){status.textContent='Import error: '+(e?.message||e)}}upload.value='';status.textContent=`Imported ${count} ROM${count===1?'':'s'} into the grouped library.`;scan()};
  updateTabs();scan();
 },()=>{});
}
