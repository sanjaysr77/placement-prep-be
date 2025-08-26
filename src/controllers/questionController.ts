import { Request, Response } from "express";
import { getQuestionModel } from "../models/Question";
import { AttemptModel } from "../db"; 

export async function questionController(req: Request, res: Response) {
  try {
    const subject = req.params.subject.toLowerCase(); 
    const QuestionModel = getQuestionModel(subject);

    // @ts-ignore
    const userId = req.userId;

    // Find attempted question IDs for this user
    const attempted = await AttemptModel.find({ userId }).select("questionId");
    const attemptedIds = attempted.map((a) => a.questionId);

    const unattemptedCount = await QuestionModel.countDocuments({
      _id: { $nin: attemptedIds },
    });

    if (unattemptedCount === 0) {
      return res.status(404).json({ message: "No new questions available" });
    }

    const questions = await QuestionModel.aggregate([
      { $match: { _id: { $nin: attemptedIds } } },
      { $sample: { size: 10 } }
    ]);

    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: "Questions not found" });
    }

    const sanitized = questions.map((q) => {
      const { correctAnswer, __v, ...rest } = q;
      return rest;
    });

    res.json(sanitized);

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}
