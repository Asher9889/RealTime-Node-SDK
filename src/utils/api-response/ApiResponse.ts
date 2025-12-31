import { Response } from "express";

export default class ApiResponse {
    // due to static we can call this method without creating an instance of the class
    static success(res: Response, message = "Success", data:any, statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            statusCode,
            message,
            data: data || [],
        });
    }

    static error(res: Response, message = "Something went wrong", statusCode = 500, errors?: any) {
        return res.status(statusCode).json({
            success: false,
            statusCode,
            message,
            errors: errors || [],
        });
    }
}
