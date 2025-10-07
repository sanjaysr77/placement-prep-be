//Uses GROQ

import type { Request, Response } from "express";
import 'dotenv/config';
import {ChatGroq } from '@langchain/groq'

// Initialize LangChain ChatOpenAI model
const chatModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY!,
  model: "openai/gpt-oss-20b", 
  //temperature: 0
});

export async function companyController(req: Request, res: Response) {
    const { input } = req.body;

    if (!input || !input.trim()) {
        return res.status(400).json({ error: "Input not provided" });
    }

    try {
        const prompt = `Check if "${input}" is a valid company (Google, Tech Mahindra etc.) that provides tech jobs today.
        Reply only with "VALID" or "INVALID".
        Reject vague inputs.`;

        // LangChain invoke
        const response = await chatModel.invoke((prompt));

        // The response is usually a string
        const answer = response.text?.trim().toUpperCase();

        if (answer !== "VALID") {
            return res.status(400).json({ error: "Not a proper role" });
        }

        console.log("Valid Company Received:", input);
        res.json({ Role: input });

    } catch (err) {
        console.error("OpenAI/GROQ validation error:", err);
        res.status(500).json({ error: "AI validation failed" });
    }
}
