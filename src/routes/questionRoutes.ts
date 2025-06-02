import express from "express";
import { questionController } from "../controllers/questionController";
import { userMiddleware } from "../middleware/userMiddleware"; // your auth middleware

const router = express.Router();

router.get("/:subject", userMiddleware, questionController);

export default router;
