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

export async function subjectController(req: Request, res: Response) {
  const { input } = req.body;

  if (!input || !input.trim()) {
    return res.status(400).json({ error: "Input not provided" });
  }

  try {
    const prompt = `Is "${input}" a valid academic subject (DBMS, OS, Software Engineering, Networks, OOPS, Python)? Reply only with VALID or INVALID.
    NOTE: It should be a Computer Science subject`;

    // LangChain invoke
    const response = await chatModel.invoke((prompt));

    // The response is usually a string
    const answer = response.text?.trim().toUpperCase();

    if (answer !== "VALID") {
      return res.status(400).json({ error: "Not a proper subject" });
    }

    console.log("Valid Subject Received:", input);
    res.json({ subject: input });

  } catch (err) {
    console.error("OpenAI validation error:", err);
    res.status(500).json({ error: "AI validation failed" });
  }
}
