import {  Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

function createBulkEnquiry(req:Request, res:Response) {
    try {
        
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


export { createBulkEnquiry }