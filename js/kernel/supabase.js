// Supabase accounts, file storage and state over its REST API.
import {CFG} from './config.js';

export let SB=null;
try{SB=JSON.parse(localStorage.getItem('curios.sb'))}catch{}
export const sbSave=o=>{SB=o;try{o?localStorage.setItem('curios.sb',JSON.stringify(o)):localStorage.removeItem('curios.sb')}catch{}};
export async function sbAuth(path,body){const r=await fetch(CFG.supabaseUrl+'/auth/v1/'+path,{method:'POST',headers:{apikey:CFG.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>null);if(!r)throw'Supabase unreachable.';const j=await r.json().catch(()=>({}));if(!r.ok)throw j.error_description||j.msg||j.message||'sign-in failed ('+r.status+')';return j}
export const sbSet=j=>sbSave({access_token:j.access_token,refresh_token:j.refresh_token,exp:Date.now()+((j.expires_in||3600)-30)*1000,email:j.user?.email||SB?.email,uid:j.user?.id||SB?.uid});
let rfp;
export async function jwt(){if(!SB)throw'Not signed in.';if(Date.now()>SB.exp){rfp=rfp||sbAuth('token?grant_type=refresh_token',{refresh_token:SB.refresh_token}).then(sbSet).finally(()=>rfp=null);try{await rfp}catch{sbSave(null);throw'Session expired. Reload to sign in again.'}}return SB.access_token}
async function sbf(method,path,opt={}){const t=await jwt(),r=await fetch(CFG.supabaseUrl+path,{method,...opt,headers:{apikey:CFG.supabaseKey,Authorization:'Bearer '+t,...(opt.headers||{})}}).catch(()=>null);if(!r)throw'Supabase unreachable.';if(!r.ok){let m=await r.text();try{const j=JSON.parse(m);m=j.message||j.error||m}catch{}throw m||'Supabase error '+r.status}return r}
const BK='files',key=p=>SB.uid+'/'+p.replace(/^\/+/,''),ek=k=>k.split('/').map(encodeURIComponent).join('/'),JH={'Content-Type':'application/json'};
export const SupaFS={
 async list(pre){const out=[];for(let o=0;;o+=100){const j=await(await sbf('POST','/storage/v1/object/list/'+BK,{headers:JH,body:JSON.stringify({prefix:pre,limit:100,offset:o,sortBy:{column:'name',order:'asc'}})})).json();out.push(...j);if(j.length<100)break}return out},
 async ls(p,all){return(await this.list(key(p).replace(/\/$/,''))).filter(e=>all||e.name[0]!='.').map(e=>({name:e.name,type:e.id?'f':'d',size:e.metadata?.size||0}))},
 async stat(p){if(p=='/')return{type:'d'};const k=key(p),i=k.lastIndexOf('/'),e=(await this.list(k.slice(0,i))).find(x=>x.name==k.slice(i+1));return e?{type:e.id?'f':'d',size:e.metadata?.size||0}:null},
 async read(p){return await(await sbf('GET','/storage/v1/object/authenticated/'+BK+'/'+ek(key(p)))).text()},
 async blob(p){return await(await sbf('GET','/storage/v1/object/authenticated/'+BK+'/'+ek(key(p)))).blob()},
 async put(p,blob){await sbf('POST','/storage/v1/object/'+BK+'/'+ek(key(p)),{headers:{'x-upsert':'true','Content-Type':blob.type||'application/octet-stream'},body:blob})},
 async write(p,c){await this.put(p,new Blob([c],{type:'text/plain'}))},
 async mkdir(p){await this.put(p.replace(/\/$/,'')+'/.emptyFolderPlaceholder',new Blob([],{type:'application/octet-stream'}))},
 async rm(p){if(p=='/')throw'cannot remove /';const st=await this.stat(p);if(!st)return;const base=key(p),keys=[],walk=async pre=>{for(const e of await this.list(pre)){const k=pre+'/'+e.name;e.id?keys.push(k):await walk(k)}};st.type=='f'?keys.push(base):await walk(base);for(let i=0;i<keys.length;i+=100)await sbf('DELETE','/storage/v1/object/'+BK,{headers:JH,body:JSON.stringify({prefixes:keys.slice(i,i+100)})})}};
export const SupaKV={async get(k){if(k=='vault'){try{return JSON.parse(await SupaFS.read('/.curios/vault.json'))}catch{return{}}}const j=await(await sbf('GET','/rest/v1/kv?key=eq.'+k+'&select=value')).json();return j[0]?.value||{}},
 async put(k,v){if(k=='vault')return SupaFS.write('/.curios/vault.json',JSON.stringify(v));await sbf('POST','/rest/v1/kv',{headers:{...JH,Prefer:'resolution=merge-duplicates'},body:JSON.stringify({key:k,value:v})})},
 async del(k){if(k=='vault')return SupaFS.rm('/.curios/vault.json').catch(()=>0);await sbf('DELETE','/rest/v1/kv?key=eq.'+encodeURIComponent(k),{headers:{Prefer:'return=minimal'}})}};
