// Which filesystem and state store are active right now.
import {LocalFS} from './localfs.js';
import {RunnerKV} from './runner.js';

export let remote=false,VC,RUNNER=false;   // RUNNER: is a server/server.mjs reachable? (false on a static host)
export let V=LocalFS;
export let KV=RunnerKV;
export const kvPut=(k,v)=>KV.put(k,v).catch(()=>0);
export let DEV=false;
export function setSys(o){if('V' in o)V=o.V;if('KV' in o)KV=o.KV;if('remote' in o)remote=o.remote;if('VC' in o)VC=o.VC;if('DEV' in o)DEV=o.DEV;if('RUNNER' in o)RUNNER=o.RUNNER}
