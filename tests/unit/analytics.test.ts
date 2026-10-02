import {expect,it} from 'vitest';
import {validateAnalyticsEvent} from '../../app/lib/domain/analytics';
it('accepts a minimal successful clipboard event',()=>{
 expect(validateAnalyticsEvent({id:'12345678-1234-4234-8234-123456789012',name:'contribution_list_copied',timestamp:'2026-10-01T12:00:00Z'}).name).toBe('contribution_list_copied');
});
it('rejects personal data and unknown event properties',()=>{
 for(const field of ['email','phone','description','transactionReference','text','token'])expect(()=>validateAnalyticsEvent({id:'12345678-1234-4234-8234-123456789012',name:'fundraiser_created',timestamp:'2026-10-01T12:00:00Z',[field]:'private'})).toThrow();
});
it('rejects unsupported events and invalid import counts',()=>{
 expect(()=>validateAnalyticsEvent({name:'donor_profiled'})).toThrow();
 expect(()=>validateAnalyticsEvent({id:'12345678-1234-4234-8234-123456789012',name:'import_completed',timestamp:'2026-10-01T12:00:00Z',rowCount:501})).toThrow();
});
