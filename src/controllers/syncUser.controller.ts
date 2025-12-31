import { Request, Response } from "express";
import syncUserService from "../services";



export async function syncAllUsers(req: Request, res: Response,) {
    try {
        const result = await syncUserService.syncAllUsersService();
        return res.status(200).json(result);
    } catch (error) {
        console.log("Error in syncAllUsers", error);
        res.status(500).json({ error: "Failed to sync users" });
    }
}