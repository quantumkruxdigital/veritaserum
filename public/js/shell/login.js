// Sign-in screen.
import {sbAuth, sbSet} from '../kernel/supabase.js';
import {$, h} from '../kernel/util.js';

export function showLogin(msg){const e=h('input',{type:'email',placeholder:'Email',autocomplete:'username'}),p=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password'}),m=h('div',{className:'msg',textContent:msg||''});
 const go=async up=>{m.style.color='';m.textContent='';try{const j=await sbAuth(up?'signup':'token?grant_type=password',{email:e.value.trim(),password:p.value});if(!j.access_token){m.style.color='var(--dim)';m.textContent='Check your email to confirm the account, then sign in.';return}sbSet(j);location.reload()}catch(x){m.textContent=String(x)}};
 p.onkeydown=ev=>ev.key=='Enter'&&go(0);
 $('#fit').append(h('div',{id:'lock'},h('div',{className:'vf'},h('div',{style:'font:600 18px system-ui;text-align:center',textContent:'Sign in to your desktop'}),e,p,h('button',{className:'btn',textContent:'Sign in',onclick:()=>go(0)}),h('button',{className:'btn',textContent:'Create account',onclick:()=>go(1)}),m)));setTimeout(()=>e.focus(),50)}
