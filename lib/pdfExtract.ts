// lib/pdfExtract.ts
// pdf-parse v2 (PDFParse) yordamida PDFdan matn ajratish (Next.js Turbopack xatoligini aylanib o'tish uchun CLI orqali ishlaydi)
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PDFExtractResult {
    text: string;
    pagesCount: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractResult> {
    return new Promise((resolve, reject) => {
        // Vaqtinchalik fayl yaratish
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `aiscan_temp_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
        
        try {
            fs.writeFileSync(tempFilePath, buffer);
        } catch (writeErr) {
            return reject(new Error(`Vaqtinchalik fayl yozishda xatolik: ${(writeErr as Error).message}`));
        }

        const cliPath = path.join(process.cwd(), 'lib', 'pdfExtractCli.js');
        
        execFile('node', [cliPath, tempFilePath], { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
            // Har doim vaqtinchalik faylni o'chiramiz
            try {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            } catch (unlinkErr) {
                console.error('[pdfExtract] Vaqtinchalik faylni o\'chirishda xatolik:', unlinkErr);
            }

            if (error) {
                console.error('[pdfExtract] CLI xatosi:', stderr || error.message);
                return reject(new Error(stderr || error.message));
            }

            try {
                const result = JSON.parse(stdout.trim());
                if (result.success) {
                    resolve({
                        text: result.text || '',
                        pagesCount: result.pagesCount || 0
                    });
                } else {
                    reject(new Error(result.error || 'Noma\'lum xatolik'));
                }
            } catch (parseErr) {
                reject(new Error(`CLI javobini o'qishda xatolik: ${(parseErr as Error).message}`));
            }
        });
    });
}

