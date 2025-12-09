import express from "express";
import { userMiddleware } from "../middleware/userMiddleware";
import { getPersonalizedReport } from "../controllers/reportController";

const router = express.Router();

router.get("/personalized", userMiddleware, getPersonalizedReport);

export default router;

