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

    // Use $facet to get exactly 3 easy, 4 medium, 3 hard
    const results = await QuestionModel.aggregate([
      { $match: { _id: { $nin: attemptedIds } } },
      {
        $facet: {
          easy: [
            { $match: { difficulty: "easy" } },
            { $sample: { size: 3 } },
          ],
          medium: [
            { $match: { difficulty: "medium" } },
            { $sample: { size: 4 } },
          ],
          hard: [
            { $match: { difficulty: "hard" } },
            { $sample: { size: 3 } },
          ],
        },
      },
      {
        $project: {
          questions: { $concatArrays: ["$easy", "$medium", "$hard"] },
        },
      },
      { $unwind: "$questions" },
      { $replaceRoot: { newRoot: "$questions" } },
      { $sample: { size: 10 } } 
    ]);

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Questions not found" });
    }

    const sanitized = results.map((q) => {
      const { correctAnswer, __v, topic, difficulty, ...rest } = q;
      return rest;
    });

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}
