// AIService: provider-neutral inference client for SAM.
import {api} from './runner.js';

const ROUTE='curios.sam.route.v1', LOCAL='curios.sam.localModel.v1', CLOUD='curios.sam.cloudModel.v1';
const get=(k,d)=>{try{return localStorage.getItem(k)||d}catch{return d}};
const put=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
export const aiConfig={
 get route(){return get(ROUTE,'auto')},set route(v){if(!['auto','local','cloud'].includes(v))throw new Error('route must be auto, local, or cloud');put(ROUTE,v)},
 get localModel(){return get(LOCAL,'sam')},set localModel(v){put(LOCAL,String(v||'sam'))},
 get cloudModel(){return get(CLOUD,'')},set cloudModel(v){put(CLOUD,String(v||''))}
};
export const AIService={
 async status(){return await(await api('/api/ai/status')).json()},
 async chat(messages,opt={}){return await(await api('/api/ai/chat',{method:'POST',body:JSON.stringify({messages,route:opt.route||aiConfig.route,localModel:opt.localModel||aiConfig.localModel,cloudModel:opt.cloudModel??aiConfig.cloudModel})})).json()},
 async models(){return await(await api('/api/ai/models')).json()}
};
