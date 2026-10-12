import {stopPreferencesSync} from '../kernel/preferences-sync.js';
// CuriOS session actions shared by the dock and future system surfaces.
import {CFG} from '../kernel/config.js';
import {SB,sbSave} from '../kernel/supabase.js';
import {showLock,showLogin} from './login.js';
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
let loggingOut=false;
export function logoutSession(){
  if(loggingOut)return;
  loggingOut=true;
  fullscreenGuardArmed=false;
  stopPreferencesSync();
  // Invalidate both account and legacy tokens before displaying login.
  try{localStorage.removeItem('curios.token')}catch{}
  const token=SB?.access_token;
  sbSave(null);
  if(token&&CFG.supabaseUrl){void fetch(CFG.supabaseUrl.replace(/\/$/,'')+'/auth/v1/logout',{method:'POST',headers:{apikey:CFG.supabaseKey,Authorization:'Bearer '+token}}).catch(()=>{});}
  try{sessionStorage.setItem('curios.loggedOutInPlace','1')}catch{}
  vlockNow();
  document.dispatchEvent(new CustomEvent('curios:session-logout'));
  // Do not reload here: a reload can restore a stale shell/session and look
  // exactly like logout did nothing. Show an actual unauthenticated login UI.
  document.querySelector('#lock')?.remove();
  document.querySelector('#curios-logout-curtain')?.remove();
  showLogin();
  try{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{})}catch{}
  loggingOut=false;
}
