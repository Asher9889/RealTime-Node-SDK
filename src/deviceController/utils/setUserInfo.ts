import { sqlPool } from "../../db";
import encodeBSComm from "./encodeBSComm";
import generateTransId from "./generateTransId";
import waitForCommandResult from "./waitForCommandResult";

export default async function setUserInfo(deviceId: string,
  user: {
    user_id: string;
    user_name: string;
    privilege?: string;
  }
) {
  const transId = generateTransId();

  const payload = encodeBSComm({
    user_id: user.user_id,
    user_name: user.user_name,
    user_privilege: user.privilege ?? "User",
    user_enabled: 1,
    user_depart_id: 0
  });

  await sqlPool.request()
    .input("trans_id", transId)
    .input("device_id", deviceId)
    .input("cmd_param", payload)
    .query(`
      INSERT INTO tbl_fkcmd_trans_cmd_param
      (trans_id, device_id, cmd_param)
      VALUES (@trans_id, @device_id, @cmd_param);

      INSERT INTO tbl_fkcmd_trans
      (trans_id, device_id, cmd_code, status, update_time)
      VALUES
      (@trans_id, @device_id, 'SET_USER_INFO', 'WAIT', GETDATE());
    `);

  await waitForCommandResult(transId);
}
