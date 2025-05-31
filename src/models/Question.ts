import { Schema, model } from "mongoose";

const QuestionSchema = new Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
});

export const QuestionModel = model("Question", QuestionSchema, "dbms"); 
// "dbms" is the MongoDB collection name
