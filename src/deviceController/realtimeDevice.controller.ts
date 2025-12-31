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


async function saveUserToMSSQL(
  deviceId: string,
  decoded: DecodedBSComm
) {
  const user = decoded.json;

  // Resolve BINs
  const photoIndex =
    parseInt(user.user_photo.replace("BIN_", ""), 10) - 1;
  const photo = decoded.bins[photoIndex];

  const face = user.enroll_data_array[0];
  const faceIndex =
    parseInt(face.enroll_data.replace("BIN_", ""), 10) - 1;
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


