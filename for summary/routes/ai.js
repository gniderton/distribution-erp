const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/analyze-cheque', async (req, res) => {
    try {
        const { imageUrl, imageBase64 } = req.body;
        let base64Data = "";
        let mimeType = "image/jpeg";

        if (imageUrl) {
            // Fetch from URL (e.g., Supabase Storage)
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            base64Data = Buffer.from(response.data).toString('base64');
            mimeType = response.headers['content-type'] || 'image/jpeg';
        } else if (imageBase64) {
            // Use direct Base64 (No storage needed)
            base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        } else {
            return res.status(400).json({ error: "No image source (URL or Base64) provided" });
        }

        // 2. Initialize Gemini 1.5 Flash (Optimized for Speed/Cost/Accuracy)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are a specialized OCR for Indian/Standard bank cheques. 
            Extract the following data from this image:
            1. Cheque Number: The first 6 digits found in the MICR line at the bottom center (e.g., "123456").
            2. Amount (Number): The numeric currency amount (e.g., 5000.00).
            3. Amount (Words): The text representation of the amount (e.g., "Five Thousand Only").
            4. Date: DD/MM/YYYY.
            5. Payee Name: The name written after 'Pay'.
            6. Company Name/Drawer: The name of the account holder at the bottom right who is signing the cheque.
            7. Bank Name: The title of the bank printed at the top.

            Output ONLY a JSON object in this format: 
            { 
              "cheque_no": string, 
              "amount_number": number, 
              "amount_words": string,
              "date": string, 
              "payee_name": string,
              "company_name": string,
              "bank_name": string, 
              "confidence": number 
            }
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType
                }
            }
        ]);

        const textResponse = result.response.text();
        
        // Extract JSON from potential Markdown block
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("AI failed to return valid JSON");
        }

        const data = JSON.parse(jsonMatch[0]);
        res.json(data);

    } catch (err) {
        console.error('AI Processing Error:', err.message);
        res.status(500).json({ 
            error: "Failed to read cheque", 
            details: err.message,
            tip: "Ensure GEMINI_API_KEY is set and the image is clear." 
        });
    }
});

module.exports = router;
