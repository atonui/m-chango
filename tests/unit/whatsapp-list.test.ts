import {it,expect} from 'vitest';
import {whatsAppContributorList} from '../../app/lib/domain/summary';
import {toPublicFundraiser} from '../../app/lib/domain/public-view';
import {sharePublicSummary} from '../../app/lib/client/api';
import type {PublicFundraiser,PrivateLedger,ContributionRecord} from '../../app/lib/domain/types';

const view:PublicFundraiser={publicId:'public',title:'School fees',purpose:'',paymentNumber:'+254712345678',status:'active',targetMinor:500000,totalMinor:152900,entryCount:2,updatedAt:'2026-10-01T08:00:00Z',entries:[{id:'1',displayName:'Amina',amountMinor:100000,receivedAt:null,recordedAt:'2026-10-01T08:00:00Z'},{id:'2',displayName:'José',amountMinor:52900,receivedAt:null,recordedAt:'2026-10-01T08:00:00Z'}]};
it('formats the complete numbered list with total, target and balance without a link',()=>{
 expect(whatsAppContributorList(view)).toBe('*CONTRIBUTIONS TOWARDS School fees*\nM-Pesa: +254712345678\n\n1. Amina — KSh 1,000\n2. José — KSh 529\n\n*Total contributed: KSh 1,529*\n*Target: KSh 5,000*\n*Balance remaining: KSh 3,471*');
});
it('omits balance and target when no target is set',()=>{const text=whatsAppContributorList({...view,targetMinor:null});expect(text).not.toContain('Target:');expect(text).not.toContain('Balance');expect(text).toContain('Total contributed: KSh 1,529')});
it('shows zero balance at target and surplus above target',()=>{expect(whatsAppContributorList({...view,targetMinor:152900})).toContain('Balance remaining: KSh 0');const text=whatsAppContributorList({...view,targetMinor:100000});expect(text).toContain('Above target: KSh 529');expect(text).not.toContain('Balance remaining')});
it('preserves fractional amounts and produces an honest empty list',()=>{expect(whatsAppContributorList({...view,totalMinor:103050,entries:[{...view.entries[0],amountMinor:103050}]})).toContain('KSh 1,030.50');const text=whatsAppContributorList({...view,entries:[],entryCount:0,totalMinor:0});expect(text).toContain('No contributions recorded yet.');expect(text).toContain('Total contributed: KSh 0')});
it('uses current corrected totals and active rows while honoring both privacy settings',()=>{
 const at='2026-10-01T08:00:00Z';const entry:ContributionRecord={id:'1',fundraiserId:'private',displayName:'Amina',amountMinor:100000,transactionReference:'PRIVATE123',privatePhone:'+254112345678',receivedAt:null,source:'manual',hideName:false,removedAt:null,recordVersion:1,recordedAt:at,updatedAt:at};
 const ledger:PrivateLedger={fundraiser:{id:'private',publicId:'public',title:'School fees',purpose:'',paymentNumber:'+254712345678',targetMinor:null,publicNamesEnabled:true,status:'active',credentialVersion:1,recordVersion:3,createdAt:at,updatedAt:at},entries:[{...entry,amountMinor:103050},{...entry,id:'2',displayName:'Hidden donor',hideName:true,amountMinor:52900},{...entry,id:'3',displayName:'Removed donor',removedAt:at}],totalMinor:155950,entryCount:2};
 const text=whatsAppContributorList(toPublicFundraiser(ledger));expect(text).toContain('1. Amina — KSh 1,030.50');expect(text).toContain('2. Anonymous — KSh 529');expect(text).toContain('Total contributed: KSh 1,559.50');for(const secret of ['Hidden donor','Removed donor','PRIVATE123','+254112345678','/manage/','/f/'])expect(text).not.toContain(secret);
 expect(whatsAppContributorList(toPublicFundraiser({...ledger,fundraiser:{...ledger.fundraiser,publicNamesEnabled:false}}))).not.toContain('Amina');
});
it('copies the complete list without invoking native sharing, with manual fallback on clipboard failure',async()=>{const text=whatsAppContributorList(view);let copied='';const result=await sharePublicSummary(text,{clipboard:{writeText:async t=>{copied=t}}});expect(copied).toBe(text);expect(result.copied).toBe(true);expect(await sharePublicSummary(text,{clipboard:{writeText:async()=>{throw new Error('blocked')}}})).toEqual({copied:false,cancelled:false})});
