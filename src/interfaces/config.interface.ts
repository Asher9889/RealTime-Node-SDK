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

}