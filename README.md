## Quiz Application Backend

Node.js + TypeScript backend for a quiz application with JWT authentication, MongoDB persistence, AI-powered question generation, and vector database integration.

### Tech Stack
- **Runtime**: Node.js, TypeScript
- **Framework**: Express
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **AI**: OpenAI, GROQ (via LangChain)
- **Vector DB**: Pinecone

### Setup

Install dependencies:
```bash
npm install
```

Configure `.env`:
```
MONGO_URL=
JWT_SECRET=
OPENAI_API_KEY=
GROQ_API_KEY=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=
```

### Running

Development:
```bash
npm run dev
```

Production:
```bash
npm run build && npm start
```

### API Routes
- `/signup` - User registration
- `/signin` - User login
- `/v1/quiz` - Quiz operations
- `/v1/genai` - AI-powered question generation
- `/v1/report` - Report generation
- `/v1/vectordb` - Vector database operations
