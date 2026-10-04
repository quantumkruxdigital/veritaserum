// Image and audio converter.
import {saveFile} from '../kernel/save.js';
import {h} from '../kernel/util.js';
import {V, remote} from '../kernel/vfs.js';
import {win} from '../shell/wm.js';

const wav=b=>{const ch=b.numberOfChannels,n=b.length,sr=b.sampleRate,o=new DataView(new ArrayBuffer(44+n*ch*2)),S=(p,t)=>[...t].forEach((c,i)=>o.setUint8(p+i,c.charCodeAt(0)));
 S(0,'RIFF');o.setUint32(4,36+n*ch*2,true);S(8,'WAVEfmt ');o.setUint32(16,16,true);o.setUint16(20,1,true);o.setUint16(22,ch,true);o.setUint32(24,sr,true);o.setUint32(28,sr*ch*2,true);o.setUint16(32,ch*2,true);o.setUint16(34,16,true);S(36,'data');o.setUint32(40,n*ch*2,true);
 const cs=[...Array(ch).keys()].map(i=>b.getChannelData(i));let p=44;
 for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,cs[c][i]));o.setInt16(p,v<0?v*32768:v*32767,true);p+=2}
 return new Blob([o],{type:'audio/wav'})};
const lame=()=>window.lamejs?Promise.resolve():new Promise((ok,no)=>document.head.append(h('script',{src:'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js',onload:ok,onerror:()=>no('MP3 encoder could not be loaded')})));
async function mp3(b,kbps){await lame();const ch=Math.min(2,b.numberOfChannels),enc=new lamejs.Mp3Encoder(ch,b.sampleRate,kbps),P=a=>{const o=new Int16Array(a.length);for(let i=0;i<a.length;i++){const v=Math.max(-1,Math.min(1,a[i]));o[i]=v<0?v*32768:v*32767}return o},L=P(b.getChannelData(0)),R=ch>1?P(b.getChannelData(1)):null,out=[];
 for(let i=0;i<L.length;i+=1152){const d=ch>1?enc.encodeBuffer(L.subarray(i,i+1152),R.subarray(i,i+1152)):enc.encodeBuffer(L.subarray(i,i+1152));if(d.length)out.push(d)}
 const f=enc.flush();if(f.length)out.push(f);return new Blob(out,{type:'audio/mpeg'})}
export function conv(){win('conv','Convert',460,520,b=>{
 const q=[],rows=h('div'),fi=h('input',{type:'file',multiple:true,accept:'image/*,audio/*',style:'display:none'}),dz=h('div',{className:'dz',textContent:'Drop images or audio here, or click to choose'}),
 sel=(o,d)=>{const e=h('select');o.forEach(v=>e.append(h('option',{value:v,textContent:v})));e.value=d;return e},
 fI=sel(['PNG','JPEG','WebP'],'PNG'),fA=sel(['WAV','MP3'],'MP3'),br=sel(['128','192','256','320'],'192'),ql=h('input',{type:'range',min:30,max:100,value:85}),mx=h('input',{type:'number',placeholder:'original',min:16,style:'width:90px'}),msg=h('div',{className:'msg'});
 const base=f=>f.name.replace(/\.[^.]+$/,'');
 const draw=()=>rows.replaceChildren(...q.map(it=>h('div',{className:'row'},h('span',{textContent:(it.k=='i'?'▣ ':'♪ ')+it.f.name+'  ·  '+Math.ceil(it.f.size/1024)+' KB'}),it.out?h('span',{},remote?h('b',{textContent:'Keep',style:'color:var(--cy);margin-right:12px',onclick:()=>keep(it)}):'',h('b',{textContent:'Save '+it.out.name.split('.').pop(),style:'color:var(--cy)',onclick:()=>save(it)})):h('b',{textContent:it.s||'waiting'}))));
 const add=l=>{[...l].forEach(f=>{const k=f.type.startsWith('image/')?'i':f.type.startsWith('audio/')?'a':0;if(k)q.push({f,k})});draw()};
 const img=async it=>{const T={PNG:['image/png','png'],JPEG:['image/jpeg','jpg'],WebP:['image/webp','webp']}[fI.value],u=URL.createObjectURL(it.f),im=new Image();im.src=u;await im.decode();
  let w=im.naturalWidth||512,hh=im.naturalHeight||512;const m=+mx.value;if(m>0&&Math.max(w,hh)>m){const k=m/Math.max(w,hh);w=Math.round(w*k);hh=Math.round(hh*k)}
  const c=h('canvas',{width:w,height:hh}),x=c.getContext('2d');if(T[0]=='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,w,hh)}x.drawImage(im,0,0,w,hh);URL.revokeObjectURL(u);
  const bl=await new Promise(r=>c.toBlob(r,T[0],ql.value/100));if(!bl||bl.type!=T[0])throw fI.value+' is not supported by this browser';return{name:base(it.f)+'.'+T[1],blob:bl}};
 const aud=async it=>{const ctx=new(window.AudioContext||window.webkitAudioContext)();try{const a=await ctx.decodeAudioData(await it.f.arrayBuffer()),m=fA.value=='MP3';return{name:base(it.f)+(m?'.mp3':'.wav'),blob:m?await mp3(a,+br.value):wav(a)}}finally{ctx.close()}};
 const run=async()=>{msg.textContent='';for(const it of q){if(it.out)continue;it.s='converting…';draw();await new Promise(r=>setTimeout(r,30));try{it.out=it.k=='i'?await img(it):await aud(it);it.s=''}catch(e){it.s='failed: '+(e.message||e)}draw()}};
 const keep=async it=>{try{await V.put('/converted/'+it.out.name,it.out.blob);msg.style.color='';msg.textContent='Kept on your server: /converted/'+it.out.name}catch(e){msg.textContent=String(e?.message||e)}};
 const save=async it=>{try{const r=await saveFile(it.out.name,it.out.blob);msg.style.color=r=='zipped'?'var(--dim)':'';msg.textContent=r=='zipped'?'This host only lets pages save certain file types, so '+it.out.name+' was saved inside a .zip.':''}catch(e){msg.style.color='';msg.textContent=e.code=='declined'?'':String(e.message||e)}};
 dz.onclick=()=>fi.click();dz.ondragover=e=>e.preventDefault();dz.ondrop=e=>{e.preventDefault();add(e.dataTransfer.files)};fi.onchange=()=>{add(fi.files);fi.value=''};
 b.append(dz,fi,h('div',{className:'hd',textContent:'Image output'}),h('label',{className:'s'},'Format',fI),h('label',{className:'s'},'Quality (JPEG / WebP)',ql),h('label',{className:'s'},'Max size, longest side (px)',mx),h('div',{className:'hd',textContent:'Audio output'}),h('label',{className:'s'},'Format',fA),h('label',{className:'s'},'MP3 bitrate (kbps)',br),h('div',{className:'hd',textContent:'Queue'}),rows,
  h('div',{style:'display:flex;gap:6px;margin-top:8px'},h('button',{className:'btn',textContent:'Convert all',onclick:run}),h('button',{className:'btn',textContent:'Clear',onclick(){q.length=0;msg.textContent='';draw()}})),msg)})}
