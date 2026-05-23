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
                file_name: file.name,
                analysis_type: 'document',
                language: lang 
            }
        });
        
        if (existing) {
            const cachedData = (existing.full_analysis as any) || {};
            cachedData.corrected_version = existing.corrected_version || cachedData.optimized_version || cachedData.corrected_version;
            return NextResponse.json({ ...cachedData, success: true, is_cached: true, request_id: existing.id });
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

        let auditorName = '777';
        if (session.userId) {
            const user = await prisma.user.findUnique({ where: { id: session.userId } });
            if (user) {
                auditorName = user.role === 'super_admin' ? '777' : user.username;
            }
        }

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

        // Check if there was a previous audit for a file with the same name (but different hash, otherwise cached check above would match)
        const previousRequest = await prisma.request.findFirst({
            where: {
                file_name: file.name,
                analysis_type: 'document',
                language: lang,
                airport: airport
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        let previousFindingsContext = '';
        if (previousRequest && previousRequest.full_analysis) {
            const prev = previousRequest.full_analysis as any;
            const prevRisks = prev.risks || [];
            const prevEvidence = prev.favoritism_evidence || [];
            const prevRecs = prev.recommendations || [];
            
            previousFindingsContext = `
## HUJJATNING AVVALGI TAHLIL NATIJALARI (Ushbu kamchiliklar to'g'rilanganligini tekshiring):
- Avvalgi umumiy ball: ${prev.total_score || 'Nomaʼlum'}
- Avval aniqlangan xavflar:
${prevRisks.map((r: string, idx: number) => `  ${idx + 1}. ${r}`).join('\n')}
- Avval aniqlangan favoritizm alomatlari:
${prevEvidence.map((e: any, idx: number) => `  ${idx + 1}. "${e.quote}": ${e.reason} (${e.severity})`).join('\n')}
- Berilgan tavsiyalar:
${prevRecs.map((rec: string, idx: number) => `  ${idx + 1}. ${rec}`).join('\n')}

DIQQAT: Foydalanuvchi ushbu kamchiliklarni bartaraf qilish maqsadida hujjatni qayta tahrirlagan va yuklagan.
Sizning vazifangiz — faqat yuqorida ko'rsatilgan xavflar va favoritizm alomatlari bartaraf qilinganligini tekshirish.
Agar foydalanuvchi ularni to'g'rilagan bo'lsa, ularni qaytadan xato deb ko'rsatmang, hujjatning bahosini sezilarli darajada (loyihani maqtash darajasida, 90-100 ballgacha) oshiring hamda favoritizmni "none" (aniqlanmadi) deb belgilang. Yangi va kichik nuqsonlarni qidirmang.
`;
        }

        const targetLangName = lang === 'uz' ? "O'zbek tili" : (lang === 'ru' ? "Rus tili" : "Ingliz tili");
        
        // Dynamic Section Titles based on language
        const tSummary = lang === 'uz' ? "Boshqaruv xulosasi (Meticulous Summary)" : (lang === 'ru' ? "Управленческое резюме (Тщательный аудит)" : "Executive Summary (Meticulous Audit)");
        const tAudit = lang === 'uz' ? "Har bir band bo'yicha Texnik-Huquqiy Audit" : (lang === 'ru' ? "Технико-юридический аудит по каждому пункту" : "Point-by-point Technical and Legal Audit");
        const tPricing = lang === 'uz' ? "Hujjatdagi Narx va Sifat tahlili" : (lang === 'ru' ? "Анализ цен и качества в документе" : "Price and Quality Analysis in the Document");

        const prompt = `
# SYSTEM INSTRUCTION: AISCAN - PROFESSIONAL PROCUREMENT COMPLIANCE AUDIT SYSTEM

Siz — AISCAN, O'zbekiston Respublikasi davlat va korporativ xaridlari bo'yicha eng yuqori darajadagi OB'YEKTIV, PRAGMATIK va KASBIY avtomatlashtirilgan ekspert-auditorsiz. 
Sizning maqsadingiz: Ochiq raqobatni ta'minlash bilan birga, Buyurtmachining mavjud infratuzilmasi xavfsizligi va barqarorligini hurmat qilish. Hujjatdagi har bir shubhali holatni tahlil qiling, ammo asossiz ayblovlardan saqlaning. Tahlil ohangini asossiz ayblovchi yoki agressiv emas, balki xatolarni to'g'rilashda yordam beruvchi konstruktiv, do'stona va professional maslahatchi ko'rinishida shakllantiring.

## 1. AUDIT QAT'IYLIGI VA XAVF TIZIMI (MUHIM MUVOZANAT)
- **MUROSASIZ QAT'IY CHEKLOVLAR (CRITICAL VIOLATIONS):** Qonunni chetlab o'tish yoki korrupsion xavflarning oldini olish uchun quyidagilarni o'ta qattiq tekshiring:
  1. Affillanganlik (o'zaro bog'liqlik) va manfaatlar to'qnashuvi.
  2. Bir ishtirokchiga asossiz yon bosish (favoritizm), uning manfaatlarini ko'zlab to'g'ridan-to'g'ri o'xshashi yo'q monopol shartlar yozish.
  3. Narxlarni sun'iy va asossiz shishirish yoki asossiz yuqori baholash.
  4. Qonun doirasida taqiqlangan yuridik va ma'muriy cheklovlar.
  Bunday jiddiy holatlar aniqlansa, baholarni (compliance_score va favoritism_score) murosasiz ravishda pasaytiring va favoritism_evidence dagi xavf darajasini "critical" deb belgilang!
- **YUMSHOQ VA TAVSIYAVIY TALABLAR (MINOR TECHNICAL CLAUSES):** Qonuniy to'siq bo'lmaydigan va faqat operatsion/texnik sifatni oshirishga qaratilgan mayda mezonlarni yumshoq va konstruktiv audittan o'tkazing:
  1. Imlo yoki matn formatlash xatoliklari.
  2. Boshqa ishtirokchilarga xalaqit bermaydigan, raqobatni cheklamaydigan ikkinchi darajali mayda texnik tafsilotlar.
  3. Asoslangan integratsiya talablari (mavjud infratuzilmaga texnik moslik).
  Bunday mayda bandlar uchun jazo ballari bermang, balki ularni faqat tavsiya (advisory) yoki maslahat ko'rinishida taqdim eting.

## 2. NORMATIV BAZA (SIZNING BILIMLARINGIZ)
Tahlilni FAQAT O'zbekiston Respublikasi qonunchiligi prizmasidan o'tkazing:
1. O'zR "Davlat xaridlari to'g'risida"gi Qonuni.
2. O'zR Byudjet kodeksi.
3. O'zR "Korrupsiyaga qarshi kurashish to'g'risida"gi Qonuni.
4. O'zR "Raqobat to'g'risida"gi Qonuni.
5. Vazirlar Mahkamasi qarorlari (O'zR).

${docsContext ? docsContext : ''}

${previousFindingsContext ? previousFindingsContext : ''}


HUJJAT MATNI:
${cleanedText || '[Matn ajratib olinmadi, ilova qilingan PDF ga qarang]'}

## 2. AUDIT VAZIFALARI (TASKS) - TIZIMLI TAHLIL QOIDALARI
Siz ushbu vazifalarni HUJJATNING HAR BIR BANDI bo'yicha bajarishingiz shart:

### VAZIFA №1: TEXNIK VA HUQUQIY AUDIT (Konstruktiv va aqlli)
- Har bir texnik talabni tahlil qiling. Agar o'lchamlar, og'irlik yoki spetsifikatsiyalar asossiz ravishda o'ta aniq ko'rsatilgan bo'lsa (masalan, millimetrgacha) va faqat bitta brendga mos kelsa, buni potentsial raqobatni cheklash xavfi deb baholang. Agar bu talablar asossiz bo'lmasa yoki kichik texnik tafsilotlar bo'lsa, ularni xavf deb belgilamang va jazo ballari bermang.
- MUHIM ISTISNO: Agar Buyurtmachi hujjatda "mavjud dasturiy-apparat majmuasi bilan integratsiya qilish" (nativ moslik) zaruratini asoslagan bo'lsa, bu texnik ehtiyoj hisoblanadi. Bunday holatda raqobatni cheklash haqida xulosa qilishdan oldin, integratsiya talabi qanchalik mantiqiy ekanligini baholang.

### VAZIFA №2: NARX VA SAMARADORLIK AUDITI (Faqat faktlar asosida)
- Taqdim etilgan narxlarni tahlil qiling. DIQQAT: Agar hujjatda narxlar yoki byudjet ko'rsatilmagan bo'lsa, narxlarni o'zingiz to'qib chiqarmang (gallyutsinatsiya qilmang)! Faqat "Narxlar taqdim etilmaganligi sababli audit qilish imkonsiz" deb belgilang.

### VAZIFA №3: KOMPLAYENS VA AFILOVLIK (Yashirin xatarlar)
- Hujjatdagi yuridik yoki raqamli izlarni (telefon, manzil, xos ismlar, domenlar) qidiring. DIQQAT: Agar ishtirokchilarning ma'lumotlari (tijorat takliflari) hali yuklanmagan bo'lsa, afilovlik haqida xulosa bermang, faqat potentsial xatarlarni ko'rsating.

## 3. CHIQISH FORMATI (JSON)
Javobni FAQAT QUYIDAGI JSON FORMATIDA, istisnosiz ${targetLangName} tilida qaytaring. Javob maksimal darajada batafsil bo'lishi kerak:

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
                temperature: 0.0,
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
                auditor_name: auditorName,
                corrected_version: resultJson.optimized_version || null,
                full_analysis: resultJson
            }
        });

        return NextResponse.json({ 
            ...resultJson, 
            corrected_version: resultJson.optimized_version, 
            success: true, 
            request_id: newReq.id,
            file_name: file.name,
            auditor_name: auditorName
        });

    } catch (err: any) {
        console.error("Analyze API error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

