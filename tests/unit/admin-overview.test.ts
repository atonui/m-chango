import {expect,it} from 'vitest';
import {buildAdminOverviewModel} from '../../app/lib/domain/admin';

it('builds admin overview cards from counts and environment metadata',()=>{
 const model=buildAdminOverviewModel({
  role:'owner',
  environment:{appEnv:'production',commitSha:'13d9cdf4ddad7726900ad58a63cd2bc666a95996',deployedAt:'2026-10-08T10:00:00.000Z'},
  counts:{fundraisers:12,profiles:7,pendingDeletionRequests:2,totalContributionsMinor:1250500}
 });
 expect(model.release).toEqual({label:'Production',commit:'13d9cdf',deployed:'8 Oct 2026'});
 expect(model.cards).toEqual([
  {label:'Fundraisers',value:'12',tone:'main'},
  {label:'Total recorded',value:'KSh 12,505',tone:'default'},
  {label:'Organizer profiles',value:'7',tone:'default'},
  {label:'Pending deletions',value:'2',tone:'attention'}
 ]);
});

it('falls back safely when optional admin overview fields are absent',()=>{
 const model=buildAdminOverviewModel({role:'support',environment:{},counts:{fundraisers:0,profiles:0,pendingDeletionRequests:0}});
 expect(model.release).toEqual({label:'Unknown environment',commit:'Not set',deployed:'Not set'});
 expect(model.cards[1]).toMatchObject({label:'Total recorded',value:'KSh 0'});
});
