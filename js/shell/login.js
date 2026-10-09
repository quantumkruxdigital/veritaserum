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
 const resize=()=>{const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=Math.max(1,r.width);hh=Math.max(1,r.height);canvas.width=w*dpr;canvas.height=hh*dpr;x.setTransform(dpr,0,0,dpr,0,0);const count=Math.max(70,Math.min(180,Math.round(w*hh/9000)));dots=Array.from({length:count},(_,i)=>({x:Math.random()*w,y:Math.random()*hh,ox:0,oy:0,z:.25+Math.random()*.9,v:.07+Math.random()*.23,s:.7+Math.random()*1.8,i}))};
 const target=(d,r)=>{const pr=panel?.getBoundingClientRect(),cr=canvas.getBoundingClientRect();const cx=(pr?pr.left+pr.width/2:cr.left+w/2)-cr.left,cy=(pr?pr.top+pr.height/2:cr.top+hh/2)-cr.top;const rx=(pr?pr.width*.67:Math.min(w,hh)*.24),ry=(pr?pr.height*.72:Math.min(w,hh)*.3);const gap=.72;const a=gap+(Math.PI*2-gap*2)*(d.i/Math.max(1,dots.length-1));return{x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry}}
 const ease=v=>1-Math.pow(1-Math.max(0,Math.min(1,v)),3);
 const draw=t=>{if(!canvas.isConnected)return; x.clearRect(0,0,w,hh);
  // Brilliant white digital space with soft dimensional falloff. Kept in the
  // canvas itself so login and lock render identically regardless of CSS cache.
  const g=x.createRadialGradient(w*.47,hh*.36,0,w*.5,hh*.48,Math.max(w,hh)*.82);
  g.addColorStop(0,'#ffffff');g.addColorStop(.48,'#fbfdff');g.addColorStop(.78,'#f0f4f7');g.addColorStop(1,'#d9e0e5');x.fillStyle=g;x.fillRect(0,0,w,hh);
  const depth=x.createRadialGradient(w*.5,hh*.5,Math.min(w,hh)*.18,w*.5,hh*.5,Math.max(w,hh)*.72);depth.addColorStop(0,'rgba(255,255,255,0)');depth.addColorStop(.72,'rgba(80,105,118,.025)');depth.addColorStop(1,'rgba(25,42,52,.12)');x.fillStyle=depth;x.fillRect(0,0,w,hh);
  // Implied spatial depth only: no walls, corners, horizon or hard edges.
  // Broad feathered shadows shift slightly with pointer movement.
  const px=0,py=0;
  const softGlow=x.createRadialGradient(w*.49-px,hh*.42-py,Math.min(w,hh)*.09,w*.49-px,hh*.42-py,Math.max(w,hh)*.64);
  softGlow.addColorStop(0,'rgba(255,255,255,.56)');
  softGlow.addColorStop(.56,'rgba(255,255,255,.14)');
  softGlow.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=softGlow;x.fillRect(0,0,w,hh);
  const ambient=x.createRadialGradient(w*.5+px*.5,hh*.48+py*.5,Math.min(w,hh)*.3,w*.5+px*.5,hh*.48+py*.5,Math.max(w,hh)*.79);
  ambient.addColorStop(0,'rgba(22,40,53,0)');
  ambient.addColorStop(.65,'rgba(22,40,53,.008)');
  ambient.addColorStop(.88,'rgba(22,40,53,.042)');
  ambient.addColorStop(1,'rgba(12,29,42,.09)');
  x.fillStyle=ambient;x.fillRect(0,0,w,hh);
  const elapsed=mode==='idle'?0:t-start;
  for(const d of dots){
   if(mode==='idle'&&!reduce){d.y-=d.v*d.z*(1+Math.sin(t*.00025+d.x)*.25);d.x+=Math.sin(t*.00018+d.y*.01)*.035*d.z;if(d.y<-8){d.y=hh+8;d.x=Math.random()*w}}
   else if(mode==='reveal'&&!reduce){const q=target(d);let k=ease((elapsed-350)/1450);if(elapsed<350){const pr=panel?.getBoundingClientRect(),cr=canvas.getBoundingClientRect();const cx=(pr?pr.left+pr.width/2:cr.left+w/2)-cr.left,cy=(pr?pr.top+pr.height/2:cr.top+hh/2)-cr.top;const a=Math.atan2(d.y-cy,d.x-cx)+elapsed*.004;const rr=Math.hypot(d.x-cx,d.y-cy)*(1-elapsed/350*.18);d.x=cx+Math.cos(a)*rr;d.y=cy+Math.sin(a)*rr}else{d.x=d.ox+(q.x-d.ox)*k;d.y=d.oy+(q.y-d.oy)*k}}
   const pulse=.72+.25*Math.sin(t*.0014+d.x),r=d.s*(.45+d.z*.85)*(mode==='reveal'&&elapsed>1500?1.35:1),a=Math.max(.45,pulse*(.6+d.z*.4));
   const dx=d.x,dy=d.y;
   // High-contrast depth pass: a dense black/charcoal shadow slightly below the
   // particle makes the existing cyan/green palette read crisply on white.
   x.globalAlpha=Math.min(.98,a*1.08);x.fillStyle='#03090e';x.shadowColor='rgba(0,0,0,.94)';x.shadowBlur=7+6*d.z;x.beginPath();x.arc(dx+1.7*d.z,dy+2.4*d.z,r*1.28,0,Math.PI*2);x.fill();
   // Luminous colour pass. Preserve the CuriOS teal/cyan family, but increase
   // saturation and core brightness for the new white environment.
   x.globalAlpha=a;x.fillStyle=d.z>.72?'#00e9ac':d.z>.48?'#00c8d9':'#0879b5';x.shadowColor=d.z>.65?'#00dcb0':'#008bad';x.shadowBlur=mode==='reveal'&&elapsed>1500?12:4;x.beginPath();x.arc(dx,dy,r,0,Math.PI*2);x.fill();x.globalAlpha=Math.min(1,a+.12);x.fillStyle='#e4fff8';x.shadowBlur=0;x.beginPath();x.arc(dx-r*.22,dy-r*.25,Math.max(.38,r*.24),0,Math.PI*2);x.fill();x.shadowBlur=0
  }x.globalAlpha=1;
  if(mode==='reveal'&&elapsed>=3000){mode='done';const cb=done;done=null;cb?.();return}raf=requestAnimationFrame(draw)};
 resize();addEventListener('resize',resize,{passive:true});draw(0);
 return{reveal(p,cb){panel=p;done=cb;if(reduce){canvas.closest('#lock')?.classList.add('login-revealing','reduced');setTimeout(()=>cb?.(),650);return}for(const d of dots){d.ox=d.x;d.oy=d.y}mode='reveal';start=performance.now();canvas.closest('#lock')?.classList.add('login-revealing')},stop(){cancelAnimationFrame(raf);removeEventListener('resize',resize)}}
}
function successful(lock,space,panel,cb){lock.classList.add('login-success');panel.querySelectorAll('input,button,.msg').forEach(e=>e.disabled=true);space.reveal(panel,()=>{lock.classList.add('login-finish');setTimeout(cb,660)})}
export function showLogin(msg){const e=h('input',{type:'email',placeholder:'Email',autocomplete:'username'}),p=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password'}),m=h('div',{className:'msg',textContent:msg||''}),canvas=h('canvas',{className:'login-space','aria-hidden':'true'});
 let busy=false,space;const panel=h('div',{className:'vf login-panel'},h('div',{className:'login-brand',textContent:'CuriOS'}),h('div',{className:'login-title',textContent:'Sign in to your desktop'}),e,p,h('button',{className:'btn',textContent:'Sign in'}),h('button',{className:'btn',textContent:'Create account'}),m);const lock=h('div',{id:'lock'},canvas,panel);
 const go=async up=>{if(busy)return;m.style.color='';m.textContent='';await enterCuriOSFullscreen();if(!document.fullscreenElement){m.textContent='Fullscreen access is required to enter CuriOS. Please allow fullscreen and try again.';return}try{const j=await sbAuth(up?'signup':'token?grant_type=password',{email:e.value.trim(),password:p.value});if(!j.access_token){leaveCuriOSFullscreen();m.style.color='var(--dim)';m.textContent='Check your email to confirm the account, then sign in.';return}busy=true;sbSet(j);successful(lock,space,panel,()=>{space.stop();lock.remove();dispatchEvent(new CustomEvent('curios:authenticated'))})}catch(x){leaveCuriOSFullscreen();m.textContent=String(x)}};panel.querySelectorAll('button')[0].onclick=()=>go(0);panel.querySelectorAll('button')[1].onclick=()=>go(1);p.onkeydown=ev=>ev.key==='Enter'&&go(0);$('#fit').append(lock);space=digitalSpace(canvas);setTimeout(()=>e.focus(),50)}

