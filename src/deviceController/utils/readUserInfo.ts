import { sqlPool } from "../../db";

export default async function readUserInfo(transId: string) {
    console.log(`[readUserInfo] Reading user info for transId: ${transId}`);
    const result = await sqlPool.request()
        .input("trans_id", transId)
        .query(`
      SELECT cmd_result
      FROM tbl_fkcmd_trans_cmd_result
      WHERE trans_id = @trans_id
    `);

    const cmdResult = result.recordset[0]?.cmd_result as Buffer;
    console.log(`[readUserInfo] Retrieved buffer size: ${cmdResult?.length || 0} bytes for transId: ${transId}`);
    return cmdResult;
}