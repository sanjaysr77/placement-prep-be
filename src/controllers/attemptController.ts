import { Request, Response } from "express";
import { AttemptModel, UserModel } from "../db";

export async function attemptController(req: Request, res: Response ) {
    try {
        //@ts-ignore
        const userId = req.userId;
        const questionId = req.body.questionId;

        if (!questionId) {
            return res.status(400).json({ message: "Question Id is required" })
        }
        const user = UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" })
        }

        const alreadyAttempted = await AttemptModel.findOne({ userId, questionId });
        if (alreadyAttempted) {
            return res.status(409).json({ message: "Question already attempted" });
        }

        await AttemptModel.create({
            userId: userId,
            questionId: questionId
        });

        res.status(200).json({ message: "Attempt recorded succesfully" })
    }
    catch (error) {
        res.status(400).json({ message: "Server Error", error });
    }
};

