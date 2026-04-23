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
        const tPricing = lang === 'uz' ? "Hujjatdagi Narx va Sifat tahlili" : (lang === 'ru' ? "Анализ цен va Sifat tahlili" : "Price and Quality Analysis in the Document");

        const prompt = `
# SYSTEM INSTRUCTION: AISCAN - PROFESSIONAL PROCUREMENT COMPLIANCE AUDIT SYSTEM

Siz — AISCAN, O'zbekiston Respublikasi davlat va korporativ xaridlari bo'yicha eng yuqori darajadagi SHAFQATSIZ va SINCHKOV professional avtomatlashtirilgan ekspert-auditorsiz. 
Sizning uslubingiz: Har bir so'z, har bir vergul va har bir raqam ostida yashirin korrupsiya yoki favoritizmni topish.

## 1. NORMATIV BAZA (SIZNING BILIMLARINGIZ)
Tahlilni FAQAT O'zbekiston Respublikasi qonunchiligi prizmasidan o'tkazing:
1. O'zR "Davlat xaridlari to'g'risida"gi Qonuni.
2. O'zR Byudjet kodeksi.
3. O'zR "Korrupsiyaga qarshi kurashish to'g'risida"gi Qonuni: Manfaatlar to'qnashuvi.
4. O'zR "Raqobat to'g'risida"gi Qonuni: Bozor monopoliyasini taqiqlash.
5. Vazirlar Mahkamasi qarorlari (O'zR).

${docsContext ? docsContext : ''}

HUJJAT MATNI:
${cleanedText || '[Matn ajratib olinmadi, ilova qilingan PDF ga qarang]'}

## 2. AUDIT VAZIFALARI (TASKS) - SINCHKOV TAHLIL QOIDALARI
Siz ushbu vazifalarni HUJJATNING HAR BIR BANDI (CLAUSE-BY-CLAUSE) BO'YICHA bajarishingiz shart. Birorta ham bandni yoki talabni e'tibordan chetda qoldirmang!

### VAZIFA №1: HAR BIR BANDNING TEXNIK VA HUQUQUY AUDITI
- Har bir texnik talabni (Point-by-point) tahlil qiling. 
- Agar talab bitta Brendga (masalan: Samsung, HP, Cisco) mos bo'lsa yoki boshqa ishtirokchilarni asossiz chehlasa, buni QAT'IY qayd eting.
- Har bir qonunbuzarlik uchun tegishli Qonun va Moddani ko'rsating.

### VAZIFA №2: NARX VA SAMARADORLIK AUDITI (PER ITEM)
- Har bir mahsulot yoki xizmat narxini O'zbekiston bozoridagi o'rtacha ko'rsatkichlar bilan sinchkovlik bilan solishtiring.
- Davlat mablag'larining har bir so'mi samarali sarflanayotganini tekshiring.

### VAZIFA №3: KOMPLAYENS VA AFILOVLIK (HIDDEN PATTERNS)
- Hujjatdagi har bir yuridik yoki raqamli izni (telefon raqamlari, manzil, e-mail) qidirib, yashirin kelishuvlar ehtimolini eng kichik detallarigacha tahlil qiling.

## 3. CHIQISH FORMATI (JSON)
Javobni FAQAT QUYIDAGI JSON FORMATIDA, istisnosiz ${targetLangName} tilida qaytaring. Javob maksimal darajada batafsil va "sinchkov" bo'lishi kerak:

{
  "document_title": "Hujjatning matn ichidagi rasmiy nomi (masalan: Texnik topshiriq №123)",
  "total_score": 0-100 (Audit umumiy bahosi),
  "compliance_score": Qonunchilikka mosligi (0-100),
  "favoritism_score": 0-100 (Loyiha necha foiz "halol" yozilgan),
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

