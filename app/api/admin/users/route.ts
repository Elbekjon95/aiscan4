import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET() {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'super_admin' && session.role !== 'admin')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        
        let where: any = {};
        if (session.role === 'admin') {
            // Admin only sees users of their airport and NOT super_admins
            where = { 
                airport: session.airport,
                role: { not: 'super_admin' as Role }
            };
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                role: true,
                airport: true,
                is_primary: true,
                created_at: true
                // password olib tashlandi
            },
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({ success: true, users });
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

        const { username, password, role, airport } = await req.json();

        // Access check: Admin can only create users for their own airport
        const targetAirport = session.role === 'super_admin' ? airport : session.airport;
        let targetRole = role as Role;
        
        if (session.role === 'admin') {
            // Branch admin cannot create super_admin
            if (role === 'super_admin') targetRole = 'user' as Role;
        }

        if (!username || !password || !targetRole || !targetAirport) {
            return NextResponse.json({ success: false, error: 'Barcha maydonlar to\'ldirilishi shart.' }, { status: 400 });
        }
        
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json({ success: false, error: 'Ushbu login band.' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: targetRole,
                airport: targetAirport
            }
        });

        return NextResponse.json({ 
            success: true, 
            user: { id: newUser.id, username: newUser.username, role: newUser.role, airport: newUser.airport } 
        });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'super_admin' && session.role !== 'admin')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id, username, password, role, airport } = await req.json();

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return NextResponse.json({ success: false, error: 'Foydalanuvchi topilmadi' }, { status: 404 });

        // Primary Super Admin check
        if (user.is_primary) {
            return NextResponse.json({ success: false, error: 'Asosiy Super Adminni tahrirlab bo\'lmaydi' }, { status: 403 });
        }

        // Access check: Admin can only edit their own airport users
        if (session.role === 'admin' && user.airport !== session.airport) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        const updateData: any = {};
        if (username) updateData.username = username;
        if (password) updateData.password = await bcrypt.hash(password, 10);
        
        // Only Super Admin can change roles and airports across branches
        if (session.role === 'super_admin') {
            if (role) updateData.role = role as Role;
            if (airport) updateData.airport = airport;
        }

        await prisma.user.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true });
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

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return NextResponse.json({ success: false, error: 'Foydalanuvchi topilmadi' }, { status: 404 });

        // Primary Super Admin check
        if (user.is_primary) {
            return NextResponse.json({ success: false, error: 'Asosiy Super Adminni o\'chirib bo\'lmaydi' }, { status: 403 });
        }
        
        // Access check
        if (session.role === 'admin' && user.airport !== session.airport) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
        
        // Prevent deleting self
        if (user.id === session.userId) {
            return NextResponse.json({ success: false, error: 'O\'zingizni o\'chira olmaysiz' }, { status: 400 });
        }

        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

