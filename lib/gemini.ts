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
            const errorBody = await response.text();
            console.error(`Gemini API Error (Status ${response.status}):`, errorBody);
            throw new Error(`Gemini API error: ${response.status} - ${errorBody.substring(0, 200)}`);
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

        // Agar model qidiruv natijasini (Grounding) qaytarsa, uni ham log qilamiz
        if (json.candidates?.[0]?.groundingMetadata) {
            console.log("Grounding metadata found");
        }

        if (!textResponse) {
            console.error("Gemini returned empty parts. Full JSON:", JSON.stringify(json));
            throw new Error("Gemini empty response content");
        }

        // Clean markdown backticks and json
        let cleanJson = textResponse.replace(/^```json\s*/m, '').replace(/^```\s*$/m, '').trim();
        const match = cleanJson.match(/\{[\s\S]*\}$/u);
        if (match) {
            cleanJson = match[0];
        }

        try {
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse JSON. Raw text:", textResponse);
            throw new Error("Invalid JSON format from AI");
        }
    } catch (e: any) {
        console.error("callGeminiStream error:", e.message);
        throw e;
    }
}
