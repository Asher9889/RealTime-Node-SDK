import express from "express";
import { syncAllUsers, registerUser, remoteRegisterUser} from "../../controllers/syncUser.controller";
import { upload } from "../../middlewares/upload/multer.upload";

const router = express.Router();

router.post("/sync-all", syncAllUsers);
router.post("/register", upload.single("photo"), registerUser);
router.post("/remote-register",upload.single("photo"), remoteRegisterUser);



export default router;