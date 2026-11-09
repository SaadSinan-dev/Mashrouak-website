export type FieldPath=(string|number)[];
export type FieldRef={entryId:string;path:FieldPath;label:string;kind:'text'|'rich'|'image'|'link';fallback?:{ar:string;en:string}};
const blocked=new Set(['__proto__','prototype','constructor']);
export function validPath(path:unknown):path is FieldPath {return Array.isArray(path)&&path.length>0&&path.length<12&&path.every(key=>typeof key==='number'?Number.isInteger(key)&&key>=0&&key<1000:typeof key==='string'&&key.length<160&&!blocked.has(key));}
export function getField(value:unknown,path:FieldPath):unknown {if(!validPath(path))return;let node=value;for(const key of path){if(!node||typeof node!=='object'||!Object.hasOwn(node,key))return;node=(node as Record<string|number,unknown>)[key];}return node;}
export function setField<T>(value:T,path:FieldPath,next:unknown):T {if(!validPath(path))throw new Error('Invalid content path');const copy=structuredClone(value);let node=copy as Record<string|number,unknown>;for(const key of path.slice(0,-1)){if(!node[key]||typeof node[key]!=='object')throw new Error('Unknown content field');node=node[key] as typeof node;}node[path.at(-1)!]=next;return copy;}
export function humanLabel(value:string){return value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[._-]/g,' ').replace(/\b\w/g,char=>char.toUpperCase());}
