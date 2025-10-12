import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";
//import type { Request, Response } from "express";

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
// 2️⃣ Normalize Role Function
// ---------------------------
function normalizeRoleName(role: string): string {
  return role
    .trim()
    .toLowerCase()
    .replace(/developer|engineer|role|roles|dev/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------
// 3️⃣ Question Generator
// ---------------------------
async function generateQuestions(role: string) {
  const prompt = `
Generate 5 interview-style questions for the role "${role}".
- 3 normal questions with textual answers
- 1 conceptual/code explanation question
- 1 one-word answer question
Return as a JSON array of strings.
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
// 4️⃣ Core Logic
// ---------------------------
export async function getQuestionsForRole(validatedRole: string) {
  try {
    const canonicalRole = normalizeRoleName(validatedRole);
    console.log(`Accepted locally: ${validatedRole}`);
    console.log(`🧭 Canonical role: ${canonicalRole}`);

    // Step 1: Semantic search in Pinecone
    console.log("🔎 Checking Pinecone role matches...");
    const searchResults = await pineconeStore.similaritySearchWithScore(canonicalRole, 20);

    const THRESHOLD = 0.78;
    let matchedDocs: typeof searchResults = [];

    // Step 2: Filter semantically similar roles manually
    for (const [doc, score] of searchResults) {
      const role = doc.metadata?.role?.toLowerCase();
      if (
        role?.includes(canonicalRole) ||
        canonicalRole.includes(role) ||
        score >= THRESHOLD
      ) {
        matchedDocs.push([doc, score]);
      }
    }

    // Step 3: If any match, reuse cached questions
    if (matchedDocs.length > 0) {
      const matchedRole = matchedDocs[0][0].metadata.role;
      console.log(`✅ Found matching role "${matchedRole}"`);

      const questions = matchedDocs.map(([doc]) => doc.pageContent);
      console.log(`📦 Reusing ${questions.length} cached questions for "${matchedRole}"`);

      return { source: "pinecone", matchedRole, questions };
    }

    // Step 4: Otherwise, generate new questions via OpenAI
    console.log(`🧠 No similar role found. Generating new questions for "${canonicalRole}"...`);
    const questions = await generateQuestions(canonicalRole);

    // Step 5: Store new questions in Pinecone
    await pineconeStore.addDocuments(
      questions.map((q) => ({
        pageContent: q,
        metadata: { role: canonicalRole, type: "question" },
      }))
    );

    console.log(`🆕 Generated and stored questions for: ${canonicalRole}`);
    return { source: "openai", questions };
  } catch (err) {
    console.error("❌ Error in getQuestionsForRole:", err);
    return { error: "Failed to fetch questions" };
  }
}

// ---------------------------
// 5️⃣ Express Controller
// ---------------------------
// export const roleQuestionController = async (req: Request, res: Response) => {
//   const { validatedRole } = req.body;
//   if (!validatedRole) {
//     return res.status(400).json({ error: "validatedRole is required" });
//   }

//   const result = await getQuestionsForRole(validatedRole);
//   res.json(result);
// };
