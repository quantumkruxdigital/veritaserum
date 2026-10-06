// CuriOS session actions shared by the dock and future system surfaces.
import {CFG} from '../kernel/config.js';
import {sbSave} from '../kernel/supabase.js';
import {showLock} from './login.js';
import {vlockNow} from '../apps/vault.js';

export function lockSession(){
  vlockNow();
  document.dispatchEvent(new CustomEvent('curios:session-lock'));
  showLock(()=>document.dispatchEvent(new CustomEvent('curios:session-unlock')));
}
export function logoutSession(){
  vlockNow();
  document.dispatchEvent(new CustomEvent('curios:session-logout'));
  try{localStorage.removeItem('curios.token')}catch{}
  if(CFG.supabaseUrl)sbSave(null);
  location.reload();
}
