import { sqlPool } from "../../db";

export default async function waitForCommandResult(transId: string, timeoutMs = 30000) {
    console.log(`[waitForCommandResult] Waiting for transId: ${transId}, timeout: ${timeoutMs}ms`);
    const start = Date.now();
    let attempts = 0;

    while (Date.now() - start < timeoutMs) {
        attempts++;
        const result = await sqlPool.request()
            .input("trans_id", transId)
            .query(`
        SELECT status 
        FROM tbl_fkcmd_trans 
        WHERE trans_id = @trans_id
      `);

        const status = result.recordset[0]?.status;
        console.log(`[waitForCommandResult] Attempt ${attempts}: Status = ${status}`);

        if (status === "RESULT") {
            console.log(`[waitForCommandResult] Command completed for transId: ${transId}`);
            return;
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    console.error(`[waitForCommandResult] Timeout after ${timeoutMs}ms for transId: ${transId}`);
    throw new Error("Command timeout");
}