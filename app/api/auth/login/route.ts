import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ success: false, error: 'Username va parol kiritilishi shart.' }, { status: 400 });
        }

        // First user auto-registration logic (if 0 admins exist)
        const adminCount = await prisma.user.count({ 
            where: { role: { in: ['admin', 'super_admin'] } } 
        });

        if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Tekshiramiz, balki bu foydalanuvchi allaqachon bazada bordir (lekin admin emas)
            let user = await prisma.user.findUnique({ where: { username } });
            
            if (user) {
                // Mavjud foydalanuvchini super_admin qilamiz
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        role: 'super_admin',
                        password: hashedPassword,
                        airport: 'ALL',
                        is_primary: true
                    }
                });
            } else {
                // Yangi super_admin yaratamiz
                user = await prisma.user.create({
                    data: {
                        username,
                        password: hashedPassword,
                        role: 'super_admin',
                        airport: 'ALL',
                        is_primary: true
                    }
                });
            }

            const session = await getSession();
            session.userId = user.id;
            session.role = user.role;
            session.airport = user.airport;
            session.isLoggedIn = true;
            await session.save();
            return NextResponse.json({ success: true, message: 'Foydalanuvchi super_admin darajasiga ko\'tarildi.' });
        }

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return NextResponse.json({ success: false, error: 'Login yoki parol xato.' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password!);
        if (!isValid) {
            return NextResponse.json({ success: false, error: 'Login yoki parol xato.' }, { status: 401 });
        }

        const session = await getSession();
        session.userId = user.id;
        session.role = user.role;
        session.airport = user.airport || 'TAS';
        session.isLoggedIn = true;
        await session.save();

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Login Error Details:", err);
        return NextResponse.json({ 
            success: false, 
            error: 'Tizim xatoligi', 
            details: err.message,
            stack: err.stack 
        }, { status: 500 });
    }
}


