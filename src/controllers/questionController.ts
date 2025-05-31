import { Request, Response } from "express";
import { QuestionModel } from "../models/Question";

export async function dbmsQuestions (req: Request, res: Response) {
  try {
    const count = await QuestionModel.countDocuments();
    if (count === 0) {
      return res.status(404).json({ message: "No questions found" });
    }

    const randomIndex = Math.floor(Math.random() * count);
    const question = await QuestionModel.findOne().skip(randomIndex);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json({ question });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
