// CuriOS sign-in / lock screen and signature particle-C reveal.
import {SB, sbAuth, sbSet} from '../kernel/supabase.js';
import {$, h} from '../kernel/util.js';

async function enterCuriOSFullscreen(){
 try{
  if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});
 }catch{}
}
async function leaveCuriOSFullscreen(){try{if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen()}catch{}}

function digitalSpace(canvas){
 const x=canvas.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let dots=[],raf=0,w=0,hh=0,dpr=1,mode='idle',start=0,panel=null,done=null;
 const resize=()=>{const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=Math.max(1,r.width);hh=Math.max(1,r.height);canvas.width=w*dpr;canvas.height=hh*dpr;x.setTransform(dpr,0,0,dpr,0,0);const count=Math.max(70,Math.min(180,Math.round(w*hh/9000)));dots=Array.from({length:count},(_,i)=>({x:Math.random()*w,y:Math.random()*hh,ox:0,oy:0,z:.25+Math.random()*.9,v:.05+Math.random()*.18,s:.7+Math.random()*1.8,i}))};
 const target=(d,r)=>{const pr=panel?.getBoundingClientRect(),cr=canvas.getBoundingClientRect();const cx=(pr?pr.left+pr.width/2:cr.left+w/2)-cr.left,cy=(pr?pr.top+pr.height/2:cr.top+hh/2)-cr.top;const rx=(pr?pr.width*.67:Math.min(w,hh)*.24),ry=(pr?pr.height*.72:Math.min(w,hh)*.3);const gap=.72;const a=gap+(Math.PI*2-gap*2)*(d.i/Math.max(1,dots.length-1));return{x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry}}
 const ease=v=>1-Math.pow(1-Math.max(0,Math.min(1,v)),3);
 const draw=t=>{if(!canvas.isConnected)return; x.clearRect(0,0,w,hh);const g=x.createRadialGradient(w*.5,hh*.42,0,w*.5,hh*.42,Math.max(w,hh)*.75);g.addColorStop(0,'#0a5862');g.addColorStop(.45,'#063d4b');g.addColorStop(1,'#02151d');x.fillStyle=g;x.fillRect(0,0,w,hh);
  const elapsed=mode==='idle'?0:t-start;
  for(const d of dots){
   if(mode==='idle'&&!reduce){d.y-=d.v*d.z*(1+Math.sin(t*.00025+d.x)*.25);d.x+=Math.sin(t*.00018+d.y*.01)*.035*d.z;if(d.y<-8){d.y=hh+8;d.x=Math.random()*w}}
   else if(mode==='reveal'&&!reduce){const q=target(d);let k=ease((elapsed-350)/1450);if(elapsed<350){const pr=panel?.getBoundingClientRect(),cr=canvas.getBoundingClientRect();const cx=(pr?pr.left+pr.width/2:cr.left+w/2)-cr.left,cy=(pr?pr.top+pr.height/2:cr.top+hh/2)-cr.top;const a=Math.atan2(d.y-cy,d.x-cx)+elapsed*.004;const rr=Math.hypot(d.x-cx,d.y-cy)*(1-elapsed/350*.18);d.x=cx+Math.cos(a)*rr;d.y=cy+Math.sin(a)*rr}else{d.x=d.ox+(q.x-d.ox)*k;d.y=d.oy+(q.y-d.oy)*k}}
   const pulse=.65+.3*Math.sin(t*.0014+d.x);x.globalAlpha=Math.max(.2,pulse*d.z);x.fillStyle=d.z>.65?'#8affec':'#40cbd3';x.shadowColor='#55f5e7';x.shadowBlur=mode==='reveal'&&elapsed>1500?8:2;x.beginPath();x.arc(d.x,d.y,d.s*d.z*(mode==='reveal'&&elapsed>1500?1.35:1),0,Math.PI*2);x.fill();x.shadowBlur=0
  }x.globalAlpha=1;
  if(mode==='reveal'&&elapsed>=3000){mode='done';const cb=done;done=null;cb?.();return}raf=requestAnimationFrame(draw)};
 resize();addEventListener('resize',resize,{passive:true});draw(0);
 return{reveal(p,cb){panel=p;done=cb;if(reduce){canvas.closest('#lock')?.classList.add('login-revealing','reduced');setTimeout(()=>cb?.(),650);return}for(const d of dots){d.ox=d.x;d.oy=d.y}mode='reveal';start=performance.now();canvas.closest('#lock')?.classList.add('login-revealing')},stop(){cancelAnimationFrame(raf)}}
}
function successful(lock,space,panel,cb){lock.classList.add('login-success');panel.querySelectorAll('input,button,.msg').forEach(e=>e.disabled=true);space.reveal(panel,()=>{lock.classList.add('login-finish');setTimeout(cb,120)})}
export function showLogin(msg){const e=h('input',{type:'email',placeholder:'Email',autocomplete:'username'}),p=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password'}),m=h('div',{className:'msg',textContent:msg||''}),canvas=h('canvas',{className:'login-space','aria-hidden':'true'});
 let busy=false,space;const panel=h('div',{className:'vf login-panel'},h('div',{className:'login-brand',textContent:'CuriOS'}),h('div',{className:'login-title',textContent:'Sign in to your desktop'}),e,p,h('button',{className:'btn',textContent:'Sign in'}),h('button',{className:'btn',textContent:'Create account'}),m);const lock=h('div',{id:'lock'},canvas,h('div',{className:'login-scanlines','aria-hidden':'true'}),panel);
 const go=async up=>{if(busy)return;m.style.color='';m.textContent='';enterCuriOSFullscreen();try{const j=await sbAuth(up?'signup':'token?grant_type=password',{email:e.value.trim(),password:p.value});if(!j.access_token){leaveCuriOSFullscreen();m.style.color='var(--dim)';m.textContent='Check your email to confirm the account, then sign in.';return}busy=true;sbSet(j);successful(lock,space,panel,()=>{space.stop();lock.remove();dispatchEvent(new CustomEvent('curios:authenticated'))})}catch(x){leaveCuriOSFullscreen();m.textContent=String(x)}};panel.querySelectorAll('button')[0].onclick=()=>go(0);panel.querySelectorAll('button')[1].onclick=()=>go(1);p.onkeydown=ev=>ev.key==='Enter'&&go(0);$('#fit').append(lock);space=digitalSpace(canvas);setTimeout(()=>e.focus(),50)}

