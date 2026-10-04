// Notes app.
import {h} from '../kernel/util.js';
import {V} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';

export function notes(k){win('n:'+k,k.split('/').pop(),420,320,b=>{b.style.padding=0;let t;const a=h('textarea',{disabled:true,oninput(){clearTimeout(t);t=setTimeout(()=>V.write(k,a.value).catch(x=>a.title=String(x)),300)}});b.append(a);V.read(k).catch(()=>'').then(c=>{if(/\u0000/.test(c)){a.value='[binary file]';return}a.value=c;a.disabled=false})})}
