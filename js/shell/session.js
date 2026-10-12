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
let loggingOut=false;
export function logoutSession(){
  if(loggingOut)return;
  loggingOut=true;
  // Remove credentials synchronously before any asynchronous browser operation.
  // In particular, exitFullscreen can reject or stall and must never block logout.
  fullscreenGuardArmed=false;
  stopPreferencesSync();
  try{localStorage.removeItem('curios.token')}catch{}
  sbSave(null);
  vlockNow();
  document.dispatchEvent(new CustomEvent('curios:session-logout'));
  // Keep the desktop covered until the unauthenticated boot displays sign-in.
  let curtain=document.getElementById('curios-logout-curtain');
  if(!curtain){
    curtain=document.createElement('div');curtain.id='curios-logout-curtain';
    curtain.setAttribute('aria-label','Signing out');
    Object.assign(curtain.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'#f5f8fa',display:'grid',placeItems:'center',color:'#17313b',font:'600 18px system-ui'});
    curtain.textContent='Signing out of CuriOS…';document.body.append(curtain);
  }
  // Reload immediately: the next boot must find no account session.
  // Exiting fullscreen is best effort only, not a prerequisite for sign-out.
  try{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{})}catch{}
  location.reload();
}
