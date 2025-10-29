import dotenv from "dotenv";
dotenv.config()

import mongoose, { model, Schema } from "mongoose";
const ObjectId = mongoose.Types.ObjectId;

async function main() {
    try {
        const MONGO_URL = process.env.MONGO_URL;
        if (!MONGO_URL) {
            throw new Error("Mongo URL is missing from .env")
        }
        await mongoose.connect(MONGO_URL)
        console.log("MongoDB is connected Successfully!")
    }
    catch (error) {
        console.error("MongoDB Connection Error", error);
        process.exit(1);
    }
}

main();

const UserSchema = new Schema({
    username: String,
    password: String,
    email: { type: String, unique: true }
})

const AttemptSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    questionId: { type: Schema.Types.ObjectId, required: true, ref: "Question" },
    selectedOption: { type: String, required: true },
    correct: { type: Boolean, required: true },
}, { timestamps: true });

export const UserModel = model("User", UserSchema);
export const AttemptModel = model("Attempt", AttemptSchema);

const InterviewScoreSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    role: { type: String, required: true },
    scores: { type: [Number], required: true }, // [20,20,10] style component scores
    total: { type: Number, required: true },    // capped at 50
    sessionId: { type: String },
}, { timestamps: true });

export const InterviewScoreModel = model("InterviewScore", InterviewScoreSchema);