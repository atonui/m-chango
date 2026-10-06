import {describe,it,expect} from 'vitest';
import {contributionFormCopy} from '../../app/lib/domain/contribution-form-copy';

describe('contribution form copy',()=>{
 it('keeps secondary receipt fields behind more details with private labels',()=>{
  expect(contributionFormCopy.moreDetails).toBe('More details');
  expect(contributionFormCopy.receivedAtOptional).toBe('Optional');
  expect(contributionFormCopy.senderPhoneOptional).toBe('Private · optional');
  expect(contributionFormCopy.confirmReceived).toBe('I confirm this money was received.');
 });
});
