import { Request, Response } from "express";
import { getQuestionModel } from "../models/Question";

export async function questionController(req: Request, res: Response) {
  try {
    const subject = req.params.subject.toLowerCase(); // e.g., "dbms", "os"
    const QuestionModel = getQuestionModel(subject);

    const count = await QuestionModel.countDocuments();
    if (count === 0) {
      return res.status(404).json({ message: "No questions found" });
    }

    const randomIndex = Math.floor(Math.random() * count);
    const question = await QuestionModel.findOne().skip(randomIndex);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    const {correctAnswer, ...rest} = question.toObject();
    res.json({ question: rest });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}
