import {expect,it} from 'vitest';
import {runtimeEnvironment} from '../../app/lib/server/environment';

it('parses explicit production runtime metadata',()=>{
 expect(runtimeEnvironment({
  APP_ENV:'production',
  APP_ORIGIN:'https://www.m-chango.com',
  SUPABASE_URL:'https://ziamlejfurafauwuqcjk.supabase.co',
  RAILWAY_GIT_COMMIT_SHA:'abc123',
  RAILWAY_SERVICE_NAME:'m-chango'
 })).toMatchObject({
  name:'production',
  appOrigin:'https://www.m-chango.com',
  supabaseUrl:'https://ziamlejfurafauwuqcjk.supabase.co',
  supabaseProjectRef:'ziamlejfurafauwuqcjk',
  gitCommit:'abc123',
  deployLabel:'m-chango'
 });
});

it('falls back to Railway environment name for production',()=>{
 expect(runtimeEnvironment({
  APP_ENV:'unexpected',
  RAILWAY_ENVIRONMENT_NAME:'production'
 }).name).toBe('production');
});

it('falls back to local for unknown environment values',()=>{
 expect(runtimeEnvironment({
  APP_ENV:'unexpected',
  RAILWAY_ENVIRONMENT_NAME:'preview'
 }).name).toBe('local');
});

it('returns null project ref for non-Supabase URLs',()=>{
 expect(runtimeEnvironment({SUPABASE_URL:'https://example.com'}).supabaseProjectRef).toBeNull();
});
