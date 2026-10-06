import {describe,it,expect} from 'vitest';
import {homeWhatsAppSample} from '../../app/lib/domain/home-sample';

describe('homepage WhatsApp sample',()=>{
 it('shows a paste-ready contribution update without requiring a link',()=>{
  const text=[homeWhatsAppSample.title,...homeWhatsAppSample.entries,homeWhatsAppSample.total,homeWhatsAppSample.balance].join('\n');
  expect(text).toContain('*CONTRIBUTIONS TOWARDS Hospital bill*');
  expect(text).toContain('1. Amina - KSh 1,000');
  expect(text).toContain('2. Brian - KSh 500');
  expect(text).toContain('3. Anonymous - KSh 2,000');
  expect(text).toContain('Total contributed: KSh 3,500');
  expect(text).toContain('Balance remaining: KSh 46,500');
  expect(text).not.toContain('http');
 });
});
