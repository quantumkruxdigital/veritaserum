// SAM: resident AI interface. Identity stays separate from AIService providers.
import {h} from '../kernel/util.js';
import {AIService,aiConfig} from '../kernel/ai-service.js';
import {samProfile} from '../kernel/sam-profile.js';
import {win} from '../shell/wm.js';

const HIST='wos.sam.conversation.v1';
let api=null;
const load=()=>{try{return JSON.parse(localStorage.getItem(HIST)||'[]')}catch{return[]}},save=x=>{try{localStorage.setItem(HIST,JSON.stringify(x.slice(-80)))}catch{}};
export function sam(){
 if(api){api.focus();return}
 win('sam','SAM',640,610,b=>{
  b.classList.add('sam-body');b.style.padding=0;let hist=load(),busy=false;
  const shell=h('div',{className:'sam-shell'}),head=h('div',{className:'sam-head'}),route=h('select',{className:'sam-route'},...['auto','local','cloud'].map(x=>h('option',{value:x,textContent:x[0].toUpperCase()+x.slice(1),selected:aiConfig.route==x}))),stat=h('span',{className:'sam-provider',textContent:'Checking AIService…'}),clear=h('button',{className:'btn mini',textContent:'Clear'}),log=h('div',{className:'sam-log'}),form=h('div',{className:'sam-form'}),input=h('textarea',{className:'sam-input',placeholder:'Talk to SAM…',rows:2}),send=h('button',{className:'btn',textContent:'Send'});
  head.append(h('b',{textContent:'SAM'}),stat,h('span',{className:'sam-grow'}),route,clear);form.append(input,send);shell.append(head,log,form);b.append(shell);
  const bubble=(role,text,provider='')=>log.append(h('div',{className:'sam-msg '+role},h('div',{className:'sam-who',textContent:role=='user'?'You':'SAM'+(provider?' · '+provider:'')}),h('div',{className:'sam-text',textContent:text})));
  const render=()=>{log.replaceChildren();hist.filter(x=>x.role!='system').forEach(x=>bubble(x.role,x.content,x.provider));log.scrollTop=log.scrollHeight};
  async function status(){try{const s=await AIService.status(),l=s.local?.available?'Ollama ready':'Ollama offline',c=s.cloud?.available?'cloud ready':'cloud not configured';stat.textContent=l+' · '+c}catch(e){stat.textContent='AIService unavailable'}}
  async function ask(text){text=String(text||'').trim();if(!text||busy)return;busy=true;send.disabled=true;input.disabled=true;hist.push({role:'user',content:text});save(hist);render();input.value='';stat.textContent='SAM is thinking…';try{const p=samProfile(),messages=[{role:'system',content:p.system},...hist.map(({role,content})=>({role,content}))],r=await AIService.chat(messages);hist.push({role:'assistant',content:r.message||'',provider:r.provider||''});save(hist);render();stat.textContent=(r.provider||'AIService')+(r.model?' · '+r.model:'')}catch(e){stat.textContent='Error';bubble('assistant','AIService: '+String(e?.message||e),'error')}finally{busy=false;send.disabled=false;input.disabled=false;input.focus()}}
  route.onchange=()=>{aiConfig.route=route.value;status()};clear.onclick=()=>{if(confirm('Clear SAM conversation history?')){hist=[];save(hist);render()}};send.onclick=()=>ask(input.value);input.onkeydown=e=>{if(e.key=='Enter'&&!e.shiftKey){e.preventDefault();ask(input.value)}};
  render();status();api={ask,focus:()=>{input.focus()},status};input.focus();
 },()=>{api=null})
}
export function askSAM(text){sam();setTimeout(()=>api?.ask(text),0)}
