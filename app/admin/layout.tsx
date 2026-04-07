import { getSession } from '@/lib/auth';
import Navbar from '@/components/Layout/Navbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const session = await getSession();

    return (
        <div>
            <Navbar isAdmin={session.role === 'admin'} />
            <div className="container">
                {children}
            </div>
        </div>
    );
}
