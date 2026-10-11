// Authenticated, RLS-scoped RIFT account API. No browser-side progression writes.
import {SB,jwt} from './supabase.js';
import {CFG} from './config.js';
async function api(path,options={}){
 if(!SB?.uid||!CFG.supabaseUrl||!CFG.supabaseKey)throw Error('RIFT account requires Supabase sign-in');
 const response=await fetch(CFG.supabaseUrl+'/rest/v1/'+path,{...options,headers:{apikey:CFG.supabaseKey,Authorization:'Bearer '+await jwt(),...(options.headers||{})}});
 if(!response.ok)throw Error((await response.text()).slice(0,250));return response.json();
}
export async function getRiftAccount(){
 const [fighters,history]=await Promise.all([api('rift_fighters?select=fighter,xp,matches,wins&limit=1'),api('rift_match_results?select=result,opponent,xp_awarded,played_at&order=played_at.desc&limit=30')]);
 return {version:2,fighter:fighters[0]?.fighter||null,xp:fighters[0]?.xp||0,matches:fighters[0]?.matches||0,wins:fighters[0]?.wins||0,history:history.reverse().map(x=>({result:x.result,opponent:x.opponent,xp:x.xp_awarded,at:Date.parse(x.played_at)}))};
}
export async function saveRiftAppearance(fighter){return api('rpc/rift_save_appearance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_fighter:fighter})});}
