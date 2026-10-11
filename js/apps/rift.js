// CuriOS RIFT — deterministic-step local fighting prototype.
// Drop sprite strips into public/assets/rift and edit RIFT_SPRITES to replace silhouettes.
import {win} from '../shell/wm.js';
import {h} from '../kernel/util.js';
import {KV} from '../kernel/vfs.js';
import {SB} from '../kernel/supabase.js';
import {getRiftAccount,saveRiftAppearance} from '../kernel/rift-account.js';
const W=960,H=520,FLOOR=418,STEP=1/60;
const MOVES={light:{startup:5,active:4,recovery:11,damage:7,range:98,stun:16,push:20},heavy:{startup:12,active:5,recovery:22,damage:15,range:115,stun:25,push:38},special:{startup:19,active:7,recovery:31,damage:23,range:152,stun:33,push:58}};
// Sprite-sheet support: each state can map to {src,frames,fps,width,height}.
// Sprites are optional: built-in silhouettes keep the game playable until assets arrive.
export const RIFT_SPRITES={};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Modular, data-driven character parts. Profiles are stored per browser for now.
const PROFILE_KEY='curios.rift.fighter.v1';
const ACCOUNT_KEY='rift.profile.v2';
const PARTS={head:['Round','Angular','Visor'],body:['Standard','Armored','Slim'],arms:['Standard','Heavy','Sleek'],legs:['Standard','Boots','Runner'],crest:['None','Mohawk','Antenna','Horns']};
const DEFAULT_FIGHTER={name:'RIFT PILOT',head:'Visor',body:'Armored',arms:'Standard',legs:'Boots',crest:'None',primary:'#56e9dc',secondary:'#172433',accent:'#f8ffff'};
// Catalog metadata is the foundation for future server-awarded unlocks. No combat advantages.
const UNLOCKS={head:{Angular:2},body:{Slim:3},arms:{Heavy:4},legs:{Runner:5},crest:{Mohawk:2,Antenna:3,Horns:6}};
const xpForLevel=l=>100*(l-1)*l/2;
const levelForXp=x=>Math.max(1,Math.floor((1+Math.sqrt(1+8*Math.max(0,x)/100))/2));
const freshRecord=()=>({version:2,fighter:{...DEFAULT_FIGHTER},xp:0,matches:0,wins:0,history:[],updated:0});
function sanitizeFighter(v){const o={...DEFAULT_FIGHTER};if(!v||typeof v!=='object')return o;o.name=String(v.name||o.name).slice(0,18).trim()||o.name;for(const k of Object.keys(PARTS))if(PARTS[k].includes(v[k]))o[k]=v[k];for(const k of ['primary','secondary','accent'])if(/^#[0-9a-f]{6}$/i.test(v[k]||''))o[k]=v[k];return o}
function sanitizeRecord(v){const o=freshRecord();if(!v||typeof v!=='object')return o;o.fighter=sanitizeFighter(v.fighter);for(const k of ['xp','matches','wins'])o[k]=Number.isSafeInteger(v[k])?Math.max(0,Math.min(v[k],100000000)):0;o.updated=Number.isFinite(v.updated)?v.updated:0;o.history=Array.isArray(v.history)?v.history.slice(-30).filter(x=>x&&typeof x==='object').map(x=>({result:x.result==='Win'?'Win':'Loss',opponent:String(x.opponent||'CPU').slice(0,24),xp:Math.max(0,Math.min(1000,Number(x.xp)||0)),at:Number(x.at)||0})):[];return o}
const unlocked=(part,value,level)=>level>=(UNLOCKS[part]?.[value]||1);
function applyUnlocks(f,level){const v=sanitizeFighter(f);for(const k of Object.keys(PARTS))if(!unlocked(k,v[k],level))v[k]=DEFAULT_FIGHTER[k];return v}
function localRecord(uid){try{const raw=localStorage.getItem(uid?'curios.rift.account.'+uid:PROFILE_KEY);if(raw){const v=JSON.parse(raw);return uid?sanitizeRecord(v):{...freshRecord(),fighter:sanitizeFighter(v)}}}catch{}return freshRecord()}
function saveLocal(uid,record){try{localStorage.setItem(uid?'curios.rift.account.'+uid:PROFILE_KEY,JSON.stringify(uid?record:record.fighter))}catch{}}
function drawFighter(ctx,f,profile){
 ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.face,1);
 const bounce=f.state==='run'?Math.sin(f.frame*.27)*3:0;ctx.translate(0,bounce);
 const a=profile.primary,b=profile.secondary,c=profile.accent;
 ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=a;ctx.shadowBlur=13;
 ctx.strokeStyle=a;ctx.lineWidth=profile.legs==='Runner'?6:11;
 ctx.beginPath();ctx.moveTo(-11,-43);ctx.lineTo(profile.legs==='Runner'?-25:-18,0);ctx.moveTo(11,-43);ctx.lineTo(profile.legs==='Runner'?29:22,0);ctx.stroke();
 if(profile.legs==='Boots'){ctx.fillStyle=b;ctx.fillRect(-31,-9,22,12);ctx.fillRect(12,-9,23,12);ctx.strokeStyle=a;ctx.lineWidth=2;ctx.strokeRect(-31,-9,22,12);ctx.strokeRect(12,-9,23,12)}
 ctx.fillStyle=b;ctx.strokeStyle=a;ctx.lineWidth=4;const bw=profile.body==='Slim'?38:profile.body==='Armored'?54:46;
 ctx.beginPath();ctx.roundRect(-bw/2,-102,bw,64,profile.body==='Armored'?7:14);ctx.fill();ctx.stroke();
 if(profile.body==='Armored'){ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-20,-80);ctx.lineTo(0,-66);ctx.lineTo(20,-80);ctx.stroke()}
 ctx.strokeStyle=a;ctx.lineWidth=profile.arms==='Heavy'?15:profile.arms==='Sleek'?6:10;
 ctx.beginPath();ctx.moveTo(-bw/2+3,-89);ctx.lineTo(-32,-57);ctx.moveTo(bw/2-3,-89);ctx.lineTo(f.move?72:33,f.move?-92:-57);ctx.stroke();
 ctx.fillStyle=b;ctx.strokeStyle=a;ctx.lineWidth=4;ctx.beginPath();
 if(profile.head==='Angular'){ctx.moveTo(-20,-137);ctx.lineTo(17,-140);ctx.lineTo(23,-115);ctx.lineTo(0,-104);ctx.lineTo(-22,-117);ctx.closePath()}
 else if(profile.head==='Visor'){ctx.roundRect(-22,-145,44,41,9)}else{ctx.arc(0,-124,21,0,Math.PI*2)}ctx.fill();ctx.stroke();
 if(profile.head==='Visor'){ctx.fillStyle=c;ctx.shadowColor=c;ctx.fillRect(-16,-131,32,9)}
 ctx.strokeStyle=c;ctx.lineWidth=5;ctx.beginPath();
 if(profile.crest==='Mohawk'){ctx.moveTo(-14,-146);ctx.lineTo(-8,-164);ctx.lineTo(1,-149);ctx.lineTo(9,-164);ctx.lineTo(15,-146)}
 if(profile.crest==='Antenna'){ctx.moveTo(0,-145);ctx.lineTo(0,-165);ctx.lineTo(12,-171)}
 if(profile.crest==='Horns'){ctx.moveTo(-15,-142);ctx.lineTo(-27,-158);ctx.moveTo(15,-142);ctx.lineTo(27,-158)}ctx.stroke();
 if(f.guard){ctx.strokeStyle=c;ctx.lineWidth=5;ctx.beginPath();ctx.arc(30,-90,55,-1.1,1.1);ctx.stroke()}
 if(f.move){const m=MOVES[f.move.type];if(f.move.tick>=m.startup&&f.move.tick<m.startup+m.active){ctx.strokeStyle=a;ctx.globalAlpha=.55;ctx.lineWidth=16;ctx.beginPath();ctx.arc(24,-90,m.range-40,-.9,.45);ctx.stroke()}}
 ctx.restore();
}
function buildCreator(host,initial,onSave,onCancel,level,stats){
 let draft={...initial};const panel=h('section',{className:'rift-creator'}),left=h('div',{className:'rift-creator-fields'}),right=h('div',{className:'rift-creator-preview'}),preview=h('canvas',{width:320,height:360}),pc=preview.getContext('2d');
 const heading=h('h2',{textContent:'CREATE YOUR FIGHTER'}),sub=h('p',{textContent:`LEVEL ${level} · ${stats.xp} XP · ${stats.wins} WINS / ${stats.matches} MATCHES. Unlock new parts by leveling up. Cosmetics do not change combat stats.`});left.append(heading,sub);
 const nameLabel=h('label',{textContent:'Fighter name'}),name=h('input',{type:'text',maxLength:18,value:draft.name});name.addEventListener('input',()=>{draft.name=name.value;paint()});nameLabel.append(name);left.append(nameLabel);
 for(const [key,values] of Object.entries(PARTS)){const label=h('label',{textContent:key[0].toUpperCase()+key.slice(1)}),select=h('select');for(const v of values){const need=UNLOCKS[key]?.[v]||1;const locked=need>level;const opt=h('option',{value:v,textContent:locked?`${v} · Unlock at Lv ${need}`:v,disabled:locked});select.append(opt)}select.value=draft[key];select.addEventListener('change',()=>{draft[key]=select.value;paint()});label.append(select);left.append(label)}
 const colors=h('div',{className:'rift-creator-colors'});for(const [key,title] of [['primary','Glow / trim'],['secondary','Armor'],['accent','Accent']]){const label=h('label',{textContent:title}),picker=h('input',{type:'color',value:draft[key]});picker.addEventListener('input',()=>{draft[key]=picker.value;paint()});label.append(picker);colors.append(label)}left.append(colors);
 const actions=h('div',{className:'rift-creator-actions'}),save=h('button',{textContent:'Save & Fight'}),cancel=h('button',{textContent:'Back to Arena'});save.onclick=()=>onSave(sanitizeFighter(draft));cancel.onclick=onCancel;actions.append(save,cancel);left.append(actions);
 right.append(h('strong',{textContent:'LIVE PREVIEW'}),preview,h('small',{textContent:'Account appearances are saved securely. Only server-verified online matches can award account XP.'}));panel.append(left,right);host.append(panel);
 function paint(){pc.clearRect(0,0,320,360);const grad=pc.createLinearGradient(0,0,0,360);grad.addColorStop(0,'#0b1e30');grad.addColorStop(1,'#142a34');pc.fillStyle=grad;pc.fillRect(0,0,320,360);pc.fillStyle='#2e5962';pc.fillRect(0,308,320,3);const mock={x:160,y:307,face:1,state:'idle',frame:0,guard:false,move:null};pc.save();pc.translate(0,35);pc.scale(1.45,1.45);pc.translate(-49,-80);drawFighter(pc,mock,draft);pc.restore();pc.fillStyle='#f1fffe';pc.textAlign='center';pc.font='bold 16px system-ui';pc.fillText(draft.name||'FIGHTER',160,33)}paint();return panel;
}


