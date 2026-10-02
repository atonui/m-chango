export class DomainError extends Error {constructor(message:string,public status=422,public fields:Record<string,string>={}){super(message)}}
export class ValidationError extends DomainError {}
export type Source='manual'|'whatsapp'|'mpesa';
export interface FundraiserInput {title:string;purpose:string;paymentNumber:string;targetMinor:number|null;publicNamesEnabled:boolean;status:'active'|'closed'}
export interface FundraiserRecord extends FundraiserInput {id:string;publicId:string;recordVersion:number;credentialVersion:number;createdAt:string;updatedAt:string}
export interface ContributionInput {displayName:string;amountMinor:number;transactionReference:string|null;privatePhone:string|null;receivedAt:string|null;source:Source;hideName:boolean}
export interface ContributionRecord extends ContributionInput {id:string;fundraiserId:string;removedAt:string|null;recordVersion:number;recordedAt:string;updatedAt:string}
export interface PrivateLedger {fundraiser:FundraiserRecord;entries:ContributionRecord[];totalMinor:number;entryCount:number}
export interface ImportCandidate {id:string;displayName:string;amount:string;transactionReference:string|null;privatePhone:string|null;receivedAt:string|null;source:Source;hideName:boolean;selected:boolean;issues:string[];blockingError:string|null}
export interface ParsePreview {rows:ImportCandidate[];unrecognized:string[]}
export interface PublicFundraiser {publicId:string;title:string;purpose:string;paymentNumber:string;status:'active'|'closed';targetMinor:number|null;totalMinor:number;entryCount:number;updatedAt:string;entries:{id:string;displayName:string;amountMinor:number;receivedAt:string|null;recordedAt:string}[]}
export interface CommitResult {entryIds:string[];recordVersion:number}
