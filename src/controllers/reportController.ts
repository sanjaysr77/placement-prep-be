import type { Request, Response } from "express";
import { ChatOpenAI } from '@langchain/openai';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'mindprep'; // Assuming your DB name is mindprep
const COLLECTION_NAME = 'interviewscored';

const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini",
  temperature: 0
});

interface InterviewScore {
  userId: ObjectId;
  category: 'role' | 'company' | 'subject';
  name: string;
  score: number;
  sessionId: string;
  timestamp: Date;
}

export async function getPersonalizedReport(req: Request, res: Response) {
  const userId = req.userId; // Assuming userId is attached by userMiddleware

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<InterviewScore>(COLLECTION_NAME);

    const userScores = await collection.find({ userId: new ObjectId(userId) }).toArray();

    const roleScores: { category: string; score: number }[] = [];
    const companyScores: { category: string; score: number }[] = [];
    const subjectScores: { category: string; score: number }[] = [];

    userScores.forEach(score => {
      if (score.category === 'role') {
        roleScores.push({ category: score.name, score: score.score });
      } else if (score.category === 'company') {
        companyScores.push({ category: score.name, score: score.score });
      } else if (score.category === 'subject') {
        subjectScores.push({ category: score.name, score: score.score });
      }
    });

    return res.json({
      roleScores,
      companyScores,
      subjectScores,
    });

  } catch (error) {
    console.error("Error fetching personalized report:", error);
    return res.status(500).json({ error: "Failed to fetch report data" });
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function chatbotQuery(req: Request, res: Response) {
  const userId = req.userId; // Assuming userId is attached by userMiddleware
  const { question, reportData } = req.body; // reportData will be sent from frontend

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!question || !reportData) {
    return res.status(400).json({ error: "Question or report data not provided" });
  }

  try {
    const prompt = `
    You are an AI Interview Coach. A user is asking a question about their interview performance.
    Here is their personalized interview report data:

    Role Scores: ${JSON.stringify(reportData.roleScores)}
    Company Scores: ${JSON.stringify(reportData.companyScores)}
    Subject Scores: ${JSON.stringify(reportData.subjectScores)}

    Based on this data, and general interview coaching best practices, answer the following question:
    User Question: "${question}"

    Provide a helpful and encouraging response, focusing on actionable advice for improvement.
    Keep the answer concise and to the point.
    `;

    const response = await chatModel.invoke(prompt);
    const answer = response.text;

    return res.json({ answer });

  } catch (error) {
    console.error("Error in chatbot query:", error);
    return res.status(500).json({ error: "Failed to get chatbot response" });
  }
}
