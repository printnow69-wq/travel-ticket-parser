import { GoogleGenAI } from '@google/genai';
// ... your other imports (express, multer, etc.)

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Assuming your multer middleware is configured to look for a field named 'file'
app.post('/api/webhook/email', multerMiddleware.single('file'), async (req, res) => {
    try {
        console.log(`Incoming request from: ${req.body.from || 'Unknown Sender'}`);
        
        let geminiContents = [];

        // 1. Check if the customer sent a screenshot/image file
        if (req.file) {
            console.log(`Received file attachment: ${req.file.originalname}`);
            geminiContents.push({
                inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: req.file.mimetype
                }
            });
        } 
        
        // 2. Also capture any standard text if they typed in the email body
        if (req.body.text && req.body.text.trim().length > 0) {
            geminiContents.push(req.body.text);
        }

        // 3. Guard rail: If they sent absolutely nothing
        if (geminiContents.length === 0) {
            return res.status(400).json({ error: "No text or image data provided." });
        }

        // Add your structural prompt guidelines
        geminiContents.push(
            "Extract the following travel details from the provided image or text. Return a clean JSON object with these keys: airline, confirmation_code, passenger_name, flight_number, departure_airport, arrival_airport. If a detail cannot be found, set its value to null."
        );

        // Call Gemini 1.5 Flash (supports both text and image inputs)
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

        res.status(200).json(parsedData);

    } catch (error) {
        console.error("Error handling email parser:", error);
        res.status(500).json({ error: error.message });
    }
});
