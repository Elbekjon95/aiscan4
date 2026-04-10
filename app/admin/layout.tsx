import { getSession } from '@/lib/auth';
import Navbar from '@/components/Layout/Navbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const session = await getSession();

    return (
        <main className="admin-layout">
            <Navbar 
                isAdmin={session.role === 'admin' || session.role === 'super_admin'} 
                isLoggedIn={session.isLoggedIn}
                role={session.role}
            />
            <div className="admin-content">
                {children}
            </div>
        </main>
    );
}
