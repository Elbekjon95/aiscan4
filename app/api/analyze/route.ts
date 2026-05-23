import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { callGeminiStream } from '@/lib/gemini';
import crypto from 'crypto';
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
        const fileHash = crypto.createHash('md5').update(buffer).digest('hex');
        const fileExt = file.name.split('.').pop()?.toLowerCase();

        // Cached check
        const existing = await prisma.request.findFirst({ 
            where: {
                file_hash: fileHash, 
                analysis_type: 'document',
                language: lang 
            }
        });
        
        if (existing) {
            return NextResponse.json({ ...(existing.full_analysis as any), success: true, is_cached: true, request_id: existing.id });
        }

        // Extract Text
        let text = '';
        if (fileExt === 'pdf') {
            text = ''; // Gemini accepts PDF via base64 automatically
        } else if (fileExt === 'docx') {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return NextResponse.json({ success: false, error: 'Faqat PDF va DOCX fayllari ruxsat etiladi.' }, { status: 400 });
        }

        const cleanedText = text.substring(0, 15000); // limit to avoid massive context
        
        const session = await getSession();
        const airport = session.airport || 'TAS';

        // Fetch Internal Docs Context (Global + Local)
        const internalDocs = await prisma.internalDoc.findMany({
            where: {
                OR: [
                    { is_global: true },
                    { airport: airport }
                ]
            }
        });

        let docsContext = '';
        if (internalDocs.length > 0) {
            docsContext = 'KOMPANIYANING ICHKI QOIDALARI VA NIZOMLARI (Shu qoidalarga qatʼiy rioya etilishini tekshiring):\n\n';
            internalDocs.forEach(doc => {
                docsContext += `Hujjat nomi: ${doc.title}\nMatn: ${doc.content}\n\n`;
            });
        }

        const targetLangName = lang === 'uz' ? "O'zbek tili" : (lang === 'ru' ? "Rus tili" : "Ingliz tili");
        
        // Dynamic Section Titles based on language
        const tSummary = lang === 'uz' ? "Boshqaruv xulosasi (Meticulous Summary)" : (lang === 'ru' ? "Управленческое резюме (Тщательный аудит)" : "Executive Summary (Meticulous Audit)");
        const tAudit = lang === 'uz' ? "Har bir band bo'yicha Texnik-Huquqiy Audit" : (lang === 'ru' ? "Технико-юридический аудит по каждому пункту" : "Point-by-point Technical and Legal Audit");
        const tPricing = lang === 'uz' ? "Hujjatdagi Narx va Sifat tahlili" : (lang === 'ru' ? "Анализ цен и качества в документе" : "Price and Quality Analysis in the Document");

        const prompt = `
# SYSTEM INSTRUCTION: AISCAN - PROFESSIONAL PROCUREMENT COMPLIANCE AUDIT SYSTEM

Siz — AISCAN, O'zbekiston Respublikasi davlat va korporativ xaridlari bo'yicha eng yuqori darajadagi OB'YEKTIV, PRAGMATIK va KASBIY avtomatlashtirilgan ekspert-auditorsiz. 
Sizning maqsadingiz: Ochiq raqobatni ta'minlash bilan birga, Buyurtmachining mavjud infratuzilmasi xavfsizligi va barqarorligini hurmat qilish. Hujjatdagi har bir shubhali holatni tahlil qiling, ammo asossiz ayblovlardan saqlaning.

## 1. NORMATIV BAZA (SIZNING BILIMLARINGIZ)
Tahlilni FAQAT O'zbekiston Respublikasi qonunchiligi prizmasidan o'tkazing:
1. O'zR "Davlat xaridlari to'g'risida"gi Qonuni.
2. O'zR Byudjet kodeksi.
3. O'zR "Korrupsiyaga qarshi kurashish to'g'risida"gi Qonuni.
4. O'zR "Raqobat to'g'risida"gi Qonuni.
5. Vazirlar Mahkamasi qarorlari (O'zR).

${docsContext ? docsContext : ''}

HUJJAT MATNI:
${cleanedText || '[Matn ajratib olinmadi, ilova qilingan PDF ga qarang]'}

## 2. AUDIT VAZIFALARI (TASKS) - TIZIMLI TAHLIL QOIDALARI
Siz ushbu vazifalarni HUJJATNING HAR BIR BANDI bo'yicha bajarishingiz shart:

### VAZIFA №1: TEXNIK VA HUQUQIY AUDIT (Murosasiz, lekin aqlli)
- Har bir texnik talabni tahlil qiling. Agar o'lchamlar, og'irlik yoki spetsifikatsiyalar asossiz ravishda o'ta aniq ko'rsatilgan bo'lsa (masalan, millimetrgacha) va faqat bitta brendga mos kelsa, buni raqobatni cheklash deb baholang (O'zR "Davlat xaridlari to'g'risida"gi Qonuni-684, 46-modda).
- MUHIM ISTISNO: Agar Buyurtmachi hujjatda "mavjud dasturiy-apparat majmuasi bilan integratsiya qilish" (nativ moslik) zaruratini asoslagan bo'lsa, bu texnik ehtiyoj hisoblanadi. Bunday holatda raqobatni cheklash haqida xulosa qilishdan oldin, integratsiya talabi qanchalik mantiqiy ekanligini baholang.

### VAZIFA №2: NARX VA SAMARADORLIK AUDITI (Faqat faktlar asosida)
- Taqdim etilgan narxlarni tahlil qiling. DIQQAT: Agar hujjatda narxlar yoki byudjet ko'rsatilmagan bo'lsa, narxlarni o'zingiz to'qib chiqarmang (gallyutsinatsiya qilmang)! Faqat "Narxlar taqdim etilmaganligi sababli audit qilish imkonsiz" deb belgilang.

### VAZIFA №3: KOMPLAYENS VA AFILOVLIK (Yashirin xatarlar)
- Hujjatdagi yuridik yoki raqamli izlarni (telefon, manzil, xos ismlar, domenlar) qidiring. DIQQAT: Agar ishtirokchilarning ma'lumotlari (tijorat takliflari) hali yuklanmagan bo'lsa, afilovlik haqida xulosa bermang, faqat potentsial xatarlarni ko'rsating.

## 3. CHIQISH FORMATI (JSON)
Javobni FAQAT QUYIDAGI JSON FORMATIDA, istisnosiz ${targetLangName} tilida qaytaring. Javob maksimal darajada batafsil va "sinchkov" bo'lishi kerak:

{
  "document_title": "Hujjatning matn ichidagi rasmiy nomi (masalan: Texnik topshiriq №123)",
  "total_score": 0-100 (Audit umumiy bahosi),
  "compliance_score": Qonunchilikka mosligi (0-100),
  "favoritism_score": 0-100 (Loyiha necha foiz \"halol\" yozilgan),
  "favoritism_verdict": "none", "suspected", yoki "confirmed",
  "favoritism_evidence": [
     {
        "quote": "Aynan shubhali band matni",
        "reason": "Ushbu band nima uchun favoritizm ekanligining mantiqiy va huquqiy asosi (Per-clause assessment)",
        "severity": "medium|high|critical"
     }
  ],
  "identified_brands": [
     { "brand": "Brand", "mentions": 1, "is_direct_mention": true }
  ],
  "sections": [
    {
      "status": "...",
      "title": "${tSummary}",
      "content": "Professional auditorlik xulosasi",
      "details": ["1-asosiy fakt", "2-asosiy fakt", "3-fakt"]
    },
    {
      "status": "...",
      "title": "${tAudit}",
      "content": "Har bir bandning sinchkovlik bilan tushunishi",
      "details": [
         "1-band: [Tahlil va qonun moddasi]",
         "2-band: [Tahlil va qonun moddasi]",
         "3-band: [Tahlil va qonun moddasi]",
         "Xo'kazo... har bir bandni alohida tushuntiring"
      ]
    },
    {
      "status": "...",
      "title": "${tPricing}",
      "content": "Har bir mahsulot bo'yicha iqtisodiy audit",
      "details": ["Mahsulot 1: [Bozor narxi tahlili]", "Mahsulot 2: [Bozor narxi tahlili]"]
    }
  ],
  "audit_basis": ["Ushbu auditda tayanilgan aniq qonunlar va nizomlar ro'yxati"],
  "risks": ["Sinchkov tahlilda aniqlangan barcha xavflar ro'yxati"],
  "recommendations": ["Audit xulosasi asosidagi aniq va barcha harakatlar ro'yxati"],
  "optimized_version": "Hujjatning barcha xato va kamchiliklari tuzatilgan, favoritizm elementlaridan xoli bo'lgan to'liq yangi matni. Agar matn juda uzun bo'lsa, eng muhim qismlarini (texnik talablar va shartlarni) optimallashtirib bering.",
  "products": [
    { "name": "Mahsulot", "search_query": "Qidiruv so'rovi" }
  ]
}
`;

        const allParts: any[] = [{ text: prompt }];

        // PDF context if applicable
        if (fileExt === 'pdf') {
            const base64Data = buffer.toString('base64');
            allParts.push({
                inlineData: { mimeType: 'application/pdf', data: base64Data }
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

        let resultJson = await callGeminiStream(data);

        // Agar model ba'zan ob'ekt o'rniga array ichida ob'ekt qaytarsa:
        if (Array.isArray(resultJson) && resultJson.length > 0) {
            resultJson = resultJson[0];
        }

        // Save to DB
        const newReq = await prisma.request.create({
            data: {
                file_name: file.name,
                file_type: fileExt,
                file_hash: fileHash,
                analysis_score: resultJson.total_score || resultJson.score || 0,
                compliance_score: resultJson.compliance_score || 0,
                favoritism_score: resultJson.favoritism_score || 0,
                analysis_type: 'document',
                language: lang,
                airport: airport,
                corrected_version: resultJson.optimized_version || null,
                full_analysis: resultJson
            }
        });

        return NextResponse.json({ 
            ...resultJson, 
            corrected_version: resultJson.optimized_version, 
            success: true, 
            request_id: newReq.id,
            file_name: file.name
        });

    } catch (err: any) {
        console.error("Analyze API error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

