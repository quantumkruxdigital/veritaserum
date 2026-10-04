// Browser-only filesystem (used when nobody is signed in).
export let fs={};
try{fs=JSON.parse(localStorage.getItem('wos.fs'))||{}}catch{}
if(!fs['/'])fs={'/':{t:'d'},'/docs':{t:'d'},'/docs/welcome.txt':{t:'f',c:'Press Ctrl+Space for the terminal, then type: help'}};
const fsave=()=>{try{localStorage.setItem('wos.fs',JSON.stringify(fs))}catch{}};
export const res=(c,p)=>{const o=[];for(const s of(p[0]=='/'?p:c+'/'+p).split('/'))if(s=='..')o.pop();else if(s&&s!='.')o.push(s);return'/'+o.join('/')};
const par=k=>k.slice(0,k.lastIndexOf('/')||1);
export const kids=p=>Object.keys(fs).filter(k=>k!=p&&par(k)==p);
export const wr=(k,c)=>{if(fs[par(k)]?.t!='d')throw'no such folder: '+par(k);if(fs[k]?.t=='d')throw'is a folder';fs[k]={t:'f',c};fsave()};
export const mk=k=>{if(fs[par(k)]?.t!='d')throw'no such folder';fs[k]={t:'d'};fsave()};
export const rmf=k=>{if(k=='/')throw'cannot remove /';Object.keys(fs).filter(x=>x==k||x.startsWith(k+'/')).forEach(x=>delete fs[x]);fsave()};
export const LocalFS={async ls(p){return kids(p).map(k=>({name:k.split('/').pop(),type:fs[k].t,size:(fs[k].c||'').length}))},async stat(p){return fs[p]?{type:fs[p].t}:null},async read(p){const f=fs[p];if(f?.t!='f')throw'no such file';return f.c},async write(p,c){wr(p,c)},async mkdir(p){mk(p)},async rm(p){rmf(p)},async put(){throw'binary files need your server (run: login <token>)'}};
