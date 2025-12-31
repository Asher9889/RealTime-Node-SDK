import { contactController } from "../../controllers";
import express from "express";
import { validateBulkEnquiryReqBody } from "../../middlewares";
const router = express.Router();

router.post("/bulk-enquiry", validateBulkEnquiryReqBody , contactController.createBulkEnquiry);

export default router;