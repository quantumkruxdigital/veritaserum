// Terminal command registry: cmd(name, description, fn).
export const cmds={};
export const cmd=(n,d,f)=>cmds[n]={d,f};
