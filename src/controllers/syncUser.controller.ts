import { Request, Response } from "express";
import syncUserService from "../services";
import { StatusCodes } from "http-status-codes";
import { ApiResponse } from "../utils";



export async function syncAllUsers(req: Request, res: Response,) {
    try {
        const result = await syncUserService.syncAllUsersService();
        return ApiResponse.success(res, "All Users Synced Successfully", result);
    } catch (error: any) {
        console.log("Error in syncAllUsers", error);
        return ApiResponse.error(res, error.message);
    }
}