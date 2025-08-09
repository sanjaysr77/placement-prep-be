import { Request, Response } from "express";
import { getQuestionModel } from "../models/Question";
import { AttemptModel } from "../db"; 

export async function questionController(req: Request, res: Response) {
  try {
    const subject = req.params.subject.toLowerCase(); 
    const QuestionModel = getQuestionModel(subject);

    // @ts-ignore
    const userId = req.userId;

    const attempted = await AttemptModel.find({ userId }).select("questionId");
    const attemptedIds = attempted.map((a) => a.questionId);

    const unattemptedCount = await QuestionModel.countDocuments({
      _id: { $nin: attemptedIds },
    });

    if (unattemptedCount === 0) {
      return res.status(404).json({ message: "No new questions available" });
    }

    const randomIndex = Math.floor(Math.random() * unattemptedCount);

    const question = await QuestionModel.findOne({
      _id: { $nin: attemptedIds },
    }).skip(randomIndex).limit(5);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const { correctAnswer, __v, ...rest } = question.toObject();
    res.json({ "Choose an answer.": rest });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}

