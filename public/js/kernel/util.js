// DOM helpers.
export const $=(s,r=document)=>r.querySelector(s),h=(t,a={},...c)=>{const e=document.createElement(t);Object.assign(e,a);e.append(...c);return e};
