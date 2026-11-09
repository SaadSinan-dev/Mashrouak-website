import {describe,it,expect,vi} from 'vitest';
import {onRequest} from '../functions/api/[[path]]';
import {clientIp} from '../backend/src/client-ip';
import {canonicalTimestamp,rowDigest} from '../backend/scripts/d1-snapshot';
import {correctServicesCopy} from '../backend/src/services-copy';
describe('Publishing delivery and migration boundaries',()=>{
 it('treats SQLite timestamps without an offset as UTC',()=>{
  expect(canonicalTimestamp('2026-11-09 12:34:56')).toBe('2026-11-09T12:34:56.000Z');
  expect(rowDigest([{created_at:'2026-11-09 12:34:56'}])).toBe(rowDigest([{created_at:'2026-11-09T12:34:56Z'}]));
 });
 it('corrects only confirmed Services wording and preserves other draft text',()=>{
  expect(correctServicesCopy({navigation:[{label:{ar:'خدمmnاتنا',en:'Services'}}],footerText:{ar:'مسودة خاصة',en:'Private draft'}})).toEqual({navigation:[{label:{ar:'خدماتنا',en:'Services'}}],footerText:{ar:'مسودة خاصة',en:'Private draft'}});
 });
 it('fails closed when the Pages proxy has no real upstream configuration',async()=>{
  const response=await onRequest({request:new Request('https://admin.example/api/public/content'),env:{}});
  expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store');
 });
 it('preserves API cookies, origin and a streaming response across the Pages proxy',async()=>{
  const upstream=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('event: publication\ndata: {"revision":3}\n\n',{headers:{'Content-Type':'text/event-stream','Set-Cookie':'mashrouak_admin=token; HttpOnly; Secure; SameSite=Strict; Path=/api','Cache-Control':'no-cache, no-transform'}}));
  const secret='test-only-proxy-secret-at-least-32-characters';
  const response=await onRequest({request:new Request('https://admin.example/api/public/events',{headers:{Origin:'https://admin.example',Cookie:'mashrouak_admin=token','CF-Connecting-IP':'203.0.113.10','X-Mashrouak-Client-IP':'spoofed'}}),env:{API_PROXY_URL:'https://api.example',PAGES_PROXY_SECRET:secret}});
  const [url,options]=upstream.mock.calls[0]!;expect(String(url)).toBe('https://api.example/api/public/events');
  const headers=new Headers(options!.headers);expect(headers.get('origin')).toBe('https://admin.example');expect(headers.get('cookie')).toBe('mashrouak_admin=token');expect(headers.get('X-Mashrouak-Client-IP')).toBe('203.0.113.10');expect(headers.get('X-Mashrouak-Proxy-Key')).toBe(secret);
  expect(response.headers.get('set-cookie')).toContain('HttpOnly');expect(response.headers.get('cache-control')).toBe('no-cache, no-transform');expect(await response.text()).toContain('"revision":3');
 });
 it('accepts a Pages client address only with the server secret',()=>{
  const secret='test-only-proxy-secret-at-least-32-characters';
  const make=(key:string)=>new Request('https://api.example',{headers:{'X-Mashrouak-Proxy-Key':key,'X-Mashrouak-Client-IP':'203.0.113.10','X-Forwarded-For':'198.51.100.20'}});
  expect(clientIp(make('spoofed'),'socket',true,secret)).toBe('198.51.100.20');expect(clientIp(make(secret),'socket',true,secret)).toBe('203.0.113.10');
  expect(()=>clientIp(make('é'.repeat(secret.length)),'socket',true,secret)).not.toThrow();
 });
});
