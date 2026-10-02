import AccountPublicLedger from '../../components/account-public-ledger';
export const dynamic='force-dynamic';
export const metadata={title:'Fundraiser progress · M-Chango',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{publicId:string}>}){const {publicId}=await params;return <AccountPublicLedger publicId={publicId}/>}
