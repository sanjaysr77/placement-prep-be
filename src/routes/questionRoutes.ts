import express from "express";
import { questionController } from "../controllers/questionController";
import { userMiddleware } from "../middleware/userMiddleware"; 
import { attemptController } from "../controllers/attemptController";
import { validateAnswersController } from "../controllers/validateAnswersController";

const router = express.Router();

router.get("/:subject", userMiddleware, questionController);
router.post("/attempt", userMiddleware, attemptController);
router.post("/validate", userMiddleware, validateAnswersController);

export default router;
