import {describe,it,expect} from 'vitest';
import {privateLedgerEntryVisibility} from '../../app/lib/domain/private-ledger-copy';

describe('private ledger copy',()=>{
 it('describes how each contribution will appear publicly',()=>{
  expect(privateLedgerEntryVisibility(true,true)).toBe('Shared as Anonymous');
  expect(privateLedgerEntryVisibility(false,false)).toBe('Shared as Anonymous');
  expect(privateLedgerEntryVisibility(true,false)).toBe('Shared with contributor name');
 });
});
