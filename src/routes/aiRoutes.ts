
import express from "express";
import { userMiddleware } from "../middleware/userMiddleware";
import { subjectController } from "../controllers/aiControllers/subjectController";
import { roleController } from "../controllers/aiControllers/roleController";
import { companyController } from "../controllers/aiControllers/companyController";

const router = express.Router();

router.post("/subject", userMiddleware, subjectController )
router.post("/role", userMiddleware, roleController)
router.post("/company", userMiddleware, companyController)

export default router;