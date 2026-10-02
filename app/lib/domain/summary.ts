import {type PublicFundraiser} from './types';import {formatKes} from './money';
export const whatsAppSummary=(v:PublicFundraiser,link:string)=>`${v.title}\nRecorded: ${formatKes(v.totalMinor)} from ${v.entryCount} contributions.${v.targetMinor&&v.totalMinor<v.targetMinor?'\nRemaining: '+formatKes(v.targetMinor-v.totalMinor):''}\nView contributions: ${link}`;

export function whatsAppContributorList(view:PublicFundraiser):string {
 const rows=view.entries.map((entry,index)=>`${index+1}. ${entry.displayName} — ${formatKes(entry.amountMinor)}`);
 const totals=[`*Total contributed: ${formatKes(view.totalMinor)}*`];
 if(view.targetMinor!==null){
  totals.push(`*Target: ${formatKes(view.targetMinor)}*`);
  const balance=view.targetMinor-view.totalMinor;
  totals.push(balance>=0?`*Balance remaining: ${formatKes(balance)}*`:`*Above target: ${formatKes(-balance)}*`);
 }
 return [`*CONTRIBUTIONS TOWARDS ${view.title}*`,`M-Pesa: ${view.paymentNumber}`,'',...(rows.length?rows:['No contributions recorded yet.']),'',...totals].join('\n');
}
