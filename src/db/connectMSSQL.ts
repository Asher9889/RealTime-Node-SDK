import sql from "mssql";
import { envConfig } from "../config";

const sqlConfig = {
  user: envConfig.mssqlUser,
  password: envConfig.mssqlPassword,
  database: envConfig.mssqlDatabase,
  server: envConfig.mssqlServer,
  port: Number(envConfig.mssqlPort),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000 
  },
  options: {
    encrypt: false, // for azure
    trustServerCertificate: false // change to true for local dev / self-signed certs
  }
}

export const sqlPool = new sql.ConnectionPool(sqlConfig);

export default async function initMSSQLDB() {
  if (!sqlPool.connected) {
    await sqlPool.connect();
    console.log("MSSQL DB connected", sqlPool.connected);
  }
}