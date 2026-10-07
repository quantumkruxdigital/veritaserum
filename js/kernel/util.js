// CuriOS DOM helpers.
export const $=(s,r=document)=>r.querySelector(s);

export function h(tag, props={}, ...children){
  const el=document.createElement(tag);
  for(const [key,value] of Object.entries(props||{})){
    if(value===undefined||value===null||value===false) continue;

    if(key==='dataset'&&typeof value==='object'){
      for(const [k,v] of Object.entries(value)){
        if(v!==undefined&&v!==null) el.dataset[k]=String(v);
      }
      continue;
    }

    if(key==='style'&&typeof value==='object'){
      Object.assign(el.style,value);
      continue;
    }

    if(key==='class'){
      el.className=String(value);
      continue;
    }

    if(key.startsWith('on')&&typeof value==='function'){
      el.addEventListener(key.slice(2).toLowerCase(),value);
      continue;
    }

    if(value===true){
      try{el[key]=true}catch{el.setAttribute(key,'')}
      continue;
    }

    if(key in el){
      try{el[key]=value;continue}catch{}
    }
    el.setAttribute(key,String(value));
  }

  const append=items=>{
    for(const child of items){
      if(child===undefined||child===null||child===false) continue;
      if(Array.isArray(child)){append(child);continue}
      el.append(child instanceof Node?child:document.createTextNode(String(child)));
    }
  };
  append(children);
  return el;
}
