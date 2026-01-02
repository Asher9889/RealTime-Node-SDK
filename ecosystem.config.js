module.exports = {
    apps: [{
        name: "Realtime-Node-SDK",
        script: "server.js",
        env: {
            NODE_ENV: "development",
            PORT: 4006,
            DEVICE_ID: "RSS20240372974",
            MSSQL_SERVER: "103.20.215.109",
            MSSQL_USER: "msspl",
            MSSQL_PASSWORD: "R#msspl109",
            MSSQL_DATABASE_NAME: "AttDB",
            MSSQL_PORT: "9851"
        },
        env_production: {
            NODE_ENV: "production",
            PORT: 4006,
            DEVICE_ID: "RSS20240372974",
            MSSQL_SERVER: "103.20.215.109",
            MSSQL_USER: "msspl",
            MSSQL_PASSWORD: "R#msspl109",
            MSSQL_DATABASE_NAME: "AttDB",
            MSSQL_PORT: "9851"
        }
    }]
}