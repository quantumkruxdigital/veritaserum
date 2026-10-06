// CuriOS sign-in screen with a lightweight animated digital-space backdrop.
import {SB, sbAuth, sbSet} from '../kernel/supabase.js';
import {$, h} from '../kernel/util.js';

function digitalSpace(canvas){const x=canvas.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;let dots=[],raf=0,w=0,hh=0,dpr=1;
 const resize=()=>{const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=Math.max(1,r.width);hh=Math.max(1,r.height);canvas.width=w*dpr;canvas.height=hh*dpr;x.setTransform(dpr,0,0,dpr,0,0);const count=Math.max(45,Math.min(150,Math.round(w*hh/11000)));dots=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*hh,z:.25+Math.random()*.9,v:.05+Math.random()*.18,s:.6+Math.random()*1.8}))};
 const draw=t=>{if(!canvas.isConnected)return; x.clearRect(0,0,w,hh);const g=x.createRadialGradient(w*.5,hh*.42,0,w*.5,hh*.42,Math.max(w,hh)*.75);g.addColorStop(0,'#0a5862');g.addColorStop(.45,'#063d4b');g.addColorStop(1,'#02151d');x.fillStyle=g;x.fillRect(0,0,w,hh);for(const d of dots){if(!reduce){d.y-=d.v*d.z*(1+Math.sin(t*.00025+d.x)*.25);d.x+=Math.sin(t*.00018+d.y*.01)*.035*d.z;if(d.y<-8){d.y=hh+8;d.x=Math.random()*w}}const pulse=.62+.28*Math.sin(t*.0012+d.x);x.globalAlpha=Math.max(.18,pulse*d.z);x.fillStyle=d.z>.7?'#7fffe8':'#40cbd3';x.beginPath();x.arc(d.x,d.y,d.s*d.z,0,Math.PI*2);x.fill()}x.globalAlpha=1;if(!reduce)raf=requestAnimationFrame(draw)};
 resize();addEventListener('resize',resize,{passive:true});draw(0);return()=>cancelAnimationFrame(raf)}
export function showLogin(msg){const e=h('input',{type:'email',placeholder:'Email',autocomplete:'username'}),p=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password'}),m=h('div',{className:'msg',textContent:msg||''}),canvas=h('canvas',{className:'login-space','aria-hidden':'true'});
 const go=async up=>{m.style.color='';m.textContent='';try{const j=await sbAuth(up?'signup':'token?grant_type=password',{email:e.value.trim(),password:p.value});if(!j.access_token){m.style.color='var(--dim)';m.textContent='Check your email to confirm the account, then sign in.';return}sbSet(j);location.reload()}catch(x){m.textContent=String(x)}};p.onkeydown=ev=>ev.key=='Enter'&&go(0);
 const lock=h('div',{id:'lock'},canvas,h('div',{className:'login-scanlines','aria-hidden':'true'}),h('div',{className:'vf login-panel'},h('div',{className:'login-brand',textContent:'CuriOS'}),h('div',{className:'login-title',textContent:'Sign in to your desktop'}),e,p,h('button',{className:'btn',textContent:'Sign in',onclick:()=>go(0)}),h('button',{className:'btn',textContent:'Create account',onclick:()=>go(1)}),m));$('#fit').append(lock);digitalSpace(canvas);setTimeout(()=>e.focus(),50)}

export function showLock(onUnlock){
 if(document.querySelector('#lock'))return;
 const p=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password'}),m=h('div',{className:'msg'}),canvas=h('canvas',{className:'login-space','aria-hidden':'true'});
 const unlock=async()=>{m.textContent='';try{if(SB?.email){const j=await sbAuth('token?grant_type=password',{email:SB.email,password:p.value});if(!j.access_token)throw'Unable to unlock.';sbSet(j)}document.querySelector('#lock')?.remove();onUnlock?.()}catch(x){m.textContent=String(x);p.select()}};
 p.onkeydown=e=>e.key=='Enter'&&unlock();
 const panel=h('div',{className:'vf login-panel lock-panel'},h('div',{className:'login-brand',textContent:'CuriOS'}),h('div',{className:'login-title',textContent:'Session locked'}),SB?.email?h('div',{className:'lock-user',textContent:SB.email}):h('div',{className:'lock-user',textContent:'Local session'}),p,h('button',{className:'btn',textContent:'Unlock',onclick:unlock}),m);
 if(!SB?.email){p.style.display='none';panel.querySelector('.login-title').textContent='Session locked';}
 const lock=h('div',{id:'lock'},canvas,h('div',{className:'login-scanlines','aria-hidden':'true'}),panel);$('#fit').append(lock);digitalSpace(canvas);setTimeout(()=>SB?.email?p.focus():panel.querySelector('button')?.focus(),50)
}
