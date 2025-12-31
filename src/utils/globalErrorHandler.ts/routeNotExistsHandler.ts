import { NextFunction, Request, Response } from "express"
import ApiResponse from "../api-response/ApiResponse"

function routeNotExistsHandler(req:Request, res:Response, next:NextFunction) {
    console.log("Route not found")
    return next(new Error("Please check your api endpoints"))
}

export default routeNotExistsHandler;