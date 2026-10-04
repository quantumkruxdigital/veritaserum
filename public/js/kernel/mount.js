// Mount table: /work is the runner, everything else is Supabase.
import {RUNNER} from './vfs.js';
import {CFG} from './config.js';
import {RemoteFS} from './runner.js';
import {SupaFS} from './supabase.js';

export const W='/work',rcwd=c=>CFG.supabaseUrl?(c==W||c.startsWith(W+'/')?c.slice(W.length)||'/':null):c,sub=p=>p==W||p.startsWith(W+'/')?[RemoteFS,p.slice(W.length)||'/']:[SupaFS,p];
export const Mount={async ls(p,all){const[f,q]=sub(p),r=await f.ls(q,all);if(p=='/'&&RUNNER)r.push({name:'work',type:'d',size:0});return r},async stat(p){if(p==W)return RUNNER?{type:'d'}:null;const[f,q]=sub(p);return f.stat(q)},async read(p){const[f,q]=sub(p);return f.read(q)},async write(p,c){const[f,q]=sub(p);return f.write(q,c)},async put(p,b){const[f,q]=sub(p);return f.put(q,b)},async mkdir(p){if(p==W)return;const[f,q]=sub(p);return f.mkdir(q)},async rm(p){if(p==W)throw'cannot remove /work';const[f,q]=sub(p);return f.rm(q)}};
