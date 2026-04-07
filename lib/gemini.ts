// lib/gemini.ts
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';

export async function callGeminiStream(data: any): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const json = await response.json();
        let textResponse = "";
        
        if (json.candidates?.[0]?.content?.parts) {
            for (const part of json.candidates[0].content.parts) {
                if (part.text) {
                    textResponse += part.text;
                }
            }
        }

        if (!textResponse) throw new Error("Empty response from Gemini");

        // Clean markdown backticks and json
        let cleanJson = textResponse.replace(/^```json\s*/m, '').replace(/^```\s*$/m, '').trim();
        const match = cleanJson.match(/\{[\s\S]*\}$/u);
        if (match) {
            cleanJson = match[0];
        }

        return JSON.parse(cleanJson);
    } catch (e: any) {
        console.error("Gemini Error:", e.message);
        throw e;
    }
}
