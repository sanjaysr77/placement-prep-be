// Uses OPEN AI

import type { Request, Response } from "express";
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai'

// Initialize LangChain ChatOpenAI model
const chatModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4",
    //temperature: 0
});

export async function roleController(req: Request, res: Response) {
    const { input } = req.body;

    if (!input || !input.trim()) {
        return res.status(400).json({ error: "Input not provided" });
    }

    try {
        const prompt = `Check if "${input}" is a valid CS job role (React Developer, .NET Developer, Data Scientist, etc.).
        Reply only with "VALID" or "INVALID".
        Reject vague inputs: Engineering, Developer, Full Stack, Frontend, Backend, Database.`;

        // LangChain invoke
        const response = await chatModel.invoke((prompt));

        // The response is usually a string
        const answer = response.text?.trim().toUpperCase();

        if (answer !== "VALID") {
            return res.status(400).json({ error: "Not a proper role" });
        }

        console.log("Valid Role Received:", input);
        res.json({ Role: input });

    } catch (err) {
        console.error("OpenAI/GROQ validation error:", err);
        res.status(500).json({ error: "AI validation failed" });
    }
}
