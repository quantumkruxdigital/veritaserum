// CuriOS RIFT — deterministic-step local fighting prototype.
// Drop sprite strips into public/assets/rift and edit RIFT_SPRITES to replace silhouettes.
import {win} from '../shell/wm.js';
import {h} from '../kernel/util.js';
const W=960,H=520,FLOOR=418,STEP=1/60;
const MOVES={light:{startup:5,active:4,recovery:11,damage:7,range:98,stun:16,push:20},heavy:{startup:12,active:5,recovery:22,damage:15,range:115,stun:25,push:38},special:{startup:19,active:7,recovery:31,damage:23,range:152,stun:33,push:58}};
// Sprite-sheet support: each state can map to {src,frames,fps,width,height}.
// Sprites are optional: built-in silhouettes keep the game playable until assets arrive.
export const RIFT_SPRITES={};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const player=(x,name,color,face)=>({x,y:FLOOR,vx:0,vy:0,face,name,color,hp:100,rounds:0,state:'idle',frame:0,move:null,hit:false,stun:0,guard:false,grounded:true});
export function rift(){
 const existing=document.querySelector('[data-win-id="rift"]');if(existing){existing.style.display='flex';return}
 let dispose=()=>{};
 win('rift','CuriOS RIFT · Arena',1080,690,root=>{
  root.classList.add('rift-root');
  const shell=h('div',{className:'rift-shell'}),hud=h('div',{className:'rift-controls'}),canvas=h('canvas',{width:W,height:H,tabIndex:0,'aria-label':'RIFT fighting arena'}),ctx=canvas.getContext('2d');
  const status=h('span',{textContent:'FIRST TO 2 ROUNDS'}),mode=h('button',{textContent:'Opponent: CPU'}),reset=h('button',{textContent:'Restart Match'}),help=h('span',{textContent:'P1: A/D move · W jump · S block · J/K/U attacks  |  P2: ←/→ move · ↑ jump · ↓ block · 1/2/3 attacks'});
  hud.append(status,mode,reset);shell.append(hud,canvas,help);root.append(shell);
  let p1,p2,round=1,clock=90,paused=false,ended=false,cpu=true,notice='',noticeFrames=0,acc=0,last=0,raf=0,roundDelay=0;
  const held=new Set(),pressed=new Set();
  const mappings=[{left:'KeyA',right:'KeyD',jump:'KeyW',block:'KeyS',light:'KeyJ',heavy:'KeyK',special:'KeyU'}, {left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',block:'ArrowDown',light:'Digit1',heavy:'Digit2',special:'Digit3'}];
  const resetRound=()=>{p1=player(245,'PLAYER 1','#56e9dc',1);p2=player(715,cpu?'CPU':'PLAYER 2','#ff759f',-1);clock=90;roundDelay=0;notice='ROUND '+round;noticeFrames=90;};
  const restart=()=>{round=1;ended=false;resetRound()};restart();
  function keydown(e){if(!canvas.isConnected||document.activeElement!==canvas)return;if(Object.values(mappings[0]).includes(e.code)||Object.values(mappings[1]).includes(e.code)){e.preventDefault();if(!held.has(e.code))pressed.add(e.code);held.add(e.code)}}
  function keyup(e){held.delete(e.code)}
  addEventListener('keydown',keydown);addEventListener('keyup',keyup);
  canvas.addEventListener('pointerdown',()=>canvas.focus());
  mode.onclick=()=>{cpu=!cpu;mode.textContent='Opponent: '+(cpu?'CPU':'Local P2');restart();canvas.focus()};
  reset.onclick=()=>{restart();canvas.focus()};
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
  function tick(){if(paused||ended)return;if(roundDelay>0){roundDelay--;if(!roundDelay){if(p1.rounds>=2||p2.rounds>=2){ended=true;notice=(p1.rounds>p2.rounds?'PLAYER 1':'PLAYER 2')+' WINS MATCH';noticeFrames=99999}else{round++;resetRound()}}return}
   const c1=controls(p1,0),c2=controls(p2,1);updateFighter(p1,p2,c1);updateFighter(p2,p1,c2);pressed.clear();clock=Math.max(0,clock-STEP);
   if(p1.hp<=0||p2.hp<=0||clock<=0){const winner=p1.hp===p2.hp?null:p1.hp>p2.hp?p1:p2;if(winner)winner.rounds++;notice=winner?winner.name+' TAKES ROUND':'DRAW';noticeFrames=120;roundDelay=120}
   if(noticeFrames>0)noticeFrames--;
  }
  function silhouette(f){ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.face,1);const airborne=!f.grounded;const bounce=f.state==='run'?Math.sin(f.frame*.27)*3:0;ctx.translate(0,bounce);ctx.shadowColor=f.color;ctx.shadowBlur=18;ctx.strokeStyle=f.color;ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';
   ctx.beginPath();ctx.moveTo(-10,-44);ctx.lineTo(-18,0);ctx.moveTo(10,-44);ctx.lineTo(22,0);ctx.stroke();ctx.fillStyle='#172433';ctx.strokeStyle=f.color;ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-23,-102,46,64,13);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-124,20,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=f.color;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-17,-89);ctx.lineTo(-30,-56);ctx.moveTo(17,-89);ctx.lineTo(f.move?72:31,f.move?-92:-58);ctx.stroke();if(f.guard){ctx.strokeStyle='#9ffcf6';ctx.lineWidth=5;ctx.beginPath();ctx.arc(30,-90,55,-1.1,1.1);ctx.stroke()}if(f.move){const m=MOVES[f.move.type];if(f.move.tick>=m.startup&&f.move.tick<m.startup+m.active){ctx.strokeStyle=f.color;ctx.globalAlpha=.55;ctx.lineWidth=16;ctx.beginPath();ctx.arc(24,-90,m.range-40,-.9,.45);ctx.stroke()}}ctx.restore();}
  function render(){ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#071321');sky.addColorStop(1,'#1b273b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
   for(let i=0;i<9;i++){const x=i*137-50;ctx.fillStyle=i%2?'#152b3c':'#112334';ctx.fillRect(x,160+(i%3)*30,90,255);ctx.fillStyle='#2ad7d522';for(let j=0;j<5;j++)ctx.fillRect(x+14+j*13,185+(i%3)*30,4,175)}
   ctx.fillStyle='#1e3943';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillStyle='#4dded4';ctx.fillRect(0,FLOOR,W,3);ctx.strokeStyle='#4dded42a';for(let i=0;i<14;i++){ctx.beginPath();ctx.moveTo(i*85,FLOOR);ctx.lineTo(i*120-180,H);ctx.stroke()}
   ctx.fillStyle='#0b1424aa';ctx.fillRect(24,23,912,70);ctx.fillStyle=p1.color;ctx.fillRect(45,45,360*p1.hp/100,18);ctx.fillStyle=p2.color;ctx.fillRect(915-360*p2.hp/100,45,360*p2.hp/100,18);
   ctx.fillStyle='#fff';ctx.font='bold 19px system-ui';ctx.textAlign='left';ctx.fillText('PLAYER 1',45,37);ctx.textAlign='right';ctx.fillText(cpu?'CPU':'PLAYER 2',915,37);ctx.textAlign='center';ctx.font='bold 33px system-ui';ctx.fillText(String(Math.ceil(clock)).padStart(2,'0'),480,65);
   ctx.font='19px system-ui';ctx.fillText('●'.repeat(p1.rounds)+' ○'.repeat(2-p1.rounds),120,88);ctx.fillText('●'.repeat(p2.rounds)+' ○'.repeat(2-p2.rounds),840,88);
   ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(p1.x,FLOOR+4,43,10,0,0,Math.PI*2);ctx.ellipse(p2.x,FLOOR+4,43,10,0,0,Math.PI*2);ctx.fill();silhouette(p1);silhouette(p2);
   if(noticeFrames>0||ended){ctx.font='bold 36px system-ui';ctx.fillStyle='#fff';ctx.shadowColor='#65f9ec';ctx.shadowBlur=20;ctx.fillText(notice,480,175);ctx.shadowBlur=0}if(paused){ctx.fillStyle='#000a';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 38px system-ui';ctx.fillText('PAUSED · CLICK ARENA TO RESUME',480,260)}
  }
  function loop(t){if(!canvas.isConnected){dispose();return}const dt=Math.min(.08,(t-last)/1000||0);last=t;acc+=dt;paused=document.activeElement!==canvas||document.querySelector('.curios-carousel-overlay.active')!==null||document.querySelector('#lock:not([hidden])')!==null;while(acc>=STEP){tick();acc-=STEP}render();raf=requestAnimationFrame(loop)}
  dispose=()=>{cancelAnimationFrame(raf);removeEventListener('keydown',keydown);removeEventListener('keyup',keyup)};raf=requestAnimationFrame(loop);
  setTimeout(()=>canvas.focus(),150);
 },dispose);
}