export function showLock(onUnlock){
 if(document.querySelector('#lock'))return;
 const p=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password'}),m=h('div',{className:'msg'}),canvas=h('canvas',{className:'login-space','aria-hidden':'true'}),panel=h('div',{className:'vf login-panel lock-panel'},h('div',{className:'login-brand',textContent:'CuriOS'}),h('div',{className:'login-title',textContent:'Session locked'}),SB?.email?h('div',{className:'lock-user',textContent:SB.email}):h('div',{className:'lock-user',textContent:'Local session'}),p,h('button',{className:'btn',textContent:'Unlock'}),m),lock=h('div',{id:'lock'},canvas,panel);let busy=false,space;
 const unlock=async()=>{if(busy)return;m.textContent='';await enterCuriOSFullscreen();if(!document.fullscreenElement){m.textContent='Fullscreen access is required to unlock CuriOS. Please allow fullscreen and try again.';return}try{if(SB?.email){const j=await sbAuth('token?grant_type=password',{email:SB.email,password:p.value});if(!j.access_token)throw'Unable to unlock.';sbSet(j)}busy=true;successful(lock,space,panel,()=>{space.stop();lock.remove();onUnlock?.()})}catch(x){leaveCuriOSFullscreen();m.textContent=String(x);p.select()}};panel.querySelector('button').onclick=unlock;p.onkeydown=e=>e.key==='Enter'&&unlock();if(!SB?.email)p.style.display='none';$('#fit').append(lock);space=digitalSpace(canvas);setTimeout(()=>SB?.email?p.focus():panel.querySelector('button')?.focus(),50)
}
