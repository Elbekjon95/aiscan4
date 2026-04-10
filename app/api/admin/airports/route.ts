import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const airports = await prisma.airport.findMany({
            orderBy: [
                { type: 'asc' },
                { name: 'asc' }
            ]
        });
        return NextResponse.json({ success: true, airports });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || session.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const { action, ...airportData } = data;

        if (action === 'seed') {
            const initialAirports = [
                { name: 'Toshkent xalqaro aeroporti (Islom Karimov nomidagi)', code: 'TAS', type: 'international' as const },
                { name: 'Samarqand xalqaro aeroporti (DXSH)', code: 'SKD', type: 'international' as const },
                { name: 'Buxoro xalqaro aeroporti', code: 'BFE', type: 'international' as const },
                { name: 'Urganch xalqaro aeroporti', code: 'UGC', type: 'international' as const },
                { name: 'Navoiy xalqaro aeroporti', code: 'NVI', type: 'international' as const },
                { name: 'Termiz xalqaro aeroporti', code: 'TMJ', type: 'international' as const },
                { name: 'Nukus xalqaro aeroporti', code: 'NUK', type: 'international' as const },
                { name: 'Namangan xalqaro aeroporti', code: 'NMA', type: 'international' as const },
                { name: 'Fargʻona xalqaro aeroporti', code: 'FEG', type: 'international' as const },
                { name: 'Andijon xalqaro aeroporti', code: 'AZN', type: 'international' as const },
                { name: 'Qarshi xalqaro aeroporti', code: 'KSZ', type: 'international' as const },
                { name: 'Zomin aeroporti', code: 'ZOM', type: 'regional' as const },
                { name: 'Qoʻqon aeroporti', code: 'QOK', type: 'regional' as const },
                { name: 'Moʻynoq aeroporti', code: 'MOY', type: 'regional' as const },
                { name: 'Shahrisabz aeroporti', code: 'SHA', type: 'regional' as const },
                { name: 'Soʻx aeroporti', code: 'SOX', type: 'regional' as const }
            ];

            for (const ap of initialAirports) {
                await prisma.airport.upsert({
                    where: { code: ap.code },
                    update: ap,
                    create: ap,
                });
            }
            return NextResponse.json({ success: true, message: 'Aeroportlar muvaffaqiyatli seed qilindi.' });
        }

        if (!airportData.name || !airportData.code) {
            return NextResponse.json({ success: false, error: 'Name and Code are required' }, { status: 400 });
        }

        const newAp = await prisma.airport.create({ data: airportData });
        return NextResponse.json({ success: true, airport: newAp });

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

        const { id, name, code, type } = await req.json();
        await prisma.airport.update({
            where: { id },
            data: { name, code, type }
        });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || session.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();
        await prisma.airport.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

