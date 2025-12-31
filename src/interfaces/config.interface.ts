export interface IEnvConfig {
    port: number;
    nodeEnv: string;
    mongoUser: string;
    mongoPassword: string;
    mongoHost: string;
    mongoPort: string;
    mongoAuthSource: string;
    mongoDBUrl?: string;
    dbName: string;
    accessSecret: string;
    refreshSecret: string;
    hostingerWebMailHost: string;
    hostingerWebMailPort:number;
    hostingerWebMailUser:string;
    hostingerWebMailPass: string
    clientEmail: string;

    // REALTIME
    deviceId: string;
    // MSSQL
    mssqlUser: string;
    mssqlPassword: string;
    mssqlServer: string;
    mssqlDatabase: string;
    mssqlPort: number;
}