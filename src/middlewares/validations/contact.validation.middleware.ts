import { Request, Response, NextFunction } from "express";
import { contactSchema } from "../../schema/contact.schema";
import { ApiResponse } from "../../utils";

function validateBulkEnquiryReqBody(req: Request, res: Response, next: NextFunction) {
    const result = contactSchema.safeParse(req.body);
    if(!result.success){
       const errors = result.error.issues.map((error:any) => ({field: error.path[0], message: error.message})) 
        return next(ApiResponse.error(res, "Please provide valid request body", 400, errors))
    }
    next()
}

export { validateBulkEnquiryReqBody }
