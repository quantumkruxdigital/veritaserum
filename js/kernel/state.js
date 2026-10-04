// User settings (volume, clock format, accent colour).
export let set={vol:60,mute:0,h24:1,ac:'#38d6e8'};
try{Object.assign(set,JSON.parse(localStorage.getItem('wos.set')))}catch{}
export const sv=()=>{try{localStorage.setItem('wos.set',JSON.stringify(set))}catch{}};
document.documentElement.style.setProperty('--cy',set.ac);
