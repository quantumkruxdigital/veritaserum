// Browser-only filesystem. Text metadata lives in localStorage; binary payloads live in IndexedDB.
export let fs={};
try{fs=JSON.parse(localStorage.getItem('wos.fs'))||{}}catch{}
if(!fs['/'])fs={'/':{t:'d'}};
for(const d of ['/Documents','/Music','/Pictures','/Videos','/Downloads'])if(!fs[d])fs[d]={t:'d'};
const fsave=()=>{try{localStorage.setItem('wos.fs',JSON.stringify(fs))}catch{}};
export const res=(c,p)=>{const o=[];for(const s of(p[0]=='/'?p:c+'/'+p).split('/'))if(s=='..')o.pop();else if(s&&s!='.')o.push(s);return'/'+o.join('/')};
const par=k=>k.slice(0,k.lastIndexOf('/')||1);
export const kids=p=>Object.keys(fs).filter(k=>k!=p&&par(k)==p);
const dbp=new Promise((ok,no)=>{const r=indexedDB.open('wos.files',1);r.onupgradeneeded=()=>r.result.createObjectStore('blobs');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const idb=(mode,fn)=>dbp.then(db=>new Promise((ok,no)=>{const tx=db.transaction('blobs',mode),s=tx.objectStore('blobs'),r=fn(s);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}));
const bput=(k,b)=>idb('readwrite',s=>s.put(b,k)),bget=k=>idb('readonly',s=>s.get(k)),bdel=k=>idb('readwrite',s=>s.delete(k));
export const wr=(k,c)=>{if(fs[par(k)]?.t!='d')throw'no such folder: '+par(k);if(fs[k]?.t=='d')throw'is a folder';fs[k]={t:'f',c:String(c),size:String(c).length,mime:'text/plain'};fsave();bdel(k).catch(()=>0)};
export const mk=k=>{if(fs[par(k)]?.t!='d')throw'no such folder';fs[k]={t:'d'};fsave()};
export const rmf=k=>{if(k=='/')throw'cannot remove /';const gone=Object.keys(fs).filter(x=>x==k||x.startsWith(k+'/'));gone.forEach(x=>delete fs[x]);fsave();gone.forEach(x=>bdel(x).catch(()=>0))};
export const LocalFS={
 async ls(p){return kids(p).map(k=>({name:k.split('/').pop(),type:fs[k].t,size:fs[k].size??(fs[k].c||'').length,mime:fs[k].mime||''}))},
 async stat(p){const x=fs[p];return x?{type:x.t,size:x.size||0,mime:x.mime||''}:null},
 async read(p){const f=fs[p];if(f?.t!='f')throw'no such file';if('c'in f)return f.c;const b=await bget(p);if(!b)throw'file data missing';return b.text()},
 async blob(p){const f=fs[p];if(f?.t!='f')throw'no such file';if('c'in f)return new Blob([f.c],{type:f.mime||'text/plain'});const b=await bget(p);if(!b)throw'file data missing';return b},
 async write(p,c){wr(p,c)},async mkdir(p){mk(p)},async rm(p){rmf(p)},
 async put(p,blob){if(fs[par(p)]?.t!='d')throw'no such folder: '+par(p);if(fs[p]?.t=='d')throw'is a folder';await bput(p,blob);fs[p]={t:'f',size:blob.size,mime:blob.type||'application/octet-stream',bin:1};fsave()},
 async wipe(){const gone=Object.keys(fs).filter(k=>k!='/');for(const k of gone)await bdel(k).catch(()=>0);fs={'/':{t:'d'}};fsave()}
};
