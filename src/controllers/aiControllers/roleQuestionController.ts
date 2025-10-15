import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

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

function normalizeRoleName(role: string): string {
  return role
    .trim()
    .toLowerCase()
    .replace(/developer|engineer|role|roles|dev/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateQuestions(role: string) {
  const prompt = `
Generate 3 interview-style questions for the role "${role}".
- 2 normal questions with textual answers
- 1 one-word answer question
Return ONLY a valid JSON array of strings.
Example: ["Question 1", "Question 2", "Question 3"]
`;

  const response = await chatModel.call([{ role: "user", content: prompt }]);
  const rawContent = Array.isArray(response) ? response[0].text : response.text;

  if (!rawContent) return [];

  const cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed)
      ? parsed.map((q) => q.trim())
      : cleaned.split("\n").filter(Boolean);
  } catch {
    // fallback for malformed JSON
    return cleaned.split("\n").filter(Boolean).slice(0, 5);
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

    // -----------------
    // Step 1: Semantic search in Pinecone
    // -----------------
    console.log("🔎 Checking Pinecone role matches...");
    const searchResults = await pineconeStore.similaritySearchWithScore(canonicalRole, 20);

    // Stricter threshold to avoid cross-domain mismatches
    const STRICT_THRESHOLD = 0.85;

    const matchedDocs = searchResults.filter(([doc, score]) => {
      const docRole = doc.metadata?.role?.toLowerCase() || "";
      // Only accept exact role match or very high similarity
      return docRole === canonicalRole || score >= STRICT_THRESHOLD;
    });

    // -----------------
    // Step 2: Use cached questions only if strong match
    // -----------------
    if (matchedDocs.length > 0) {
      const matchedRole = matchedDocs[0][0].metadata.role;
      const questions = matchedDocs.map(([doc]) => doc.pageContent);
      console.log(`✅ Reusing ${questions.length} cached questions for "${matchedRole}"`);
      return { source: "pinecone", matchedRole, questions };
    }

    // -----------------
    // Step 3: No strong match → generate new questions via OpenAI
    // -----------------
    console.log(`🧠 No strong match found. Generating new questions for "${canonicalRole}"...`);
    const questions = await generateQuestions(canonicalRole);

    // -----------------
    // Step 4: Store generated questions in Pinecone
    // -----------------
    await pineconeStore.addDocuments(
      questions.map((q) => ({
        pageContent: q,
        metadata: { role: canonicalRole, type: "question" },
      }))
    );

    console.log(`🆕 Generated and stored clean questions for: ${canonicalRole}`);
    return { source: "openai", questions };
  } catch (err) {
    console.error("❌ Error in getQuestionsForRole:", err);
    return { error: "Failed to fetch questions" };
  }
}

// ---------------------------
// 5️⃣ Optional: Express Controller
// ---------------------------
// import { Request, Response } from "express";
// export const roleQuestionController = async (req: Request, res: Response) => {
//   const { validatedRole } = req.body;
//   if (!validatedRole) return res.status(400).json({ error: "validatedRole is required" });
//   const result = await getQuestionsForRole(validatedRole);
//   res.json(result);
// };
