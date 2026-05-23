import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getSession();
    if (session.isLoggedIn && session.userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: { username: true, role: true }
            });
            if (user) {
                const auditorName = user.role === 'super_admin' ? '777' : user.username;
                return NextResponse.json({
                    ...session,
                    username: user.username,
                    auditor_name: auditorName
                });
            }
        } catch (error) {
            console.error("Error fetching user in me route:", error);
        }
    }
    return NextResponse.json(session);
}

