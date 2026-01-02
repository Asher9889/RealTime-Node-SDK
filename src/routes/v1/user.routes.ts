import express from "express";
import { syncAllUsers, registerUser } from "../../controllers/syncUser.controller";
import { upload } from "../../middlewares/upload/multer.upload";

const router = express.Router();

router.post("/sync-all", syncAllUsers)
router.post("/register", upload.single("photo"), registerUser)



export default router;