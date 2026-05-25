import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { text, title } = await req.json();

        if (!text) {
            return NextResponse.json({ success: false, error: 'Matn kiritilmadi' }, { status: 400 });
        }

        const docTitle = title || 'Optimallashtirilgan_Hujjat';
        const cleanTitle = docTitle.replace(/[^a-zA-Z0-9А-Яа-яЎўҚқҒғҲҳ_.-]/g, '_');

        // Font family for official documents in Uzbekistan
        const fontName = "Times New Roman";

        // Parse text into docx paragraphs
        const lines = text.split('\n');
        const childrenParagraphs: Paragraph[] = [];

        // Add a cover/header title
        childrenParagraphs.push(new Paragraph({
            children: [
                new TextRun({
                    text: (docTitle.toUpperCase() + ' - OPTIMALLASHTIRILGAN VERSIYA'),
                    font: fontName,
                    size: 28, // 14pt
                    bold: true,
                    color: "1E293B" // Brand color (dark slate/navy)
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 }
        }));

        for (let line of lines) {
            line = line.trim();
            if (!line) {
                // Empty line
                childrenParagraphs.push(new Paragraph({
                    children: [],
                    spacing: { after: 120 }
                }));
                continue;
            }

            if (line.startsWith('# ')) {
                childrenParagraphs.push(new Paragraph({
                    children: [
                        new TextRun({
                            text: line.substring(2).trim(),
                            font: fontName,
                            size: 28, // 14pt
                            bold: true,
                            color: "1E293B"
                        })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 },
                    keepNext: true,
                }));
            } else if (line.startsWith('## ')) {
                childrenParagraphs.push(new Paragraph({
                    children: [
                        new TextRun({
                            text: line.substring(3).trim(),
                            font: fontName,
                            size: 26, // 13pt
                            bold: true,
                            color: "334155"
                        })
                    ],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                    keepNext: true,
                }));
            } else if (line.startsWith('### ')) {
                childrenParagraphs.push(new Paragraph({
                    children: [
                        new TextRun({
                            text: line.substring(4).trim(),
                            font: fontName,
                            size: 24, // 12pt
                            bold: true,
                            color: "475569"
                        })
                    ],
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 160, after: 80 },
                    keepNext: true,
                }));
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                // Bullet list
                const cleanText = line.substring(2).replace(/\*\*/g, '').trim();
                childrenParagraphs.push(new Paragraph({
                    children: [
                        new TextRun({
                            text: cleanText,
                            font: fontName,
                            size: 24, // 12pt
                        })
                    ],
                    bullet: {
                        level: 0
                    },
                    spacing: { after: 80 }
                }));
            } else {
                // Regular paragraph with bold parsing (**bold**)
                const parts: TextRun[] = [];
                const boldRegex = /\*\*([^*]+)\*\*/g;
                let lastIndex = 0;
                let match;

                while ((match = boldRegex.exec(line)) !== null) {
                    const textBefore = line.substring(lastIndex, match.index);
                    if (textBefore) {
                        parts.push(new TextRun({
                            text: textBefore,
                            font: fontName,
                            size: 24,
                        }));
                    }
                    parts.push(new TextRun({
                        text: match[1],
                        font: fontName,
                        size: 24,
                        bold: true
                    }));
                    lastIndex = boldRegex.lastIndex;
                }

                const textAfter = line.substring(lastIndex);
                if (textAfter) {
                    parts.push(new TextRun({
                        text: textAfter,
                        font: fontName,
                        size: 24,
                    }));
                }

                childrenParagraphs.push(new Paragraph({
                    children: parts,
                    spacing: { after: 120 },
                    alignment: AlignmentType.JUSTIFIED
                }));
            }
        }

        // Create the DOCX document
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440,    // 1 inch
                            bottom: 1440, // 1 inch
                            left: 1440,   // 1 inch
                            right: 1440   // 1 inch
                        }
                    }
                },
                children: childrenParagraphs
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        const asciiTitle = cleanTitle.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const encodedTitle = encodeURIComponent(docTitle);

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${asciiTitle}_optimized.docx"; filename*=UTF-8''${encodedTitle}_optimized.docx`,
            }
        });

    } catch (err: any) {
        console.error("DOCX download error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
