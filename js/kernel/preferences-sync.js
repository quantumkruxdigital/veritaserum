// Account-scoped CuriOS UI preferences. Uses the existing RLS-protected Supabase KV.
import {KV} from './vfs.js';
import {SB} from './supabase.js';
import {set,sv} from './state.js';
import {renderDock} from '../shell/dock.js';
import {applyWallpaper} from './wallpaper.js';

const KEY='curios.preferences.v1';
const DOCK=['curios.dock.pins.v1','curios.dock.order.v1','curios.dock.launcherPosition.v1','curios.dock.placement.v1'];
const QUICK='curios.quickLaunch.v1';
const KEYS=[...DOCK,QUICK];
const DEVICE_ONLY=new Set(['vol','mute']);
let active=false, owner='',last='',writing=false,revision=0;
const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
const current=()=>({ui:Object.fromEntries(Object.entries(set).filter(([k])=>!DEVICE_ONLY.has(k))),local:Object.fromEntries(KEYS.map(k=>[k,read(k)]))});
const signature=()=>JSON.stringify(current());
function restore(payload){
 if(!payload||typeof payload!=='object')return;
 if(payload.ui&&typeof payload.ui==='object'){
  for(const [k,v] of Object.entries(payload.ui))if(!DEVICE_ONLY.has(k)&&Object.hasOwn(set,k))set[k]=v;
  sv();document.documentElement.style.setProperty('--cy',set.ac);
 }
 if(payload.local&&typeof payload.local==='object')for(const k of KEYS){
  if(!Object.hasOwn(payload.local,k))continue;
  const v=payload.local[k];if(typeof v==='string')localStorage.setItem(k,v);else if(v===null)localStorage.removeItem(k);
 }
 renderDock();window.dispatchEvent(new CustomEvent('quicklaunchchange'));
 applyWallpaper(set.wallpaper).catch(console.warn);
}
export async function startPreferencesSync(){
 if(!SB?.uid)return;
 const uid=SB.uid;active=true;owner=uid;revision++;
 const local=signature();
 try{
  const cloud=await KV.get(KEY);
  if(!active||owner!==uid)return;
  if(cloud&&cloud.payload&&typeof cloud.updated==='number'){
   // Existing account preference wins on a new device.
   restore(cloud.payload);last=signature();
  }else{last=local;await KV.put(KEY,{payload:current(),updated:Date.now()})}
 }catch(e){last=local;console.warn('[CuriOS] preferences offline; local settings retained',e)}
 if(!active||owner!==uid)return;
 // Detect changes made by existing dock, context and settings controls.
 const id=revision;
 const loop=async()=>{
  if(!active||owner!==uid||revision!==id)return;
  const now=signature();
  if(now!==last&&!writing){
   writing=true;
   try{await KV.put(KEY,{payload:current(),updated:Date.now()});last=signature()}
   catch(e){console.warn('[CuriOS] preference upload deferred',e)}
   finally{writing=false}
  }
  setTimeout(loop,2200);
 };
 setTimeout(loop,2200);
}
export function stopPreferencesSync(){active=false;owner='';revision++}
