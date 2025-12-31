import { sqlPool } from "../../db";

export default async function readUserIdList(transId: string) {
    console.log(`[readUserIdList] Reading user list for transId: ${transId}`);
    const result = await sqlPool.request()
        .input("trans_id", transId)
        .query(`
      SELECT user_id, backup_number
      FROM tbl_fkcmd_trans_cmd_result_user_id_list
      WHERE trans_id = @trans_id
    `);

    console.log(`[readUserIdList] Found ${result.recordset.length} users for transId: ${transId}`);
    return result.recordset;
}