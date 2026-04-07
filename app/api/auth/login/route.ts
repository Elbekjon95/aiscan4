import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import UserModel from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ success: false, error: 'Username va parol kiritilishi shart.' }, { status: 400 });
        }

        await connectToDatabase();

        // First user auto-registration logic (if 0 admins exist)
        const adminCount = await UserModel.countDocuments();
        if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await UserModel.create({
                username,
                password: hashedPassword,
                role: 'admin'
            });
            const session = await getSession();
            session.userId = newUser._id.toString();
            session.role = newUser.role;
            session.isLoggedIn = true;
            await session.save();
            return NextResponse.json({ success: true, message: 'Yangi admin yaratildi va tizimga kirildi.' });
        }

        const user = await UserModel.findOne({ username });
        if (!user) {
            return NextResponse.json({ success: false, error: 'Login yoki parol xato.' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password!);
        if (!isValid) {
            return NextResponse.json({ success: false, error: 'Login yoki parol xato.' }, { status: 401 });
        }

        const session = await getSession();
        session.userId = user._id.toString();
        session.role = user.role;
        session.isLoggedIn = true;
        await session.save();

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Login Error:", err);
        return NextResponse.json({ success: false, error: 'Tizim xatoligi' }, { status: 500 });
    }
}
