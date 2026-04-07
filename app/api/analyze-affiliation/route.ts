import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import RequestModel from '@/lib/models/Request';
import { callGeminiStream, GEMINI_API_KEY } from '@/lib/gemini';

const mammoth = require('mammoth');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];
        const lang = formData.get('lang') as string || 'uz';

        if (!files || files.length < 2) {
            return NextResponse.json({ success: false, error: 'Kamida 2 ta fayl talab qilinadi.' }, { status: 400 });
        }

        const allFilesData = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            
            let text = '';
            if (fileExt === 'pdf') {
                
                text = ''; // Gemini resolves PDF natively via payload
            } else if (fileExt === 'docx') {
                const result = await mammoth.extractRawText({ buffer });
                text = result.value;
            }

            allFilesData.push({
                name: file.name,
                type: fileExt,
                text: text.substring(0, 10000), // Max 10k chars
                raw: buffer
            });
        }

        // Simulating the 1st step: Extracting companies
        // We will send directly to big prompt since Gemini 3.1 Pro handles larger contexts well.
        let documentsContext = "";
        allFilesData.forEach((file, idx) => {
            documentsContext += `DOCUMENT ${idx + 1} (File: ${file.name}):\n${file.text || "[Scanned Image/No Text]"}\n\n`;
        });

        // Simulating API Search logic from Original PHP:
        // govInfoText could be gathered but for now we skip ORGINFO search if not active and let Gemini try to find it
        // Or we pass static text as per original if needed. We'll leave it empty to rely strictly on document data.
        const govInfoText = ""; 

        const targetLangName = lang === 'uz' ? "O'zbek tili" : (lang === 'ru' ? "Rus tili" : "Ingliz tili");

        const prompt = `
Siz O'zbekistonda xizmat ko'rsatgan bosh auditor, korrupsiyaga va affilatsiyaga qarshi kurash bo'yicha katta ekspertsiz.
Men senga bir nechta tijorat takliflari (Commercial Proposals) ni yubordim.
VAZIFA 1: ПРОВЕРКА НА АФФИЛИРОВАННОСТЬ (Collusion Check) - Kompaniyalar orasida yashirin til biriktirish va affilatsiyani topish.
VAZIFA 2: NARXLAR TAHLILI (Price Benchmark) - Taklif qilingan har bir mahsulotni barcha ishtirokchilar bo'yicha baholash.

Fayllardan olingan matnlar:
${documentsContext}

${govInfoText}

QADAMLAR:
1. Kompaniyalarni aniqla: Barcha kompaniyalar, rahbarlar, ta'sischilar, STIR (INN) larni fayllardan qidir.
2. Yashirin aloqalarni qidir (Affiliation Search):
   - Yuridik izlar: Bir xil manzil, ta'sischi, direktor
   - Raqamli izlar: Bir xil telefon raqamlar, e-mail domenlar, rekvizitlar.
   - Xulq-atvor naqshlari: Hujjatlarda bir xil qolip yoki grammatik xatolar. Barcha topilganlarini "links" da saqla.
3. Narxlarni solishtir (Price Analysis):
   - Asosiy tovar/xizmatlar nomi va narxlarni ajrat.
   - BARCHA ishtirokchilarni "quotes" ro'yxatiga kirit.
   - O'rtacha bozor narxini sumda taxmin qilib yoz ("market_price").

CRITICAL REQUIREMENT: Your ENTIRE response MUST be in ${targetLangName} ONLY.
Format exactly like this JSON:
{
  "collusion_status": "direct_affiliation|suspected_collusion|no_risk",
  "companies": [
    {
      "id": "comp_1",
      "name": "Full Company Name",
      "stir": "9-digit TIN or null",
      "founders": ["Founder Name 1"],
      "file": "Original Document Name.pdf"
    }
  ],
  "links": [
    {
      "involved_companies": ["comp_1", "comp_2"],
      "reason": "To'liq izoh",
      "evidence_type": "legal|digital|behavioral",
      "severity": "high|medium|low"
    }
  ],
  "price_analysis": [
    {
       "item_name": "Tovar nomi",
       "market_price": "O'rtacha bozor narxi",
       "quotes": [
          { "company": "Kompaniya 1 To'liq nomi", "price": "Ularning narxi" }
       ]
    }
  ],
  "summary": "1-2 gaplik yakuniy xulosa."
}
`;

        const allParts: any[] = [{ text: prompt }];

        allFilesData.forEach(file => {
            if (file.type === 'pdf') {
                allParts.push({
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: file.raw.toString('base64')
                    }
                });
            }
        });

        const data = {
            contents: [{ role: "user", parts: allParts }],
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
            }
        };

        const resultJson = await callGeminiStream(data);

        await connectToDatabase();
        
        const fileNames = files.map(f => f.name).join(' | ');
        const newReq = await RequestModel.create({
            file_name: fileNames,
            analysis_type: 'affiliation',
            affiliation_status: resultJson.collusion_status || 'no_risk',
            full_analysis: resultJson
        });

        return NextResponse.json({ ...resultJson, success: true, request_id: newReq._id });

    } catch (err: any) {
        console.error("Affiliation API error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
