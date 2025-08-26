import express from "express";
import { questionController } from "../controllers/questionController";
import { userMiddleware } from "../middleware/userMiddleware"; 
import { attemptController } from "../controllers/attemptController";

const router = express.Router();

// Public for quiz start (no auth during development)
router.get("/:subject", userMiddleware, questionController);
router.post("/", userMiddleware, attemptController);

export default router;
