import {describe,it,expect} from 'vitest';
import {parseKes,formatKes} from '../../app/lib/domain/money';
import {normalizeKenyanPhone,validateFundraiser,validateContribution} from '../../app/lib/domain/validation';
import {toPublicFundraiser,targetProgress} from '../../app/lib/domain/public-view';
import {ledgerCsv} from '../../app/lib/domain/csv';
import type {PrivateLedger,ContributionRecord} from '../../app/lib/domain/types';
const f={id:'private',publicId:'public',title:'Together',purpose:'Help',paymentNumber:'+254712345678',targetMinor:null,publicNamesEnabled:false,status:'active' as const,recordVersion:1,credentialVersion:1,createdAt:'2026-09-30T10:00:00Z',updatedAt:'2026-09-30T10:00:00Z'};
export const entry:ContributionRecord={id:'one',fundraiserId:'private',displayName:'Amina',amountMinor:52900,transactionReference:'ABC123XYZ',privatePhone:'+254712345678',receivedAt:null,source:'manual',hideName:false,removedAt:null,recordVersion:1,recordedAt:f.createdAt,updatedAt:f.updatedAt};
const ledger:PrivateLedger={fundraiser:f,entries:[entry],totalMinor:52900,entryCount:1};
describe('integer money and input bounds',()=>{
 it.each([['529',52900],['1,030',103000],['10,100',1010000],['0.01',1],['100000000',10000000000]])('parses %s exactly',(s,n)=>expect(parseKes(s)).toBe(n));
 it.each(['0','-1','1e4','1.001','10,00','100000000.01','NaN'])('rejects %s',s=>expect(()=>parseKes(s)).toThrow());
 it('formats cents',()=>expect(formatKes(103050)).toBe('KSh 1,030.50'));
 it('normalizes Kenyan numbers and rejects others',()=>{expect(normalizeKenyanPhone('0712 345 678')).toBe('+254712345678');expect(normalizeKenyanPhone('0112-345-678')).toBe('+254112345678');expect(()=>normalizeKenyanPhone('+15551234567')).toThrow()});
 it('defaults to no target and hidden names',()=>expect(validateFundraiser({title:'School fees',paymentNumber:'0712345678'})).toMatchObject({targetMinor:null,publicNamesEnabled:false,status:'active'}));
 it('validates text lengths and strict booleans',()=>{expect(()=>validateFundraiser({title:'Hi',paymentNumber:'0712345678'})).toThrow();expect(()=>validateFundraiser({title:'Good',paymentNumber:'0712345678',publicNamesEnabled:'true'})).toThrow();expect(()=>validateContribution({displayName:'a'.repeat(121),amount:'1'})).toThrow()});
 it('requires evidence fields for M-Pesa rows',()=>expect(()=>validateContribution({displayName:'Amina',amount:'10',source:'mpesa'})).toThrow());
});
describe('public projection and export',()=>{
 it('allowlists public fields and hides names by default',()=>{const p=toPublicFundraiser(ledger);expect(p.entries[0].displayName).toBe('Anonymous');const json=JSON.stringify(p);for(const secret of ['ABC123XYZ','privatePhone','fundraiserId','credentialVersion','recordVersion','Amina'])expect(json).not.toContain(secret)});
 it('honors global and per-entry name privacy and removal',()=>{const p=toPublicFundraiser({...ledger,fundraiser:{...f,publicNamesEnabled:true},entries:[entry,{...entry,id:'two',hideName:true},{...entry,id:'three',removedAt:f.createdAt}]});expect(p.entries.map(e=>e.displayName)).toEqual(['Amina','Anonymous'])});
 it('caps progress without capping totals',()=>{expect(targetProgress(200,100)).toBe(100);expect(targetProgress(0,null)).toBe(0)});
 it('exports active private rows, neutralizes formulas and omits phones',()=>{const csv=ledgerCsv({...ledger,entries:[{...entry,displayName:' =SUM(1,2)'},{...entry,id:'two',removedAt:f.createdAt}]});expect(csv).toContain('"\' =SUM(1,2)"');expect(csv).toContain('529.00');expect(csv).toContain('ABC123XYZ');expect(csv).not.toContain('+254');expect(csv.startsWith('\uFEFF')).toBe(true)});
});
