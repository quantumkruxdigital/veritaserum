// Voyager: CuriOS-native windowed web navigator. Third-party iframe policies still apply.
import {win} from '../shell/wm.js';
import {h} from '../kernel/util.js';
const HOME='https://www.wikipedia.org/';
const BOOKMARKS='curios.voyager.bookmarks.v1';
const HISTORY='curios.voyager.history.v1';
const load=(key)=>{try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v:[]}catch{return []}};
const save=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v))}catch{}};
function address(raw){const v=raw.trim();if(!v)return HOME;if(/^https?:\/\//i.test(v)){const u=new URL(v);if(!['https:','http:'].includes(u.protocol))throw Error('Only HTTP(S) pages are supported');return u.href}if(/^[\w-]+(\.[\w-]+)+(?::\d+)?(?:[/?#].*)?$/.test(v))return 'https://'+v;return 'https://www.google.com/search?q='+encodeURIComponent(v)}
export function voyager(){
 win('voyager','Voyager · Web',1050,690,root=>{
  root.classList.add('voyager-root');
  const back=h('button',{title:'Back',textContent:'←'}),forward=h('button',{title:'Forward',textContent:'→'}),reload=h('button',{title:'Reload',textContent:'↻'}),home=h('button',{title:'Home',textContent:'⌂'});
  const input=h('input',{type:'text',spellcheck:false,'aria-label':'Web address or search',placeholder:'Enter a URL or search the web'});
  const go=h('button',{textContent:'Go'}),star=h('button',{title:'Bookmark current page',textContent:'☆'}),external=h('button',{title:'Open in a separate browser tab',textContent:'↗'});
  const bar=h('div',{className:'voyager-toolbar'},back,forward,reload,home,input,go,star,external);
  const bookmarks=h('div',{className:'voyager-bookmarks'});
  const note=h('div',{className:'voyager-notice',textContent:'Some sites block embedded browsing for security. Use ↗ if a page refuses to display.'});
  const frame=h('iframe',{className:'voyager-frame',title:'Voyager website viewer',referrerPolicy:'strict-origin-when-cross-origin',allow:'fullscreen; clipboard-read; clipboard-write'});
  const panel=h('div',{className:'voyager-panel'}),frameWrap=h('div',{className:'voyager-frame-wrap'},frame,panel);
  root.append(bar,bookmarks,note,frameWrap);
  let trail=[],cursor=-1;
  const current=()=>trail[cursor]||HOME;
  const controls=()=>{back.disabled=cursor<=0;forward.disabled=cursor>=trail.length-1;star.textContent=load(BOOKMARKS).includes(current())?'★':'☆'};
  function showPanel(){panel.replaceChildren(h('h2',{textContent:'VOYAGER'}),h('p',{textContent:'Browse the web inside your CuriOS desktop.'}),h('p',{textContent:'Enter a website address above. Some websites prevent embedding; open those in a separate tab with ↗.'}),h('button',{textContent:'Browse Wikipedia',onclick:()=>navigate('https://www.wikipedia.org/')}),h('button',{textContent:'Search DuckDuckGo',onclick:()=>navigate('https://duckduckgo.com/')}));panel.hidden=false;frame.hidden=true}
  function renderBookmarks(){bookmarks.replaceChildren();for(const url of load(BOOKMARKS)){const b=h('button',{textContent:new URL(url).hostname,title:url,onclick:()=>navigate(url)});bookmarks.append(b)}}
  function display(url){input.value=url;frame.hidden=false;panel.hidden=true;frame.src=url;controls()}
  function navigate(raw){try{const url=address(raw);trail=trail.slice(0,cursor+1);trail.push(url);cursor++;display(url);save(HISTORY,[url,...load(HISTORY).filter(x=>x!==url)].slice(0,60))}catch(e){note.textContent='Invalid address: '+e.message}}
  back.onclick=()=>{if(cursor>0)display(trail[--cursor])};forward.onclick=()=>{if(cursor<trail.length-1)display(trail[++cursor])};
  reload.onclick=()=>{if(cursor>=0)display(current());else showPanel()};home.onclick=()=>navigate(HOME);
  go.onclick=()=>navigate(input.value);input.onkeydown=e=>{if(e.key==='Enter')navigate(input.value)};
  star.onclick=()=>{const url=current();let a=load(BOOKMARKS);a=a.includes(url)?a.filter(x=>x!==url):[...a,url];save(BOOKMARKS,a);renderBookmarks();controls()};
  external.onclick=()=>{const u=current();const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.click()};
  frame.addEventListener('load',()=>{note.textContent='Some sites block embedded browsing for security. Use ↗ if a page refuses to display.'});
  showPanel();controls();renderBookmarks();
 });
}
