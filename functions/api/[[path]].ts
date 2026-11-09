type ProxyEnv={API_PROXY_URL?:string;PAGES_PROXY_SECRET?:string};
type Context={request:Request;env:ProxyEnv};
const hopHeaders=['host','connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'];
// Each Pages application forwards only /api to one server-configured upstream.
// The streaming body preserves SSE; no static asset requests use this function.
export async function onRequest({request,env}:Context):Promise<Response>{
 let origin:URL;
 try{origin=new URL(env.API_PROXY_URL??'');if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||!env.PAGES_PROXY_SECRET||env.PAGES_PROXY_SECRET.length<32)throw new Error('invalid_configuration');}
 catch{return Response.json({error:'api_proxy_not_configured'},{status:503,headers:{'Cache-Control':'no-store'}});}
 const incoming=new URL(request.url);if(!incoming.pathname.startsWith('/api/'))return new Response(null,{status:404});
 const target=new URL(incoming.pathname+incoming.search,origin),headers=new Headers(request.headers);
 for(const header of hopHeaders)headers.delete(header);
 headers.set('X-Mashrouak-Proxy-Key',env.PAGES_PROXY_SECRET!);
 headers.set('X-Mashrouak-Client-IP',request.headers.get('CF-Connecting-IP')??'');
 try{
  const upstream=await fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual',signal:request.signal});
  const responseHeaders=new Headers(upstream.headers);for(const header of hopHeaders)responseHeaders.delete(header);
  // Dynamic endpoints set their own cache policy; never introduce edge caching.
  responseHeaders.set('CDN-Cache-Control','no-store');
  return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:responseHeaders});
 }catch{return Response.json({error:'api_unavailable'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