function buildFighterProfile(host,record,onClose,onEdit){
 const fighter=record.fighter,level=levelForXp(record.xp),current=xpForLevel(level),next=xpForLevel(level+1),percent=clamp((record.xp-current)/(next-current)*100,0,100);
 const panel=h('section',{className:'rift-profile'});
 const top=h('div',{className:'rift-profile-top'}),title=h('div'),close=h('button',{textContent:'Back to Arena'});
 title.append(h('small',{textContent:'CURIOS RIFT / FIGHTER IDENTITY'}),h('h2',{textContent:fighter.name}));close.onclick=onClose;top.append(title,close);panel.append(top);
 const main=h('div',{className:'rift-profile-grid'}),portrait=h('div',{className:'rift-profile-portrait'}),canvas=h('canvas',{width:320,height:380}),ctx=canvas.getContext('2d');
 const grd=ctx.createLinearGradient(0,0,320,380);grd.addColorStop(0,'#102d3c');grd.addColorStop(1,'#07101e');ctx.fillStyle=grd;ctx.fillRect(0,0,320,380);
 ctx.fillStyle='#224953';ctx.fillRect(0,337,320,2);ctx.save();ctx.translate(-18,5);ctx.scale(1.5,1.5);drawFighter(ctx,{x:130,y:220,face:1,state:'idle',frame:0,guard:false,move:null},fighter);ctx.restore();
 portrait.append(canvas,h('div',{className:'rift-profile-name',textContent:fighter.name}));
 const info=h('div',{className:'rift-profile-info'});info.append(h('div',{className:'rift-profile-level',textContent:'LEVEL '+level}),h('div',{className:'rift-profile-xp',textContent:`${record.xp-current} / ${next-current} XP to next level`}));
 const track=h('div',{className:'rift-profile-track'}),fill=h('div',{className:'rift-profile-fill'});fill.style.width=percent+'%';track.append(fill);info.append(track);
 const stats=h('div',{className:'rift-profile-stats'});for(const [name,value] of [['MATCHES',record.matches],['WINS',record.wins],['WIN RATE',record.matches?Math.round(record.wins/record.matches*100)+'%':'—']]){const cell=h('div');cell.append(h('strong',{textContent:String(value)}),h('small',{textContent:name}));stats.append(cell)}info.append(stats);
 const edit=h('button',{textContent:'Customize Fighter',className:'rift-profile-edit'});edit.onclick=onEdit;info.append(edit);main.append(portrait,info);panel.append(main);
 const collection=h('section',{className:'rift-profile-collection'});collection.append(h('h3',{textContent:'UNLOCK COLLECTION'}));
 for(const [part,values] of Object.entries(PARTS)){const row=h('div',{className:'rift-profile-unlock-row'});row.append(h('strong',{textContent:part.toUpperCase()}));const items=h('div',{className:'rift-profile-unlock-items'});for(const value of values){const required=UNLOCKS[part]?.[value]||1,available=level>=required;items.append(h('span',{className:'rift-profile-chip'+(available?'':' locked'),textContent:available?'✓ '+value:'🔒 '+value+' · Lv '+required}))}row.append(items);collection.append(row)}panel.append(collection);
 const history=h('section',{className:'rift-profile-history'});history.append(h('h3',{textContent:'RECENT MATCHES'}));if(!record.history?.length)history.append(h('p',{textContent:'No recorded matches yet. Finish a match to begin your history.'}));else for(const match of [...record.history].reverse().slice(0,10)){const item=h('div',{className:'rift-profile-match'});item.append(h('strong',{textContent:match.result}),h('span',{textContent:'vs '+match.opponent}),h('span',{textContent:'+'+match.xp+' XP'}),h('time',{textContent:match.at?new Date(match.at).toLocaleDateString():'—'}));history.append(item)}panel.append(history);
 panel.append(h('small',{className:'rift-profile-disclaimer',textContent:'Prototype records: match results and XP are currently awarded locally. Competitive rankings require server-verified matches.'}));host.append(panel);return panel;
}

