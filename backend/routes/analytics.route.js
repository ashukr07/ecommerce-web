import express from "express"
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import { analytics } from "../controllers/analytics.controller.js";

const router = express.Router();
router.get("/",protectRoute,adminRoute,analytics)

export default router;