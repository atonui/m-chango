export function privateLedgerEntryVisibility(publicNamesEnabled:boolean,hideName:boolean){
 return publicNamesEnabled&&!hideName?'Shared with contributor name':'Shared as Anonymous';
}
