import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

// 1. Initialize Express app and setup storage
const app = express();
const storage = multer.memoryStorage();
const multerMiddleware = multer({ storage: storage });

// 2. Initialize Gemini API (Uses your Render environment variable)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. The Webhook parsing route
app.post('/api/webhook/email', multerMiddleware.single('file'), async (req, res) => {
    try {
        console.log(`Incoming request from: ${req.body.from || 'Unknown Sender'}`);
        
        let geminiContents = [];

        // Check if the customer attached a screenshot or image file
        if (req.file) {
            console.log(`Received file attachment: ${req.file.originalname}`);
            geminiContents.push({
                inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: req.file.mimetype
                }
            });
        } 
        
        // Also capture any standard text if they typed directly in the email body
        if (req.body.text && req.body.text.trim().length > 0) {
            geminiContents.push(req.body.text);
        }

        // Safety Guard: If they sent an email with absolutely nothing inside it
        if (geminiContents.length === 0) {
            return res.status(400).json({ error: "No text or image data provided." });
        }

        // The structural formatting rules telling Gemini what parameters to grab
        geminiContents.push(
            "Extract the following travel details from the provided image or text. Return a clean JSON object with these keys: airline, confirmation_code, passenger_name, flight_number, departure_airport, arrival_airport. If a detail cannot be found, set its value to null."
        );

        console.log("Sending data payload to Gemini 1.5 Flash...");
        
        // Call Gemini 1.5 Flash (handles both image files and plain text flawlessly)
         const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: geminiContents,
            config: { responseMimeType: "application/json" }
        });

        const parsedData = JSON.parse(response.text);
        
        console.log("=================================");
        console.log("SUCCESSFULLY EXTRACTED TICKET:");
        console.log(JSON.stringify(parsedData, null, 2));
        console.log("=================================");

        // Send structured JSON results back to Make or your client
        res.status(200).json(parsedData);

    } catch (error) {
        console.error("Error handling email parser:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Start the server on Render's required port
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Free parsing server listening on port ${PORT}`);
});
