// Checks two account JSON exports after a restore. Does not perform a restore.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [before,after]=process.argv.slice(2);if(!before||!after)throw Error('Usage: node scripts/compare-account-exports.mjs BEFORE.json AFTER.json');
const canonical=v=>Array.isArray(v)?v.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const fingerprint=p=>createHash('sha256').update(JSON.stringify(canonical(JSON.parse(readFileSync(p,'utf8'))))).digest('hex');
const matches=fingerprint(before)===fingerprint(after);console.log(JSON.stringify({accountExportMatches:matches}));if(!matches)process.exitCode=1;
