import { sqlPool } from "../../db";
import encodeBSComm from "./encodeBSComm";
import generateTransId from "./generateTransId";
import waitForCommandResult from "./waitForCommandResult";

export default async function setEnrollData(
  deviceId: string,
  params: {
    user_id: string;
    backup_number: number; // 12 = FACE, 1 = PHOTO
    bin: Buffer;
  }
) {
  const transId = generateTransId();

  const payload = encodeBSComm(
    {
      user_id: params.user_id,
      backup_number: params.backup_number,
      enroll_data: "BIN_1"
    },
    [params.bin]
  );

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
      (@trans_id, @device_id, 'SET_ENROLL_DATA', 'WAIT', GETDATE());
    `);

  await waitForCommandResult(transId);
}
