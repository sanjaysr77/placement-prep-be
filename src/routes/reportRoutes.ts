import express from "express";
import { userMiddleware } from "../middleware/userMiddleware";
import { getPersonalizedReport, getSubjectAttempts } from "../controllers/reportController";

const router = express.Router();

router.get("/personalized", userMiddleware, getPersonalizedReport);
router.get("/subject-attempts", userMiddleware, getSubjectAttempts);

export default router;


