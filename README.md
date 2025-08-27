## Quiz Application Backend (Node.js + TypeScript)

Simple quiz backend with JWT auth, MongoDB (Mongoose), topic-wise dynamic question collections, and attempt tracking.

### Tech Stack
- **Runtime**: Node.js, TypeScript
- **Framework**: Express
- **Database**: MongoDB via Mongoose
- **Auth**: JWT
- **Validation**: Zod

---

## File Structure

  ├─ src\
  │  ├─ controllers\
  │  │  ├─ attemptController.ts        # Records an attempted question
  │  │  └─ questionController.ts       # Fetches 10 questions (3 easy, 4 medium, 3 hard)
  │  ├─ middleware\
  │  │  └─ userMiddleware.ts           # Verifies JWT from `token` header, sets req.userId
  │  ├─ models\
  │  │  └─ Question.ts                 # Question schema + dynamic model by subject/collection
  │  ├─ routes\
  │  │  └─ questionRoutes.ts           # Topicwise routes (GET by subject, POST attempt)
  │  ├─ db.ts                          # Mongo connection, User and Attempt models
  │  └─ index.ts                       # Express app, auth routes, mount topicwise router
  ├─ dist\...                          # Compiled JS output
  ├─ nodemon.json                      # Dev runner (ts-node ./src/index.ts)
  ├─ package.json                      # Scripts and deps
  └─ tsconfig.json                     # TypeScript configuration

---

## Environment & Configuration

Create a `.env` file in the project root with:

```env
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=your-very-secret-string


Notes:
- The server listens on port `3000`.
- JWT is expected in the request header named `token` (not `Authorization`).

---

## Install, Build, and Run

# install
npm install

# dev (auto-reload with ts-node)
npm run dev

# build TS → JS
npm run build

# start compiled server
npm start


Scripts (from `package.json`):
- `dev`: Start with nodemon (`ts-node ./src/index.ts`)
- `build`: TypeScript build to `dist/`
- `start`: Run compiled app from `dist/index.js`

---

## Data Models (high-level)

- **User** (`src/db.ts`): `{ username, password (bcrypt hash), email (unique) }`
- **Attempt** (`src/db.ts`): `{ userId (ref User), questionId, attemptedAt }`
- **Question** (`src/models/Question.ts`):
  - Fields: `question`, `difficulty` one of `easy|medium|hard`, `topic`, `options[]`, `correctAnswer`
  - Stored in dynamic collections by subject (e.g., `math`, `physics`). Use `getQuestionModel(subject)` which maps to a collection named exactly `subject.toLowerCase()`.

---

