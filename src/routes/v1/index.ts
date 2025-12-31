import express from "express";
import authRoutes from "./auth.routes";
import contactRoutes from "./contact.routes";
import userRoutes from "./user.routes";

const router = express.Router();

router.use("/auth",  authRoutes);
router.use("/contact", contactRoutes);
router.use("/user", userRoutes);

export default router;