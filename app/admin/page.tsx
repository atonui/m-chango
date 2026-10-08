import AdminOverviewPanel from '../components/admin-overview';

export const dynamic='force-dynamic';

export default function AdminPage(){
 return <main className="landing"><header className="brand"><span className="brand-mark">m</span><a href="/dashboard">M-Chango</a><span className="brand-note">Admin</span></header><AdminOverviewPanel/></main>;
}
