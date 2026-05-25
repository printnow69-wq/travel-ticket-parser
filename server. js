import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from "@google/genai";

const app = express();
const upload = multer(); 
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/webhook/email', upload.any(), async (req, res) => {
  try {
    const emailBody = req.body.text || req.body.html;
    const senderEmail = req.body.from;

    if (!emailBody) {
      return res.status(400).send('No email content found.');
    }

    console.log(`Parsing ticket email from: ${senderEmail}...`);
    const flightData = await parseEmailWithGemini(emailBody);

    console.log('====================================');
    console.log('SUCCESSFULLY EXTRACTED TICKET:');
    console.log(flightData);
    console.log('====================================');
    
    res.status(200).send('Email processed successfully.');
  } catch (error) {
    console.error('Error handling email parser:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function parseEmailWithGemini(emailText) {
  const prompt = `
    Analyze the following raw email text from an airline confirmation booking. 
    Extract the key travel details. If a detail cannot be found, return null for that field.
    You must output your answer strictly as a JSON object matching this schema:
    {
      "airline": "Name of airline",
      "confirmation_code": "6-character confirmation reference/PNR code",
      "passenger_name": "Full name of traveler",
      "flight_number": "Flight number",
      "departure_airport": "3-letter airport code",
      "arrival_airport": "3-letter airport code"
    }

    Email Content:
    ${emailText}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text);
}

app.listen(PORT, () => {
  console.log(`Free parsing server listening on port ${PORT}`);
});
