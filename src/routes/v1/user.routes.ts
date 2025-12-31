import express from "express";
import { syncAllUsers } from "../../controllers/syncUser.controller";

const router = express.Router();

router.post("/sync-all", syncAllUsers)



export default router;