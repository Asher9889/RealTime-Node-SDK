import sql from "mssql";

const sqlConfig = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PWD || "msspl@123",
  database: process.env.DB_NAME || "AttDB",
  server: '160.25.62.109',
  port: 1433,
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