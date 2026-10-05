// Terminal command registry: cmd(name, description, fn).
export const cmds={};
export const cmd=(n,d,f,opt={})=>cmds[n]={d,f,hidden:!!opt.hidden};
