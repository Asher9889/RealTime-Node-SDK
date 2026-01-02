import { envConfig } from "../config";
import { sqlPool } from "../db";
import decodeBSComm from "./utils/decodeBSComm";
import queueGetUserIdList from "./utils/queueGetUserIdList";
import queueGetUserInfo from "./utils/queueGetUserInfo";
import readUserIdList from "./utils/readUserIdList";
import readUserInfo from "./utils/readUserInfo";
import { DecodedBSComm } from "./utils/decodeBSComm";
import waitForCommandResult from "./utils/waitForCommandResult";
import isUserAlreadySaved from "./utils/isUserAlreadySaved";
import setUserInfo from "./utils/setUserInfo";
import setEnrollData from "./utils/setEnrollData";
import generateTransId from "./utils/generateTransId";
import encodeEnrollUserPhotoBSComm from "./utils/encodeEnrollUserPhotoBSComm";

async function saveUserToMSSQL(deviceId: string, decoded: DecodedBSComm) {
  console.log("saveUserToMSSQL====", decoded);
  const user = decoded.json;

  // Resolve BINs
  const photoIndex =
    parseInt(user.user_photo.replace("BIN_", ""), 10) - 1;
  const photo = decoded.bins[photoIndex];

  const face = user.enroll_data_array[0];
  const faceIndex = parseInt(face.enroll_data.replace("BIN_", ""), 10) - 1;
  const faceTemplate = decoded.bins[faceIndex];

  // =========================
  // USERS
  // =========================
  await sqlPool.request()
    .input("device_id", deviceId)
    .input("user_id", user.user_id)
    .input("user_name", user.user_name)
    .input("privilege", user.user_privilege)
    .input("enabled", user.user_enabled)
    .input("depart_id", user.user_depart_id)
    .query(`
      MERGE users AS t
      USING (
        SELECT @device_id AS device_id, @user_id AS user_id
      ) AS s
      ON t.device_id = s.device_id AND t.user_id = s.user_id
      WHEN MATCHED THEN UPDATE SET
        user_name = @user_name,
        privilege = @privilege,
        enabled = @enabled,
        depart_id = @depart_id,
        updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (
          device_id, user_id,
          user_name, privilege, enabled, depart_id, updated_at
        )
        VALUES (
          @device_id, @user_id,
          @user_name, @privilege, @enabled, @depart_id, GETDATE()
        );
    `);

  // =========================
  // PHOTO
  // =========================
  await sqlPool.request()
    .input("device_id", deviceId)
    .input("user_id", user.user_id)
    .input("photo", photo)
    .query(`
      MERGE user_photos AS t
      USING (
        SELECT @device_id AS device_id, @user_id AS user_id
      ) AS s
      ON t.device_id = s.device_id AND t.user_id = s.user_id
      WHEN MATCHED THEN UPDATE SET photo = @photo
      WHEN NOT MATCHED THEN
        INSERT (device_id, user_id, photo)
        VALUES (@device_id, @user_id, @photo);
    `);

  // =========================
  // FACE TEMPLATE
  // =========================
  await sqlPool.request()
    .input("device_id", deviceId)
    .input("user_id", user.user_id)
    .input("backup_number", face.backup_number)
    .input("face_template", faceTemplate)
    .query(`
      MERGE user_face_templates AS t
      USING (
        SELECT
          @device_id AS device_id,
          @user_id AS user_id,
          @backup_number AS backup_number
      ) AS s
      ON
        t.device_id = s.device_id
        AND t.user_id = s.user_id
        AND t.backup_number = s.backup_number
      WHEN MATCHED THEN
        UPDATE SET face_template = @face_template
      WHEN NOT MATCHED THEN
        INSERT (
          device_id, user_id, backup_number, face_template
        )
        VALUES (
          @device_id, @user_id, @backup_number, @face_template
        );
    `);
}

export async function syncAllUsersService() {
  console.log("\n========================================");
  console.log("[syncAllUsersService] Starting sync process");
  console.log("========================================\n");

  try {
    const deviceId = envConfig.deviceId;
    console.log(`[syncAllUsersService] Target deviceId: ${deviceId}`);

    // Step 1: Get user ID list
    console.log("\n--- STEP 1: Getting User ID List ---");
    const listTransId = await queueGetUserIdList(deviceId);
    await waitForCommandResult(listTransId);
    const users = await readUserIdList(listTransId);
    console.log(`[syncAllUsersService] Total users to sync: ${users.length}`);

    // Step 2: Loop through users
    console.log("\n--- STEP 2: Fetching Individual User Info ---");
    let successCount = 0;
    let failCount = 0;
    let alreadySavedCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n[syncAllUsersService] Processing user ${i + 1}/${users.length}: ${user.user_id}`);

      try {
        const isUserAlreadySave = await isUserAlreadySaved(user.user_id);
        if (isUserAlreadySave) {
          console.log(`[syncAllUsersService] User ${user.user_id} already saved in MSSQL`);
          alreadySavedCount++;
          continue;
        }
        const infoTransId = await queueGetUserInfo(deviceId, user.user_id);
        await waitForCommandResult(infoTransId);

        const raw = await readUserInfo(infoTransId);

        const decoded = decodeBSComm(raw);
        // console.log("[syncAllUsersService] Decoded data:", decoded);
        await saveUserToMSSQL(deviceId, decoded);

        console.log(`[syncAllUsersService] Successfully retrieved data for user: ${user.user_id}`);
        successCount++;

      } catch (error) {
        console.error(`[syncAllUsersService] Error processing user ${user.user_id}:`, error);
        failCount++;
      }
    }

    console.log("\n========================================");
    console.log("[syncAllUsersService] Sync Summary:");
    console.log(`  Total Users: ${users.length}`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Failed: ${failCount}`);
    console.log("========================================\n");

    return {
      status: "completed",
      totalUsers: users.length,
      successCount,
      failCount,
      alreadySavedCount
    };
  } catch (error) {
    console.error("\n[syncAllUsersService] FATAL ERROR:", error);
    throw error;
  }
}

