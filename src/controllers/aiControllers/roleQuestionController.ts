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
Generate 3 interview questions for the role "${role}":
- 2 regular technical questions
- 1 short factual question with a one- or two-word answer (the question must be full-sentence)
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
    // Step 1️⃣: Exact role match from metadata (fast lookup)
    // -----------------
    console.log("🔎 Checking exact role match in Pinecone metadata...");
    const allResults = await pineconeStore.similaritySearchWithScore(canonicalRole, 50);
    const exactRoleDocs = allResults.filter(([doc]) => {
      return doc.metadata?.role?.toLowerCase() === canonicalRole;
    });

    if (exactRoleDocs.length > 0) {
      const matchedRole = exactRoleDocs[0][0].metadata.role;
      const questions = exactRoleDocs.map(([doc]) => doc.pageContent);
      console.log(`✅ Found exact role match for "${matchedRole}" (${questions.length} questions)`);
      return { source: "metadata", matchedRole, questions };
    }

    // -----------------
    // Step 2️⃣: Semantic similarity search (backup if exact match not found)
    // -----------------
    console.log("🧠 No exact match found. Checking semantic similarity...");
    const semanticResults = await pineconeStore.similaritySearchWithScore(canonicalRole, 20);
    const STRICT_THRESHOLD = 0.80;

    const matchedDocs = semanticResults.filter(([doc, score]) => score >= STRICT_THRESHOLD);

    if (matchedDocs.length > 0) {
      const matchedRole = matchedDocs[0][0].metadata.role;
      const questions = matchedDocs.map(([doc]) => doc.pageContent);
      console.log(`✅ Found semantically similar role "${matchedRole}" (${questions.length} questions)`);
      return { source: "semantic", matchedRole, questions };
    }

    // -----------------
    // Step 3️⃣: No match → Generate using OpenAI and store
    // -----------------
    console.log(`🆕 No match found. Generating questions for "${canonicalRole}"...`);
    const questions = await generateQuestions(canonicalRole);

    await pineconeStore.addDocuments(
      questions.map((q) => ({
        pageContent: q,
        metadata: { role: canonicalRole, type: "question" },
      }))
    );

    console.log(`✅ Generated and stored new questions for "${canonicalRole}"`);
    return { source: "openai", matchedRole: canonicalRole, questions };
  } catch (err) {
    console.error("❌ Error in getQuestionsForRole:", err);
    return { error: "Failed to fetch questions" };
  }
}
