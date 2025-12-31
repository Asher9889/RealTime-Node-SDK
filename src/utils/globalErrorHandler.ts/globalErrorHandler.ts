import { StatusCodes } from "http-status-codes";
import ApiResponse from "../api-response/ApiResponse";
import { ErrorRequestHandler, NextFunction, Request, Response } from "express";

export default function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if(err instanceof ApiResponse){
        return err;
    }
    return ApiResponse.error(res, err.message, StatusCodes.INTERNAL_SERVER_ERROR)
}