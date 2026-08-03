import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Bu sahifa ommaviy — autentifikatsiya talab qilinmaydi
// QR code skan qilganda shu API orqali ma'lumot olinadi
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const request = await prisma.request.findUnique({
            where: { id },
            select: {
                id: true,
                file_name: true,
                file_type: true,
                analysis_score: true,
                compliance_score: true,
                favoritism_score: true,
                analysis_type: true,
                affiliation_status: true,
                full_analysis: true,
                auditor_name: true,
                language: true,
                airport: true,
                created_at: true,
                // corrected_version va original_text o'tkazmaymiz — xavfsizlik uchun
            }
        });

        if (!request) {
            return NextResponse.json({ error: 'Tahlil natijasi topilmadi' }, { status: 404 });
        }

        // full_analysis dan katta binary ma'lumotlarni olib tashlaymiz (xavfsizlik + tezlik)
        const analysis = request.full_analysis as any || {};
        const safeAnalysis = { ...analysis };
        delete safeAnalysis.original_file_base64;
        delete safeAnalysis.original_html;
        delete safeAnalysis.original_text;
        delete safeAnalysis.extracted_full_text;
        delete safeAnalysis.optimized_version;
        delete safeAnalysis.corrected_version;

        return NextResponse.json({
            id: request.id,
            file_name: request.file_name,
            file_type: request.file_type,
            analysis_score: request.analysis_score,
            compliance_score: request.compliance_score,
            favoritism_score: request.favoritism_score,
            analysis_type: request.analysis_type,
            affiliation_status: request.affiliation_status,
            auditor_name: request.auditor_name,
            language: request.language,
            airport: request.airport,
            created_at: request.created_at,
            analysis: safeAnalysis,
        });

    } catch (err: any) {
        console.error('Report API xatolik:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
