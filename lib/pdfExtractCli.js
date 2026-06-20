// lib/pdfExtractCli.js
const fs = require('fs');

async function main() {
    try {
        const filePath = process.argv[2];
        if (!filePath) {
            console.log(JSON.stringify({ success: false, error: "No file path provided" }));
            process.exit(1);
        }
        
        const buffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(buffer);
        
        // Import pdfjs-dist legacy build
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
        
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useSystemFonts: true,
            disableFeatureFlags: true
        });
        
        const pdfDoc = await loadingTask.promise;
        const totalPages = pdfDoc.numPages;
        const allText = [];
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const content = await page.getTextContent();
            
            let lastY = null;
            const pageLines = [];
            let currentLine = '';
            
            for (const item of content.items) {
                if (!item || typeof item.str !== 'string') continue;
                
                const textItem = item;
                const y = textItem.transform[5];
                
                if (lastY !== null && Math.abs(y - lastY) > 2) {
                    if (currentLine.trim()) {
                        pageLines.push(currentLine.trim());
                    }
                    currentLine = textItem.str;
                } else {
                    if (currentLine && textItem.str && !currentLine.endsWith(' ') && !textItem.str.startsWith(' ')) {
                        currentLine += ' ' + textItem.str;
                    } else {
                        currentLine += textItem.str;
                    }
                }
                lastY = y;
            }
            
            if (currentLine.trim()) {
                pageLines.push(currentLine.trim());
            }
            
            if (pageLines.length > 0) {
                allText.push(pageLines.join('\n'));
            }
            
            page.cleanup();
        }
        
        await pdfDoc.destroy();
        
        console.log(JSON.stringify({
            success: true,
            text: allText.join('\n\n'),
            pagesCount: totalPages
        }));
        
    } catch (err) {
        console.log(JSON.stringify({
            success: false,
            error: err.message
        }));
        process.exit(1);
    }
}

main();
