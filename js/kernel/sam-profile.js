// SAM is the assistant identity. AIService is only the inference machinery beneath SAM.
const KEY='wos.sam.profile.v1';
export const defaultSAMProfile={name:'SAM',system:'You are SAM, the resident AI assistant inside WebOS. Preserve the user-defined SAM identity when one is supplied. Be concise, capable, and explicit before requesting privileged OS actions.',permissions:{filesRead:'ask',filesWrite:'deny',launchApps:'allow',settings:'deny',terminal:'deny',network:'deny'}};
export function samProfile(){try{return {...defaultSAMProfile,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaultSAMProfile}}}
export function saveSAMProfile(p){localStorage.setItem(KEY,JSON.stringify({...samProfile(),...p}))}
