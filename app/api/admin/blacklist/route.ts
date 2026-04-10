import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'super_admin' && session.role !== 'admin')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        
        let where = {};
        if (session.role === 'admin') {
            where = { 
                OR: [
                    { is_global: true }, 
                    { airport: session.airport }
                ] 
            };
        }

        const items = await prisma.blacklist.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({ success: true, items });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'super_admin' && session.role !== 'admin')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { stir, name, reason } = await req.json();

        if (!stir || !name || !reason) {
            return NextResponse.json({ success: false, error: 'Barcha maydonlar to\'ldirilishi shart.' }, { status: 400 });
        }
        
        const existing = await prisma.blacklist.findFirst({ where: { stir } });
        if (existing) {
            return NextResponse.json({ success: false, error: 'Ushbu STIR allaqachon qora ro\'yxatda mavjud.' }, { status: 400 });
        }

        const isGlobal = session.role === 'super_admin';
        const airport = session.role === 'super_admin' ? 'ALL' : session.airport;

        const newItem = await prisma.blacklist.create({ 
            data: {
                stir, 
                name, 
                reason,
                airport,
                is_global: isGlobal
            }
        });
        return NextResponse.json({ success: true, item: newItem });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'super_admin' && session.role !== 'admin')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();

        const item = await prisma.blacklist.findUnique({ where: { id } });
        if (!item) return NextResponse.json({ success: false, error: 'Topilmadi.' });

        if (session.role === 'admin' && item.airport !== session.airport) {
            return NextResponse.json({ success: false, error: 'Access denied' });
        }

        await prisma.blacklist.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

