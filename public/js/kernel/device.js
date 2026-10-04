// Machine controls through the runner (Wi-Fi, volume, brightness, power).
import {api, jb} from './runner.js';

export const dev=async(op,...args)=>await(await api('/api/sys',jb({op,args}))).json();
