import { envConfig } from "../config";
import sql from "mssql";
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
import encodeEnrollUserPhotoBSComm, { encodeUserInfoWithPhoto } from "./utils/encodeEnrollUserPhotoBSComm";
import { enrollViaTcp } from "./connect";
// import buildEnrollFaceXML from "./utils/buildEnrollFaceXML";
import buildSetEnrollDataPayload from "./utils/buildSetEnrollDataPayload";
import fs from "node:fs";
import axios from "axios";
// import { buildEnrollPayload } from "./utils/buildEnrollFaceXML";
// import buildEnrollPayload from "./utils/buildEnrollFaceXML";

async function saveUserToMSSQL(deviceId: string, decoded: DecodedBSComm) {
  const user = decoded.json;

  // =========================
  // Resolve PHOTO (optional)
  // =========================
  let photo: Buffer | null = null;

  if (typeof user.user_photo === "string" && user.user_photo.startsWith("BIN_")) {
    const photoIndex = parseInt(user.user_photo.replace("BIN_", ""), 10) - 1;
    photo = decoded.bins[photoIndex] ?? null;
  }

  // =========================
  // Resolve FACE (optional)
  // =========================
  let faceTemplate: Buffer | null = null;
  let backupNumber: number | null = null;

  if (Array.isArray(user.enroll_data_array) && user.enroll_data_array.length > 0) {
    const face = user.enroll_data_array[0];

    if (typeof face.enroll_data === "string" && face.enroll_data.startsWith("BIN_")) {
      const faceIndex = parseInt(face.enroll_data.replace("BIN_", ""), 10) - 1;
      faceTemplate = decoded.bins[faceIndex] ?? null;
      backupNumber = face.backup_number ?? 0;
    }
  }

  // =========================
  // USERS (always)
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
      USING (SELECT @device_id AS device_id, @user_id AS user_id) AS s
      ON t.device_id = s.device_id AND t.user_id = s.user_id
      WHEN MATCHED THEN UPDATE SET
        user_name = @user_name,
        privilege = @privilege,
        enabled = @enabled,
        depart_id = @depart_id,
        updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (device_id, user_id, user_name, privilege, enabled, depart_id, updated_at)
        VALUES (@device_id, @user_id, @user_name, @privilege, @enabled, @depart_id, GETDATE());
    `);

  // =========================
  // PHOTO (optional)
  // =========================
  if (photo) {
    await sqlPool.request()
      .input("device_id", deviceId)
      .input("user_id", user.user_id)
      .input("photo", photo)
      .query(`
        MERGE user_photos AS t
        USING (SELECT @device_id AS device_id, @user_id AS user_id) AS s
        ON t.device_id = s.device_id AND t.user_id = s.user_id
        WHEN MATCHED THEN UPDATE SET photo = @photo
        WHEN NOT MATCHED THEN
          INSERT (device_id, user_id, photo)
          VALUES (@device_id, @user_id, @photo);
      `);
  }

  // =========================
  // FACE TEMPLATE (optional)
  // =========================
  if (faceTemplate && backupNumber !== null) {
    await sqlPool.request()
      .input("device_id", deviceId)
      .input("user_id", user.user_id)
      .input("backup_number", backupNumber)
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
          INSERT (device_id, user_id, backup_number, face_template)
          VALUES (@device_id, @user_id, @backup_number, @face_template);
      `);
  }
}


type TResponse = {
 status: string,
 totalUsers: number,
 successCount: number,
 failCount: number,
 alreadySavedCount: number,
 aiSyncResult: any
}

export async function syncAllUsersService(): Promise<TResponse> {
  console.log("\n========================================");
  console.log("[syncAllUsersService] Starting sync process");
  console.log("========================================\n");

  let response: TResponse;

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

    let result;
    try {
      result = await axios.post("http://160.25.62.109:8200/sync");
    } catch (error:any) {
      result = error.message
    }

    response = {
      status: "completed",
      totalUsers: users.length,
      successCount,
      failCount,
      alreadySavedCount,
      aiSyncResult: result.data
    };

    return response;
  } catch (error) {
    console.error("\n[syncAllUsersService] FATAL ERROR:", error);
    throw error;
  }
}

export async function watchNewEntryViaDeviceService() {
  console.log("\n========================================");
  console.log("[watchNewEntryViaDeviceService] Starting watch process");
  console.log("========================================\n");

  const POLL_INTERVAL_MS = 60_000;

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
      await axios.post("http://160.25.62.109:8200/sync");
      console.log(`[watchNewEntryViaDeviceService] Processed ${result.recordset.length} enrollment(s)`);

    } catch (error) {
      console.error("[watchNewEntryViaDeviceService] Error during polling:", error);
    }
  }, POLL_INTERVAL_MS);
}

