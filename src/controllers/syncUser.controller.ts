import { Request, Response } from "express";
import syncUserService from "../services";
import { ApiResponse } from "../utils";
import { registerUserService, watchNewEntryViaDeviceService } from "../deviceController/realtimeDevice.controller";



export async function syncAllUsers(req: Request, res: Response,) {
    try {
        const result = await syncUserService.syncAllUsersService();
        return ApiResponse.success(res, "All Users Synced Successfully", result);
    } catch (error: any) {
        console.log("Error in syncAllUsers", error);
        return ApiResponse.error(res, error.message);
    }
}

let start = false;
export async function startEnrollmentWatcher() {
    if (start) return;
    start = true;
    watchNewEntryViaDeviceService();
}

export async function registerUser(req: Request, res: Response) {
    try {
        const { deviceId, userId, userName } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "Photo is required" });
        }

        if (!file.mimetype.includes("jpeg")) {
            return res.status(400).json({ error: "Only JPEG allowed" });
        }

        const photoBuffer: Buffer = file.buffer;

        const result = await registerUserService({ deviceId, userId, userName, photo: photoBuffer });
        return ApiResponse.success(res, "User Registered Successfully", result);
    } catch (error: any) {
        console.log("Error in registerUser", error);
        return ApiResponse.error(res, error.message);
    }
}