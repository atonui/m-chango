import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

it('keeps first-user launch content visible from the main surfaces',()=>{
 const home=read('app/page.tsx');
 const guide=read('app/how-it-works/page.tsx');
 const launch=read('app/launch/page.tsx');
 expect(home).toContain('Try M-Chango');
 expect(home).toContain('/launch');
 expect(guide).toContain('Quick start');
 expect(guide).toContain('Can contributors pay through M-Chango?');
 expect(launch).toContain('WhatsApp announcement');
 expect(launch).toContain('I am trying M-Chango');
});
