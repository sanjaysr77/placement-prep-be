import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";
import type { Request, Response } from "express";

// ---------------------------
// 1️⃣ Initialize OpenAI + Pinecone
// ---------------------------
const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini",
  temperature: 0,
});

const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index("mindprep");
const pineconeStore = new PineconeStore(embeddings, {
  pineconeIndex: index,
  namespace: "quiz",
});

// ---------------------------
// 2️⃣ Core Question Generator
// ---------------------------
async function generateQuestions(role: string) {
  const prompt = `
Generate 5 interview-style questions for the role "${role}".
- 3 questions: normal questions with textual answers.
- 1 question: explain a concept or mini-code.
- 1 question: one-word answer.
Return as an array of strings (JSON or newline-separated).
`;

  const response = await chatModel.call([{ role: "user", content: prompt }]);
  const content = Array.isArray(response) ? response[0].text : response.text;

  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : content.split("\n").filter(Boolean);
  } catch {
    return content.split("\n").filter(Boolean).slice(0, 5);
  }
}

// ---------------------------
// 3️⃣ Exported helper for backend-internal calls
// ---------------------------
export async function getQuestionsForRole(validatedRole: string) {
  try {
    // 🔍 Search Pinecone cache first
    const existing = await pineconeStore.similaritySearch(validatedRole, 5);
    if (existing.length > 0) {
      console.log("✅ Returning cached questions from Pinecone");
      return {
        source: "pinecone",
        questions: existing.map((doc) => doc.pageContent),
      };
    }

    // 🆕 Generate new questions via OpenAI
    const questions = await generateQuestions(validatedRole);

    // 💾 Save in Pinecone
    await pineconeStore.addDocuments(
      questions.map((q) => ({ pageContent: q, metadata: { role: validatedRole } }))
    );

    console.log("🆕 Generated and stored questions for:", validatedRole);
    return { source: "openai", questions };
  } catch (err) {
    console.error("Error in getQuestionsForRole:", err);
    return { error: "Failed to fetch questions" };
  }
}

// ---------------------------
// 4️⃣ Express route (optional for standalone use)
// ---------------------------
export const roleQuestionController = async (req: Request, res: Response) => {
  const { validatedRole } = req.body;
  if (!validatedRole) return res.status(400).json({ error: "validatedRole is required" });

  const result = await getQuestionsForRole(validatedRole);
  res.json(result);
};
