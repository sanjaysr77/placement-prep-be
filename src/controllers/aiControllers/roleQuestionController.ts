import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini",
  temperature: 0,
});

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
});

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index("mindprep");

const pineconeStore = new PineconeStore(embeddings, {
  pineconeIndex: index,
  namespace: "quiz",
});

// 🔧 Normalize roles (for consistent search)
function normalizeRoleName(role: string): string {
  return role
    .trim()
    .toLowerCase()
    .replace(/developer|engineer|role|roles|dev/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 🤖 Generate exactly 3 questions using OpenAI if not found
async function generateQuestions(role: string) {
  const prompt = `
Generate 3 interview questions for the role "${role}":
- 2 technical questions
- 1 factual one-liner question
Return ONLY a valid JSON array of exactly 3 strings.
Example: ["Question 1", "Question 2", "Question 3"]
`;

  const response = await chatModel.call([{ role: "user", content: prompt }]);
  const rawContent = Array.isArray(response)
    ? response[0].text
    : response.text;

  if (!rawContent) return [];

  const cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    const final = Array.isArray(parsed) ? parsed.map((q) => q.trim()) : [];
    return final.slice(0, 3); // ✅ Always limit to 3
  } catch {
    // fallback if JSON is malformed
    return cleaned.split("\n").filter(Boolean).slice(0, 3);
  }
}

// 🌐 Main Logic
export async function getQuestionsForRole(validatedRole: string) {
  try {
    const canonicalRole = normalizeRoleName(validatedRole);
    console.log(`🎯 Searching for role: ${validatedRole} → canonical: ${canonicalRole}`);

    // 1️⃣ Embed the role for semantic search
    const searchQuery = `Interview questions for ${canonicalRole}`;
    const results = await pineconeStore.similaritySearchWithScore(searchQuery, 20);

    // 2️⃣ Filter semantically close matches (≥ 0.80)
    const STRICT_THRESHOLD = 0.80;
    const matchedDocs = results.filter(([_, score]) => score >= STRICT_THRESHOLD);

    if (matchedDocs.length > 0) {
      const matchedRole = matchedDocs[0][0].metadata?.role || canonicalRole;

      // 🌀 Randomize selection (pick any 3 random questions above threshold)
      const shuffled = matchedDocs.sort(() => Math.random() - 0.5);
      const questions = shuffled
        .map(([doc]) =>
          doc.pageContent
            .replace(/^Question:\s*/i, "")   // remove leading “Question: ”
            .replace(/\n*\s*Role:.*$/i, "")  // remove trailing “Role: …”
            .trim()
        )
        .slice(0, 3);

      console.log(
        `✅ Found ${matchedDocs.length} relevant matches for "${matchedRole}". Showing 3 random ones.`
      );
      return { source: "pinecone", matchedRole, questions };
    }

    // 3️⃣ If not found → generate new questions and store them
    console.log(`🆕 No semantic match found. Generating questions for "${canonicalRole}"...`);
    const newQuestions = await generateQuestions(canonicalRole);

    // 🧠 Store new questions
    const docsToStore = newQuestions.map((q) => ({
      pageContent: `Question: ${q}\n\nRole: ${canonicalRole}`,
      metadata: { role: canonicalRole, type: "question" },
    }));

    await pineconeStore.addDocuments(docsToStore);
    console.log(`✅ Generated and stored ${newQuestions.length} new questions for "${canonicalRole}"`);

    return { source: "openai", matchedRole: canonicalRole, questions: newQuestions };
  } catch (err) {
    console.error("❌ Error in getQuestionsForRole:", err);
    return { error: "Failed to fetch questions" };
  }
}
