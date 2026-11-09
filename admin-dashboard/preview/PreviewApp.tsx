import {useCallback,useEffect,useRef,useState} from 'react';
import {MemoryRouter,useNavigate,useLocation} from 'react-router-dom';
import {PublicRouteTree} from '../../src/app/router';
import {ContentContext} from '../../src/app/providers/content-context';
import {PreferencesProvider} from '../../src/app/providers/PreferencesProvider';
import {usePreferences} from '../../src/app/providers/preferences-context';
import {VisualContext} from '../../src/features/content/visual-context';
import {validPath,type FieldRef} from '../../shared/visual';
import type {PublicContent} from '../../shared/schema';
import '../../src/styles/tokens.css';import '../../src/styles/globals.css';import '../../src/styles/experience.css';import '../../shared/ui/skeleton.css';import '../../src/styles/platform.css';
import './preview.css';
type State={content:PublicContent;route:string;language:'ar'|'en';theme:'light'|'dark';selection:FieldRef|null;interact:boolean};
const nonce=new URLSearchParams(location.search).get('session');
function Bridge({state,send}:{state:State;send:(message:unknown)=>void}){
 const navigate=useNavigate(),currentLocation=useLocation(),preferences=usePreferences(),overlay=useRef<HTMLDivElement>(null);
 const requestedRoute=useRef(state.route);
 useEffect(()=>{if(requestedRoute.current===state.route)return;requestedRoute.current=state.route;if(currentLocation.pathname!==state.route)navigate(state.route);},[state.route,currentLocation.pathname,navigate]);
 useEffect(()=>{if(state.interact&&currentLocation.pathname!==state.route)send({type:'navigate',route:currentLocation.pathname});},[currentLocation.pathname,state.interact,state.route,send]);
 useEffect(()=>{preferences.setLanguage(state.language);preferences.setTheme(state.theme);},[state.language,state.theme,preferences.setLanguage,preferences.setTheme]);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>,frame=0;
  const elements=()=>Array.from(document.querySelectorAll<HTMLElement>('[data-cms-ref]'));
  const rect=(element:HTMLElement)=>{const range=document.createRange();range.selectNodeContents(element);return range.getBoundingClientRect();};
  const highlight=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const match=elements().find(element=>{try{const ref=JSON.parse(element.dataset.cmsRef!);return ref.entryId===state.selection?.entryId&&JSON.stringify(ref.path)===JSON.stringify(state.selection?.path);}catch{return false;}});if(!overlay.current)return;if(!match){overlay.current.hidden=true;return;}const box=rect(match);overlay.current.hidden=false;Object.assign(overlay.current.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});});};
  const inventory=()=>{clearTimeout(timer);timer=setTimeout(()=>{const refs=elements().map(element=>{try{const ref=JSON.parse(element.dataset.cmsRef!);const section=element.closest('[data-section-id]')?.getAttribute('data-section-id')??(element.closest('.site-header')?'navigation':element.closest('footer')?'footer':'content');return {...ref,section,text:element.textContent?.trim().slice(0,110)};}catch{return null;}}).filter(Boolean);send({type:'inventory',fields:refs});highlight();},100);};
  const click=(event:MouseEvent)=>{if(state.interact)return;const element=(event.target as Element).closest<HTMLElement>('[data-cms-ref]');event.preventDefault();event.stopPropagation();if(element){try{const ref=JSON.parse(element.dataset.cmsRef!);if(validPath(ref.path))send({type:'select',ref});}catch{}}};
  const submit=(event:Event)=>{event.preventDefault();event.stopPropagation();send({type:'form-blocked'});};
  document.addEventListener('submit',submit,true);
  const observer=new MutationObserver(inventory);observer.observe(document.getElementById('root')!,{subtree:true,childList:true,characterData:true});
  document.addEventListener('click',click,true);window.addEventListener('scroll',highlight,true);window.addEventListener('resize',highlight);inventory();
  return()=>{observer.disconnect();clearTimeout(timer);cancelAnimationFrame(frame);document.removeEventListener('submit',submit,true);document.removeEventListener('click',click,true);window.removeEventListener('scroll',highlight,true);window.removeEventListener('resize',highlight);};
 },[state.selection,state.interact,state.content,send]);
 return <><PublicRouteTree/><div ref={overlay} className="cms-selection-outline" hidden/><span className="cms-preview-mode">{state.interact?'Interact':'Select an element'}</span></>;
}
export function Preview(){
 const [state,setState]=useState<State|null>(null);
 const send=useCallback((message:unknown)=>{if(parent!==window&&nonce)parent.postMessage({session:nonce,...message as object},location.origin);},[]);
 useEffect(()=>{if(parent===window||!nonce)return;const receive=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==parent||event.data?.session!==nonce||event.data?.type!=='state')return;const value=event.data.state;if(!Array.isArray(value?.content?.entries)||!['ar','en'].includes(value.language)||!['light','dark'].includes(value.theme)||typeof value.route!=='string'||!value.route.startsWith('/'))return;setState(value);};addEventListener('message',receive);send({type:'ready'});return()=>removeEventListener('message',receive);},[send]);
 if(!state)return <p className="cms-preview-locked">Open this preview from the authenticated Visual Website Editor.</p>;
 return <ContentContext.Provider value={{content:state.content,unavailable:false,preview:false,loading:false,retry:()=>{}}}><VisualContext.Provider value><PreferencesProvider><MemoryRouter initialEntries={[state.route]}><Bridge state={state} send={send}/></MemoryRouter></PreferencesProvider></VisualContext.Provider></ContentContext.Provider>;
}