const player=(x,name,color,face)=>({x,y:FLOOR,vx:0,vy:0,face,name,color,hp:100,rounds:0,state:'idle',frame:0,move:null,hit:false,stun:0,guard:false,grounded:true});
export function rift(){
 const existing=document.querySelector('[data-win-id="rift"]');if(existing){existing.style.display='flex';return}
 let dispose=()=>{};
 win('rift','CuriOS RIFT · Arena',1080,690,root=>{
  root.classList.add('rift-root');
  const shell=h('div',{className:'rift-shell'}),hud=h('div',{className:'rift-controls'}),canvas=h('canvas',{width:W,height:H,tabIndex:0,'aria-label':'RIFT fighting arena'}),ctx=canvas.getContext('2d');
  const status=h('span',{textContent:'FIRST TO 2 ROUNDS'}),creatorButton=h('button',{textContent:'Create Fighter'}),profileButton=h('button',{textContent:'Fighter Profile'}),mode=h('button',{textContent:'Opponent: CPU'}),reset=h('button',{textContent:'Restart Match'}),help=h('span',{textContent:'P1: A/D move · W jump · S block · J/K/U attacks  |  P2: ←/→ move · ↑ jump · ↓ block · 1/2/3 attacks'});
  hud.append(status,profileButton,creatorButton,mode,reset);shell.append(hud,canvas,help);root.append(shell);
  const uid=SB?.uid||null;
  let record=localRecord(uid),profile=applyUnlocks(record.fighter,levelForXp(record.xp)),creating=false,creatorPanel=null,viewingProfile=false,profilePanel=null,loaded=false,saveQueue=Promise.resolve();
  const level=()=>levelForXp(record.xp);
  const showProgress=()=>{status.textContent=`LV ${level()} · ${record.xp} XP · FIRST TO 2 ROUNDS`};
  const persist=()=>{record.fighter=profile;record.updated=Date.now();saveLocal(uid,record);if(uid){const snapshot={...profile};saveQueue=saveQueue.catch(()=>{}).then(()=>saveRiftAppearance(snapshot)).catch(e=>{console.warn('[RIFT] Cosmetic save failed',e);status.textContent='Cosmetic save failed — check server setup'})}};
  showProgress();
  creatorButton.disabled=!!uid;profileButton.disabled=!!uid;
  if(uid){getRiftAccount().then(cloud=>{if(!canvas.isConnected)return;record=sanitizeRecord(cloud);if(!cloud.fighter){record.fighter=applyUnlocks(localRecord(null).fighter,levelForXp(record.xp));profile=record.fighter;persist()}else profile=applyUnlocks(record.fighter,level());saveLocal(uid,record);showProgress();restart()}).catch(e=>{console.warn('[RIFT] Secure profile unavailable',e);status.textContent='Account progression unavailable — deploy rift-secure.sql';record=freshRecord();profile=record.fighter}).finally(()=>{loaded=true;creatorButton.disabled=false;profileButton.disabled=false})}else{loaded=true}
  const awardMatch=(winner)=>{if(!winner||!loaded)return;if(uid){status.textContent='PRACTICE MATCH · No ranked XP (verified online matches coming)';return}record.matches++;if(winner===p1)record.wins++;const won=winner===p1,earned=won?80:35;record.xp+=earned;record.history??=[];record.history.push({result:won?'Win':'Loss',opponent:cpu?'CPU':'LOCAL P2',xp:earned,at:Date.now()});record.history=record.history.slice(-30);profile=applyUnlocks(profile,level());showProgress();persist()};
  let p1,p2,round=1,clock=90,paused=false,ended=false,cpu=true,notice='',noticeFrames=0,acc=0,last=0,raf=0,roundDelay=0;
  const held=new Set(),pressed=new Set();
  const mappings=[{left:'KeyA',right:'KeyD',jump:'KeyW',block:'KeyS',light:'KeyJ',heavy:'KeyK',special:'KeyU'}, {left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',block:'ArrowDown',light:'Digit1',heavy:'Digit2',special:'Digit3'}];
  const resetRound=()=>{p1=player(245,profile.name,profile.primary,1);p2=player(715,cpu?'CPU':'PLAYER 2','#ff759f',-1);clock=90;roundDelay=0;notice='ROUND '+round;noticeFrames=90;};
  const restart=()=>{round=1;ended=false;resetRound()};restart();
  function keydown(e){if(creating||viewingProfile||!canvas.isConnected||document.activeElement!==canvas)return;if(Object.values(mappings[0]).includes(e.code)||Object.values(mappings[1]).includes(e.code)){e.preventDefault();if(!held.has(e.code))pressed.add(e.code);held.add(e.code)}}
  function keyup(e){held.delete(e.code)}
  addEventListener('keydown',keydown);addEventListener('keyup',keyup);
  canvas.addEventListener('pointerdown',()=>canvas.focus());
  mode.onclick=()=>{cpu=!cpu;mode.textContent='Opponent: '+(cpu?'CPU':'Local P2');restart();canvas.focus()};
  reset.onclick=()=>{restart();canvas.focus()};
  function closeCreator(){creating=false;creatorPanel?.remove();creatorPanel=null;canvas.style.display='';help.style.display='';canvas.focus()}
  function closeProfile(){viewingProfile=false;profilePanel?.remove();profilePanel=null;canvas.style.display='';help.style.display='';canvas.focus()}
  profileButton.onclick=()=>{if(creating||viewingProfile||!loaded)return;viewingProfile=true;held.clear();pressed.clear();canvas.style.display='none';help.style.display='none';profilePanel=buildFighterProfile(shell,record,closeProfile,()=>{closeProfile();creatorButton.click()})};
  creatorButton.onclick=()=>{if(creating||viewingProfile||!loaded)return;creating=true;held.clear();pressed.clear();canvas.style.display='none';help.style.display='none';creatorPanel=buildCreator(shell,profile,next=>{profile=applyUnlocks(next,level());persist();closeCreator();restart()},closeCreator,level(),record)};
  function controls(f,i){if(i===1&&cpu){const dist=p1.x-f.x;const near=Math.abs(dist)<112;return {left:dist< -82,right:dist>82,jump:false,block:near&&p1.move&&p1.move.tick<13,attack:near&&!f.move&&!f.stun&&(Math.random()<.055?'light':Math.random()<.015?'heavy':null)}}
   const m=mappings[i];return {left:held.has(m.left),right:held.has(m.right),jump:pressed.has(m.jump),block:held.has(m.block),attack:pressed.has(m.light)?'light':pressed.has(m.heavy)?'heavy':pressed.has(m.special)?'special':null};}
  function updateFighter(f,other,input){
   if(f.hp<=0)return;
   if(f.stun>0){f.stun--;f.state='hit';f.guard=false}
   else if(f.move){f.move.tick++;const m=MOVES[f.move.type];f.state=f.move.type;if(!f.move.connected&&f.move.tick>=m.startup&&f.move.tick<m.startup+m.active){const forward=(other.x-f.x)*f.face>0;if(forward&&Math.abs(other.x-f.x)<m.range&&Math.abs(other.y-f.y)<64){f.move.connected=true;const blocked=other.guard&&other.grounded&&other.stun===0&&other.face*(f.x-other.x)>0;other.hp=clamp(other.hp-(blocked?Math.ceil(m.damage*.15):m.damage),0,100);other.x=clamp(other.x+f.face*m.push*(blocked?.25:1),45,W-45);if(!blocked){other.stun=m.stun;other.move=null;other.state='hit'}notice=blocked?'BLOCK!':m.damage+' DAMAGE';noticeFrames=24}}if(f.move.tick>=m.startup+m.active+m.recovery)f.move=null;
   }else{
    f.face=other.x>=f.x?1:-1;
    f.guard=!!input.block&&f.grounded;
    const speed=f.guard?0:4.1;f.vx=((input.right?1:0)-(input.left?1:0))*speed;
    f.x=clamp(f.x+f.vx,45,W-45);
    if(input.jump&&f.grounded&&!f.guard){f.vy=-12.6;f.grounded=false}
    if(input.attack&&!f.guard){f.move={type:input.attack,tick:0,connected:false};f.state=input.attack}
    else f.state=f.guard?'block':!f.grounded?'jump':Math.abs(f.vx)>0?'run':'idle';
   }
   if(!f.grounded){f.vy+=.62;f.y+=f.vy;if(f.y>=FLOOR){f.y=FLOOR;f.vy=0;f.grounded=true}}
   f.frame++;
  }
  function tick(){if(paused||ended)return;if(roundDelay>0){roundDelay--;if(!roundDelay){if(p1.rounds>=2||p2.rounds>=2){ended=true;awardMatch(p1.rounds>p2.rounds?p1:p2);notice=(p1.rounds>p2.rounds?'PLAYER 1':'PLAYER 2')+' WINS MATCH';noticeFrames=99999}else{round++;resetRound()}}return}
   const c1=controls(p1,0),c2=controls(p2,1);updateFighter(p1,p2,c1);updateFighter(p2,p1,c2);pressed.clear();clock=Math.max(0,clock-STEP);
   if(p1.hp<=0||p2.hp<=0||clock<=0){const winner=p1.hp===p2.hp?null:p1.hp>p2.hp?p1:p2;if(winner)winner.rounds++;notice=winner?winner.name+' TAKES ROUND':'DRAW';noticeFrames=120;roundDelay=120}
   if(noticeFrames>0)noticeFrames--;
  }
  function silhouette(f){ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.face,1);const airborne=!f.grounded;const bounce=f.state==='run'?Math.sin(f.frame*.27)*3:0;ctx.translate(0,bounce);ctx.shadowColor=f.color;ctx.shadowBlur=18;ctx.strokeStyle=f.color;ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';
   ctx.beginPath();ctx.moveTo(-10,-44);ctx.lineTo(-18,0);ctx.moveTo(10,-44);ctx.lineTo(22,0);ctx.stroke();ctx.fillStyle='#172433';ctx.strokeStyle=f.color;ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-23,-102,46,64,13);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-124,20,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=f.color;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-17,-89);ctx.lineTo(-30,-56);ctx.moveTo(17,-89);ctx.lineTo(f.move?72:31,f.move?-92:-58);ctx.stroke();if(f.guard){ctx.strokeStyle='#9ffcf6';ctx.lineWidth=5;ctx.beginPath();ctx.arc(30,-90,55,-1.1,1.1);ctx.stroke()}if(f.move){const m=MOVES[f.move.type];if(f.move.tick>=m.startup&&f.move.tick<m.startup+m.active){ctx.strokeStyle=f.color;ctx.globalAlpha=.55;ctx.lineWidth=16;ctx.beginPath();ctx.arc(24,-90,m.range-40,-.9,.45);ctx.stroke()}}ctx.restore();}
  function render(){ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#071321');sky.addColorStop(1,'#1b273b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
   for(let i=0;i<9;i++){const x=i*137-50;ctx.fillStyle=i%2?'#152b3c':'#112334';ctx.fillRect(x,160+(i%3)*30,90,255);ctx.fillStyle='#2ad7d522';for(let j=0;j<5;j++)ctx.fillRect(x+14+j*13,185+(i%3)*30,4,175)}
   ctx.fillStyle='#1e3943';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillStyle='#4dded4';ctx.fillRect(0,FLOOR,W,3);ctx.strokeStyle='#4dded42a';for(let i=0;i<14;i++){ctx.beginPath();ctx.moveTo(i*85,FLOOR);ctx.lineTo(i*120-180,H);ctx.stroke()}
   ctx.fillStyle='#0b1424aa';ctx.fillRect(24,23,912,70);ctx.fillStyle=profile.primary;ctx.fillRect(45,45,360*p1.hp/100,18);ctx.fillStyle=p2.color;ctx.fillRect(915-360*p2.hp/100,45,360*p2.hp/100,18);
   ctx.fillStyle='#fff';ctx.font='bold 19px system-ui';ctx.textAlign='left';ctx.fillText(profile.name.toUpperCase(),45,37);ctx.textAlign='right';ctx.fillText(cpu?'CPU':'PLAYER 2',915,37);ctx.textAlign='center';ctx.font='bold 33px system-ui';ctx.fillText(String(Math.ceil(clock)).padStart(2,'0'),480,65);
   ctx.font='19px system-ui';ctx.fillText('●'.repeat(p1.rounds)+' ○'.repeat(2-p1.rounds),120,88);ctx.fillText('●'.repeat(p2.rounds)+' ○'.repeat(2-p2.rounds),840,88);
   ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(p1.x,FLOOR+4,43,10,0,0,Math.PI*2);ctx.ellipse(p2.x,FLOOR+4,43,10,0,0,Math.PI*2);ctx.fill();drawFighter(ctx,p1,profile);silhouette(p2);
   if(noticeFrames>0||ended){ctx.font='bold 36px system-ui';ctx.fillStyle='#fff';ctx.shadowColor='#65f9ec';ctx.shadowBlur=20;ctx.fillText(notice,480,175);ctx.shadowBlur=0}if(paused){ctx.fillStyle='#000a';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 38px system-ui';ctx.fillText('PAUSED · CLICK ARENA TO RESUME',480,260)}
  }
  function loop(t){if(!canvas.isConnected){dispose();return}const dt=Math.min(.08,(t-last)/1000||0);last=t;acc+=dt;paused=creating||document.activeElement!==canvas||document.querySelector('.curios-carousel-overlay.active')!==null||document.querySelector('#lock:not([hidden])')!==null;while(acc>=STEP){tick();acc-=STEP}render();raf=requestAnimationFrame(loop)}
  dispose=()=>{cancelAnimationFrame(raf);removeEventListener('keydown',keydown);removeEventListener('keyup',keyup)};raf=requestAnimationFrame(loop);
  setTimeout(()=>canvas.focus(),150);
 },dispose);
}
