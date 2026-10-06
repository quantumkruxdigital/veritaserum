// User settings (volume, clock format, accent colour).
export let set={vol:60,mute:0,h24:1,ac:'#38d6e8',wallpaper:{type:'stock',id:'curios-circuit'}};
try{Object.assign(set,JSON.parse(localStorage.getItem('curios.set')))}catch{}
export const sv=()=>{try{localStorage.setItem('curios.set',JSON.stringify(set))}catch{}};
document.documentElement.style.setProperty('--cy',set.ac);
