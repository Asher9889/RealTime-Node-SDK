import express from "express";
import { envConfig } from "./config";
import apiRoutes from "./routes/index";
import { globalErrorHandler, routeNotExistsHandler } from "./utils";

import { initMSSQLDB } from "./db";

const app = express();

initMSSQLDB();

app.use(express.raw({type: "*/*", limit: "50mb"}));
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({limit: "50mb", extended: true}));

// app.post("/", realtimeDeviceController);


app.use("/api", apiRoutes);

app.use(routeNotExistsHandler)
app.use(globalErrorHandler);

app.listen(envConfig.port, () => {
    console.log(`Server is running on port ${envConfig.port}`);
});
    