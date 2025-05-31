import express from "express";
import { dbmsQuestions } from "../controllers/questionController";
import { userMiddleware } from "../middleware/userMiddleware"; // your auth middleware

const router = express.Router();

router.get("/dbms", userMiddleware, dbmsQuestions);

export default router;
