// Authenticated RIFT invitations. PostgREST RLS enforces participant access.
import {SB,jwt} from './supabase.js';
import {CFG} from './config.js';
async function request(path,options={}){
 if(!SB?.uid)throw Error('Sign in to CuriOS to use online invitations');
 const r=await fetch(`${CFG.supabaseUrl}/rest/v1/${path}`,{...options,headers:{apikey:CFG.supabaseKey,Authorization:`Bearer ${await jwt()}`,...(options.headers||{})}});
 if(!r.ok)throw Error((await r.text()).slice(0,300));
 const t=await r.text();return t?JSON.parse(t):null;
}
const rpc=(name,body)=>request(`rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export const getLobby=()=>request('rift_lobby_players?select=user_id,display_name,updated_at&order=updated_at.desc&limit=40');
export const heartbeat=(name)=>rpc('rift_lobby_heartbeat',{p_name:name});
export const sendChallenge=(id)=>rpc('rift_challenge',{p_opponent:id});
export const respondChallenge=(id,accept)=>rpc('rift_respond_challenge',{p_invite:id,p_accept:accept});
export const getInvites=()=>request('rift_invites?select=id,challenger,opponent,status,created_at,updated_at&order=created_at.desc&limit=25');
