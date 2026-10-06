// Ephemeral terminal super-user state and destructive CuriOS reset.
// Root is never persisted. Supabase accounts are re-authenticated with the account password.
import {CFG} from './config.js';
import {LocalFS} from './localfs.js';
import {SB, sbAuth, SupaKV} from './supabase.js';
import {V} from './vfs.js';

let root=false;
export const isRoot=()=>root;

export async function becomeRoot(password){
  if(root)return true;
  if(!CFG.supabaseUrl||!SB?.email)throw'`su` requires a signed-in CuriOS account.';
  if(!password)throw'authentication cancelled';
  await sbAuth('token?grant_type=password',{email:SB.email,password});
  root=true;
  window.dispatchEvent(new CustomEvent('curios:root-change',{detail:{root:true}}));
  return true;
}

export function dropRoot(){
  root=false;
  window.dispatchEvent(new CustomEvent('curios:root-change',{detail:{root:false}}));
}

async function wipeChildren(path){
  const entries=await V.ls(path,true).catch(()=>[]);
  for(const e of entries){
    const p=(path==='/'?'':path)+'/'+e.name;
    // /work is a synthetic mount point and cannot itself be removed. Its contents can.
    if(p==='/work')await wipeChildren('/work');
    else await V.rm(p).catch(()=>0);
  }
}

function clearCuriOSLocalStorage(){
  const keys=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k?.startsWith('curios.'))keys.push(k);
  }
  for(const k of keys)localStorage.removeItem(k);
}

export async function obliterateSystem(){
  if(!root)throw'root privileges required';
  // Stop desktop-state autosave before deleting remote state, otherwise it can recreate data mid-wipe.
  window.dispatchEvent(new CustomEvent('curios:self-destruct'));

  // Delete everything visible through the active VFS, including mounted /work contents.
  await wipeChildren('/');

  // Supabase desktop/vault state is stored outside the file bucket.
  if(CFG.supabaseUrl){
    await SupaKV.del('desk').catch(()=>0);
    await SupaKV.del('vault').catch(()=>0);
  }

  // Also erase browser-local fallback files and all CuriOS-owned browser settings/state.
  await LocalFS.wipe().catch(()=>0);
  clearCuriOSLocalStorage();
  dropRoot();
}
