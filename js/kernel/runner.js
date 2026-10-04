// Client for the Node runner (webos-server): files, state, npm, device controls.
import {CFG} from './config.js';
import {jwt} from './supabase.js';

export const qq=p=>encodeURIComponent(p),jb=o=>({method:'POST',body:JSON.stringify(o)});
export const RemoteFS={async ls(p,all){return(await(await api('/api/ls?path='+qq(p))).json()).filter(e=>all||e.name[0]!='.')},async stat(p){return await(await api('/api/stat?path='+qq(p))).json()},async read(p){return await(await api('/api/file?path='+qq(p))).text()},async blob(p){return await(await api('/api/file?path='+qq(p))).blob()},async write(p,c){await api('/api/file?path='+qq(p),{method:'PUT',body:c})},async put(p,blob){await api('/api/file?path='+qq(p),{method:'PUT',body:blob})},async mkdir(p){await api('/api/mkdir',jb({path:p}))},async rm(p){await api('/api/rm',jb({path:p}))}};
export const RunnerKV={async get(k){return await(await api('/api/kv?key='+k)).json()},put:(k,v)=>api('/api/kv?key='+k,{method:'PUT',body:JSON.stringify(v)})};
export async function api(path,opt={}){let r;try{const tk=localStorage.getItem('wos.token')||(CFG.supabaseUrl?await jwt().catch(()=>''):'');r=await fetch((CFG.runnerUrl||'')+path,{...opt,headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'}})}catch(e){if(e.name=='AbortError')throw e;throw'No server reachable. Serve this page from webos-server.mjs to use npm.'}
 if(r.status==401)throw CFG.supabaseUrl?'The runner rejected your sign-in (is your email in WOS_ALLOWED_EMAILS?)':'Not signed in. Run: login <token>';if(!r.ok){let t=await r.text();try{t=JSON.parse(t).error}catch{}throw t||'server error '+r.status}return r}
