// Responsive shell capability detection: phone/tablet/desktop without UA sniffing.
const mq=q=>matchMedia(q).matches;
export function formFactor(){
 const w=innerWidth,h=innerHeight,short=Math.min(w,h),coarse=mq('(pointer: coarse)'),hover=mq('(hover: hover)');
 const mode=(short<=600 || (coarse&&short<=700))?'phone':((short<=900&&coarse)||w<=980)?'tablet':'desktop';
 return {mode,coarse,hover,portrait:h>=w,standalone:mq('(display-mode: standalone)')||navigator.standalone===true};
}
export function applyFormFactor(){const f=formFactor(),r=document.documentElement;r.dataset.formFactor=f.mode;r.classList.toggle('touch',f.coarse);r.classList.toggle('standalone',f.standalone);r.classList.toggle('portrait',f.portrait);dispatchEvent(new CustomEvent('curios:form-factor',{detail:f}));return f}
export function installFormFactor(){let t;const go=()=>{clearTimeout(t);t=setTimeout(applyFormFactor,50)};addEventListener('resize',go,{passive:true});addEventListener('orientationchange',go,{passive:true});matchMedia('(pointer: coarse)').addEventListener?.('change',go);return applyFormFactor()}
