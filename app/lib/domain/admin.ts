import {formatKes} from './money';

type AdminCounts={
 fundraisers:number;
 profiles:number;
 pendingDeletionRequests:number;
 totalContributionsMinor?:number;
};
type AdminEnvironment={appEnv?:string;commitSha?:string;deployedAt?:string};
export type AdminOverview={role:string;environment:AdminEnvironment;counts:AdminCounts};
export type AdminFundraiserRow={id:string;publicId:string;title:string;status:string;totalMinor:number;entryCount:number;category:string|null;county:string|null;ownerDisplayName:string|null;createdAt:string;updatedAt:string};
export type AdminUserRow={id:string;displayName:string;fundraiserCount:number;totalMinor:number;lastFundraiserAt:string|null;createdAt:string};
export type AdminFundraiserPage={fundraisers:AdminFundraiserRow[];nextCursor:unknown};
export type AdminUserPage={users:AdminUserRow[];nextCursor:unknown};
type CardTone='main'|'default'|'attention';

function titleCase(value:string){
 return value.slice(0,1).toUpperCase()+value.slice(1).replaceAll('-',' ');
}

function formatDate(value?:string){
 if(!value)return 'Not set';
 const time=new Date(value);
 if(Number.isNaN(time.getTime()))return 'Not set';
 return new Intl.DateTimeFormat('en-KE',{month:'short',day:'numeric',year:'numeric',timeZone:'Africa/Nairobi'}).format(time);
}

export function buildAdminOverviewModel(overview:AdminOverview){
 const env=overview.environment??{};
 const counts=overview.counts??{fundraisers:0,profiles:0,pendingDeletionRequests:0};
 const pending=counts.pendingDeletionRequests??0;
 return {
  role:overview.role,
  release:{
   label:env.appEnv?titleCase(env.appEnv):'Unknown environment',
   commit:env.commitSha?env.commitSha.slice(0,7):'Not set',
   deployed:formatDate(env.deployedAt)
  },
  cards:[
   {label:'Fundraisers',value:String(counts.fundraisers??0),tone:'main' as CardTone},
   {label:'Total recorded',value:formatKes(counts.totalContributionsMinor??0),tone:'default' as CardTone},
   {label:'Organizer profiles',value:String(counts.profiles??0),tone:'default' as CardTone},
   {label:'Pending deletions',value:String(pending),tone:(pending>0?'attention':'default') as CardTone}
  ]
 };
}
