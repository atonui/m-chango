import {expect,it} from 'vitest';
import {requestAccessToken} from '../../app/lib/server/account-session';
it('uses an explicit bearer token rather than another cookie identity',()=>{
 expect(requestAccessToken(new Request('https://example.test',{headers:{Authorization:'Bearer header-token',Cookie:'__Host-m_chango_access_token=cookie-token'}}))).toBe('header-token');
});
it('reads only the exact account session cookie',()=>{
 expect(requestAccessToken(new Request('https://example.test',{headers:{Cookie:'other=ignored; __Host-m_chango_access_token=account-token'}}))).toBe('account-token');
 expect(requestAccessToken(new Request('https://example.test',{headers:{Cookie:'fake___Host-m_chango_access_token=forged'}}))).toBeUndefined();
});
it('fails closed for duplicate session cookies and malformed authorization',()=>{
 expect(requestAccessToken(new Request('https://example.test',{headers:{Cookie:'__Host-m_chango_access_token=a; __Host-m_chango_access_token=b'}}))).toBeUndefined();
 expect(requestAccessToken(new Request('https://example.test',{headers:{Authorization:'Basic invalid',Cookie:'__Host-m_chango_access_token=cookie-token'}}))).toBeUndefined();
});
