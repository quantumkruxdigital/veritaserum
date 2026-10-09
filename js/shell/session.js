import {stopPreferencesSync} from '../kernel/preferences-sync.js';
// CuriOS session actions shared by the dock and future system surfaces.
import {CFG} from '../kernel/config.js';
import {sbSave} from '../kernel/supabase.js';
import {showLock} from './login.js';
import {vlockNow} from '../apps/vault.js';

let locking=false;
let fullscreenGuardArmed=false;

export function armFullscreenGuard(){
  fullscreenGuardArmed=true;
  if(!document.fullscreenElement&&!document.querySelector('#lock'))void lockSession();
}

// Esc/F11/browser fullscreen exit must never leave the desktop accessible.
document.addEventListener('fullscreenchange',()=>{
  if(fullscreenGuardArmed&&!document.fullscreenElement&&!document.querySelector('#lock')&&!locking)void lockSession();
});

export async function lockSession(){
  if(locking||document.querySelector('#lock'))return;
  locking=true;
  // Display the lock overlay before exiting fullscreen to avoid an unlocked frame.
  vlockNow();
  document.dispatchEvent(new CustomEvent('curios:session-lock'));
  showLock(()=>{fullscreenGuardArmed=true;document.dispatchEvent(new CustomEvent('curios:session-unlock'))});
  try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
  locking=false;
}
export async function logoutSession(){
  fullscreenGuardArmed=false;
  try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
  vlockNow();
  document.dispatchEvent(new CustomEvent('curios:session-logout'));
  try{localStorage.removeItem('curios.token')}catch{}
  stopPreferencesSync();
  if(CFG.supabaseUrl)sbSave(null);
  location.reload();
}
