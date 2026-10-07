import {expect,it} from 'vitest';
import {validateAnalyticsEvent} from '../../app/lib/domain/analytics';
const id='12345678-1234-4234-8234-123456789012',timestamp='2026-10-01T12:00:00Z';
it('accepts every privacy-safe MVP analytics event',()=>{
 for(const name of ['fundraiser_created','contribution_added','contribution_list_copied','public_fundraiser_viewed','import_completed'] as const){
  const event=name==='import_completed'?{id,name,timestamp,source:'whatsapp',rowCount:3}:{id,name,timestamp};
  expect(validateAnalyticsEvent(event).name).toBe(name);
 }
});
it('accepts a source for single contribution events without a row count',()=>{
 const event=validateAnalyticsEvent({id,name:'contribution_added',timestamp,source:'manual'});
 expect(event.source).toBe('manual');
});
it('rejects personal data and unknown event properties',()=>{
 for(const field of ['email','phone','description','transactionReference','text','token'])expect(()=>validateAnalyticsEvent({id,name:'fundraiser_created',timestamp,[field]:'private'})).toThrow();
});
it('rejects unsupported events and invalid import counts',()=>{
 expect(()=>validateAnalyticsEvent({name:'donor_profiled'})).toThrow();
 expect(()=>validateAnalyticsEvent({id,name:'import_completed',timestamp,rowCount:501})).toThrow();
 expect(()=>validateAnalyticsEvent({id,name:'contribution_added',timestamp,source:'manual',rowCount:1})).toThrow();
 expect(()=>validateAnalyticsEvent({id,name:'public_fundraiser_viewed',timestamp,source:'manual'})).toThrow();
});
