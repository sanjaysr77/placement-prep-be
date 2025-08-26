import { Request, Response } from "express";
import { getQuestionModel } from "../models/Question";

export async function questionController(req: Request, res: Response) {
  try {
    const subject = req.params.subject.toLowerCase();
    const QuestionModel = getQuestionModel(subject);

    const questions = await QuestionModel.aggregate([
      { $sample: { size: 10 } },
    ]);

    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: "No questions available" });
    }

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}

