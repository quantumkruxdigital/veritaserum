import {h} from '../kernel/util.js';
import {win,wins} from '../shell/wm.js';
import {SB} from '../kernel/supabase.js';
const key=()=>`curios.welcome.hide.v1:${SB?.user?.id||SB?.email||'local'}`;
const items=[
 ['Your Desktop','Use the dock to launch applications, switch windows, and manage your session.'],
 ['Spatial App Carousel','Click the App Menu icon on the dock to materialize a slowly rotating carousel at the center of your desktop. Search for apps or switch category groups to explore your applications.'],
 ['Your Files','Organize documents, images, music, and videos in your persistent CuriOS filesystem.'],
 ['Your Terminal','Press Ctrl + Space to open the integrated terminal drawer.'],
 ['Universal Context Menu','Right-click around CuriOS for context-sensitive actions, tools, and Quick Launch shortcuts.'],
 ['Your Connections','Use CuriOS-Ppl to find contacts and exchange direct or group messages.']
];
export function showWelcome({automatic=false}={}){
 if(automatic&&localStorage.getItem(key())==='1')return;
 if(wins.welcome){wins.welcome.e.style.display='flex';return;}
 const w=win('welcome','Welcome to CuriOS',680,610,bd=>{
  bd.classList.add('curios-welcome');
  const header=h('div',{className:'cw-header'},h('div',{className:'cw-mark',textContent:'C'}),h('div',{},h('h2',{textContent:'Welcome to CuriOS'}),h('p',{textContent:'Your digital space. Reimagined.'})));
  const intro=h('p',{className:'cw-intro',textContent:'CuriOS is a browser-based desktop environment that brings your applications, files, settings, and connected services together in a persistent workspace.'});
  const grid=h('div',{className:'cw-grid'},...items.map(([name,description])=>h('div',{className:'cw-item'},h('strong',{textContent:name}),h('p',{textContent:description}))));
  const check=h('input',{type:'checkbox',checked:localStorage.getItem(key())==='1'});
  const footer=h('div',{className:'cw-footer'},h('label',{},check,' Don’t show this welcome screen again'),h('button',{className:'btn',textContent:'Get Started',onclick:()=>{localStorage.setItem(key(),check.checked?'1':'0');wins.welcome?.e.querySelector('.ct b:last-child')?.click()}}));
  bd.append(header,intro,grid,footer);
 });
 w.e.style.left='300px';w.e.style.top='105px';
}
