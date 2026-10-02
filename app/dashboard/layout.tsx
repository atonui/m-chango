import AccountGate from '../components/account-gate';
import type {ReactNode} from 'react';
export const dynamic='force-dynamic';
export default function Layout({children}:{children:ReactNode}){return <AccountGate>{children}</AccountGate>}
