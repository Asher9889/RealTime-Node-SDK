import { sqlPool } from "../../db";
import encodeBSComm from "./encodeBSComm";

export default async function queueGetUserInfo(deviceId: string, userId: string) {
    console.log(`[queueGetUserInfo] Starting for deviceId: ${deviceId}, userId: ${userId}`);
    const transId = (Math.random() * 10000).toFixed().toString(); // unique
    console.log(`[queueGetUserInfo] Generated transId: ${transId}`);
    
    const payload = encodeBSComm({ user_id: userId });

    await sqlPool.request()
        .input("trans_id", transId)
        .input("device_id", deviceId)
        .input("cmd_param", payload)
        .query(`
      INSERT INTO tbl_fkcmd_trans_cmd_param (trans_id, device_id, cmd_param)
      VALUES (@trans_id, @device_id, @cmd_param)

      INSERT INTO tbl_fkcmd_trans (trans_id, device_id, cmd_code, status, update_time)
      VALUES (@trans_id, @device_id, 'GET_USER_INFO', 'WAIT', GETDATE())
    `);

    console.log(`[queueGetUserInfo] User info command queued for userId: ${userId}, transId: ${transId}`);
    return transId;
}