export async function watchNewEntryViaDeviceService() {
  console.log("\n========================================");
  console.log("[watchNewEntryViaDeviceService] Starting watch process");
  console.log("========================================\n");

  const POLL_INTERVAL_MS = 10_000;

  let lastSeenTime = new Date(0); // most possible last date in JS.

  setInterval(async () => {
    try {
      console.log(`[watchNewEntryViaDeviceService] Polling since ${lastSeenTime.toISOString()}`);

      const result = await sqlPool.request()
        .input("lastSeenTime", lastSeenTime)
        .query(`
          SELECT
            update_time,
            device_id,
            user_id,
            user_data
          FROM tbl_realtime_enroll_data
          WHERE update_time > @lastSeenTime
          ORDER BY update_time ASC
        `);

      if (result.recordset.length === 0) {
        console.log("[watchNewEntryViaDeviceService] No new enrollments");
        return;
      }

      for (const row of result.recordset) {
        console.log(`[watchNewEntryViaDeviceService] New enrollment detected → user_id=${row.user_id}, device_id=${row.device_id}`);

        const isUserAlreadySave = await isUserAlreadySaved(row.user_id);
        if (isUserAlreadySave) {
          console.log(`[watchNewEntryViaDeviceService] User ${row.user_id} already saved in MSSQL.`);
          continue;
        }
        const decoded = decodeBSComm(row.user_data);

        await saveUserToMSSQL(row.device_id, decoded);

        lastSeenTime = row.update_time; // most imp optimisation
      }
      console.log(`[watchNewEntryViaDeviceService] Processed ${result.recordset.length} enrollment(s)`);

    } catch (error) {
      console.error("[watchNewEntryViaDeviceService] Error during polling:", error);
    }
  }, POLL_INTERVAL_MS);
}


export async function registerUserService(params: {
  deviceId: string;
  userId: string;
  userName: string;
  photo: Buffer; // JPEG
}) {
  console.log("\n========================================");
  console.log("[registerUserService] Starting enrollment");
  console.log("========================================\n");

  const transId = generateTransId();

  const payload = encodeEnrollUserPhotoBSComm({
    user_id: params.userId,
    user_name: params.userName,
    photo: params.photo
  });

  // cleanup (idempotent)
  await sqlPool.request()
    .input("trans_id", transId)
    .query(`
      DELETE FROM tbl_fkcmd_trans_cmd_result WHERE trans_id=@trans_id;
      DELETE FROM tbl_fkcmd_trans_cmd_param  WHERE trans_id=@trans_id;
      DELETE FROM tbl_fkcmd_trans            WHERE trans_id=@trans_id;
    `);

  // queue command
  await sqlPool.request()
    .input("trans_id", transId)
    .input("device_id", params.deviceId)
    .input("cmd_param", payload)
    .query(`
      INSERT INTO tbl_fkcmd_trans_cmd_param
        (trans_id, device_id, cmd_param)
      VALUES
        (@trans_id, @device_id, @cmd_param);

      INSERT INTO tbl_fkcmd_trans
        (trans_id, device_id, cmd_code, status, update_time)
      VALUES
        (@trans_id, @device_id, 'SET_USER_INFO', 'WAIT', GETDATE());
    `);

  console.log(`[registerUserService] Command queued (trans_id=${transId})`);

  // wait for device
  await waitForCommandResult(transId);

  // read result
  const resultData = await sqlPool.request()
    .input("trans_id", transId)
    .query(`
      SELECT cmd_result
      FROM tbl_fkcmd_trans_cmd_result
      WHERE trans_id = @trans_id
    `);

  if (!resultData.recordset.length) {
    throw new Error("No result returned from device");
  }
    const { cmd_result } = resultData.recordset[0];
    // ✅ READ RESULT FROM CORRECT TABLE
  const result = await sqlPool.request()
    .input("trans_id", transId)
    .query(`
      SELECT return_code
      FROM tbl_fkcmd_trans
      WHERE trans_id = @trans_id
    `);

  if (!result.recordset.length) {
    throw new Error("No result returned from device");
  }

  const { return_code } = result.recordset[0];

  if (return_code !== "OK") {
    let reason = return_code;
    try {
      reason = JSON.parse(cmd_result?.toString("utf8") ?? "{}");
    } catch {}

    throw new Error(`Enrollment failed: ${JSON.stringify(reason)}`);
  }

  console.log(`[registerUserService] Enrollment SUCCESS for ${params.userId}`);

  return {
    status: "ok",
    userId: params.userId,
    transId
  };
}





