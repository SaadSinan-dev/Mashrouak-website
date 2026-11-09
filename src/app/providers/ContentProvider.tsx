import {useCallback,useEffect,type ReactNode} from 'react';
import type {PublicContent} from '../../../shared/schema';
import {createResourceCache} from '../../../shared/resource-cache';
import {api,apiOrigin,ApiError} from '../../lib/platform-api';
import {ContentContext} from './content-context';
let minimumRevision=0;
const resources=createResourceCache(async(path,options)=>{
  const publicRequest=path==='/public/content';
  const requested=publicRequest&&minimumRevision?`${path}?min_revision=${minimumRevision}`:path;
  const content=await api<PublicContent>(requested,{...options,cache:'no-store',signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
  if(!Array.isArray(content.entries)||typeof content.updatedAt!=='string')throw new ApiError('invalid_api_response',502);
  if(publicRequest&&Number(content.revision ?? 0)<minimumRevision){
    queueMicrotask(()=>{void resources.invalidate(path);});
    throw new ApiError('publication_not_ready',409);
  }
  return content;
});
export function ContentProvider({children}:{children:ReactNode}) {
  const preview=new URLSearchParams(window.location.search).get('preview');
  const path=preview?`/preview/${encodeURIComponent(preview)}`:'/public/content';
  const resource=resources.useResource<PublicContent>(path,preview?30000:0);
  const retry=useCallback(()=>{void resources.invalidate(path);},[path]);
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden)retry();};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[retry]);
  useEffect(()=>{
    if(preview)return;
    let active=true,etag='',checking=false;
    const notice=(revision:number)=>{
      if(!active||!Number.isSafeInteger(revision)||revision<0)return;
      minimumRevision=Math.max(minimumRevision,revision);
      const snapshot=resources.peek(path);
      if(!snapshot.data)return;
      if(!document.hidden&&revision>Number((snapshot.data as PublicContent).revision??0))void resources.invalidate(path);
    };
    const source=typeof EventSource==='undefined'?null:new EventSource(`${apiOrigin}/api/public/events`,{withCredentials:true});
    const receive=(event:MessageEvent<string>)=>{try{notice(JSON.parse(event.data).revision);}catch{/* Ignore malformed notifications; revision checks remain authoritative. */}};
    source?.addEventListener('publication',receive);
    const revision=async()=>{
      if(!active||document.hidden||checking)return;checking=true;
      try{
        const response=await fetch(`${apiOrigin}/api/public/revision`,{credentials:'include',cache:'no-store',headers:etag?{'If-None-Match':etag}:{},signal:AbortSignal.timeout(8000)});
        if(response.status===304)return;
        if(!response.ok)return;
        const current=await response.json();etag=response.headers.get('ETag')??'';notice(current.revision);
      }catch{/* Polling is a fallback; retained content is never cleared. */}
      finally{checking=false;}
    };
    const timer=window.setInterval(()=>{void revision();},2000);
    return()=>{active=false;clearInterval(timer);source?.close();};
  },[path,preview]);
  return <ContentContext.Provider value={{content:resource.data,unavailable:!!resource.error,preview:!!preview,loading:resource.loading,retry}}>{children}</ContentContext.Provider>;
}