export async function remoteEnrollmentService(params: {
  deviceId: string;
  userId: string;
  userName: string;
  photo?: Buffer;
}) {
  console.log("\n========================================");
  console.log("[registerUserService] Starting user remote registration");
  console.log("========================================");

  const { deviceId, userId, userName, photo } = params;



  // CREATE USER (SET_USER_INFO)

  await setUserInfo(deviceId, { user_id: userId, user_name: userName, privilege: "User", photoBuffer: photo! });
  
  // TRIGGER FACE ENROLLMENT
  const enrollTransId = generateTransId();

  // const enrollPayload = encodeBSCommWithBins({
  //   user_id: userId,
  //   backup_number: 13 // FACE
  // });

  const enrollPayload = encodeEnrollUserPhotoBSComm({
    user_id: userId,
    user_name: userName,
    photo: photo!,
  });

  await sqlPool.request()
    .input("trans_id", enrollTransId)
    .input("device_id", deviceId)
    .input("cmd_param", enrollPayload)
    .query(`
      INSERT INTO tbl_fkcmd_trans_cmd_param (trans_id, device_id, cmd_param)
      VALUES (@trans_id, @device_id, @cmd_param);

      INSERT INTO tbl_fkcmd_trans (trans_id, device_id, cmd_code, status, update_time)
      VALUES (@trans_id, @device_id, 'SET_REMOTE_ENROLL', 'WAIT', GETDATE());
    `);

  await waitForCommandResult(enrollTransId);

  console.log(`[registerUserService] Face enrollment triggered`);

  return {
    status: "PENDING_FACE_ENROLLMENT",
    message: "User created. Please look at the device camera.",
    userId,
    deviceId
  };
}

// new Public Api
export async function registerUserService(params: { deviceId: string; userId: string; userName: string; photo: Buffer;}) {
  console.log(`\n=== Starting Enrollment for ${params.userId} ===`);

  // STEP 1 — Create user metadata
  await setUserInfo(params.deviceId, { user_id: params.userId, user_name: params.userName, privilege: "User", photoBuffer: params.photo });

  // STEP 2 — Upload profile photo
  // await uploadUserPhoto({ deviceId: params.deviceId, userId: params.userId, photo: params.photo });

  // await setEnrollData({ deviceId: params.deviceId, userId: params.userId, backupNumber: 13, binaryData: params.photo })

  await syncAllUsersService();

  console.log(`=== Enrollment Finished for ${params.userId} ===\n`);

  return {
    status: "ok",
    userId: params.userId,
  };
}

// async function createUserOnDevice(params: { deviceId: string; userId: string; userName: string; }) {
//   console.log("[Step 1] Creating user metadata...");

//   const transId = generateTransId();
//   console.log(`[createUserOnDevice] Using transId: ${transId}`);

//   const payload = {
//     user_id: params.userId,
//     user_name: params.userName,
//     user_privilege: "User",   // normal user
//     user_photo: "BIN_1",    // Magic Reference
//     enroll_data_array: []
//   };

//   await executeCommand({ transId, deviceId: params.deviceId, cmdCode: "SET_USER_INFO", payload });

//   console.log("[Step 1] User created.");
// }

// async function uploadUserPhoto(params: {
//   deviceId: string;
//   userId: string;
//   photo: Buffer;
// }) {
//   console.log("[Step 2] Uploading user photo...");

//   const transId = generateTransId();

//   // Store binary FIRST
//   await storeBinary({
//     transId,
//     binIndex: 1,
//     data: params.photo,
//   });

//   const payload = {
//     user_id: params.userId,
//     backup_number: 13,       // PHOTO
//     enroll_data: "BIN_1",    // binary reference
//     enroll_data_type: 0,
//   };

//   await executeCommand({
//     transId,
//     deviceId: params.deviceId,
//     cmdCode: "SET_USER_INFO",
//     payload,
//   });

//   console.log("[Step 2] Photo uploaded.");
// }


// async function executeCommand(params: { transId: string; deviceId: string; cmdCode: string; payload: object; timeoutMs?: number;}) {
//   const { transId, deviceId, cmdCode, payload, timeoutMs = 30_000} = params;

//   const req = sqlPool.request();

//   // Ensure idempotency: only delete if transaction already finished
//   await req
//     .input("trans_id", transId)
//     .query(`
//       DELETE FROM tbl_fkcmd_trans_cmd_result
//       WHERE trans_id=@trans_id;

//       DELETE FROM tbl_fkcmd_trans_cmd_param
//       WHERE trans_id=@trans_id;

//       DELETE FROM tbl_fkcmd_trans
//       WHERE trans_id=@trans_id;
//     `);

//   await req
//     .input("trans_id", transId)
//     .input("device_id", deviceId)
//     .input("cmd_code", cmdCode)
//     .input("cmd_param", Buffer.from(JSON.stringify(payload)))
//     .query(`
//       INSERT INTO tbl_fkcmd_trans_cmd_param
//         (trans_id, device_id, cmd_param)
//       VALUES
//         (@trans_id, @device_id, @cmd_param);

//       INSERT INTO tbl_fkcmd_trans
//         (trans_id, device_id, cmd_code, status, update_time)
//       VALUES
//         (@trans_id, @device_id, @cmd_code, 'WAIT', GETDATE());
//     `);

//   const result = await waitForCommandResult(transId, timeoutMs);

 
//   return result;
// }

