import { sqlPool } from "../../db";

export default async function queueGetUserIdList(deviceId: string): Promise<string> {
    console.log(`[queueGetUserIdList] Starting for deviceId: ${deviceId}`);
    const transId = (Math.random() * 10000).toFixed().toString(); // unique
    console.log(`[queueGetUserIdList] Generated transId: ${transId}`);

    await sqlPool.request()
        .input("trans_id", transId)
        .input("device_id", deviceId)
        .query(`
      INSERT INTO tbl_fkcmd_trans (trans_id, device_id, cmd_code, status, update_time)
      VALUES (@trans_id, @device_id, 'GET_USER_ID_LIST', 'WAIT', GETDATE())
    `);

    console.log(`[queueGetUserIdList] Command queued successfully with transId: ${transId}`);
    return transId;
}
