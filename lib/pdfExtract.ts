// lib/pdfExtract.ts
// pdfjs-dist (Mozilla PDF.js) yordamida PDFdan matn ajratish
// pdf-parse v2 matnni to'g'ri ajratmayotganligi sababli to'g'ridan-to'g'ri pdfjs-dist ishlatamiz

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    // pdfjs-dist legacy versiyasi Node.js muhitida ishlaydi (canvas kerak emas)
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const allText: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const content = await page.getTextContent();

        // Har bir sahifadagi matn elementlarini birlashtirish
        let lastY: number | null = null;
        const pageLines: string[] = [];
        let currentLine = '';

        for (const item of content.items) {
            if (!('str' in item)) continue;
            const textItem = item as { str: string; transform: number[] };

            // Y koordinatasi o'zgarsa (yangi qator)
            const y = textItem.transform[5];
            if (lastY !== null && Math.abs(y - lastY) > 2) {
                if (currentLine.trim()) {
                    pageLines.push(currentLine.trim());
                }
                currentLine = textItem.str;
            } else {
                // Bir xil qatorda bo'lsa, bo'shliq bilan qo'shish
                if (currentLine && textItem.str && !currentLine.endsWith(' ') && !textItem.str.startsWith(' ')) {
                    currentLine += ' ' + textItem.str;
                } else {
                    currentLine += textItem.str;
                }
            }
            lastY = y;
        }

        // Oxirgi qatorni qo'shish
        if (currentLine.trim()) {
            pageLines.push(currentLine.trim());
        }

        if (pageLines.length > 0) {
            allText.push(pageLines.join('\n'));
        }

        page.cleanup();
    }

    await pdfDoc.destroy();
    return allText.join('\n\n');
}
