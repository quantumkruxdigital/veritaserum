// Saving files out of the page (zips types the host does not allow).
import {h} from './util.js';

const dlp=Promise.resolve(window.claude?.use('downloads')).catch(()=>null);
const OK=new Set('gif png jpg jpeg webp mp4 webm txt json md docx pptx epub csv ttf html svg pdf xlsx zip'.split(' '));
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=u=>{let c=-1;for(const x of u)c=crcT[(c^x)&255]^(c>>>8);return(~c)>>>0};
async function zip(name,blob){const d=new Uint8Array(await blob.arrayBuffer()),n=new TextEncoder().encode(name),c=crc(d);
 const w=(len,f)=>{const v=new DataView(new ArrayBuffer(len));f(v);return new Uint8Array(v.buffer)};
 const lh=w(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,c,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,n.length,true)});
 const cd=w(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint32(16,c,true);v.setUint32(20,d.length,true);v.setUint32(24,d.length,true);v.setUint16(28,n.length,true)});
 const eo=w(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,1,true);v.setUint16(10,1,true);v.setUint32(12,46+n.length,true);v.setUint32(16,30+n.length+d.length,true)});
 return new Blob([lh,n,d,cd,n,eo],{type:'application/zip'})}
export async function saveFile(name,blob){const d=await dlp;
 if(!d){const a=h('a',{href:URL.createObjectURL(blob),download:name});document.body.append(a);a.click();a.remove();return'saved'}
 const z=!OK.has(name.split('.').pop().toLowerCase());await d.save({filename:z?name+'.zip':name,data:z?await zip(name,blob):blob});return z?'zipped':'saved'}
