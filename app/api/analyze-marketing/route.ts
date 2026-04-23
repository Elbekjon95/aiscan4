import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { callGeminiStream } from '@/lib/gemini';
import { getSession } from '@/lib/auth';

const mammoth = require('mammoth');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const lang = formData.get('lang') as string || 'uz';

        if (!file) {
            return NextResponse.json({ success: false, error: 'File not provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExt = file.name.split('.').pop()?.toLowerCase();

        let text = '';
        if (fileExt === 'pdf') {
            text = '';
        } else if (fileExt === 'docx') {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        }

        const targetLangName = lang === 'uz' ? "O'zbek tili" : (lang === 'ru' ? "Rus tili" : "Ingliz tili");

        const prompt = `
Siz O'zbekistonda xizmat ko'rsatgan yuqori darajadagi xaridlar (procurement) va marketing bo'yicha ekspertsiz. 
Men senga yuklagan Texnik Talablar (Technical Requirements) hujjatini diqqat bilan o'rganib chiq.

VAZIFA: 
1. Ushbu hujjatda so'ralayotgan mahsulot yoki xizmatni JAXON (Xalqaro) va O'ZBEKISTON bozorida taqdim eta oluvchi KAMIDA 10 TA real tashkilot/firma ro'yxatini topib ber.
2. Har bir tashkilot uchun ushbu mahsulotning REAL bozor narxini va shu narx olingan ANIQA MANBANI (URL) top.
3. Google Search orqali haqiqiy, ishlayotgan linklarni taqdim etishing shart.

JSON FORMATIDA qaytar:
{
  "organizations": [
    {
      "name": "Full Organization Name",
      "stir": "9-digit TIN or null",
      "product_name": "Specific product model or service name found",
      "activity_type": "Main activity",
      "email": "info@company.com",
      "phone": "+998...",
      "website": "https://www.company.com",
      "product_url": "https://www.company.com/products/item-link",
      "price_source_url": "https://specific-price-page-link.com",
      "country": "Davlat nomi",
      "address": "City, Country, Street",
      "match_percent": 85,
      "market_price": "15,000,000 UZS ($1,200)",
      "reasoning": "Izoh"
    }
  ],
  "requirements_summary": "Qisqacha mazmun"
}

TEKNIK TALAB MATNI:
${text.substring(0, 15000)}

Javob tili: ${targetLangName}
`;

        const allParts: any[] = [{ text: prompt }];

        if (fileExt === 'pdf') {
            allParts.push({
                inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') }
            });
        }

        const data = {
            contents: [{ role: "user", parts: allParts }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
            }
        };

        console.log("Calling Gemini API with model:", process.env.GEMINI_MODEL || 'default');
        let resultJson = await callGeminiStream(data);
        if (Array.isArray(resultJson) && resultJson.length > 0) {
            resultJson = resultJson[0];
        }
        console.log("Gemini response received successfully");

        // Check blacklist
        if (resultJson.organizations) {
            for (const org of resultJson.organizations) {
                org.is_blacklisted = false;
                org.blacklist_reason = null;
                
                const orQuery: any = [];
                if (org.stir) orQuery.push({ stir: org.stir });
                if (org.name) orQuery.push({ name: { contains: org.name, mode: 'insensitive' } });

                if (orQuery.length > 0) {
                    const blacklisted = await prisma.blacklist.findFirst({
                        where: { OR: orQuery }
                    });
                    if (blacklisted) {
                        org.is_blacklisted = true;
                        org.blacklist_reason = blacklisted.reason;
                    }
                }
            }
        }

        const session = await getSession();
        const airport = session.airport || 'TAS';

        const newReq = await prisma.request.create({
            data: {
                file_name: file.name,
                file_type: fileExt,
                analysis_type: 'marketing',
                airport: airport,
                language: lang,
                full_analysis: resultJson
            }
        });

        return NextResponse.json({ ...resultJson, success: true, request_id: newReq.id });

    } catch (err: any) {
        console.error("Marketing API error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

