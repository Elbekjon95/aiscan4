import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { callGeminiStream } from '@/lib/gemini';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { extractTextFromPDF } from '@/lib/pdfExtract';

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

        // Cached check — file_hash + file_name + language bo'yicha
        const existing = await prisma.request.findFirst({ 
            where: {
                file_hash: fileHash, 
                file_name: file.name,
                analysis_type: 'document',
                language: lang,
            }
        });
        
        if (existing) {
            const cachedData = (existing.full_analysis as any) || {};
            if (cachedData.original_text) {
                cachedData.corrected_version = existing.corrected_version || cachedData.optimized_version || cachedData.corrected_version;
                return NextResponse.json({ ...cachedData, success: true, is_cached: true, request_id: existing.id });
            }
        }

        // Translation cache check - fayl bor lekin boshqa tilda bo'lsa
        const existingOtherLang = await prisma.request.findFirst({ 
            where: {
                file_hash: fileHash, 
                file_name: file.name,
                analysis_type: 'document',
            }
        });

        if (existingOtherLang && existingOtherLang.full_analysis) {
            const cachedData = (existingOtherLang.full_analysis as any) || {};
            if (cachedData.original_text) {
                console.log(`[Cache Translation] Fayl topildi (til: ${existingOtherLang.language}). Uni '${lang}' tiliga tarjima qilamiz...`);
                
                // Vaqtincha katta hajmli matnlarni olib tashlaymiz (token va vaqtni tejash uchun)
                const largeFields = {
                    original_text: cachedData.original_text,
                    original_html: cachedData.original_html,
                    extracted_full_text: cachedData.extracted_full_text,
                    original_file_base64: cachedData.original_file_base64,
                    optimized_version: cachedData.optimized_version,
                };
                
                const dataToTranslate = { ...cachedData };
                delete dataToTranslate.original_text;
                delete dataToTranslate.original_html;
                delete dataToTranslate.extracted_full_text;
                delete dataToTranslate.original_file_base64;
                delete dataToTranslate.optimized_version;

                const targetLangName = lang === 'uz' ? "O'zbek tili" : (lang === 'ru' ? "Rus tili" : "Ingliz tili");
                const translationPrompt = `
Siz JSON formatidagi ma'lumotlarni tarjima qiluvchi avtomatlashtirilgan tizimsiz.
Quyidagi JSON obyektidagi barcha matnli qiymatlarni (title, content, details, reason, status, xulosalar, original_phrase, corrected_phrase) qat'iyan ${targetLangName}ga tarjima qiling.
DIQQAT: 
1. Hech qanday raqamlar, baholar (score, percentage), ID lar va kalit so'zlarni (JSON keys) umuman o'zgartirmang!
2. Faqat qiymatlarni (values) tarjima qiling.
3. Natijani faqat JSON formatida qaytaring.

JSON:
${JSON.stringify(dataToTranslate, null, 2)}
`;
                const tData = {
                    contents: [{ role: "user", parts: [{ text: translationPrompt }] }],
                    generationConfig: {
                        temperature: 0.0,
                        maxOutputTokens: 65536,
                        responseMimeType: "application/json"
                    }
                };
                
                try {
                    let translatedJson = await callGeminiStream(tData);
                    if (Array.isArray(translatedJson) && translatedJson.length > 0) {
                        translatedJson = translatedJson[0];
                    }

                    // Katta maydonlarni joyiga qaytaramiz
                    translatedJson.original_text = largeFields.original_text;
                    translatedJson.original_html = largeFields.original_html;
                    translatedJson.extracted_full_text = largeFields.extracted_full_text;
                    translatedJson.original_file_base64 = largeFields.original_file_base64;

                    // Optimized textni qayta yig'amiz
                    let optimizedText = largeFields.original_text;
                    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const getFuzzyRegex = (searchStr: string) => {
                        const clean = searchStr.trim();
                        const escaped = escapeRegExp(clean);
                        const parts = escaped.split(/\s+/).filter(p => p.length > 0);
                        const mappedParts = parts.map(part => part.replace(/['’‘’`´ʻʼ]/g, "['’‘’`´ʻʼ]?").replace(/["“”«»]/g, '["“”«»]?'));
                        const pattern = mappedParts.join('\\s*');
                        return new RegExp(pattern, 'gi');
                    };

                    if (translatedJson.optimized_replacements && Array.isArray(translatedJson.optimized_replacements)) {
                        translatedJson.optimized_replacements.forEach((rep: any) => {
                            if (rep.original_phrase && rep.corrected_phrase) {
                                const orig = rep.original_phrase.trim();
                                const corr = rep.corrected_phrase.trim();
                                if (orig.length > 0) {
                                    try {
                                        const regex = getFuzzyRegex(orig);
                                        optimizedText = optimizedText.replace(regex, corr);
                                    } catch(e) {
                                        optimizedText = optimizedText.split(orig).join(corr);
                                    }
                                }
                            }
                        });
                    }
                    translatedJson.optimized_version = optimizedText;

                    // Saqlaymiz va qaytaramiz
                    const session = await getSession();
                    const airport = session.airport || 'TAS';
                    let auditorName = '777';
                    if (session.userId) {
                        const user = await prisma.user.findUnique({ where: { id: session.userId } });
                        if (user) auditorName = user.role === 'super_admin' ? '777' : user.username;
                    }

                    const newReq = await prisma.request.create({
                        data: {
                            file_name: file.name,
                            file_type: fileExt,
                            file_hash: fileHash,
                            analysis_score: translatedJson.total_score || translatedJson.score || existingOtherLang.analysis_score || 0,
                            compliance_score: translatedJson.compliance_score || existingOtherLang.compliance_score || 0,
                            favoritism_score: translatedJson.favoritism_score || existingOtherLang.favoritism_score || 0,
                            analysis_type: 'document',
                            language: lang,
                            airport: airport,
                            auditor_name: auditorName,
                            corrected_version: optimizedText || existingOtherLang.corrected_version || null,
                            full_analysis: translatedJson
                        }
                    });

                    translatedJson.corrected_version = optimizedText;
                    return NextResponse.json({ ...translatedJson, success: true, is_cached: true, is_translated: true, request_id: newReq.id, file_name: file.name, auditor_name: auditorName });
                } catch (tErr) {
                    console.error("Translation cache xatosi:", tErr);
                    // Agar tarjima o'xshamasa, shunchaki noldan tahlil qilishga o'tib ketsin (pastki kodlarga tushadi)
                }
            }
        }

        // Extract Text + Original HTML (for DOCX)
        let text = '';
        let originalHtml = '';
        let originalFileBase64 = '';
        let pdfPageCount = 0;
        const isPdfScanned = fileExt === 'pdf'; // PDF fayllar scanned bo'lishi mumkin
        if (fileExt === 'pdf') {
            // PDF faylni base64 formatida saqlash (frontend iframe uchun)
            originalFileBase64 = buffer.toString('base64');
            // PDF dan matnni ajratib olish (diagnostika va original_text uchun)
            // Gemini'ga esa PDF inline yuboriladi (OCR sifatida to'liq o'qiydi)
            try {
                const pdfResult = await extractTextFromPDF(buffer);
                text = pdfResult.text;
                pdfPageCount = pdfResult.pagesCount;
                console.log(`[PDF Text Extract] ${text.length.toLocaleString()} belgi, ${pdfPageCount} sahifa ajratib olindi`);
            } catch (pdfErr) {
                console.warn('[PDF Text Extract] Matn ajratishda xatolik:', pdfErr);
                text = '';
            }

            // Agar PDF matni o'ta qisqa yoki bo'sh bo'lsa (scanned PDF), Gemini orqali alohida OCR qilamiz
            const isPdfScannedOrShort = text.trim().length < 1000 || (pdfPageCount > 0 && text.trim().length / pdfPageCount < 150);
            if (isPdfScannedOrShort && originalFileBase64) {
                try {
                    console.log(`[PDF OCR] Mahalliy matn juda qisqa (${text.length} belgi). Gemini orqali maxsus OCR ishga tushirilmoqda...`);
                    const ocrData = {
                        contents: [{
                            role: "user",
                            parts: [
                                { text: "Transcribe all text from this PDF document completely, page by page. Do not summarize, do not skip anything. Transcribe all tables, headings, and paragraphs verbatim. Output only the extracted text." },
                                { inlineData: { mimeType: 'application/pdf', data: originalFileBase64 } }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.0,
                            maxOutputTokens: 65536
                        }
                    };
                    const ocrText = await callGeminiStream(ocrData, true);
                    if (ocrText && ocrText.trim().length > text.length) {
                        text = ocrText;
                        console.log(`[PDF OCR] Gemini OCR muvaffaqiyatli bajarildi: ${text.length.toLocaleString()} belgi ajratib olindi`);
                    }
                } catch (ocrErr) {
                    console.error('[PDF OCR] Gemini maxsus OCR tahlilida xatolik:', ocrErr);
                }
            }
        } else if (fileExt === 'docx') {
            const rawResult = await mammoth.extractRawText({ buffer });
            text = rawResult.value;
            // Original formatlash bilan HTML olish
            const htmlResult = await mammoth.convertToHtml({ buffer }, {
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                ]
            });
            originalHtml = htmlResult.value;
        } else {
            return NextResponse.json({ success: false, error: 'Faqat PDF va DOCX fayllari ruxsat etiladi.' }, { status: 400 });
        }

        // DOCX uchun HTML formatdagi matn ishlatamiz (jadvallar, ro'yxatlar saqlanadi)
        // PDF uchun oddiy matn qoladi (PDF o'zi inline sifatida to'liq yuboriladi)
        // Gemini 3.1 Pro 1M token kontekstni qo'llab-quvvatlaydi (~800K belgi)
        // 50-100 varoqli hujjatlarni ham to'liq o'qish uchun chegara kengaytirildi
        const isPdfInline = fileExt === 'pdf'; // PDF Gemini'ga inline yuboriladi
        const geminiText = isPdfInline
            ? '' // PDF inline yuboriladi, matn prompt ichiga qo'shilmaydi
            : (fileExt === 'docx' && originalHtml) 
                ? originalHtml.substring(0, 800000) 
                : text.substring(0, 500000);
        const isHtmlFormat = fileExt === 'docx' && !!originalHtml;

        // ============ DIAGNOSTIKA LOGLARI ============
        const totalLines = text.split('\n').length;
        const totalParagraphs = (originalHtml.match(/<p[\s>]/gi) || []).length;
        const totalTables = (originalHtml.match(/<table[\s>]/gi) || []).length;
        const totalHeadings = (originalHtml.match(/<h[1-6][\s>]/gi) || []).length;
        const totalListItems = (originalHtml.match(/<li[\s>]/gi) || []).length;
        const estimatedPages = pdfPageCount || Math.ceil(text.length / 3000); // ~3000 belgi = 1 varoq

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║          📄 HUJJAT DIAGNOSTIKASI (AISCAN)              ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║ 📁 Fayl nomi:       ${file.name}`);
        console.log(`║ 📦 Fayl hajmi:       ${(buffer.length / 1024).toFixed(1)} KB`);
        console.log(`║ 📄 Fayl turi:        ${fileExt?.toUpperCase()}`);
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║ 📝 Oddiy matn:       ${text.length.toLocaleString()} belgi`);
        console.log(`║ 🌐 HTML matn:        ${originalHtml.length.toLocaleString()} belgi`);
        console.log(`║ 📨 Gemini-ga yuborilgan: ${isPdfInline ? `PDF inline (${(buffer.length / 1024).toFixed(0)} KB)` : `${geminiText.length.toLocaleString()} belgi`}`);
        console.log(`║ ✂️  Kesilganmi:       ${isPdfInline ? '✅ YO\'Q (PDF to\'liq inline yuborildi)' : (geminiText.length < (isHtmlFormat ? originalHtml.length : text.length) ? '⚠️ HA (matn kesildi!)' : '✅ YO\'Q (to\'liq yuborildi)')}`);
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║ 📃 Qatorlar soni:    ${totalLines.toLocaleString()}`);
        console.log(`║ 📖 Taxminiy varoqlar: ~${estimatedPages} varoq`);
        console.log(`║ 📑 Paragraflar:      ${totalParagraphs}`);
        console.log(`║ 📊 Jadvallar:        ${totalTables}`);
        console.log(`║ 📌 Sarlavhalar:      ${totalHeadings}`);
        console.log(`║ 📋 Ro'yxat bandlari: ${totalListItems}`);
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║ 🔰 BIRINCHI 150 belgi:`);
        console.log(`║ ${text.substring(0, 150).replace(/\n/g, ' ↵ ')}`);
        console.log('╠──────────────────────────────────────────────────────────╣');
        console.log(`║ 🔚 OXIRGI 150 belgi:`);
        console.log(`║ ${text.substring(Math.max(0, text.length - 150)).replace(/\n/g, ' ↵ ')}`);
        console.log('╚══════════════════════════════════════════════════════════╝\n');
        
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


HUJJAT MATNI${isHtmlFormat ? ' (HTML formatda — jadvallar <table>, ro\'yxatlar <ul>/<ol>, sarlavhalar <h1>-<h3> sifatida berilgan)' : ''}:
${geminiText || '[Matn ajratib olinmadi, ilova qilingan PDF ga qarang]'}

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
Javobni FAQAT QUYIDAGI JSON FORMATIDA, istisnosiz ${targetLangName} tilida qaytaring. Javob maksimal darajada batafsil bo'lishi kerak.
DIQQAT: Javobda "optimized_version", "corrected_version" yoki boshqa hech qanday hujjatning to'liq matnini o'z ichiga olgan qo'shimcha maydonlarni JSONga qo'shmang! Faqatgina "optimized_replacements" maydonini bering. Hujjatning to'liq matnini o'z serverimiz o'zi tiklab oladi. Bu juda muhim, chunki to'liq matnni JSONda qaytarish tokenlar yetishmasligiga va javobning kesilib (truncated) qolishiga olib keladi.
Ushbu cheklovga qat'iy rioya qiling.

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
  "extracted_full_text": "Ushbu maydonni bo'sh qoldiring (qat'iy ravishda \"\").",
  "optimized_replacements": [
     {
        "original_phrase": "Hujjatdagi xato yoki favoritizm aniqlangan aynan o'sha gap yoki abzas matni. Bu matn asl matn bilan 100% bir xil bo'lishi shart.",
        "corrected_phrase": "Ushbu gap yoki abzasning to'liq to'g'rilangan, xatolar va favoritizmdan tozalangan yangi varianti."
     }
  ],
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
                maxOutputTokens: 65536,
                responseMimeType: "application/json"
            }
        };

        let resultJson = await callGeminiStream(data);

        // Agar model ba'zan ob'ekt o'rniga array ichida ob'ekt qaytarsa:
        if (Array.isArray(resultJson) && resultJson.length > 0) {
            resultJson = resultJson[0];
        }

        // Serverdagi to'liq matnni JSONga yuklaymiz (Gemini uni qayta yozishi shart emas, kesh qisqardi)
        resultJson.extracted_full_text = text;

        // Reconstruct optimized version by replacing incorrect phrases in original text
        const escapeRegExp = (str: string) => {
            return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        const getFuzzyRegex = (searchStr: string) => {
            const clean = searchStr.trim();
            const escaped = escapeRegExp(clean);
            const parts = escaped.split(/\s+/).filter(p => p.length > 0);
            const mappedParts = parts.map(part => {
                return part
                    .replace(/['’‘’`´ʻʼ]/g, "['’‘’`´ʻʼ]?")
                    .replace(/["“”«»]/g, '["“”«»]?');
            });
            const pattern = mappedParts.join('\\s*');
            return new RegExp(pattern, 'gi');
        };

        let optimizedText = text;
        if (resultJson.optimized_replacements && Array.isArray(resultJson.optimized_replacements)) {
            resultJson.optimized_replacements.forEach((rep: any) => {
                if (rep.original_phrase && rep.corrected_phrase) {
                    const orig = rep.original_phrase.trim();
                    const corr = rep.corrected_phrase.trim();
                    if (orig.length > 0) {
                        try {
                            const regex = getFuzzyRegex(orig);
                            optimizedText = optimizedText.replace(regex, corr);
                        } catch(e) {
                            optimizedText = optimizedText.split(orig).join(corr);
                        }
                    }
                }
            });
        }
        resultJson.optimized_version = optimizedText;
        resultJson.original_text = text;
        resultJson.original_html = originalHtml || '';
        resultJson.original_file_base64 = originalFileBase64 || '';

        // Diagnostika ma'lumotlari — frontendda ko'rsatish uchun
        const diagSentLabel = isPdfInline 
            ? `PDF inline (${Math.round(buffer.length / 1024)} KB)` 
            : `${geminiText.length.toLocaleString()} belgi`;
        const diagIsTruncated = isPdfInline 
            ? false  // PDF to'liq inline yuboriladi
            : geminiText.length < (isHtmlFormat ? originalHtml.length : text.length);

        resultJson.doc_diagnostics = {
            file_name: file.name,
            file_size_kb: Math.round(buffer.length / 1024),
            file_type: fileExt?.toUpperCase(),
            raw_text_length: text.length,
            html_length: originalHtml.length,
            sent_to_gemini: isPdfInline ? buffer.length : geminiText.length,
            sent_to_gemini_label: diagSentLabel,
            is_truncated: diagIsTruncated,
            is_pdf_inline: !!isPdfInline,
            total_lines: text ? text.split('\n').length : 0,
            estimated_pages: pdfPageCount || Math.ceil((text.length || 1) / 3000),
            paragraphs: (originalHtml.match(/<p[\s>]/gi) || []).length,
            tables: (originalHtml.match(/<table[\s>]/gi) || []).length,
            headings: (originalHtml.match(/<h[1-6][\s>]/gi) || []).length,
            list_items: (originalHtml.match(/<li[\s>]/gi) || []).length,
            first_text: text.substring(0, 100),
            last_text: text.substring(Math.max(0, text.length - 100)),
        };

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
                corrected_version: optimizedText || null,
                full_analysis: resultJson
            }
        });

        return NextResponse.json({ 
            ...resultJson, 
            corrected_version: optimizedText, 
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

