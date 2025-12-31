import dotenv from "dotenv";
import { IEnvConfig } from "../interfaces/config.interface";

dotenv.config();


const envConfig: IEnvConfig = {
    port: Number(process.env.PORT),
    nodeEnv: process.env.NODE_ENV || "development",
    mongoUser: process.env.MONGO_USER || "",
    mongoPassword: process.env.MONGO_PASSWORD || "",
    mongoHost: process.env.MONGO_HOST || "localhost",
    mongoPort: process.env.MONGO_PORT || "27017",
    mongoAuthSource: process.env.MONGO_AUTHSOURCE || "admin",
    // Build URL dynamically if not provided directly
    dbName: process.env.MONGO_DBNAME || "",
    accessSecret: process.env.JWT_ACCESS_SECRET || "test",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "test",

    // Hostinger
    hostingerWebMailHost: process.env.HOSTINGER_WEB_MAIL_HOST || "",
    hostingerWebMailPort: Number(process.env.HOSTINGER_WEB_MAIL_PORT) || 0,
    hostingerWebMailUser: process.env.HOSTINGER_WEB_MAIL_AUTH_USER || "",
    hostingerWebMailPass: process.env.HOSTINGER_WEB_MAIL_AUTH_PASS || "",

    // Client Email
    clientEmail: process.env.CLIENT_EMAIL || ""

};

export default envConfig;