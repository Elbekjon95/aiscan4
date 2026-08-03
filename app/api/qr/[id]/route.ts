import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Bazadan request mavjudligini tekshiramiz
        const request = await prisma.request.findUnique({
            where: { id },
            select: { id: true, file_name: true }
        });

        if (!request) {
            return NextResponse.json({ error: 'Tahlil natijasi topilmadi' }, { status: 404 });
        }

        // Deployment URL ni olish — production da to'g'ri domain bo'ladi
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
        const proto = req.headers.get('x-forwarded-proto') || 'http';
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;

        const reportUrl = `${baseUrl}/report/${id}`;

        // QR code ni PNG buffer sifatida generatsiya qilamiz
        const qrBuffer = await QRCode.toBuffer(reportUrl, {
            type: 'png',
            width: 400,
            margin: 2,
            color: {
                dark: '#0f172a',   // qoʻngʻir-qora
                light: '#ffffff',  // oq fon
            },
            errorCorrectionLevel: 'H', // Yuqori xato to'g'rilash darajasi
        });

        return new NextResponse(new Uint8Array(qrBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400', // 1 kun kesh
                'Content-Disposition': `inline; filename="qr-${id}.png"`,
            }
        });

    } catch (err: any) {
        console.error('QR code generatsiyada xatolik:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