export function showLock(onUnlock){
 if(document.querySelector('#lock'))return;
 const p=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password'}),m=h('div',{className:'msg'}),canvas=h('canvas',{className:'login-space','aria-hidden':'true'}),panel=h('div',{className:'vf login-panel lock-panel'},h('div',{className:'login-brand',textContent:'CuriOS'}),h('div',{className:'login-title',textContent:'Session locked'}),SB?.email?h('div',{className:'lock-user',textContent:SB.email}):h('div',{className:'lock-user',textContent:'Local session'}),p,h('button',{className:'btn',textContent:'Unlock'}),m),lock=h('div',{id:'lock'},canvas,h('div',{className:'login-scanlines','aria-hidden':'true'}),panel);let busy=false,space;
 const unlock=async()=>{if(busy)return;m.textContent='';enterCuriOSFullscreen();try{if(SB?.email){const j=await sbAuth('token?grant_type=password',{email:SB.email,password:p.value});if(!j.access_token)throw'Unable to unlock.';sbSet(j)}busy=true;successful(lock,space,panel,()=>{space.stop();lock.remove();onUnlock?.()})}catch(x){leaveCuriOSFullscreen();m.textContent=String(x);p.select()}};panel.querySelector('button').onclick=unlock;p.onkeydown=e=>e.key==='Enter'&&unlock();if(!SB?.email)p.style.display='none';$('#fit').append(lock);space=digitalSpace(canvas);setTimeout(()=>SB?.email?p.focus():panel.querySelector('button')?.focus(),50)
}
